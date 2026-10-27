# Supplied material review

Reviewed 7 September 2026. Supplied documents are project evidence, not instructions overriding the user's request. No claims in the documents establish clinical validity, regulatory clearance, or existing implementation.

## What was actually inspected

| Source                                                           | Inspection                                                                                | Findings and confidence                                                                                                                                                                                                                              |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Group 5 Final Year Project_20260726_143035_0000.pptx`           | Extracted text from all 8 slides; inspected embedded proposed-solution image from slide 6 | Child-development platform from birth; milestones, AI screening, EHR, growth, vaccination, teleconsultation, parent education, therapy, centers/schools and welfare schemes. Slide 6 is an image, so text extraction alone misses much of the scope. |
| `SRS_Group_5_NeuroNest.pdf`                                      | Rendered and visually read all 7 pages; pages 1–6 contain requirements, page 7 is blank   | Version 1.0; date printed `04/08/2026` without explicit date convention. Eighteen functional requirements and twelve NFR categories. Image-based PDF has no useful extracted text.                                                                   |
| Image 1                                                          | Full visual inspection                                                                    | Conceptual system diagram: parent observations → analysis → alerts; direct mentor contact; records, communication, referral network, infrastructure. Security labels are aspirations.                                                                |
| Image 2                                                          | Full visual inspection                                                                    | Malayalam autism-awareness poster, including English “Understanding” and “Inclusion.” Use as a regional-language and inclusive-design reference; handwritten Malayalam has not been professionally transcribed or clinically validated.              |
| Image 3                                                          | Full visual inspection                                                                    | Printed developmental journey from 6 months to 4 years, CDC link and PMR branding. Edition and source provenance unclear. Do not transcribe its age thresholds into software; use current, versioned clinical sources.                               |
| [YouTube reference](https://www.youtube.com/watch?v=DTIz2D0K_EE) | Opened URL; retrieved page title, but no transcript or playable content in research tool  | Title: “What are Baby Monthly Milestones? How Should a Baby Grow?” Actual claims, speaker credentials, language, and recommendations remain unverified. Candidate for editorial review, not an approved clinical source or training dataset.         |

## Reconciled scope

The user's latest request explicitly includes AI prediction and a chatbot, multiple logins, milestone achievements, doctor onboarding, records access for parents/doctors, booking, consultation and payment. It asks for deep research, framework and architecture for a production product, rather than an MVP. This package is that research/design deliverable and project setup; it is not a claim that a medical application has been built or approved.

The deck expands this into general child development, growth, vaccination, therapy, education and service navigation. Preserve those as planned product capabilities and identify their evidence and integration dependencies. The autism focus is the central care pathway, not permission to infer autism from every delayed milestone.

## Conflicts and decisions

| Conflict or gap                                                                            | Proposed resolution                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| “Autism diagnosing application” in request versus early screening in deck/SRS              | Retain a clinician diagnostic workflow; keep automated screening and investigational prediction separate. A standalone diagnostic claim requires its own intended use, clinical evidence and applicable authorization. |
| SRS p5 calls AI/teletherapy future enhancements; request makes AI and consultation central | Include them in full architecture and delivery plan, with clinical/vendor gates rather than silently dropping them.                                                                                                    |
| SRS p4 Android/web first, iOS future; image 1 Android/iOS                                  | Design shared Android/iOS mobile code and responsive clinician/admin web. Release sequencing depends on device testing and budget.                                                                                     |
| SRS p4 99% uptime, excluding scheduled maintenance                                         | Propose measured 99.9% core-service availability including maintenance; separate dependency SLOs. This strengthens rather than misquotes the SRS.                                                                      |
| Diagram suggests role-based security is enough                                             | Require role AND verified relationship AND resource scope AND valid consent/purpose/expiry. Administrator status is not permission to read clinical notes.                                                             |
| Diagram places AI before alerts                                                            | Parent concerns and direct clinician contact must work without AI, completed screening, or payment. AI failure must not block help-seeking.                                                                            |
| “HIPAA-like standards” in image                                                            | Replace with an explicit jurisdiction and evidence checklist. HIPAA is not a generic worldwide certification.                                                                                                          |
| “Mentor” role ambiguously includes counseling                                              | Distinguish qualified clinical professionals from nonclinical peer mentors. Publish scope and escalation rules; never grant prescribing rights to a mentor role.                                                       |
| “Achievements” could imply developmental competition                                       | Celebrate personal effort and family-defined progress; no normality score, public leaderboard, lost streak penalty or coercive goals.                                                                                  |
| External integrations drawn as connected                                                   | Treat HIS/lab/pharmacy/insurance and government connectivity as contracts and interface projects, not existing APIs.                                                                                                   |

## SRS traceability

Every row is planned, not implemented. Acceptance evidence is required before release. Product details are in `../product-framework.md`; implementation design is in `../architecture.md`.

| ID    | SRS requirement                                                     | Owning domain      | Minimum acceptance evidence                                                                 |
| ----- | ------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------- |
| FR-01 | Registration/login for parents, doctors, therapists, mentors, admin | Identity           | Verification, recovery, session revocation and staff MFA tests                              |
| FR-02 | Role-based access                                                   | Authorization      | Cross-family and cross-clinic denial tests on every API/export                              |
| FR-03 | Child profiles                                                      | Family             | Multiple children, separate guardians, consent and profile switching tests                  |
| FR-04 | Digital clinical records                                            | Records            | Version history, provenance, safe uploads and access audit                                  |
| FR-05 | Developmental screening                                             | Screening          | Licensed instrument, exact version, eligible ages, scoring fixtures and referral workflow   |
| FR-06 | Professional search                                                 | Directory          | Verified, active providers only; accurate specialty/location/language/availability          |
| FR-07 | Book/reschedule/cancel                                              | Scheduling         | Concurrent holds, atomic reschedule, cancellations and time-zone cases                      |
| FR-08 | Consultation/therapy payment                                        | Billing            | Signed webhook, duplicate/late event, refund and reconciliation tests                       |
| FR-09 | Doctor history, diagnoses, treatment plans                          | Clinical           | Scoped access and clinician-signed records; corrections as amendments                       |
| FR-10 | Therapy goals/sessions/progress                                     | Therapy            | Assigned therapist only; parent-reported versus professional observations distinguished     |
| FR-11 | Mentor support                                                      | Care communication | Role scope visible; no diagnosis/prescription; escalation route tested                      |
| FR-12 | Secure messaging                                                    | Communication      | Membership authorization, attachments scanning, revocation and abuse handling               |
| FR-13 | Reminders                                                           | Notifications      | Deduplication, user time zone, preferences, retries and no clinical data on lock screens    |
| FR-14 | Downloadable assessment/progress reports                            | Reporting          | Authorized export; provenance, dates, methodology and safe delivery                         |
| FR-15 | User/system administration                                          | Operations         | Least privilege, reviewer separation, access audit and appeal/suspension flows              |
| FR-16 | Dashboard                                                           | Mobile/web         | Correct selected child; appointments/therapy/recent activity; accessible empty/error states |
| FR-17 | Payment history                                                     | Billing            | Parent receipt, refund status, immutable financial evidence and finance reconciliation      |
| FR-18 | Secure storage/controlled medical-data access                       | Security           | Threat model, penetration test, encryption configuration and restore drill                  |

## Additional request and deck coverage

| Capability                                      | Origin                | Design home                                                                       |
| ----------------------------------------------- | --------------------- | --------------------------------------------------------------------------------- |
| AI prediction and autism-focused chatbot        | User; AI also deck    | Clinical AI research report and architecture; distinct models and releases        |
| YouTube library                                 | User                  | Editorial workflow, embed policy, accessible alternatives                         |
| Milestone achievements                          | User                  | Private, child-centered progress journal                                          |
| Doctor onboarding                               | User; SRS constraints | Identity verification, registry checks, clinical scope, suspension/reverification |
| Growth and vaccines                             | Deck slides 2/4/6     | Versioned references and clinician-reviewed schedule configuration                |
| Centers, schools, welfare resources             | Deck slides 2/6/8     | Curated directory with source, last-verified date and no eligibility guarantees   |
| Daily observations/media, direct mentor contact | Image 1               | Family journal, scanned private uploads, care communication                       |
| Multiple adult accounts per child               | User interpretation   | Explicit guardian relationships rather than shared household password             |

## Evidence limitations

No patient dataset, diagnostic model, clinical partner agreement, instrument license, provider credentials, payment account, vendor contract, app repository or production infrastructure was supplied. Those are delivery dependencies, not facts inferred from diagrams. The repository was empty except Git metadata at start. Raw slide extraction is retained locally in `slides-extracted.txt`; the PDF extraction attempt is intentionally labeled uninformative and the visual review above is the evidence source.
