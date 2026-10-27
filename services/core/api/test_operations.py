"""Run with: python manage.py test api.test_operations."""

import copy
import json
import tempfile
from datetime import date, timedelta
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
from django.test import SimpleTestCase, TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate
from .errors import Unavailable
from .models import (
    Account,
    Audit,
    Outbox,
    PaymentEvent,
    Payment,
    Appointment,
    Child,
    ProviderApplication,
    Practitioner,
    Slot,
    LedgerEntry,
)
from .operations import OperationsViewSet, policies
from .views import ProviderApplicationViewSet
from .policies import (
    appointment_policy,
    booking_policy_snapshot,
    cancellation_decision,
    cancellation_refund_limit_minor,
    provider_payout_minor,
    validate_policy,
)


def rows(response):
    """List endpoints return a page envelope; assertions care about the rows in it."""
    data = response.json() if hasattr(response, "json") else response
    return data["results"] if isinstance(data, dict) and "results" in data else data


@override_settings(PRODUCTION=False, BUSINESS_POLICY_PATH="")
class PolicyTests(SimpleTestCase):
    def test_schema_rejects_unknown_fields_bool_amounts_and_unapproved_production(self):
        policy = booking_policy_snapshot()
        self.assertEqual(policy["environment"], "synthetic")
        for change in [
            lambda p: p.update(extra="unsupported"),
            lambda p: p["fees"].update(platform_fee_bps=True),
            lambda p: p["retention"].update(clinical_days=0),
        ]:
            invalid = copy.deepcopy(policy)
            change(invalid)
            with self.assertRaises(ValueError):
                validate_policy(invalid)
        with self.assertRaises(ValueError):
            validate_policy(policy, production=True)

    def test_production_requires_actual_path_and_approved_reference(self):
        with override_settings(PRODUCTION=True), patch.dict("os.environ", {}, clear=True):
            with self.assertRaises(Unavailable):
                booking_policy_snapshot()
        policy = booking_policy_snapshot()
        policy["environment"] = "production"
        policy["approval"] = {
            "status": "approved",
            "reference": "review:synthetic-test-only",
            "approved_by": "Automated test fixture",
            "approved_at": "2026-01-01T00:00:00Z",
        }
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "approved.json"
            path.write_text(json.dumps(policy))
            with override_settings(PRODUCTION=True, BUSINESS_POLICY_PATH=str(path)):
                self.assertEqual(booking_policy_snapshot()["version"], policy["version"])
            policy["approval"]["reference"] = ""
            path.write_text(json.dumps(policy))
            with override_settings(PRODUCTION=True, BUSINESS_POLICY_PATH=str(path)):
                with self.assertRaises(Unavailable):
                    booking_policy_snapshot()

    def test_snapshot_controls_payout_and_frozen_cancellation_decision(self):
        policy = booking_policy_snapshot()
        policy["fees"]["platform_fee_bps"] = 750
        policy["cancellation"]["late_refund_percent"] = 25
        appointment = SimpleNamespace(
            amount_minor=10001,
            policy_snapshot=policy,
            slot=SimpleNamespace(starts_at=timezone.now() + timedelta(hours=2)),
        )
        self.assertEqual(provider_payout_minor(appointment), 9251)
        decision = cancellation_decision(appointment)
        self.assertEqual(decision["refund_limit_minor"], 2500)
        appointment.policy_snapshot["cancellation_decision"] = decision
        appointment.slot.starts_at = timezone.now() + timedelta(days=3)
        self.assertEqual(cancellation_refund_limit_minor(appointment), 2500)
        self.assertEqual(
            cancellation_decision(appointment, provider_cancelled=True)["refund_limit_minor"], 10001
        )
        with override_settings(PRODUCTION=True):
            with self.assertRaises(Unavailable):
                appointment_policy(SimpleNamespace(policy_snapshot={}))


class OperationsTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.admin = Account.objects.create_user(
            username="operator", email="operator@example.test", role="admin"
        )
        self.parent = Account.objects.create_user(
            username="guardian", email="guardian@example.test", role="parent"
        )

    def request(self, action, user=None, data=None, pk=None):
        request = (
            self.factory.get("/")
            if action == "list"
            else self.factory.post("/", data or {}, format="json")
        )
        force_authenticate(request, user=user or self.admin)
        kwargs = {"pk": str(pk)} if pk else {}
        return OperationsViewSet.as_view({"get" if action == "list" else "post": action})(
            request, **kwargs
        )

    def event(self, kind="attachment.scan", status="dead"):
        return Outbox.objects.create(
            kind=kind,
            aggregate_id="private-object",
            actor_id=self.parent.pk,
            child_id="00000000-0000-0000-0000-000000000001",
            status=status,
            payload={"clinical_note": "NEVER_EXPOSE"},
            error="PRIVATE_ERROR",
            attempts=8,
            available_at=timezone.now(),
        )

    def test_approved_provider_receives_the_reviewed_professional_role(self):
        applicant = Account.objects.create_user(
            username="provider-subject",
            oidc_subject="provider-subject",
            email="provider@example.test",
            role="parent",
        )
        application = ProviderApplication.objects.create(
            user=applicant,
            display_name="Dr. Anu",
            specialty="Developmental paediatrics",
            profession="doctor",
            languages=["en", "ml"],
            fee_minor=150000,
            registration_number="KER-1234",
        )
        request = self.factory.post(
            "/",
            {"status": "approved", "reason": "Credentials verified"},
            format="json",
        )
        force_authenticate(request, user=self.admin)
        response = ProviderApplicationViewSet.as_view({"post": "review"})(
            request, pk=str(application.pk)
        )
        self.assertEqual(response.status_code, 200)
        applicant.refresh_from_db()
        provider = Practitioner.objects.get(user=applicant)
        self.assertEqual((applicant.role, applicant.display_name), ("doctor", "Dr. Anu"))
        self.assertTrue(provider.verified)
        self.assertEqual(provider.status, "active")

    def test_queue_admin_only_and_redacts_payload_identifiers_and_errors(self):
        self.event()
        response = self.request("list")
        self.assertEqual(response.status_code, 200)
        text = str(response.data)
        for private in ["private-object", "NEVER_EXPOSE", "PRIVATE_ERROR", str(self.parent.pk)]:
            self.assertNotIn(private, text)
        self.assertEqual(self.request("list", self.parent).status_code, 403)
        self.assertTrue(Audit.objects.filter(action="operations.queue_read").exists())

    def test_retry_is_allowlisted_idempotent_and_does_not_replay_money_or_running_jobs(self):
        event = self.event()
        data = {"reason": "configuration_restored"}
        for _ in range(2):
            self.assertEqual(self.request("retry", data=data, pk=event.pk).status_code, 200)
        event.refresh_from_db()
        self.assertEqual((event.status, event.attempts, event.error), ("pending", 0, ""))
        self.assertEqual(Audit.objects.filter(action="operations.delivery_retried").count(), 1)
        for kind, state, expected in [
            ("payment.refund_required", "dead", 400),
            ("attachment.scan", "processing", 409),
            ("attachment.scan", "completed", 409),
        ]:
            blocked = self.event(kind, state)
            self.assertEqual(self.request("retry", data=data, pk=blocked.pk).status_code, expected)
            blocked.refresh_from_db()
            self.assertEqual(blocked.status, state)
        self.assertEqual(
            self.request("retry", user=self.parent, data=data, pk=event.pk).status_code, 403
        )

    def test_dispute_requires_matched_evidence_and_never_changes_money(self):
        doctor = Account.objects.create_user(
            username="doctor", email="doctor@example.test", role="doctor"
        )
        provider = Practitioner.objects.create(
            user=doctor, profession="doctor", specialty="synthetic"
        )
        child = Child.objects.create(name="Synthetic", date_of_birth=date(2020, 1, 1))
        slot = Slot.objects.create(
            practitioner=provider,
            starts_at=timezone.now(),
            ends_at=timezone.now() + timedelta(hours=1),
        )
        appointment = Appointment.objects.create(
            child=child,
            booker=self.parent,
            practitioner=provider,
            slot=slot,
            amount_minor=10000,
            hold_expires_at=timezone.now(),
        )
        payment = Payment.objects.create(
            appointment=appointment, amount_minor=10000, status="captured"
        )
        event = PaymentEvent.objects.create(
            provider_event_id="evt_test", kind="payment.dispute.created", payment=payment
        )
        data = {"resolution": "provider_closed", "evidence_reference": "provider-case:test123"}
        self.assertEqual(self.request("resolve_dispute", data=data, pk=event.pk).status_code, 200)
        self.assertEqual(self.request("resolve_dispute", data=data, pk=event.pk).status_code, 200)
        self.assertEqual(
            self.request(
                "resolve_dispute", data={**data, "evidence_reference": "case:other"}, pk=event.pk
            ).status_code,
            409,
        )
        event.refresh_from_db()
        payment.refresh_from_db()
        self.assertEqual(event.status, "reviewed")
        self.assertEqual(payment.status, "captured")
        self.assertFalse(LedgerEntry.objects.exists())
        self.assertEqual(Audit.objects.filter(action="payment.dispute_reviewed").count(), 1)
        unmatched = PaymentEvent.objects.create(
            provider_event_id="evt_unmatched", kind="payment.dispute.created"
        )
        self.assertEqual(
            self.request("resolve_dispute", data=data, pk=unmatched.pk).status_code, 400
        )

    @override_settings(PRODUCTION=False, BUSINESS_POLICY_PATH="")
    def test_consumer_terms_hide_internal_approval_evidence(self):
        request = self.factory.get("/")
        force_authenticate(request, user=self.parent)
        response = policies(request)
        self.assertEqual(response.data["policy"]["approval"], {"status": "synthetic"})
        self.assertFalse(response.data["production_approved"])
