"""Paid demo calls stay isolated from clinical accounts and records."""
from datetime import date, timedelta
from io import StringIO
from unittest.mock import Mock, patch
import jwt
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from .models import Account, Appointment, Child, Grant, Guardianship, Outbox, Practitioner, Slot
from .finance import hold_appointment
from .tasks import revoke_rooms


@override_settings(PRODUCTION=True, DEMO_MODE=False, SANDBOX_BOOKING_ENABLED=True,
    RAZORPAY_KEY_ID="rzp_test_review", RAZORPAY_KEY_SECRET="synthetic",
    LIVEKIT_URL="wss://synthetic.livekit.cloud", LIVEKIT_API_KEY="synthetic-key",
    LIVEKIT_API_SECRET="synthetic-signing-secret-for-unit-tests-only", OUTBOX_WORKER_ENABLED=True)
class DemoConsultationTests(TestCase):
    def setUp(self):
        call_command("seed_demo_doctors", allow_production_test_profiles=True, stdout=StringIO())
        self.parent = Account.objects.create_user(username="video-parent", email="video-parent@example.invalid", role="parent")
        self.child = Child.objects.create(name="Synthetic video child", date_of_birth=date(2024, 1, 1))
        self.membership = Guardianship.objects.create(child=self.child, user=self.parent, email=self.parent.email, status="active", can_share=True)
        self.practitioner = Practitioner.objects.get(fee_minor=10000)
        self.slot = Slot.objects.filter(practitioner=self.practitioner, consultation_mode="online").order_by("starts_at").first()
        self.appointment = hold_appointment(self.parent, self.child, self.slot)
        self.client = APIClient()
        self.client.force_authenticate(self.parent)
        self.worker = patch("api.tasks.scheduler_healthy", return_value=True)
        self.worker.start()
        self.addCleanup(self.worker.stop)

    def join(self, body=None):
        return self.client.post(f"/v1/appointments/{self.appointment.pk}/join/", body or {}, format="json")

    def confirm(self):
        self.appointment.status = "confirmed"
        self.appointment.save(update_fields=["status"])

    def test_payment_required_then_two_distinct_room_scoped_identities_without_record_grants(self):
        self.assertEqual(self.join().status_code, 409)
        self.confirm()
        rooms = [self.join(), self.join({"demo_doctor": True})]
        for response in rooms:
            self.assertEqual(response.status_code, 200, response.data)
            self.assertFalse(response.data["recording"])
            self.assertTrue(response.data["is_demo"])
        tokens = [jwt.decode(r.data["token"], "synthetic-signing-secret-for-unit-tests-only", algorithms=["HS256"], issuer="synthetic-key") for r in rooms]
        self.assertEqual(tokens[0]["sub"], str(self.parent.pk))
        self.assertEqual(tokens[1]["sub"], str(self.practitioner.user_id))
        self.assertEqual(tokens[0]["video"]["room"], tokens[1]["video"]["room"])
        self.assertEqual(tokens[0]["name"], "Demo parent")
        self.assertTrue(tokens[1]["name"].endswith("test only"))
        for token in tokens:
            self.assertLessEqual(token["exp"] - token["nbf"], 125)
            self.assertNotIn("roomAdmin", token["video"])
            self.assertNotIn("roomRecord", token["video"])
        self.assertEqual(Grant.objects.count(), 0)

    def test_other_parent_revoked_access_and_malformed_roles_are_denied(self):
        self.confirm()
        for body in [{"demo_doctor": 1}, {"demo_doctor": False}, {"demo_doctor": True, "room": "other"}]:
            self.assertEqual(self.join(body).status_code, 400)
        other = Account.objects.create_user(username="video-other", email="video-other@example.invalid", role="parent")
        self.client.force_authenticate(other)
        self.assertEqual(self.join({"demo_doctor": True}).status_code, 404)
        self.client.force_authenticate(self.parent)
        self.membership.revoked_at = timezone.now()
        self.membership.save(update_fields=["revoked_at"])
        self.assertIn(self.join().status_code, [403, 404])

    def test_room_denies_cancelled_expired_in_person_disabled_sandbox_and_stale_worker(self):
        self.confirm()
        with override_settings(SANDBOX_BOOKING_ENABLED=False):
            self.assertEqual(self.join().status_code, 403)
        with patch("api.tasks.scheduler_healthy", return_value=False):
            self.assertEqual(self.join().status_code, 503)
        self.appointment.status = "cancelled"
        self.appointment.save(update_fields=["status"])
        self.assertEqual(self.join().status_code, 409)
        self.confirm()
        Slot.objects.filter(pk=self.slot.pk).update(starts_at=timezone.now()-timedelta(hours=2), ends_at=timezone.now()-timedelta(hours=1))
        self.assertEqual(self.join().status_code, 409)
        clinic = Slot.objects.filter(practitioner=self.practitioner, consultation_mode="in_person").first()
        Appointment.objects.filter(pk=self.appointment.pk).update(slot=clinic)
        self.assertEqual(self.join().status_code, 409)

    def test_cancellation_revokes_known_and_connected_participants_with_explicit_cutoff(self):
        self.confirm()
        item = Outbox.objects.create(kind="booking.cancelled", aggregate_id=self.appointment.pk, child_id=self.child.pk, available_at=timezone.now())
        response = Mock(status_code=200)
        response.json.return_value = {"participants": [{"identity": "another-authorized-guardian"}]}
        with patch("api.tasks.httpx.post", return_value=response) as provider:
            revoke_rooms(item)
        self.assertTrue(provider.call_args_list[0].args[0].endswith("/ListParticipants"))
        removed = {c.kwargs["json"]["identity"] for c in provider.call_args_list[1:]}
        self.assertEqual(removed, {str(self.parent.pk), str(self.practitioner.user_id), "another-authorized-guardian"})
        for call in provider.call_args_list[1:]:
            self.assertIn("revoke_token_ts", call.kwargs["json"])
