from datetime import timedelta
from zoneinfo import ZoneInfo
from django.core.management import call_command, CommandError
from django.test import TestCase, override_settings
from .models import Practitioner, Slot


class DemoDoctorTests(TestCase):
    @override_settings(PRODUCTION=False)
    def test_schedule_prices_and_idempotency(self):
        call_command("seed_demo_doctors")
        self.assertEqual(Practitioner.objects.count(), 4)
        self.assertEqual(set(Practitioner.objects.values_list("fee_minor", flat=True)), {10000, 15000, 20000, 30000})
        count = Slot.objects.count()
        self.assertGreater(count, 0)
        for slot in Slot.objects.all():
            start = slot.starts_at.astimezone(ZoneInfo("Asia/Kolkata"))
            self.assertLess(start.weekday(), 5)
            self.assertIn((start.hour, start.minute), [(10,30),(11,0),(11,30),(12,0),(13,30),(14,0),(14,30)])
            self.assertEqual(slot.ends_at - slot.starts_at, timedelta(minutes=30))
        call_command("seed_demo_doctors")
        self.assertEqual(Slot.objects.count(), count)

    @override_settings(PRODUCTION=True)
    def test_production_rejected(self):
        with self.assertRaises(CommandError):
            call_command("seed_demo_doctors")
        self.assertEqual(Practitioner.objects.count(), 0)

    @override_settings(PRODUCTION=False, DEMO_MODE=True, SANDBOX_BOOKING_ENABLED=True, RAZORPAY_KEY_ID="rzp_test_fixture", RAZORPAY_KEY_SECRET="test-secret")
    def test_test_reservation_confirms(self):
        from datetime import date
        from django.utils import timezone
        from .models import Account, Child, Grant, Guardianship
        from .finance import hold_appointment, create_payment, simulate_capture
        call_command("seed_demo_doctors")
        parent = Account.objects.create_user(username="test-parent", email="test-parent@example.invalid", role="parent")
        child = Child.objects.create(name="Synthetic child", date_of_birth=date(2022, 1, 1))
        Guardianship.objects.create(child=child, user=parent, email=parent.email, status="active", can_share=True)
        slot = Slot.objects.order_by("starts_at").first()
        Grant.objects.create(child=child, recipient=slot.practitioner.user, grantor=parent,
            scopes=["records"], purpose="Test reservation", expires_at=timezone.now() + timedelta(days=30))
        appointment = hold_appointment(parent, child, slot)
        payment = create_payment(parent, appointment)
        self.assertEqual(payment.amount_minor, slot.practitioner.fee_minor)
        simulate_capture(payment)
        appointment.refresh_from_db()
        self.assertEqual(appointment.status, "confirmed")

    @override_settings(PRODUCTION=False)
    def test_slot_list_uses_one_query_for_all_availability(self):
        from rest_framework.test import APIRequestFactory
        from rest_framework.request import Request
        from .views import SlotViewSet
        from .serializers import SlotSerializer
        call_command("seed_demo_doctors")
        view = SlotViewSet()
        view.request = Request(APIRequestFactory().get("/v1/slots/"))
        with self.assertNumQueries(1):
            rows = SlotSerializer(view.get_queryset()[:100], many=True).data
        self.assertEqual(len(rows), 100)
        self.assertTrue(all(row["available"] for row in rows))
