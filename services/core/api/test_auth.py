"""Identity-token boundary checks; run: python manage.py test api.test_auth."""

import base64
import json
import time
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.conf import settings
from django.test import TestCase, override_settings
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.test import APIClient, APIRequestFactory

from .auth import BearerAuthentication, normalize_username
from .errors import IdentityLinkReviewRequired
from .models import Account, Audit, Child, Guardianship, Record


def token(algorithm="ES256"):
    header = (
        base64.urlsafe_b64encode(json.dumps({"alg": algorithm, "kid": "test-key"}).encode())
        .decode()
        .rstrip("=")
    )
    return f"{header}.e30.AA"


def claims(**overrides):
    value = {
        "iss": "https://project.supabase.co/auth/v1",
        "aud": "authenticated",
        "sub": "a5a1a8c8-5246-42aa-bd0b-c2c880d44c77",
        "email": "parent@example.test",
        "exp": 2_000_000_000,
        "iat": 1_900_000_000,
        "session_id": "744aaac4-9683-4b14-ad7d-ea34e1bedff3",
        "role": "authenticated",
        "is_anonymous": False,
        "aal": "aal1",
    }
    value.update(overrides)
    return value


def firebase_claims(**overrides):
    value = {
        "iss": "https://securetoken.google.com/neuronest-test",
        "aud": "neuronest-test",
        "sub": "firebase-parent-uid",
        "email": "parent@example.test",
        "email_verified": True,
        "name": "  Asha   Nair  ",
        "exp": 2_000_000_000,
        "iat": 1_900_000_000,
        "auth_time": 1_900_000_000,
        "firebase": {"sign_in_provider": "password"},
    }
    value.update(overrides)
    return value


@override_settings(
    DEMO_MODE=False,
    IDENTITY_PROVIDER="supabase",
    SUPABASE_URL="https://project.supabase.co",
    SUPABASE_ISSUER="https://project.supabase.co/auth/v1",
    SUPABASE_AUDIENCE="authenticated",
    SUPABASE_JWKS_URL="https://project.supabase.co/auth/v1/.well-known/jwks.json",
    SUPABASE_JWT_ALGORITHMS=("ES256",),
    SUPABASE_PUBLISHABLE_KEY="sb_publishable_test",
)
class SupabaseAuthenticationTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.auth = BearerAuthentication()

    def request(self, value=None):
        request = self.factory.get("/")
        if value:
            request.META["HTTP_AUTHORIZATION"] = f"Bearer {value}"
        return request

    def authenticate(self, payload=None, user=None, *, algorithm="ES256"):
        response = Mock(status_code=200)
        response.json.return_value = user or {
            "id": (payload or claims())["sub"],
            "email": (payload or claims())["email"],
            "email_confirmed_at": "2026-09-08T00:00:00Z",
        }
        signing_key = SimpleNamespace(key="public-key")
        with (
            patch("api.auth.jwks_client") as jwks,
            patch("api.auth.jwt.decode", return_value=payload or claims()),
            patch("api.auth.httpx.get", return_value=response),
        ):
            jwks.return_value.get_signing_key_from_jwt.return_value = signing_key
            return self.auth.authenticate(self.request(token(algorithm)))

    def test_verified_parent_is_provisioned_once_with_canonical_full_name_only(self):
        user, _ = self.authenticate(
            claims(user_metadata={"role": "admin", "full_name": "Not trusted"}),
            user={
                "id": claims()["sub"],
                "email": claims()["email"],
                "email_confirmed_at": "2026-09-08T00:00:00Z",
                "user_metadata": {
                    "full_name": "  Asha   Nair  ",
                    "role": "admin",
                    "username": "attacker-chosen",
                },
            },
        )
        self.assertEqual(user.role, "parent")
        self.assertFalse(user.username_claimed)
        self.assertNotIn(claims()["sub"], user.username)
        with self.assertRaises(ValueError):
            normalize_username(user.username)
        self.assertEqual(user.display_name, "Asha Nair")
        self.assertEqual(user.oidc_subject, claims()["sub"])
        self.assertIsNotNone(user.last_login)
        repeat, _ = self.authenticate()
        self.assertEqual(repeat.pk, user.pk)
        self.assertEqual(Account.objects.count(), 1)

    def test_rejects_non_user_tokens_and_invalid_algorithm(self):
        for payload in [
            claims(role="service_role"),
            claims(is_anonymous=True),
            claims(email=""),
        ]:
            with self.assertRaises(AuthenticationFailed):
                self.authenticate(payload)
        with self.assertRaises(AuthenticationFailed):
            self.authenticate(algorithm="HS256")

    def test_requires_canonical_confirmed_identity_before_provisioning(self):
        response = {"id": claims()["sub"], "email": claims()["email"], "email_confirmed_at": None}
        with self.assertRaises(AuthenticationFailed):
            self.authenticate(user=response)
        self.assertEqual(Account.objects.count(), 0)

    def test_existing_email_requires_support_review(self):
        Account.objects.create_user(
            username="existing", email=claims()["email"], display_name="Existing", role="parent"
        )
        with self.assertRaises(AuthenticationFailed):
            self.authenticate()

    def test_disabled_account_and_changed_email_are_denied(self):
        account = Account.objects.create_user(
            username=claims()["sub"],
            oidc_subject=claims()["sub"],
            email=claims()["email"],
            display_name="Parent",
            role="parent",
            is_active=False,
        )
        with self.assertRaises(AuthenticationFailed):
            self.authenticate()
        account.is_active = True
        account.save(update_fields=["is_active"])
        with self.assertRaises(AuthenticationFailed):
            self.authenticate(claims(email="changed@example.test"))

    @override_settings(PRODUCTION=True)
    def test_staff_needs_aal2_but_role_stays_local(self):
        account = Account.objects.create_user(
            username=claims()["sub"],
            oidc_subject=claims()["sub"],
            email=claims()["email"],
            display_name="Clinician",
            role="doctor",
        )
        with self.assertRaises(AuthenticationFailed):
            self.authenticate(claims(aal="aal1"))
        user, _ = self.authenticate(claims(aal="aal2"))
        self.assertEqual(user.pk, account.pk)
        self.assertEqual(user.role, "doctor")


@override_settings(
    DEMO_MODE=False,
    IDENTITY_PROVIDER="firebase",
    FIREBASE_PROJECT_ID="neuronest-test",
    FIREBASE_ISSUER="https://securetoken.google.com/neuronest-test",
    FIREBASE_JWKS_URL="https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
    FIREBASE_JWT_ALGORITHMS=("RS256",),
)
class FirebaseAuthenticationTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.auth = BearerAuthentication()

    def request(self, value=None):
        request = self.factory.get("/")
        if value:
            request.META["HTTP_AUTHORIZATION"] = f"Bearer {value}"
        return request

    def authenticate(self, payload=None, *, algorithm="RS256"):
        signing_key = SimpleNamespace(key="public-key")
        decoded = payload or firebase_claims()
        if settings.PRODUCTION:
            with patch("api.auth.verified_firebase_admin_token", return_value=decoded):
                return self.auth.authenticate(self.request(token(algorithm)))
        with (
            patch("api.auth.jwks_client") as jwks,
            patch("api.auth.jwt.decode", return_value=decoded),
        ):
            jwks.return_value.get_signing_key_from_jwt.return_value = signing_key
            return self.auth.authenticate(self.request(token(algorithm)))

    def test_verified_firebase_parent_is_provisioned_with_display_name_only(self):
        user, payload = self.authenticate()
        self.assertEqual(user.role, "parent")
        self.assertFalse(user.username_claimed)
        self.assertNotIn(firebase_claims()["sub"], user.username)
        with self.assertRaises(ValueError):
            normalize_username(user.username)
        self.assertEqual(user.display_name, "Asha Nair")
        self.assertEqual(user.firebase_subject, firebase_claims()["sub"])
        self.assertIsNone(user.oidc_subject)
        self.assertEqual(payload["email"], firebase_claims()["email"])
        repeat, _ = self.authenticate()
        self.assertEqual(repeat.pk, user.pk)
        self.assertEqual(Account.objects.count(), 1)

    @override_settings(PRODUCTION=False)
    def test_real_signed_tokens_preserve_claim_and_signature_checks(self):
        import jwt
        from cryptography.hazmat.primitives.asymmetric import rsa

        private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        other_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        now = int(time.time())
        payload = firebase_claims(exp=now + 300, iat=now - 10, auth_time=now - 10)
        with patch("api.auth.jwks_client") as jwks:
            jwks.return_value.get_signing_key_from_jwt.return_value = SimpleNamespace(
                key=private_key.public_key()
            )
            signed = jwt.encode(payload, private_key, algorithm="RS256", headers={"kid": "test"})
            user, verified = self.auth.authenticate(self.request(signed))
            self.assertEqual(user.firebase_subject, payload["sub"])
            self.assertEqual(verified["aud"], payload["aud"])
            for changes, key in [
                ({"exp": now - 60}, private_key),
                ({"aud": "another-project"}, private_key),
                ({"iss": "https://another-issuer.test"}, private_key),
                ({}, other_key),
            ]:
                with self.subTest(changes=changes, wrong_key=key is other_key):
                    signed = jwt.encode(
                        {**payload, **changes}, key, algorithm="RS256", headers={"kid": "test"}
                    )
                    with self.assertRaises(AuthenticationFailed):
                        self.auth.authenticate(self.request(signed))
            for malformed in ["not-a-token", "a.b.c", "." * 10000]:
                with self.subTest(malformed=malformed[:20]):
                    with self.assertRaises(AuthenticationFailed):
                        self.auth.authenticate(self.request(malformed))

    def test_rejects_unverified_or_malformed_firebase_tokens(self):
        for payload in [
            firebase_claims(email_verified=False),
            firebase_claims(email=""),
            firebase_claims(auth_time=True),
            firebase_claims(sub=""),
        ]:
            with self.assertRaises(AuthenticationFailed):
                self.authenticate(payload)
        with self.assertRaises(AuthenticationFailed):
            self.authenticate(algorithm="ES256")

    def test_existing_email_cannot_be_linked_implicitly(self):
        Account.objects.create_user(
            username="existing",
            email=firebase_claims()["email"],
            display_name="Existing",
            role="parent",
        )
        with self.assertRaises(IdentityLinkReviewRequired):
            self.authenticate()

    @override_settings(PRODUCTION=True)
    def test_staff_requires_firebase_second_factor(self):
        account = Account.objects.create_user(
            username=firebase_claims()["sub"],
            firebase_subject=firebase_claims()["sub"],
            email=firebase_claims()["email"],
            display_name="Clinician",
            role="doctor",
        )
        with self.assertRaises(AuthenticationFailed):
            self.authenticate()
        user, _ = self.authenticate(
            firebase_claims(
                firebase={"sign_in_provider": "password", "sign_in_second_factor": "phone"}
            )
        )
        self.assertEqual(user.pk, account.pk)
        self.assertEqual(user.role, "doctor")

    @override_settings(PRODUCTION=True)
    def test_production_refuses_firebase_sessions_without_admin_credentials(self):
        with self.assertRaises(AuthenticationFailed):
            self.auth.authenticate(self.request(token("RS256")))


@override_settings(
    DEMO_MODE=False,
    IDENTITY_PROVIDER="supabase",
    SUPABASE_URL="https://project.supabase.co",
    SUPABASE_PUBLISHABLE_KEY="sb_publishable_test",
    REST_FRAMEWORK={
        "DEFAULT_PERMISSION_CLASSES": ["api.auth.ClaimedUsernameRequired"],
        "DEFAULT_THROTTLE_RATES": {
            "anon": "60/minute",
            "user": "600/minute",
        },
    },
)
class UsernameAuthenticationEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    @patch("api.auth.httpx.post")
    def test_username_sign_in_returns_tokens_without_email_or_enumeration(self, post):
        account = Account.objects.create_user(
            username="asha.nair", email="parent@example.test", display_name="Asha", role="parent"
        )
        post.return_value = Mock(
            status_code=200,
            json=Mock(
                return_value={
                    "access_token": "access",
                    "refresh_token": "refresh",
                    "user": {"email": account.email},
                }
            ),
        )
        signed_in = self.client.post(
            "/v1/auth/username/sign-in/",
            {"username": "ASHA.NAIR", "password": "not-a-real-password"},
            format="json",
        )
        self.assertEqual(signed_in.status_code, 200)
        self.assertEqual(signed_in.json(), {"access_token": "access", "refresh_token": "refresh"})
        self.assertNotIn(account.email, signed_in.content.decode())
        self.assertEqual(post.call_args.kwargs["json"]["email"], account.email)

        missing = self.client.post(
            "/v1/auth/username/sign-in/",
            {"username": "missing.user", "password": "not-a-real-password"},
            format="json",
        )
        self.assertEqual(post.call_args.kwargs["json"]["email"], "unrecognized@invalid.neuronest")
        post.return_value = Mock(status_code=400, json=Mock(return_value={"error": "invalid"}))
        wrong_password = self.client.post(
            "/v1/auth/username/sign-in/",
            {"username": "asha.nair", "password": "wrong-password"},
            format="json",
        )
        self.assertEqual(missing.status_code, wrong_password.status_code)
        self.assertEqual(missing.json()["detail"], wrong_password.json()["detail"])
        self.assertEqual(missing.json()["detail"], "We couldn’t sign you in with those details.")

    def test_unclaimed_account_is_limited_to_identity_setup(self):
        account = Account.objects.create_user(
            # This is valid under the username pattern, simulating a Firebase UID.
            username="firebase-parent-uid",
            username_claimed=False,
            email="parent@example.test",
            display_name="Asha",
            role="parent",
        )
        self.client.force_authenticate(account)
        self.assertEqual(self.client.get("/v1/me/").status_code, 200)
        self.assertEqual(self.client.get("/v1/children/").status_code, 403)

    @patch("api.auth.httpx.post")
    def test_unclaimed_valid_provider_identifier_cannot_use_username_sign_in(self, post):
        Account.objects.create_user(
            username="firebase-parent-uid",
            username_claimed=False,
            email="parent@example.test",
            display_name="Asha",
            role="parent",
        )
        post.return_value = Mock(status_code=400, json=Mock(return_value={"error": "invalid"}))

        response = self.client.post(
            "/v1/auth/username/sign-in/",
            {"username": "firebase-parent-uid", "password": "not-a-real-password"},
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["detail"], "We couldn’t sign you in with those details.")
        self.assertEqual(post.call_args.kwargs["json"]["email"], "unrecognized@invalid.neuronest")

    def test_manually_provisioned_accounts_default_to_claimed(self):
        account = Account.objects.create_user(
            username="asha.nair",
            email="parent@example.test",
            display_name="Asha",
            role="parent",
        )

        self.assertTrue(account.username_claimed)

    def test_account_name_can_be_corrected_without_changing_username(self):
        account = Account.objects.create_user(
            username="asha.nair",
            email="parent@example.test",
            display_name="parent@example.test",
            role="parent",
        )
        self.client.force_authenticate(account)

        response = self.client.patch(
            "/v1/preferences/",
            {"display_name": "  Asha   Nair  "},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["display_name"], "Asha Nair")
        account.refresh_from_db()
        self.assertEqual(account.username, "asha.nair")
        self.assertEqual(account.display_name, "Asha Nair")

    def test_legacy_email_account_can_claim_one_username(self):
        account = Account.objects.create_user(
            username="pending:legacy-account",
            username_claimed=False,
            email="parent@example.test",
            display_name="Asha",
            role="parent",
        )
        self.client.force_authenticate(account)
        response = self.client.post(
            "/v1/auth/username/claim/",
            {"username": "asha.nair", "full_name": " Asha   Nair "},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["username"], "asha.nair")
        self.assertEqual(response.json()["display_name"], "Asha Nair")
        account.refresh_from_db()
        self.assertTrue(account.username_claimed)
        repeat = self.client.post(
            "/v1/auth/username/claim/",
            {"username": "another.name", "full_name": "Asha Nair"},
            format="json",
        )
        self.assertEqual(repeat.status_code, 409)

    def test_username_claim_is_case_insensitively_unique(self):
        Account.objects.create_user(
            username="Asha.Nair",
            email="existing@example.test",
            display_name="Existing",
            role="parent",
        )
        account = Account.objects.create_user(
            username="pending:legacy-account",
            username_claimed=False,
            email="parent@example.test",
            display_name="Asha",
            role="parent",
        )
        self.client.force_authenticate(account)
        response = self.client.post(
            "/v1/auth/username/claim/",
            {"username": "asha.nair", "full_name": "Asha Nair"},
            format="json",
        )
        self.assertEqual(response.status_code, 409)


@override_settings(
    DEMO_MODE=False,
    IDENTITY_PROVIDER="firebase",
    FIREBASE_PROJECT_ID="neuronest-test",
    FIREBASE_ISSUER="https://securetoken.google.com/neuronest-test",
    FIREBASE_WEB_API_KEY="firebase-public-test-key",
    FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"neuronest-test"}',
    REST_FRAMEWORK={
        "DEFAULT_PERMISSION_CLASSES": ["api.auth.ClaimedUsernameRequired"],
        "DEFAULT_THROTTLE_RATES": {
            "anon": "60/minute",
            "user": "600/minute",
        },
    },
)
class FirebaseUsernameAuthenticationEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_readiness_reports_firebase_and_username_bridge(self):
        with patch("api.views.firebase_admin_app", return_value=object()):
            identity = self.client.get("/v1/readiness/").json()["capabilities"]["identity"]
        self.assertEqual(
            identity, {"ready": True, "mode": "firebase", "username_sign_in_ready": True}
        )

    @override_settings(PRODUCTION=True, TRUST_PROXY_HEADERS=False)
    def test_production_readiness_requires_an_explicit_trusted_proxy(self):
        with patch("api.views.firebase_admin_app", return_value=object()):
            identity = self.client.get("/v1/readiness/").json()["capabilities"]["identity"]
        self.assertEqual(identity["ready"], True)
        self.assertFalse(identity["username_sign_in_ready"])

    @override_settings(PRODUCTION=True, TRUST_PROXY_HEADERS=False)
    def test_production_username_bridge_fails_closed_without_trusted_proxy_headers(self):
        Account.objects.create_user(
            username="asha.nair",
            firebase_subject=firebase_claims()["sub"],
            email=firebase_claims()["email"],
            display_name="Asha",
            role="parent",
        )
        with patch("api.views.username_session") as session:
            response = self.client.post(
                "/v1/auth/username/sign-in/",
                {"username": "asha.nair", "password": "not-a-real-password"},
                format="json",
            )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["detail"], "We couldn’t sign you in with those details.")
        session.assert_not_called()

    @override_settings(PRODUCTION=True, TRUST_PROXY_HEADERS=True)
    @patch("api.tasks.scheduler_healthy", return_value=True)
    def test_production_username_bridge_fails_closed_without_a_valid_forwarded_address(
        self, scheduler
    ):
        with patch("api.views.username_session") as session:
            for forwarded in [None, "not-an-address"]:
                headers = {} if forwarded is None else {"HTTP_X_FORWARDED_FOR": forwarded}
                response = self.client.post(
                    "/v1/auth/username/sign-in/",
                    {"username": "asha.nair", "password": "not-a-real-password"},
                    format="json",
                    **headers,
                )
                self.assertEqual(response.status_code, 403)
                self.assertEqual(
                    response.json()["detail"], "We couldn’t sign you in with those details."
                )
        self.assertEqual(scheduler.call_count, 2)
        session.assert_not_called()

    @override_settings(PRODUCTION=True, TRUST_PROXY_HEADERS=True)
    @patch("api.tasks.scheduler_healthy", return_value=False)
    def test_production_username_bridge_requires_the_retention_scheduler(self, scheduler):
        with patch("api.views.username_session") as session:
            response = self.client.post(
                "/v1/auth/username/sign-in/",
                {"username": "asha.nair", "password": "not-a-real-password"},
                format="json",
                HTTP_X_FORWARDED_FOR="203.0.113.42",
            )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["detail"], "We couldn’t sign you in with those details.")
        scheduler.assert_called_once_with("reminders")
        session.assert_not_called()

    def test_parent_username_sign_in_returns_custom_token_without_email(self):
        account = Account.objects.create_user(
            username="asha.nair",
            firebase_subject=firebase_claims()["sub"],
            email=firebase_claims()["email"],
            display_name="Asha",
            role="parent",
        )
        provider_response = Mock(status_code=200)
        provider_response.json.return_value = {"idToken": "firebase-id-token"}
        with (
            patch("api.auth.httpx.post", return_value=provider_response) as post,
            patch("api.auth.verified_firebase_token", return_value=firebase_claims()),
            patch("api.auth.firebase_custom_token", return_value="firebase-custom-token"),
        ):
            response = self.client.post(
                "/v1/auth/username/sign-in/",
                {"username": "ASHA.NAIR", "password": "not-a-real-password"},
                format="json",
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"custom_token": "firebase-custom-token"})
        self.assertNotIn(account.email, response.content.decode())
        self.assertEqual(
            post.call_args.args[0],
            "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword",
        )
        self.assertEqual(post.call_args.kwargs["params"], {"key": "firebase-public-test-key"})
        self.assertEqual(post.call_args.kwargs["json"]["email"], account.email)

    def test_parent_username_sign_in_fails_closed_without_a_custom_token(self):
        Account.objects.create_user(
            username="asha.nair",
            firebase_subject=firebase_claims()["sub"],
            email=firebase_claims()["email"],
            display_name="Asha",
            role="parent",
        )
        provider_response = Mock(status_code=200)
        provider_response.json.return_value = {"idToken": "firebase-id-token"}
        with (
            patch("api.auth.httpx.post", return_value=provider_response),
            patch("api.auth.verified_firebase_token", return_value=firebase_claims()),
            patch("api.auth.firebase_custom_token", return_value=None),
        ):
            response = self.client.post(
                "/v1/auth/username/sign-in/",
                {"username": "asha.nair", "password": "not-a-real-password"},
                format="json",
            )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["detail"], "We couldn’t sign you in with those details.")

    def test_staff_and_unknown_username_cannot_use_custom_token_bridge(self):
        Account.objects.create_user(
            username="dr.asha",
            firebase_subject="firebase-doctor-uid",
            email="doctor@example.test",
            display_name="Dr Asha",
            role="doctor",
        )
        provider_response = Mock(status_code=400)
        provider_response.json.return_value = {"error": {"message": "INVALID_LOGIN_CREDENTIALS"}}
        with (
            patch("api.auth.httpx.post", return_value=provider_response) as post,
            patch("api.auth.firebase_custom_token") as custom_token,
        ):
            staff = self.client.post(
                "/v1/auth/username/sign-in/",
                {"username": "dr.asha", "password": "not-a-real-password"},
                format="json",
            )
            missing = self.client.post(
                "/v1/auth/username/sign-in/",
                {"username": "missing.user", "password": "not-a-real-password"},
                format="json",
            )
        self.assertEqual(staff.status_code, missing.status_code)
        self.assertEqual(staff.json()["detail"], "We couldn’t sign you in with those details.")
        self.assertEqual(post.call_args.kwargs["json"]["email"], "unrecognized@invalid.neuronest")
        custom_token.assert_not_called()

    def test_username_sign_in_accepts_a_4096_character_firebase_password(self):
        account = Account.objects.create_user(
            username="asha.nair",
            firebase_subject=firebase_claims()["sub"],
            email=firebase_claims()["email"],
            display_name="Asha",
            role="parent",
        )
        password = "p" * 4096
        with patch("api.views.username_session", return_value={"custom_token": "token"}) as session:
            response = self.client.post(
                "/v1/auth/username/sign-in/",
                {"username": "asha.nair", "password": password},
                format="json",
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"custom_token": "token"})
        session.assert_called_once_with(account.email, password, account.firebase_subject)

    def test_username_sign_in_rejects_passwords_over_firebase_limit(self):
        with patch("api.views.username_session") as session:
            response = self.client.post(
                "/v1/auth/username/sign-in/",
                {"username": "asha.nair", "password": "p" * 4097},
                format="json",
            )
        self.assertEqual(response.status_code, 400)
        session.assert_not_called()


@override_settings(
    DEMO_MODE=False,
    IDENTITY_PROVIDER="firebase",
    FIREBASE_PROJECT_ID="neuronest-test",
    FIREBASE_ISSUER="https://securetoken.google.com/neuronest-test",
    FIREBASE_WEB_API_KEY="firebase-public-test-key",
    REST_FRAMEWORK={
        "DEFAULT_AUTHENTICATION_CLASSES": ["api.auth.BearerAuthentication"],
        "DEFAULT_PERMISSION_CLASSES": ["api.auth.ClaimedUsernameRequired"],
        "EXCEPTION_HANDLER": "api.errors.exception_handler",
        "DEFAULT_THROTTLE_RATES": {
            "anon": "60/minute",
            "user": "600/minute",
        },
    },
)
class FirebaseIdentityLinkEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION="Bearer firebase-id-token")

    def request(self, method, path, data=None, payload=None):
        with patch("api.auth.verified_firebase_token", return_value=payload or firebase_claims()):
            client_method = getattr(self.client, method)
            if method == "get":
                return client_method(path)
            return client_method(path, data, format="json")

    def legacy_account(self, **overrides):
        values = {
            "username": "asha.nair",
            "oidc_subject": "legacy-supabase-subject",
            "email": firebase_claims()["email"],
            "display_name": "Asha",
            "role": "parent",
        }
        values.update(overrides)
        return Account.objects.create_user(**values)

    def test_normal_firebase_request_requires_support_review_for_matching_legacy_email(self):
        legacy = self.legacy_account()

        response = self.request("get", "/v1/me/")

        self.assertEqual(response.status_code, 409)
        self.assertEqual(
            response.json(),
            {
                "code": "firebase_identity_link_review_required",
                "detail": (
                    "This account cannot be linked automatically. Contact support to complete an "
                    "identity review."
                ),
            },
        )
        legacy.refresh_from_db()
        self.assertEqual(legacy.oidc_subject, "legacy-supabase-subject")
        self.assertIsNone(legacy.firebase_subject)

    def test_confirmed_link_cannot_attach_a_legacy_account(self):
        legacy = self.legacy_account()

        response = self.request("post", "/v1/auth/identity/link/", {"confirm": True})

        self.assertEqual(response.status_code, 409)
        self.assertEqual(
            response.json(),
            {
                "code": "firebase_identity_link_review_required",
                "detail": (
                    "This account cannot be linked automatically. Contact support to complete an "
                    "identity review."
                ),
            },
        )
        legacy.refresh_from_db()
        self.assertEqual(legacy.oidc_subject, "legacy-supabase-subject")
        self.assertIsNone(legacy.firebase_subject)
        self.assertFalse(Audit.objects.filter(action="identity.firebase_linked").exists())
        self.assertEqual(self.request("get", "/v1/me/").status_code, 409)

    def test_email_only_identity_cannot_open_a_legacy_patient_record(self):
        legacy = self.legacy_account()
        child = Child.objects.create(name="Dev", date_of_birth="2018-01-01")
        Guardianship.objects.create(
            child=child,
            user=legacy,
            email=legacy.email,
            status="active",
            scopes=["records"],
        )
        record = Record.objects.create(
            child=child,
            author=legacy,
            kind="assessment",
            title="Care assessment",
            body="Private record",
        )

        linked = self.request("post", "/v1/auth/identity/link/", {"confirm": True})
        records = self.request("get", "/v1/records/")

        self.assertEqual(linked.status_code, 409)
        self.assertEqual(records.status_code, 409)
        legacy.refresh_from_db()
        self.assertIsNone(legacy.firebase_subject)
        self.assertTrue(Record.objects.filter(pk=record.pk).exists())

    def test_mixed_case_legacy_email_still_requires_support_review(self):
        legacy = self.legacy_account(email="Parent@Example.test")
        response = self.request("post", "/v1/auth/identity/link/", {"confirm": True})
        legacy.refresh_from_db()
        self.assertEqual(response.status_code, 409)
        self.assertIsNone(legacy.firebase_subject)

    def test_link_requires_explicit_confirmation_and_never_writes_a_mapping(self):
        legacy = self.legacy_account()

        rejected = self.request("post", "/v1/auth/identity/link/", {"confirm": False})
        reviewed = self.request("post", "/v1/auth/identity/link/", {"confirm": True})
        repeated = self.request("post", "/v1/auth/identity/link/", {"confirm": True})

        self.assertEqual(rejected.status_code, 400)
        self.assertEqual(reviewed.status_code, 409)
        self.assertEqual(repeated.status_code, 409)
        legacy.refresh_from_db()
        self.assertIsNone(legacy.firebase_subject)
        self.assertEqual(Audit.objects.filter(action="identity.firebase_linked").count(), 0)

    def test_reviewed_mapping_makes_the_endpoint_idempotent(self):
        legacy = self.legacy_account(firebase_subject=firebase_claims()["sub"])

        response = self.request("post", "/v1/auth/identity/link/", {"confirm": True})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"linked": True})
        legacy.refresh_from_db()
        self.assertEqual(legacy.firebase_subject, firebase_claims()["sub"])

    @override_settings(PRODUCTION=True)
    def test_staff_link_requires_firebase_second_factor(self):
        legacy = self.legacy_account(role="doctor")

        blocked = self.request("post", "/v1/auth/identity/link/", {"confirm": True})
        allowed = self.request(
            "post",
            "/v1/auth/identity/link/",
            {"confirm": True},
            firebase_claims(
                firebase={"sign_in_provider": "password", "sign_in_second_factor": "phone"}
            ),
        )

        self.assertEqual(blocked.status_code, 401)
        self.assertEqual(allowed.status_code, 409)
        legacy.refresh_from_db()
        self.assertIsNone(legacy.firebase_subject)
