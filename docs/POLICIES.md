# Commercial and retention policy configuration

BUSINESS_POLICY_PATH points to a UTF-8 JSON file mounted inside the core container. The checked-in policy file is a test-only fixture that defines the supported schema. Unknown fields, invalid ranges, booleans used as money/ranges, oversized files and unsupported schema versions fail closed. No configurable expressions or executable policies are accepted.

The test-only policy fixture uses synthetic-local-2026-09-v1. Its zero commission, full refund and retention numbers are test fixtures, not proposed business terms or Indian legal retention advice. Production has no fallback: a file with environment: production, approval.status: approved, an approval evidence reference, reviewer identity, timezone-aware past approval timestamp and a new version is required. Setting these values records the operator's attestation; it does not obtain legal or clinical approval. Live Razorpay keys remain separately disabled.

The fixed schema contains:

| Field                              | Supported behavior                                                                                    |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `schema_version`                   | Exactly `1`                                                                                           |
| `version`                          | Nonempty immutable release identifier, up to 100 characters                                           |
| `booking.hold_minutes`             | Reservation timeout, 1–60 minutes, capped at appointment start                                        |
| `fees.platform_fee_bps`            | Commission 0–10,000 basis points; integer paise, commission rounded down, provider receives remainder |
| `cancellation.notice_hours`        | Threshold 0–720 hours before appointment                                                              |
| `cancellation.refund_percent`      | Guardian cancellation at or before threshold, 0–100 percent                                           |
| `cancellation.late_refund_percent` | Guardian cancellation after threshold, 0–100 percent                                                  |
| `retention.*_days`                 | Clinical, financial, audit and conversation review thresholds, each 1–36,500 days                     |

New bookings preserve the entire selected policy on `Appointment.policy_snapshot`, alongside the consultation fee snapshot. Editing the active file affects new bookings only. Cancellation records the applicable refund limit and timestamp under the snapshot while holding the appointment lock; later time changes cannot change that decision. Provider cancellations and expired holds permit full refunds. Requesting a refund still requires verified capture and reconciliation checks. Transferring provider earnings applies the preserved commission; it does not recalculate from the current file.

Retention values identify review thresholds; they do not authorize automatic deletion of retained clinical, financial or audit records. Deletion execution records the active policy version and approval state, deactivates the account and revokes access, then preserves records with an explicit retention hold. A signed, approved disposition and backup lifecycle process remain operational prerequisites to irreversible erasure. This distinction is exposed by the policy response and privacy execution receipt.

`GET /v1/policies/` returns configuration readiness and consumer terms. Internal approval identity/reference is visible only to operations accounts. A production policy configuration failure prevents new bookings and policy-dependent financial changes with HTTP 503. Existing appointments without a snapshot require operations review in production; only isolated tests use the synthetic policy.

# Operations queue and dispute review

`GET /v1/operations/?offset=0` is administrator-only and returns up to 100 delivery items and 100 payment events. Follow `next_offset` until null. Responses exclude payloads, child/actor identifiers, provider bodies and exception text. Queue reads are audited.

`POST /v1/operations/{outbox-id}/retry/` accepts a reason of `configuration_restored`, `provider_recovered` or `reviewed_transient_failure`. It resets failed allowlisted notification, scanning or room-revocation jobs for the existing durable dispatcher. Completed/running jobs cannot be replayed. Financial event kinds are denied; use the existing payment reconciliation/refund/transfer actions, which verify provider evidence and enforce idempotency. Notifications have stable local references, while external transport delivery can be at least once after uncertain provider acknowledgement.

`POST /v1/operations/{payment-event-id}/resolve-dispute/` accepts `resolution` (`evidence_submitted`, `provider_closed`, or `escalated`) and a compact `evidence_reference` without whitespace or clinical narrative. The event must already match a recorded payment. A closure is idempotent and cannot be silently replaced. Every review is audited. This endpoint tracks the operator's reviewed provider evidence; it does not submit a dispute to Razorpay, adjudicate it, refund money, or modify the payment ledger. Unmatched events must first use payment reconciliation.

Verification: `services/core/.venv/bin/python services/core/manage.py test api.test_operations`. This covers policy rejection, immutable price/refund decisions, production configuration gates, redacted queues, authorization, unsafe retry denial, and dispute tracking without money movement.
