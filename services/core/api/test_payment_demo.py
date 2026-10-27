from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

from django.test import SimpleTestCase, override_settings
from rest_framework.test import APIRequestFactory, force_authenticate

from .payment_demo import AMOUNT_MINOR, PURPOSE, create_demo_checkout, demo_checkout_status
from .finance import ProviderUnavailable, _provider


@override_settings(RAZORPAY_KEY_ID="rzp_test_fixture", RAZORPAY_KEY_SECRET="test-secret")
class PaymentDemoTests(SimpleTestCase):
    def setUp(self):
        self.user = SimpleNamespace(
            pk=uuid4(), is_active=True, is_authenticated=True, role="parent"
        )
        self.factory = APIRequestFactory()

    def request(self, method="post", data=None, order_id=None, user=None):
        req = getattr(self.factory, method)("/v1/payment-demo/", data=data or {}, format="json")
        force_authenticate(req, user=user or self.user)
        if order_id is not None:
            return demo_checkout_status(req, order_id)
        return create_demo_checkout(req)

    def order(self, **overrides):
        return {
            "id": "order_test123",
            "amount": AMOUNT_MINOR,
            "amount_paid": 0,
            "amount_due": AMOUNT_MINOR,
            "currency": "INR",
            "status": "created",
            "notes": {"purpose": PURPOSE, "account": str(self.user.pk)},
            **overrides,
        }

    def test_create_uses_server_amount_and_sends_no_child_or_doctor_details(self):
        with patch("api.payment_demo._provider", return_value=self.order()) as provider:
            response = self.request()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], "pending")
        payload = provider.call_args.kwargs["data"]
        self.assertEqual(payload["amount"], 25000)
        self.assertEqual(payload["currency"], "INR")
        self.assertEqual(set(payload), {"amount", "currency", "receipt", "notes"})
        self.assertEqual(set(payload["notes"]), {"purpose", "account"})
        self.assertLessEqual(len(payload["receipt"]), 40)
        self.assertNotIn("notes", response.data)

    def test_client_cannot_set_amount_attach_records_or_confirm_payment(self):
        for data in [{"amount": 1}, {"child": str(uuid4())}, {"status": "paid"}]:
            with patch("api.payment_demo._provider") as provider:
                self.assertEqual(self.request(data=data).status_code, 400)
                provider.assert_not_called()

    def test_only_authenticated_active_parents_can_create_orders(self):
        self.assertIn(
            create_demo_checkout(self.factory.post("/v1/payment-demo/")).status_code, [401, 403]
        )
        for role, active in [("doctor", True), ("parent", False)]:
            self.user.role, self.user.is_active = role, active
            with patch("api.payment_demo._provider") as provider:
                self.assertEqual(self.request().status_code, 403)
                provider.assert_not_called()

    def test_live_and_missing_keys_never_reach_provider(self):
        for key in ["rzp_live_forbidden", "", "invalid"]:
            with (
                override_settings(RAZORPAY_KEY_ID=key),
                patch("api.payment_demo._provider") as provider,
            ):
                self.assertEqual(self.request().status_code, 503)
                provider.assert_not_called()
        with (
            override_settings(RAZORPAY_KEY_ID="rzp_live_forbidden"),
            patch("api.finance.httpx.request") as request,
        ):
            with self.assertRaises(ProviderUnavailable):
                _provider("POST", "/v1/orders")
            request.assert_not_called()

    def test_owner_and_purpose_are_checked_against_the_provider(self):
        for notes in [
            {"purpose": PURPOSE, "account": str(uuid4())},
            {"purpose": "consultation", "account": str(self.user.pk)},
            None,
        ]:
            with patch("api.payment_demo._provider", return_value=self.order(notes=notes)):
                self.assertEqual(self.request("get", order_id="order_test123").status_code, 403)

    def test_paid_requires_complete_capture_from_server_fetch(self):
        for status, amount_paid, expected in [
            ("attempted", 0, "pending"),
            ("paid", 100, "pending"),
            ("paid", AMOUNT_MINOR, "paid"),
        ]:
            order = self.order(
                status=status, amount_paid=amount_paid, amount_due=AMOUNT_MINOR - amount_paid
            )
            with patch("api.payment_demo._provider", return_value=order) as provider:
                response = self.request("get", order_id="order_test123")
            self.assertEqual(response.data["status"], expected)
            provider.assert_called_once_with("GET", "/v1/orders/order_test123")

    def test_provider_response_and_order_reference_are_validated(self):
        for fields in [
            {"amount": 1},
            {"currency": "USD"},
            {"id": "order_other"},
            {"status": "unexpected"},
        ]:
            with patch("api.payment_demo._provider", return_value=self.order(**fields)):
                self.assertEqual(self.request("get", order_id="order_test123").status_code, 503)
        with patch("api.payment_demo._provider") as provider:
            self.assertEqual(self.request("get", order_id="../../payments").status_code, 400)
            provider.assert_not_called()

    @override_settings(PRODUCTION=True, BUSINESS_POLICY_PATH="")
    def test_demo_does_not_enable_clinical_booking_policy(self):
        from .policies import policy_readiness

        with patch("api.payment_demo._provider", return_value=self.order()):
            self.assertEqual(self.request().status_code, 201)
        self.assertFalse(policy_readiness()["production_approved"])


class StagedDeploymentHostTests(SimpleTestCase):
    def test_only_the_exact_platform_hostname_is_added(self):
        import runpy
        from django.conf import settings

        for hostname, allowed in [
            ("neuronest-core-stage.vercel.app", True),
            ("evil.example", False),
            ("*.vercel.app", False),
            ("good.vercel.app/evil", False),
        ]:
            with patch.dict(
                "os.environ", {"ENVIRONMENT": "development", "VERCEL_URL": hostname}, clear=True
            ):
                namespace = runpy.run_path(str(settings.BASE_DIR / "neuronest" / "settings.py"))
            self.assertEqual(hostname in namespace["ALLOWED_HOSTS"], allowed)


@override_settings(RAZORPAY_KEY_ID="rzp_test_fixture", RAZORPAY_KEY_SECRET="private-test-secret")
class ProviderCredentialErrorTests(SimpleTestCase):
    def test_rejected_credentials_are_actionable_without_logging_private_responses(self):
        import httpx

        response = httpx.Response(
            401,
            json={"error": {"description": "do-not-log-private-provider-data"}},
            request=httpx.Request("POST", "https://api.razorpay.com/v1/orders"),
        )
        with (
            patch("api.finance.httpx.request", return_value=response),
            self.assertLogs("api.finance", level="WARNING") as logs,
        ):
            with self.assertRaises(ProviderUnavailable) as error:
                _provider("POST", "/v1/orders")
        self.assertIn("rejected the test credentials", str(error.exception))
        self.assertIn("HTTP 401", " ".join(logs.output))
        for private in ["private-test-secret", "do-not-log-private-provider-data"]:
            self.assertNotIn(private, " ".join(logs.output))
            self.assertNotIn(private, str(error.exception))


class ProviderKeyConfigurationTests(SimpleTestCase):
    def test_api_key_file_newlines_are_removed_without_changing_webhook_secret(self):
        import runpy
        from django.conf import settings

        with patch.dict(
            "os.environ",
            {
                "ENVIRONMENT": "development",
                "RAZORPAY_KEY_ID": " rzp_test_fixture\n",
                "RAZORPAY_KEY_SECRET": "test-secret\n",
                "RAZORPAY_WEBHOOK_SECRET": " webhook-secret\n",
            },
            clear=True,
        ):
            namespace = runpy.run_path(str(settings.BASE_DIR / "neuronest" / "settings.py"))
        self.assertEqual(namespace["RAZORPAY_KEY_ID"], "rzp_test_fixture")
        self.assertEqual(namespace["RAZORPAY_KEY_SECRET"], "test-secret")
        self.assertEqual(namespace["RAZORPAY_WEBHOOK_SECRET"], " webhook-secret\n")
