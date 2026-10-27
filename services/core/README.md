# NeuroNest core

Django/DRF owns identity mappings, families, consent, records, development, marketplace, scheduling, financial state and outbox events. Diagnostic and assistant engines are called over authenticated HTTP and never receive database credentials.

## Run locally

```sh
uv venv --python 3.13 .venv
uv pip install --python .venv/bin/python -r requirements.txt
.venv/bin/python manage.py migrate
.venv/bin/python manage.py runserver 0.0.0.0:8000
```

Set `IDENTITY_PROVIDER=firebase` and `FIREBASE_PROJECT_ID` before starting. Parent username/password sign-in also needs `FIREBASE_WEB_API_KEY` and the complete server-only `FIREBASE_SERVICE_ACCOUNT_JSON`; production requires that service account to check revoked Firebase sessions. Create a family account through the web or mobile client, confirm its email in Firebase, then the first authenticated `/v1/me/` request provisions a local `parent` account. Provider subjects are stored separately and receive an opaque, unclaimed placeholder until the family chooses its username; they never grant care access based on the UID's shape. Development validates Firebase RS256 ID tokens against Google's JWKS; production uses Firebase Admin revocation checks. The core keeps all roles and child-record access server-owned; clinician and operations accounts require the existing approval workflow and a Firebase second-factor session in production.

The core never joins a Firebase identity to a legacy local account based on email ownership or a confirmation click. A matching Firebase identity receives `409 {"code":"firebase_identity_link_review_required", "detail":"..."}` from normal access and the legacy-link endpoint; neither path writes a Firebase subject. Before an authorized operator records an audited mapping, support must complete an independent identity review because control of a new Firebase email may not prove control of a recycled or shared legacy email address. First-time verified Firebase identities without a matching local account continue through parent provisioning.

Run `python manage.py test api --noinput`. Point `DATABASE_URL` at a disposable PostgreSQL instance to run the overlapping-interval exclusion constraint and concurrent-booking test. SQLite is a developer convenience; it does not prove PostgreSQL locking.

OpenAPI: `/v1/schema/`; Swagger UI: `/v1/docs/`. Lists are arrays. Errors include `detail`. Private responses prohibit caching.

## Background processing

```sh
celery -A neuronest worker --loglevel=INFO
celery -A neuronest beat --loglevel=INFO
# Local recovery/testing without a broker:
python manage.py drain_outbox
```

Database outbox records retain retries and dead-letter state (`attempts >= 8`), with a five-minute delivery lease. Attachment scans recheck upload authority; absence of ClamAV never releases a file. Accepted files are delivered through an authenticated gateway, never public object URLs. Revocation jobs remove affected video participants; failures remain retryable in the outbox.

## Deployment controls

The hosted core runs as a Vercel function with Firebase Authentication and Supabase PostgreSQL. Use `ENVIRONMENT=production`, a random `DJANGO_SECRET_KEY`, a Supabase transaction-pooler `DATABASE_URL`, TLS, `IDENTITY_PROVIDER=firebase`, `FIREBASE_PROJECT_ID`, and a complete `FIREBASE_SERVICE_ACCOUNT_JSON`. Add `FIREBASE_WEB_API_KEY` for the parent-only username/password bridge. Firebase's issuer and JWKS URL derive from the project ID. `DB_SSLMODE=verify-full` and `DB_SSLROOTCERT=/var/task/certs/supabase-root.crt` verify PostgreSQL TLS. Keep Firebase Admin credentials and Supabase service-role/database credentials out of clients. A legacy Supabase identity with the same email must go through a controlled identity-link review; the core never links it automatically. The username/password bridge has a PostgreSQL-backed rolling eight-attempt-per-minute limiter that stores only HMACed client-IP and normalized-username keys. Its existing five-minute reminder scheduler removes no more than one bounded batch of inactive state at a time. With `TRUST_PROXY_HEADERS=true`, Vercel deployments prefer the platform-provided `X-Vercel-Forwarded-For` client address; a verified non-Vercel proxy may use `X-Forwarded-For`. Production readiness and the endpoint fail closed when trusted configuration, a valid client address, or the cleanup scheduler is unavailable. `USERNAME_RATE_LIMIT_HMAC_KEY` is optional and defaults to the server-only Django secret, but a separately rotatable server secret is preferred.

Vercel functions do not run the Celery worker, beat, ClamAV, or model-training pipeline. Leave their dependent hosted capabilities unavailable until separately managed services are configured and qualified.

Razorpay writes accept sandbox keys only. Client checkout success never changes financial state; HMAC-verified provider events and reconciliation do. Duplicate captures and refunds are idempotent. Late captures enter reconciliation and cannot take another booking. Outbound provider writes persist intent before calling the provider; ambiguous results require reconciliation. Route activation/KYC and reversal after a completed transfer need the provider workflow; no settlement success is invented.

The clinician chart is immutable after signing at both API and database levels. Corrections create linked signed amendments. Operational admins cannot read child records. Non-sharing caregivers receive explicit scopes; old guardian authority stops at adulthood pending review.

Patient AI context defaults off and requires `PATIENT_AI_ENABLED=true` plus a fresh explicit request and valid child access; the assistant service must independently allow it. Licensed questionnaires and clinical prediction remain unavailable without approved rights/artifacts. The diagnostic service can expose M-CHAT-R/F only when its server-only content and hash-bound license/clinical approval receipts are present. Consent/retention, credential verification, clinical evidence and real processor agreements are external launch gates, test fixtures do not satisfy them.
