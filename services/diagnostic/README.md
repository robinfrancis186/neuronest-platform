# Diagnostic-assistance engine

Independent internal FastAPI service, default port **8002**. It owns no patient database. The core authorizes the child, persists raw answers and stages, and records a clinician's review separately.

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.lock
export ENGINE_SERVICE_TOKEN="$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')"
export APP_ENV=development LOCAL_DEMO=false
.venv/bin/uvicorn app:app --host 127.0.0.1 --port 8002 --no-access-log
```

Run commands from this directory. Docker builds use the same pinned dependency lock and a nonroot user. Set the same generated `ENGINE_SERVICE_TOKEN` on the core. Protected paths reject missing/incorrect service authentication. Missing or short configured tokens produce 503; synthetic instruments and generated data below are test-only fixtures: keep LOCAL_DEMO=false outside an isolated test run.

## HTTP contract

- `GET /health`: liveness without credentials, identifiers or dataset details.
- `GET /instruments?language=en|ml`: authenticated catalogue. M-CHAT-R/F is exposed only when the release supplies the complete rights-cleared content and a matching clinical/license approval artifact. Without both artifacts it stays disabled, with no copied questions. The original `synthetic-development-v1` exercise appears only in explicit isolated test mode. Each question includes `id`, `text` and yes/no `options`.
- `POST /screen`: `{instrument_id,date_of_birth,language,stage?,answers,prior_answers?}`. Answers accept yes/no, boolean or 0/1. Initial questions are `q1,q2,q3`. `q3=yes` requires a follow-up `f1` answer, submitted with `stage=follow_up` and the full `prior_answers`. Missing, unknown, invalid and inconsistent answers cannot yield completion.
- `POST /predict`: `{subject_id,features,age_months?,language?}`. No approved model is shipped. The normal response is `{status:abstained,result:null,abstention_reason,...}`. An approved artifact still abstains for age/language mismatch, missing/out-of-range input, integrity failure or its approved uncertainty interval.

All protected calls use `X-Service-Token`. A synthetic score counts answers solely to exercise orchestration; it has **no autism-screening or diagnostic meaning**. Clinical instruments require a separate rights-cleared content and validated-scoring implementation, not a database flag.

## Reproducible research pipeline

```sh
.venv/bin/python pipeline.py synthetic-fixture /tmp/neuronest-diagnostic-demo
.venv/bin/python pipeline.py train /tmp/neuronest-diagnostic-demo/manifest.json /tmp/neuronest-diagnostic-demo/rows.jsonl /tmp/neuronest-models
.venv/bin/python pipeline.py synthetic-fixture /tmp/neuronest-diagnostic-external --prefix external --seed 91
# Substitute the version printed by train.
.venv/bin/python pipeline.py evaluate /tmp/neuronest-models VERSION /tmp/neuronest-diagnostic-external/manifest.json /tmp/neuronest-diagnostic-external/rows.jsonl
.venv/bin/python -m unittest discover -s tests -v
```

The generated fixtures document the manifest and JSONL schema. Real manifests require training/evaluation permission, permission reference, withdrawal-review timestamp and an independent clinical reference-standard protocol. Every row has separate purpose-specific permission and stable child/family/site IDs. Questionnaire-derived outcomes, post-outcome feature names, conflicting child groups and duplicate records are rejected. Train/test splitting groups families; preprocessing is fit only on the training partition. External evaluation rejects overlap in children, families and sites.

The baseline is median imputation, scaling and logistic regression. A plain JSON artifact stores the fitted numeric parameters, never pickle or executable model code. Reproducible versions include data/manifest/model hashes. Reports include confusion counts, sensitivity, specificity, predictive values, ROC AUC, Brier score, calibration bins, Wilson intervals, coverage and language/site subgroups. Small subgroups are explicitly marked as evidence gaps. Wilson intervals assume independent observations; partner cohorts with repeated visits require an approved clustered statistical analysis before clinical release.

## Promotion and rollback

`pipeline.py promote REGISTRY VERSION APPROVAL.json` requires a nonsynthetic model and nonsynthetic external evaluation, exact artifact hash, named and referenced clinical/regulatory/security/language approvals, intended-use version, validated age/languages/feature ranges, an explicit uncertainty interval and pre-specified sensitivity/specificity/PPV/coverage thresholds. It recalculates release metrics on the intended population **after applying abstention**. Synthetic models cannot be promoted, even with approval metadata.

Approval JSON shape:

```json
{
  "model_sha256": "the actual model hash",
  "clinical_approval": {"approved": true, "reviewer": "authorized identity", "reference": "signed evidence URI", "approved_at": "ISO timestamp"},
  "regulatory_approval": {"approved": true, "reviewer": "authorized identity", "reference": "applicable authorization URI", "approved_at": "ISO timestamp"},
  "security_approval": {"approved": true, "reviewer": "authorized identity", "reference": "review URI", "approved_at": "ISO timestamp"},
  "language_approval": {"approved": true, "reviewer": "authorized identity", "reference": "language evaluation URI", "approved_at": "ISO timestamp"},
  "intended_use": {"version": "approved protocol", "min_age_months": 0, "max_age_months": 215, "languages": ["en", "ml"], "feature_ranges": {}},
  "minimum_metrics": {},
  "abstention_interval": []
}
```

This deliberately incomplete example cannot pass promotion: actual feature ranges and clinically agreed thresholds must come from the protocol. `pipeline.py rollback REGISTRY` validates and restores the previous approval. Mount `MODEL_REGISTRY` read-only in the runtime. Restrict registry write access to release operators; these receipts attest documented governance and do not verify a clinician's identity or issue regulatory authorization themselves. Do not commit partner data, registry contents, or approval artifacts.

## Readiness

Implemented: authenticated API, test-fixture orchestration, eligibility/stage validation, abstention, permissioned training, grouped splits, evaluation, integrity gates, promotion and rollback.

External/clinical gates: instrument licenses and approved implementations; consented cohort; independent clinical labels; statistical protocol; clinical and Malayalam review; regulatory authorization and release sign-off. No clinical model, licensed screening questionnaire or real patient data is bundled.

## Enabling an authorized M-CHAT-R/F release

Keep the questionnaire and approval receipt in server-only Vercel variables. Do not commit the item text, translations, or receipts. Set `MCHAT_RF_CONTENT_JSON` to an object with `instrument_id: "m-chat-r-f"`, a `version`, `source_url`, and `languages`. Each approved language contains exactly 20 initial `questions`, `follow_up_questions`, and `scoring` with `initial_fail_when`, `follow_up_fail_when`, `initial_follow_up_min`, `initial_high_risk_min`, and `follow_up_positive_min`. Each question must carry its rights-cleared `id`, `text`, and `yes`/`no` options.

Set `MCHAT_RF_APPROVAL_JSON` to a receipt containing the same `instrument_id` and `version`, `status: "approved"`, the SHA-256 `content_sha256` of the canonical content JSON, `approved_languages`, and both:

```json
{
  "license": {"status": "approved", "reference": "signed-rights-evidence"},
  "clinical": {"status": "approved", "reviewer": "named-reviewer", "reference": "signed-protocol", "approved_at": "2026-01-01T00:00:00Z"}
}
```

The service validates the exact content hash, reviewer evidence, rights evidence, language approval, age range (16–30 months), complete item set, and scoring thresholds on every catalogue/screen call. Invalid, missing, future-dated, or mismatched artifacts remain unavailable. After adding both variables to the diagnostic project, redeploy that project and confirm `GET /instruments?language=en` returns `enabled: true`; then deploy the core with the same engine token and run the parent/clinician review acceptance checks.
