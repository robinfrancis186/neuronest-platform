#!/usr/bin/env python3
"""Small executable contract checks for configuration; never reads secret values."""

import json
import os
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[1]
os.environ.setdefault("DOCKER_CONTEXT", "colima-neuronest")
config = json.loads(
    subprocess.check_output(["docker", "compose", "config", "--format", "json"], cwd=root)
)
services = config["services"]
for name, service in services.items():
    for port in service.get("ports", []):
        assert port.get("host_ip") == "127.0.0.1", f"{name}: unexpected public binding"
for name in ("assistant", "diagnostic"):
    assert "DATABASE_URL" not in services[name]["environment"], f"{name}: database access leak"
    assert set(services[name]["networks"]) == {"engines"}, f"{name}: unexpected network access"
    assert not services[name].get("ports"), f"{name}: engine must be private"
for origin in (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8082",
    "http://127.0.0.1:8082",
):
    assert origin in services["core"]["environment"]["CORS_ALLOWED_ORIGINS"].split(",")
assert services["worker"]["volumes"][0]["source"] == services["core"]["volumes"][0]["source"]
core = services["core"]["environment"]
assert core["IDENTITY_PROVIDER"] == "firebase", "core: Firebase Auth must be selected"
assert core["FIREBASE_PROJECT_ID"], "core: Firebase project ID is required"
assert core["FIREBASE_WEB_API_KEY"], "core: Firebase web API key is required"
assert core["FIREBASE_SERVICE_ACCOUNT_JSON"], "core: Firebase service account is required"
assert core["TRUST_PROXY_HEADERS"] == "false", "core: local Compose must not trust proxy headers"
assert core["USERNAME_RATE_LIMIT_HMAC_KEY"], "core: username rate-limit HMAC key is required"
assert "SUPABASE_PUBLISHABLE_KEY" not in core, "core: Supabase Auth key must not be configured"
assert not any(key.startswith("OIDC_") for key in core), "core: stale OIDC configuration"
assert (root / ".env").stat().st_mode & 0o077 == 0, ".env permissions must stay private"
print(
    "PASS: loopback bindings, isolated AI, shared private records, Firebase identity, private local config"
)
