"""Internal diagnostic-assistance API. No instrument or model is clinically enabled by default."""

import hashlib
import hmac
import json
import os
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Literal

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field, StrictBool, StrictInt

from pipeline import predict_approved

app = FastAPI(title="NeuroNest diagnostic assistance", version="1.0.0")


def local_demo() -> bool:
    environment = os.getenv("APP_ENV", os.getenv("ENVIRONMENT", "production"))
    return (
        environment in {"development", "local", "test"}
        and os.getenv("LOCAL_DEMO", "false").lower() == "true"
    )


def authorize(x_service_token: str = Header(default="")) -> None:
    secret = os.getenv("ENGINE_SERVICE_TOKEN", os.getenv("SERVICE_TOKEN", "")).strip()
    if len(secret) < 32:
        raise HTTPException(503, "Engine authentication is not configured")
    if not hmac.compare_digest(secret, x_service_token):
        raise HTTPException(401, "Invalid service credentials")


def _read_json(name: str) -> tuple[dict | None, str | None]:
    """Read a release-controlled JSON artifact without inventing a fallback."""
    raw = os.getenv(name, "").strip()
    path = os.getenv(f"{name}_PATH", "").strip()
    try:
        if raw:
            if len(raw) > 512 * 1024:
                return None, f"{name} is too large"
            value = json.loads(raw)
        elif path:
            value = json.loads(Path(path).read_text())
        else:
            return None, f"{name} is not configured"
    except (OSError, TypeError, ValueError):
        return None, f"{name} is invalid"
    if not isinstance(value, dict):
        return None, f"{name} must contain an object"
    return value, None


def _content_digest(value: dict) -> str:
    canonical = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(canonical.encode()).hexdigest()


def _approved_at(value: object) -> bool:
    if not isinstance(value, str) or not value.strip():
        return False
    try:
        timestamp = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return False
    return timestamp.tzinfo is not None and timestamp <= datetime.now(timezone.utc)


def _mchat_config(language: str) -> tuple[dict | None, str | None]:
    """Return a validated, rights-cleared M-CHAT-R/F locale or a safe reason."""
    content, reason = _read_json("MCHAT_RF_CONTENT_JSON")
    if reason:
        return None, reason
    approval, reason = _read_json("MCHAT_RF_APPROVAL_JSON")
    if reason:
        return None, reason
    assert content is not None and approval is not None
    if content.get("instrument_id") != "m-chat-r-f":
        return None, "MCHAT_RF_CONTENT_JSON has the wrong instrument id"
    if not content.get("version") or not isinstance(content.get("languages"), dict):
        return None, "MCHAT_RF_CONTENT_JSON is missing version or languages"
    if approval.get("instrument_id") != "m-chat-r-f":
        return None, "MCHAT_RF_APPROVAL_JSON has the wrong instrument id"
    if approval.get("status") != "approved":
        return None, "Clinical approval is not approved"
    if approval.get("content_sha256") != _content_digest(content):
        return None, "Approval does not match the exact questionnaire content"
    approved_languages = approval.get("approved_languages")
    if not isinstance(approved_languages, list) or not approved_languages:
        return None, "Approved languages are required"
    if language not in approved_languages:
        return None, f"The {language} language version is not approved"
    license_review = approval.get("license") or approval.get("license_approval")
    clinical_review = approval.get("clinical") or approval.get("clinical_approval")
    if not isinstance(license_review, dict) or license_review.get("status") != "approved":
        return None, "A rights-cleared license approval is required"
    if not license_review.get("reference"):
        return None, "A license evidence reference is required"
    if not isinstance(clinical_review, dict) or clinical_review.get("status") != "approved":
        return None, "Clinical approval is required"
    if not clinical_review.get("reviewer") or not clinical_review.get("reference"):
        return None, "Clinical reviewer and evidence reference are required"
    if not _approved_at(clinical_review.get("approved_at")):
        return None, "A past, timezone-aware clinical approval timestamp is required"
    if approval.get("version") and approval["version"] != content["version"]:
        return None, "Approval version does not match questionnaire content"
    locale = content["languages"].get(language)
    if not isinstance(locale, dict):
        return None, f"The {language} questionnaire content is missing"
    questions = locale.get("questions")
    follow_up_questions = locale.get("follow_up_questions")
    scoring = locale.get("scoring", content.get("scoring"))
    if not isinstance(questions, list) or len(questions) != 20:
        return None, "M-CHAT-R/F requires its complete 20-item initial questionnaire"
    if not isinstance(follow_up_questions, list) or not follow_up_questions:
        return None, "M-CHAT-R/F follow-up content is required"
    if not isinstance(scoring, dict):
        return None, "Clinically approved scoring rules are required"
    ids = []
    for question in questions:
        if not isinstance(question, dict) or not question.get("id") or not question.get("text"):
            return None, "Question text and identifiers are required"
        options = question.get("options")
        if not isinstance(options, list) or {
            item.get("value") for item in options if isinstance(item, dict)
        } != {"yes", "no"}:
            return None, "Every question must have approved yes/no options"
        ids.append(question["id"])
    if len(set(ids)) != len(ids):
        return None, "Question identifiers must be unique"
    fail_when = scoring.get("initial_fail_when")
    follow_fail_when = scoring.get("follow_up_fail_when")
    if (
        not isinstance(fail_when, dict)
        or set(fail_when) != set(ids)
        or any(value not in {"yes", "no"} for value in fail_when.values())
    ):
        return None, "Initial scoring rules must cover every question"
    if not isinstance(follow_fail_when, dict) or any(
        value not in {"yes", "no"} for value in follow_fail_when.values()
    ):
        return None, "Follow-up scoring rules are required"
    try:
        follow_up_min = int(scoring["initial_follow_up_min"])
        high_risk_min = int(scoring["initial_high_risk_min"])
        follow_positive_min = int(scoring["follow_up_positive_min"])
    except (KeyError, TypeError, ValueError):
        return None, "Approved scoring thresholds are required"
    if not 0 <= follow_up_min <= high_risk_min <= len(
        questions
    ) or not 1 <= follow_positive_min <= len(follow_up_questions):
        return None, "Approved scoring thresholds are invalid"
    follow_ids = {item.get("id") for item in follow_up_questions if isinstance(item, dict)}
    if not follow_ids or not follow_ids <= set(ids):
        return None, "Follow-up identifiers must match initial questions"
    if set(follow_fail_when) != follow_ids:
        return None, "Follow-up scoring rules must cover follow-up questions"
    return {
        "content": content,
        "approval": approval,
        "locale": locale,
        "questions": questions,
        "follow_up_questions": follow_up_questions,
        "scoring": {
            "initial_fail_when": fail_when,
            "follow_up_fail_when": follow_fail_when,
            "initial_follow_up_min": follow_up_min,
            "initial_high_risk_min": high_risk_min,
            "follow_up_positive_min": follow_positive_min,
        },
    }, None


class StrictRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")


Answer = StrictBool | StrictInt | Literal["yes", "no"]


class ScreenRequest(StrictRequest):
    instrument_id: str = Field(max_length=100)
    date_of_birth: date
    language: Literal["en", "ml"] = "en"
    stage: Literal["initial", "follow_up"] = "initial"
    answers: dict[str, Answer] = Field(default_factory=dict, max_length=30)
    prior_answers: dict[str, Answer] = Field(default_factory=dict, max_length=30)


class PredictRequest(StrictRequest):
    subject_id: str = Field(min_length=1, max_length=100)
    features: dict[str, float | None] = Field(max_length=100)
    age_months: int | None = Field(default=None, ge=0, le=1500)
    language: Literal["en", "ml"] = "en"


QUESTIONS = {
    "en": [
        {"id": "q1", "text": "For this synthetic exercise, was the practice activity marked done?"},
        {"id": "q2", "text": "Was a synthetic observation added?"},
        {"id": "q3", "text": "Would you like to test the follow-up stage?"},
    ],
    "ml": [
        {"id": "q1", "text": "ഈ സാങ്കൽപ്പിക പരിശീലനത്തിൽ പ്രവർത്തനം പൂർത്തിയായി എന്ന് അടയാളപ്പെടുത്തിയിട്ടുണ്ടോ?"},
        {"id": "q2", "text": "ഒരു സാങ്കൽപ്പിക നിരീക്ഷണം ചേർത്തിട്ടുണ്ടോ?"},
        {"id": "q3", "text": "തുടർഘട്ടം പരീക്ഷിക്കണമോ?"},
    ],
}


def answer_options(language):
    return [
        {"value": "yes", "label": "Yes" if language == "en" else "അതെ"},
        {"value": "no", "label": "No" if language == "en" else "ഇല്ല"},
    ]


def instrument(language: str = "en") -> dict:
    return {
        "id": "synthetic-development-v1",
        "name": "Synthetic workflow exercise",
        "version": "1.0.0",
        "enabled": local_demo(),
        "synthetic": True,
        "license_status": "original_synthetic_content",
        "min_age_months": 0,
        "max_age_months": 215,
        "languages": ["en", "ml"],
        "questions": [
            {**question, "options": answer_options(language)} for question in QUESTIONS[language]
        ],
        "notice": "Software demonstration only. These questions do not screen for or diagnose autism.",
    }


def mchat_instrument(language: str = "en") -> dict:
    config, reason = _mchat_config(language)
    if not config:
        return {
            "id": "m-chat-r-f",
            "name": "M-CHAT-R/F",
            "enabled": False,
            "status": "disabled",
            "synthetic": False,
            "license_status": "license_and_approved_content_required",
            "min_age_months": 16,
            "max_age_months": 30,
            "languages": [],
            "questions": [],
            "disabled_reason": "Licensed questionnaire content and clinical approval are required before use.",
            "source_url": "https://www.mchatscreen.com/",
        }
    content = config["content"]
    locale = config["locale"]
    return {
        "id": "m-chat-r-f",
        "name": content.get("name", "M-CHAT-R/F"),
        "enabled": True,
        "status": "available",
        "synthetic": False,
        "license_status": "licensed",
        "clinical_approval_status": "approved",
        "min_age_months": 16,
        "max_age_months": 30,
        "languages": config["approval"]["approved_languages"],
        "version": content["version"],
        "questions": locale["questions"],
        "source_url": content.get("source_url", "https://www.mchatscreen.com/"),
        "notice": locale.get(
            "notice",
            "Authorized screening only; this is not a diagnosis. Review the result with a clinician.",
        ),
    }


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "engine": "diagnostic",
        "synthetic_mode": local_demo(),
        "clinical_prediction": "requires_approved_artifact",
    }


@app.get("/instruments", dependencies=[Depends(authorize)])
def instruments(language: Literal["en", "ml"] = "en") -> list[dict]:
    result = [mchat_instrument(language)]
    if local_demo():
        result.append(instrument(language))
    return result


def normalized(answers: dict, expected: set[str]) -> tuple[dict, list[str]]:
    if set(answers) - expected:
        raise HTTPException(422, "Unknown question identifier")
    if any(value not in (True, False, 0, 1, "yes", "no") for value in answers.values()):
        raise HTTPException(422, "Answers must be yes/no, boolean, or 0/1")
    return {key: value in (True, 1, "yes") for key, value in answers.items()}, sorted(
        expected - set(answers)
    )


def _mchat_failed(answer: bool, fail_when: str) -> bool:
    return answer if fail_when == "yes" else not answer


def _mchat_screen(request: ScreenRequest, config: dict) -> dict:
    content = config["content"]
    locale = config["locale"]
    questions = config["questions"]
    follow_up_questions = config["follow_up_questions"]
    scoring = config["scoring"]
    today = date.today()
    age_months = (
        (today.year - request.date_of_birth.year) * 12
        + today.month
        - request.date_of_birth.month
        - (today.day < request.date_of_birth.day)
    )
    result_base = {
        "instrument_id": request.instrument_id,
        "instrument_version": content["version"],
        "synthetic": False,
        "eligible": 16 <= age_months <= 30,
        "age_months": age_months,
        "language": request.language,
        "stage": request.stage,
        "result": None,
        "clinical_review_status": "requires_clinician_review",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "notice": locale.get(
            "notice",
            "Authorized screening only; this is not a diagnosis. Review the result with a clinician.",
        ),
    }
    if not result_base["eligible"]:
        return {
            **result_base,
            "status": "ineligible",
            "input_quality": "outside_age_range",
            "abstention_reason": "M-CHAT-R/F is validated for children 16–30 months old",
        }
    initial_ids = {question["id"] for question in questions}
    if request.stage == "initial":
        if request.prior_answers:
            raise HTTPException(422, "Initial stage cannot include prior answers")
        answers, missing = normalized(request.answers, initial_ids)
        if missing:
            return {
                **result_base,
                "status": "incomplete",
                "input_quality": "missing_answers",
                "missing_question_ids": missing,
            }
        failed_ids = [
            question["id"]
            for question in questions
            if _mchat_failed(answers[question["id"]], scoring["initial_fail_when"][question["id"]])
        ]
        score = len(failed_ids)
        if score >= scoring["initial_high_risk_min"]:
            return {
                **result_base,
                "status": "completed",
                "input_quality": "complete",
                "result": {
                    "initial_score": score,
                    "screen_positive": True,
                    "follow_up_required": False,
                    "interpretation": "Screen positive; arrange clinician follow-up.",
                },
            }
        if score >= scoring["initial_follow_up_min"]:
            return {
                **result_base,
                "status": "follow_up_required",
                "input_quality": "complete_initial_stage",
                "result": {"initial_score": score, "follow_up_required": True},
                "follow_up_questions": [
                    question for question in follow_up_questions if question["id"] in failed_ids
                ],
            }
        return {
            **result_base,
            "status": "completed",
            "input_quality": "complete",
            "result": {
                "initial_score": score,
                "screen_positive": False,
                "follow_up_required": False,
                "interpretation": "Screen negative; continue routine developmental monitoring and discuss concerns with a clinician.",
            },
        }

    prior_answers, missing_prior = normalized(request.prior_answers, initial_ids)
    if missing_prior:
        raise HTTPException(422, "Follow-up requires complete initial answers")
    failed_ids = [
        question["id"]
        for question in questions
        if _mchat_failed(
            prior_answers[question["id"]], scoring["initial_fail_when"][question["id"]]
        )
    ]
    if len(failed_ids) < scoring["initial_follow_up_min"]:
        raise HTTPException(422, "Follow-up is not required for this initial score")
    expected_follow_up = set(failed_ids) & {question["id"] for question in follow_up_questions}
    answers, missing = normalized(request.answers, expected_follow_up)
    if missing:
        return {
            **result_base,
            "status": "incomplete",
            "input_quality": "missing_answers",
            "missing_question_ids": missing,
        }
    follow_up_score = sum(
        _mchat_failed(answers[item_id], scoring["follow_up_fail_when"][item_id])
        for item_id in expected_follow_up
    )
    screen_positive = follow_up_score >= scoring["follow_up_positive_min"]
    return {
        **result_base,
        "status": "completed",
        "input_quality": "complete",
        "result": {
            "initial_score": len(failed_ids),
            "follow_up_score": follow_up_score,
            "screen_positive": screen_positive,
            "follow_up_required": False,
            "interpretation": (
                "Screen positive after follow-up; arrange clinician follow-up."
                if screen_positive
                else "Screen negative after follow-up; continue developmental monitoring and discuss concerns with a clinician."
            ),
        },
    }


@app.post("/screen", dependencies=[Depends(authorize)])
def screen(request: ScreenRequest) -> dict:
    if request.instrument_id == "m-chat-r-f":
        config, reason = _mchat_config(request.language)
        if not config:
            raise HTTPException(409, f"M-CHAT-R/F unavailable: {reason}")
        return _mchat_screen(request, config)
    if request.instrument_id != "synthetic-development-v1":
        raise HTTPException(
            409, "Instrument unavailable: licensed content and validated scoring are not installed"
        )
    if not local_demo():
        raise HTTPException(
            403, "Synthetic instruments are disabled outside explicit local demo mode"
        )
    today = date.today()
    age_months = (
        (today.year - request.date_of_birth.year) * 12
        + today.month
        - request.date_of_birth.month
        - (today.day < request.date_of_birth.day)
    )
    eligible = request.date_of_birth <= today and 0 <= age_months < 216
    result = {
        "instrument_id": request.instrument_id,
        "instrument_version": "1.0.0",
        "synthetic": True,
        "eligible": eligible,
        "age_months": age_months,
        "language": request.language,
        "stage": request.stage,
        "result": None,
        "clinical_review_status": "not_a_clinical_assessment",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "notice": instrument()["notice"],
    }
    if not eligible:
        return {
            **result,
            "status": "ineligible",
            "input_quality": "outside_age_range",
            "abstention_reason": "Requires a birth date from birth to under 18 years",
        }
    if request.stage == "initial":
        if request.prior_answers:
            raise HTTPException(422, "Initial stage cannot include prior answers")
        answers, missing = normalized(request.answers, {"q1", "q2", "q3"})
    else:
        prior, missing_prior = normalized(request.prior_answers, {"q1", "q2", "q3"})
        if missing_prior or not prior.get("q3"):
            raise HTTPException(
                422, "Follow-up requires a complete initial stage that requested follow-up"
            )
        answers, missing = normalized(request.answers, {"f1"})
    if missing:
        return {
            **result,
            "status": "incomplete",
            "input_quality": "missing_answers",
            "missing_question_ids": missing,
        }
    if request.stage == "initial" and answers["q3"]:
        return {
            **result,
            "status": "follow_up_required",
            "input_quality": "complete_initial_stage",
            "follow_up_questions": [
                {
                    "id": "f1",
                    "options": answer_options(request.language),
                    "text": "Was the synthetic follow-up completed?"
                    if request.language == "en"
                    else "സാങ്കൽപ്പിക തുടർഘട്ടം പൂർത്തിയായോ?",
                }
            ],
        }
    return {
        **result,
        "status": "completed",
        "input_quality": "complete",
        "result": {
            "synthetic_score": sum(answers.values()),
            "interpretation": "Workflow exercise complete; no clinical meaning",
        },
    }


@app.post("/predict", dependencies=[Depends(authorize)])
def predict(request: PredictRequest) -> dict:
    base = {
        "subject_id": request.subject_id,
        "eligible": False,
        "result": None,
        "uncertainty": None,
        "input_quality": "not_assessed",
        "model_version": None,
        "clinical_review_status": "requires_clinician_review",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        prediction = predict_approved(
            os.getenv("MODEL_REGISTRY", "artifacts"), request.model_dump()
        )
    except (ValueError, OSError, KeyError):
        return {
            **base,
            "status": "abstained",
            "abstention_reason": "No eligible, intact, clinically approved model artifact is available",
        }
    return {**base, **prediction}
