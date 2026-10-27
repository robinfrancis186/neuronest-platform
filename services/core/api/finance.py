"""Booking and money transitions. Money is always integer INR paise.

Only the signed webhook view and server reconciliation call process_payment_event.
Rows are locked in practitioner -> slot -> appointment -> payment order.
"""

from datetime import timedelta
import logging
import re

import httpx
from django.conf import settings
from django.core.exceptions import ValidationError as ModelValidationError
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework.exceptions import APIException, PermissionDenied, ValidationError

from .demo_booking import is_demo_practitioner, is_demo_appointment, sandbox_ready, booking_policy as demo_policy
from .access import adult, require_child
from .policies import (
    booking_policy_snapshot,
    cancellation_decision,
    cancellation_refund_limit_minor,
    provider_payout_minor,
)
from .models import (
    Appointment,
    LedgerEntry,
    Outbox,
    Payment,
    PaymentEvent,
    Practitioner,
    Refund,
    Slot,
)

ACTIVE = ["awaiting_payment", "confirmed", "in_progress", "completed", "no_show"]


class ProviderUnavailable(APIException):
    status_code = 503
    default_detail = "Payment provider unavailable. Reconcile before retrying."


def _provider(method, path, *, data=None, headers=None):
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise ProviderUnavailable("Configure Razorpay sandbox credentials first.")
    if not settings.RAZORPAY_KEY_ID.startswith("rzp_test_"):
        raise ProviderUnavailable(
            "Only Razorpay test keys are supported; real charges are disabled."
        )
    try:
        response = httpx.request(
            method,
            "https://api.razorpay.com" + path,
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
            json=data,
            headers=headers,
            timeout=15,
        )
        response.raise_for_status()
        result = response.json()
        if not isinstance(result, dict):
            raise ValueError("Invalid provider response")
        return result
    except httpx.HTTPStatusError as exc:
        logging.getLogger(__name__).warning(
            "Razorpay sandbox request failed: HTTP %s", exc.response.status_code
        )
        if exc.response.status_code == 401:
            raise ProviderUnavailable(
                "Razorpay rejected the test credentials. Update the backend test key ID and secret."
            ) from exc
        raise ProviderUnavailable() from exc
    except (httpx.HTTPError, ValueError) as exc:
        # Provider response bodies can contain account information: never expose them.
        logging.getLogger(__name__).warning(
            "Razorpay sandbox request failed: %s", type(exc).__name__
        )
        raise ProviderUnavailable() from exc


def _emit(kind, appointment, actor=None, **payload):
    Outbox.objects.create(
        kind=kind,
        aggregate_id=str(appointment.pk),
        actor_id=actor.pk if actor else None,
        child_id=appointment.child_id,
        payload=payload,
        available_at=timezone.now(),
    )


def _verified(practitioner):
    if (
        not practitioner.verified
        or practitioner.status != "active"
        or not practitioner.user.is_active
        or practitioner.user.role not in ["doctor", "therapist"]
        or practitioner.profession != practitioner.user.role
    ):
        raise ValidationError(
            "An active doctor or therapist is required for a paid consultation. Mentors provide messaging support."
        )


def _booker(user, appointment=None, child=None):
    if not user.is_active or user.role != "parent":
        raise PermissionDenied("An active guardian account is required.")
    if appointment and appointment.booker_id != user.pk:
        raise PermissionDenied("Only the booking guardian can change this payment or booking.")
    subject = child or appointment.child
    if adult(subject):
        raise PermissionDenied(
            "New child-care bookings stop at adulthood; retained records use the reviewed transition workflow."
        )
    require_child(user, subject, "records")


def _can_change(user, appointment):
    if user.pk == appointment.practitioner.user_id:
        _verified(appointment.practitioner)
        require_child(user, appointment.child, "records")
    else:
        _booker(user, appointment)


def _lock_appointment(appointment):
    # Never join a nullable relation in FOR UPDATE: PostgreSQL rejects that lock.
    Practitioner.objects.select_for_update().get(pk=appointment.practitioner_id)
    Slot.objects.select_for_update().get(pk=appointment.slot_id)
    return Appointment.objects.select_for_update().get(pk=appointment.pk)


def _expire(slot):
    expired = Appointment.objects.select_for_update().filter(
        slot=slot, status="awaiting_payment", hold_expires_at__lte=timezone.now()
    )
    for appointment in expired:
        appointment.status = "expired"
        appointment.save(update_fields=["status"])
        _emit("booking.expired", appointment)


@transaction.atomic
def create_slot(user, starts_at, ends_at, consultation_mode="online", clinic_address=""):
    if consultation_mode not in {"online", "in_person"}:
        raise ValidationError({"consultation_mode": "Choose online or in-person consultation."})
    if not isinstance(clinic_address, str) or len(clinic_address.strip()) > 500:
        raise ValidationError({"clinic_address": "Use a clinic address of at most 500 characters."})
    clinic_address = clinic_address.strip()
    if (consultation_mode == "in_person") != bool(clinic_address):
        raise ValidationError(
            {
                "clinic_address": "A clinic address is required for in-person visits and must be blank for online visits."
            }
        )
    practitioner = Practitioner.objects.select_for_update().filter(user=user).first()
    if not practitioner:
        raise PermissionDenied("Practitioner account required.")
    _verified(practitioner)
    if (
        timezone.is_naive(starts_at)
        or timezone.is_naive(ends_at)
        or starts_at <= timezone.now()
        or ends_at <= starts_at
        or ends_at - starts_at > timedelta(hours=4)
    ):
        raise ValidationError("Use a future timezone-aware interval of at most four hours.")
    if Slot.objects.filter(
        practitioner=practitioner, starts_at__lt=ends_at, ends_at__gt=starts_at
    ).exists():
        raise ValidationError("This availability overlaps an existing slot.")
    return Slot.objects.create(
        practitioner=practitioner,
        starts_at=starts_at,
        ends_at=ends_at,
        consultation_mode=consultation_mode,
        clinic_address=clinic_address,
    )


@transaction.atomic
def hold_appointment(user, child, slot):
    practitioner = Practitioner.objects.select_for_update().get(pk=slot.practitioner_id)
    slot = Slot.objects.select_for_update().get(pk=slot.pk)
    _verified(practitioner)
    _booker(user, child=child)
    # A paid visit discloses child and financial metadata, so it needs current care consent too.
    demo = is_demo_practitioner(practitioner)
    if demo and not sandbox_ready():
        raise ProviderUnavailable("Project-demo booking is not enabled with test payment credentials.")
    if not demo:
        require_child(practitioner.user, child, "records")
    if slot.starts_at <= timezone.now():
        raise ValidationError("This appointment time has passed.")
    _expire(slot)
    existing = Appointment.objects.filter(slot=slot, status__in=ACTIVE).first()
    if existing:
        if (
            existing.booker_id == user.pk
            and existing.child_id == child.pk
            and existing.status == "awaiting_payment"
        ):
            return existing
        raise ValidationError("This appointment slot is already reserved.")
    policy = demo_policy() if demo else booking_policy_snapshot()
    appointment = Appointment.objects.create(
        child=child,
        booker=user,
        practitioner=practitioner,
        slot=slot,
        amount_minor=practitioner.fee_minor,
        policy_snapshot=policy,
        hold_expires_at=min(
            timezone.now() + timedelta(minutes=policy["booking"]["hold_minutes"]), slot.starts_at
        ),
    )
    _emit("booking.held", appointment, user)
    return appointment


@transaction.atomic
def cancel_appointment(user, appointment, reason=""):
    appointment = _lock_appointment(appointment)
    _can_change(user, appointment)
    if appointment.status == "cancelled":
        return appointment
    if appointment.status in ["completed", "no_show", "in_progress"]:
        raise ValidationError("This consultation cannot be cancelled.")
    if len(reason) > 2000:
        raise ValidationError("Cancellation reason is too long.")
    if not appointment.policy_snapshot:
        appointment.policy_snapshot = booking_policy_snapshot()
    appointment.policy_snapshot["cancellation_decision"] = cancellation_decision(
        appointment, provider_cancelled=user.pk == appointment.practitioner.user_id
    )
    if appointment.status == "expired":
        appointment.policy_snapshot["cancellation_decision"].update(
            refund_limit_minor=appointment.amount_minor,
            refund_percent=100,
            reason="expired_reservation",
        )
    appointment.status = "cancelled"
    appointment.cancellation_reason = reason
    appointment.save(update_fields=["status", "cancellation_reason", "policy_snapshot"])
    _emit("booking.cancelled", appointment, user)
    payment = Payment.objects.select_for_update().filter(appointment=appointment).first()
    if (
        payment
        and LedgerEntry.objects.filter(payment=payment, reference=f"capture:{payment.pk}").exists()
    ):
        _emit(
            "payment.refund_required",
            appointment,
            user,
            payment_id=str(payment.pk),
            reason="cancelled_booking",
        )
    return appointment


@transaction.atomic
def reschedule_appointment(user, appointment, slot):
    if slot.consultation_mode != appointment.slot.consultation_mode:
        raise ValidationError(
            "Rescheduling must keep the same consultation type. Cancel and rebook to change it."
        )
    if slot.practitioner_id != appointment.practitioner_id:
        raise ValidationError(
            "Rescheduling must use the same practitioner; cancel and rebook to change."
        )
    Practitioner.objects.select_for_update().get(pk=appointment.practitioner_id)
    # Stable lock order for a simultaneous A->B and B->A reschedule.
    list(
        Slot.objects.select_for_update()
        .filter(pk__in=[slot.pk, appointment.slot_id])
        .order_by("pk")
    )
    appointment = Appointment.objects.select_for_update().get(pk=appointment.pk)
    slot = Slot.objects.get(pk=slot.pk)
    _can_change(user, appointment)
    _verified(appointment.practitioner)
    if not is_demo_appointment(appointment):
        require_child(appointment.practitioner.user, appointment.child, "records")
    if appointment.status not in ["awaiting_payment", "confirmed"]:
        raise ValidationError("Only pending or confirmed appointments can be rescheduled.")
    if appointment.slot.starts_at <= timezone.now() or slot.starts_at <= timezone.now():
        raise ValidationError("Rescheduling requires a future appointment time.")
    if appointment.status == "awaiting_payment" and appointment.hold_expires_at <= timezone.now():
        raise ValidationError("This reservation expired; create a new booking.")
    if appointment.slot_id == slot.pk:
        return appointment
    _expire(slot)
    if Appointment.objects.filter(slot=slot, status__in=ACTIVE).exists():
        raise ValidationError("The replacement slot is already reserved.")
    appointment.slot = slot
    appointment.save(update_fields=["slot"])
    _emit("booking.rescheduled", appointment, user)
    return appointment


def create_payment(user, appointment):
    if (
        settings.PRODUCTION
        and not is_demo_appointment(appointment)
        and not settings.DEMO_MODE
        and not (
            settings.RAZORPAY_KEY_ID.startswith("rzp_test_")
            and settings.RAZORPAY_KEY_SECRET
            and settings.RAZORPAY_WEBHOOK_SECRET
            and settings.OUTBOX_WORKER_ENABLED
        )
    ):
        raise ProviderUnavailable(
            "Payments require Razorpay sandbox credentials, webhook verification and an active delivery worker."
        )
    with transaction.atomic():
        appointment = _lock_appointment(appointment)
        _booker(user, appointment)
        _verified(appointment.practitioner)
        if is_demo_appointment(appointment) and not sandbox_ready():
            raise ProviderUnavailable("Project-demo checkout requires enabled Razorpay test credentials.")
        if not is_demo_appointment(appointment):
            require_child(appointment.practitioner.user, appointment.child, "records")
        if (
            appointment.status != "awaiting_payment"
            or appointment.hold_expires_at <= timezone.now()
        ):
            raise ValidationError("A current unpaid booking is required.")
        if appointment.amount_minor <= 0:
            raise ValidationError("Payment requires a positive configured consultation fee.")
        payment, created = Payment.objects.select_for_update().get_or_create(
            appointment=appointment,
            defaults={
                "amount_minor": appointment.amount_minor,
                "demo": settings.DEMO_MODE,
                "status": "order_pending",
            },
        )
        if not created:
            if payment.provider_order_id:
                return payment
            raise ProviderUnavailable(
                "Order creation is pending reconciliation. Do not retry checkout."
            )
    # Persist the intent before making the external write, so timeout/crash cannot silently retry it.
    if payment.demo:
        order = {
            "id": f"order_demo_{payment.pk.hex}",
            "amount": payment.amount_minor,
            "currency": "INR",
        }
    else:
        order = _provider(
            "POST",
            "/v1/orders",
            data={
                "amount": payment.amount_minor,
                "currency": "INR",
                "receipt": payment.pk.hex,
                "notes": {"neuronest_payment": str(payment.pk)},
            },
        )
    if (
        not order.get("id")
        or order.get("amount") != payment.amount_minor
        or order.get("currency") != "INR"
    ):
        raise ProviderUnavailable("Order response needs reconciliation.")
    with transaction.atomic():
        payment = Payment.objects.select_for_update().get(pk=payment.pk)
        payment.provider_order_id = order["id"]
        payment.status = "created"
        payment.save(update_fields=["provider_order_id", "status"])
    return payment


def payment_payload(payment):
    return {
        "key": "" if payment.demo else settings.RAZORPAY_KEY_ID,
        "order_id": payment.provider_order_id,
        "amount": payment.amount_minor,
        "currency": "INR",
        "name": "NeuroNest",
        "description": "Project demo appointment — no medical service" if is_demo_appointment(payment.appointment) else "Consultation booking",
        "ready": bool(payment.provider_order_id),
        "verification": "Server verification is required; client success never confirms a booking.",
    }


def _entity(data, name):
    value = data.get(name, {})
    if isinstance(value, dict) and isinstance(value.get("entity"), dict):
        return value["entity"]
    return value if value else data


def _minor(value):
    return isinstance(value, int) and not isinstance(value, bool) and value > 0


def _apply_refunds(payment):
    total = (
        Refund.objects.filter(payment=payment, status="processed").aggregate(n=Sum("amount_minor"))[
            "n"
        ]
        or 0
    )
    if total > payment.amount_minor:
        raise ValidationError("Refund total exceeds captured amount.")
    if not LedgerEntry.objects.filter(payment=payment, reference=f"capture:{payment.pk}").exists():
        payment.status = "reconciliation_required"
    else:
        for refund in Refund.objects.filter(payment=payment, status="processed"):
            LedgerEntry.objects.get_or_create(
                reference=f"refund:{refund.pk}",
                defaults={
                    "payment": payment,
                    "debit": "booking_liability",
                    "credit": "payment_processor",
                    "amount_minor": refund.amount_minor,
                },
            )
        payment.refunded_minor = total
        if total:
            payment.status = "refunded" if total == payment.amount_minor else "partially_refunded"
    payment.save(update_fields=["status", "refunded_minor"])


def process_payment_event(event_id, kind, data):
    """Apply a previously verified event; persist duplicates and unmatchable evidence safely."""
    if (
        not isinstance(event_id, str)
        or not event_id
        or len(event_id) > 255
        or not isinstance(kind, str)
        or not kind
        or len(kind) > 100
        or not isinstance(data, dict)
    ):
        raise ValidationError("Invalid payment event.")
    item = _entity(data, "refund" if kind.startswith("refund.") else "payment")
    if not isinstance(item, dict):
        raise ValidationError("Invalid event entity.")
    payment_entity = _entity(data, "payment")
    order_id = payment_entity.get("order_id") if isinstance(payment_entity, dict) else None
    provider_id = (
        item.get("payment_id")
        if kind.startswith(("refund.", "payment.dispute."))
        else item.get("id")
    )
    if kind.startswith("payment.dispute."):
        item = _entity(data, "dispute")
        provider_id = item.get("payment_id")
    candidate = Payment.objects.filter(provider_order_id=order_id).first() if order_id else None
    if candidate is None and provider_id:
        candidate = Payment.objects.filter(provider_payment_id=provider_id).first()
    # Capture may not have arrived before its refund. A payment entity order_id still resolves it.
    with transaction.atomic():
        if candidate:
            appointment = _lock_appointment(candidate.appointment)
            candidate = Payment.objects.select_for_update().get(pk=candidate.pk)
        event, created = PaymentEvent.objects.get_or_create(
            provider_event_id=event_id, defaults={"kind": kind, "payment": candidate}
        )
        if not created and event.status not in ["unmatched", "received"]:
            return event
        if not candidate:
            event.status, event.detail = (
                "unmatched",
                "No matching order/payment; reconcile provider evidence.",
            )
            event.save(update_fields=["status", "detail"])
            return event
        payment = candidate
        event.payment = payment
        event.status = "processed"
        if (
            provider_id
            and payment.provider_payment_id
            and payment.provider_payment_id != provider_id
            and kind != "payment.failed"
        ):
            event.status, event.detail = (
                "rejected",
                "Payment identifier differs from the recorded capture.",
            )
        elif kind in ["payment.captured", "payment.authorized", "payment.failed"]:
            if (
                not provider_id
                or not _minor(item.get("amount"))
                or item["amount"] != payment.amount_minor
                or item.get("currency") != "INR"
                or item.get("order_id") != payment.provider_order_id
            ):
                event.status, event.detail = (
                    "rejected",
                    "Payment amount, currency or order does not match.",
                )
            elif kind == "payment.captured":
                if (
                    Payment.objects.exclude(pk=payment.pk)
                    .filter(provider_payment_id=provider_id)
                    .exists()
                ):
                    event.status, event.detail = (
                        "rejected",
                        "Payment identifier already belongs to another order.",
                    )
                else:
                    payment.provider_payment_id = provider_id
                    _, first_capture = LedgerEntry.objects.get_or_create(
                        reference=f"capture:{payment.pk}",
                        defaults={
                            "payment": payment,
                            "debit": "payment_processor",
                            "credit": "booking_liability",
                            "amount_minor": payment.amount_minor,
                        },
                    )
                    if first_capture:
                        can_confirm = (
                            appointment.status == "awaiting_payment"
                            and appointment.hold_expires_at > timezone.now()
                            and appointment.slot.starts_at > timezone.now()
                        )
                        try:
                            _verified(appointment.practitioner)
                            _booker(appointment.booker, appointment)
                            if is_demo_appointment(appointment):
                                if not sandbox_ready():
                                    can_confirm = False
                            else:
                                require_child(
                                    appointment.practitioner.user, appointment.child, "records"
                                )
                        except (ValidationError, PermissionDenied):
                            can_confirm = False
                        # Do not confirm an already-refunded transaction arriving out of order.
                        can_confirm = (
                            can_confirm
                            and not Refund.objects.filter(
                                payment=payment, status="processed"
                            ).exists()
                        )
                        if can_confirm:
                            appointment.status = "confirmed"
                            appointment.save(update_fields=["status"])
                            payment.status = "captured"
                            _emit("booking.confirmed", appointment, appointment.booker)
                        else:
                            payment.status = "reconciliation_required"
                            if appointment.status == "awaiting_payment":
                                appointment.status = "expired"
                                appointment.save(update_fields=["status"])
                            _emit(
                                "payment.refund_required",
                                appointment,
                                payment_id=str(payment.pk),
                                reason="late_or_ineligible_capture",
                            )
                        _emit("payment.captured", appointment, payment_id=str(payment.pk))
                    payment.save(update_fields=["provider_payment_id", "status"])
                    _apply_refunds(payment)
            elif not LedgerEntry.objects.filter(
                payment=payment, reference=f"capture:{payment.pk}"
            ).exists():
                # Failed attempts do not pin an order to an unusable payment identifier.
                if kind == "payment.authorized":
                    payment.status = "authorized"
                elif payment.status != "authorized":
                    payment.status = "failed"
                payment.save(update_fields=["status"])
        elif kind in ["refund.created", "refund.processed", "refund.failed"]:
            refund_id, amount = item.get("id"), item.get("amount")
            existing = (
                Refund.objects.filter(provider_refund_id=refund_id).first() if refund_id else None
            )
            # A webhook can beat the POST response. Correlate the already persisted refund intent.
            notes = item.get("notes") if isinstance(item.get("notes"), dict) else {}
            receipt = item.get("receipt") or notes.get("neuronest_refund")
            if not existing and isinstance(receipt, str):
                try:
                    existing = Refund.objects.filter(pk=receipt, payment=payment).first()
                except (ValueError, ModelValidationError):
                    pass
            other_total = (
                Refund.objects.filter(payment=payment, status="processed")
                .exclude(pk=existing.pk if existing else None)
                .aggregate(n=Sum("amount_minor"))["n"]
                or 0
            )
            if (
                not refund_id
                or not provider_id
                or not _minor(amount)
                or item.get("currency", "INR") != "INR"
                or amount + other_total > payment.amount_minor
                or Payment.objects.exclude(pk=payment.pk)
                .filter(provider_payment_id=provider_id)
                .exists()
                or (
                    existing
                    and (
                        existing.payment_id != payment.pk
                        or existing.amount_minor != amount
                        or existing.provider_refund_id not in [None, refund_id]
                    )
                )
            ):
                event.status, event.detail = "rejected", "Refund identifiers or amount are invalid."
            else:
                if not payment.provider_payment_id:
                    payment.provider_payment_id = provider_id
                    payment.save(update_fields=["provider_payment_id"])
                refund = existing or Refund.objects.create(
                    payment=payment,
                    provider_refund_id=refund_id,
                    request_key=f"webhook:{refund_id}",
                    amount_minor=amount,
                )
                refund.provider_refund_id = refund_id
                if refund.status != "processed":
                    refund.status = {
                        "refund.processed": "processed",
                        "refund.failed": "failed",
                        "refund.created": "pending",
                    }[kind]
                refund.save(update_fields=["provider_refund_id", "status"])
                _apply_refunds(payment)
                if payment.refunded_minor == payment.amount_minor and appointment.status in [
                    "awaiting_payment",
                    "confirmed",
                ]:
                    appointment.status, appointment.cancellation_reason = (
                        "cancelled",
                        "Provider verified full refund",
                    )
                    appointment.save(update_fields=["status", "cancellation_reason"])
                    _emit("booking.cancelled", appointment)
                _emit(
                    "payment.refund_updated",
                    appointment,
                    payment_id=str(payment.pk),
                    refund_id=str(refund.pk),
                )
        elif kind.startswith("payment.dispute."):
            # A dispute is evidence against automated settlement. Only reviewed provider
            # reconciliation may establish later financial state; never resume payout here.
            event.status, event.detail = (
                "review_required",
                "Dispute requires operations review; automated payout is held.",
            )
            payment.status = "reconciliation_required"
            payment.save(update_fields=["status"])
            _emit("payment.dispute", appointment, payment_id=str(payment.pk), event=kind)
        else:
            event.status = "ignored"
        event.save(update_fields=["payment", "status", "detail"])
        return event


def simulate_capture(payment):
    if not settings.DEMO_MODE or not payment.demo or not payment.provider_order_id:
        raise PermissionDenied("Synthetic capture requires a local demo payment.")
    event = process_payment_event(
        f"demo-capture:{payment.pk}",
        "payment.captured",
        {
            "id": f"pay_demo_{payment.pk.hex}",
            "order_id": payment.provider_order_id,
            "amount": payment.amount_minor,
            "currency": "INR",
        },
    )
    # A rejected or unmatched synthetic event used to be discarded here, so the caller
    # was handed back an uncaptured payment as though checkout had succeeded.
    if event.status != "processed":
        raise ValidationError(f"Synthetic capture was not applied ({event.status}).")
    payment.refresh_from_db()
    return payment


def request_refund(payment, request_key):
    if not isinstance(request_key, str) or not request_key or len(request_key) > 160:
        raise ValidationError("A stable refund request key is required.")
    with transaction.atomic():
        appointment = _lock_appointment(payment.appointment)
        payment = Payment.objects.select_for_update().get(pk=payment.pk)
        existing = Refund.objects.filter(request_key=request_key).first()
        if existing:
            if existing.payment_id != payment.pk:
                raise ValidationError("Refund request key already used for another payment.")
            return existing
        if not LedgerEntry.objects.filter(
            payment=payment, reference=f"capture:{payment.pk}"
        ).exists():
            raise ValidationError("Only a verified capture can be refunded.")
        if payment.transfer_id:
            raise ValidationError("Transferred payments require transfer reversal before refund.")
        if appointment.status not in ["cancelled", "expired"]:
            raise ValidationError("Cancel the appointment before requesting a refund.")
        pending = (
            Refund.objects.filter(
                payment=payment, status__in=["requested", "pending", "reconciliation_required"]
            ).aggregate(n=Sum("amount_minor"))["n"]
            or 0
        )
        limit = (
            cancellation_refund_limit_minor(appointment)
            if appointment.status == "cancelled"
            else payment.amount_minor
        )
        amount = limit - payment.refunded_minor - pending
        if amount <= 0:
            raise ValidationError("This payment is already refunded or has a refund in progress.")
        refund = Refund.objects.create(
            payment=payment, request_key=request_key, amount_minor=amount
        )
    if payment.demo:
        if not settings.DEMO_MODE:
            raise PermissionDenied("Demo refund disabled.")
        result = {"id": f"rfnd_demo_{refund.pk.hex}", "status": "processed"}
    else:
        try:
            # Razorpay treats receipt as an idempotency key for refunds on a payment.
            result = _provider(
                "POST",
                f"/v1/payments/{payment.provider_payment_id}/refund",
                data={
                    "amount": amount,
                    "receipt": refund.pk.hex,
                    "notes": {"neuronest_refund": str(refund.pk)},
                },
            )
        except ProviderUnavailable:
            Refund.objects.filter(pk=refund.pk).update(status="reconciliation_required")
            raise
    if not result.get("id"):
        Refund.objects.filter(pk=refund.pk).update(status="reconciliation_required")
        raise ProviderUnavailable("Refund response requires reconciliation.")
    with transaction.atomic():
        refund = Refund.objects.select_for_update().get(pk=refund.pk)
        refund.provider_refund_id = result["id"]
        if refund.status != "processed":
            refund.status = "pending"
        refund.save(update_fields=["provider_refund_id", "status"])
    if result.get("status") == "processed":
        process_payment_event(
            f"refund-response:{refund.pk}",
            "refund.processed",
            {
                "id": result["id"],
                "payment_id": payment.provider_payment_id,
                "amount": amount,
                "currency": "INR",
            },
        )
    refund.refresh_from_db()
    return refund


def reconcile_payment(payment):
    if payment.demo:
        return {"status": payment.status}
    if not payment.provider_order_id:
        orders = _provider("GET", f"/v1/orders?receipt={payment.pk.hex}")
        matches = [
            o
            for o in orders.get("items", [])
            if o.get("receipt") == payment.pk.hex
            and o.get("amount") == payment.amount_minor
            and o.get("currency") == "INR"
        ]
        if len(matches) != 1:
            raise ProviderUnavailable(
                "Order creation is ambiguous; operations must reconcile before a new charge."
            )
        with transaction.atomic():
            locked = Payment.objects.select_for_update().get(pk=payment.pk)
            locked.provider_order_id, locked.status = matches[0]["id"], "created"
            locked.save(update_fields=["provider_order_id", "status"])
        payment.refresh_from_db()
    evidence = _provider("GET", f"/v1/orders/{payment.provider_order_id}/payments")
    for item in evidence.get("items", []):
        state = item.get("status")
        # A fully refunded provider payment still proves its earlier capture.
        kind = "payment.captured" if state in ["captured", "refunded"] else f"payment.{state}"
        if kind in ["payment.captured", "payment.failed", "payment.authorized"]:
            process_payment_event(f"reconcile:{item['id']}:{state}", kind, item)
    payment.refresh_from_db()
    if payment.provider_payment_id:
        refunds = _provider("GET", f"/v1/payments/{payment.provider_payment_id}/refunds")
        for item in refunds.get("items", []):
            if item.get("status") in ["processed", "failed", "pending"]:
                kind = (
                    "refund.created" if item["status"] == "pending" else f"refund.{item['status']}"
                )
                process_payment_event(f"reconcile:{item['id']}:{item['status']}", kind, item)
    payment.refresh_from_db()
    result = {"status": payment.status, "refunded_minor": payment.refunded_minor}
    if payment.transfer_id:
        result["transfer"] = reconcile_transfer(payment)
    return result


def create_route_account(practitioner, data):
    if not isinstance(data, dict):
        raise ValidationError("Supply an account object.")
    with transaction.atomic():
        practitioner = Practitioner.objects.select_for_update().get(pk=practitioner.pk)
        _verified(practitioner)
        if practitioner.route_account_id:
            if not practitioner.route_account_id.startswith("pending:"):
                return {
                    "id": practitioner.route_account_id,
                    "status": "provider_verification_required",
                }
            recovering = True
        else:
            if not all(
                data.get(k)
                for k in ["email", "phone", "legal_business_name", "business_type", "profile"]
            ):
                raise ValidationError(
                    "Supply email, phone, legal_business_name, business_type and business profile."
                )
            recovering = False
            practitioner.route_account_id = f"pending:{practitioner.pk}"
            practitioner.save(update_fields=["route_account_id"])
    if recovering:
        # The documented API fetches a known account ID. Never invent a list/search API or retry POST.
        identifier = data.get("provider_account_id", "")
        if not isinstance(identifier, str) or not re.fullmatch(
            r"acc_[A-Za-z0-9]{1,80}", identifier
        ):
            raise ValidationError(
                "Supply provider_account_id from the Razorpay Dashboard to verify an ambiguous account creation."
            )
        result = _provider("GET", f"/v2/accounts/{identifier}")
        if (
            result.get("id") != identifier
            or result.get("type") != "route"
            or result.get("reference_id") != practitioner.pk.hex
        ):
            raise ProviderUnavailable(
                "Linked account does not match this practitioner reference; no account was linked."
            )
        with transaction.atomic():
            locked = Practitioner.objects.select_for_update().get(pk=practitioner.pk)
            if locked.route_account_id not in [practitioner.route_account_id, identifier]:
                raise ValidationError("The linked account changed during reconciliation.")
            if (
                Practitioner.objects.exclude(pk=practitioner.pk)
                .filter(route_account_id=identifier)
                .exists()
            ):
                raise ValidationError(
                    "This linked account already belongs to another practitioner."
                )
            locked.route_account_id = identifier
            locked.save(update_fields=["route_account_id"])
        return {
            "id": identifier,
            "status": result.get("status", "provider_verification_required"),
            "reconciled": True,
        }
    if settings.DEMO_MODE:
        result = {"id": f"acc_demo_{practitioner.pk.hex}", "status": "synthetic"}
    else:
        # The provider creates a linked account; KYC/product activation is a separate review.
        result = _provider(
            "POST",
            "/v2/accounts",
            data={**data, "type": "route", "reference_id": practitioner.pk.hex},
        )
    if not result.get("id"):
        raise ProviderUnavailable("Linked account creation requires reconciliation.")
    Practitioner.objects.filter(pk=practitioner.pk).update(route_account_id=result["id"])
    return {"id": result["id"], "status": result.get("status", "provider_verification_required")}


def _record_transfer(payment, item):
    with transaction.atomic():
        appointment = _lock_appointment(payment.appointment)
        payment = Payment.objects.select_for_update().get(pk=payment.pk)
        payout = provider_payout_minor(appointment)
        if not payment.demo and (
            not isinstance(item.get("id"), str)
            or item.get("source") != payment.provider_payment_id
            or item.get("recipient") != appointment.practitioner.route_account_id
            or type(item.get("amount")) is not int
            or item.get("amount") != payout
            or item.get("currency") != "INR"
            or not isinstance(item.get("notes"), dict)
            or item["notes"].get("neuronest_payment") != str(payment.pk)
        ):
            raise ProviderUnavailable(
                "Transfer evidence does not match the persisted payout intent."
            )
        if payment.transfer_id not in [f"pending:{payment.pk}", item["id"]]:
            raise ValidationError("Transfer identity changed during reconciliation.")
        payment.transfer_id = item["id"]
        payment.save(update_fields=["transfer_id"])
        # A pending/failed provider transfer is not evidence that funds moved.
        if item.get("status") in ["processed", "synthetic"]:
            _, created = LedgerEntry.objects.get_or_create(
                reference=f"transfer:{payment.pk}",
                defaults={
                    "payment": payment,
                    "debit": "booking_liability",
                    "credit": "provider_settlement",
                    "amount_minor": payout,
                },
            )
            commission = payment.amount_minor - payout
            if commission:
                LedgerEntry.objects.get_or_create(
                    reference=f"commission:{payment.pk}",
                    defaults={
                        "payment": payment,
                        "debit": "booking_liability",
                        "credit": "platform_revenue",
                        "amount_minor": commission,
                    },
                )
            if created:
                _emit("payment.transfer_submitted", appointment, payment_id=str(payment.pk))
    return {
        "id": item["id"],
        "status": item.get("status", "unknown"),
        "settlement_status": item.get("settlement_status", "unverified"),
    }


def reconcile_transfer(payment):
    payment = Payment.objects.select_related("appointment__practitioner").get(pk=payment.pk)
    if not payment.transfer_id:
        raise ValidationError("There is no persisted transfer intent to reconcile.")
    if payment.demo:
        return {
            "id": payment.transfer_id,
            "status": "synthetic",
            "settlement_status": "not_applicable",
        }
    evidence = _provider("GET", f"/v1/payments/{payment.provider_payment_id}/transfers")
    items = evidence.get("items", [])
    if not isinstance(items, list):
        raise ProviderUnavailable("Transfer evidence is not a valid collection.")
    payout = provider_payout_minor(payment.appointment)
    matches = [
        item
        for item in items
        if isinstance(item, dict)
        and item.get("id")
        and item.get("source") == payment.provider_payment_id
        and item.get("recipient") == payment.appointment.practitioner.route_account_id
        and type(item.get("amount")) is int
        and item.get("amount") == payout
        and item.get("currency") == "INR"
        and isinstance(item.get("notes"), dict)
        and item["notes"].get("neuronest_payment") == str(payment.pk)
        and (payment.transfer_id.startswith("pending:") or item["id"] == payment.transfer_id)
    ]
    if len(matches) != 1:
        raise ProviderUnavailable(
            "Transfer evidence is missing or ambiguous; no new transfer was issued."
        )
    return _record_transfer(payment, matches[0])


def transfer_payment(payment):
    if is_demo_appointment(payment.appointment):
        raise ValidationError("Project-demo bookings do not support practitioner payouts.")
    with transaction.atomic():
        appointment = _lock_appointment(payment.appointment)
        payment = Payment.objects.select_for_update().get(pk=payment.pk)
        _verified(appointment.practitioner)
        if PaymentEvent.objects.filter(
            payment=payment, kind__startswith="payment.dispute."
        ).exists():
            raise ValidationError(
                "A provider dispute is on hold; documented operations reconciliation is required before any payout."
            )
        if payment.transfer_id:
            recovering = True
        else:
            recovering = False
        if not recovering and (
            appointment.status != "completed"
            or payment.status != "captured"
            or payment.refunded_minor
            or Refund.objects.filter(payment=payment).exclude(status="failed").exists()
        ):
            raise ValidationError(
                "Transfers require a completed, captured consultation without refunds."
            )
        if (
            not appointment.practitioner.route_account_id
            or appointment.practitioner.route_account_id.startswith("pending:")
        ):
            raise ValidationError("Practitioner payout onboarding is incomplete.")
        payout = provider_payout_minor(appointment)
        if payout <= 0:
            raise ValidationError("The approved booking policy has no provider payout due.")
        if not recovering:
            payment.transfer_id = f"pending:{payment.pk}"
            payment.save(update_fields=["transfer_id"])
    if recovering:
        return reconcile_transfer(payment)
    if payment.demo:
        if not settings.DEMO_MODE:
            raise PermissionDenied("Demo transfers disabled.")
        item = {"id": f"trf_demo_{payment.pk.hex}", "status": "synthetic"}
    else:
        result = _provider(
            "POST",
            f"/v1/payments/{payment.provider_payment_id}/transfers",
            data={
                "transfers": [
                    {
                        "account": appointment.practitioner.route_account_id,
                        "amount": payout,
                        "currency": "INR",
                        "notes": {"neuronest_payment": str(payment.pk)},
                    }
                ]
            },
        )
        items = result.get("items", [])
        if len(items) != 1 or not items[0].get("id"):
            raise ProviderUnavailable(
                "Transfer response requires reconciliation; do not retry transfer."
            )
        item = items[0]
    return _record_transfer(payment, item)
