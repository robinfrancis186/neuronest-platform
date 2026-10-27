# NeuroNest operations

## Local development

From the repository root:

```sh
./scripts/dev-up
npm run dev:web
python3 scripts/dev-check.py
python3 scripts/dev-service-check.py
npm run test:video
DOCKER_CONTEXT=colima-neuronest docker compose ps
```

Copy .env.example to .env and set `IDENTITY_PROVIDER=firebase`, `FIREBASE_PROJECT_ID`, `FIREBASE_WEB_API_KEY`, and the complete one-line server-only `FIREBASE_SERVICE_ACCOUNT_JSON` before starting. Keep the Supabase database/cron settings for hosted PostgreSQL and scheduling. The service account enables local username sign-in and production token-revocation checks. `dev-up` generates local infrastructure configuration with mode 0600, builds services, and migrates PostgreSQL. It does not create application accounts. On Docker Desktop/Linux, set DOCKER_CONTEXT to your existing engine context.

| Service                | Local address                                       | Readiness                                                                          |
| ---------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Web                    | http://localhost:5173                               | Run `npm run dev:web`                                                              |
| Core                   | http://localhost:8000/health/                       | Database `SELECT 1`                                                                |
| Identity               | Firebase Authentication                             | Verified email session, completed username setup, and Firebase ID-token validation |
| PostgreSQL 17          | 127.0.0.1:5433                                      | `pg_isready`                                                                       |
| LiveKit signaling      | ws://localhost:7880                                 | Signed RoomService request; RTC TCP 7881 / UDP 7882                                |
| Assistant / diagnostic | `assistant:8001` / `diagnostic:8002` inside Compose | `/health`; no host publishing                                                      |
| RabbitMQ / ClamAV      | `rabbitmq:5672` / `clamav:3310` inside Compose      | Container health checks                                                            |
| Worker / beat          | No listening ports                                  | Celery `inspect ping`; worker logs; due outbox completion                          |

`GET /v1/readiness/` describes configured capabilities. A configured URL or credential is not proof that the external service is reachable. Diagnostic model inference and patient-context AI remain disabled until approved artifacts and intended-use validation are supplied.

Family enrollment starts with Firebase email/password sign-up. The person supplies their name, email and password, then verifies the email and completes username setup; the core provisions a local parent account after it verifies the Firebase ID token, and limits it until the username is claimed. In Firebase Authentication, enable Email/Password, add the Vercel domain and local development hosts to Authorized domains, configure the production email sender/template, and configure password-reset action handling. Do not grant staff roles through Firebase profile/custom claims: use the operator/provider approval workflow and require Firebase multi-factor authentication before staff access.

Before enabling public enrollment, inventory every Supabase identity and local parent account created by the interim flow. Firebase cannot receive Supabase password hashes. A fresh verified Firebase identity that has the same normalized email as a legacy local account receives `409` with code `firebase_identity_link_review_required`; neither normal access nor `POST /v1/auth/identity/link/` can write a mapping. Treat the Firebase email as a contact channel only: obtain independent proof under the support/operations identity-review process, record the evidence and reviewed link or removal decision, then have an authorized operator update the mapping with an audit entry before opening care access. Delete unconfirmed provisional identities and matching local accounts. A new verified Firebase email with no matching local account still provisions a parent account.

### Provider candidate staging

To add the Dr Keerthy S profile supplied by the product owner to the operations review queue, run:

```sh
services/core/.venv/bin/python services/core/manage.py seed_provider_candidate --account-email doctor@example.com
```

This stages a pending application only on an existing active account with a verified Firebase or legacy sign-in; it does not publish a practitioner. New applications default to the supplied English language and ₹250 consultation fee; existing nonzero fees are preserved for review. It deliberately has no registration number or availability. Operations must verify the registration and publish future availability after approval. Until those steps are complete, the candidate is not published as a bookable practitioner. The separate informational Care card has no linked account or in-app booking/payment action.

Local self-hosted LiveKit can disconnect a participant, and core denies newly requested join tokens after consent revocation. It cannot invalidate an already cached LiveKit JWT; a disconnected participant may reconnect with it, and LiveKit can refresh connected-session tokens beyond the original core-issued lifetime. This is a local limitation, not complete access revocation. Use a provider configuration with verified participant removal and token-revocation behavior before release. See [LiveKit token revocation behavior](https://docs.livekit.io/frontends/reference/tokens-grants/).

Firebase handles verification and password-reset delivery. LiveKit loopback ICE is for this Mac; physical mobile devices require an HTTPS API origin and a reachable TLS LiveKit host with correctly advertised ICE addresses.

To stop without losing data:

```sh
./scripts/dev-down
```

Named volumes retain PostgreSQL, broker state, private attachments, and antivirus signatures. Never run `down -v` against data you want to retain. Avoid running the host development API and Compose core on port 8000 simultaneously. ClamAV downloads/updates signatures on first boot; files remain quarantined until its real scanner returns a successful verdict.

Registry downloads may time out on this network; rerunning `dev-up` reuses completed layers. The ClamAV Debian image supports ARM64; the older Alpine 1.4 tag does not. Do not disable TLS checks or use an untrusted registry mirror.

## Firebase, Vercel and Supabase release configuration

Vercel hosts the web client and Django core API function. Firebase supplies identity; Supabase supplies PostgreSQL, storage and Cron. Set `VITE_API_URL` and Firebase's public `VITE_FIREBASE_*` variables in the web production environment. Set `FIREBASE_PROJECT_ID`, `FIREBASE_WEB_API_KEY`, and the core-only `FIREBASE_SERVICE_ACCOUNT_JSON` only in the API environment; never add a Firebase Admin credential or a Supabase service-role key to a client build. The core uses the Supabase transaction-pooler URL with `DB_SSLMODE=verify-full` and its bundled server root certificate.

Set `TRUST_PROXY_HEADERS=true` only in the Vercel **core** production environment, after independently verifying that the deployed trusted proxy supplies a valid, non-user-controlled client address through `X-Vercel-Forwarded-For`. A non-Vercel host must independently verify its forwarding configuration before relying on `X-Forwarded-For`. This lets the username/password bridge rate-limit the actual client instead of a shared proxy. Do not set it for a host that forwards a user-controlled header. Production username sign-in is deliberately unavailable in readiness and returns a generic credential `403` until that setting is explicit and the `reminders` scheduler heartbeat is fresh. Set a separate server-only `USERNAME_RATE_LIMIT_HMAC_KEY` for the durable rate-limit bucket hashes when possible; it defaults to `DJANGO_SECRET_KEY` if absent. Neither setting belongs in a web or mobile environment.

Vercel functions do not host Celery/RabbitMQ workers, ClamAV, or model-training jobs. The Supabase scheduler dispatches the durable outbox and bounded reminder maintenance; attachment acceptance, managed video revocation, and AI remain unavailable until their other services are configured, tested, and recorded in the readiness ledger. Private media also requires an approved S3-compatible object store and scanner.

### Hosted delivery scheduler

The hosted core keeps `api_outbox` as the delivery record. Supabase Cron wakes a bounded Django dispatcher through `pg_net`; the wake-up sends only the job name, never patient data. The dispatcher takes a database lease, rechecks current access before delivery, and records the readiness heartbeat.

Supabase Data API is disabled for this project; the web uses Firebase Authentication and the core API only. Keep it disabled and never expose the extension-owned `net` schema or the private `neuronest_internal` schema through a database API.

The deployment migration creates the private `neuronest_internal.dispatch_scheduler_job(text)` wrapper. Store the core scheduler URL and dispatch token in Supabase Vault, then set `OUTBOX_SCHEDULER=supabase_cron`, `OUTBOX_DISPATCH_TOKEN` to the same token, and `OUTBOX_WORKER_ENABLED=true` in the core production environment. Do not put that token in a client, repository, cron command, or support ticket.

After the core deployment is live, create the two database-owner jobs:

```sql
SELECT cron.schedule(
  'neuronest-outbox', '* * * * *',
  $$ SELECT neuronest_internal.dispatch_scheduler_job('outbox'); $$
);
SELECT cron.schedule(
  'neuronest-reminders', '*/5 * * * *',
  $$ SELECT neuronest_internal.dispatch_scheduler_job('reminders'); $$
);
```

The existing five-minute `reminders` job also removes one bounded batch of inactive HMACed username-rate-limit buckets. Do not add a separate rate-limit Cron job or expand the scheduler allowlist.

Verify recent `api_schedulerheartbeat.last_success_at` values for both `outbox` and `reminders`, plus `GET /v1/readiness/`, before relying on delivery or username sign-in. A stale heartbeat keeps dependent capabilities unavailable. Pause a job with `cron.alter_job` and inspect dead outbox rows before replaying payment-related work.

Before inviting users, enable Firebase Email/Password, configure authorized domains and production email delivery/action handling, and configure staff multi-factor enrollment. Confirm core Firebase ID-token and revocation verification, cross-family access denial, email-verification and recovery delivery, storage quarantine, payment webhook verification, and a database restore in the deployed environment.

## Recovery and maintenance

Enable the backup and recovery capability included with the selected Supabase plan, then test an isolated database restoration before enrollment. When private object storage is enabled, restore only matching authorized objects and record metadata; restrict restored identity and payment integrations before opening restored data. Preserve encryption keys and audit-retention rules during cleanup.

For routine releases, apply backward-compatible migrations, deploy the Vercel web and core projects, and verify the deployed health/readiness endpoints. Independently release and test any managed worker or engine service. A failed worker delivery remains in the durable outbox for bounded retry/dead-letter review; investigate provider state before replaying payment-related work. Rotate Vercel, Firebase Admin and Supabase secrets through their managed environment settings, then verify Firebase issuer/audience and revocation checks, webhook delivery, and room revocation after rotation.

Before any clinical deployment, complete organization-specific data-processing agreements, access reviews, retention/incident procedures, clinical validation and instrument rights, payment-provider onboarding, mobile device distribution, and a real restore drill. Infrastructure validation alone does not establish these external approvals.

## Verification record — 8 September 2026

- `python3 scripts/dev-check.py`: passed loopback publishing, engine network isolation, shared private volume, and private configuration permissions.
- `node scripts/smoke-api.mjs`: 54 checks passed against Compose core on port 8000, including isolation, clinician-record authority, revoked clinician denial, booking replay/competition, duplicate payment capture and cancellation.
- Compose PostgreSQL 17 migrations completed successfully. PostgreSQL, RabbitMQ, ClamAV, assistant, diagnostic, core, and the Celery worker reported healthy; beat and LiveKit were running.
- Firebase email verification, password recovery, and staff MFA must be accepted against the configured production project before invitation or enrollment.
- `python3 scripts/dev-service-check.py`: core and private-engine HTTP checks, authenticated LiveKit `ListRooms`, clean-file acceptance, EICAR-signature rejection, both localhost/127.0.0.1 browser origins on ports 5173/8082, and authenticated Celery worker ping all passed. TURN/firewall behavior, physical-device cameras and microphones, and production email/payment providers need their separate release checks.

- `npm run test:video` (`scripts/smoke-video.mjs`), verified by the integration run: two browser peers exchanged decoded video and audio using generated camera/microphone devices, recovered from forced signaling reconnection, and completed booking/payment, video, signed note and follow-up. Consent revocation returned a safe 403/404 denial for a fresh core join, and the actual worker removed the doctor from the active LiveKit room. This proves active disconnection and fresh-token denial locally; it does not prove rejection of a cached self-hosted JWT. Production still requires LiveKit Cloud cached-token revocation verification plus physical-device and network/TURN checks.
- `services/core/.venv/bin/python services/core/manage.py test api --noinput`: 73 tests passed, including adult-transition review/acceptance/revocation, retention-blocked account closure/restore, operations queue authorization, policy failure gates, payment-dispute payout holds, revoked clinician denial and clinical-record author authority.
- `npm run test:restore`: restored a disposable PostgreSQL copy and verified signed-record immutability, ledger state, revocation, family isolation and booking constraints. `npm run test:load` completed 80 authorized child-record reads across 8 local clients without leakage or hard failures; it is a bounded local smoke check, not a production capacity qualification.
- Web typecheck/tests/build passed. Browser acceptance needs a verified Firebase account in a configured project; mobile typecheck/tests and Expo platform export passed, while physical Android/iOS device checks remain release work.
