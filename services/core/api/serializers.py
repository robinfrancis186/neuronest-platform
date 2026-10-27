from django.utils import timezone
from rest_framework import serializers
from . import models as m


# `motor` was accepted by early clients. Keep it readable/writable so a family
# can still correct an older entry, but new clients use the clearer `movement`.
OBSERVATION_DOMAINS = [
    "communication",
    "social",
    "movement",
    "daily_living",
    "sensory",
    "emotional_regulation",
    "sleep",
    "eating",
    "other",
    "motor",
]
OBSERVATION_STATUSES = ["observed", "not_yet", "unsure", "lost"]
PARENT_QUESTIONNAIRE_ID = "developmental-check-in"
PARENT_QUESTIONNAIRE_VERSION = "1"
PARENT_QUESTIONNAIRE_ANSWER_IDS = {
    "communication",
    "connection",
    "play",
    "sensory",
    "coordination",
    "regulation",
}
PARENT_QUESTIONNAIRE_ANSWER_VALUES = {
    "never",
    "sometimes",
    "often",
    "almost_always",
    "concerned",
}


class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = m.Account
        fields = ["id", "email", "display_name", "role", "language"]


class CurrentAccountSerializer(AccountSerializer):
    """The signed-in account may see its own login username; peers may not."""

    class Meta(AccountSerializer.Meta):
        fields = [*AccountSerializer.Meta.fields, "username"]


class ChildSerializer(serializers.ModelSerializer):
    class Meta:
        model = m.Child
        fields = ["id", "name", "date_of_birth", "language", "transition_status"]
        read_only_fields = ["id", "transition_status"]

    def validate_date_of_birth(self, value):
        today = timezone.localdate()
        age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
        if value > today or age >= 18:
            raise serializers.ValidationError(
                "Child profiles require an age from birth to under 18."
            )
        return value


class GuardianshipSerializer(serializers.ModelSerializer):
    class Meta:
        model = m.Guardianship
        fields = "__all__"
        read_only_fields = ["id", "user", "status", "invited_by", "revoked_at"]

    def validate_scopes(self, value):
        from .access import SCOPES

        if not isinstance(value, list) or any(
            not isinstance(x, str) or x not in SCOPES for x in value
        ):
            raise serializers.ValidationError("Invalid caregiver scope.")
        return list(dict.fromkeys(value))


class GrantSerializer(serializers.ModelSerializer):
    class Meta:
        model = m.Grant
        fields = "__all__"
        read_only_fields = ["id", "grantor", "revoked_at", "consent_version"]

    def validate_scopes(self, value):
        from .access import SCOPES

        if (
            not isinstance(value, list)
            or not value
            or not all(isinstance(v, str) and v in SCOPES for v in value)
        ):
            raise serializers.ValidationError(
                "Choose records, observations, therapy, screening, messages or export scopes."
            )
        return list(dict.fromkeys(value))

    def validate_expires_at(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError("Grant expiry must be in the future.")
        return value


class RecordSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.display_name", read_only=True)

    class Meta:
        model = m.Record
        fields = "__all__"
        read_only_fields = [
            "id",
            "author",
            "status",
            "signed_at",
            "amendment_of",
            "amendment_reason",
        ]


class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = m.Attachment
        exclude = ["object_key"]
        read_only_fields = [
            "id",
            "author",
            "filename",
            "content_type",
            "size",
            "sha256",
            "scan_status",
            "scan_detail",
        ]


class ObservationSerializer(serializers.ModelSerializer):
    domain = serializers.ChoiceField(choices=OBSERVATION_DOMAINS)
    status = serializers.ChoiceField(choices=OBSERVATION_STATUSES)

    class Meta:
        model = m.Observation
        fields = "__all__"
        read_only_fields = ["id", "author"]

    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Describe what you noticed or changed.")
        return value

    def validate_note(self, value):
        return value.strip()

    def validate_observed_on(self, value):
        if value > timezone.localdate():
            raise serializers.ValidationError("Observation date cannot be in the future.")
        return value


class ParentQuestionnaireResponseSerializer(serializers.ModelSerializer):
    """Validate one fixed, non-diagnostic parent reflection questionnaire."""

    answers = serializers.DictField(
        child=serializers.ChoiceField(choices=sorted(PARENT_QUESTIONNAIRE_ANSWER_VALUES)),
        required=True,
    )

    class Meta:
        model = m.ParentQuestionnaireResponse
        fields = "__all__"
        read_only_fields = ["id", "author", "created_at"]

    def validate_questionnaire_id(self, value):
        if value != PARENT_QUESTIONNAIRE_ID:
            raise serializers.ValidationError("Unknown parent questionnaire.")
        return value

    def validate_questionnaire_version(self, value):
        if value != PARENT_QUESTIONNAIRE_VERSION:
            raise serializers.ValidationError("Unsupported parent questionnaire version.")
        return value

    def validate_answers(self, value):
        if not isinstance(value, dict) or set(value) != PARENT_QUESTIONNAIRE_ANSWER_IDS:
            raise serializers.ValidationError("Answer every section of this parent questionnaire.")
        if any(answer not in PARENT_QUESTIONNAIRE_ANSWER_VALUES for answer in value.values()):
            raise serializers.ValidationError("Choose a valid response for every section.")
        return value


class GoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = m.Goal
        fields = "__all__"
        read_only_fields = ["id", "author", "achieved_at"]


class GrowthSerializer(serializers.ModelSerializer):
    class Meta:
        model = m.Growth
        fields = "__all__"
        read_only_fields = ["id", "author"]

    def validate_measured_on(self, value):
        if value > timezone.localdate():
            raise serializers.ValidationError("Measurement date cannot be in the future.")
        return value


class VaccinationSerializer(serializers.ModelSerializer):
    class Meta:
        model = m.Vaccination
        fields = "__all__"
        read_only_fields = ["id", "author"]


class PractitionerSerializer(serializers.ModelSerializer):
    is_demo = serializers.SerializerMethodField()

    def get_is_demo(self, obj) -> bool:
        from .demo_booking import is_demo_practitioner
        return is_demo_practitioner(obj)

    display_name = serializers.CharField(source="user.display_name", read_only=True)

    class Meta:
        model = m.Practitioner
        exclude = ["registration_number", "verification_reason", "route_account_id"]
        read_only_fields = ["id", "user", "verified", "status"]


class ProviderApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = m.ProviderApplication
        fields = "__all__"
        read_only_fields = ["id", "user", "status", "review_reason"]

    def validate_languages(self, value):
        if not isinstance(value, list) or not value or any(x not in ["en", "ml"] for x in value):
            raise serializers.ValidationError("Supported language codes are en and ml.")
        return value


class SlotSerializer(serializers.ModelSerializer):
    available = serializers.SerializerMethodField()

    def get_available(self, obj):
        if hasattr(obj, "reserved"):
            return obj.starts_at > timezone.now() and not obj.reserved
        return (
            obj.starts_at > timezone.now()
            and not obj.appointment_set.filter(
                status__in=["confirmed", "in_progress", "completed", "no_show"]
            ).exists()
            and not obj.appointment_set.filter(
                status="awaiting_payment", hold_expires_at__gt=timezone.now()
            ).exists()
        )

    class Meta:
        model = m.Slot
        fields = [
            "id",
            "practitioner",
            "starts_at",
            "ends_at",
            "available",
            "consultation_mode",
            "clinic_address",
        ]
        read_only_fields = ["id", "practitioner"]


class AppointmentSerializer(serializers.ModelSerializer):
    is_demo = serializers.SerializerMethodField()

    def get_is_demo(self, obj) -> bool:
        from .demo_booking import is_demo_appointment
        return is_demo_appointment(obj)

    consultation_mode = serializers.CharField(source="slot.consultation_mode", read_only=True)
    clinic_address = serializers.CharField(source="slot.clinic_address", read_only=True)
    provider_name = serializers.CharField(source="practitioner.user.display_name", read_only=True)
    starts_at = serializers.DateTimeField(source="slot.starts_at", read_only=True)
    ends_at = serializers.DateTimeField(source="slot.ends_at", read_only=True)

    class Meta:
        model = m.Appointment
        fields = "__all__"
        # Locked booking logic and the DB enforce uniqueness after idempotent retries.
        validators = []
        read_only_fields = [
            "id",
            "booker",
            "practitioner",
            "status",
            "amount_minor",
            "hold_expires_at",
            "cancellation_reason",
            "policy_snapshot",
        ]


class PaymentSerializer(serializers.ModelSerializer):
    checkout = serializers.SerializerMethodField()

    def get_checkout(self, obj):
        from .finance import payment_payload

        return payment_payload(obj)

    class Meta:
        model = m.Payment
        exclude = ["demo"]
        read_only_fields = [
            "id",
            "status",
            "amount_minor",
            "provider_order_id",
            "provider_payment_id",
            "refunded_minor",
            "transfer_id",
        ]


class TherapySessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = m.TherapySession
        fields = "__all__"
        read_only_fields = ["id", "author"]


class ReferralSerializer(serializers.ModelSerializer):
    class Meta:
        model = m.Referral
        fields = "__all__"
        read_only_fields = ["id", "author"]


class MessageSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.display_name", read_only=True)

    class Meta:
        model = m.Message
        fields = "__all__"
        read_only_fields = ["id", "author"]


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = m.Notification
        exclude = ["user"]
        read_only_fields = ["id", "read_at"]


class ContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = m.Content
        fields = "__all__"
        read_only_fields = ["id", "review_status", "reviewed_at"]

    def validate(self, data):
        from urllib.parse import urlparse

        if data.get("kind") == "video" and urlparse(data.get("url", "")).hostname not in [
            "www.youtube.com",
            "youtube.com",
            "youtu.be",
        ]:
            raise serializers.ValidationError("Videos must use an official YouTube URL.")
        return data


class ResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = m.Resource
        fields = "__all__"
        read_only_fields = ["id", "review_status", "verified_at"]


class ScreeningSerializer(serializers.ModelSerializer):
    class Meta:
        model = m.Screening
        fields = "__all__"
        read_only_fields = [
            "id",
            "author",
            "status",
            "answers",
            "result",
            "review_note",
            "reviewed_by",
            "reviewed_at",
        ]


from .privacy import PrivacyRequestSerializer  # noqa: F401  (re-exported for the API schema)


class AuditSerializer(serializers.ModelSerializer):
    class Meta:
        model = m.Audit
        fields = "__all__"
