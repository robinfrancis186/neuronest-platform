from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework.exceptions import APIException
from rest_framework.response import Response


class Unavailable(APIException):
    status_code = 503
    default_detail = "This capability is unavailable until configured."


class Conflict(APIException):
    status_code = 409
    default_detail = "The requested state conflicts with the current state."


class IdentityLinkReviewRequired(Conflict):
    """Legacy account attachment needs proof beyond control of a new email."""

    default_code = "firebase_identity_link_review_required"
    default_detail = "This account cannot be linked automatically. Contact support to complete an identity review."


def exception_handler(exc, context):
    from django.core.exceptions import ValidationError as DjangoValidationError
    from django.db import IntegrityError
    from rest_framework.exceptions import ValidationError

    if isinstance(exc, DjangoValidationError):
        exc = ValidationError("Invalid identifier or field value.")
    if isinstance(exc, IntegrityError):
        exc = Conflict("This change conflicts with a data integrity constraint.")
    if isinstance(exc, IdentityLinkReviewRequired):
        return Response(
            {
                "code": exc.default_code,
                "detail": str(exc.detail),
            },
            status=exc.status_code,
        )
    response = drf_exception_handler(exc, context)
    if response is not None and isinstance(response.data, dict) and "detail" not in response.data:
        response.data = {"detail": "Please check the submitted fields.", **response.data}
    return response
