#!/usr/bin/env python3
"""Live local service checks; secrets stay inside their owning containers."""

import os
import subprocess
from pathlib import Path

os.environ.setdefault("DOCKER_CONTEXT", "colima-neuronest")
os.chdir(Path(__file__).resolve().parents[1])


def check(service, code):
    subprocess.run(
        ["docker", "compose", "exec", "-T", service, "python", "-"],
        input=code,
        text=True,
        check=True,
    )


check(
    "core",
    """
import json, os, time, urllib.request
import jwt
for name, url in [('core', 'http://localhost:8000/health/'), ('assistant', os.environ['ASSISTANT_URL']+'/health'), ('diagnostic', os.environ['DIAGNOSTIC_URL']+'/health')]:
    with urllib.request.urlopen(url, timeout=10) as response:
        assert response.status == 200
    print('PASS: '+name+' health reachable from core')
for origin in ('http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:8082', 'http://127.0.0.1:8082'):
    request = urllib.request.Request('http://localhost:8000/v1/children/', method='OPTIONS', headers={'Origin': origin, 'Access-Control-Request-Method': 'GET'})
    with urllib.request.urlopen(request, timeout=10) as response:
        assert response.headers.get('Access-Control-Allow-Origin') == origin
print('PASS: web and Expo preview CORS for localhost and 127.0.0.1')
token = jwt.encode({'iss': os.environ['LIVEKIT_API_KEY'], 'exp': int(time.time())+30, 'video': {'roomList': True}}, os.environ['LIVEKIT_API_SECRET'], algorithm='HS256')
request = urllib.request.Request(os.environ['LIVEKIT_INTERNAL_URL']+'/twirp/livekit.RoomService/ListRooms', data=b'{}', headers={'Authorization': 'Bearer '+token, 'Content-Type': 'application/json'})
with urllib.request.urlopen(request, timeout=10) as response:
    assert isinstance(json.load(response).get('rooms', []), list)
print('PASS: LiveKit authenticated room API reachable from core')
""",
)
check(
    "worker",
    """
import io, os
import clamd
from neuronest.celery import app
scanner = clamd.ClamdNetworkSocket(host=os.environ['CLAMAV_HOST'], port=int(os.environ['CLAMAV_PORT']), timeout=45)
assert scanner.ping() == 'PONG'
assert scanner.instream(io.BytesIO(b'Clean attachment sample'))['stream'][0] == 'OK'
eicar = b'X5O!P%@AP[4\\\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
assert scanner.instream(io.BytesIO(eicar))['stream'][0] == 'FOUND'
print('PASS: ClamAV clean acceptance and EICAR rejection')
replies = app.control.inspect(timeout=10).ping()
assert replies and all(r.get('ok') == 'pong' for r in replies.values())
print('PASS: Celery worker receives authenticated broker requests')
""",
)
