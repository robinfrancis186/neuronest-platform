from datetime import date
from unittest.mock import patch
from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework.exceptions import PermissionDenied
from .models import Account, Child, Guardianship, Practitioner, Slot, Appointment, Payment, LedgerEntry, Grant
from .demo_booking import is_demo_practitioner, sandbox_ready
from .finance import hold_appointment, transfer_payment
from .access import require_child


@override_settings(PRODUCTION=True, DEMO_MODE=False, SANDBOX_BOOKING_ENABLED=True,
    RAZORPAY_KEY_ID="rzp_test_review", RAZORPAY_KEY_SECRET="test-secret",
    RAZORPAY_WEBHOOK_SECRET="", OUTBOX_WORKER_ENABLED=False, BUSINESS_POLICY_PATH="")
class SandboxBookingTests(TestCase):
    def setUp(self):
        call_command("seed_demo_doctors", allow_production_test_profiles=True, verbosity=0)
        self.parent = Account.objects.create_user(username="review-parent", email="review-parent@example.invalid", role="parent")
        self.child = Child.objects.create(name="Synthetic review child", date_of_birth=date(2024, 9, 1))
        Guardianship.objects.create(child=self.child, user=self.parent, email=self.parent.email, status="active", can_share=True)
        self.client = APIClient()
        self.client.force_authenticate(self.parent)

    def test_all_four_prices_book_without_creating_or_requiring_clinical_grants(self):
        for p in Practitioner.objects.select_related("user").all():
            self.assertTrue(is_demo_practitioner(p))
            a = hold_appointment(self.parent, self.child, Slot.objects.filter(practitioner=p).order_by("starts_at").first())
            self.assertEqual(a.amount_minor, p.fee_minor)
            self.assertEqual(a.policy_snapshot["environment"], "synthetic")
            self.assertEqual(a.status, "awaiting_payment")
            with self.assertRaises(PermissionDenied):
                require_child(p.user, self.child, "records")
        self.assertEqual(Grant.objects.count(), 0)
        self.assertEqual(set(Appointment.objects.values_list("amount_minor", flat=True)), {10000,15000,20000,30000})

    def test_prepare_is_authenticated_fixed_and_idempotent(self):
        count = Slot.objects.count()
        for _ in range(2):
            response = self.client.post("/v1/demo-bookings/prepare/", {}, format="json")
            self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(Slot.objects.count(), count)
        self.assertEqual(self.client.post("/v1/demo-bookings/prepare/", {"fee":1}, format="json").status_code, 400)
        self.client.force_authenticate(Practitioner.objects.first().user)
        self.assertEqual(self.client.post("/v1/demo-bookings/prepare/", {}, format="json").status_code, 403)
        self.client.force_authenticate(None)
        self.assertIn(self.client.post("/v1/demo-bookings/prepare/", {}, format="json").status_code, [401,403])

    def test_demo_requires_flag_and_test_keys_real_booking_policy_stays_closed(self):
        self.assertTrue(sandbox_ready())
        with override_settings(SANDBOX_BOOKING_ENABLED=False):
            self.assertEqual(self.client.post("/v1/demo-bookings/prepare/", {}, format="json").status_code, 503)
            with self.assertRaises(Exception):
                hold_appointment(self.parent,self.child,Slot.objects.first())
        with override_settings(RAZORPAY_KEY_ID="rzp_live_forbidden"):
            self.assertFalse(sandbox_ready())
        capabilities=self.client.get("/v1/readiness/").data["capabilities"]
        self.assertTrue(capabilities["demo_bookings"]["ready"])
        self.assertFalse(capabilities["payments"]["ready"])
        from .policies import booking_policy_snapshot
        with self.assertRaises(Exception): booking_policy_snapshot()

    def test_name_alone_never_establishes_demo_status(self):
        p=Practitioner.objects.select_related("user").first()
        p.registration_number="ordinary-registration"
        p.save()
        self.assertFalse(is_demo_practitioner(p))
        with self.assertRaises(PermissionDenied): hold_appointment(self.parent,self.child,Slot.objects.filter(practitioner=p).first())

    def test_owned_booking_checkout_and_server_capture_verify_end_to_end(self):
        p=Practitioner.objects.get(fee_minor=15000)
        slot=Slot.objects.filter(practitioner=p).order_by("starts_at").first()
        response=self.client.post("/v1/appointments/", {"child":str(self.child.pk),"slot":str(slot.pk)},format="json")
        self.assertEqual(response.status_code,201,response.data)
        self.assertTrue(response.data["is_demo"])
        a=Appointment.objects.get(pk=response.data["id"])
        with patch("api.finance._provider",return_value={"id":"order_review150","amount":15000,"currency":"INR"}) as provider:
            response=self.client.post("/v1/payments/",{"appointment":str(a.pk)},format="json")
            self.assertEqual(response.status_code,201,response.data)
            sent=provider.call_args.kwargs["data"]
            self.assertEqual(sent["amount"],15000)
            self.assertEqual(set(sent["notes"]),{"neuronest_payment"})
        payment=Payment.objects.get(pk=response.data["id"])
        self.assertFalse(payment.demo, "Production must contact Razorpay test mode, never simulate captures")
        def evidence(method,path,**kwargs):
            if path.endswith("/payments"):
                return {"items":[{"id":"pay_review150","order_id":"order_review150","status":"captured","amount":15000,"currency":"INR"}]}
            return {"items":[]}
        with patch("api.finance._provider",side_effect=evidence):
            for _ in range(2):
                response=self.client.post(f"/v1/payments/{payment.pk}/verify/",{},format="json")
                self.assertEqual(response.status_code,200,response.data)
                self.assertEqual(response.data["status"],"captured")
        a.refresh_from_db();self.assertEqual(a.status,"confirmed")
        self.assertEqual(LedgerEntry.objects.filter(payment=payment,reference=f"capture:{payment.pk}").count(),1)
        with self.assertRaises(Exception):transfer_payment(payment)

    def test_another_parent_and_client_status_cannot_confirm_or_view_a_payment(self):
        a=hold_appointment(self.parent,self.child,Slot.objects.first())
        payment=Payment.objects.create(appointment=a,amount_minor=a.amount_minor,provider_order_id="order_pending")
        with patch("api.finance._provider") as provider:
            self.assertEqual(self.client.post(f"/v1/payments/{payment.pk}/verify/",{"status":"paid"},format="json").status_code,400)
            provider.assert_not_called()
        other=Account.objects.create_user(username="other-review",email="other@example.invalid",role="parent")
        self.client.force_authenticate(other)
        self.assertEqual(self.client.post(f"/v1/payments/{payment.pk}/verify/",{},format="json").status_code,404)
        self.assertEqual(self.client.post("/v1/appointments/",{"child":str(self.child.pk),"slot":str(Slot.objects.last().pk)},format="json").status_code,403)
        a.refresh_from_db();self.assertEqual(a.status,"awaiting_payment")
