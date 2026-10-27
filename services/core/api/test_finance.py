"""Critical financial invariants; run: python manage.py test api.test_finance."""

from datetime import date, timedelta
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
import hashlib
import hmac
import json
from unittest import skipUnless
from unittest.mock import patch

from django.conf import settings
from django.db import IntegrityError, close_old_connections, connection, connections, transaction
from django.test import TestCase, TransactionTestCase, override_settings
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.test import APIClient

from .finance import (
    ProviderUnavailable,
    cancel_appointment,
    create_payment,
    create_route_account,
    create_slot,
    hold_appointment,
    process_payment_event,
    reconcile_transfer,
    request_refund,
    reschedule_appointment,
    simulate_capture,
    transfer_payment,
)
from .models import (
    Account,
    Appointment,
    Child,
    Grant,
    Guardianship,
    LedgerEntry,
    Outbox,
    Payment,
    PaymentEvent,
    Practitioner,
    Refund,
    Slot,
)


def rows(response):
    """List endpoints return a page envelope; assertions care about the rows in it."""
    data = response.json() if hasattr(response, "json") else response
    return data["results"] if isinstance(data, dict) and "results" in data else data


@override_settings(DEMO_MODE=True)
class FinanceTests(TestCase):
    def setUp(self):
        self.parent = Account.objects.create_user(
            username="parent", email="parent@example.test", role="parent"
        )
        self.other = Account.objects.create_user(
            username="other", email="other@example.test", role="parent"
        )
        self.doctor = Account.objects.create_user(
            username="doctor", email="doctor@example.test", role="doctor"
        )
        self.child = Child.objects.create(name="Synthetic child", date_of_birth=date(2019, 1, 1))
        self.guardian = Guardianship.objects.create(
            child=self.child,
            user=self.parent,
            email=self.parent.email,
            status="active",
            can_share=True,
        )
        self.practitioner = Practitioner.objects.create(
            user=self.doctor,
            profession="doctor",
            specialty="Development",
            verified=True,
            status="active",
            fee_minor=150000,
        )
        self.grant = Grant.objects.create(
            child=self.child,
            recipient=self.doctor,
            grantor=self.parent,
            scopes=["records"],
            purpose="Synthetic consultation",
            expires_at=timezone.now() + timedelta(days=30),
        )
        self.start = timezone.now() + timedelta(days=2)
        self.slot = create_slot(self.doctor, self.start, self.start + timedelta(minutes=30))

    def book(self):
        appointment = hold_appointment(self.parent, self.child, self.slot)
        return appointment, create_payment(self.parent, appointment)

    def capture_data(self, payment):
        return {
            "id": f"pay_demo_{payment.pk.hex}",
            "order_id": payment.provider_order_id,
            "amount": payment.amount_minor,
            "currency": "INR",
        }

    def test_consultation_modes_require_location_only_for_in_person_slots(self):
        start = self.start + timedelta(days=1)
        for mode, address in [
            ("in_person", ""),
            ("in_person", "   "),
            ("online", "A clinic"),
            ("unknown", ""),
            ("in_person", "x" * 501),
        ]:
            with self.subTest(mode=mode, address=address), self.assertRaises(ValidationError):
                create_slot(self.doctor, start, start + timedelta(minutes=30), mode, address)
        slot = create_slot(
            self.doctor,
            start,
            start + timedelta(minutes=30),
            "in_person",
            "  Synthetic Clinic, Kochi  ",
        )
        self.assertEqual(slot.clinic_address, "Synthetic Clinic, Kochi")
        self.assertEqual(slot.consultation_mode, "in_person")
        with transaction.atomic(), self.assertRaises(IntegrityError):
            Slot.objects.create(
                practitioner=self.practitioner,
                starts_at=start + timedelta(days=2),
                ends_at=start + timedelta(days=2, minutes=30),
                consultation_mode="in_person",
                clinic_address="",
            )

    def test_in_person_payment_is_confirmed_by_same_server_pipeline_and_has_no_video_room(self):
        start = self.start + timedelta(days=1)
        slot = create_slot(
            self.doctor,
            start,
            start + timedelta(minutes=30),
            "in_person",
            "Synthetic Clinic, Kochi",
        )
        appointment = hold_appointment(self.parent, self.child, slot)
        payment = create_payment(self.parent, appointment)
        self.assertEqual(appointment.status, "awaiting_payment")
        simulate_capture(payment)
        appointment.refresh_from_db()
        self.assertEqual(appointment.status, "confirmed")
        self.assertEqual(appointment.amount_minor, self.practitioner.fee_minor)
        client = APIClient()
        client.force_authenticate(self.parent)
        response = client.get(f"/v1/appointments/{appointment.pk}/")
        self.assertEqual(response.data["consultation_mode"], "in_person")
        self.assertEqual(response.data["clinic_address"], "Synthetic Clinic, Kochi")
        with override_settings(
            LIVEKIT_URL="wss://example.invalid",
            LIVEKIT_API_KEY="synthetic-test-key",
            LIVEKIT_API_SECRET="synthetic-test-secret",
        ):
            response = client.post(f"/v1/appointments/{appointment.pk}/join/", {}, format="json")
        self.assertEqual(response.status_code, 409)
        self.assertNotIn("token", response.data)

    def test_slot_api_accepts_type_and_address_and_rejects_parent_availability(self):
        client = APIClient()
        payload = {
            "starts_at": (self.start + timedelta(days=1)).isoformat(),
            "ends_at": (self.start + timedelta(days=1, minutes=30)).isoformat(),
            "consultation_mode": "in_person",
            "clinic_address": "Synthetic Clinic, Kochi",
        }
        client.force_authenticate(self.parent)
        self.assertEqual(client.post("/v1/slots/", payload, format="json").status_code, 403)
        client.force_authenticate(self.doctor)
        response = client.post("/v1/slots/", payload, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["consultation_mode"], "in_person")
        self.assertEqual(response.data["clinic_address"], payload["clinic_address"])

    def test_rescheduling_cannot_silently_change_consultation_type(self):
        appointment = hold_appointment(self.parent, self.child, self.slot)
        start = self.start + timedelta(days=1)
        in_person = create_slot(
            self.doctor, start, start + timedelta(minutes=30), "in_person", "Synthetic Clinic"
        )
        with self.assertRaises(ValidationError):
            reschedule_appointment(self.parent, appointment, in_person)
        appointment.refresh_from_db()
        self.assertEqual(appointment.slot_id, self.slot.pk)

    def test_offline_appointments_are_not_sent_to_video_revocation_service(self):
        from .tasks import revoke_rooms

        start = self.start + timedelta(days=1)
        slot = create_slot(
            self.doctor, start, start + timedelta(minutes=30), "in_person", "Synthetic Clinic"
        )
        appointment = hold_appointment(self.parent, self.child, slot)
        appointment.status = "confirmed"
        appointment.save(update_fields=["status"])
        self.grant.revoked_at = timezone.now()
        self.grant.save(update_fields=["revoked_at"])
        item = Outbox.objects.create(
            kind="consent.revoked",
            aggregate_id=str(self.grant.pk),
            child_id=self.child.pk,
            available_at=timezone.now(),
        )
        with (
            override_settings(
                LIVEKIT_API_KEY="synthetic-key", LIVEKIT_API_SECRET="synthetic-secret"
            ),
            patch("api.tasks.httpx.post") as provider,
        ):
            revoke_rooms(item)
        provider.assert_not_called()

    def test_booking_is_idempotent_for_same_guardian_and_enforces_price_snapshot(self):
        appointment = hold_appointment(self.parent, self.child, self.slot)
        duplicate = hold_appointment(self.parent, self.child, self.slot)
        self.assertEqual(appointment.pk, duplicate.pk)
        self.practitioner.fee_minor = 200000
        self.practitioner.save()
        self.assertEqual(create_payment(self.parent, appointment).amount_minor, 150000)
        self.assertEqual(Appointment.objects.count(), 1)

    def test_database_rejects_second_active_slot_reservation(self):
        appointment = hold_appointment(self.parent, self.child, self.slot)
        with self.assertRaises(IntegrityError), transaction.atomic():
            Appointment.objects.create(
                child=self.child,
                booker=self.parent,
                slot=self.slot,
                practitioner=self.practitioner,
                amount_minor=1,
                hold_expires_at=appointment.hold_expires_at,
            )

    def test_other_family_revoked_guardian_and_suspended_practitioner_cannot_book(self):
        with self.assertRaises(PermissionDenied):
            hold_appointment(self.other, self.child, self.slot)
        self.guardian.revoked_at = timezone.now()
        self.guardian.save()
        with self.assertRaises(PermissionDenied):
            hold_appointment(self.parent, self.child, self.slot)
        self.practitioner.status = "suspended"
        self.practitioner.save()
        with self.assertRaises(ValidationError):
            hold_appointment(self.parent, self.child, self.slot)

    def test_booking_requires_current_clinician_consent(self):
        self.grant.revoked_at = timezone.now()
        self.grant.save(update_fields=["revoked_at"])
        with self.assertRaises(PermissionDenied):
            hold_appointment(self.parent, self.child, self.slot)

    def test_payment_requires_current_clinician_consent(self):
        appointment = hold_appointment(self.parent, self.child, self.slot)
        self.grant.revoked_at = timezone.now()
        self.grant.save(update_fields=["revoked_at"])
        with self.assertRaises(PermissionDenied):
            create_payment(self.parent, appointment)

    def test_slot_overlap_is_rejected_and_adjacent_interval_is_allowed(self):
        with self.assertRaises(ValidationError):
            create_slot(
                self.doctor, self.start + timedelta(minutes=10), self.start + timedelta(minutes=40)
            )
        adjacent = create_slot(
            self.doctor, self.start + timedelta(minutes=30), self.start + timedelta(minutes=60)
        )
        self.assertIsNotNone(adjacent.pk)

    def test_mentors_cannot_create_or_charge_for_undeliverable_consultations(self):
        self.doctor.role = "mentor"
        self.doctor.save(update_fields=["role"])
        self.practitioner.profession = "mentor"
        self.practitioner.save(update_fields=["profession"])
        with self.assertRaises(ValidationError):
            create_slot(
                self.doctor, self.start + timedelta(hours=2), self.start + timedelta(hours=3)
            )
        with self.assertRaises(ValidationError):
            hold_appointment(self.parent, self.child, self.slot)
        self.assertFalse(Appointment.objects.exists())
        self.assertFalse(Payment.objects.exists())

    def test_retained_adult_records_do_not_authorize_new_child_booking(self):
        self.child.date_of_birth = date(2000, 1, 1)
        self.child.save(update_fields=["date_of_birth"])
        with patch("api.finance.require_child"), self.assertRaises(PermissionDenied):
            hold_appointment(self.parent, self.child, self.slot)

    def test_dispute_holds_payment_and_blocks_automatic_payout(self):
        appointment, payment = self.book()
        simulate_capture(payment)
        appointment.status = "completed"
        appointment.save(update_fields=["status"])
        self.practitioner.route_account_id = f"acc_demo_{self.practitioner.pk.hex}"
        self.practitioner.save(update_fields=["route_account_id"])
        event = process_payment_event(
            "dispute-hold",
            "payment.dispute.created",
            {"id": "dispute_demo", "payment_id": payment.provider_payment_id},
        )
        payment.refresh_from_db()
        self.assertEqual(event.status, "review_required")
        self.assertEqual(payment.status, "reconciliation_required")
        with self.assertRaises(ValidationError):
            transfer_payment(payment)
        self.assertFalse(LedgerEntry.objects.filter(reference=f"transfer:{payment.pk}").exists())

    def test_duplicate_capture_and_late_failure_do_not_duplicate_money(self):
        appointment, payment = self.book()
        data = self.capture_data(payment)
        for event_id in ["evt-one", "evt-one", "evt-two"]:
            process_payment_event(event_id, "payment.captured", data)
        process_payment_event("evt-failure", "payment.failed", {**data, "id": "pay_failed_attempt"})
        payment.refresh_from_db()
        appointment.refresh_from_db()
        self.assertEqual(payment.status, "captured")
        self.assertEqual(appointment.status, "confirmed")
        self.assertEqual(LedgerEntry.objects.filter(payment=payment).count(), 1)
        self.assertEqual(Outbox.objects.filter(kind="booking.confirmed").count(), 1)
        self.assertEqual(PaymentEvent.objects.count(), 3)

    def test_amount_currency_and_identifier_mismatch_rejected(self):
        appointment, payment = self.book()
        data = self.capture_data(payment)
        for index, invalid in enumerate([{"amount": 1}, {"currency": "USD"}, {"amount": True}]):
            event = process_payment_event(f"wrong-{index}", "payment.captured", {**data, **invalid})
            self.assertEqual(event.status, "rejected")
        self.assertFalse(LedgerEntry.objects.exists())
        simulate_capture(payment)
        other_id = process_payment_event(
            "different-capture", "payment.captured", {**data, "id": "pay_someone_else"}
        )
        self.assertEqual(other_id.status, "rejected")

    def test_expired_capture_cannot_displace_replacement_booking(self):
        appointment, payment = self.book()
        Appointment.objects.filter(pk=appointment.pk).update(
            hold_expires_at=timezone.now() - timedelta(seconds=1)
        )
        replacement = hold_appointment(self.parent, self.child, self.slot)
        simulate_capture(payment)
        appointment.refresh_from_db()
        replacement.refresh_from_db()
        self.assertEqual(appointment.status, "expired")
        self.assertEqual(replacement.status, "awaiting_payment")
        self.assertEqual(payment.status, "reconciliation_required")
        self.assertTrue(Outbox.objects.filter(kind="payment.refund_required").exists())

    def test_revocation_between_order_and_capture_requires_refund(self):
        appointment, payment = self.book()
        self.guardian.revoked_at = timezone.now()
        self.guardian.save()
        simulate_capture(payment)
        appointment.refresh_from_db()
        self.assertEqual(appointment.status, "expired")
        self.assertEqual(payment.status, "reconciliation_required")

    def test_refund_is_idempotent_and_cannot_exceed_capture(self):
        appointment, payment = self.book()
        simulate_capture(payment)
        cancel_appointment(self.parent, appointment, "Schedule change")
        refund = request_refund(payment, "guardian-refund-1")
        repeated = request_refund(payment, "guardian-refund-1")
        self.assertEqual(refund.pk, repeated.pk)
        payment.refresh_from_db()
        self.assertEqual(payment.status, "refunded")
        self.assertEqual(payment.refunded_minor, payment.amount_minor)
        self.assertEqual(LedgerEntry.objects.count(), 2)
        with self.assertRaises(ValidationError):
            request_refund(payment, "different-refund-key")
        event = process_payment_event(
            "refund-overflow",
            "refund.processed",
            {
                "id": "rfnd_extra",
                "payment_id": payment.provider_payment_id,
                "amount": 1,
                "currency": "INR",
            },
        )
        self.assertEqual(event.status, "rejected")

    def test_partial_refund_before_capture_and_out_of_order_failure(self):
        appointment, payment = self.book()
        data = self.capture_data(payment)
        refund = {
            "id": "rfnd_partial",
            "payment_id": data["id"],
            "amount": 50000,
            "currency": "INR",
        }
        envelope = {"payment": {"entity": data}, "refund": {"entity": refund}}
        process_payment_event("refund-first", "refund.processed", envelope)
        self.assertFalse(LedgerEntry.objects.exists())
        process_payment_event("capture-after-refund", "payment.captured", data)
        process_payment_event("refund-delayed-failure", "refund.failed", envelope)
        process_payment_event("refund-repeat", "refund.processed", envelope)
        payment.refresh_from_db()
        appointment.refresh_from_db()
        self.assertEqual(payment.status, "partially_refunded")
        self.assertEqual(payment.refunded_minor, 50000)
        self.assertEqual(appointment.status, "expired")
        self.assertEqual(LedgerEntry.objects.count(), 2)

    def test_rescheduling_preserves_payment_and_rejects_occupied_destination(self):
        appointment, payment = self.book()
        simulate_capture(payment)
        next_slot = create_slot(
            self.doctor, self.start + timedelta(hours=1), self.start + timedelta(hours=2)
        )
        changed = reschedule_appointment(self.parent, appointment, next_slot)
        self.assertEqual(changed.slot_id, next_slot.pk)
        self.assertEqual(changed.status, "confirmed")
        self.assertEqual(Payment.objects.get(appointment=changed).pk, payment.pk)
        hold_appointment(self.parent, self.child, self.slot)
        with self.assertRaises(ValidationError):
            reschedule_appointment(self.parent, changed, self.slot)

    @override_settings(DEMO_MODE=False)
    def test_external_order_timeout_cannot_issue_another_order(self):
        appointment = hold_appointment(self.parent, self.child, self.slot)
        with patch("api.finance._provider", side_effect=ProviderUnavailable()) as provider:
            with self.assertRaises(ProviderUnavailable):
                create_payment(self.parent, appointment)
            with self.assertRaises(ProviderUnavailable):
                create_payment(self.parent, appointment)
            self.assertEqual(provider.call_count, 1)
        self.assertEqual(Payment.objects.get(appointment=appointment).status, "order_pending")

    @override_settings(
        PRODUCTION=True,
        DEMO_MODE=False,
        RAZORPAY_KEY_ID="",
        RAZORPAY_KEY_SECRET="",
        RAZORPAY_WEBHOOK_SECRET="",
        OUTBOX_WORKER_ENABLED=False,
    )
    def test_production_does_not_persist_a_payment_without_its_provider(self):
        appointment = Appointment.objects.create(
            child=self.child,
            booker=self.parent,
            practitioner=self.practitioner,
            slot=self.slot,
            amount_minor=self.practitioner.fee_minor,
            hold_expires_at=timezone.now() + timedelta(minutes=10),
        )
        with self.assertRaises(ProviderUnavailable):
            create_payment(self.parent, appointment)
        self.assertFalse(Payment.objects.filter(appointment=appointment).exists())

    def test_demo_simulation_is_disabled_without_demo_setting(self):
        _, payment = self.book()
        with override_settings(DEMO_MODE=False), self.assertRaises(PermissionDenied):
            simulate_capture(payment)

    def test_transfer_is_once_after_completed_consultation(self):
        appointment, payment = self.book()
        simulate_capture(payment)
        self.practitioner.route_account_id = "acc_demo_practitioner"
        self.practitioner.save()
        with self.assertRaises(ValidationError):
            transfer_payment(payment)
        Appointment.objects.filter(pk=appointment.pk).update(status="completed")
        one, two = transfer_payment(payment), transfer_payment(payment)
        self.assertEqual(one["id"], two["id"])
        self.assertEqual(LedgerEntry.objects.filter(reference=f"transfer:{payment.pk}").count(), 1)

    def transfer_fixture(self):
        appointment, payment = self.book()
        simulate_capture(payment)
        Appointment.objects.filter(pk=appointment.pk).update(status="completed")
        self.practitioner.route_account_id = "acc_reviewed"
        self.practitioner.save()
        payment.demo = False
        payment.save(update_fields=["demo"])
        item = {
            "id": "trf_reviewed",
            "status": "processed",
            "source": payment.provider_payment_id,
            "recipient": "acc_reviewed",
            "amount": payment.amount_minor,
            "currency": "INR",
            "notes": {"neuronest_payment": str(payment.pk)},
            "settlement_status": "pending",
        }
        return payment, item

    def test_transfer_timeout_recovers_by_reading_evidence_without_second_write(self):
        payment, item = self.transfer_fixture()
        with patch("api.finance._provider", side_effect=ProviderUnavailable()) as provider:
            with self.assertRaises(ProviderUnavailable):
                transfer_payment(payment)
            self.assertEqual(provider.call_args.args[0], "POST")
        payment.refresh_from_db()
        self.assertTrue(payment.transfer_id.startswith("pending:"))
        self.assertFalse(LedgerEntry.objects.filter(reference=f"transfer:{payment.pk}").exists())
        with patch("api.finance._provider", return_value={"items": [item]}) as provider:
            one = transfer_payment(payment)
            two = transfer_payment(payment)
            self.assertEqual(one["id"], two["id"])
            self.assertEqual(one["settlement_status"], "pending")
            self.assertTrue(all(call.args[0] == "GET" for call in provider.call_args_list))
        self.assertEqual(LedgerEntry.objects.filter(reference=f"transfer:{payment.pk}").count(), 1)

    def test_missing_ambiguous_or_mismatched_transfer_evidence_stays_pending(self):
        payment, item = self.transfer_fixture()
        payment.transfer_id = f"pending:{payment.pk}"
        payment.save(update_fields=["transfer_id"])
        for items in [
            [],
            [item, {**item, "id": "trf_duplicate"}],
            [{**item, "recipient": "acc_other"}],
            [{**item, "amount": payment.amount_minor + 1}],
            [{**item, "notes": {}}],
        ]:
            with (
                self.subTest(items=items),
                patch("api.finance._provider", return_value={"items": items}) as provider,
            ):
                with self.assertRaises(ProviderUnavailable):
                    transfer_payment(payment)
                self.assertEqual(provider.call_args.args[0], "GET")
                payment.refresh_from_db()
                self.assertTrue(payment.transfer_id.startswith("pending:"))
        self.assertFalse(LedgerEntry.objects.filter(reference=f"transfer:{payment.pk}").exists())

    def test_pending_transfer_is_not_entered_as_money_moved(self):
        payment, item = self.transfer_fixture()
        with patch(
            "api.finance._provider", return_value={"items": [{**item, "status": "pending"}]}
        ):
            result = transfer_payment(payment)
        self.assertEqual(result["status"], "pending")
        self.assertFalse(LedgerEntry.objects.filter(reference=f"transfer:{payment.pk}").exists())
        with patch("api.finance._provider", return_value={"items": [item]}):
            reconcile_transfer(payment)
        self.assertEqual(LedgerEntry.objects.filter(reference=f"transfer:{payment.pk}").count(), 1)

    @override_settings(DEMO_MODE=False)
    def test_route_account_timeout_requires_matching_readonly_recovery(self):
        data = {
            "email": "provider@example.test",
            "phone": "9999999999",
            "legal_business_name": "Test Provider",
            "business_type": "individual",
            "profile": {"category": "healthcare"},
        }
        with patch("api.finance._provider", side_effect=ProviderUnavailable()) as provider:
            with self.assertRaises(ProviderUnavailable):
                create_route_account(self.practitioner, data)
            self.assertEqual(provider.call_args.args[0], "POST")
        self.practitioner.refresh_from_db()
        self.assertTrue(self.practitioner.route_account_id.startswith("pending:"))
        with patch("api.finance._provider") as provider:
            with self.assertRaises(ValidationError):
                create_route_account(self.practitioner, data)
            provider.assert_not_called()
        evidence = {
            "id": "acc_recovered",
            "type": "route",
            "reference_id": self.practitioner.pk.hex,
            "status": "created",
        }
        with patch(
            "api.finance._provider",
            return_value={**evidence, "reference_id": "another-practitioner"},
        ) as provider:
            with self.assertRaises(ProviderUnavailable):
                create_route_account(self.practitioner, {"provider_account_id": "acc_recovered"})
            self.assertEqual(provider.call_args.args[0], "GET")
        self.practitioner.refresh_from_db()
        self.assertTrue(self.practitioner.route_account_id.startswith("pending:"))
        with patch("api.finance._provider", return_value=evidence) as provider:
            result = create_route_account(
                self.practitioner, {"provider_account_id": "acc_recovered"}
            )
            self.assertTrue(result["reconciled"])
            provider.assert_called_once_with("GET", "/v2/accounts/acc_recovered")
        self.practitioner.refresh_from_db()
        self.assertEqual(self.practitioner.route_account_id, "acc_recovered")

    def test_policy_is_cached_per_file_version_but_never_shared_or_stale(self):
        import json as _json
        import os as _os
        import tempfile
        from .policies import booking_policy_snapshot, validate_policy

        source = _json.loads((settings.BASE_DIR / "config" / "policies" / "demo.json").read_text())
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "policy.json"
            path.write_text(_json.dumps(source))
            with override_settings(BUSINESS_POLICY_PATH=str(path)):
                with patch("api.policies.validate_policy", side_effect=validate_policy) as validate:
                    first = booking_policy_snapshot()
                    second = booking_policy_snapshot()
                    self.assertEqual(
                        validate.call_count, 1, "An unchanged policy file is read once"
                    )
                # Each caller gets its own object: snapshots are recorded and amended.
                self.assertIsNot(first, second)
                first["booking"]["hold_minutes"] = 41
                self.assertNotEqual(booking_policy_snapshot()["booking"]["hold_minutes"], 41)
                # An operations swap of the approved artifact is picked up without a restart.
                source["version"] = "replaced-artifact"
                path.write_text(_json.dumps(source))
                _os.utime(path, ns=(path.stat().st_atime_ns, path.stat().st_mtime_ns + 10**9))
                self.assertEqual(booking_policy_snapshot()["version"], "replaced-artifact")

    def test_booking_policy_snapshot_controls_refund_and_provider_payout(self):
        from .policies import booking_policy_snapshot

        policy = booking_policy_snapshot()
        policy["version"] = "synthetic-policy-check"
        policy["booking"]["hold_minutes"] = 3
        policy["fees"]["platform_fee_bps"] = 1250
        policy["cancellation"]["refund_percent"] = 50
        with patch("api.finance.booking_policy_snapshot", return_value=policy):
            appointment, payment = self.book()
        self.assertEqual(appointment.policy_snapshot["version"], "synthetic-policy-check")
        self.assertLessEqual(appointment.hold_expires_at - timezone.now(), timedelta(minutes=3))
        simulate_capture(payment)
        cancel_appointment(self.parent, appointment)
        refund = request_refund(payment, "policy-half-refund")
        self.assertEqual(refund.amount_minor, payment.amount_minor // 2)
        self.assertEqual(
            Appointment.objects.get(pk=appointment.pk).policy_snapshot["cancellation_decision"][
                "refund_percent"
            ],
            50,
        )

        next_slot = create_slot(
            self.doctor, self.start + timedelta(hours=1), self.start + timedelta(hours=2)
        )
        with patch("api.finance.booking_policy_snapshot", return_value=policy):
            next_appointment = hold_appointment(self.parent, self.child, next_slot)
        next_payment = create_payment(self.parent, next_appointment)
        simulate_capture(next_payment)
        Appointment.objects.filter(pk=next_appointment.pk).update(status="completed")
        self.practitioner.route_account_id = "acc_demo_provider"
        self.practitioner.save()
        transfer_payment(next_payment)
        self.assertEqual(
            LedgerEntry.objects.get(reference=f"transfer:{next_payment.pk}").amount_minor, 131250
        )
        self.assertEqual(
            LedgerEntry.objects.get(reference=f"commission:{next_payment.pk}").amount_minor, 18750
        )

    def test_expired_reservation_keeps_full_refund_despite_cancellation_penalty(self):
        from .policies import booking_policy_snapshot

        policy = booking_policy_snapshot()
        policy["cancellation"]["refund_percent"] = 0
        with patch("api.finance.booking_policy_snapshot", return_value=policy):
            appointment, payment = self.book()
        Appointment.objects.filter(pk=appointment.pk).update(status="expired")
        simulate_capture(payment)
        cancel_appointment(self.parent, appointment)
        refund = request_refund(payment, "expired-full-refund")
        self.assertEqual(refund.amount_minor, payment.amount_minor)

    def test_unknown_provider_events_are_saved_for_reconciliation(self):
        event = process_payment_event(
            "unknown-order",
            "payment.captured",
            {"id": "pay_unknown", "order_id": "order_unknown", "amount": 100, "currency": "INR"},
        )
        self.assertEqual(event.status, "unmatched")
        self.assertFalse(LedgerEntry.objects.exists())

    def test_refund_webhook_can_arrive_before_refund_post_response(self):
        appointment, payment = self.book()
        simulate_capture(payment)
        cancel_appointment(self.parent, appointment)
        payment.demo = False
        payment.save()

        def provider_response(method, path, *, data=None, headers=None):
            item = {
                "id": "rfnd_racing",
                "payment_id": payment.provider_payment_id,
                "amount": data["amount"],
                "currency": "INR",
                "receipt": data["receipt"],
                "status": "processed",
            }
            process_payment_event("racing-webhook", "refund.processed", item)
            return item

        with patch("api.finance._provider", side_effect=provider_response):
            refund = request_refund(payment, "racing-request")
        self.assertEqual(refund.status, "processed")
        self.assertEqual(Refund.objects.count(), 1)
        self.assertEqual(LedgerEntry.objects.count(), 2)

    @override_settings(RAZORPAY_WEBHOOK_SECRET="synthetic-webhook-secret")
    def test_webhook_requires_signature_and_duplicate_delivery_remains_idempotent(self):
        _, payment = self.book()
        client = APIClient()
        body = json.dumps(
            {
                "event": "payment.captured",
                "payload": {"payment": {"entity": self.capture_data(payment)}},
            }
        )
        rejected = client.post(
            "/v1/webhooks/razorpay/",
            body,
            content_type="application/json",
            HTTP_X_RAZORPAY_EVENT_ID="api-event",
            HTTP_X_RAZORPAY_SIGNATURE="wrong",
        )
        self.assertEqual(rejected.status_code, 403)
        self.assertFalse(LedgerEntry.objects.exists())
        signature = hmac.new(b"synthetic-webhook-secret", body.encode(), hashlib.sha256).hexdigest()
        for _ in range(2):
            accepted = client.post(
                "/v1/webhooks/razorpay/",
                body,
                content_type="application/json",
                HTTP_X_RAZORPAY_EVENT_ID="api-event",
                HTTP_X_RAZORPAY_SIGNATURE=signature,
            )
            self.assertEqual(accepted.status_code, 200, accepted.data)
        self.assertEqual(LedgerEntry.objects.count(), 1)

    def test_payment_api_filters_other_family_and_has_no_simulation_route(self):
        _, payment = self.book()
        client = APIClient()
        client.force_authenticate(self.other)
        self.assertEqual(rows(client.get("/v1/payments/")), [])
        self.assertEqual(client.get(f"/v1/payments/{payment.pk}/").status_code, 404)
        client.force_authenticate(self.parent)
        response = client.get(f"/v1/payments/{payment.pk}/")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("demo", response.data)
        self.assertNotIn("demo", response.data["checkout"])
        self.assertEqual(client.post(f"/v1/payments/{payment.pk}/simulate/").status_code, 404)
        self.guardian.revoked_at = timezone.now()
        self.guardian.save()
        self.assertEqual(client.get(f"/v1/payments/{payment.pk}/").status_code, 404)


@skipUnless(connection.vendor == "postgresql", "PostgreSQL row-lock concurrency verification")
@override_settings(DEMO_MODE=True)
class BookingConcurrencyTests(TransactionTestCase):
    def test_two_guardians_racing_for_one_slot_have_one_winner(self):
        # TransactionTestCase commits setup rows, so independent thread connections see them.
        FinanceTests.setUp(self)
        Guardianship.objects.create(
            child=self.child,
            user=self.other,
            email=self.other.email,
            status="active",
            can_share=True,
        )
        ready = Barrier(2)

        def reserve(user_id):
            close_old_connections()
            try:
                user = Account.objects.get(pk=user_id)
                child = Child.objects.get(pk=self.child.pk)
                slot = Slot.objects.get(pk=self.slot.pk)
                ready.wait(timeout=10)
                try:
                    return str(hold_appointment(user, child, slot).pk)
                except ValidationError:
                    return "conflict"
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=2) as pool:
            outcomes = list(pool.map(reserve, [self.parent.pk, self.other.pk]))
        self.assertEqual(outcomes.count("conflict"), 1)
        self.assertEqual(
            Appointment.objects.filter(slot=self.slot, status="awaiting_payment").count(), 1
        )
