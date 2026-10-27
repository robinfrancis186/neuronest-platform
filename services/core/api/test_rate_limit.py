"""Durable username-sign-in limiter checks; run: python manage.py test api.test_rate_limit."""

from datetime import timedelta
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from unittest import skipUnless
from unittest.mock import patch

from django.db import close_old_connections, connection, connections
from django.test import TestCase, TransactionTestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient, APIRequestFactory

from .models import UsernameSignInRateBucket
from .rate_limit import (
    RATE_LIMIT_CLEANUP_BATCH_SIZE,
    RETENTION,
    TrustedClientIpUnavailable,
    _client_ip,
    consume_username_sign_in_attempt,
    purge_expired_username_sign_in_buckets,
)


@override_settings(
    USERNAME_RATE_LIMIT_HMAC_KEY="test-only-rate-limit-key",
    TRUST_PROXY_HEADERS=True,
)
class DurableUsernameSignInRateLimitTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def request(self, ip):
        return self.factory.post(
            "/v1/auth/username/sign-in/",
            HTTP_X_FORWARDED_FOR=ip,
            REMOTE_ADDR="10.0.0.1",
        )

    def test_rolling_limit_uses_hashed_ip_and_normalized_username_buckets(self):
        now = timezone.now().replace(microsecond=0)
        request = self.request("203.0.113.10")
        for _ in range(8):
            self.assertTrue(consume_username_sign_in_attempt(request, "asha.nair", now=now))

        # A new address cannot bypass the full username bucket.
        self.assertFalse(
            consume_username_sign_in_attempt(self.request("203.0.113.11"), "asha.nair", now=now)
        )
        # The boundary is rolling rather than a calendar-minute reset.
        self.assertFalse(
            consume_username_sign_in_attempt(request, "asha.nair", now=now + timedelta(seconds=59))
        )
        self.assertTrue(
            consume_username_sign_in_attempt(
                request, "asha.nair", now=now + timedelta(seconds=60, milliseconds=1)
            )
        )

        rows = list(UsernameSignInRateBucket.objects.order_by("scope"))
        self.assertEqual({row.scope for row in rows}, {"ip", "username"})
        self.assertEqual(len(rows), 2)
        for row in rows:
            self.assertEqual(len(row.key_hash), 64)
            self.assertNotIn("asha.nair", row.key_hash)
            self.assertNotIn("203.0.113.10", row.key_hash)
            self.assertLessEqual(len(row.attempt_times), 8)

    def test_ip_bucket_blocks_password_spraying_across_usernames(self):
        request = self.request("203.0.113.20")
        for index in range(8):
            self.assertTrue(consume_username_sign_in_attempt(request, f"parent.{index}"))

        self.assertFalse(consume_username_sign_in_attempt(request, "another.parent"))
        self.assertEqual(
            UsernameSignInRateBucket.objects.filter(scope="ip").count(),
            1,
        )
        # The blocked request leaves no empty durable username-key row behind.
        self.assertEqual(
            UsernameSignInRateBucket.objects.filter(scope="username").count(),
            8,
        )

    def test_invalid_username_consumes_only_the_ip_bucket(self):
        request = self.request("203.0.113.30")
        for _ in range(8):
            self.assertTrue(consume_username_sign_in_attempt(request, None))

        self.assertFalse(consume_username_sign_in_attempt(request, None))
        self.assertEqual(
            list(UsernameSignInRateBucket.objects.values_list("scope", flat=True)), ["ip"]
        )

    @override_settings(TRUST_PROXY_HEADERS=False)
    def test_forwarded_ip_is_ignored_without_explicit_trusted_proxy_configuration(self):
        for index in range(8):
            request = self.factory.post(
                "/v1/auth/username/sign-in/",
                HTTP_X_FORWARDED_FOR=f"203.0.113.{index + 1}",
                REMOTE_ADDR="10.0.0.7",
            )
            self.assertTrue(consume_username_sign_in_attempt(request, f"parent.{index}"))

        blocked = self.factory.post(
            "/v1/auth/username/sign-in/",
            HTTP_X_FORWARDED_FOR="198.51.100.200",
            REMOTE_ADDR="10.0.0.7",
        )
        self.assertFalse(consume_username_sign_in_attempt(blocked, "another.parent"))

    def test_trusted_proxy_prefers_vercel_client_address_over_generic_forwarding(self):
        request = self.factory.post(
            "/v1/auth/username/sign-in/",
            HTTP_X_VERCEL_FORWARDED_FOR="203.0.113.60",
            HTTP_X_FORWARDED_FOR="198.51.100.60",
            REMOTE_ADDR="10.0.0.7",
        )
        self.assertEqual(_client_ip(request), "203.0.113.60")
        generic_only = self.factory.post(
            "/v1/auth/username/sign-in/",
            HTTP_X_FORWARDED_FOR="198.51.100.61",
            REMOTE_ADDR="10.0.0.7",
        )
        self.assertEqual(_client_ip(generic_only), "198.51.100.61")

    @override_settings(PRODUCTION=True)
    def test_trusted_proxy_requires_a_valid_forwarded_client_address_in_production(self):
        for forwarded in ["", "not-an-address", ", 203.0.113.80"]:
            request = self.factory.post(
                "/v1/auth/username/sign-in/",
                HTTP_X_FORWARDED_FOR=forwarded,
                REMOTE_ADDR="10.0.0.7",
            )
            with self.assertRaises(TrustedClientIpUnavailable):
                consume_username_sign_in_attempt(request, "asha.nair")

        malformed_vercel = self.factory.post(
            "/v1/auth/username/sign-in/",
            HTTP_X_VERCEL_FORWARDED_FOR="not-an-address",
            HTTP_X_FORWARDED_FOR="203.0.113.81",
            REMOTE_ADDR="10.0.0.7",
        )
        with self.assertRaises(TrustedClientIpUnavailable):
            consume_username_sign_in_attempt(malformed_vercel, "asha.nair")

    def test_bounded_cleanup_removes_only_expired_hmac_buckets(self):
        now = timezone.now()
        stale = [
            UsernameSignInRateBucket.objects.create(
                scope="username", key_hash=f"{index:064x}", attempt_times=[1]
            )
            for index in range(5)
        ]
        fresh = UsernameSignInRateBucket.objects.create(
            scope="ip", key_hash="f" * 64, attempt_times=[1]
        )
        UsernameSignInRateBucket.objects.filter(pk__in=[bucket.pk for bucket in stale]).update(
            updated_at=now - RETENTION - timedelta(seconds=1)
        )

        self.assertEqual(purge_expired_username_sign_in_buckets(limit=2, now=now), 2)
        self.assertEqual(
            UsernameSignInRateBucket.objects.filter(updated_at__lt=now - RETENTION).count(), 3
        )
        self.assertTrue(UsernameSignInRateBucket.objects.filter(pk=fresh.pk).exists())
        self.assertEqual(purge_expired_username_sign_in_buckets(limit=3, now=now), 3)
        self.assertEqual(UsernameSignInRateBucket.objects.count(), 1)
        self.assertEqual(purge_expired_username_sign_in_buckets(limit=0, now=now), 0)

    @patch("api.rate_limit.purge_expired_username_sign_in_buckets", return_value=4)
    def test_existing_reminder_scheduler_runs_bounded_rate_limit_cleanup(self, cleanup):
        from .tasks import create_reminders

        result = create_reminders()

        cleanup.assert_called_once_with()
        self.assertEqual(result["rate_limit_buckets_removed"], 4)
        self.assertEqual(RATE_LIMIT_CLEANUP_BATCH_SIZE, 500)

    @override_settings(
        PRODUCTION=True,
        OUTBOX_WORKER_ENABLED=True,
        OUTBOX_SCHEDULER="supabase_cron",
        OUTBOX_DISPATCH_TOKEN="scheduler-test",
    )
    def test_reminder_scheduler_health_matches_its_five_minute_cadence(self):
        from .models import SchedulerHeartbeat
        from .tasks import scheduler_healthy

        SchedulerHeartbeat.objects.create(
            name="reminders", last_success_at=timezone.now() - timedelta(minutes=5)
        )
        self.assertTrue(scheduler_healthy("reminders"))
        SchedulerHeartbeat.objects.filter(name="reminders").update(
            last_success_at=timezone.now() - timedelta(minutes=13)
        )
        self.assertFalse(scheduler_healthy("reminders"))


@override_settings(
    DEMO_MODE=False,
    IDENTITY_PROVIDER="firebase",
    FIREBASE_PROJECT_ID="neuronest-test",
    FIREBASE_ISSUER="https://securetoken.google.com/neuronest-test",
    USERNAME_RATE_LIMIT_HMAC_KEY="test-only-rate-limit-key",
    TRUST_PROXY_HEADERS=True,
    REST_FRAMEWORK={
        "DEFAULT_AUTHENTICATION_CLASSES": ["api.auth.BearerAuthentication"],
        "DEFAULT_PERMISSION_CLASSES": ["api.auth.ClaimedUsernameRequired"],
        "EXCEPTION_HANDLER": "api.errors.exception_handler",
        "DEFAULT_THROTTLE_RATES": {"anon": "60/minute", "user": "600/minute"},
    },
)
class UsernameSignInDurableEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_case_normalized_attempts_are_generic_and_skip_provider_after_limit(self):
        with patch("api.views.username_session", return_value=None) as provider:
            responses = [
                self.client.post(
                    "/v1/auth/username/sign-in/",
                    {"username": "ASHA.NAIR", "password": "not-a-real-password"},
                    format="json",
                    HTTP_X_FORWARDED_FOR="203.0.113.40",
                )
                for _ in range(9)
            ]

        self.assertEqual([response.status_code for response in responses], [403] * 9)
        self.assertTrue(
            all(
                response.json()["detail"] == "We couldn’t sign you in with those details."
                for response in responses
            )
        )
        self.assertEqual(provider.call_count, 8)
        username_bucket = UsernameSignInRateBucket.objects.get(scope="username")
        self.assertEqual(len(username_bucket.attempt_times), 8)


@skipUnless(connection.vendor == "postgresql", "requires PostgreSQL row locking")
@override_settings(
    USERNAME_RATE_LIMIT_HMAC_KEY="test-only-rate-limit-key",
    TRUST_PROXY_HEADERS=True,
)
class PostgreSQLUsernameSignInRateLimitConcurrencyTests(TransactionTestCase):
    reset_sequences = True

    def test_concurrent_attempts_never_exceed_the_rolling_limit(self):
        barrier = Barrier(12)

        def consume():
            close_old_connections()
            try:
                request = APIRequestFactory().post(
                    "/v1/auth/username/sign-in/",
                    HTTP_X_FORWARDED_FOR="203.0.113.50",
                    REMOTE_ADDR="10.0.0.1",
                )
                barrier.wait(timeout=10)
                return consume_username_sign_in_attempt(request, "asha.nair")
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=12) as workers:
            results = list(workers.map(lambda _: consume(), range(12)))

        self.assertEqual(results.count(True), 8)
        self.assertEqual(results.count(False), 4)
        self.assertTrue(
            all(len(bucket.attempt_times) <= 8 for bucket in UsernameSignInRateBucket.objects.all())
        )
