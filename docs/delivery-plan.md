# NeuroNest delivery and launch plan

Status: implementation and release plan, 7 September 2026. The local engineering baseline in the [readiness ledger](READINESS.md) is implemented; this document tracks the remaining product, clinical, operational and release work. It is the complete-product delivery sequence, not an MVP scope reduction. Clinical prediction has a separate evidence schedule; no calendar date can substitute for its approval gates.

## Team and decision authority

Proposed delivery team: product/engineering lead, mobile engineer, backend engineer, web engineer, QA/accessibility engineer, part-time platform/security engineer, product designer, clinical lead, clinical operations coordinator, and ML/data scientist. Add a biostatistician and regulatory/privacy counsel for the relevant workstreams. Some engineering roles can be combined if capacity allows; clinical responsibility cannot be assigned to an AI agent.

Establish a compensated family/autistic-person advisory group and at least one developmental-care partner before finalizing claims and clinical workflows. A source-backed design review is useful preparation, but it is not a substitute for interviews, clinical observation or institutional approval. No clinicians or organizations were contacted during this research.

| Decision                                | Accountable                  | Consulted                                                               |
| --------------------------------------- | ---------------------------- | ----------------------------------------------------------------------- |
| Scope, launch market and spending       | Product owner                | Engineering, clinical lead, finance                                     |
| Diagnostic/screening claims and safety  | Clinical lead                | Regulatory specialist, biostatistician, patient advisors                |
| Infrastructure and authorization        | Engineering lead             | Security/privacy owners                                                 |
| Research protocol and predictor release | Clinical research lead       | Ethics body, statistician, regulatory owner                             |
| Chatbot content and escalation          | Clinical lead                | Content reviewers, language reviewers, engineering                      |
| Money reconciliation/refunds            | Finance owner                | Payment provider, backend, support                                      |
| Launch go/no-go                         | Named operator/product owner | Required sign-off from clinical, privacy/security and operations owners |

## Work packages and dependency order

Durations are rough planning estimates for a staffed team, not quotes or commitments. Several streams overlap. Clinical studies, permissions, procurement and store review can dominate the schedule.

| Package                                      | Indicative effort window                | Deliverables                                                                                                                                            | Exit evidence                                                                                          |
| -------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| A. Product and clinical definition           | 2–4 weeks                               | Confirm jurisdiction, audience, intended use, languages, provider model; family/clinician research; risk/claims register; instrument licensing requests | Signed product baseline; accountable clinical operator; no unresolved contradiction in intended use    |
| B. Security and design foundation            | 3–5 weeks                               | Accessible UX prototypes, account/guardian model, threat model, database/API design, data retention, vendor contracts, environments/CI                  | Reviewed authorization design and negative test plan; device/vendor integration feasibility            |
| C. Identity, records and provider operations | 5–8 weeks                               | Adult accounts, children, consent, records/media, clinician onboarding, audit, basic directory/admin                                                    | End-to-end cross-family denial, grant/revoke, credential expiry, upload and restore tests              |
| D. Care and financial lifecycle              | 5–8 weeks, overlaps C                   | Slot holds, rescheduling, checkout, refunds, reconciliation, video, clinician notes, therapy, communication                                             | Concurrency and payment fault tests; attended/failed consultation scenarios; trained operations owners |
| E. Developmental and content workflows       | 4–7 weeks, overlaps C/D                 | Milestones, reviewed growth/vaccine references, licensed screening, library, localized copy, directory/schemes                                          | Clinical reference-case checks, content rights inventory and caregiver usability evidence              |
| F. Governed assistant                        | 4–8 weeks after corpus/claims decisions | Reviewed retrieval corpus, safe task routes, citations, isolation, evaluation, optional fine-tuning experiment                                          | Clinician-approved safety/comprehension evaluation, red-team results, disable/rollback exercise        |
| G. Production qualification                  | 4–6 weeks after core integration        | Load/security/accessibility/device testing; backup restore; incident drills; staffed controlled rollout                                                 | All applicable release gates pass; operational handover; accurate store submission                     |
| H. Diagnostic prediction programme           | Separate, not credibly estimable yet    | Clinical protocol, ethics/rights, representative data, model development, external/prospective study, classification and approvals                      | Independent clinical and regulatory decision; no release solely because engineering finished           |

A reasonable budgeting conversation can start with a roughly 6–9 month engineering horizon for the care platform under these staffing assumptions, but this is an internal estimate with substantial uncertainty, not a researched market benchmark. A new clinical diagnostic product can take materially longer. Re-estimate after discovery, vendor spikes and clinical protocol design.

No module is silently removed: all requested capabilities are represented in the framework. A complete release can wait for all relevant gates, or an operator can approve separate releases with accurate claims. Experimental diagnosis cannot be publicly enabled simply to avoid the word “MVP.”

## Concrete initial backlog

The table includes implemented engineering workflows alongside remaining reviewable delivery work. Confirm their release evidence against the [readiness ledger](READINESS.md) rather than treating a local implementation as a production approval.

| Work item                           | Dependency                    | Acceptance criteria                                                                                                                  |
| ----------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Confirm product/claim register      | Product owner + clinical lead | Country, ages, audience, supported languages and exact medical claims recorded                                                       |
| Validate mobile integration choices | Proposed architecture         | Android/iOS development build exercises payment sandbox, video permissions/rejoin, push and secure local storage on physical devices |
| Establish repository/runtime        | Architecture approved         | Mobile, clinician web and API run locally with isolated test data; pinned dependencies, environment template and CI                  |
| Account and session security        | Identity choice               | Verified account, recovery, staff MFA, revocation; no tokens in analytics                                                            |
| Child and guardian relationship     | Identity                      | Parent A cannot see Parent B's child; caregiver limited scope; custody/revocation workflow                                           |
| Consent enforcement                 | Relationship model            | Per-category purpose/expiry permissions enforced on list/detail/search/export/download/jobs                                          |
| Provider verification               | Operations policy             | Submission/review/rejection/approval/suspension/expiry with audit; no self-granted doctor status                                     |
| Records ingestion                   | Consent + storage             | Quarantine/scan/metadata validation; no cross-child overwrite; parent report versus signed note distinguished                        |
| Booking transaction                 | Provider availability         | Concurrent attempts cannot double-book; timezone/DST boundary and reschedule rollback tested                                         |
| Gateway and finance                 | Booking + merchant approval   | Signed events, duplicate/out-of-order/late payment, currency mismatch, refund retry and daily reconciliation                         |
| Consultation                        | Booking + scoped chart        | Participant authorization, short-lived room credentials, rejoin, failed-call resolution, signed note                                 |
| Milestones and personal goals       | Child model + content review  | Age/reference version retained; uncertain and regressed observations supported; no competitive scoring                               |
| Screening                           | License + clinical protocol   | Exact scoring fixtures, age gates, incomplete/follow-up states and concern bypass                                                    |
| Assistant                           | Corpus + processing contracts | No cross-family retrieval; tested abstention and escalation; every factual answer traceable to reviewed sources                      |
| Production readiness                | All above                     | Security/load/device evidence, monitored rollout, restores, staff training and sign-offs                                             |

## Budget framework

Do not buy infrastructure from an invented user forecast. Establish three scenarios before procurement: pilot cohort, expected launch load and stress load. For each, record active families, concurrent sessions, bookings/month, average consultation minutes, document/media volume, retention years, assistant turns and escalation staffing.

Monthly operating cost model:

`compute + database/backup + object storage + egress + authentication/SMS + video participant-minutes + AI input/output/embedding usage + observability + payment/refund fees + support/clinical operations`

One-time and programme costs: instrument/content rights, design, engineering, independent security assessment, legal/regulatory work, research coordination, participant recruitment, clinical reference assessments, translation validation, insurance and store/vendor onboarding. Clinical studies need their own budget; they are not a “model training” line item.

Obtain current written quotes and confirm region, taxes, processor contracts, retention, marketplace settlements and minimum commitments. No external purchases, accounts or paid resources have been created in this setup.

## Launch evidence matrix

| Risk                                 | Required test/evidence                                                                   | Release response if it fails                            |
| ------------------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Another family sees a record         | Independent authorization tests across every endpoint, async job and media path          | Stop release; incident process if real data involved    |
| Revoked doctor still retrieves notes | Expiry/revocation test including active sessions, exports and pending jobs               | Stop affected access path; reduce cache/link scope      |
| Wrong child selected                 | Profile-switch draft tests and patient confirmation at sensitive actions                 | Block submission until identity is clear                |
| Duplicate slot or lost money         | Database concurrency test, duplicate/late/out-of-order payment events and reconciliation | Disable booking/payment until repaired; staffed refunds |
| Unqualified provider consults        | Credential fraud/expiry/suspension tests and reviewer evidence                           | Remove new availability; resolve existing bookings      |
| Clinically misleading screen         | Licensed reference cases, age/language/protocol checks and clinician review              | Disable instrument until corrected and revalidated      |
| AI invents or leaks                  | Clinical safety set, prompt injection, cross-child retrieval, harmful reassurance tests  | Disable AI, retain human care navigation                |
| Alert has no owner                   | Simulated concerning report at/outside service hours                                     | Do not imply monitored triage; establish coverage       |
| Data loss                            | Restore isolated backup and measure RPO/RTO with reconciliation                          | No production release until proven recoverable          |
| Inaccessible app                     | Real assistive-technology and caregiver task testing                                     | Resolve critical task blockers before release           |
| Consent not understood               | Comprehension study in supported languages                                               | Revise notice/flow before collecting sensitive data     |
| Video unavailable                    | Provider outage and poor-network drills                                                  | Show actionable rejoin/support/reschedule policy        |
| Hidden third-party disclosures       | Data-flow review including crash logs, AI, embeddings, video and embeds                  | Remove or contract/consent appropriately                |
| Unproven diagnostic claims           | Claims-to-evidence review of UI, stores and marketing                                    | Remove unsupported claim; keep model gated              |

## Operational runbooks to implement

- **Security/privacy incident:** detect → contain → preserve necessary evidence → identify affected data/users → engage privacy/legal lead → meet applicable reporting deadlines → communicate appropriately → remediate and verify. Keep clinical continuity actions explicit.
- **Payment discrepancy:** reconcile provider ledger to internal orders → quarantine mismatch → prevent duplicate fulfillment/refund → finance review → update user status → confirm settlement. Never “fix” a record by deleting a transaction.
- **Clinical concern:** follow a clinician-approved escalation protocol with urgency, ownership and operating hours. No unstaffed red badge should imply a clinician is watching.
- **Provider suspension:** stop new booking and access as appropriate → review upcoming cases → notify affected families without disclosing confidential allegations → reassign/refund → preserve audit.
- **Database recovery:** isolate restore → verify record integrity and replay/reconcile durable events → rotate compromised credentials if relevant → validate access grants → controlled reopening.
- **AI rollback:** disable model/version → preserve safety incident metadata without excessive sensitive logs → restore approved version or educational fallback → clinical review → new evaluation before re-enable.

## Open decisions and assumptions

| Decision                  | Current decision or proposal                                                                   | Needed before                                           |
| ------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Launch market             | India, confirmed by user                                                                       | State/operator-specific legal/vendor scope finalization |
| Age range                 | Children/adolescents confirmed; exact cutoffs open; instruments restricted to validated ranges | Clinical protocol and UX                                |
| Language                  | English; Malayalam candidate based on supplied image                                           | Content production and validation                       |
| Platform                  | Shared Android/iOS parent app, responsive clinical/admin web                                   | Framework lock and device matrix                        |
| Operating model           | Platform coordinates care with contracted qualified professionals                              | Contracts, liability, payments                          |
| Diagnostic AI             | Separately governed clinician-assistance development                                           | Dataset acquisition and medical claims                  |
| Payments                  | India-capable hosted aggregator; Razorpay candidate, not purchased                             | Live transactions and provider payouts                  |
| Video/AI/cloud processors | Procurement comparison still required                                                          | Any real patient data processing                        |
| Clinical content owners   | Named reviewers required                                                                       | Public education/screening release                      |
| Clinical record retention | Counsel/clinical operator-defined per data class                                               | Production storage/erasure automation                   |

## What this workspace proves

It contains inspected source requirements, sourced research, a product framework, technical architecture, delivery plan, runnable local mobile/web/API projects, separate AI engines, test evidence and deployment configuration. It does not contain a signed native release, contracted doctors, a live payment gateway, a clinically promoted diagnostic model, completed clinical studies, or a production deployment. Those cannot be inferred from local implementation or planning documents.
