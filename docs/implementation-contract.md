# NeuroNest implementation contract

Shared integration contract for this build. JSON REST `/v1/`, trailing slash accepted; UUID/string identifiers; ISO-8601 timestamps; list endpoints return arrays. Errors return `{detail: string}` plus optional field errors. Child-scoped resources use `?child=<id>` for reads and `child` in POST bodies. Server revalidates every relationship. Never rely on the active child selected in the UI for authorization.

## Identity

- `GET /health/` health; `GET /v1/readiness/` capability statuses without secrets.
- Accounts sign up and recover passwords through Firebase Authentication. The clients send Firebase ID tokens as `Authorization: Bearer`; the core validates Firebase issuer, RS256 JWKS signature, project audience, expiry, subject, authentication time, and verified email. A first verified family sign-in provisions a local `parent` account. Firebase profile/custom claims are never accepted as a role or child-access grant; clinician and operations accounts require server-side approval and a Firebase second-factor session in production.
- `GET /v1/me/` → `{id,email,display_name,role}`. Roles `parent,doctor,therapist,mentor,admin`.
- A verified Firebase identity that matches a legacy local account receives `409 {code:"firebase_identity_link_review_required"}` from normal access. `POST /v1/auth/identity/link/` with `{ "confirm": true }` also returns that review requirement and never stores a Firebase subject. Support must independently verify the claimant before an authorized operator records a mapping; new verified Firebase identities with no matching local account still receive a new parent account.

## Family and records

- `/v1/children/` GET POST `{name,date_of_birth,language}`; PATCH detail. Child `{id,name,date_of_birth,language}`.
- `/v1/guardianships/` GET POST `{child,email,relationship,can_share}`; POST detail `/revoke/`.
- `/v1/grants/` GET POST `{child,recipient,scopes,expires_at,purpose}`; POST detail `/revoke/`. `scopes` array e.g. `records,observations,therapy,screening`; parent authority checked. Recipient is user ID; directory returns it.
- `/v1/records/` GET POST `{child,kind,title,body}`; detail POST `/sign/` clinician, `/amend/ {body,reason}`; `kind` note/report/prescription/assessment. Response includes `status,author_name,created_at`.
- `/v1/attachments/` multipart POST `{child,file}`; GET list; detail `/content/` authorized download. Quarantine until scan accepted.
- `/v1/exports/` POST `{child}`; authorized export response or job with download URL; revoke rechecked.
- `/v1/audit/` scoped history; `/v1/privacy-requests/` GET POST `{kind,detail,child?}`. `adult_transition` requires the historical adult record in `child`; it then uses operator `/review/ {subject,evidence_reference}`, subject `/accept/ {accept:true}`, and an audited `/revoke-transition/` correction workflow. `deletion` uses documented operator `/review/ {evidence_reference,retention_holds}`, `/execute/`, and `/restore/`; it disables account access but does not claim automatic medical/financial-record erasure.

## Development and care

- `/v1/observations/` GET POST `{child,domain,title,status,note,observed_on}`. status `observed,not_yet,unsure,lost`; source distinct from clinical diagnosis.
- `/v1/goals/` GET POST `{child,title,description,target_date}`; PATCH detail `{status}` (`active,achieved,paused`).
- `/v1/growth/` GET POST `{child,measured_on,weight_kg,height_cm}`. Do not invent reference percentiles.
- `/v1/vaccinations/` GET POST `{child,name,administered_on,due_on,note}`.
- `/v1/therapy-sessions/` GET POST `{child,practitioner,scheduled_at,note}`; PATCH detail status/note within scope.
- `/v1/referrals/` GET POST `{child,reason,destination}`.
- `/v1/practitioners/` public verified directory; response `{id,user,display_name,specialty,profession,languages,fee_minor,verified,status,bio}`. `/v1/provider-applications/` GET POST; admin detail `/review/ {status,reason}`.
- `/v1/slots/` GET `?practitioner=id`; POST clinician `{starts_at,ends_at}`; response `{id,practitioner,starts_at,ends_at,available}`.
- `/v1/appointments/` GET; POST `{child,slot}` holds slot, snapshots price; response `{id,child,practitioner,provider_name,starts_at,status,amount_minor,hold_expires_at}`. detail `/cancel/`, `/reschedule/ {slot}`, `/complete/`, `/join/`.
- /v1/payments/ GET; POST {appointment} creates a Razorpay checkout only when payment readiness is configured; /v1/webhooks/razorpay/ accepts signed provider events. Responses include id, appointment, status, amount_minor, provider_order_id and checkout. /refund/ is an explicit command. Real callbacks never trust client success.
- `/v1/operations/` administrator-only redacted durable queue; detail `/retry/ {reason}` accepts only allowlisted nonfinancial deliveries. `/v1/operations/{payment-event}/resolve-dispute/ {resolution,evidence_reference}` records reviewed evidence and cannot move money. `GET /v1/policies/` reports sanitized policy readiness.
- `/v1/messages/` GET `?child=id`; POST `{child,recipient,body}`; care relation/grant required for staff; parent selects verified recipient. Response author/display timestamp. No public inbox.
- `/v1/notifications/` GET; detail `/read/`; `/v1/preferences/` GET PATCH language/email/push.

## Content, assistant and screening

- `/v1/content/` reviewed articles/videos: `{id,title,summary,language,kind,url,review_status,source_url}`; admin POST/review. `/v1/resources/` curated centers/schools/schemes.
- /v1/screenings/instruments/ lists instruments and disabled/license status; /v1/screenings/ GET POST {child,instrument_id}; detail /submit/ {answers} and /review/ {note}. No copyrighted questions without rights. Until rights-cleared instruments are supplied, screening stays unavailable and never represents an autism diagnosis.
- `/v1/assistant/` POST `{message,language,child?,include_records?:false}` → `{answer,language,citations:[{title,url}],escalation,status}`. Core calls separate service with minimal approved context; no direct AI database access.
- Diagnostic FastAPI `GET /health`, `GET /instruments`, `POST /screen {instrument_id,date_of_birth,language,answers}`, `POST /predict {subject_id,features}`; assistant FastAPI `GET /health`, `POST /chat {message,language,context?:{subject_id,records},request_id}`. Internal `X-Service-Token` required for protected engine calls. Configure URLs and secret via env; do not silently fall back to clinical predictions.

Core engineer may add necessary fields/endpoints, but must update this file and notify frontend/mobile/main before changing existing shapes. Missing external credentials return clear unavailable readiness and actionable error. Parent, clinician and operations UX must show actual API-backed data and states.
