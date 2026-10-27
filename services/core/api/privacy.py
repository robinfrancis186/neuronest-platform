"""Reviewed privacy execution and explicit transfer of historical records at adulthood."""

from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from . import models as m
from .access import adult, adult_subject, audit, can_access, emit
from .errors import Conflict


def administrator(user):
    if not user.is_active or user.role != "admin":
        raise PermissionDenied("Operations administrator role required.")


def transition_requester(user, child):
    return (
        adult_subject(user, child)
        or m.Guardianship.objects.filter(
            child=child, user=user, can_share=True, status="active", revoked_at__isnull=True
        ).exists()
    )


def evidence(data, field="evidence_reference"):
    value = data.get(field)
    if not isinstance(value, str) or not 8 <= len(value.strip()) <= 240:
        raise ValidationError(
            {
                field: "Supply an operator-reviewed evidence reference of 8–240 characters, without identity-document contents."
            }
        )
    return value.strip()


def revoke_authority(queryset, actor):
    count = 0
    for obj in queryset.select_for_update():
        obj.revoked_at = timezone.now()
        fields = ["revoked_at"]
        if isinstance(obj, m.Guardianship):
            obj.status = "revoked"
            fields.append("status")
        obj.save(update_fields=fields)
        emit("consent.revoked", obj, actor, obj.child)
        count += 1
    return count


class PrivacyRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = m.PrivacyRequest
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "user",
            "status",
            "response",
            "subject",
            "reviewed_by",
            "reviewed_at",
            "evidence_reference",
            "accepted_at",
            "retention_review",
            "execution_receipt",
        ]

    def validate(self, data):
        user = self.context["request"].user
        child = data.get("child")
        if data["kind"] == "adult_transition" and not child:
            raise ValidationError(
                {"child": "Select the historical record whose authority is being transferred."}
            )
        if data["kind"] == "deletion" and child:
            raise ValidationError(
                "Deletion requests disable your own account. Medical-record deletion requires a separate approved retention review."
            )
        if child:
            if data["kind"] == "adult_transition":
                if not adult(child):
                    raise ValidationError(
                        "Adulthood transfer is available from the eighteenth birthday."
                    )
                if not transition_requester(user, child):
                    raise PermissionDenied(
                        "A current or former guardian relationship is required to request this transfer."
                    )
            elif not can_access(user, child, "records"):
                raise PermissionDenied("This record is not authorized for your account.")
        return data


class PrivacyRequestViewSet(viewsets.ModelViewSet):
    serializer_class = PrivacyRequestSerializer
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return m.PrivacyRequest.objects.none()
        qs = m.PrivacyRequest.objects.all()
        if self.request.user.role != "admin":
            qs = qs.filter(Q(user=self.request.user) | Q(subject=self.request.user))
        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        obj = serializer.save(user=self.request.user)
        audit(self.request.user, None, "privacy.requested", obj)

    def locked(self):
        return m.PrivacyRequest.objects.select_for_update().get(pk=self.get_object().pk)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def resolve(self, request, pk=None):
        administrator(request.user)
        obj = self.locked()
        response = request.data.get("response", "")
        state = request.data.get("status", "resolved")
        if (
            state not in ["in_review", "resolved", "rejected"]
            or not isinstance(response, str)
            or not response.strip()
            or len(response) > 10000
        ):
            raise ValidationError("A valid status and documented response are required.")
        if obj.status in ["completed", "retention_blocked", "restored"]:
            raise Conflict("An execution receipt cannot be overwritten by a general resolution.")
        if obj.kind in ["adult_transition", "deletion"] and state == "resolved":
            raise ValidationError(
                "Use the reviewed transfer or account-execution workflow for this request."
            )
        obj.status = state
        obj.response = response.strip()
        obj.save(update_fields=["status", "response"])
        audit(request.user, None, "privacy.reviewed", obj)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def review(self, request, pk=None):
        administrator(request.user)
        obj = self.locked()
        restoring_transfer = (
            obj.kind == "adult_transition"
            and obj.status == "revoked"
            and obj.accepted_at is not None
        )
        if obj.status not in ["open", "in_review"] and not restoring_transfer:
            raise Conflict("Only an open or in-review request can be approved.")
        if obj.user_id == request.user.pk:
            raise PermissionDenied("A different operations reviewer must review this request.")
        reference = evidence(request.data)
        if obj.kind == "adult_transition":
            child = obj.child or get_object_or_404(m.Child, pk=request.data.get("child"))
            child = m.Child.objects.select_for_update().get(pk=child.pk)
            if not adult(child) or (
                not restoring_transfer and not transition_requester(obj.user, child)
            ):
                raise PermissionDenied(
                    "The requester must have a qualifying relationship to an adult subject."
                )
            if child.adult_subject_id or child.transition_status == "adult_managed":
                raise Conflict("This record already has an accepted adult subject.")
            if child.transition_status == "awaiting_acceptance":
                raise Conflict("This record already has a reviewed transfer awaiting acceptance.")
            subject = get_object_or_404(
                m.Account, pk=request.data.get("subject"), is_active=True, role="parent"
            )
            if restoring_transfer and subject.pk != obj.subject_id:
                raise ValidationError(
                    "A revoked transfer may only be re-reviewed for its previously accepted subject."
                )
            if subject.pk == obj.user_id:
                raise ValidationError(
                    "The adult must accept through a separate verified personal account, not the requesting guardian account."
                )
            obj.child = child
            obj.subject = subject
            obj.status = "awaiting_acceptance"
            child.transition_status = "awaiting_acceptance"
            child.save(update_fields=["transition_status"])
        elif obj.kind == "deletion":
            holds = request.data.get("retention_holds")
            if (
                not isinstance(holds, list)
                or not holds
                or any(not isinstance(v, str) or not v.strip() or len(v) > 240 for v in holds)
            ):
                raise ValidationError(
                    {
                        "retention_holds": "Document at least one retention/financial/legal review hold. This action never erases medical or financial records."
                    }
                )
            obj.retention_review = {
                "holds": holds,
                "medical_record_erasure": "not_authorized",
                "financial_record_erasure": "not_authorized",
                "identity_provider_erasure": "requires_provider_workflow",
            }
            obj.status = "approved"
        else:
            raise ValidationError("Use resolution for this request kind.")
        obj.reviewed_by = request.user
        obj.reviewed_at = timezone.now()
        obj.evidence_reference = reference
        obj.save()
        audit(request.user, None, "privacy.approved", obj, purpose=reference)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def accept(self, request, pk=None):
        obj = self.locked()
        if obj.subject_id != request.user.pk or obj.kind != "adult_transition":
            raise PermissionDenied("Only the reviewed adult subject may accept this transfer.")
        if request.data.get("accept") is not True:
            raise ValidationError("Explicit acceptance is required.")
        if obj.status == "completed":
            return Response(self.get_serializer(obj).data)
        if obj.status != "awaiting_acceptance":
            raise Conflict("This transfer is not awaiting acceptance.")
        child = m.Child.objects.select_for_update().get(pk=obj.child_id)
        if not adult(child) or child.adult_subject_id:
            raise Conflict("The subject record is no longer eligible for transfer.")
        if obj.accepted_at is None and not transition_requester(obj.user, child):
            raise PermissionDenied(
                "The initiating guardian authority was revoked before acceptance."
            )
        guardians = revoke_authority(
            m.Guardianship.objects.filter(child=child, revoked_at__isnull=True), request.user
        )
        grants = revoke_authority(
            m.Grant.objects.filter(child=child, revoked_at__isnull=True), request.user
        )
        child.adult_subject = request.user
        child.transition_status = "adult_managed"
        child.save()
        obj.accepted_at = timezone.now()
        obj.status = "completed"
        previous = (
            [
                *obj.execution_receipt.get("previous_executions", []),
                {
                    key: value
                    for key, value in obj.execution_receipt.items()
                    if key != "previous_executions"
                },
            ]
            if obj.execution_receipt
            else []
        )
        obj.execution_receipt = {
            "completed_at": obj.accepted_at.isoformat(),
            "adult_subject": str(request.user.pk),
            "revoked_guardianships": guardians,
            "revoked_professional_grants": grants,
            "access": [
                "historical_records",
                "developmental_history",
                "therapy_history",
                "screening_history",
                "messages_history",
                "export",
            ],
            "new_child_care": False,
            "previous_executions": previous,
        }
        obj.save(update_fields=["accepted_at", "status", "execution_receipt"])
        audit(request.user, child, "adult_transition.accepted", obj)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def execute(self, request, pk=None):
        administrator(request.user)
        obj = self.locked()
        if obj.kind != "deletion":
            raise ValidationError("Account execution is only available for deletion requests.")
        if obj.status == "retention_blocked":
            return Response(self.get_serializer(obj).data)
        if obj.status != "approved" or not obj.reviewed_at:
            raise Conflict("A documented review is required before execution.")
        user = m.Account.objects.select_for_update().get(pk=obj.user_id)
        user.is_active = False
        user.email_notifications = False
        user.push_notifications = False
        user.push_token = ""
        user.save(
            update_fields=["is_active", "email_notifications", "push_notifications", "push_token"]
        )
        notifications, _ = m.Notification.objects.filter(user=user).delete()
        guardians = revoke_authority(
            m.Guardianship.objects.filter(user=user, revoked_at__isnull=True), request.user
        )
        grants = revoke_authority(
            m.Grant.objects.filter(Q(grantor=user) | Q(recipient=user), revoked_at__isnull=True),
            request.user,
        )
        from .policies import policy_readiness

        policy = policy_readiness()
        obj.status = "retention_blocked"
        obj.execution_receipt = {
            "executed_at": timezone.now().isoformat(),
            "account_access": "disabled",
            "notification_entries_erased": notifications,
            "delivery_preferences": "cleared",
            "revoked_guardianships": guardians,
            "revoked_grants": grants,
            "medical_records_erased": 0,
            "financial_records_erased": 0,
            "medical_financial_and_audit_records": "retained",
            "policy_version": policy.get("policy", {}).get("version"),
            "policy_production_approved": policy.get("production_approved", False),
            "remaining": [
                "approved retention schedule and case-specific legal hold review",
                "identity-provider account and external-processor erasure",
                "backup expiry and verified deletion receipt",
            ],
        }
        obj.save(update_fields=["status", "execution_receipt"])
        audit(request.user, None, "privacy.account_disabled", obj)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def restore(self, request, pk=None):
        administrator(request.user)
        obj = self.locked()
        reference = evidence(request.data)
        if obj.kind != "deletion" or obj.status != "retention_blocked":
            raise Conflict("Only a disabled account with retained records can be restored.")
        user = m.Account.objects.select_for_update().get(pk=obj.user_id)
        user.is_active = True
        user.save(update_fields=["is_active"])
        obj.status = "restored"
        obj.execution_receipt = {
            **obj.execution_receipt,
            "restored_at": timezone.now().isoformat(),
            "restoration_evidence_reference": reference,
            "account_access": "enabled",
            "consent_restoration": "none; new invitations and consent are required",
        }
        obj.save(update_fields=["status", "execution_receipt"])
        audit(request.user, None, "privacy.account_restored", obj, purpose=reference)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="revoke-transition")
    @transaction.atomic
    def revoke_transition(self, request, pk=None):
        administrator(request.user)
        obj = self.locked()
        reference = evidence(request.data)
        if obj.kind != "adult_transition" or obj.status != "completed":
            raise Conflict("An accepted transfer is required.")
        child = m.Child.objects.select_for_update().get(pk=obj.child_id)
        if child.adult_subject_id != obj.subject_id:
            raise Conflict("The current subject no longer matches this receipt.")
        child.adult_subject = None
        child.transition_status = "review_required"
        child.save()
        obj.status = "revoked"
        obj.execution_receipt = {
            **obj.execution_receipt,
            "revoked_at": timezone.now().isoformat(),
            "revocation_evidence_reference": reference,
        }
        obj.save(update_fields=["status", "execution_receipt"])
        audit(request.user, child, "adult_transition.revoked", obj, purpose=reference)
        return Response(self.get_serializer(obj).data)
