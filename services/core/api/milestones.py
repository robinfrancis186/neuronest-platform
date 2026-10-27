"""Age-specific developmental monitoring, separate from validated screening."""

import calendar
import json
from pathlib import Path

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, OpenApiTypes, extend_schema
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from . import models as m
from .access import audit, guardian, require_child
from .engines import engine_call
from .errors import Unavailable
from .milestone_reference import reference_for
from .views import ChildScopedViewSet, child_from, require_child_care

CATALOG = json.loads(Path(__file__).with_name("milestone_catalog.json").read_text())
ANSWERS = ("yes", "in_progress", "not_yet", "unsure")


def age_months(dob, today=None):
    today = today or timezone.localdate()
    months = (today.year - dob.year) * 12 + today.month - dob.month
    anniversary = min(dob.day, calendar.monthrange(today.year, today.month)[1])
    return months - (today.day < anniversary)


def band_for_age(age):
    if not 2 <= age < 72:
        return None
    return next(band for band in reversed(CATALOG["bands"]) if band["months"] <= age)


def summary_for(band, answers, concern, skill_loss, age_days):
    return {
        "kind": "parent_observation_summary",
        "counts": {answer: list(answers.values()).count(answer) for answer in ANSWERS},
        "follow_up_recommended": concern or skill_loss or any(v != "yes" for v in answers.values()),
        "skill_loss": skill_loss,
        "parent_concern": concern,
        "source_url": band["source_url"],
        "items": [{**item, "answer": answers[item["id"]]} for item in band["items"]],
        "research_reference": reference_for(band["items"], age_days),
    }


class MilestoneCheckInSerializer(serializers.ModelSerializer):
    answers = serializers.DictField(child=serializers.ChoiceField(choices=ANSWERS), required=True)
    parent_concern = serializers.BooleanField(required=True)
    skill_loss = serializers.BooleanField(required=True)

    class Meta:
        model = m.MilestoneCheckIn
        fields = "__all__"
        read_only_fields = ["id", "author", "created_at", "age_months", "summary", "ai_explanation"]

    def validate(self, attrs):
        child = attrs["child"]
        require_parent(self.context["request"].user, child)
        age = age_months(child.date_of_birth)
        band = band_for_age(age)
        if not band:
            raise ValidationError(
                "This checklist supports ages 2 to 71 completed months. Discuss concerns with your clinician at any age."
            )
        if attrs["catalog_version"] != CATALOG["version"] or attrs["band_months"] != band["months"]:
            raise ValidationError(
                "The child’s age or checklist has changed. Reload the current checklist before submitting."
            )
        if set(attrs["answers"]) != {item["id"] for item in band["items"]}:
            raise ValidationError(
                {
                    "answers": "Answer every question in the current age checklist, with no additional questions."
                }
            )
        attrs["age_months"] = age
        attrs["summary"] = summary_for(
            band,
            attrs["answers"],
            attrs["parent_concern"],
            attrs["skill_loss"],
            (timezone.localdate() - child.date_of_birth).days,
        )
        return attrs


def require_parent(user, child):
    require_child(user, child, "observations")
    if user.role != "parent" or not guardian(user, child, scope="observations"):
        raise PermissionDenied(
            "A parent with active observations access must submit this check-in."
        )
    require_child_care(child)


class ExplanationInput(serializers.Serializer):
    consent = serializers.BooleanField(required=True)
    language = serializers.ChoiceField(choices=["en", "ml"], default="en")


class MilestoneCheckInViewSet(ChildScopedViewSet):
    serializer_class = MilestoneCheckInSerializer
    scope = "observations"
    http_method_names = ["get", "post", "head", "options"]

    @transaction.atomic
    def perform_create(self, serializer):
        require_parent(self.request.user, serializer.validated_data["child"])
        super().perform_create(serializer)

    @extend_schema(
        parameters=[OpenApiParameter("child", OpenApiTypes.UUID, required=True)],
        responses=OpenApiTypes.OBJECT,
    )
    @action(detail=False, methods=["get"])
    def catalog(self, request):
        child = child_from(request.query_params)
        require_child(request.user, child, self.scope)
        age = age_months(child.date_of_birth)
        audit(request.user, child, "milestone_catalog.read")
        return Response(
            {
                "version": CATALOG["version"],
                "age_months": age,
                "band": band_for_age(age),
                "notice": CATALOG["notice"],
                "ai_enabled": bool(settings.MILESTONE_AI_ENABLED and settings.SERVICE_TOKEN),
            }
        )

    @extend_schema(request=ExplanationInput, responses=OpenApiTypes.OBJECT)
    @action(detail=True, methods=["post"])
    def explain(self, request, pk=None):
        obj = self.get_object()
        require_parent(request.user, obj.child)
        data = ExplanationInput(data=request.data)
        data.is_valid(raise_exception=True)
        if not data.validated_data["consent"]:
            raise ValidationError(
                "Explicit consent to send this saved check-in for AI explanation is required."
            )
        if not settings.MILESTONE_AI_ENABLED:
            raise Unavailable(
                "AI explanations are disabled. Your saved observation summary remains available."
            )
        language = data.validated_data["language"]
        if (
            obj.ai_explanation.get("status") == "generated"
            and obj.ai_explanation.get("language") == language
            and obj.ai_explanation.get("method") == "openai_decisions_v1"
            and obj.ai_explanation.get("model") == "gpt-6-luna"
        ):
            return Response(obj.ai_explanation)
        # Only checklist labels and answers leave the core; no child identifiers or records.
        result = engine_call(
            "assistant",
            "/milestone-explanation",
            {
                "language": language,
                "band_months": obj.band_months,
                "items": [
                    {"label": item["label"][language], "answer": item["answer"]}
                    for item in obj.summary["items"]
                ],
                "parent_concern": obj.parent_concern,
                "skill_loss": obj.skill_loss,
            },
        )
        require_parent(request.user, m.Child.objects.get(pk=obj.child_id))
        if result.get("status") != "generated":
            return Response(
                {
                    "status": "unavailable",
                    "detail": {
                        "activation_required": "The AI service is awaiting provider activation. Your saved summary is still available.",
                        "credits_unavailable": "AI service credits are unavailable. Your saved summary is still available.",
                    }.get(
                        result.get("code"),
                        "AI could not provide a verified explanation. Your saved summary is still available.",
                    ),
                }
            )
        if (
            not isinstance(result.get("answer"), str)
            or not 1 <= len(result["answer"]) <= 4000
            or result.get("language") != language
            or not isinstance(result.get("notice"), str)
            or not isinstance(result.get("citations"), list)
            or result.get("method") != "openai_decisions_v1"
            or result.get("model") != "gpt-6-luna"
            or result.get("decision")
            != (
                "some_not_yet"
                if obj.summary["counts"]["not_yet"]
                else "all_observed"
                if obj.summary["counts"]["yes"] == len(obj.summary["items"])
                else "emerging_or_uncertain"
            )
        ):
            raise Unavailable(
                "AI could not provide a verified explanation. Your saved summary is still available."
            )
        obj.ai_explanation = {
            key: result[key]
            for key in [
                "answer",
                "language",
                "citations",
                "status",
                "notice",
                "method",
                "model",
                "decision",
            ]
        }
        obj.save(update_fields=["ai_explanation"])
        audit(
            request.user,
            obj.child,
            "milestone_checkin.ai_explained",
            obj,
            purpose="explicit_request",
        )
        return Response(obj.ai_explanation)
