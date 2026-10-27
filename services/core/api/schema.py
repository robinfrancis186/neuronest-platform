"""Public API contracts; imported after views to keep annotations out of request logic."""

from rest_framework import serializers as f
from drf_spectacular.extensions import OpenApiAuthenticationExtension
from drf_spectacular.utils import (
    OpenApiParameter,
    OpenApiResponse,
    OpenApiTypes,
    extend_schema,
    extend_schema_field,
    extend_schema_view,
    inline_serializer,
)
from . import serializers as s


class BearerScheme(OpenApiAuthenticationExtension):
    target_class = "api.auth.BearerAuthentication"
    name = "BearerAuth"

    def get_security_definition(self, auto_schema):
        return {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Configured Firebase or Supabase access JWT.",
        }


def obj(schema_name, **fields):
    return inline_serializer(schema_name, fields)


Error = obj("ApiError", detail=f.CharField())
ERRORS = {code: Error for code in [400, 401, 403, 404, 409, 429, 503]}
IdentityLinkReviewRequiredError = obj(
    "FirebaseIdentityLinkReviewRequired",
    code=f.CharField(default="firebase_identity_link_review_required"),
    detail=f.CharField(),
)
IdentityLinkResult = obj("FirebaseIdentityLinked", linked=f.BooleanField())
Language = lambda **kw: f.ChoiceField(choices=["en", "ml"], **kw)
Status = obj("ProviderOperation", id=f.CharField(), status=f.CharField())
Checkout = obj(
    "PaymentCheckout",
    key=f.CharField(allow_blank=True),
    order_id=f.CharField(allow_null=True),
    amount=f.IntegerField(min_value=1),
    currency=f.ChoiceField(choices=["INR"]),
    name=f.CharField(),
    description=f.CharField(),
    ready=f.BooleanField(),
    verification=f.CharField(),
)
PreferenceResult = obj(
    "Preferences", language=Language(), email=f.BooleanField(), push=f.BooleanField()
)
PreferenceInput = obj(
    "PreferenceUpdate",
    language=Language(required=False),
    email=f.BooleanField(required=False),
    push=f.BooleanField(required=False),
    push_token=f.CharField(max_length=255, allow_blank=True, required=False),
)
Review = obj("ContentReview", status=f.ChoiceField(choices=["approved", "rejected"]))
Citation = obj(
    "AssistantCitation",
    id=f.CharField(),
    title=f.CharField(),
    url=f.URLField(),
    version=f.CharField(required=False),
    review_status=f.CharField(required=False),
)


class AssistantTriage(f.Serializer):
    level = f.ChoiceField(choices=["routine", "clinician"])
    signals = f.ListField(child=f.CharField())
    clinical_review_required = f.BooleanField()


class AssistantCareSummary(f.Serializer):
    schema_version = f.CharField()
    status = f.CharField()
    triage = AssistantTriage()
    data_categories = f.DictField(child=f.IntegerField(min_value=0))
    notice = f.CharField()


AssistantResult = obj(
    "AssistantReply",
    answer=f.CharField(),
    language=Language(),
    citations=f.ListField(child=Citation),
    escalation=f.CharField(),
    status=f.CharField(),
    request_id=f.CharField(allow_null=True),
    model=f.CharField(required=False),
    notice=f.CharField(required=False),
    care_summary=AssistantCareSummary(required=False),
    actions=f.ListField(child=f.CharField(), required=False),
)
Question = obj(
    "ScreeningQuestion",
    id=f.CharField(),
    text=f.CharField(),
    options=f.ListField(
        child=obj("ScreeningAnswerOption", value=f.CharField(), label=f.CharField())
    ),
)
Instrument = obj(
    "ScreeningInstrument",
    id=f.CharField(),
    name=f.CharField(),
    enabled=f.BooleanField(),
    synthetic=f.BooleanField(),
    license_status=f.CharField(),
    min_age_months=f.IntegerField(),
    max_age_months=f.IntegerField(),
    questions=f.ListField(child=Question),
    version=f.CharField(required=False),
    languages=f.ListField(child=Language(), required=False),
    notice=f.CharField(required=False),
    source_url=f.URLField(required=False),
)
RefundResult = obj(
    "RefundResult",
    refund=obj(
        "RefundSummary", id=f.UUIDField(), status=f.CharField(), amount_minor=f.IntegerField()
    ),
    payment=s.PaymentSerializer(),
)
Reconciliation = obj(
    "PaymentReconciliation",
    status=f.CharField(),
    refunded_minor=f.IntegerField(required=False),
    detail=f.CharField(required=False),
)
VideoJoin = obj(
    "ConsultationRoom",
    url=f.CharField(),
    token=f.CharField(),
    room=f.CharField(),
    expires_in=f.IntegerField(),
    recording=f.BooleanField(),
)
Capabilities = obj(
    "ReadinessCapability",
    ready=f.BooleanField(),
    mode=f.CharField(required=False),
    reason=f.CharField(required=False),
    patient_context_enabled=f.BooleanField(required=False),
    policy_ready=f.BooleanField(required=False),
)
Readiness = obj(
    "ServiceReadiness",
    capabilities=f.DictField(child=Capabilities),
)
ExportResult = obj(
    "ChildRecordExport",
    child=s.ChildSerializer(),
    generated_at=f.DateTimeField(),
    records=s.RecordSerializer(many=True),
    observations=s.ObservationSerializer(many=True, required=False),
)


def operation(response, request=None, *, code=200, errors=None, **kwargs):
    errors = ERRORS if errors is None else errors
    return extend_schema(request=request, responses={code: response, **errors}, **kwargs)


def annotate_api(namespace):
    """Call annotate_api(globals()) once at the end of api.views."""
    extend_schema_field(OpenApiTypes.BOOL)(s.SlotSerializer.get_available)
    extend_schema_field(Checkout)(s.PaymentSerializer.get_checkout)

    functions = {
        "scheduler_dispatch": extend_schema(exclude=True),
        "health": operation(
            obj("Health", status=f.CharField(), service=f.CharField(), environment=f.CharField()),
            auth=[],
            tags=["Operations"],
        ),
        "readiness": operation(
            Readiness,
            auth=[],
            tags=["Operations"],
            description="Configuration readiness, not evidence of clinical approval or successful provider connectivity.",
        ),
        "username_sign_in": operation(
            obj("UsernameSession", custom_token=f.CharField()),
            obj(
                "UsernameSignIn",
                username=f.CharField(max_length=30),
                password=f.CharField(max_length=4096, write_only=True),
            ),
            auth=[],
            tags=["Identity"],
            description="Durably rate-limited parent-only username-to-Firebase-custom-token exchange. A capped attempt returns the same generic credential failure, and the stored email address is never returned.",
        ),
        "username_claim": operation(
            s.CurrentAccountSerializer,
            obj(
                "UsernameClaim",
                username=f.CharField(max_length=30),
                full_name=f.CharField(max_length=160),
            ),
            tags=["Identity"],
            description="Finish username-first setup after verified email access. The account owner chooses the password in Firebase only after verification.",
        ),
        "firebase_identity_link": operation(
            IdentityLinkResult,
            obj("FirebaseIdentityLink", confirm=f.BooleanField()),
            auth=[{"BearerAuth": []}],
            tags=["Identity"],
            description="Legacy account attachment is not self-service. A matching Firebase identity receives firebase_identity_link_review_required and support must complete an independent identity review before an operator records any mapping.",
            errors={**ERRORS, 409: IdentityLinkReviewRequiredError},
        ),
        "me": operation(
            s.CurrentAccountSerializer,
            tags=["Identity"],
            errors={**ERRORS, 409: IdentityLinkReviewRequiredError},
        ),
        "assistant": operation(
            AssistantResult,
            obj(
                "AssistantInput",
                message=f.CharField(max_length=4000),
                language=Language(default="en"),
                child=f.UUIDField(required=False),
                include_records=f.BooleanField(default=False),
                app_help=f.BooleanField(default=False),
            ),
            tags=["Assistant"],
            description="Explicit include_records requires a child, fresh records authorization, and enabled patient AI processing. The optional care_summary contains only category counts and deterministic review signals; it is not a diagnosis or signed clinical summary. Education and reviewed sources are distinct from diagnosis.",
        ),
        "exports": operation(
            ExportResult,
            obj("ChildExportInput", child=f.UUIDField()),
            tags=["Records"],
            description="Synchronous authorized JSON export. Records and export scopes are required; observations are included only with their separate scope.",
        ),
        "razorpay_webhook": operation(
            obj("WebhookAcknowledgement", received=f.BooleanField(), status=f.CharField()),
            obj(
                "RazorpayEvent",
                event=f.CharField(max_length=100),
                payload=f.DictField(child=f.JSONField()),
            ),
            auth=[],
            tags=["Payments"],
            parameters=[
                OpenApiParameter(
                    "X-Razorpay-Signature",
                    OpenApiTypes.STR,
                    OpenApiParameter.HEADER,
                    required=True,
                    description="Hex HMAC-SHA256 of the exact raw body with the webhook secret.",
                ),
                OpenApiParameter(
                    "X-Razorpay-Event-Id",
                    OpenApiTypes.STR,
                    OpenApiParameter.HEADER,
                    required=True,
                    description="Stable provider event identifier; maximum 255 characters.",
                ),
            ],
        ),
    }
    for name, decorator in functions.items():
        namespace[name] = decorator(namespace[name])
    namespace["preferences"] = operation(PreferenceResult, methods=["GET"], tags=["Identity"])(
        namespace["preferences"]
    )
    namespace["preferences"] = operation(
        PreferenceResult, PreferenceInput, methods=["PATCH"], tags=["Identity"]
    )(namespace["preferences"])

    child = OpenApiParameter(
        "child",
        OpenApiTypes.UUID,
        OpenApiParameter.QUERY,
        description="Filter to one child. Current scope authorization is always rechecked.",
    )
    language = OpenApiParameter(
        "language", OpenApiTypes.STR, OpenApiParameter.QUERY, enum=["en", "ml"]
    )
    idempotency = OpenApiParameter(
        "Idempotency-Key",
        OpenApiTypes.STR,
        OpenApiParameter.HEADER,
        description="Stable retry identifier; maximum 160 characters. Reusing it with different data is rejected.",
    )
    # Annotate inherited list methods on each class in isolation; DRF has no global child filter.
    child_classes = [
        "RecordViewSet",
        "AttachmentViewSet",
        "ObservationViewSet",
        "ParentQuestionnaireViewSet",
        "GoalViewSet",
        "GrowthViewSet",
        "VaccinationViewSet",
        "TherapySessionViewSet",
        "ReferralViewSet",
        "MessageViewSet",
        "ScreeningViewSet",
        "GrantViewSet",
        "AppointmentViewSet",
        "PaymentViewSet",
        "GuardianshipViewSet",
        "AuditViewSet",
    ]
    for name in child_classes:
        namespace[name] = extend_schema_view(list=extend_schema(parameters=[child]))(
            namespace[name]
        )

    actions = {
        "MessageViewSet": {
            "recipients": operation(s.AccountSerializer(many=True), parameters=[child])
        },
        "GuardianshipViewSet": {
            "accept": operation(s.GuardianshipSerializer),
            "revoke": operation(s.GuardianshipSerializer),
        },
        "GrantViewSet": {"revoke": operation(s.GrantSerializer)},
        "RecordViewSet": {
            "sign": operation(s.RecordSerializer),
            "amend": operation(
                s.RecordSerializer,
                obj(
                    "RecordAmendment",
                    body=f.CharField(max_length=30000),
                    reason=f.CharField(max_length=5000),
                ),
                code=201,
            ),
        },
        "ObservationViewSet": {
            "create": extend_schema(
                request=s.ObservationSerializer,
                responses={200: s.ObservationSerializer, 201: s.ObservationSerializer, **ERRORS},
                parameters=[idempotency],
            )
        },
        "ParentQuestionnaireViewSet": {
            "create": operation(
                s.ParentQuestionnaireResponseSerializer,
                s.ParentQuestionnaireResponseSerializer,
                code=201,
                description="Store a completed parent reflection. It does not call a diagnostic engine, create a score or result, enter the clinical record, or become assistant context or export data.",
            )
        },
        "AttachmentViewSet": {
            "create": operation(
                s.AttachmentSerializer,
                {
                    "multipart/form-data": obj(
                        "AttachmentUpload", child=f.UUIDField(), file=f.FileField()
                    )
                },
                code=201,
            ),
            "content": extend_schema(
                request=None,
                responses={
                    (200, "application/octet-stream"): OpenApiResponse(
                        OpenApiTypes.BINARY,
                        description="Private accepted attachment bytes, preserving the uploaded content type and attachment filename.",
                    ),
                    **ERRORS,
                },
            ),
        },
        "PractitionerViewSet": {
            "list": extend_schema(
                parameters=[
                    OpenApiParameter("specialty", OpenApiTypes.STR, OpenApiParameter.QUERY),
                    OpenApiParameter(
                        "profession",
                        OpenApiTypes.STR,
                        OpenApiParameter.QUERY,
                        enum=["doctor", "therapist", "mentor"],
                    ),
                ]
            )
        },
        "ProviderApplicationViewSet": {
            "review": operation(
                s.ProviderApplicationSerializer,
                obj(
                    "ProviderReview",
                    status=f.ChoiceField(choices=["approved", "rejected", "suspended"]),
                    reason=f.CharField(max_length=5000),
                ),
            ),
            "payout_onboarding": operation(
                Status,
                obj(
                    "PayoutOnboarding",
                    email=f.EmailField(required=False),
                    phone=f.CharField(required=False),
                    legal_business_name=f.CharField(required=False),
                    business_type=f.CharField(required=False),
                    profile=f.DictField(child=f.JSONField(), required=False),
                    provider_account_id=f.CharField(required=False),
                ),
                description="Create a linked Route account in sandbox. KYC and product activation remain provider-reviewed steps.",
            ),
        },
        "SlotViewSet": {
            "list": extend_schema(
                parameters=[
                    OpenApiParameter("practitioner", OpenApiTypes.UUID, OpenApiParameter.QUERY)
                ]
            ),
            "create": operation(
                s.SlotSerializer,
                obj(
                    "SlotInput",
                    starts_at=f.DateTimeField(),
                    ends_at=f.DateTimeField(),
                    consultation_mode=f.ChoiceField(
                        choices=["online", "in_person"], default="online"
                    ),
                    clinic_address=f.CharField(max_length=500, required=False, allow_blank=True),
                ),
                code=201,
            ),
        },
        "AppointmentViewSet": {
            "create": extend_schema(
                request=obj("AppointmentInput", child=f.UUIDField(), slot=f.UUIDField()),
                responses={200: s.AppointmentSerializer, 201: s.AppointmentSerializer, **ERRORS},
                parameters=[idempotency],
            ),
            "cancel": operation(
                s.AppointmentSerializer,
                obj(
                    "AppointmentCancellation",
                    reason=f.CharField(max_length=2000, allow_blank=True, required=False),
                ),
            ),
            "reschedule": operation(
                s.AppointmentSerializer, obj("AppointmentReschedule", slot=f.UUIDField())
            ),
            "complete": operation(s.AppointmentSerializer),
            "no_show": operation(s.AppointmentSerializer),
            "join": operation(
                VideoJoin,
                description="Issue short-lived credentials for an authorized consultation participant; recording is disabled.",
            ),
        },
        "PaymentViewSet": {
            "create": operation(
                s.PaymentSerializer, obj("PaymentInput", appointment=f.UUIDField()), code=201
            ),
            "refund": operation(
                RefundResult,
                parameters=[idempotency],
                description="Refund the remaining captured balance after cancellation. Repeated request keys return the same refund.",
            ),
            "reconcile": operation(
                Reconciliation,
                description="Operations-only reconciliation with provider order, capture, and refund evidence.",
            ),
            "transfer": operation(
                Status,
                description="Operations-only payout submission after a completed, captured consultation.",
            ),
        },
        "NotificationViewSet": {"read": operation(s.NotificationSerializer)},
        "ContentViewSet": {
            "list": extend_schema(parameters=[language]),
            "review": operation(s.ContentSerializer, Review),
        },
        "ResourceViewSet": {"review": operation(s.ResourceSerializer, Review)},
        "ScreeningViewSet": {
            "instruments": operation(Instrument.__class__(many=True), parameters=[language]),
            "submit": operation(
                s.ScreeningSerializer,
                obj(
                    "ScreeningSubmission", answers=f.DictField(child=f.JSONField(), required=False)
                ),
                description="Submit answers to the current screening stage. Response status distinguishes incomplete, follow-up required, completed, and ineligible.",
            ),
            "review": operation(
                s.ScreeningSerializer, obj("ScreeningReview", note=f.CharField(max_length=10000))
            ),
        },
        "PrivacyRequestViewSet": {
            "review": operation(
                s.PrivacyRequestSerializer,
                obj(
                    "PrivacyReview",
                    evidence_reference=f.CharField(min_length=8, max_length=240),
                    subject=f.UUIDField(required=False),
                    child=f.UUIDField(required=False),
                    retention_holds=f.ListField(child=f.CharField(max_length=240), required=False),
                ),
            ),
            "accept": operation(
                s.PrivacyRequestSerializer, obj("AdultTransferAcceptance", accept=f.BooleanField())
            ),
            "execute": operation(s.PrivacyRequestSerializer),
            "restore": operation(
                s.PrivacyRequestSerializer,
                obj(
                    "PrivacyRestoration",
                    evidence_reference=f.CharField(min_length=8, max_length=240),
                ),
            ),
            "revoke_transition": operation(
                s.PrivacyRequestSerializer,
                obj(
                    "AdultTransferRevocation",
                    evidence_reference=f.CharField(min_length=8, max_length=240),
                ),
            ),
            "resolve": operation(
                s.PrivacyRequestSerializer,
                obj(
                    "PrivacyResolution",
                    response=f.CharField(max_length=10000),
                    status=f.ChoiceField(
                        choices=["in_review", "resolved", "rejected"], default="resolved"
                    ),
                ),
            ),
        },
    }
    for name, decorators in actions.items():
        namespace[name] = extend_schema_view(**decorators)(namespace[name])
