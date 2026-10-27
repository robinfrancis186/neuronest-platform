from django.urls import include, path
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from api import views as v
from api.payment_demo import create_demo_checkout, demo_checkout_status
from api.milestones import MilestoneCheckInViewSet
from api.operations import OperationsViewSet, policies
from api.app_guide import assistant_guide
from api.demo_booking import prepare_demo_bookings

router = DefaultRouter()
router.register("operations", OperationsViewSet, basename="operations")
for prefix, view in [
    ("children", v.ChildViewSet),
    ("guardianships", v.GuardianshipViewSet),
    ("grants", v.GrantViewSet),
    ("records", v.RecordViewSet),
    ("attachments", v.AttachmentViewSet),
    ("observations", v.ObservationViewSet),
    ("milestone-checkins", MilestoneCheckInViewSet),
    ("parent-questionnaires", v.ParentQuestionnaireViewSet),
    ("goals", v.GoalViewSet),
    ("growth", v.GrowthViewSet),
    ("vaccinations", v.VaccinationViewSet),
    ("therapy-sessions", v.TherapySessionViewSet),
    ("referrals", v.ReferralViewSet),
    ("practitioners", v.PractitionerViewSet),
    ("provider-applications", v.ProviderApplicationViewSet),
    ("slots", v.SlotViewSet),
    ("appointments", v.AppointmentViewSet),
    ("payments", v.PaymentViewSet),
    ("messages", v.MessageViewSet),
    ("notifications", v.NotificationViewSet),
    ("content", v.ContentViewSet),
    ("resources", v.ResourceViewSet),
    ("screenings", v.ScreeningViewSet),
    ("audit", v.AuditViewSet),
    ("privacy-requests", v.PrivacyRequestViewSet),
]:
    router.register(prefix, view, basename=prefix)
urlpatterns = [
    path("v1/policies/", policies),
    path("health/", v.health),
    path("v1/readiness/", v.readiness),
    path("v1/demo-bookings/prepare/", prepare_demo_bookings),
    path("v1/payment-demo/", create_demo_checkout),
    path("v1/payment-demo/<str:order_id>/", demo_checkout_status),
    path("v1/auth/username/sign-in/", v.username_sign_in),
    path("v1/auth/username/claim/", v.username_claim),
    path("v1/auth/identity/link/", v.firebase_identity_link),
    path("v1/me/", v.me),
    path("v1/preferences/", v.preferences),
    path("v1/assistant/", v.assistant),
    path("v1/assistant-guide/", assistant_guide),
    path("v1/exports/", v.exports),
    path("v1/webhooks/razorpay/", v.razorpay_webhook),
    path("v1/internal/scheduler/", v.scheduler_dispatch),
    path("v1/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("v1/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
    path("v1/", include(router.urls)),
]
