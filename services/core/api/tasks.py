import io, os, time
from datetime import timedelta
from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.db import DatabaseError, transaction
from django.db.models import F, Q
from django.utils import timezone
import httpx
from . import models as m
from .access import can_access, guardian, clinician_active, audit, emit

# How long one worker holds a claimed outbox row before it may be re-delivered.
LEASE = timedelta(minutes=2)
SCHEDULER_LEASE = timedelta(seconds=55)
SCHEDULER_FRESHNESS = {
    # The hosted outbox is scheduled every minute; reminders and rate-limit
    # retention run every five minutes through the same guarded job.
    "outbox": timedelta(minutes=3),
    "reminders": timedelta(minutes=12),
}
SYNCHRONOUS_BATCH_SIZE = 5
SYNCHRONOUS_DEADLINE_SECONDS = 40


def notification(user, title, kind, reference):
    """Deliver one notification. Each channel commits its own outcome.

    Email and push are external sends that cannot be rolled back. Holding them
    in one transaction means a push failure discards the record that the email
    already went out, and the outbox retry sends it a second time, so each
    channel records its result in its own committed transaction.
    """
    if not user or not user.is_active:
        return
    with transaction.atomic():
        obj, _ = m.Notification.objects.get_or_create(
            reference=reference,
            defaults={
                "user": user,
                "title": title,
                "body": "Open NeuroNest to view this update securely.",
                "kind": kind,
            },
        )
    _deliver_email(user, obj)
    _deliver_push(user, obj)


def _channel_state(obj, field):
    """Read this channel's settled state. The outbox lease already gives one worker per item."""
    return m.Notification.objects.values_list(field, flat=True).get(pk=obj.pk)


def _settle(obj, field, value):
    m.Notification.objects.filter(pk=obj.pk).update(**{field: value})


def _deliver_email(user, obj):
    state = _channel_state(obj, "email_status")
    if not user.email_notifications:
        if state != "disabled":
            _settle(obj, "email_status", "disabled")
        return
    if state in ["sent", "disabled"]:
        return
    send_mail(
        "NeuroNest update",
        "You have a new update. Open NeuroNest to view it securely.",
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )
    _settle(obj, "email_status", "sent")


def _deliver_push(user, obj):
    state = _channel_state(obj, "push_status")
    if not user.push_notifications:
        if state != "disabled":
            _settle(obj, "push_status", "disabled")
        return
    if state in ["sent", "disabled"] or not user.push_token:
        return
    response = httpx.post(
        "https://exp.host/--/api/v2/push/send",
        json={
            "to": user.push_token,
            "title": "NeuroNest update",
            "body": "Open the app to view your update.",
        },
        timeout=10,
    )
    response.raise_for_status()
    result = response.json().get("data", {})
    if result.get("status") != "ok":
        raise RuntimeError("Push delivery provider rejected notification")
    _settle(obj, "push_status", "sent")


def scan_attachment(item):
    from .storage import read_bytes

    obj = m.Attachment.objects.select_related("author", "child").get(pk=item.aggregate_id)
    if not can_access(obj.author, obj.child, "records"):
        obj.scan_detail = "Upload authority was revoked before scanning."
        obj.save(update_fields=["scan_detail"])
        return
    data = read_bytes(obj)
    if settings.CLAMAV_HOST:
        import clamd

        result = clamd.ClamdNetworkSocket(
            host=settings.CLAMAV_HOST, port=int(os.getenv("CLAMAV_PORT", "3310")), timeout=45
        ).instream(io.BytesIO(data))
        verdict = result.get("stream", ("ERROR", "No scanner verdict"))
        if verdict[0] not in ["OK", "FOUND"]:
            raise RuntimeError("Malware scanner did not return a valid verdict")
        accepted = verdict[0] == "OK"
        detail = "ClamAV scan accepted" if accepted else "Malware signature detected"
    elif settings.LOCAL_TEST_SCANNER:
        accepted = b"EICAR-STANDARD-ANTIVIRUS-TEST-FILE" not in data
        detail = "Synthetic development test scanner; not a production malware clearance."
    else:
        raise RuntimeError("ClamAV unavailable; attachment remains quarantined")
    obj.scan_status = "accepted" if accepted else "rejected"
    obj.scan_detail = detail
    obj.save(update_fields=["scan_status", "scan_detail"])
    audit(obj.author, obj.child, "attachment.scanned", obj)


def revoke_rooms(item):
    if not (settings.LIVEKIT_API_KEY and settings.LIVEKIT_API_SECRET):
        return
    import jwt

    if item.kind == "consent.revoked":
        obj = m.Grant.objects.filter(pk=item.aggregate_id).first()
        membership = None if obj else m.Guardianship.objects.filter(pk=item.aggregate_id).first()
        user = obj.recipient if obj else (membership.user if membership else None)
        users = [user] if user else []
        if membership and membership.user_id:
            # A revoked sharing guardian also takes down every grant they issued.
            users.extend(
                g.recipient
                for g in m.Grant.objects.filter(
                    child_id=item.child_id, grantor_id=membership.user_id, revoked_at__isnull=False
                ).select_related("recipient")
            )
        users = list(
            {
                u.pk: u
                for u in users
                if not can_access(u, m.Child.objects.get(pk=item.child_id), "records")
            }.values()
        )
        appointments = m.Appointment.objects.filter(
            child_id=item.child_id, status__in=["confirmed", "in_progress"]
        )
    elif item.kind == "booking.cancelled":
        appointment = m.Appointment.objects.select_related("booker", "practitioner__user").get(pk=item.aggregate_id)
        users = [appointment.booker, appointment.practitioner.user]
        appointments = m.Appointment.objects.filter(pk=appointment.pk)
    else:
        application = m.ProviderApplication.objects.get(pk=item.aggregate_id)
        users = [application.user]
        appointments = m.Appointment.objects.filter(
            practitioner__user=application.user, status__in=["confirmed", "in_progress"]
        )
    for appointment in appointments.filter(slot__consultation_mode="online"):
        room = f"appointment-{appointment.pk}"
        token = jwt.encode(
            {
                "iss": settings.LIVEKIT_API_KEY,
                "exp": int(timezone.now().timestamp()) + 60,
                "video": {"roomAdmin": True, "room": room},
            },
            settings.LIVEKIT_API_SECRET,
            algorithm="HS256",
        )
        endpoint = os.getenv(
            "LIVEKIT_INTERNAL_URL",
            settings.LIVEKIT_URL.replace("ws://", "http://").replace("wss://", "https://"),
        ).rstrip("/") + "/twirp/livekit.RoomService/"
        headers = {"Authorization": f"Bearer {token}"}
        identities = {str(user.pk) for user in users}
        if item.kind == "booking.cancelled":
            response = httpx.post(endpoint + "ListParticipants", headers=headers, json={"room": room}, timeout=10)
            if response.status_code == 200:
                identities.update(p["identity"] for p in response.json().get("participants", []))
            elif response.status_code != 404:
                response.raise_for_status()
        for identity in identities:
            payload = {"room": room, "identity": identity}
            if settings.LIVEKIT_URL.startswith("wss://") and settings.LIVEKIT_URL.split("/")[2].endswith(".livekit.cloud"):
                payload["revoke_token_ts"] = int(timezone.now().timestamp())
            response = httpx.post(
                endpoint + "RemoveParticipant",
                headers=headers,
                json=payload,
                timeout=10,
            )
            if response.status_code not in [200, 404]:
                response.raise_for_status()


def handle(item):
    if item.kind == "attachment.scan":
        return scan_attachment(item)
    if item.kind in ["consent.revoked", "provider.suspended", "booking.cancelled"]:
        revoke_rooms(item)
    if item.kind == "guardian.invited":
        invite = m.Guardianship.objects.get(pk=item.aggregate_id)
        if invite.status == "invited" and guardian(invite.invited_by, invite.child, share=True):
            user = m.Account.objects.filter(email=invite.email, is_active=True).first()
            if user:
                notification(user, "Family invitation", item.kind, f"{item.pk}:{user.pk}")
            else:
                send_mail(
                    "NeuroNest invitation",
                    "You have been invited to NeuroNest. Sign in with this email to review and accept the invitation.",
                    settings.DEFAULT_FROM_EMAIL,
                    [invite.email],
                )
        return
    if item.kind == "message.created":
        message = m.Message.objects.select_related("recipient", "child").get(pk=item.aggregate_id)
        if can_access(message.recipient, message.child, "messages"):
            notification(
                message.recipient,
                "New care message",
                item.kind,
                f"{item.pk}:{message.recipient_id}",
            )
        return
    if item.kind == "vaccination.reminder":
        for membership in m.Guardianship.objects.filter(
            child_id=item.child_id, status="active", user__is_active=True
        ).select_related("user", "child"):
            if can_access(membership.user, membership.child, "records"):
                notification(
                    membership.user,
                    "Review an upcoming care reminder",
                    item.kind,
                    f"{item.pk}:{membership.user_id}",
                )
        return
    appointment = (
        m.Appointment.objects.filter(pk=item.aggregate_id)
        .select_related("booker", "child", "practitioner__user")
        .first()
        if item.kind.startswith(("booking.", "appointment.", "payment."))
        else None
    )
    if appointment:
        if guardian(appointment.booker, appointment.child):
            notification(
                appointment.booker,
                "Your care appointment has an update",
                item.kind,
                f"{item.pk}:{appointment.booker_id}",
            )
        if clinician_active(appointment.practitioner.user):
            notification(
                appointment.practitioner.user,
                "Your schedule has an update",
                item.kind,
                f"{item.pk}:{appointment.practitioner.user_id}",
            )
    elif item.child_id:
        for membership in m.Guardianship.objects.filter(
            child_id=item.child_id, status="active", user__is_active=True
        ).select_related("user", "child"):
            if guardian(membership.user, membership.child):
                notification(
                    membership.user,
                    "Your care journey has an update",
                    item.kind,
                    f"{item.pk}:{membership.user_id}",
                )


def _claim_item(item_id):
    now = timezone.now()
    lease_until = now + LEASE
    claimed = (
        m.Outbox.objects.filter(pk=item_id)
        .filter(Q(lease_until__isnull=True) | Q(lease_until__lte=now))
        .filter(Q(status="pending") | Q(status="processing"))
        .update(status="processing", attempts=F("attempts") + 1, lease_until=lease_until)
    )
    return m.Outbox.objects.get(pk=item_id) if claimed else None


def _claim_due_item():
    now = timezone.now()
    with transaction.atomic():
        item = (
            m.Outbox.objects.select_for_update(skip_locked=True)
            .filter(
                Q(status="pending") | Q(status="processing"),
                Q(lease_until__isnull=True) | Q(lease_until__lte=now),
                available_at__lte=now,
            )
            .order_by("created_at")
            .first()
        )
        if not item:
            return None
        item.status = "processing"
        item.attempts += 1
        item.lease_until = now + LEASE
        item.save(update_fields=["status", "attempts", "lease_until"])
        return item


def _settle_claimed_item(item):
    """Run external effects after a lease claim, then compare-and-set the result."""
    lease_until = item.lease_until
    try:
        handle(item)
        fields = {
            "status": "completed",
            "completed_at": timezone.now(),
            "error": "",
            "lease_until": None,
        }
    except Exception as exc:
        # Avoid recording prompt, file, provider body or credential-bearing exception text.
        fields = {
            "status": "dead" if item.attempts >= 8 else "pending",
            "lease_until": None,
            "available_at": timezone.now() + timedelta(seconds=min(3600, 2**item.attempts * 10)),
            "error": type(exc).__name__,
        }
    return bool(
        m.Outbox.objects.filter(pk=item.pk, status="processing", lease_until=lease_until).update(
            **fields
        )
    )


@shared_task
def process_outbox(item_id):
    """Claim one delivery, run its side effects, then record the outcome."""
    item = _claim_item(item_id)
    return bool(item and _settle_claimed_item(item))


@shared_task
def dispatch_outbox():
    now = timezone.now()
    ids = list(
        m.Outbox.objects.filter(
            Q(status="pending") | Q(status="processing"),
            Q(lease_until__isnull=True) | Q(lease_until__lte=now),
            available_at__lte=now,
        )
        .order_by("created_at")
        .values_list("pk", flat=True)[:50]
    )
    for item_id in ids:
        try:
            process_outbox.delay(str(item_id))
        except Exception:
            m.Outbox.objects.filter(pk=item_id).update(
                error="BrokerUnavailable",
                available_at=now + timedelta(seconds=30),
            )
    return len(ids)


def drain_due_outbox(limit=SYNCHRONOUS_BATCH_SIZE, deadline_seconds=SYNCHRONOUS_DEADLINE_SECONDS):
    """Bounded serverless dispatcher; api_outbox remains the durable queue."""
    started = time.monotonic()
    claimed = settled = 0
    while claimed < limit and time.monotonic() - started < deadline_seconds:
        item = _claim_due_item()
        if not item:
            break
        claimed += 1
        settled += int(_settle_claimed_item(item))
    return {"claimed": claimed, "settled": settled}


def scheduler_healthy(job="outbox"):
    if not settings.OUTBOX_WORKER_ENABLED:
        return False
    if not settings.PRODUCTION:
        return True
    if settings.OUTBOX_SCHEDULER != "supabase_cron" or not settings.OUTBOX_DISPATCH_TOKEN:
        return False
    try:
        return m.SchedulerHeartbeat.objects.filter(
            name=job,
            last_success_at__gte=timezone.now()
            - SCHEDULER_FRESHNESS.get(job, SCHEDULER_FRESHNESS["outbox"]),
        ).exists()
    except DatabaseError:
        return False


def run_scheduled_job(job):
    if job not in {"outbox", "reminders"}:
        raise ValueError("Unknown scheduler job")
    now = timezone.now()
    with transaction.atomic():
        state, _ = m.SchedulerHeartbeat.objects.select_for_update().get_or_create(name=job)
        if state.lease_until and state.lease_until > now:
            return {"status": "busy", "processed": 0}
        lease_until = now + SCHEDULER_LEASE
        state.lease_until = lease_until
        state.last_started_at = now
        state.last_error = ""
        state.save(update_fields=["lease_until", "last_started_at", "last_error"])
    try:
        result = drain_due_outbox() if job == "outbox" else create_reminders()
    except Exception as exc:
        m.SchedulerHeartbeat.objects.filter(name=job, lease_until=lease_until).update(
            lease_until=None, last_error=type(exc).__name__
        )
        raise
    m.SchedulerHeartbeat.objects.filter(name=job, lease_until=lease_until).update(
        lease_until=None, last_success_at=timezone.now(), last_error=""
    )
    processed = result.get("settled")
    if processed is None:
        processed = sum(result.values())
    return {"status": "completed", "processed": processed}


@shared_task
def create_reminders():
    now = timezone.now()
    from .finance import _lock_appointment, _emit
    from .rate_limit import purge_expired_username_sign_in_buckets

    expired = appointment_reminders = vaccination_reminders = 0
    rate_limit_buckets_removed = purge_expired_username_sign_in_buckets()
    for identifier in m.Appointment.objects.filter(
        status="awaiting_payment", hold_expires_at__lte=now
    ).values_list("pk", flat=True)[:100]:
        with transaction.atomic():
            appointment = _lock_appointment(m.Appointment.objects.get(pk=identifier))
            if appointment.status == "awaiting_payment" and appointment.hold_expires_at <= now:
                appointment.status = "expired"
                appointment.save(update_fields=["status"])
                _emit("booking.expired", appointment)
                expired += 1
    for appointment in m.Appointment.objects.filter(
        status="confirmed", slot__starts_at__gt=now, slot__starts_at__lte=now + timedelta(hours=24)
    ).select_related("booker", "child"):
        if guardian(appointment.booker, appointment.child):
            emit(
                "appointment.reminder",
                appointment,
                appointment.booker,
                appointment.child,
                dedupe_key=f"appointment-reminder:{appointment.pk}",
            )
            appointment_reminders += 1
    for entry in m.Vaccination.objects.filter(
        due_on__gte=now.date(),
        due_on__lte=(now + timedelta(days=7)).date(),
        administered_on__isnull=True,
    ).select_related("child"):
        recipients = m.Guardianship.objects.filter(
            child=entry.child, status="active", user__is_active=True
        ).select_related("user")
        if any(can_access(membership.user, entry.child, "records") for membership in recipients):
            emit(
                "vaccination.reminder",
                entry,
                child=entry.child,
                dedupe_key=f"vaccination-reminder:{entry.pk}",
            )
            vaccination_reminders += 1
    return {
        "expired": expired,
        "appointment_reminders": appointment_reminders,
        "vaccination_reminders": vaccination_reminders,
        "rate_limit_buckets_removed": rate_limit_buckets_removed,
    }
