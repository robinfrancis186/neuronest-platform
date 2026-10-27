"""Fixed fictional providers for the explicitly enabled project-review checkout."""
from copy import deepcopy
from io import StringIO
from django.core.management import call_command
from drf_spectacular.utils import extend_schema, OpenApiTypes
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from .errors import Unavailable
from django.conf import settings

DOCTORS = (
    (100, "Demo Dr. Asha — test only", "General pediatrics"),
    (150, "Demo Dr. Nila — test only", "Developmental pediatrics"),
    (200, "Demo Dr. Arun — test only", "Pediatric neurology"),
    (300, "Demo Dr. Mira — test only", "Child psychiatry"),
)
REASON = "NeuroNest project-review fixture. Fictional provider; no clinical service."
POLICY_VERSION = "project-review-test-booking-v1"


def sandbox_ready():
    return bool(settings.SANDBOX_BOOKING_ENABLED and settings.RAZORPAY_KEY_ID.startswith("rzp_test_") and settings.RAZORPAY_KEY_SECRET)


def is_demo_practitioner(practitioner):
    user = practitioner.user
    return user.role == "doctor" and practitioner.profession == "doctor" and any(
        practitioner.fee_minor == fee * 100
        and user.email == f"review-doctor-{fee}@example.invalid"
        and user.display_name == name
        and practitioner.registration_number == f"PROJECT-DEMO-{fee}"
        and practitioner.verification_reason == REASON
        and not user.has_usable_password()
        for fee, name, _ in DOCTORS
    )


def is_demo_appointment(appointment):
    return (is_demo_practitioner(appointment.practitioner)
            and appointment.policy_snapshot.get("version") == POLICY_VERSION
            and appointment.policy_snapshot.get("environment") == "synthetic")


def booking_policy():
    from .policies import _read_policy
    policy = _read_policy(settings.BASE_DIR / "config" / "policies" / "demo.json", False)
    policy["version"] = POLICY_VERSION
    policy["approval"]["reference"] = "Project review: test bookings only, no clinical service or real charges."
    return deepcopy(policy)



@extend_schema(request=OpenApiTypes.OBJECT, responses=OpenApiTypes.OBJECT, tags=["Appointments"])
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def prepare_demo_bookings(request):
    """Only fixed fictional fixtures can be prepared; no supplied profile or account data."""
    if request.user.role != "parent" or not request.user.is_active:
        raise PermissionDenied("An active parent account is required for the project demo.")
    if not sandbox_ready():
        raise Unavailable("Project-demo bookings require enabled Razorpay test credentials.")
    if request.data:
        raise ValidationError("The demo catalogue is fixed by the server; submit an empty body.")
    call_command("seed_demo_doctors", allow_production_test_profiles=True, stdout=StringIO())
    return Response({"status": "ready", "profiles": len(DOCTORS), "mode": "sandbox"})
