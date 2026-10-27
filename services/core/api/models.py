import uuid
from decimal import Decimal
from django.db import models
from django.db.models import Q
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator


class Entity(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        abstract = True


class Account(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    display_name = models.CharField(max_length=160)
    role = models.CharField(
        max_length=20,
        choices=[(v, v) for v in ["parent", "doctor", "therapist", "mentor", "admin"]],
        default="parent",
    )
    # Legacy provider identity. It is retained during Firebase migration and never rewritten.
    oidc_subject = models.CharField(max_length=255, unique=True, null=True, blank=True)
    firebase_subject = models.CharField(max_length=255, unique=True, null=True, blank=True)
    # Provider subjects are never treated as family-selected sign-in names.
    username_claimed = models.BooleanField(default=True)
    language = models.CharField(
        max_length=2, default="en", choices=[("en", "English"), ("ml", "Malayalam")]
    )
    email_notifications = models.BooleanField(default=True)
    push_notifications = models.BooleanField(default=False)
    push_token = models.CharField(max_length=255, blank=True)


class UsernameSignInRateBucket(models.Model):
    """Rolling HMACed sign-in limiter state; never contains raw identifiers."""

    scope = models.CharField(max_length=16, choices=[("ip", "ip"), ("username", "username")])
    key_hash = models.CharField(max_length=64)
    attempt_times = models.JSONField(default=list)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["scope", "key_hash"], name="one_username_rate_limit_bucket"
            )
        ]
        indexes = [models.Index(fields=["updated_at"], name="username_rate_limit_expiry")]


class Child(Entity):
    name = models.CharField(max_length=160)
    date_of_birth = models.DateField()
    language = models.CharField(
        max_length=2, default="en", choices=[("en", "English"), ("ml", "Malayalam")]
    )
    transition_status = models.CharField(max_length=30, default="guardian_managed")
    adult_subject = models.ForeignKey(
        Account, on_delete=models.PROTECT, related_name="adult_records", null=True, blank=True
    )


class Guardianship(Entity):
    child = models.ForeignKey(Child, on_delete=models.PROTECT)
    user = models.ForeignKey(Account, on_delete=models.PROTECT, null=True, blank=True)
    email = models.EmailField()
    relationship = models.CharField(max_length=50, default="parent")
    can_share = models.BooleanField(default=False)
    scopes = models.JSONField(default=list)
    status = models.CharField(max_length=20, default="invited")
    invited_by = models.ForeignKey(Account, on_delete=models.PROTECT, related_name="+", null=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["child", "email"], name="one_guardian_invitation")
        ]
        indexes = [models.Index(fields=["user", "status"], name="guardianship_user_status")]


class Grant(Entity):
    child = models.ForeignKey(Child, on_delete=models.PROTECT)
    recipient = models.ForeignKey(Account, on_delete=models.PROTECT, related_name="grants")
    grantor = models.ForeignKey(Account, on_delete=models.PROTECT, related_name="+")
    scopes = models.JSONField(default=list)
    purpose = models.CharField(max_length=200)
    expires_at = models.DateTimeField()
    revoked_at = models.DateTimeField(null=True, blank=True)
    consent_version = models.CharField(max_length=50, default="2026-09-v1")

    class Meta:
        indexes = [
            models.Index(
                fields=["recipient", "revoked_at", "expires_at"], name="grant_recipient_live"
            ),
            models.Index(fields=["child", "revoked_at"], name="grant_child_live"),
        ]


class ChildEntity(Entity):
    child = models.ForeignKey(Child, on_delete=models.PROTECT)
    author = models.ForeignKey(Account, on_delete=models.PROTECT)

    class Meta:
        abstract = True
        # Every child-scoped list filters on child and orders by newest first.
        indexes = [models.Index(fields=["child", "-created_at"], name="%(class)s_child_recent")]


class Record(ChildEntity):
    kind = models.CharField(
        max_length=20, choices=[(v, v) for v in ["note", "report", "prescription", "assessment"]]
    )
    title = models.CharField(max_length=240)
    body = models.TextField(max_length=30000)
    status = models.CharField(max_length=20, default="draft")
    signed_at = models.DateTimeField(null=True, blank=True)
    amendment_of = models.ForeignKey("self", on_delete=models.PROTECT, null=True, blank=True)
    amendment_reason = models.TextField(blank=True)


class Attachment(ChildEntity):
    filename = models.CharField(max_length=255)
    object_key = models.CharField(max_length=255, unique=True)
    content_type = models.CharField(max_length=100)
    size = models.PositiveIntegerField()
    sha256 = models.CharField(max_length=64)
    scan_status = models.CharField(max_length=30, default="quarantined")
    scan_detail = models.CharField(max_length=240, blank=True)


class Audit(Entity):
    actor = models.ForeignKey(Account, on_delete=models.PROTECT, null=True)
    child = models.ForeignKey(Child, on_delete=models.PROTECT, null=True)
    action = models.CharField(max_length=100)
    object_id = models.CharField(max_length=100, blank=True)
    purpose = models.CharField(max_length=200, blank=True)

    class Meta:
        indexes = [models.Index(fields=["child", "-created_at"], name="audit_child_recent")]


class PrivacyRequest(Entity):
    user = models.ForeignKey(Account, on_delete=models.PROTECT)
    kind = models.CharField(
        max_length=30,
        choices=[
            (v, v) for v in ["deletion", "correction", "export", "complaint", "adult_transition"]
        ],
    )
    detail = models.TextField(max_length=5000)
    status = models.CharField(max_length=30, default="open")
    response = models.TextField(blank=True)
    child = models.ForeignKey(Child, on_delete=models.PROTECT, null=True, blank=True)
    subject = models.ForeignKey(
        Account,
        on_delete=models.PROTECT,
        related_name="subject_privacy_requests",
        null=True,
        blank=True,
    )
    reviewed_by = models.ForeignKey(
        Account, on_delete=models.PROTECT, related_name="+", null=True, blank=True
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    evidence_reference = models.CharField(max_length=240, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    retention_review = models.JSONField(default=dict)
    execution_receipt = models.JSONField(default=dict)


class Observation(ChildEntity):
    domain = models.CharField(max_length=80)
    title = models.CharField(max_length=240)
    status = models.CharField(
        max_length=20, choices=[(v, v) for v in ["observed", "not_yet", "unsure", "lost"]]
    )
    note = models.TextField(blank=True, max_length=5000)
    observed_on = models.DateField()


class ParentQuestionnaireResponse(ChildEntity):
    """A parent-only reflection; it is not a clinical screening or diagnosis."""

    questionnaire_id = models.CharField(max_length=80)
    questionnaire_version = models.CharField(max_length=20)
    answers = models.JSONField(default=dict)

    class Meta:
        indexes = [
            models.Index(fields=["child", "-created_at"], name="parent_questionnaire_recent")
        ]


class MilestoneCheckIn(ChildEntity):
    """An immutable age-specific parent observation snapshot, never a diagnosis."""

    catalog_version = models.CharField(max_length=20)
    band_months = models.PositiveSmallIntegerField()
    age_months = models.PositiveSmallIntegerField()
    answers = models.JSONField(default=dict)
    parent_concern = models.BooleanField()
    skill_loss = models.BooleanField()
    summary = models.JSONField(default=dict)
    ai_explanation = models.JSONField(default=dict)

    class Meta:
        indexes = [models.Index(fields=["child", "-created_at"], name="milestone_checkin_recent")]


class Goal(ChildEntity):
    title = models.CharField(max_length=240)
    description = models.TextField(blank=True, max_length=5000)
    target_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20, default="active", choices=[(v, v) for v in ["active", "achieved", "paused"]]
    )
    achieved_at = models.DateTimeField(null=True, blank=True)


class Growth(ChildEntity):
    measured_on = models.DateField()
    weight_kg = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.1")), MaxValueValidator(400)],
    )
    height_cm = models.DecimalField(
        max_digits=6, decimal_places=2, validators=[MinValueValidator(10), MaxValueValidator(250)]
    )


class Vaccination(ChildEntity):
    name = models.CharField(max_length=160)
    administered_on = models.DateField(null=True, blank=True)
    due_on = models.DateField(null=True, blank=True)
    note = models.TextField(blank=True, max_length=5000)


class Practitioner(Entity):
    user = models.OneToOneField(Account, on_delete=models.PROTECT)
    specialty = models.CharField(max_length=160)
    profession = models.CharField(
        max_length=30, choices=[(v, v) for v in ["doctor", "therapist", "mentor"]]
    )
    languages = models.JSONField(default=list)
    fee_minor = models.PositiveIntegerField(default=0)
    verified = models.BooleanField(default=False)
    status = models.CharField(max_length=30, default="pending")
    bio = models.TextField(blank=True, max_length=10000)
    registration_number = models.CharField(max_length=160, blank=True)
    verification_reason = models.TextField(blank=True)
    route_account_id = models.CharField(max_length=100, blank=True)


class ProviderApplication(Entity):
    user = models.ForeignKey(Account, on_delete=models.PROTECT)
    display_name = models.CharField(max_length=160)
    specialty = models.CharField(max_length=160)
    profession = models.CharField(
        max_length=30, choices=[(v, v) for v in ["doctor", "therapist", "mentor"]]
    )
    languages = models.JSONField(default=list)
    fee_minor = models.PositiveIntegerField()
    bio = models.TextField(blank=True, max_length=10000)
    registration_number = models.CharField(max_length=160)
    status = models.CharField(max_length=30, default="pending")
    review_reason = models.TextField(blank=True)


class Slot(Entity):
    consultation_mode = models.CharField(
        max_length=20, default="online", choices=[("online", "Online"), ("in_person", "In person")]
    )
    clinic_address = models.CharField(max_length=500, blank=True)
    practitioner = models.ForeignKey(Practitioner, on_delete=models.PROTECT)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=Q(ends_at__gt=models.F("starts_at")), name="slot_positive_duration"
            ),
            models.CheckConstraint(
                condition=(
                    Q(consultation_mode="online", clinic_address="")
                    | (Q(consultation_mode="in_person") & ~Q(clinic_address=""))
                ),
                name="slot_consultation_location",
            ),
            models.UniqueConstraint(
                fields=["practitioner", "starts_at"], name="unique_practitioner_start"
            ),
        ]
        indexes = [
            models.Index(
                fields=["practitioner", "starts_at", "ends_at"], name="slot_practitioner_window"
            )
        ]


class Appointment(Entity):
    child = models.ForeignKey(Child, on_delete=models.PROTECT)
    booker = models.ForeignKey(Account, on_delete=models.PROTECT)
    practitioner = models.ForeignKey(Practitioner, on_delete=models.PROTECT)
    slot = models.ForeignKey(Slot, on_delete=models.PROTECT)
    status = models.CharField(max_length=30, default="awaiting_payment")
    amount_minor = models.PositiveIntegerField()
    hold_expires_at = models.DateTimeField()
    cancellation_reason = models.TextField(blank=True)
    policy_snapshot = models.JSONField(default=dict, editable=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["slot"],
                condition=Q(
                    status__in=[
                        "awaiting_payment",
                        "confirmed",
                        "in_progress",
                        "completed",
                        "no_show",
                    ]
                ),
                name="one_active_slot_reservation",
            )
        ]
        indexes = [
            models.Index(fields=["status", "hold_expires_at"], name="appointment_hold_sweep"),
            models.Index(fields=["slot", "status"], name="appointment_slot_status"),
        ]


class Payment(Entity):
    appointment = models.OneToOneField(Appointment, on_delete=models.PROTECT)
    amount_minor = models.PositiveIntegerField()
    status = models.CharField(max_length=40, default="created")
    provider_order_id = models.CharField(max_length=100, unique=True, null=True)
    provider_payment_id = models.CharField(max_length=100, unique=True, null=True)
    refunded_minor = models.PositiveIntegerField(default=0)
    transfer_id = models.CharField(max_length=100, blank=True)
    demo = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=Q(refunded_minor__lte=models.F("amount_minor")),
                name="refund_within_capture",
            )
        ]


class PaymentEvent(Entity):
    provider_event_id = models.CharField(max_length=255, unique=True)
    kind = models.CharField(max_length=100)
    payment = models.ForeignKey(Payment, on_delete=models.PROTECT, null=True)
    status = models.CharField(max_length=30, default="received")
    detail = models.CharField(max_length=240, blank=True)


class LedgerEntry(Entity):
    payment = models.ForeignKey(Payment, on_delete=models.PROTECT)
    reference = models.CharField(max_length=255, unique=True)
    debit = models.CharField(max_length=80)
    credit = models.CharField(max_length=80)
    amount_minor = models.PositiveIntegerField()


class Refund(Entity):
    payment = models.ForeignKey(Payment, on_delete=models.PROTECT)
    request_key = models.CharField(max_length=160, unique=True)
    provider_refund_id = models.CharField(max_length=100, null=True, unique=True)
    amount_minor = models.PositiveIntegerField()
    status = models.CharField(max_length=30, default="requested")


class TherapySession(ChildEntity):
    practitioner = models.ForeignKey(Practitioner, on_delete=models.PROTECT)
    scheduled_at = models.DateTimeField()
    note = models.TextField(blank=True, max_length=10000)
    status = models.CharField(
        max_length=30,
        default="scheduled",
        choices=[(v, v) for v in ["scheduled", "completed", "cancelled"]],
    )


class Referral(ChildEntity):
    reason = models.TextField(max_length=5000)
    destination = models.CharField(max_length=240)
    status = models.CharField(max_length=20, default="open")


class Message(ChildEntity):
    recipient = models.ForeignKey(
        Account, on_delete=models.PROTECT, related_name="received_messages"
    )
    body = models.TextField(max_length=5000)


class Notification(Entity):
    user = models.ForeignKey(Account, on_delete=models.PROTECT)
    title = models.CharField(max_length=200)
    body = models.CharField(max_length=500)
    kind = models.CharField(max_length=50)
    reference = models.CharField(max_length=255, unique=True)
    read_at = models.DateTimeField(null=True, blank=True)
    email_status = models.CharField(max_length=30, default="pending")
    push_status = models.CharField(max_length=30, default="pending")

    class Meta:
        indexes = [models.Index(fields=["user", "-created_at"], name="notification_user_recent")]


class Content(Entity):
    title = models.CharField(max_length=240)
    summary = models.TextField(max_length=20000)
    language = models.CharField(max_length=2, choices=[("en", "English"), ("ml", "Malayalam")])
    kind = models.CharField(max_length=20, choices=[("article", "Article"), ("video", "Video")])
    url = models.URLField(blank=True)
    source_url = models.URLField()
    review_status = models.CharField(max_length=30, default="pending")
    reviewed_at = models.DateTimeField(null=True)
    available = models.BooleanField(default=True)


class Resource(Entity):
    name = models.CharField(max_length=240)
    kind = models.CharField(max_length=40)
    location = models.CharField(max_length=240)
    summary = models.TextField(max_length=10000)
    url = models.URLField()
    verified_at = models.DateField(null=True)
    review_status = models.CharField(max_length=30, default="pending")


class Screening(ChildEntity):
    instrument_id = models.CharField(max_length=160)
    status = models.CharField(max_length=40, default="created")
    answers = models.JSONField(default=dict)
    result = models.JSONField(default=dict)
    review_note = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(Account, on_delete=models.PROTECT, related_name="+", null=True)
    reviewed_at = models.DateTimeField(null=True)


class Outbox(Entity):
    kind = models.CharField(max_length=100)
    aggregate_id = models.CharField(max_length=100)
    # A stable key prevents recurring schedulers from creating duplicate sends.
    # NULL events remain independent one-off domain events.
    dedupe_key = models.CharField(max_length=180, unique=True, null=True, blank=True)
    actor_id = models.UUIDField(null=True)
    child_id = models.UUIDField(null=True)
    payload = models.JSONField(default=dict)
    status = models.CharField(max_length=30, default="pending")
    attempts = models.PositiveIntegerField(default=0)
    available_at = models.DateTimeField()
    # Held by the worker that claimed this row, so external sends run outside a database lock.
    lease_until = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True)
    error = models.CharField(max_length=240, blank=True)

    class Meta:
        indexes = [models.Index(fields=["status", "available_at"], name="outbox_dispatch_queue")]


class SchedulerHeartbeat(models.Model):
    """One row per hosted scheduler job; it contains no patient data."""

    name = models.CharField(max_length=40, primary_key=True)
    lease_until = models.DateTimeField(null=True, blank=True)
    last_started_at = models.DateTimeField(null=True, blank=True)
    last_success_at = models.DateTimeField(null=True, blank=True)
    last_error = models.CharField(max_length=100, blank=True)


class IdempotencyReceipt(Entity):
    user = models.ForeignKey(Account, on_delete=models.PROTECT)
    key = models.CharField(max_length=160)
    endpoint = models.CharField(max_length=100)
    body_hash = models.CharField(max_length=64)
    response = models.JSONField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "key", "endpoint"], name="one_idempotent_response"
            )
        ]
