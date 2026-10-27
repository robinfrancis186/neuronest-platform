import json
from functools import lru_cache
import re
import uuid

import httpx
import jwt
from django.conf import settings
from django.db import IntegrityError
from django.utils import timezone
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import IsAuthenticated
from .models import Account


USERNAME_RE = re.compile(r"^[a-z][a-z0-9._-]{2,29}$")


def normalize_username(value):
    """Return the stable, case-insensitive form used for family sign-in."""
    username = value.strip().casefold() if isinstance(value, str) else ""
    if not USERNAME_RE.fullmatch(username):
        raise ValueError(
            "Use 3–30 letters or numbers, starting with a letter. You may also use . _ or -."
        )
    return username


class ClaimedUsernameRequired(IsAuthenticated):
    """A verified identity can finish setup, but cannot access care data before it does."""

    message = "Finish username setup before opening your care workspace."
    setup_paths = {"/v1/me", "/v1/auth/username/claim", "/v1/auth/identity/link"}

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        if request.path.rstrip("/") in self.setup_paths:
            return True
        return bool(getattr(request.user, "username_claimed", False))


def _supabase_post(path, body):
    if not settings.SUPABASE_URL or not settings.SUPABASE_PUBLISHABLE_KEY:
        return None
    try:
        response = httpx.post(
            f"{settings.SUPABASE_URL}{path}",
            headers={"apikey": settings.SUPABASE_PUBLISHABLE_KEY},
            json=body,
            timeout=10.0,
        )
    except httpx.HTTPError:
        return None
    if response.status_code not in [200, 201]:
        return None
    try:
        body = response.json()
    except ValueError:
        return None
    return body if isinstance(body, dict) else None


def supabase_username_session(email, password):
    """Exchange a stored account email for a session without returning it."""
    body = _supabase_post(
        "/auth/v1/token?grant_type=password", {"email": email, "password": password}
    )
    if not body:
        return None
    access_token, refresh_token = body.get("access_token"), body.get("refresh_token")
    if not isinstance(access_token, str) or not isinstance(refresh_token, str):
        return None
    return {"access_token": access_token, "refresh_token": refresh_token}


def _firebase_password_sign_in(email, password):
    if not settings.FIREBASE_WEB_API_KEY:
        return None
    try:
        response = httpx.post(
            "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword",
            params={"key": settings.FIREBASE_WEB_API_KEY},
            json={"email": email, "password": password, "returnSecureToken": True},
            timeout=10.0,
        )
    except httpx.HTTPError:
        return None
    if response.status_code != 200:
        return None
    try:
        body = response.json()
    except ValueError:
        return None
    return body if isinstance(body, dict) else None


def firebase_admin_app():
    """Load the one server-only Firebase app without logging its credential material."""
    if not settings.FIREBASE_SERVICE_ACCOUNT_JSON:
        return None
    try:
        import firebase_admin
        from firebase_admin import credentials

        try:
            app = firebase_admin.get_app("neuronest-core")
        except ValueError:
            service_account = json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON)
            if (
                not isinstance(service_account, dict)
                or service_account.get("type") != "service_account"
                or service_account.get("project_id") != settings.FIREBASE_PROJECT_ID
            ):
                return None
            app = firebase_admin.initialize_app(
                credentials.Certificate(service_account),
                options={"projectId": settings.FIREBASE_PROJECT_ID},
                name="neuronest-core",
            )
        return app if app.project_id == settings.FIREBASE_PROJECT_ID else None
    except Exception:  # Provider setup errors must never turn into an issued session.
        return None


def firebase_custom_token(subject):
    """Mint a short-lived Firebase custom token without exposing service credentials."""
    app = firebase_admin_app()
    if app is None:
        return None
    try:
        from firebase_admin import auth as firebase_auth

        token = firebase_auth.create_custom_token(subject, app=app)
    except Exception:  # Do not issue a partially created or provider-error session.
        return None
    return (
        token.decode("utf-8")
        if isinstance(token, bytes)
        else token
        if isinstance(token, str)
        else None
    )


def firebase_username_session(email, password, expected_subject):
    """Verify a username-mapped password without disclosing the recovery email."""
    body = _firebase_password_sign_in(email, password)
    token = body.get("idToken") if body else None
    if not isinstance(token, str) or not expected_subject:
        return None
    try:
        payload = verified_firebase_token(token)
    except AuthenticationFailed:
        return None
    firebase = payload.get("firebase")
    if (
        payload["sub"] != expected_subject
        or payload["email"].casefold() != email.casefold()
        or not isinstance(firebase, dict)
        or firebase.get("sign_in_provider") != "password"
    ):
        return None
    custom_token = firebase_custom_token(payload["sub"])
    return {"custom_token": custom_token} if custom_token else None


def username_session(email, password, expected_subject=None):
    if settings.IDENTITY_PROVIDER == "firebase":
        return firebase_username_session(email, password, expected_subject)
    return supabase_username_session(email, password)


@lru_cache(maxsize=4)
def jwks_client(url):
    return jwt.PyJWKClient(url, cache_keys=True, lifespan=300)


def verified_supabase_user(token):
    """Ask Auth for the canonical user before first local account creation."""
    try:
        response = httpx.get(
            f"{settings.SUPABASE_URL}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": settings.SUPABASE_PUBLISHABLE_KEY,
            },
            timeout=5.0,
        )
    except httpx.HTTPError as exc:
        raise AuthenticationFailed("Could not verify the Supabase account.") from exc
    if response.status_code != 200:
        raise AuthenticationFailed("Could not verify the Supabase account.")
    try:
        user = response.json()
    except ValueError as exc:
        raise AuthenticationFailed("Could not verify the Supabase account.") from exc
    if not isinstance(user, dict) or not user.get("email_confirmed_at"):
        raise AuthenticationFailed("Verify your email before accessing NeuroNest.")
    return user


def verified_display_name(auth_user, email):
    """Use a canonical profile name only as non-authorizing display text."""
    metadata = auth_user.get("user_metadata")
    full_name = metadata.get("full_name") if isinstance(metadata, dict) else None
    if not isinstance(full_name, str):
        return email
    display_name = " ".join(full_name.split())
    return display_name if 0 < len(display_name) <= 160 else email


def firebase_display_name(payload, email):
    """Firebase profile names are display text only and never authorize a role."""
    name = payload.get("name")
    display_name = " ".join(name.split()) if isinstance(name, str) else ""
    return display_name if 0 < len(display_name) <= 160 else email


def unclaimed_username_placeholder():
    """Return an opaque value that can never satisfy the public username policy."""
    return f"pending:{uuid.uuid4().hex}"


def local_account(subject, email, display_name, *, provider):
    """Resolve a provider identity without implicitly joining it by email."""
    from .errors import IdentityLinkReviewRequired

    subject_field = "firebase_subject" if provider == "firebase" else "oidc_subject"
    user = Account.objects.filter(**{subject_field: subject}).first()
    if user is not None:
        return user
    if Account.objects.filter(email__iexact=email).exists():
        if provider == "firebase":
            # A verified address and a confirmation click do not prove control of
            # a legacy care account. Keep every legacy attachment out of the
            # self-service path until support completes an independent review.
            raise IdentityLinkReviewRequired()
        raise AuthenticationFailed("Existing account needs an identity-linking review.")
    try:
        subject_values = {subject_field: subject}
        user = Account.objects.create(
            # Provider profile values can only populate display text. New identities
            # must finish the username-claim flow before care access is allowed.
            username=unclaimed_username_placeholder(),
            username_claimed=False,
            email=email,
            display_name=display_name,
            role="parent",
            last_login=timezone.now(),
            **subject_values,
        )
        user.set_unusable_password()
        user.save(update_fields=["password"])
    except IntegrityError as exc:
        if provider == "firebase":
            # A simultaneous first request for the same Firebase identity may have
            # completed the mapping between the lookup and create above.
            mapped = Account.objects.filter(firebase_subject=subject).first()
            if mapped is not None:
                return mapped
            if Account.objects.filter(email__iexact=email).exists():
                raise IdentityLinkReviewRequired() from exc
        raise AuthenticationFailed("Existing account needs an identity-linking review.") from exc
    return user


def checked_local_account(subject, email, display_name, *, provider, staff_mfa=False):
    user = local_account(subject, email, display_name, provider=provider)
    if not user.is_active:
        raise AuthenticationFailed("Account is disabled.")
    if user.email.casefold() != email.casefold():
        raise AuthenticationFailed("Email address needs an identity-linking review.")
    if settings.PRODUCTION and user.role != "parent" and not staff_mfa:
        raise AuthenticationFailed("Staff multi-factor authentication is required.")
    return user


def verified_firebase_admin_token(token):
    """Use Firebase Admin revocation checks for production sessions."""
    app = firebase_admin_app()
    if app is None:
        raise AuthenticationFailed("Identity provider is not configured.")
    try:
        from firebase_admin import auth as firebase_auth

        return firebase_auth.verify_id_token(token, app=app, check_revoked=True)
    except Exception as exc:
        raise AuthenticationFailed("Invalid or expired access token.") from exc


def verified_firebase_token(token):
    """Verify Firebase's signed ID token and its fixed issuer/audience claims."""
    if not settings.FIREBASE_PROJECT_ID or not settings.FIREBASE_ISSUER:
        raise AuthenticationFailed("Identity provider is not configured.")
    if settings.PRODUCTION:
        payload = verified_firebase_admin_token(token)
    else:
        try:
            header = jwt.get_unverified_header(token)
            if header.get("alg") != "RS256" or not isinstance(header.get("kid"), str):
                raise AuthenticationFailed("Invalid or expired access token.")
            key = jwks_client(settings.FIREBASE_JWKS_URL).get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                key.key,
                algorithms=list(settings.FIREBASE_JWT_ALGORITHMS),
                audience=settings.FIREBASE_PROJECT_ID,
                issuer=settings.FIREBASE_ISSUER,
                options={
                    "require": [
                        "exp",
                        "iat",
                        "iss",
                        "aud",
                        "sub",
                        "auth_time",
                        "email",
                        "email_verified",
                    ]
                },
            )
        except AuthenticationFailed:
            raise
        except (jwt.PyJWTError, ValueError, KeyError) as exc:
            raise AuthenticationFailed("Invalid or expired access token.") from exc
    if not isinstance(payload, dict):
        raise AuthenticationFailed("Invalid or expired access token.")
    if (
        payload.get("aud") != settings.FIREBASE_PROJECT_ID
        or payload.get("iss") != settings.FIREBASE_ISSUER
    ):
        raise AuthenticationFailed("Invalid or expired access token.")
    subject = payload.get("sub")
    email = str(payload.get("email", "")).lower()
    if not isinstance(subject, str) or not subject or len(subject) > 255:
        raise AuthenticationFailed("Invalid or expired access token.")
    if not email or payload.get("email_verified") is not True:
        raise AuthenticationFailed("A verified email is required.")
    if not isinstance(payload.get("auth_time"), int) or isinstance(payload.get("auth_time"), bool):
        raise AuthenticationFailed("Invalid or expired access token.")
    payload["email"] = email
    return payload


class BearerAuthentication(BaseAuthentication):
    def authenticate_header(self, request):
        return "Bearer"

    def authenticate(self, request):
        token = bearer_token(request)
        if token is None:
            return None
        if settings.IDENTITY_PROVIDER == "firebase":
            return self._authenticate_firebase(token)
        return self._authenticate_supabase(token)

    def _authenticate_firebase(self, token):
        payload = verified_firebase_token(token)
        firebase = payload.get("firebase")
        second_factor = (
            firebase.get("sign_in_second_factor") if isinstance(firebase, dict) else None
        )
        user = checked_local_account(
            payload["sub"],
            payload["email"],
            firebase_display_name(payload, payload["email"]),
            provider="firebase",
            staff_mfa=isinstance(second_factor, str) and bool(second_factor),
        )
        return user, payload

    def _authenticate_supabase(self, token):
        if not settings.SUPABASE_ISSUER or not settings.SUPABASE_JWKS_URL:
            raise AuthenticationFailed("Identity provider is not configured.")
        try:
            header_data = jwt.get_unverified_header(token)
            if header_data.get("alg") not in settings.SUPABASE_JWT_ALGORITHMS:
                raise AuthenticationFailed("Invalid or expired access token.")
            key = jwks_client(settings.SUPABASE_JWKS_URL).get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                key.key,
                algorithms=list(settings.SUPABASE_JWT_ALGORITHMS),
                audience=settings.SUPABASE_AUDIENCE,
                issuer=settings.SUPABASE_ISSUER,
                options={"require": ["exp", "iat", "iss", "aud", "sub", "email", "session_id"]},
            )
            if payload.get("role") != "authenticated" or payload.get("is_anonymous") is not False:
                raise AuthenticationFailed("A signed-in account is required.")
            email = str(payload.get("email", "")).lower()
            if not email:
                raise AuthenticationFailed("A verified email is required.")
            user = Account.objects.filter(oidc_subject=payload["sub"]).first()
            if user is None:
                auth_user = verified_supabase_user(token)
                if (
                    str(auth_user.get("id", "")) != str(payload["sub"])
                    or str(auth_user.get("email", "")).lower() != email
                ):
                    raise AuthenticationFailed("Could not verify the Supabase account.")
                user = local_account(
                    payload["sub"],
                    email,
                    verified_display_name(auth_user, email),
                    provider="supabase",
                )
            user = checked_local_account(
                payload["sub"],
                email,
                user.display_name,
                provider="supabase",
                staff_mfa=payload.get("aal") == "aal2",
            )
            # Server-created local rows exist before the provider confirms email. Check
            # the canonical identity once before their first usable session.
            if user.last_login is None:
                auth_user = verified_supabase_user(token)
                if (
                    str(auth_user.get("id", "")) != str(payload["sub"])
                    or str(auth_user.get("email", "")).lower() != email
                ):
                    raise AuthenticationFailed("Could not verify the Supabase account.")
                user.last_login = timezone.now()
                user.save(update_fields=["last_login"])
            return user, payload
        except AuthenticationFailed:
            raise
        except (jwt.PyJWTError, ValueError, KeyError) as exc:
            raise AuthenticationFailed("Invalid or expired access token.") from exc


def bearer_token(request):
    """Return a syntactically valid bearer token, or None when absent."""
    header = request.headers.get("Authorization", "")
    if not header:
        return None
    if not header.startswith("Bearer ") or not header[7:]:
        raise AuthenticationFailed("Use a Bearer access token.")
    return header[7:]


class FirebaseIdentityLinkAuthentication(BaseAuthentication):
    """Authenticate a Firebase claimant for the legacy-account review response."""

    def authenticate_header(self, request):
        return "Bearer"

    def authenticate(self, request):
        if settings.IDENTITY_PROVIDER != "firebase":
            raise AuthenticationFailed("Identity provider is not configured.")
        token = bearer_token(request)
        if token is None:
            return None
        payload = verified_firebase_token(token)
        try:
            user = Account.objects.get(email__iexact=payload["email"])
        except Account.DoesNotExist as exc:
            raise AuthenticationFailed("No existing account can be linked.") from exc
        except Account.MultipleObjectsReturned as exc:
            raise AuthenticationFailed("Existing account needs an identity-linking review.") from exc
        if not user.is_active:
            raise AuthenticationFailed("Account is disabled.")
        if user.email.casefold() != payload["email"].casefold():
            raise AuthenticationFailed("Email address needs an identity-linking review.")
        firebase = payload.get("firebase")
        second_factor = (
            firebase.get("sign_in_second_factor") if isinstance(firebase, dict) else None
        )
        if settings.PRODUCTION and user.role != "parent" and not (
            isinstance(second_factor, str) and bool(second_factor)
        ):
            raise AuthenticationFailed("Staff multi-factor authentication is required.")
        if user.firebase_subject and user.firebase_subject != payload["sub"]:
            raise AuthenticationFailed("This account is already linked to another Firebase identity.")
        return user, payload
