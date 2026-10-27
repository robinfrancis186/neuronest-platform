# NeuroNest: compliance and clinical operations

Research checked 7 September 2026. **India is the confirmed launch market, serving children and adolescents.** This is an engineering and operating brief, not a legal opinion or evidence that NeuroNest is certified. Recheck the official instruments against the entity, states, services and release date with Indian counsel and a clinical lead.

## 1. Product boundary changes the obligations

NeuroNest combines a family records product, a clinical marketplace, educational content and potentially regulated decision software. Give each an explicit intended use. A disclaimer cannot neutralize actual diagnostic functionality or marketing.

CDSCO's official portal lists **final software guidance dated 21 July 2026**, superseding reliance on the October 2025 draft. The guidance covers medical-purpose software, including mobile/cloud products, and distinguishes nonmedical administrative/general-wellness software. Prediction may be a medical purpose. It addresses classification, QMS, clinical evidence, cybersecurity, submissions and postmarket work; it is guidance under existing MDR 2017, not a standalone new law. [CDSCO portal](https://www.cdsco.gov.in/opencms/opencms/en/Medical-Device-Diagnostics/Medical-Device-Diagnostics/) · [2026 guidance](https://www.cdsco.gov.in/opencms/export/sites/CDSCO_WEB/Pdf-documents/Guidance-document-on-Medical-Device-Software-under-MDR-2017.pdf)

**Recommended release control:** Maintain a claims register linking every app/store/website claim to evidence and approval. Obtain a written classification assessment for questionnaire interpretation, risk scoring, video analysis and chatbot personalization separately. Keep experimental prediction inaccessible to routine users until its approved intended use, clinical validation and applicable permissions are complete. The broader production platform can be engineered while this clinical work proceeds; its availability does not establish diagnostic readiness.

## 2. Privacy timing: enacted does not mean every provision is effective

The authoritative Act commencement notification is **G.S.R. 843(E), dated 13 November 2025**. Institutional provisions commenced on publication; section 6(9) and section 27(1)(d) follow after one year; most substantive processing/rights obligations and section 44(2) follow after eighteen months. Thus, on this research date the main DPDP obligations are still in their transition period. The notification states relative intervals; its Gazette heading is 13 November and its upload identifier contains 14 November. Schedule readiness conservatively for **13 November 2026 / 13 May 2027**, and obtain counsel's confirmed operative dates rather than borrowing a press headline. Do not treat the transition as permission to disregard existing IT Act/SPDI, confidentiality or contractual duties. [Official Act commencement notification](https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf) · [Government clarification of SPDI Rules](https://www.pib.gov.in/newsite/erelcontent.aspx?lang=2&reg=48&relid=74990)

The final Rules similarly commence rules 1, 2, 17–21 immediately, rule 4 after one year, and rules 3, 5–16, 22–23 after eighteen months. Rules 10–11 address verifiable parental consent and lawful guardianship. Rule 12's healthcare exemptions are conditional, not a blanket exemption for an app company. Rule 7 provides initial breach intimation without delay and detailed Board information within 72 hours, subject to permitted extension. Rules 6 and 8 contain one-year retention requirements whose application must be reconciled with clinical retention and erasure. [Final Rules, especially rules 1, 6–12 and Fourth Schedule](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf)

**Recommended implementation, beyond a legal minimum:**

- Separate adult login identity, child patient identity and guardian relationship. A shared password is not a family-permissions system.
- Verify the adult and their authority; retain minimal verification evidence, not unrestricted identity-document copies. Provide an assisted route for families unable to use the default verification provider.
- Record purpose-specific consent with notice version, actor, child, timestamp, language, evidence reference and withdrawal. Separate service delivery, doctor sharing, consultation recording and optional research/model training.
- Give a second guardian their own invitation and permissions. Handle custody disputes and revoked authority through a restricted human review process.
- At adulthood, reassess access and obtain the person's own choices. Autism alone must never automatically remove adult agency or grant parents permanent access; use a lawful-guardian route only where legally established.
- Do not use identifiable family records or conversations for fine-tuning by default. A separate research protocol, appropriate permissions and a data agreement must govern reuse.
- Maintain a per-data-class retention register: purpose, retention trigger, minimum/maximum, legal hold, approver and deletion method. Account closure must distinguish access removal from mandatory record retention and explain this clearly.
- Map every processor: cloud, SMS, crash reporting, video provider, support, payment, AI and embeddings. Contract for processing limits, subprocessors, incident deadlines, export/deletion and geographic processing. An India server alone does not stop overseas AI/logging transfers.

## 3. Record access is a relationship, not a role checkbox

Proposed authorization contract:

| Actor                   | Allowed scope                                    | Additional condition                                                        |
| ----------------------- | ------------------------------------------------ | --------------------------------------------------------------------------- |
| Parent/guardian         | Their linked child's permitted record categories | Active verified relationship; authority restrictions respected              |
| Consulting doctor       | Records needed for the agreed episode            | Verified provider, active care relationship and purpose/time/category grant |
| Invited therapist       | Relevant plan/progress fields                    | Separate professional scope and explicit grant                              |
| Reception/booking staff | Schedule/contact/payment status                  | No routine clinical narrative or video access                               |
| Support agent           | Redacted troubleshooting metadata                | Clinical access only through approved, expiring escalation                  |
| Clinical auditor        | Necessary case material                          | Named assignment, logged purpose and restricted export                      |
| AI processing worker    | Task's explicitly approved inputs                | Server-side service identity; no arbitrary chart browsing                   |

Every server request must check patient-level permissions; changing a child ID must never expose another family. Log reads, exports, grants, revocations and administrative access. Short-lived file links require authorization at issuance; sensitive downloads should expire promptly. Doctor discovery and booking alone must not grant the entire chart. Revocation stops future platform access, while legally retained clinical copies require a distinct policy. Test all these as negative cases.

## 4. Doctor onboarding and consultation

India's Telemedicine Practice Guidelines require platforms to perform RMP due diligence and display qualification, registration and contact information. They cover identity, consent, minors, recordkeeping and professional decisions about whether telemedicine is appropriate. **Section 5.4 restricts AI/ML platforms from patient counseling or prescribing; final counseling/prescription must be delivered directly by an RMP.** Treat a chatbot as education/navigation with escalation, not an autonomous clinical counselor. The source is the 25 March 2020 guidelines; legal review should confirm later amendments and relevant professional/state rules before launch. [Official MoHFW copy, especially sections 3 and 5](https://covid19dashboard.mohfw.gov.in/pdf/Telemedicine.pdf) · [Government statement confirming the framework](https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=1740756&lang=2&reg=48)

Proposed onboarding workflow: application → identity and current registration verification → qualifications/specialty/scope review → agreement and clinical policy training → payout verification → approval → periodic re-verification → suspension/appeal. Keep evidence and reviewer identity. An ABDM profile is useful corroboration, not a substitute for verifying current professional authority. Use separate credential paths for doctors, psychologists, speech-language professionals and occupational therapists; do not label all as physicians.

The consultation workflow should collect patient and guardian identity, consent, location/contact for escalation, relevant history and mode suitability. Clinicians can redirect to in-person assessment. Display appointment timezone, cancellation rules, provider availability, expected response and emergency limitations. Provide a failed-call/reschedule/refund path. Do not record calls by default. Signed notes and prescriptions are versioned; corrections append a visible amendment rather than silently overwriting history.

Operational owners must decide: who reviews safety concerns, response hours, coverage when a clinician is absent, safeguarding escalation, complaints, prescribing scope, retention, cross-border consultations and professional indemnity. These are staffing decisions that code cannot certify.

## 5. Payments and stores

Apple permits alternative payment methods for real-time one-to-one services such as medical consultations under 3.1.3(d); physical services consumed outside the app use other payment methods under 3.1.3(e). Digital content/features ordinarily need a separate store-billing assessment. Medical apps receive additional scrutiny under 1.4.1; accuracy claims require supporting methodology and users should be reminded to consult a doctor. Also prepare account deletion and privacy disclosures. [Apple review guidelines](https://developer.apple.com/app-store/review/guidelines/)

Google's clinical-services policy says regulated clinical-service transactions should not use Play Billing. Its health policy requires the health-app declaration and privacy disclosures, and distinguishes approved medical-device apps from other health apps, including disclaimers and reminders to seek professional advice. This does not mean an unapproved diagnostic device becomes lawful by adding a disclaimer. Paid educational videos or AI feature subscriptions need their own SKU/policy review. [Google health policy](https://support.google.com/googleplay/android-developer/answer/16679511?hl=en) · [Payments interpretation](https://support.google.com/googleplay/android-developer/answer/10281818?hl=en)

**Recommended payment design:** use a suitably authorized payment aggregator's hosted/tokenized checkout and its approved marketplace/settlement product. NeuroNest should not hold raw card details or invent an escrow/wallet. RBI restricted actual card-on-file storage in the payment chain outside issuers/networks. Confirm the provider's current authorization and the applicability of the 2025 PA directions at procurement; a provider's brand alone is insufficient. [RBI card-data restriction](https://www.rbi.org.in/scripts/NotificationUser.aspx?Id=12345)

Separate appointment, payment, refund and clinician payout states. Confirm payment from a verified provider webhook/API, never a browser success screen. Require event deduplication, currency/amount/order matching, atomic slot reservation, expiry, reconciliation and refund retry. Explicitly decide the merchant of record, tax/invoice responsibilities, cancellation fees, chargeback owner, settlement timing and what happens if the doctor cancels. Document these before live-money acceptance. Digital subscriptions and clinical booking must not be ambiguously bundled to bypass store rules.

## 6. Security and operational continuity

CERT-In's 2022 directions require covered entities to report specified incidents within six hours of noticing/being informed and retain ICT logs for a rolling 180 days within India. This is a separate regime from the phased DPDP breach rules. An initial report need not wait for a completed investigation. [CERT-In directions](https://www.cert-in.org.in/PDF/CERT-In_Directions_70B_28.04.2022.pdf) · [Official FAQ](https://www.cert-in.org.in/PDF/FAQs_on_CyberSecurityDirections_May2022.pdf)

Recommended production evidence: threat model; encryption and key controls; MFA for doctors/admins; least-privilege staff access; scrubbed logs; secure upload scanning; independent penetration test; processor inventory; tested restore; incident tabletop; monitored audit events; documented release rollback; dependency inventory. Prove backup recovery with a timed exercise, not a checkbox. Do not log diagnosis text, prompts, video URLs or tokens into general analytics. Configure lock-screen notifications to omit sensitive health detail.

Define service targets with the actual clinical operation: uptime, recovery time, recovery point, triage response, support response, reconciliation delay and refund completion. Set alert owners and out-of-hours coverage. Clinical safety incidents and software security incidents need linked but distinct review queues. Model rollout requires a versioned evaluation, explicit approval and immediate disable/rollback capability.

## 7. ABDM: optional interoperability workstream

ABDM describes a consent-based health-record exchange, including linking, viewing and sharing records. ABHA is voluntary; basic NeuroNest services should remain usable without it. An integration needs the applicable sandbox/onboarding/conformance work; a FHIR-shaped database alone does not make NeuroNest ABDM-integrated. [NHA FAQ](https://abdm.gov.in/FAQ)

Proposed adoption: preserve stable patient/provider identifiers and exportable clinical documents now; add ABDM connectors when a provider partner and consent-mediated exchange use case justify it. Keep local access grants distinct from ABDM exchange consent. Do not scrape government registries or collect Aadhaar merely because an ABHA-related option exists.

## 8. Launch gates and accountable owners

| Gate                       | Owner                                 | Evidence required before release                                                                                                           |
| -------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Launch market and operator | Founder + counsel                     | Countries/states, operating entity, marketplace/clinical responsibilities agreed                                                           |
| Clinical claim scope       | Clinical lead + regulatory specialist | Intended-use statement, classification opinion, claims register, applicable permissions                                                    |
| Child rights and privacy   | Privacy owner + counsel               | Guardian/consent design, privacy notices, retention schedule, processor contracts, rights workflow                                         |
| Provider readiness         | Clinical operations                   | Credential evidence, contracts, verified scope, training, escalation and coverage                                                          |
| Record confidentiality     | Security + engineering                | Patient-isolation tests, grant/revocation tests, export audit, penetration-test remediation                                                |
| Prediction release         | Clinical lead + ML lead               | Appropriate clinical study, external validation, subgroup analysis, approved thresholds, monitoring and regulatory clearance as applicable |
| Chatbot release            | Clinical lead + AI lead               | Education boundary, sourced corpus, refusal/escalation evaluation, incident review and kill switch                                         |
| Live payments              | Finance + engineering                 | Merchant/payout approval, tested reconciliation/refunds, contracts, invoices, store SKU decision                                           |
| Reliability                | Operations                            | Restore and rollback drills, monitoring, incident runbooks and named coverage                                                              |
| Public distribution        | Product + compliance                  | Store declarations, review credentials, accurate screenshots/claims and accessibility checks                                               |

No gate is satisfied merely by this research document. The project can become production-ready only when evidence, operating staff and external dependencies are in place alongside the software.
