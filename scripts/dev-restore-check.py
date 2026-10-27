#!/usr/bin/env python3
"""Restore the local core database into an isolated disposable database."""

import hashlib
import os
from pathlib import Path
import subprocess
import time
import uuid

os.chdir(Path(__file__).resolve().parents[1])
os.environ.setdefault("DOCKER_CONTEXT", "colima-neuronest")
source = os.getenv("RESTORE_SOURCE_DATABASE", "neuronest")
user = os.getenv("RESTORE_DATABASE_USER", "neuronest")


def run(service, *args, data=None):
    result = subprocess.run(
        ["docker", "compose", "exec", "-T", service, *args],
        input=data,
        capture_output=True,
    )
    if result.returncode:
        raise RuntimeError(result.stderr.decode()[-1800:])
    return result.stdout


def portable_dump(database, *kind):
    return run(
        "postgres",
        "pg_dump",
        "-U",
        user,
        "--no-owner",
        "--no-privileges",
        *kind,
        database,
    )


def digest(data):
    lines = (
        line
        for line in data.splitlines()
        if not line.startswith(b"\\restrict") and not line.startswith(b"\\unrestrict")
    )
    return hashlib.sha256(b"\n".join(lines)).hexdigest()


started = time.monotonic()
backup = run(
    "postgres", "pg_dump", "-U", user, "--format=custom", "--no-owner", source
)
target = f"nn_restore_{uuid.uuid4().hex[:12]}"
created = False
try:
    run("postgres", "createdb", "-U", user, target)
    created = True
    run(
        "postgres",
        "pg_restore",
        "-U",
        user,
        "--exit-on-error",
        "--no-owner",
        "-d",
        target,
        data=backup,
    )
    assert digest(portable_dump(source, "--schema-only")) == digest(
        portable_dump(target, "--schema-only")
    ), "Restored schema differs from the source database."
    assert digest(portable_dump(source, "--data-only", "--inserts")) == digest(
        portable_dump(target, "--data-only", "--inserts")
    ), "Restored data differs from the source database."
    print(
        f"PASS: restored {len(backup)} bytes in {time.monotonic() - started:.1f}s; schema and data matched without fixture accounts."
    )
finally:
    if created:
        run("postgres", "dropdb", "-U", user, target)
