import hashlib, hmac, json, secrets
from datetime import timedelta
from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Q, Exists, OuterRef
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets, serializers
from rest_framework.decorators import (
    action,
    api_view,
    permission_classes,
    authentication_classes,
    throttle_classes,
)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied, ValidationError
from . import models as m, serializers as s
from .auth import (
    FirebaseIdentityLinkAuthentication,
    firebase_admin_app,
    normalize_username,
    username_session,
)
from .access import (
    require_child,
    visible_children,
    visible_children_any,
    guardian,
    clinician_active,
    can_access,
    audit,
    emit,
    adult,
    adult_subject,
    record_disclosure_filter,
)
from .errors import Conflict, IdentityLinkReviewRequired, Unavailable
from .engines import engine_call
from .assistant_context import build as assistant_context
from .rate_limit import TrustedClientIpUnavailable, consume_username_sign_in_attempt


def is_admin(user):
    if user.role != "admin":
        raise PermissionDenied("Operations administrator role required.")


def professional(user, roles=("doctor", "therapist")):
    if user.role not in roles or not clinician_active(user):
        raise PermissionDenied("An active verified professional account is required.")


def child_from(data):
    if not data.get("child"):
        raise ValidationError({"child": "This field is required."})
    try:
        return get_object_or_404(m.Child, id=data["child"])
    except (ValueError, TypeError) as exc:
        raise ValidationError({"child": "Invalid child identifier."}) from exc


def paginated(view, queryset):
    """Page a queryset from a viewset that builds its own list response."""
    page = view.paginate_queryset(queryset)
    if page is None:
        return Response(view.get_serializer(queryset, many=True).data)
    return view.get_paginated_response(view.get_serializer(page, many=True).data)


def snapshot(obj, serializer):
    return serializer(obj).data


def require_child_care(child):
    if adult(child):
        raise PermissionDenied(
            "Adult records are a historical archive. New child-care entries are not available."
        )


def username_login_failure():
    raise AuthenticationFailed("We couldn’t sign you in with those details.")


@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
@throttle_classes([])
def username_sign_in(request):
    class Input(serializers.Serializer):
        username = serializers.CharField(max_length=30)
        password = serializers.CharField(max_length=4096, trim_whitespace=False)

    data = Input(data=request.data)
    data.is_valid(raise_exception=True)
    if settings.PRODUCTION:
        # A trusted proxy must be explicitly configured, and the existing
        # scheduler must be healthy enough to purge HMACed rate-limit state.
        from .tasks import scheduler_healthy

        if not settings.TRUST_PROXY_HEADERS or not scheduler_healthy("reminders"):
            username_login_failure()
    try:
        username = normalize_username(data.validated_data["username"])
    except ValueError:
        try:
            consume_username_sign_in_attempt(request, None)
        except TrustedClientIpUnavailable:
            pass
        username_login_failure()
    try:
        permitted = consume_username_sign_in_attempt(request, username)
    except TrustedClientIpUnavailable:
        username_login_failure()
    if not permitted:
        # Use the exact generic credential failure so no account, IP, or username
        # bucket state is exposed to an unauthenticated client.
        username_login_failure()
    account = m.Account.objects.filter(username__iexact=username).first()
    # Make an equivalent provider request for absent or disabled accounts so this
    # endpoint cannot act as a local account-existence oracle.
    eligible = bool(
        account and account.is_active and account.role == "parent" and account.username_claimed
    )
    email = account.email if eligible else "unrecognized@invalid.neuronest"
    expected_subject = account.firebase_subject if eligible else None
    session = username_session(email, data.validated_data["password"], expected_subject)
    # Username/password is a parent-only recovery-friendly flow. Staff use their
    # direct Firebase sign-in so the Firebase MFA claim reaches the API unchanged.
    if not eligible or not session:
        username_login_failure()
    return Response(session)


@api_view(["POST"])
@authentication_classes([FirebaseIdentityLinkAuthentication])
@permission_classes([IsAuthenticated])
def firebase_identity_link(request):
    """Reject self-service legacy attachment until support verifies the claimant."""

    class Input(serializers.Serializer):
        confirm = serializers.BooleanField()

        def validate_confirm(self, value):
            if value is not True:
                raise serializers.ValidationError("Confirm the identity link to continue.")
            return value

    data = Input(data=request.data)
    data.is_valid(raise_exception=True)
    payload = request.auth
    if not isinstance(payload, dict):
        raise AuthenticationFailed("Invalid or expired access token.")
    email, subject = payload.get("email"), payload.get("sub")
    if not isinstance(email, str) or not isinstance(subject, str):
        raise AuthenticationFailed("Invalid or expired access token.")
    account = request.user
    if account.email.casefold() != email.casefold():
        raise AuthenticationFailed("Email address needs an identity-linking review.")
    # Support may have completed a separately reviewed mapping while this client
    # was waiting. The endpoint stays idempotent without ever creating a link.
    if account.firebase_subject == subject:
        return Response({"linked": True})
    raise IdentityLinkReviewRequired()


@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def health(request):
    from django.db import connection

    with connection.cursor() as cur:
        cur.execute("SELECT 1")
    return Response(
        {"status": "ok", "service": "neuronest-core", "environment": settings.ENVIRONMENT}
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def readiness(request):
    from .tasks import scheduler_healthy
    from .policies import policy_readiness

    from .payment_demo import demo_ready
    from .demo_booking import sandbox_ready

    worker_ready = scheduler_healthy()
    policy = policy_readiness()
    policy_ready = policy["production_approved"] if settings.PRODUCTION else policy["configured"]
    sandbox_payments = bool(
        settings.RAZORPAY_KEY_ID.startswith("rzp_test_")
        and settings.RAZORPAY_KEY_SECRET
        and settings.RAZORPAY_WEBHOOK_SECRET
        and worker_ready
        and policy_ready
    )
    assistant_configured = bool(
        settings.SERVICE_TOKEN
        and settings.ASSISTANT_URL
        and (not settings.PRODUCTION or settings.ASSISTANT_URL.startswith("https://"))
    )
    firebase_admin_ready = bool(firebase_admin_app())
    firebase_identity_ready = bool(
        settings.FIREBASE_PROJECT_ID and settings.FIREBASE_ISSUER and settings.FIREBASE_JWKS_URL
    ) and (not settings.PRODUCTION or firebase_admin_ready)
    supabase_identity_ready = bool(
        settings.SUPABASE_URL
        and settings.SUPABASE_ISSUER
        and settings.SUPABASE_JWKS_URL
        and settings.SUPABASE_PUBLISHABLE_KEY
    )
    identity_ready = (
        firebase_identity_ready
        if settings.IDENTITY_PROVIDER == "firebase"
        else supabase_identity_ready
    )
    username_sign_in_ready = (
        bool(settings.FIREBASE_WEB_API_KEY and firebase_admin_ready)
        if settings.IDENTITY_PROVIDER == "firebase"
        else bool(settings.SUPABASE_URL and settings.SUPABASE_PUBLISHABLE_KEY)
    ) and (
        not settings.PRODUCTION or (settings.TRUST_PROXY_HEADERS and scheduler_healthy("reminders"))
    )
    return Response(
        {
            "capabilities": {
                "identity": {
                    "ready": identity_ready,
                    "mode": settings.IDENTITY_PROVIDER if identity_ready else "unavailable",
                    "username_sign_in_ready": username_sign_in_ready,
                },
                "demo_bookings": {
                    "ready": sandbox_ready(),
                    "mode": "sandbox" if sandbox_ready() else "unavailable",
                },
                "payment_demo": {
                    "ready": demo_ready(),
                    "mode": "sandbox" if demo_ready() else "unavailable",
                },
                "payments": {
                    "ready": sandbox_payments,
                    "mode": "sandbox" if sandbox_payments else "unavailable",
                    "policy_ready": policy_ready,
                },
                "video": {
                    "ready": bool(
                        settings.LIVEKIT_URL
                        and settings.LIVEKIT_API_KEY
                        and settings.LIVEKIT_API_SECRET
                        and worker_ready
                    ),
                },
                "background_delivery": {
                    "ready": worker_ready,
                    "mode": "supabase_cron"
                    if settings.OUTBOX_SCHEDULER == "supabase_cron"
                    else "unavailable",
                },
                "malware_scanner": {
                    "ready": bool(settings.CLAMAV_HOST),
                    "mode": "clamav" if settings.CLAMAV_HOST else "quarantine_only",
                },
                "assistant": {
                    "ready": assistant_configured,
                    "patient_context_enabled": settings.PATIENT_AI_ENABLED,
                },
                "diagnostic_prediction": {
                    "ready": False,
                    "reason": "Approved clinical artifact and intended-use validation are required.",
                },
                "clinical_instruments": {
                    "ready": False,
                    "reason": "Instrument content and use rights must be approved.",
                },
            },
        }
    )


@api_view(["GET"])
def me(request):
    return Response(s.CurrentAccountSerializer(request.user).data)


@api_view(["POST"])
def username_claim(request):
    class Input(serializers.Serializer):
        username = serializers.CharField(max_length=30)
        full_name = serializers.CharField(max_length=160)

        def validate_username(self, value):
            try:
                return normalize_username(value)
            except ValueError as exc:
                raise serializers.ValidationError(str(exc)) from exc

        def validate_full_name(self, value):
            name = " ".join(value.split())
            if not name:
                raise serializers.ValidationError("Enter your name.")
            return name

    data = Input(data=request.data)
    data.is_valid(raise_exception=True)
    username = data.validated_data["username"]
    full_name = data.validated_data["full_name"]
    with transaction.atomic():
        account = m.Account.objects.select_for_update().get(pk=request.user.pk)
        if account.username_claimed:
            raise Conflict("This account already has a username.")
        if m.Account.objects.filter(username__iexact=username).exclude(pk=account.pk).exists():
            raise Conflict("That username is unavailable.")
        try:
            account.username = username
            account.display_name = full_name
            account.username_claimed = True
            account.save(update_fields=["username", "display_name", "username_claimed"])
        except IntegrityError as exc:
            raise Conflict("That username is unavailable.") from exc
    return Response(s.CurrentAccountSerializer(account).data)


@api_view(["GET", "PATCH"])
def preferences(request):
    user = request.user
    if request.method == "PATCH":

        class PreferencesSerializer(serializers.Serializer):
            language = serializers.ChoiceField(choices=["en", "ml"], required=False)
            email = serializers.BooleanField(required=False)
            push = serializers.BooleanField(required=False)
            push_token = serializers.CharField(max_length=255, required=False, allow_blank=True)
            display_name = serializers.CharField(max_length=160, required=False)

            def validate_display_name(self, value):
                name = " ".join(value.split())
                if not name:
                    raise serializers.ValidationError("Enter your name.")
                if "@" in name:
                    raise serializers.ValidationError("Enter your name, not an email address.")
                return name

        data = PreferencesSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        for key, value in data.validated_data.items():
            setattr(
                user,
                {"email": "email_notifications", "push": "push_notifications"}.get(key, key),
                value,
            )
        user.save(
            update_fields=[
                "language",
                "email_notifications",
                "push_notifications",
                "push_token",
                "display_name",
            ]
        )
    return Response(
        {
            "language": user.language,
            "email": user.email_notifications,
            "push": user.push_notifications,
            "display_name": user.display_name,
        }
    )


class ChildViewSet(viewsets.ModelViewSet):
    serializer_class = s.ChildSerializer
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return m.Child.objects.none()
        visible = visible_children_any(
            self.request.user, ["records", "observations", "therapy", "screening", "messages"]
        )
        return m.Child.objects.filter(id__in=visible.values_list("id", flat=True)).order_by(
            "created_at"
        )

    @transaction.atomic
    def perform_create(self, serializer):
        if self.request.user.role != "parent":
            raise PermissionDenied("Only a parent account can create a child profile.")
        child = serializer.save()
        m.Guardianship.objects.create(
            child=child,
            user=self.request.user,
            email=self.request.user.email,
            relationship="parent",
            can_share=True,
            status="active",
            invited_by=self.request.user,
        )
        audit(self.request.user, child, "child.created", child)

    def perform_update(self, serializer):
        require_child_care(serializer.instance)
        require_child(self.request.user, serializer.instance, share=True)
        serializer.save()
        audit(self.request.user, serializer.instance, "child.updated", serializer.instance)


class ChildScopedViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "post", "patch", "head", "options"]
    scope = "records"

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        # Audit what this page actually disclosed, not the whole result set.
        rows = response.data["results"] if isinstance(response.data, dict) else response.data
        for child_id in {row["child"] for row in rows}:
            audit(
                request.user,
                m.Child.objects.get(pk=child_id),
                f"{self.serializer_class.Meta.model._meta.model_name}.listed",
            )
        return response

    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()
        audit(request.user, obj.child, f"{obj._meta.model_name}.read", obj)
        return Response(self.get_serializer(obj).data)

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.serializer_class.Meta.model.objects.none()
        qs = self.serializer_class.Meta.model.objects.filter(
            child__in=visible_children(self.request.user, self.scope)
        ).order_by("-created_at")
        if self.request.query_params.get("child"):
            child = child_from(self.request.query_params)
            require_child(self.request.user, child, self.scope)
            qs = qs.filter(child=child)
        return qs

    @transaction.atomic
    def perform_create(self, serializer):
        child = serializer.validated_data["child"]
        require_child(self.request.user, child, self.scope)
        require_child_care(child)
        obj = serializer.save(author=self.request.user)
        audit(self.request.user, child, f"{obj._meta.model_name}.created", obj)

    def perform_update(self, serializer):
        obj = serializer.instance
        require_child_care(obj.child)
        require_child(self.request.user, obj.child, self.scope)
        if serializer.validated_data.get("child", obj.child) != obj.child:
            raise ValidationError("A record cannot move between children.")
        if obj.author_id != self.request.user.id:
            raise PermissionDenied("Only the author may edit this entry.")
        serializer.save()
        audit(self.request.user, obj.child, f"{obj._meta.model_name}.updated", obj)


class GuardianshipViewSet(viewsets.GenericViewSet):
    serializer_class = s.GuardianshipSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return m.Guardianship.objects.none()
        children = m.Child.objects.filter(
            id__in=[
                c.id
                for c in visible_children(self.request.user)
                if guardian(self.request.user, c, share=True)
            ]
        )
        qs = m.Guardianship.objects.filter(
            Q(child__in=children) | Q(email=self.request.user.email)
        ).order_by("-created_at")
        if self.request.query_params.get("child"):
            qs = qs.filter(child_id=self.request.query_params["child"])
        return qs

    def list(self, request):
        return paginated(self, self.get_queryset())

    @transaction.atomic
    def create(self, request):
        data = self.get_serializer(data=request.data)
        data.is_valid(raise_exception=True)
        child = data.validated_data["child"]
        require_child(request.user, child, share=True)
        email = data.validated_data["email"].lower()
        if m.Guardianship.objects.filter(child=child, email=email).exists():
            raise Conflict("An invitation or guardianship already exists for this email.")
        obj = data.save(
            email=email,
            invited_by=request.user,
            status="invited",
            scopes=data.validated_data.get("scopes", ["observations", "therapy", "messages"]),
        )
        emit("guardian.invited", obj, request.user, child)
        audit(request.user, child, "guardian.invited", obj)
        return Response(self.get_serializer(obj).data, status=201)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def accept(self, request, pk=None):
        obj = self.get_object()
        if obj.email != request.user.email or obj.status != "invited":
            raise PermissionDenied("This invitation cannot be accepted by this account.")
        if not guardian(obj.invited_by, obj.child, share=True):
            raise PermissionDenied("Invitation authority is no longer valid.")
        obj.user = request.user
        obj.status = "active"
        obj.save(update_fields=["user", "status"])
        audit(request.user, obj.child, "guardian.accepted", obj)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def revoke(self, request, pk=None):
        obj = self.get_object()
        require_child(request.user, obj.child, share=True)
        m.Child.objects.select_for_update().get(pk=obj.child_id)
        if (
            obj.can_share
            and obj.status == "active"
            and m.Guardianship.objects.filter(
                child=obj.child, can_share=True, status="active"
            ).count()
            <= 1
        ):
            raise Conflict("The last sharing guardian requires a reviewed authority transition.")
        obj.status = "revoked"
        obj.revoked_at = timezone.now()
        obj.save(update_fields=["status", "revoked_at"])
        m.Grant.objects.filter(child=obj.child, grantor=obj.user, revoked_at__isnull=True).update(
            revoked_at=timezone.now()
        )
        audit(request.user, obj.child, "guardian.revoked", obj)
        emit("consent.revoked", obj, request.user, obj.child)
        return Response(self.get_serializer(obj).data)


class GrantViewSet(viewsets.GenericViewSet):
    serializer_class = s.GrantSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return m.Grant.objects.none()
        children = [
            c.id
            for c in visible_children(self.request.user)
            if guardian(self.request.user, c, share=True)
        ]
        qs = m.Grant.objects.filter(
            Q(child_id__in=children) | Q(recipient=self.request.user)
        ).order_by("-created_at")
        if self.request.query_params.get("child"):
            qs = qs.filter(child_id=self.request.query_params["child"])
        return qs

    def list(self, request):
        return paginated(self, self.get_queryset())

    @transaction.atomic
    def create(self, request):
        data = self.get_serializer(data=request.data)
        data.is_valid(raise_exception=True)
        child = data.validated_data["child"]
        require_child(request.user, child, share=True)
        recipient = data.validated_data["recipient"]
        if not clinician_active(recipient):
            raise ValidationError("Choose an active verified practitioner.")
        if recipient.role == "mentor" and data.validated_data["scopes"] != ["messages"]:
            raise ValidationError("Mentors can receive messaging permission only.")
        obj = data.save(grantor=request.user)
        audit(request.user, child, "consent.granted", obj, obj.purpose)
        emit("consent.granted", obj, request.user, child)
        return Response(self.get_serializer(obj).data, status=201)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def revoke(self, request, pk=None):
        obj = self.get_object()
        require_child(request.user, obj.child, share=True)
        obj.revoked_at = timezone.now()
        obj.save(update_fields=["revoked_at"])
        audit(request.user, obj.child, "consent.revoked", obj)
        emit("consent.revoked", obj, request.user, obj.child)
        return Response(self.get_serializer(obj).data)


class RecordViewSet(ChildScopedViewSet):
    serializer_class = s.RecordSerializer

    def get_queryset(self):
        return super().get_queryset().filter(record_disclosure_filter(self.request.user))

    def perform_create(self, serializer):
        professional(self.request.user)
        if serializer.validated_data["kind"] in ["prescription", "assessment"]:
            professional(self.request.user, ("doctor",))
        super().perform_create(serializer)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        self._locked_record = m.Record.objects.select_for_update().get(pk=self.get_object().pk)
        return super().update(request, *args, **kwargs)

    def get_object(self):
        return getattr(self, "_locked_record", None) or super().get_object()

    def perform_update(self, serializer):
        obj = serializer.instance
        if obj.status != "draft" or obj.author_id != self.request.user.id:
            raise PermissionDenied(
                "Only the author may edit an unsigned draft. Signed notes require an amendment."
            )
        if serializer.validated_data.get("kind", obj.kind) in ["prescription", "assessment"]:
            professional(self.request.user, ("doctor",))
        super().perform_update(serializer)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def sign(self, request, pk=None):
        obj = self.get_object()
        require_child(request.user, obj.child, "records")
        professional(request.user)
        obj = m.Record.objects.select_for_update().get(pk=obj.pk)
        if obj.author_id != request.user.id:
            raise PermissionDenied("Only the record author may sign it.")
        if obj.kind in ["prescription", "assessment"]:
            professional(request.user, ("doctor",))
        if obj.status != "draft":
            raise Conflict("The record has already been signed.")
        obj.status = "signed"
        obj.signed_at = timezone.now()
        obj.save(update_fields=["status", "signed_at"])
        audit(request.user, obj.child, "record.signed", obj)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def amend(self, request, pk=None):
        original = self.get_object()
        professional(request.user)
        if original.author_id != request.user.id or original.status != "signed":
            raise PermissionDenied("Only the author may amend a signed record.")
        if original.kind in ["prescription", "assessment"]:
            professional(request.user, ("doctor",))
        body = str(request.data.get("body", "")).strip()
        reason = str(request.data.get("reason", "")).strip()
        if not body or not reason or len(body) > 30000 or len(reason) > 5000:
            raise ValidationError("An amendment body and reason are required within length limits.")
        obj = m.Record.objects.create(
            child=original.child,
            author=request.user,
            kind=original.kind,
            title=original.title,
            body=body,
            status="signed",
            signed_at=timezone.now(),
            amendment_of=original,
            amendment_reason=reason,
        )
        audit(request.user, obj.child, "record.amended", obj)
        return Response(self.get_serializer(obj).data, status=201)


class ObservationViewSet(ChildScopedViewSet):
    serializer_class = s.ObservationSerializer
    scope = "observations"

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        key = request.headers.get("Idempotency-Key", "")
        if not key:
            return super().create(request, *args, **kwargs)
        if len(key) > 160:
            raise ValidationError("Idempotency-Key is too long.")
        child = child_from(request.data)
        require_child(request.user, child, self.scope)
        require_child_care(child)
        m.Account.objects.select_for_update().get(pk=request.user.pk)
        digest = hashlib.sha256(json.dumps(request.data, sort_keys=True).encode()).hexdigest()
        old = m.IdempotencyReceipt.objects.filter(
            user=request.user, key=key, endpoint="observations"
        ).first()
        if old:
            if old.body_hash != digest:
                raise Conflict("Idempotency-Key was used for different data.")
            return Response(old.response, status=200)
        response = super().create(request, *args, **kwargs)
        m.IdempotencyReceipt.objects.create(
            user=request.user,
            key=key,
            endpoint="observations",
            body_hash=digest,
            response=json.loads(json.dumps(response.data, default=str)),
        )
        return response


class ParentQuestionnaireViewSet(viewsets.ModelViewSet):
    """Private parent reflection entries, deliberately separate from screening."""

    serializer_class = s.ParentQuestionnaireResponseSerializer
    http_method_names = ["get", "post", "head", "options"]

    def require_parent_guardian(self, child):
        if self.request.user.role != "parent" or not guardian(self.request.user, child):
            raise PermissionDenied(
                "An active parent guardianship is required for this questionnaire."
            )
        return child

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return m.ParentQuestionnaireResponse.objects.none()
        requested_child = None
        if self.request.query_params.get("child"):
            requested_child = child_from(self.request.query_params)
            self.require_parent_guardian(requested_child)
        if self.request.user.role != "parent":
            return m.ParentQuestionnaireResponse.objects.none()
        children = [
            child.id
            for child in m.Child.objects.filter(
                guardianship__user=self.request.user,
                guardianship__status="active",
                guardianship__revoked_at__isnull=True,
            ).distinct()
            if guardian(self.request.user, child)
        ]
        qs = m.ParentQuestionnaireResponse.objects.filter(child_id__in=children).order_by(
            "-created_at"
        )
        if requested_child:
            qs = qs.filter(child=requested_child)
        return qs

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        rows = response.data["results"] if isinstance(response.data, dict) else response.data
        for child_id in {row["child"] for row in rows}:
            audit(
                request.user,
                m.Child.objects.get(pk=child_id),
                "parent_questionnaire_response.listed",
            )
        return response

    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()
        audit(request.user, obj.child, "parent_questionnaire_response.read", obj)
        return Response(self.get_serializer(obj).data)

    @transaction.atomic
    def perform_create(self, serializer):
        child = serializer.validated_data["child"]
        self.require_parent_guardian(child)
        require_child_care(child)
        obj = serializer.save(author=self.request.user)
        audit(self.request.user, child, "parent_questionnaire_response.completed", obj)


class GoalViewSet(ChildScopedViewSet):
    serializer_class = s.GoalSerializer
    scope = "therapy"

    def perform_update(self, serializer):
        super().perform_update(serializer)
        if serializer.instance.status == "achieved" and not serializer.instance.achieved_at:
            serializer.instance.achieved_at = timezone.now()
            serializer.instance.save(update_fields=["achieved_at"])


class GrowthViewSet(ChildScopedViewSet):
    serializer_class = s.GrowthSerializer
    scope = "observations"


class VaccinationViewSet(ChildScopedViewSet):
    serializer_class = s.VaccinationSerializer
    scope = "records"


class TherapySessionViewSet(ChildScopedViewSet):
    serializer_class = s.TherapySessionSerializer
    scope = "therapy"

    def perform_create(self, serializer):
        child = serializer.validated_data["child"]
        practitioner = serializer.validated_data["practitioner"]
        if practitioner.profession not in ["doctor", "therapist"] or not can_access(
            practitioner.user, child, "therapy"
        ):
            raise ValidationError("The assigned active practitioner needs a therapy grant.")
        super().perform_create(serializer)

    def perform_update(self, serializer):
        if (
            "practitioner" in serializer.validated_data
            and serializer.validated_data["practitioner"] != serializer.instance.practitioner
        ):
            raise ValidationError("Create a new session to change the assigned practitioner.")
        super().perform_update(serializer)


class ReferralViewSet(ChildScopedViewSet):
    serializer_class = s.ReferralSerializer


class AttachmentViewSet(ChildScopedViewSet):
    serializer_class = s.AttachmentSerializer
    http_method_names = ["get", "post", "head", "options"]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        from .storage import upload

        child = child_from(request.data)
        require_child_care(child)
        file = request.FILES.get("file")
        if not file:
            raise ValidationError("A file is required.")
        obj = upload(request.user, child, file)
        return Response(self.get_serializer(obj).data, status=201)

    @action(detail=True, methods=["get"])
    def content(self, request, pk=None):
        from .storage import read_bytes

        obj = self.get_object()
        require_child(request.user, obj.child, "records")
        if obj.scan_status != "accepted":
            raise Conflict("This attachment is quarantined or rejected and cannot be downloaded.")
        data = read_bytes(obj)
        if hashlib.sha256(data).hexdigest() != obj.sha256:
            raise Conflict("Attachment integrity verification failed.")
        audit(request.user, obj.child, "attachment.downloaded", obj)
        response = HttpResponse(data, content_type=obj.content_type)
        from django.utils.http import content_disposition_header

        response["Content-Disposition"] = content_disposition_header(True, obj.filename)
        response["Content-Security-Policy"] = "default-src 'none'; sandbox"
        return response


class PractitionerViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = s.PractitionerSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = (
            m.Practitioner.objects.filter(verified=True, status="active", user__is_active=True)
            .select_related("user")
            .order_by("user__display_name")
        )
        if self.request.query_params.get("specialty"):
            qs = qs.filter(specialty__icontains=self.request.query_params["specialty"])
        if self.request.query_params.get("profession"):
            qs = qs.filter(profession=self.request.query_params["profession"])
        return qs


class ProviderApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = s.ProviderApplicationSerializer
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return m.ProviderApplication.objects.none()
        qs = m.ProviderApplication.objects.all()
        if self.request.user.role != "admin":
            qs = qs.filter(user=self.request.user)
        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        if m.ProviderApplication.objects.filter(user=self.request.user, status="pending").exists():
            raise Conflict("You already have an application awaiting review.")
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def review(self, request, pk=None):
        is_admin(request.user)
        obj = self.get_object()
        state = request.data.get("status")
        reason = str(request.data.get("reason", "")).strip()
        if state not in ["approved", "rejected", "suspended"] or not reason:
            raise ValidationError(
                "Choose approved, rejected or suspended and provide a review reason."
            )
        if state == "approved":
            missing = []
            if not obj.user.is_active:
                missing.append("a verified active provider account")
            if not obj.registration_number.strip():
                missing.append("a professional registration number")
            if not obj.languages:
                missing.append("supported languages")
            if obj.fee_minor <= 0:
                missing.append("an approved consultation fee")
            if missing:
                raise ValidationError(f"Complete {', '.join(missing)} before approval.")
        obj.status = state
        obj.review_reason = reason[:5000]
        obj.save(update_fields=["status", "review_reason"])
        if state == "approved":
            provider, _ = m.Practitioner.objects.update_or_create(
                user=obj.user,
                defaults={
                    k: getattr(obj, k)
                    for k in [
                        "specialty",
                        "profession",
                        "languages",
                        "fee_minor",
                        "bio",
                        "registration_number",
                    ]
                },
            )
            provider.verified = True
            provider.status = "active"
            provider.verification_reason = reason
            provider.save()
            obj.user.role = obj.profession
            obj.user.display_name = obj.display_name
            obj.user.save(update_fields=["role", "display_name"])
        else:
            m.Practitioner.objects.filter(user=obj.user).update(
                status="suspended" if state == "suspended" else "rejected", verified=False
            )
            emit("provider.suspended", obj, request.user)
        audit(request.user, None, "provider.reviewed", obj, reason[:200])
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="payout-onboarding")
    def payout_onboarding(self, request, pk=None):
        from .finance import create_route_account

        obj = self.get_object()
        if request.user.id != obj.user_id and request.user.role != "admin":
            raise PermissionDenied()
        practitioner = get_object_or_404(m.Practitioner, user=obj.user)
        return Response(create_route_account(practitioner, request.data))


class SlotViewSet(viewsets.GenericViewSet):
    serializer_class = s.SlotSerializer

    def get_queryset(self):
        now = timezone.now()
        reserved = m.Appointment.objects.filter(slot_id=OuterRef("pk")).filter(
            Q(status__in=["confirmed", "in_progress", "completed", "no_show"])
            | Q(status="awaiting_payment", hold_expires_at__gt=now)
        )
        qs = (
            m.Slot.objects.filter(
                practitioner__verified=True,
                practitioner__status="active",
                starts_at__gte=now,
            )
            .annotate(reserved=Exists(reserved))
            .order_by("starts_at")
        )
        if self.request.query_params.get("practitioner"):
            qs = qs.filter(practitioner_id=self.request.query_params["practitioner"])
        return qs

    def list(self, request):
        return paginated(self, self.get_queryset())

    def create(self, request):
        from .finance import create_slot

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = create_slot(
            request.user,
            serializer.validated_data["starts_at"],
            serializer.validated_data["ends_at"],
            consultation_mode=serializer.validated_data.get("consultation_mode", "online"),
            clinic_address=serializer.validated_data.get("clinic_address", ""),
        )
        return Response(self.get_serializer(obj).data, status=201)


class AppointmentViewSet(viewsets.GenericViewSet):
    serializer_class = s.AppointmentSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return m.Appointment.objects.none()
        user = self.request.user
        if user.role == "parent":
            qs = m.Appointment.objects.filter(child__in=visible_children(user))
        elif clinician_active(user):
            qs = m.Appointment.objects.filter(
                practitioner__user=user, child__in=visible_children(user, "records")
            )
        else:
            return m.Appointment.objects.none()
        if self.request.query_params.get("child"):
            qs = qs.filter(child_id=self.request.query_params["child"])
        return qs.select_related("practitioner__user", "slot", "child").order_by("-slot__starts_at")

    def list(self, request):
        return paginated(self, self.get_queryset())

    def retrieve(self, request, pk=None):
        return Response(self.get_serializer(self.get_object()).data)

    def create(self, request):
        from .finance import hold_appointment

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        child = serializer.validated_data["child"]
        require_child(request.user, child)
        key = request.headers.get("Idempotency-Key", "")
        if len(key) > 160:
            raise ValidationError("Idempotency-Key is too long.")
        with transaction.atomic():
            if key:
                m.Account.objects.select_for_update().get(pk=request.user.pk)
                digest = hashlib.sha256(
                    json.dumps(request.data, sort_keys=True).encode()
                ).hexdigest()
                old = m.IdempotencyReceipt.objects.filter(
                    user=request.user, key=key, endpoint="appointments"
                ).first()
                if old:
                    if old.body_hash != digest:
                        raise Conflict("Idempotency-Key was used for different data.")
                    return Response(old.response, status=200)
            obj = hold_appointment(request.user, child, serializer.validated_data["slot"])
            response = self.get_serializer(obj).data
            if key:
                m.IdempotencyReceipt.objects.create(
                    user=request.user,
                    key=key,
                    endpoint="appointments",
                    body_hash=digest,
                    response=json.loads(json.dumps(response, default=str)),
                )
            return Response(response, status=201)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        from .finance import cancel_appointment

        obj = cancel_appointment(
            request.user, self.get_object(), str(request.data.get("reason", ""))[:5000]
        )
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"])
    def reschedule(self, request, pk=None):
        from .finance import reschedule_appointment

        slot = get_object_or_404(m.Slot, pk=request.data.get("slot"))
        return Response(
            self.get_serializer(reschedule_appointment(request.user, self.get_object(), slot)).data
        )

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def complete(self, request, pk=None):
        obj = self.get_object()
        professional(request.user)
        if obj.practitioner.user_id != request.user.id:
            raise PermissionDenied("Only the assigned practitioner can complete the consultation.")
        require_child(request.user, obj.child, "records")
        obj = m.Appointment.objects.select_for_update().get(pk=obj.pk)
        if obj.status not in ["confirmed", "in_progress"]:
            raise Conflict("Only a confirmed consultation can be completed.")
        if obj.slot.starts_at > timezone.now():
            raise Conflict("A future consultation cannot be completed.")
        obj.status = "completed"
        obj.save(update_fields=["status"])
        emit("appointment.completed", obj, request.user, obj.child)
        audit(request.user, obj.child, "consultation.completed", obj)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="no-show")
    @transaction.atomic
    def no_show(self, request, pk=None):
        obj = self.get_object()
        professional(request.user)
        from .finance import _lock_appointment

        obj = _lock_appointment(obj)
        require_child(request.user, obj.child, "records")
        if (
            obj.practitioner.user_id != request.user.id
            or obj.status != "confirmed"
            or obj.slot.ends_at > timezone.now()
        ):
            raise Conflict(
                "Only the assigned practitioner can mark a past confirmed appointment as a no-show."
            )
        obj.status = "no_show"
        obj.save(update_fields=["status"])
        audit(request.user, obj.child, "consultation.no_show", obj)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"])
    def join(self, request, pk=None):
        import jwt
        from urllib.parse import urlparse

        obj = self.get_object()
        if obj.slot.consultation_mode != "online":
            raise Conflict("In-person appointments do not have an online consultation room.")
        if obj.status not in ["confirmed", "in_progress"]:
            raise Conflict("Video access requires a confirmed appointment.")
        if not clinician_active(obj.practitioner.user):
            raise PermissionDenied("The practitioner is no longer active.")
        from .demo_booking import is_demo_appointment, sandbox_ready
        demo = is_demo_appointment(obj)
        demo_doctor = isinstance(request.data, dict) and request.data.get("demo_doctor") is True
        if not isinstance(request.data, dict) or (request.data and not (demo and demo_doctor and set(request.data) == {"demo_doctor"})):
            raise ValidationError("Submit an empty body, or select the demo doctor for a test booking.")
        require_child(request.user, obj.child, "records")
        if demo:
            if not sandbox_ready() or request.user.pk != obj.booker_id:
                raise PermissionDenied("Only the booking parent can open this demo consultation.")
        elif request.user.id != obj.practitioner.user_id and not guardian(request.user, obj.child):
            raise PermissionDenied()
        now = timezone.now()
        # Paid fictional visits can be demonstrated immediately; clinical visits retain their time window.
        if not settings.DEMO_MODE and not (
            (demo or obj.slot.starts_at - timedelta(minutes=15) <= now)
            and now <= obj.slot.ends_at + timedelta(minutes=30)
        ):
            raise Conflict("The consultation room opens 15 minutes before the visit and closes 30 minutes after it ends.")
        if not all([settings.LIVEKIT_URL, settings.LIVEKIT_API_KEY, settings.LIVEKIT_API_SECRET]):
            raise Unavailable(
                "Configure LiveKit URL and signing credentials to join a consultation."
            )
        from .tasks import scheduler_healthy
        if settings.PRODUCTION and not scheduler_healthy():
            raise Unavailable(
                "Consultations require an active delivery worker for access revocation."
            )
        if settings.PRODUCTION and not (
            urlparse(settings.LIVEKIT_URL).scheme == "wss"
            and (urlparse(settings.LIVEKIT_URL).hostname or "").endswith(".livekit.cloud")
        ):
            raise Unavailable(
                "Production consultations require LiveKit Cloud token revocation. The local self-hosted adapter cannot invalidate cached participant tokens."
            )
        room = f"appointment-{obj.id}"
        token = jwt.encode(
            {
                "iss": settings.LIVEKIT_API_KEY,
                "sub": str(obj.practitioner.user_id if demo_doctor else request.user.id),
                "name": obj.practitioner.user.display_name if demo_doctor else ("Demo parent" if demo else request.user.display_name),
                "nbf": int(now.timestamp()) - 5,
                "exp": int((now + timedelta(minutes=2)).timestamp()),
                "jti": secrets.token_hex(16),
                "video": {
                    "roomJoin": True,
                    "room": room,
                    "canPublish": True,
                    "canSubscribe": True,
                    "canPublishData": True,
                },
            },
            settings.LIVEKIT_API_SECRET,
            algorithm="HS256",
        )
        audit(request.user, obj.child, "consultation.join", obj)
        return Response(
            {
                "url": settings.LIVEKIT_URL,
                "token": token,
                "room": room,
                "expires_in": 120,
                "recording": False,
                "is_demo": demo,
                "demo_doctor": demo_doctor,
                "appointment": str(obj.pk),
                "child": str(obj.child_id),
            }
        )


class PaymentViewSet(viewsets.GenericViewSet):
    serializer_class = s.PaymentSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return m.Payment.objects.none()
        user = self.request.user
        qs = m.Payment.objects.none()
        if user.role == "admin":
            qs = m.Payment.objects.all()
        elif user.role == "parent":
            qs = m.Payment.objects.filter(
                appointment__booker=user, appointment__child__in=visible_children(user)
            )
        elif clinician_active(user):
            qs = m.Payment.objects.filter(
                appointment__practitioner__user=user,
                appointment__child__in=visible_children(user, "records"),
            )
        if self.request.query_params.get("child"):
            qs = qs.filter(appointment__child_id=self.request.query_params["child"])
        return qs.select_related("appointment").order_by("-created_at")

    def list(self, request):
        return paginated(self, self.get_queryset())

    def retrieve(self, request, pk=None):
        return Response(self.get_serializer(self.get_object()).data)

    def create(self, request):
        from .finance import create_payment

        appointment = get_object_or_404(m.Appointment, pk=request.data.get("appointment"))
        obj = create_payment(request.user, appointment)
        return Response(self.get_serializer(obj).data, status=201)

    @action(detail=True, methods=["post"])
    def refund(self, request, pk=None):
        from .finance import request_refund

        obj = self.get_object()
        if request.user.id != obj.appointment.booker_id and request.user.role != "admin":
            raise PermissionDenied()
        if request.user.role != "admin":
            require_child(request.user, obj.appointment.child)
        key = request.headers.get("Idempotency-Key", f"full-refund-{obj.id}")
        if len(key) > 160:
            raise ValidationError("Idempotency-Key is too long.")
        refund = request_refund(obj, key)
        obj.refresh_from_db()
        return Response(
            {
                "refund": {
                    "id": str(refund.id),
                    "status": refund.status,
                    "amount_minor": refund.amount_minor,
                },
                "payment": self.get_serializer(obj).data,
            }
        )

    @action(detail=True, methods=["post"])
    def verify(self, request, pk=None):
        from .demo_booking import is_demo_appointment, sandbox_ready
        from .finance import reconcile_payment
        payment = self.get_object()
        if request.user.role != "parent" or payment.appointment.booker_id != request.user.pk:
            raise PermissionDenied("Only the booking parent can verify this test payment.")
        if not sandbox_ready() or not is_demo_appointment(payment.appointment):
            raise PermissionDenied("This verification action supports project-demo bookings only.")
        if request.data:
            raise ValidationError("Payment status is fetched from the provider; submit an empty body.")
        require_child(request.user, payment.appointment.child, "records")
        return Response(reconcile_payment(payment))

    @action(detail=True, methods=["post"])
    def reconcile(self, request, pk=None):
        from .finance import reconcile_payment

        is_admin(request.user)
        return Response(reconcile_payment(self.get_object()))

    @action(detail=True, methods=["post"])
    def transfer(self, request, pk=None):
        from .finance import transfer_payment

        is_admin(request.user)
        return Response(transfer_payment(self.get_object()))


@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def razorpay_webhook(request):
    from .finance import process_payment_event

    if not settings.RAZORPAY_WEBHOOK_SECRET:
        raise Unavailable("Webhook verification is not configured.")
    raw = request.body
    expected = hmac.new(settings.RAZORPAY_WEBHOOK_SECRET.encode(), raw, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, request.headers.get("X-Razorpay-Signature", "")):
        raise PermissionDenied("Invalid webhook signature.")
    try:
        payload = json.loads(raw)
    except ValueError as exc:
        raise ValidationError("Invalid webhook JSON.") from exc
    event_id = request.headers.get("X-Razorpay-Event-Id")
    if not event_id or len(event_id) > 255:
        raise ValidationError("A provider event identifier is required.")
    event = process_payment_event(event_id, payload.get("event", ""), payload.get("payload", {}))
    return Response({"received": True, "status": event.status})


@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def scheduler_dispatch(request):
    expected = settings.OUTBOX_DISPATCH_TOKEN
    supplied = request.headers.get("X-NeuroNest-Scheduler", "")
    if not expected or not secrets.compare_digest(expected, supplied):
        raise PermissionDenied("Scheduler authentication failed.")
    job = request.data.get("job") if isinstance(request.data, dict) else None
    if job not in {"outbox", "reminders"}:
        raise ValidationError("Choose a supported scheduler job.")
    from .tasks import run_scheduled_job

    return Response({"job": job, **run_scheduled_job(job)})


class MessageViewSet(ChildScopedViewSet):
    serializer_class = s.MessageSerializer
    scope = "messages"
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return m.Message.objects.none()
        return (
            super()
            .get_queryset()
            .filter(Q(author=self.request.user) | Q(recipient=self.request.user))
        )

    @action(detail=False, methods=["get"])
    def recipients(self, request):
        child = child_from(request.query_params)
        require_child(request.user, child, "messages")
        if guardian(request.user, child, scope="messages"):
            candidates = m.Account.objects.filter(grants__child=child, is_active=True).distinct()
            users = [
                u
                for u in candidates
                if u.pk != request.user.pk
                and clinician_active(u)
                and can_access(u, child, "messages")
            ]
        else:
            candidates = m.Account.objects.filter(
                guardianship__child=child, is_active=True
            ).distinct()
            users = [
                u
                for u in candidates
                if u.pk != request.user.pk and guardian(u, child, scope="messages")
            ]
        return Response(s.AccountSerializer(users, many=True).data)

    def perform_create(self, serializer):
        child = serializer.validated_data["child"]
        recipient = serializer.validated_data["recipient"]
        user = self.request.user
        require_child(user, child, "messages")
        if recipient.id == user.id:
            raise ValidationError("Choose another participant.")
        if guardian(user, child, scope="messages"):
            if not clinician_active(recipient):
                raise ValidationError("Choose an active verified care professional.")
            if not can_access(recipient, child, "messages"):
                raise ValidationError("An active messaging grant is required for this recipient.")
        elif not guardian(recipient, child, scope="messages"):
            raise PermissionDenied(
                "Care professionals can message the child’s active guardians only."
            )
        super().perform_create(serializer)
        emit("message.created", serializer.instance, user, child, recipient=str(recipient.id))


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = s.NotificationSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return m.Notification.objects.none()
        return m.Notification.objects.filter(user=self.request.user).order_by("-created_at")

    @action(detail=True, methods=["post"])
    def read(self, request, pk=None):
        obj = self.get_object()
        obj.read_at = timezone.now()
        obj.save(update_fields=["read_at"])
        return Response(self.get_serializer(obj).data)


class ContentViewSet(viewsets.ModelViewSet):
    serializer_class = s.ContentSerializer
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        qs = m.Content.objects.all()
        if not self.request.user.is_authenticated or self.request.user.role != "admin":
            qs = qs.filter(review_status="approved", available=True)
        if self.request.query_params.get("language"):
            qs = qs.filter(language=self.request.query_params["language"])
        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        is_admin(self.request.user)
        serializer.save()

    def perform_update(self, serializer):
        is_admin(self.request.user)
        serializer.save(review_status="pending", reviewed_at=None)

    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        is_admin(request.user)
        obj = self.get_object()
        state = request.data.get("status")
        if state not in ["approved", "rejected"]:
            raise ValidationError("Choose approved or rejected.")
        obj.review_status = state
        obj.reviewed_at = timezone.now()
        obj.save(update_fields=["review_status", "reviewed_at"])
        audit(request.user, None, "content.reviewed", obj)
        return Response(self.get_serializer(obj).data)


class ResourceViewSet(viewsets.ModelViewSet):
    serializer_class = s.ResourceSerializer
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        qs = m.Resource.objects.all()
        if self.request.user.role != "admin":
            qs = qs.filter(review_status="approved")
        return qs.order_by("name")

    def perform_create(self, serializer):
        is_admin(self.request.user)
        serializer.save()

    def perform_update(self, serializer):
        is_admin(self.request.user)
        serializer.save(review_status="pending", verified_at=None)

    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        is_admin(request.user)
        obj = self.get_object()
        state = request.data.get("status")
        if state not in ["approved", "rejected"]:
            raise ValidationError("Choose approved or rejected.")
        obj.review_status = state
        obj.verified_at = timezone.localdate()
        obj.save(update_fields=["review_status", "verified_at"])
        return Response(self.get_serializer(obj).data)


class ScreeningViewSet(ChildScopedViewSet):
    serializer_class = s.ScreeningSerializer
    scope = "screening"
    http_method_names = ["get", "post", "head", "options"]

    @transaction.atomic
    def perform_create(self, serializer):
        child = serializer.validated_data["child"]
        require_child(self.request.user, child, self.scope)
        require_child_care(child)
        instrument = serializer.validated_data["instrument_id"]
        language = child.language if child.language in {"en", "ml"} else "en"
        info = engine_call("diagnostic", f"/instruments?language={language}")
        instruments = info if isinstance(info, list) else info.get("instruments", [])
        chosen = next(
            (x for x in instruments if x.get("id", x.get("instrument_id")) == instrument), None
        )
        if not chosen:
            raise ValidationError("Unknown instrument.")
        if chosen.get("enabled") is False or chosen.get("status") == "disabled":
            raise Conflict("This instrument requires approved content and licensing.")
        super().perform_create(serializer)

    @action(detail=False, methods=["get"])
    def instruments(self, request):
        return Response(
            engine_call(
                "diagnostic", f"/instruments?language={request.query_params.get('language', 'en')}"
            )
        )

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def submit(self, request, pk=None):
        obj = self.get_object()
        require_child(request.user, obj.child, "screening")
        require_child_care(obj.child)
        obj = m.Screening.objects.select_for_update().get(pk=obj.pk)
        if obj.status in ["completed", "reviewed"]:
            raise Conflict("This screening is already complete.")
        answers = request.data.get("answers", {})
        if not isinstance(answers, dict):
            raise ValidationError("Answers must be an object keyed by question identifier.")
        payload = {
            "instrument_id": obj.instrument_id,
            "date_of_birth": str(obj.child.date_of_birth),
            "language": obj.child.language,
            "answers": answers,
            "stage": "follow_up" if obj.status == "follow_up_required" else "initial",
        }
        if obj.status == "follow_up_required":
            payload["prior_answers"] = obj.answers
        result = engine_call("diagnostic", "/screen", payload)
        obj.answers = {**obj.answers, **answers}
        obj.result = result
        obj.status = (
            "follow_up_required"
            if payload["stage"] == "follow_up" and result.get("status") == "incomplete"
            else result.get("status", "incomplete")
        )
        obj.save(update_fields=["answers", "result", "status"])
        audit(request.user, obj.child, "screening.submitted", obj)
        emit("screening.submitted", obj, request.user, obj.child)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def review(self, request, pk=None):
        obj = self.get_object()
        professional(request.user, ("doctor",))
        require_child(request.user, obj.child, "screening")
        obj = m.Screening.objects.select_for_update().get(pk=obj.pk)
        note = str(request.data.get("note", "")).strip()
        if obj.status != "completed" or not note:
            raise ValidationError("A completed screening and review note are required.")
        obj.status = "reviewed"
        obj.review_note = note[:10000]
        obj.reviewed_by = request.user
        obj.reviewed_at = timezone.now()
        obj.save(update_fields=["status", "review_note", "reviewed_by", "reviewed_at"])
        audit(request.user, obj.child, "screening.reviewed", obj)
        return Response(self.get_serializer(obj).data)


@api_view(["POST"])
def assistant(request):
    class Input(serializers.Serializer):
        message = serializers.CharField(max_length=4000)
        language = serializers.ChoiceField(choices=["en", "ml"], default="en")
        child = serializers.UUIDField(required=False)
        include_records = serializers.BooleanField(default=False)
        app_help = serializers.BooleanField(default=False)

    data = Input(data=request.data)
    data.is_valid(raise_exception=True)
    values = data.validated_data
    if values["app_help"]:
        if values["include_records"] or values.get("child"):
            raise ValidationError("App guidance does not accept child records or identifiers.")
        from .app_guide import reply

        result = reply(request.user, values["message"], values["language"])
        audit(request.user, None, "assistant.navigation", purpose="explicit_request")
        return Response(result)
    payload = {
        "message": values["message"],
        "language": values["language"],
        "request_id": request.request_id,
    }
    child = None
    if values.get("child"):
        child = get_object_or_404(m.Child, pk=values["child"])
        require_child(request.user, child, "records")
    if values["include_records"]:
        if not child:
            raise ValidationError("A child must be selected for authorized record context.")
        if not settings.PATIENT_AI_ENABLED:
            raise Unavailable(
                "Patient record processing is disabled until the model-provider agreement and controls are approved."
            )
        payload["subject_id"] = str(child.id)
        payload["context"] = assistant_context(request.user, child)
    result = engine_call("assistant", "/chat", payload)
    audit(
        request.user,
        child,
        "assistant.context_used" if values["include_records"] else "assistant.education",
        purpose="explicit_request",
    )
    return Response(result)


@api_view(["POST"])
def exports(request):
    child = child_from(request.data)
    require_child(request.user, child, "records")
    require_child(request.user, child, "export")
    data = {
        "child": s.ChildSerializer(child).data,
        "generated_at": timezone.now().isoformat(),
        "records": s.RecordSerializer(
            m.Record.objects.filter(child=child).filter(record_disclosure_filter(request.user)),
            many=True,
        ).data,
    }
    if can_access(request.user, child, "observations"):
        from .milestones import MilestoneCheckInSerializer

        data["milestone_checkins"] = MilestoneCheckInSerializer(
            m.MilestoneCheckIn.objects.filter(child=child), many=True
        ).data
        data["observations"] = s.ObservationSerializer(
            m.Observation.objects.filter(child=child), many=True
        ).data
    audit(request.user, child, "records.exported", child)
    return Response(data)


class AuditViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = s.AuditSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return m.Audit.objects.none()
        children = [
            c.id
            for c in visible_children(self.request.user)
            if guardian(self.request.user, c) or adult_subject(self.request.user, c)
        ]
        qs = m.Audit.objects.filter(child_id__in=children)
        if self.request.query_params.get("child"):
            qs = qs.filter(child_id=self.request.query_params["child"])
        return qs.order_by("-created_at")


# Re-exported for neuronest/urls.py, which registers every viewset from this module.
from .privacy import PrivacyRequestViewSet  # noqa: F401

from .schema import annotate_api

annotate_api(globals())
