# AI education assistant engine

Independent, stateless FastAPI service on **8001**. No database credentials, direct patient queries, conversation persistence or automatic training. Core must reauthorize each child and pass only the explicitly requested minimum context.

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.lock
export ENGINE_SERVICE_TOKEN="$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')"
export APP_ENV=development LOCAL_DEMO=false
.venv/bin/uvicorn app:app --host 127.0.0.1 --port 8001 --no-access-log
.venv/bin/python -m unittest discover -s tests -v
```

Run commands from this directory. Protected paths require `X-Service-Token` matching the core's token. Unconfigured/short tokens fail closed. `GET /health` returns no secrets. `POST /chat` accepts:

```json
{"message":"What is autism?","language":"en","request_id":"opaque request ID","context":null}
```

Response: `{answer,language,citations:[{id,title,url,version,review_status}],escalation,status,request_id}` with an optional `care_summary` only when authorized patient context is processed. Supported languages are `en` and `ml`. Optional context is `{subject_id,records:[{id,subject_id,title,body}]}`; every record must belong to that subject. An optional root `subject_id` must match it. Context is bounded to ten records of at most 2,000 characters each.

## Structured context and clinician handoff

Core may attach a bounded `longitudinal` object only after a fresh explicit record-context request, live child authorization, `PATIENT_AI_ENABLED=true`, and this service's separate `ALLOW_PATIENT_AI=true` gate. It includes derived age in months and language, up to ten parent/clinician observations, five goals, five screening **workflow statuses**, and deterministic review signals for a reported lost skill or pending screening follow-up. Each category is omitted when the current caller lacks its separate observations, therapy, or screening scope. Signed records remain capped at five. The assistant never receives child name, date of birth, attachments, uploaded media, raw screening answers/results, growth/vaccination data, appointment/payment data, or another child's data.

When context is allowed, `/chat` returns `care_summary`: a versioned metadata-only handoff with category counts and `routine` or `clinician` review signals. It is explicitly a draft for clinician review, **not** a diagnosis, screening-score interpretation, emergency determination, FHIR resource, PDF, or signed clinical record. A future approved interoperability export can map the same source categories to FHIR `Observation`, `Goal`, and `QuestionnaireResponse`-style workflow data; this service does not create, claim conformance to, or transmit FHIR today.

The bounded context excludes named questionnaire content and unapproved instruments, audio/video analysis, biometric inference, medication advice, and automatic clinical-note creation. Before enabling patient context, obtain the provider data controls/agreement, retention approval, consent wording, clinician and Malayalam editorial review, and adversarial safety evaluation. `store:false` alone is not evidence of zero provider retention.

## Honest readiness states

The bundled corpus contains original short summaries and links to CDC and WHO pages, source-checked on 7 September 2026. Clinical and Malayalam editorial review is **pending**. The test-only local preview returns local_resource_preview; production excludes pending content. The service never pretends a pending source has been reviewed.

With an approved corpus but no `OPENAI_API_KEY`, `reviewed_resources_only` returns actual reviewed excerpts and source links. With a key and approved sources, the service calls the OpenAI Responses API with `gpt-5.4-mini`, `store:false`, bounded generation and strict structured output. No paid request occurs in tests. Citations must refer to retrieved IDs; unknown citations, unexpected links, conspicuous harmful reassurance and wrong-language output fail to `generation_unavailable`.

Personal records are rejected with `context_unavailable` unless `ALLOW_PATIENT_AI=true`. Enable it only after the relevant provider agreement, retention/data-control configuration and authorization path are approved. `store:false` is not a claim of zero provider retention. [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data)

Fixed bilingual routes handle matched urgent, diagnostic/treatment and privacy/injection requests before generation. The urgent India route links to [112](https://112.gov.in/). Phrase detection and output checks are deliberately conservative defense layers, **not proof of comprehensive clinical triage or prompt-injection resistance**. Release still requires adversarial and clinician/caregiver comprehension evaluation in both languages. The service cannot write clinical notes, change bookings, grant access or perform payments.

## Corpus editorial workflow

```sh
.venv/bin/python governance.py queue corpus.json
.venv/bin/python governance.py ingest /private/editorial/corpus.json /private/editorial/candidate.json
.venv/bin/python governance.py review /private/editorial/corpus.json SOURCE_ID --reviewer 'authorized reviewer' --clinical-reference 'signed review reference' --languages en ml --status approved
```

Candidate schema follows `corpus.json`. Ingestion always resets a replacement to pending and requires a new content version. Rights basis/reference, HTTPS source URL and bilingual text are required. Approval binds to the exact content hash; changing approved content invalidates the corpus. Rejection removes a source from production retrieval. Set `CORPUS_PATH` to the controlled, read-only runtime copy. The CLI captures reviewer attestations; operating-system permissions and release identity controls must restrict who can publish that copy.

## Fine-tuning, evaluation and rollback

A separate pipeline targets `gpt-4.1-mini`; the default generation model is not assumed to support fine-tuning. The pipeline accepts **authored educational examples only**, with separate untouched evaluation scenarios, documented rights, named review and de-identification attestations. Patient records and user chats are refused. Identifier heuristics supplement human review; they are not a de-identification guarantee.

Manifest fields: `dataset_id`, `rights_reference`, `reviewer`, `reviewed_at`, `training_allowed:true`, `deidentified:true`, `base_model:"gpt-4.1-mini"`.

Each JSONL example includes `id`, `scenario_id`, `language`, `reviewer`, `reviewed_at`, `rights_reference`, `source_type:"authored_educational_example"`, `contains_patient_data:false`, and `messages:[{role,content}]`. Each partition must cover both languages; ID/scenario/content overlap is rejected. Tests construct runnable synthetic fixtures, without representing them as a clinical training set.

```sh
.venv/bin/python governance.py prepare MANIFEST.json TRAIN.jsonl EVAL.jsonl /private/prepared
# Only this explicitly invoked command can upload data and create a paid provider job:
.venv/bin/python governance.py submit /private/prepared --allow-paid-job
.venv/bin/python governance.py job-status /private/prepared
.venv/bin/python governance.py compare REVIEWED_EVALUATION.json /private/comparison.json
.venv/bin/python governance.py promote /private/tuning-registry /private/comparison.json APPROVAL.json
.venv/bin/python governance.py rollback /private/tuning-registry
```

`submit` requires `OPENAI_API_KEY`, verifies prepared file hashes, persists upload receipts and uses an idempotency key. `job-status` stores only status/model metadata. No automatic polling, training or promotion runs on the web request path.

Comparison requires reviewed outputs for baseline and candidate across **citations, diagnosis, urgent, injection, privacy and comprehension in both languages**. Every case records held-out status, reviewer/date, expected escalation, allowed citation IDs and per-model answer/citations/escalation plus groundedness/language/safety booleans. Automatic checks reject citation or escalation mismatches. Promotion requires all candidate safety cases to pass and the candidate's reviewed score to improve on the baseline; approval must bind to the comparison hash and identify clinical/language/security reviewers and provider-data agreement. Active model and evaluation receipts are validated on use. `TUNING_REGISTRY` is read-only at runtime.

The implementation provides the workflow and evidence gates. A real reviewed corpus, clinical/language evaluations, provider agreement and production fine-tuned artifact are external release dependencies; none is fabricated by this repository.
