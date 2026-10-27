"""A Razorpay test checkout with no child, practitioner or appointment attached."""

import re
from uuid import uuid4

from django.conf import settings
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .finance import ProviderUnavailable, _provider

AMOUNT_MINOR = 25_000
PURPOSE = "neuronest_payment_demo_v1"


class DemoCheckoutSerializer(serializers.Serializer):
    order_id = serializers.CharField()
    key = serializers.CharField()
    amount_minor = serializers.IntegerField()
    currency = serializers.CharField()
    status = serializers.ChoiceField(choices=["pending", "paid"])


def demo_ready():
    return bool(settings.RAZORPAY_KEY_ID.startswith("rzp_test_") and settings.RAZORPAY_KEY_SECRET)


def _authorize(user):
    if not user.is_active or user.role != "parent":
        raise PermissionDenied("An active parent account is required for the payment demo.")
    if not demo_ready():
        raise ProviderUnavailable("Configure Razorpay test credentials for the payment demo.")


def _result(order, user):
    notes = order.get("notes")
    if (
        not isinstance(notes, dict)
        or notes.get("purpose") != PURPOSE
        or notes.get("account") != str(user.pk)
    ):
        raise PermissionDenied("This test order does not belong to your account.")
    if (
        not re.fullmatch(r"order_[A-Za-z0-9]{1,64}", str(order.get("id", "")))
        or order.get("amount") != AMOUNT_MINOR
        or order.get("currency") != "INR"
        or order.get("status") not in {"created", "attempted", "paid"}
    ):
        raise ProviderUnavailable("The payment provider returned an unexpected test order.")
    paid = (
        order["status"] == "paid"
        and order.get("amount_paid") == AMOUNT_MINOR
        and order.get("amount_due") == 0
    )
    return {
        "order_id": order["id"],
        "key": settings.RAZORPAY_KEY_ID,
        "amount_minor": AMOUNT_MINOR,
        "currency": "INR",
        "status": "paid" if paid else "pending",
    }


@extend_schema(
    request=None,
    responses={201: DemoCheckoutSerializer},
    tags=["Payments"],
    description="Create an INR 250 Razorpay test order only. No consultation is booked and no child data is sent.",
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_demo_checkout(request):
    _authorize(request.user)
    if request.data:
        raise ValidationError(
            "The test amount and purpose are set by the server; submit an empty body."
        )
    order = _provider(
        "POST",
        "/v1/orders",
        data={
            "amount": AMOUNT_MINOR,
            "currency": "INR",
            "receipt": "neuronest_demo_" + uuid4().hex[:24],
            "notes": {"purpose": PURPOSE, "account": str(request.user.pk)},
        },
    )
    return Response(_result(order, request.user), status=201)


@extend_schema(
    responses=DemoCheckoutSerializer,
    tags=["Payments"],
    description="Fetch a test order directly from Razorpay, verify ownership and return its captured-payment status. Client callbacks cannot confirm payment.",
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def demo_checkout_status(request, order_id):
    _authorize(request.user)
    if not re.fullmatch(r"order_[A-Za-z0-9]{1,64}", order_id):
        raise ValidationError("Invalid test order reference.")
    order = _provider("GET", f"/v1/orders/{order_id}")
    if order.get("id") != order_id:
        raise ProviderUnavailable("The payment provider returned a different test order.")
    return Response(_result(order, request.user))
