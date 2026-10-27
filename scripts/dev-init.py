#!/usr/bin/env python3
"""Create private local configuration without printing or replacing any secrets."""

import json
import os
import secrets
from pathlib import Path

root = Path(__file__).resolve().parents[1]
env = root / ".env"
if not env.exists():
    text = (root / ".env.example").read_text()
    text = (
        "\n".join(
            line.replace("generate-locally", secrets.token_urlsafe(36))
            if "=generate-locally" in line
            else line
            for line in text.splitlines()
        )
        + "\n"
    )
    fd = os.open(env, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w") as stream:
        stream.write(text)
values = dict(
    line.split("=", 1)
    for line in env.read_text().splitlines()
    if "=" in line and not line.lstrip().startswith("#")
)
assert all(
    values.get(key) and values[key] != "generate-locally"
    for key in (
        "DJANGO_SECRET_KEY",
        "POSTGRES_PASSWORD",
        "RABBITMQ_PASSWORD",
        "LIVEKIT_API_SECRET",
        "ENGINE_SERVICE_TOKEN",
    )
)
if values.get("IDENTITY_PROVIDER", "").strip().casefold() != "firebase":
    raise SystemExit("Set IDENTITY_PROVIDER=firebase in .env before starting NeuroNest.")
for key, placeholder in {
    "FIREBASE_PROJECT_ID": "your-firebase-project-id",
    "FIREBASE_WEB_API_KEY": "replace-with-firebase-web-api-key",
}.items():
    if not values.get(key) or values[key] == placeholder:
        raise SystemExit(f"Set {key} in .env before starting NeuroNest.")
try:
    service_account = json.loads(values.get("FIREBASE_SERVICE_ACCOUNT_JSON", ""))
except json.JSONDecodeError as exc:
    raise SystemExit("Set FIREBASE_SERVICE_ACCOUNT_JSON to one-line service-account JSON.") from exc
if (
    not isinstance(service_account, dict)
    or service_account.get("type") != "service_account"
    or service_account.get("project_id") != values["FIREBASE_PROJECT_ID"]
    or not isinstance(service_account.get("client_email"), str)
    or not service_account["client_email"].strip()
    or not isinstance(service_account.get("private_key"), str)
    or not service_account["private_key"].strip()
):
    raise SystemExit(
        "FIREBASE_SERVICE_ACCOUNT_JSON must be a complete service account for FIREBASE_PROJECT_ID."
    )
os.chmod(env, 0o600)
print("Local .env ready (private; existing values preserved).")
