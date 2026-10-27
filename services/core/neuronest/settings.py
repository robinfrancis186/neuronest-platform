import os
import re
from pathlib import Path
from urllib.parse import urlparse, unquote
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
PRODUCTION = ENVIRONMENT == "production"
DEBUG = os.getenv("DJANGO_DEBUG", os.getenv("DEBUG", "false")).lower() == "true"
SANDBOX_BOOKING_ENABLED = os.getenv("SANDBOX_BOOKING_ENABLED", "false").lower() == "true"
DEMO_MODE = os.getenv("DEMO_MODE", "false").lower() == "true" and not PRODUCTION
PLACEHOLDER_SECRET = "local-only-change-before-deployment"  # noqa: S105  (production refuses it below)
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", PLACEHOLDER_SECRET)
if PRODUCTION and (
    SECRET_KEY == PLACEHOLDER_SECRET or DEBUG or os.getenv("DEMO_MODE", "").lower() == "true"
):
    raise ImproperlyConfigured("Production requires a secret, DEBUG=false and DEMO_MODE=false")
# The durable username-sign-in limiter HMACs personal identifiers before they
# reach PostgreSQL. A separately rotatable key is optional; Django's production
# secret is a safe domain-separated fallback.
USERNAME_RATE_LIMIT_HMAC_KEY = os.getenv("USERNAME_RATE_LIMIT_HMAC_KEY") or SECRET_KEY
# Set only when the deployment proxy overwrites X-Forwarded-For with the client
# address. Otherwise the limiter deliberately uses REMOTE_ADDR.
TRUST_PROXY_HEADERS = os.getenv("TRUST_PROXY_HEADERS", "false").lower() == "true"
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1,testserver,core").split(",")
vercel_hostname = os.getenv("VERCEL_URL", "")
if re.fullmatch(r"[a-z0-9-]+\.vercel\.app", vercel_hostname):
    ALLOWED_HOSTS.append(vercel_hostname)
INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.staticfiles",
    "rest_framework",
    "drf_spectacular",
    "corsheaders",
    "api",
]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "api.middleware.PrivateResponseMiddleware",
]
ROOT_URLCONF = "neuronest.urls"
WSGI_APPLICATION = "neuronest.wsgi.application"
AUTH_USER_MODEL = "api.Account"
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"}
]
DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL and os.getenv("DATABASE_HOST"):
    from urllib.parse import quote

    DATABASE_URL = f"postgresql://{quote(os.getenv('DATABASE_USER', 'neuronest'), safe='')}:{quote(os.getenv('DATABASE_PASSWORD', ''), safe='')}@{os.getenv('DATABASE_HOST')}:{os.getenv('DATABASE_PORT', '5432')}/{os.getenv('DATABASE_NAME', 'neuronest')}"
if DATABASE_URL:
    parsed = urlparse(DATABASE_URL)
    database_options = {
        "sslmode": os.getenv("DB_SSLMODE", "verify-full" if PRODUCTION else "prefer")
    }
    if PRODUCTION:
        database_options["sslrootcert"] = os.getenv(
            "DB_SSLROOTCERT", str(BASE_DIR / "certs" / "supabase-root.crt")
        )
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": parsed.path.lstrip("/"),
            "USER": unquote(parsed.username or ""),
            "PASSWORD": unquote(parsed.password or ""),
            "HOST": parsed.hostname,
            "PORT": parsed.port or 5432,
            "CONN_MAX_AGE": 0 if PRODUCTION else 60,
            "OPTIONS": database_options,
        }
    }
else:
    if PRODUCTION:
        raise ImproperlyConfigured("Production requires PostgreSQL DATABASE_URL")
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": os.getenv("SQLITE_PATH", str(BASE_DIR / "db.sqlite3")),
            "OPTIONS": {"timeout": 20},
        }
    }
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["api.auth.BearerAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["api.auth.ClaimedUsernameRequired"],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "api.errors.exception_handler",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_PAGINATION_CLASS": "api.pagination.BoundedPagination",
    "PAGE_SIZE": 100,
    "DEFAULT_THROTTLE_RATES": {
        "anon": "60/minute",
        "user": "600/minute",
    },
}
SPECTACULAR_SETTINGS = {
    "TITLE": "NeuroNest Core API",
    "VERSION": "1.0.0",
    "COMPONENT_SPLIT_REQUEST": True,
}
CORS_ALLOWED_ORIGINS = [
    o
    for o in os.getenv(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8081,http://localhost:5174",
    ).split(",")
    if o
]
CORS_ALLOW_CREDENTIALS = False
# Deployment supplies this for the cookie-session web front end named in the release gates.
# Django ignores an unread name, so read it here rather than letting the setting silently do nothing.
CSRF_TRUSTED_ORIGINS = [o for o in os.getenv("CSRF_TRUSTED_ORIGINS", "").split(",") if o]
USE_TZ = True
TIME_ZONE = "Asia/Kolkata"
LANGUAGE_CODE = "en-in"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
STATIC_URL = "/static/"
MEDIA_ROOT = Path(os.getenv("PRIVATE_MEDIA_ROOT", str(BASE_DIR / "private-media")))
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
DATA_UPLOAD_MAX_MEMORY_SIZE = 12 * 1024 * 1024
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_ISSUER = os.getenv("SUPABASE_ISSUER", f"{SUPABASE_URL}/auth/v1" if SUPABASE_URL else "")
SUPABASE_AUDIENCE = os.getenv("SUPABASE_AUDIENCE", "authenticated")
SUPABASE_JWKS_URL = os.getenv(
    "SUPABASE_JWKS_URL",
    f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json" if SUPABASE_URL else "",
)
# This project uses Supabase's asymmetric ES256 signing key. Never accept an
# HMAC algorithm here: it would let a public API key become a signing secret.
SUPABASE_JWT_ALGORITHMS = tuple(
    value.strip()
    for value in os.getenv("SUPABASE_JWT_ALGORITHMS", "ES256").split(",")
    if value.strip()
)
SUPABASE_PUBLISHABLE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY", "")
# Firebase ID tokens are verified against Google's public JWKS. The API key is
# only used by the optional username/password bridge; it is not a signing secret.
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "").strip()
FIREBASE_ISSUER = (
    f"https://securetoken.google.com/{FIREBASE_PROJECT_ID}" if FIREBASE_PROJECT_ID else ""
)
FIREBASE_JWKS_URL = (
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
)
FIREBASE_JWT_ALGORITHMS = ("RS256",)
FIREBASE_WEB_API_KEY = os.getenv("FIREBASE_WEB_API_KEY", "")
FIREBASE_SERVICE_ACCOUNT_JSON = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON", "")
_identity_provider = os.getenv("IDENTITY_PROVIDER", "").strip().casefold()
IDENTITY_PROVIDER = _identity_provider or ("firebase" if FIREBASE_PROJECT_ID else "supabase")
if IDENTITY_PROVIDER not in {"firebase", "supabase"}:
    raise ImproperlyConfigured("IDENTITY_PROVIDER must be firebase or supabase")
if PRODUCTION:
    if IDENTITY_PROVIDER == "firebase" and not (
        FIREBASE_PROJECT_ID
        and FIREBASE_ISSUER
        and FIREBASE_JWKS_URL
        and FIREBASE_SERVICE_ACCOUNT_JSON
    ):
        raise ImproperlyConfigured(
            "Production requires Firebase Auth settings and a server-only service account"
        )
    if IDENTITY_PROVIDER == "supabase" and not (
        SUPABASE_URL
        and SUPABASE_ISSUER
        and SUPABASE_JWKS_URL
        and SUPABASE_PUBLISHABLE_KEY
        and SUPABASE_JWT_ALGORITHMS
    ):
        raise ImproperlyConfigured("Production requires configured Supabase Auth settings")
SERVICE_TOKEN = os.getenv("ENGINE_SERVICE_TOKEN", os.getenv("SERVICE_TOKEN", "")).strip()
DIAGNOSTIC_URL = os.getenv("DIAGNOSTIC_URL", "http://localhost:8002")
ASSISTANT_URL = os.getenv("ASSISTANT_URL", "http://localhost:8001")
PATIENT_AI_ENABLED = os.getenv("PATIENT_AI_ENABLED", "false") == "true"
MILESTONE_AI_ENABLED = os.getenv("MILESTONE_AI_ENABLED", "false").strip().lower() == "true"
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "").strip()
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "").strip()
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")
LIVEKIT_URL = os.getenv("LIVEKIT_URL", "")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY", "")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "")
CLAMAV_HOST = os.getenv("CLAMAV_HOST", "")
LOCAL_TEST_SCANNER = os.getenv("LOCAL_TEST_SCANNER", "false") == "true" and DEMO_MODE
S3_BUCKET = os.getenv("S3_BUCKET", "")
AWS_REGION = os.getenv("AWS_REGION", "ap-south-1")
S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL")
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "amqp://guest:guest@localhost:5672//")
OUTBOX_WORKER_ENABLED = os.getenv("OUTBOX_WORKER_ENABLED", "false").lower() == "true"
OUTBOX_SCHEDULER = os.getenv("OUTBOX_SCHEDULER", "")
OUTBOX_DISPATCH_TOKEN = os.getenv("OUTBOX_DISPATCH_TOKEN", "")
if CELERY_BROKER_URL.startswith("amqps://"):
    import ssl

    CELERY_BROKER_USE_SSL = {"cert_reqs": ssl.CERT_REQUIRED}
CELERY_TASK_ALWAYS_EAGER = os.getenv("CELERY_TASK_ALWAYS_EAGER", "false") == "true"
CELERY_CONTROL_QUEUE_EXCLUSIVE = True
CELERY_EVENT_QUEUE_EXCLUSIVE = True
CELERY_BEAT_SCHEDULE = {
    "outbox": {"task": "api.tasks.dispatch_outbox", "schedule": 10.0},
    "reminders": {"task": "api.tasks.create_reminders", "schedule": 300.0},
}
EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "notifications@localhost")
EMAIL_HOST = os.getenv("EMAIL_HOST", "")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "true") == "true"
if PRODUCTION:
    SECURE_SSL_REDIRECT = True
    SECURE_REDIRECT_EXEMPT = [r"^health/$"]
    SESSION_COOKIE_SECURE = CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
