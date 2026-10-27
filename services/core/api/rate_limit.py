"""Durable, privacy-preserving controls for username/password sign-in."""

from datetime import timedelta
import hashlib
import hmac
import ipaddress

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

from .models import UsernameSignInRateBucket


USERNAME_SIGN_IN_LIMIT = 8
WINDOW_MILLISECONDS = 60_000
RETENTION = timedelta(minutes=10)
RATE_LIMIT_CLEANUP_BATCH_SIZE = 500


class TrustedClientIpUnavailable(RuntimeError):
    """A production proxy did not provide the client address it was trusted to set."""


def _client_ip(request):
    """Return a canonical client address without retaining it in the database."""
    if settings.TRUST_PROXY_HEADERS:
        # On a verified Vercel core deployment, prefer its dedicated client
        # address header over generic X-Forwarded-For. The generic header is
        # retained only for an explicitly verified non-Vercel proxy deployment.
        for header in ("HTTP_X_VERCEL_FORWARDED_FOR", "HTTP_X_FORWARDED_FOR"):
            if header not in request.META:
                continue
            try:
                return str(ipaddress.ip_address(request.META[header].split(",", 1)[0].strip()))
            except (AttributeError, ValueError):
                # A production deployment that explicitly trusts proxy headers
                # must not silently collapse requests into a shared REMOTE_ADDR
                # bucket. A malformed preferred Vercel header is never allowed
                # to fall through to a potentially user-controlled XFF value.
                if settings.PRODUCTION:
                    raise TrustedClientIpUnavailable from None
        if settings.PRODUCTION:
            raise TrustedClientIpUnavailable
    try:
        return str(ipaddress.ip_address(request.META.get("REMOTE_ADDR", "")))
    except ValueError:
        pass
    # An unparseable address is grouped into one deliberately conservative bucket.
    return "unknown"


def _key_hash(scope, value):
    message = f"neuronest:username-sign-in:v1:{scope}:{value}".encode()
    return hmac.new(
        settings.USERNAME_RATE_LIMIT_HMAC_KEY.encode(), message, hashlib.sha256
    ).hexdigest()


def _locked_bucket(scope, key_hash):
    fields = {"scope": scope, "key_hash": key_hash}
    try:
        return UsernameSignInRateBucket.objects.select_for_update().get(**fields), False
    except UsernameSignInRateBucket.DoesNotExist:
        # A savepoint keeps the surrounding transaction usable if another instance
        # inserted this exact bucket after our initial locked lookup.
        try:
            with transaction.atomic():
                return UsernameSignInRateBucket.objects.create(**fields), True
        except IntegrityError:
            return UsernameSignInRateBucket.objects.select_for_update().get(**fields), False


def _recent_attempts(value, cutoff):
    values = value if isinstance(value, list) else []
    return [
        timestamp
        for timestamp in values
        if isinstance(timestamp, int) and not isinstance(timestamp, bool) and timestamp > cutoff
    ]


def purge_expired_username_sign_in_buckets(*, limit=RATE_LIMIT_CLEANUP_BATCH_SIZE, now=None):
    """Delete one bounded batch of inactive HMAC buckets.

    This runs from the existing five-minute reminder scheduler, never during a
    login request. ``skip_locked`` lets sign-in traffic win when a cleanup run
    overlaps an active bucket update.
    """
    if limit < 1:
        return 0
    now = now or timezone.now()
    cutoff = now - RETENTION
    with transaction.atomic():
        buckets = list(
            UsernameSignInRateBucket.objects.select_for_update(skip_locked=True)
            .filter(updated_at__lt=cutoff)
            .order_by("updated_at", "pk")[:limit]
        )
        if not buckets:
            return 0
        # Recheck expiry in case a sign-in refreshed a row between discovery and
        # deletion on a database without row-level locks.
        deleted, _ = UsernameSignInRateBucket.objects.filter(
            pk__in=[bucket.pk for bucket in buckets], updated_at__lt=cutoff
        ).delete()
    return deleted


def consume_username_sign_in_attempt(request, normalized_username, *, now=None):
    """Record a rolling attempt window and report whether it is available.

    `normalized_username` is either an already validated username or ``None``. Invalid
    usernames deliberately consume only the IP bucket, while valid usernames consume
    both buckets. The database stores HMACs and at most eight epoch timestamps per key,
    never the address or username itself.
    """
    now = now or timezone.now()
    now_milliseconds = int(now.timestamp() * 1000)
    cutoff = now_milliseconds - WINDOW_MILLISECONDS
    key_specs = [("ip", _key_hash("ip", _client_ip(request)))]
    if normalized_username:
        key_specs.append(("username", _key_hash("username", normalized_username)))
    key_specs.sort()

    with transaction.atomic():
        locked = [_locked_bucket(scope, key_hash) for scope, key_hash in key_specs]
        buckets = [bucket for bucket, _ in locked]
        attempts = [_recent_attempts(bucket.attempt_times, cutoff) for bucket in buckets]
        if any(len(value) >= USERNAME_SIGN_IN_LIMIT for value in attempts):
            # Avoid turning a distributed attack against an already full username
            # bucket into durable empty IP-key rows.
            for bucket, created in locked:
                if created and not bucket.attempt_times:
                    bucket.delete()
            return False
        for bucket, values in zip(buckets, attempts, strict=True):
            bucket.attempt_times = [*values, now_milliseconds]
            bucket.save(update_fields=["attempt_times", "updated_at"])
    return True
