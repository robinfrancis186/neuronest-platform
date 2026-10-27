"""Redacted operations queues. No endpoint replays external financial actions."""

from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework import serializers, viewsets
from rest_framework.decorators import action, api_view
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from . import models as m
from .access import audit
from .errors import Conflict
from .policies import policy_readiness

RETRYABLE = frozenset(
    [
        "attachment.scan",
        "consent.revoked",
        "provider.suspended",
        "guardian.invited",
        "message.created",
        "booking.held",
        "booking.confirmed",
        "booking.expired",
        "booking.cancelled",
        "booking.rescheduled",
        "appointment.completed",
        "consent.granted",
        "screening.submitted",
    ]
)


def require_operations(user):
    if not user.is_active or user.role != "admin":
        raise PermissionDenied("Operations administrator role required.")


class QueueItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    kind = serializers.CharField()
    status = serializers.CharField()
    created_at = serializers.DateTimeField()
    attempts = serializers.IntegerField(required=False)
    available_at = serializers.DateTimeField(required=False)
    payment = serializers.UUIDField(required=False, allow_null=True)
    retry_allowed = serializers.BooleanField()
    required_action = serializers.CharField()


class OperationsQueueSerializer(serializers.Serializer):
    outbox = QueueItemSerializer(many=True)
    payment_events = QueueItemSerializer(many=True)
    next_offset = serializers.IntegerField(allow_null=True)


class RetrySerializer(serializers.Serializer):
    reason = serializers.ChoiceField(
        choices=["configuration_restored", "provider_recovered", "reviewed_transient_failure"]
    )


class DisputeResolutionSerializer(serializers.Serializer):
    resolution = serializers.ChoiceField(
        choices=["evidence_submitted", "provider_closed", "escalated"]
    )
    evidence_reference = serializers.RegexField(r"^[A-Za-z0-9][A-Za-z0-9:/_.#-]{2,159}$")


class PolicyReadinessSerializer(serializers.Serializer):
    configured = serializers.BooleanField()
    production_approved = serializers.BooleanField()
    policy = serializers.JSONField(required=False)
    reason = serializers.CharField(required=False)
    retention_execution = serializers.CharField(required=False)


def outbox_summary(item):
    retry_allowed = item.kind in RETRYABLE and (
        item.status == "dead" or item.status == "pending" and bool(item.error)
    )
    return {
        "id": str(item.pk),
        "kind": item.kind,
        "status": item.status,
        "created_at": item.created_at,
        "attempts": item.attempts,
        "available_at": item.available_at,
        "retry_allowed": retry_allowed,
        "required_action": "payment_reconciliation"
        if item.kind.startswith("payment.")
        else "review_delivery"
        if item.error
        else "none",
    }


def payment_event_summary(item):
    return {
        "id": str(item.pk),
        "kind": item.kind,
        "status": item.status,
        "created_at": item.created_at,
        "payment": str(item.payment_id) if item.payment_id else None,
        "retry_allowed": False,
        "required_action": "review_provider_dispute"
        if item.kind.startswith("payment.dispute.")
        else "payment_reconciliation",
    }


class OperationsViewSet(viewsets.ViewSet):
    @extend_schema(
        parameters=[OpenApiParameter("offset", int)], responses=OperationsQueueSerializer
    )
    def list(self, request):
        require_operations(request.user)
        try:
            offset = int(request.query_params.get("offset", "0"))
            if not 0 <= offset <= 1000000:
                raise ValueError
        except (ValueError, TypeError) as exc:
            raise ValidationError("Use a non-negative queue offset.") from exc
        outbox = list(
            m.Outbox.objects.filter(status__in=["pending", "processing", "dead"]).order_by(
                "-created_at", "-id"
            )[offset : offset + 101]
        )
        events = list(
            m.PaymentEvent.objects.filter(
                Q(status__in=["unmatched", "rejected", "review_required"])
                | Q(kind__startswith="payment.dispute.")
            ).order_by("-created_at", "-id")[offset : offset + 101]
        )
        audit(request.user, None, "operations.queue_read")
        return Response(
            {
                "outbox": [outbox_summary(item) for item in outbox[:100]],
                "payment_events": [payment_event_summary(item) for item in events[:100]],
                "next_offset": offset + 100 if len(outbox) > 100 or len(events) > 100 else None,
            }
        )

    @extend_schema(request=RetrySerializer, responses=QueueItemSerializer)
    @action(detail=True, methods=["post"])
    @transaction.atomic
    def retry(self, request, pk=None):
        require_operations(request.user)
        data = RetrySerializer(data=request.data)
        data.is_valid(raise_exception=True)
        item = get_object_or_404(m.Outbox.objects.select_for_update(), pk=pk)
        if item.kind not in RETRYABLE:
            raise ValidationError(
                "This event requires its dedicated reconciliation workflow; financial actions cannot be replayed here."
            )
        if item.status == "pending" and not item.error:
            return Response(outbox_summary(item))
        if item.status not in ["dead", "pending"]:
            raise Conflict(
                "Only failed deliveries can be retried; completed or running events are unchanged."
            )
        item.status, item.attempts, item.error = "pending", 0, ""
        item.available_at, item.completed_at, item.lease_until = timezone.now(), None, None
        item.save(
            update_fields=[
                "status",
                "attempts",
                "error",
                "available_at",
                "completed_at",
                "lease_until",
            ]
        )
        audit(
            request.user, None, "operations.delivery_retried", item, data.validated_data["reason"]
        )
        # Existing durable dispatcher picks this up after commit; no broker write inside this transaction.
        return Response(outbox_summary(item))

    @extend_schema(request=DisputeResolutionSerializer, responses=QueueItemSerializer)
    @action(detail=True, methods=["post"], url_path="resolve-dispute")
    @transaction.atomic
    def resolve_dispute(self, request, pk=None):
        require_operations(request.user)
        data = DisputeResolutionSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        item = get_object_or_404(m.PaymentEvent.objects.select_for_update(), pk=pk)
        if not item.kind.startswith("payment.dispute.") or not item.payment_id:
            raise ValidationError(
                "A matched provider dispute event is required. Reconcile unmatched payments first."
            )
        detail = f"{data.validated_data['resolution']}:{data.validated_data['evidence_reference']}"
        if item.status == "reviewed":
            if item.detail != detail:
                raise Conflict(
                    "This dispute event already has a recorded closure; new provider evidence requires its own event."
                )
            return Response(payment_event_summary(item))
        item.status = (
            "reviewed"
            if data.validated_data["resolution"] == "provider_closed"
            else "review_required"
        )
        item.detail = detail
        item.save(update_fields=["status", "detail"])
        audit(request.user, None, "payment.dispute_reviewed", item, detail[:200])
        return Response(payment_event_summary(item))


@extend_schema(responses=PolicyReadinessSerializer)
@api_view(["GET"])
def policies(request):
    result = policy_readiness()
    # Internal approval identities/references are operations-only; commercial terms remain visible to consumers.
    if request.user.role != "admin" and result.get("policy"):
        approval = result["policy"]["approval"]
        result["policy"]["approval"] = {"status": approval["status"]}
    return Response(result)
