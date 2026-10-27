"""Versioned commercial terms. Local fixtures never authorize production use."""

import copy
import json
import os
from pathlib import Path
from django.conf import settings
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from .errors import Unavailable


def _keys(value, expected):
    if not isinstance(value, dict) or set(value) != set(expected):
        raise ValueError("Policy contains missing or unsupported fields.")


def _integer(value, minimum, maximum):
    if type(value) is not int or not minimum <= value <= maximum:
        raise ValueError("Policy number is outside its supported range.")


def validate_policy(policy, production=False):
    _keys(
        policy,
        [
            "schema_version",
            "version",
            "environment",
            "approval",
            "currency",
            "booking",
            "fees",
            "cancellation",
            "retention",
        ],
    )
    if type(policy["schema_version"]) is not int or policy["schema_version"] != 1:
        raise ValueError("Unsupported policy schema version.")
    if not isinstance(policy["version"], str) or not 1 <= len(policy["version"]) <= 100:
        raise ValueError("A policy version is required.")
    if policy["environment"] not in ["synthetic", "production"] or policy["currency"] != "INR":
        raise ValueError("Unsupported environment or currency.")
    approval = policy["approval"]
    _keys(approval, ["status", "reference", "approved_by", "approved_at"])
    if approval["status"] not in ["synthetic", "approved"]:
        raise ValueError("Unsupported policy approval status.")
    for field in ["reference", "approved_by"]:
        if not isinstance(approval[field], str) or len(approval[field]) > 500:
            raise ValueError("Invalid approval reference.")
    if policy["environment"] == "production" or production:
        if policy["environment"] != "production" or approval["status"] != "approved":
            raise ValueError("Production requires an approved production policy.")
        approved_at = (
            parse_datetime(approval["approved_at"])
            if isinstance(approval["approved_at"], str)
            else None
        )
        if (
            not approval["reference"].strip()
            or not approval["approved_by"].strip()
            or not approved_at
            or timezone.is_naive(approved_at)
            or approved_at > timezone.now()
        ):
            raise ValueError(
                "Production policy requires dated approval and its evidence reference."
            )
    elif approval["status"] != "synthetic":
        raise ValueError("Synthetic policy cannot claim production approval.")
    _keys(policy["booking"], ["hold_minutes"])
    _integer(policy["booking"]["hold_minutes"], 1, 60)
    _keys(policy["fees"], ["platform_fee_bps"])
    _integer(policy["fees"]["platform_fee_bps"], 0, 10000)
    _keys(policy["cancellation"], ["notice_hours", "refund_percent", "late_refund_percent"])
    _integer(policy["cancellation"]["notice_hours"], 0, 720)
    for key in ["refund_percent", "late_refund_percent"]:
        _integer(policy["cancellation"][key], 0, 100)
    _keys(
        policy["retention"], ["clinical_days", "financial_days", "audit_days", "conversation_days"]
    )
    for value in policy["retention"].values():
        _integer(value, 1, 36500)
    return copy.deepcopy(policy)


_CACHE = {}


def _read_policy(path, production):
    """Validate the policy file, reusing the last result while the file is unchanged.

    Every booking, cancellation and payout calculation asks for the policy, so
    this used to be a disk read, a JSON parse and a full schema validation per
    call. Keying the cache on the file's identity and mtime means an operations
    swap of the approved artifact is still picked up without a restart.
    """
    stat = path.stat()
    key = (str(path), stat.st_mtime_ns, stat.st_size, production)
    policy = _CACHE.get(key)
    if policy is None:
        if stat.st_size > 16384:
            raise ValueError("Policy is too large.")
        policy = validate_policy(json.loads(path.read_text()), production=production)
        # Only the current file is worth holding; a replaced artifact must not linger.
        _CACHE.clear()
        _CACHE[key] = policy
    # Callers record and amend their own snapshot, so never hand out the cached object.
    return copy.deepcopy(policy)


def booking_policy_snapshot():
    path = getattr(settings, "BUSINESS_POLICY_PATH", "") or os.getenv("BUSINESS_POLICY_PATH", "")
    if not path and settings.PRODUCTION:
        raise Unavailable(
            "An approved BUSINESS_POLICY_PATH is required before booking in production."
        )
    path = Path(path) if path else settings.BASE_DIR / "config" / "policies" / "demo.json"
    try:
        return _read_policy(path, settings.PRODUCTION)
    except (OSError, ValueError, TypeError) as exc:
        raise Unavailable(
            "Business policy is unavailable or invalid; an approved version is required."
        ) from exc


def appointment_policy(appointment):
    snapshot = appointment.policy_snapshot
    if not snapshot:
        if settings.PRODUCTION:
            raise Unavailable(
                "Historical appointment has no approved policy snapshot; operations review required."
            )
        return booking_policy_snapshot()
    base = {key: value for key, value in snapshot.items() if key != "cancellation_decision"}
    try:
        from .demo_booking import is_demo_appointment
        return validate_policy(base, production=settings.PRODUCTION and not is_demo_appointment(appointment))
    except (ValueError, TypeError) as exc:
        raise Unavailable(
            "Appointment policy snapshot is invalid; operations review required."
        ) from exc


def provider_payout_minor(appointment):
    bps = appointment_policy(appointment)["fees"]["platform_fee_bps"]
    # Integer paise; platform commission rounds down and provider receives remainder.
    return appointment.amount_minor - appointment.amount_minor * bps // 10000


def cancellation_decision(appointment, provider_cancelled=False):
    policy = appointment_policy(appointment)
    cancelled_at = timezone.now()
    timely = (appointment.slot.starts_at - cancelled_at).total_seconds() >= policy["cancellation"][
        "notice_hours"
    ] * 3600
    percent = (
        100
        if provider_cancelled
        else policy["cancellation"]["refund_percent" if timely else "late_refund_percent"]
    )
    return {
        "cancelled_at": cancelled_at.isoformat(),
        "provider_cancelled": bool(provider_cancelled),
        "refund_limit_minor": appointment.amount_minor * percent // 100,
        "refund_percent": percent,
    }


def cancellation_refund_limit_minor(appointment):
    appointment_policy(appointment)
    decision = appointment.policy_snapshot.get("cancellation_decision", {})
    if not decision:
        if settings.PRODUCTION:
            raise Unavailable(
                "Cancellation has no recorded policy decision; operations review required."
            )
        return appointment.amount_minor
    limit = decision.get("refund_limit_minor")
    try:
        _integer(limit, 0, appointment.amount_minor)
    except ValueError as exc:
        raise Unavailable("Cancellation decision is invalid; operations review required.") from exc
    return limit


def policy_readiness():
    try:
        policy = booking_policy_snapshot()
        return {
            "configured": True,
            "production_approved": policy["environment"] == "production",
            "policy": policy,
            "retention_execution": "Policy records review thresholds; clinical and financial holds require reviewed disposition.",
        }
    except Unavailable as exc:
        return {"configured": False, "production_approved": False, "reason": str(exc.detail)}
