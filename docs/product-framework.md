# NeuroNest product framework

Design baseline: 7 September 2026. Status: proposed production specification. India and children/adolescents are confirmed scope. English plus clinically reviewed Malayalam is a proposed language plan; exact age cutoffs and language rollout remain to be agreed. No feature described here is claimed to be implemented.

## Product purpose and boundary

NeuroNest should help families move from a concern to the right assessment and ongoing support, with a continuous record they can understand and share. The complete product includes family care, clinical workflows, operations, and governed AI. Production readiness means that each released function has tested behavior, accountable operators, security evidence and any required clinical authorization. It does not mean releasing experimental prediction merely to make every menu active.

Three distinct kinds of information must remain visible throughout the interface:

1. **Observation:** “Parent reported this skill on this date.” Can be uncertain and revised with history.
2. **Screening:** “This instrument and version produced this result; follow-up is pending/completed.” Uses a validated, authorized protocol for its eligible population.
3. **Clinical assessment:** “This professional recorded this assessment on this date.” Signed and attributable, with amendments rather than silent replacement.

A fourth label, **investigational model output**, is restricted to approved research until its own release gates pass. No score becomes a diagnosis just because the UI uses a medical icon. Clinical reasoning and related-work evidence are in [the clinical research report](research/clinical-ai-related-work.md).

## People and responsibilities

| Person                                 | Primary work                                                               | Permissions boundary                                                                                       |
| -------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Parent/legal guardian                  | Manage children, observations, records, appointments, consent and payments | Relationship to each child verified; no automatic access to unrelated siblings or another family's records |
| Invited caregiver                      | Contribute agreed observations and practical care tasks                    | Explicit limited grant; cannot necessarily consent to research, export charts or appoint another guardian  |
| Child/adolescent                       | Participate and express preferences in an age-appropriate way              | Supported assent and privacy review; never assume autism removes agency                                    |
| Registered doctor                      | Evaluate, document clinical conclusions, plan care, consult and refer      | Verified credentials and active, purpose-scoped patient access                                             |
| Therapist                              | Manage assigned therapy goals/sessions and relevant records                | Profession-specific scope; no automatic physician or prescribing authority                                 |
| Nonclinical mentor                     | Peer support and navigation                                                | No diagnosis, prescribing or unrestricted chart access                                                     |
| Clinical operations                    | Verify providers, manage care escalation and complaints                    | Named case assignment for any clinical information accessed                                                |
| Finance/support/content staff          | Reconcile money, solve problems, publish reviewed education                | Separate roles; operational access does not expose clinical narratives                                     |
| Clinical safety/privacy/security leads | Approve safe release and investigate incidents                             | Purpose-limited audited access and independent escalation                                                  |

One person may hold several roles, but permissions are evaluated for the current action and child. A clinician treating a relative must not bypass ordinary safeguards. Shared household passwords are unsupported.

## Family mobile app

Proposed navigation: **Today · Journey · Care · Library · Account**. A persistent child selector shows the selected child's name/photo or avatar and age. The system must repeat patient identity on screening submission, consent, upload confirmation and checkout; profile switching must clear drafts or explicitly preserve them under their original child.

### Today and onboarding

Adult account verification → notice and consent → child profile → authority verification → preferred language/accessibility → optional history import → dashboard. Do not require screening, a diagnosis, ABHA or a purchase to start a journal. Birth date changes trigger reviewed recalculation of age-dependent tasks and preserve earlier assessments' original context. Support unknown/approximate dates explicitly where clinically permissible; do not fabricate precision.

Today shows the next appointment, a small number of actionable care tasks and an obvious “I have a concern” route. Show appointment status from the backend and clearly identify pending payment, provider cancellation or unavailable service. Safety information remains reachable if AI fails.

### Journey, milestones and achievements

A timeline combines milestones, measurements, screening events and therapy goals while distinguishing sources. Each observation records definition/version, child age at observation, reporter, date, optional context and media. States include observed, not yet, unsure/not observed, not applicable and loss of a previously observed skill. Age calculations use calendar dates and the selected clinical protocol; prematurity correction is configurable only where the protocol supports it, never applied indiscriminately.

Achievement design: private celebrations for a personally meaningful goal, participating in a routine, documenting progress or attending care. Avoid developmental rankings, streak penalties, “normality percentages,” or rewards for hiding harmless autistic traits. Families can disable celebration effects. No child-to-child comparisons.

CDC's tracker is a useful reference for age-based monitoring and shareable summaries, but it explicitly does not replace validated screening. NeuroNest's broader age support must not extend any checklist beyond its defined population. [CDC Milestone Tracker](https://www.cdc.gov/MilestoneTracker)

### Screening and referral

Entry checks instrument license/version, eligible age, approved language, respondent and required consent. Save progress without interpreting an incomplete questionnaire. Display follow-up as a separate stage where the instrument requires it. On completion, show the meaning and limitations, next action and a way to contact care. A reassuring result never disables the concern pathway. Do not generate screening items or alter thresholds with an LLM.

Proposed path: concern → age-appropriate licensed assessment where suitable → clinician review/referral → appointment → diagnostic assessment if indicated → support plan. A family may enter at any point, including with an existing diagnosis. No mandatory paid consultation solely to view their own existing result.

### Older children and adolescents

The toddler-screening pathway is not the default for an older child. Offer a clinician-led intake covering developmental history, present concerns, communication/sensory preferences, school context and existing support. Obtain separate permission for school or teacher contributions and identify each source. A clinical lead must select and license any age-appropriate instruments and approve language versions; no older-child screening instrument is selected or implemented by this report.

Make consent and participation understandable to the young person, offer appropriate private communication with clinicians subject to applicable law/safeguarding, and record who can see sensitive notes. Do not automatically share every adolescent disclosure with every caregiver. Individual access restrictions need clinical/legal policy, clear explanation and enforceable record categories. Transition at adulthood requires a fresh authority review; a diagnosis alone never grants perpetual guardian control. Clinical assessment design follows the multi-source approach described in [NICE CG128](https://www.nice.org.uk/guidance/cg128/chapter/Recommendations), used here as clinical guidance rather than Indian law.

### Records and sharing

Records include uploaded reports, clinician notes, prescriptions, observations, vaccination evidence, growth entries, therapy records and screening history. Every item has author/source, date, patient, status and version. Parent-uploaded reports are labeled as such until verified; OCR is a draft aid, not a signed source. Allow users to see who accessed shared records and revoke future access.

Sharing presents recipient identity, record categories or specific records, purpose, duration and download policy before confirmation. Booking by itself does not share an entire chart. Consent revocation ends future access; clearly explain any clinical record retention or copies already lawfully obtained. Sensitive exports are generated only after fresh authorization and expire. A parent can request a correction without editing a clinician's signed conclusion.

### Finding care, booking and consultation

Search filters: profession, specialty, language, location, modality, accessibility, fee and genuine availability. Show verification status and date, qualifications, registration where applicable, total payable amount, cancellation policy and what the appointment provides. Sponsored placement must be labeled and must not imply clinical superiority.

Booking: select child and provider → slot held briefly by server → review scope/record sharing → gateway checkout → pending/confirmed server result → reminders → consultation. Handle network loss, slot expiry after payment, duplicate payment, cancelled provider, no-show, partial/failed refund and rescheduling. See architecture for state machines. Video includes pre-call permissions/device checks, accessible waiting room, rejoin and failed-call support. Recording is off by default and requires separate appropriate consent if offered.

After consultation: clinician signs summary and plan; parent sees instructions, next appointment and referral status. In-person assessment can be recommended. A completed booking is not proof that an assessment or diagnosis occurred.

### Therapy and mentoring

Therapists define agreed goals with baseline, observation method, review date and family priorities. Track sessions, home activities, tolerability and caregiver feedback. Graph progress within that child's plan without equating task completion with clinical improvement. Distinguish parent practice logs from therapist observations.

Mentor access is a separate communication channel with visible hours and scope. Messages are not monitored emergency care unless the organization genuinely staffs that service. Clinical questions escalate to an appropriately qualified clinician. Group communication, if implemented, needs explicit member invitations, moderation/reporting, and consent before sharing another participant's identity or records.

### Library and YouTube

The library is an editorial product, not an open search feed. Catalog fields: title, publisher, canonical URL/video ID, language, target audience/age/context, captions or accessible alternative, topic, reviewer, reviewed date, review due date, evidence references and rights status. Parent preferences may select relevant content; watching a video is not evidence of therapy completion or developmental improvement.

The supplied [video](https://www.youtube.com/watch?v=DTIz2D0K_EE) remains **pending review** because no transcript/content review was available. Do not claim endorsement, extract training examples or paraphrase uninspected medical claims.

Use official embedding/linking, user-initiated playback, recognizable controls and a clear notice of third-party loading. Never place child identifiers, screening results or health query terms in YouTube URLs. Provide a reviewed text alternative and report-content action; handle removed videos and disabled embedding gracefully. Google's privacy-enhanced mode is not a guarantee of zero third-party data collection; app WebView identity requirements must be implemented correctly. [YouTube embedding help](https://support.google.com/youtube/answer/171780?hl=en), [player requirements](https://developers.google.com/youtube/terms/required-minimum-functionality)

### Autism-focused assistant

Offer source-backed education, navigation and help organizing questions. Separate general education from access to a child's records. Personal-record retrieval requires current authorization on every request and must be disclosed. The assistant must not independently counsel, diagnose, prescribe, create a clinical note, grant chart access or confirm payment. Its output links to reviewed sources and identifies insufficient evidence.

Maintain the requested fine-tuning workstream, with measurable entry criteria: improve an observed deficiency in language, formatting or routing versus the same base model with reviewed retrieval. A model customized on autism material is not a validated diagnostician. Clinical and regulatory reports specify release boundaries and evaluation.

## Clinician and operations web applications

Clinician views: verified profile, availability, appointment queue, consented patient timeline, consultation workspace, signed notes, therapy plans where qualified, referrals, follow-up tasks and payout summaries. No browse-all-patients page. Every chart view must show the patient, grant expiry, source labels and current episode.

Admin views: provider verification queue with evidence/reviewer separation; directory/content review queue; service incidents; consent/rights requests; clinical escalation assignments; payment reconciliation; aggregate operational metrics. Staff should use redacted metadata by default. Support impersonation, if ever introduced, requires explicit purpose, approval, expiry and visible audit; it is not part of the baseline design.

Provider onboarding has rejection, suspension, appeal and re-verification states. A suspended provider disappears from new booking immediately; existing appointments enter a staffed resolution queue. Payout destination changes require step-up verification, notification and fraud review.

## Broader deck capabilities

**Growth:** retain measurement value, unit, method, date, reporter and reference version. Reject impossible units/ranges and flag questionable data for review. WHO provides reference standards and calculation resources; use a clinically reviewed implementation and compare to reference cases before displaying percentiles. Do not derive autism likelihood from growth curves. [WHO growth resources](https://www.who.int/tools/child-growth-standards), [WHO software](https://www.who.int/toolkits/child-growth-standards/software)

**Vaccinations:** record administered doses separately from reminders, including source and clinician verification. Choose a jurisdiction-specific, versioned schedule reviewed by a pediatrician; distinguish national-program schedules from private-practice recommendations. Catch-up and contraindication decisions go to clinicians. The reviewed [MoHFW resource](https://www.mohfw.gov.in/sites/default/files/Routine%20Immunization%20Manual%20For%20Health%20Workers.pdf) is an input to editorial verification, not a claim that this project has implemented the current schedule.

**Centers, schools and welfare:** use manually verified entries with location, accessibility, service eligibility, official contact, source URL and last checked date. Show stale status. The [National Trust](https://nationaltrust.nic.in/) lists programmes including Niramaya, Disha and Vikaas; eligibility, enrollment and current availability need per-program verification. Link to official applications; never promise approval, benefits, live capacity or a government partnership. Human navigation support can be valuable before any API integration.

## Related service patterns

[Practo's own service description](https://www.practo.com/consult?source=homepage) illustrates specialty selection, consultation and follow-up; its broader [directory](https://www.practo.com/doctors) includes records and bookings. Borrow clear service status and complete appointment lifecycle patterns, not marketing performance/security claims or assumptions about an open partner API. NeuroNest's proposed difference is the longitudinal developmental/therapy record and purposeful sharing across the care team. Validate that distinction with families and clinicians; this research is not a market-size or product-market-fit study.

WHO's caregiver programme can inform structured learning, but adopting a few videos does not deliver the full facilitator-led programme. Review rights and implementation requirements before adapting it. [WHO caregiver training](https://www.who.int/publications/i/item/9789240048836)

## Accessibility and low-connectivity acceptance

Test with screen readers, large text, keyboard navigation on web, reduced motion, high contrast and plain-language labels. Provide text alternatives to audio/video, usable touch targets and non-color-only status. Avoid sensory overload and autoplay. Malayalam and other localized clinical content need bilingual clinical review and caregiver comprehension testing.

Offline permits encrypted local drafts for observations and a small explicitly selected cache. Show stale/offline status. Booking, payments, consent changes, clinical signing and AI interpretation require server confirmation. Never show an offline booking as confirmed. On reconnect, deduplicate by client operation ID, check permissions again, and resolve conflicting record versions visibly. Logout removes local secrets and patient cache; shared-device safety is part of real-device testing.

## Measurable product outcomes

Proposed operational measures: time from recorded concern to appropriate attended assessment, referral completion, follow-up completion, appointment failures, refund delay, consent comprehension, caregiver effort and accessibility task success. Define denominators and missing data before collecting metrics. Measure clinical outcomes only within an approved design; engagement and watch time are not evidence of improved autism outcomes. Never optimize referrals or alarming risk messages to increase paid bookings.

Success metrics should include harms: false reassurance, missed follow-up, inappropriate escalation, unwanted disclosure, confusing screening results and excessive family burden. The clinical lead owns review of these signals with caregiver/autistic-person representation.
