import httpx
from django.conf import settings
from .errors import Unavailable


def engine_call(engine, path, payload=None):
    if not settings.SERVICE_TOKEN:
        raise Unavailable("AI engine service authentication is not configured.")
    base = settings.DIAGNOSTIC_URL if engine == "diagnostic" else settings.ASSISTANT_URL
    try:
        response = httpx.request(
            "POST" if payload is not None else "GET",
            f"{base.rstrip('/')}{path}",
            json=payload,
            headers={"X-Service-Token": settings.SERVICE_TOKEN},
            timeout=35,
        )
        if response.status_code >= 500:
            raise Unavailable(f"{engine.title()} engine is temporarily unavailable.")
        if response.status_code >= 400:
            from rest_framework.exceptions import ValidationError

            data = response.json()
            raise ValidationError(data.get("detail", "The engine rejected this request."))
        return response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise Unavailable(f"{engine.title()} engine cannot be reached.") from exc
