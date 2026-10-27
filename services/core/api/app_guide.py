"""A public product map projected from Graphify; never a patient-record search."""

import json
from pathlib import Path

from drf_spectacular.utils import OpenApiTypes, extend_schema
from rest_framework.decorators import api_view
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .engines import engine_call
from .errors import Unavailable

GUIDE = json.loads(Path(__file__).with_suffix(".json").read_text())
VIEWS = {
    "parent": {
        "today",
        "milestones",
        "activities",
        "assessments",
        "reports",
        "care",
        "library",
        "account",
        "records",
        "notifications",
    },
    "doctor": {
        "today",
        "milestones",
        "activities",
        "reports",
        "care",
        "library",
        "account",
        "records",
        "notifications",
    },
    "therapist": {
        "today",
        "milestones",
        "activities",
        "reports",
        "care",
        "library",
        "account",
        "records",
        "notifications",
    },
    "mentor": {"care", "library", "account", "notifications"},
    "admin": {"operations", "care", "library", "account", "notifications"},
}


def destinations(user):
    return [row for row in GUIDE["destinations"] if row["view"] in VIEWS.get(user.role, set())]


def public_destination(row, language):
    return {
        **{key: row[key] for key in ("id", "view", "tab")},
        "label": row["label"][language],
        "description": row["description"][language],
    }


@extend_schema(responses=OpenApiTypes.OBJECT, tags=["Assistant"])
@api_view(["GET"])
def assistant_guide(request):
    language = request.query_params.get("language", "en")
    if language not in ("en", "ml"):
        raise ValidationError("Choose a supported language.")
    return Response(
        {
            "version": GUIDE["version"],
            "destinations": [
                public_destination(row, language) for row in destinations(request.user)
            ],
        }
    )


def reply(user, message, language):
    options = destinations(user)
    allowed = {row["id"]: row for row in options}
    urgent = any(
        phrase in message.casefold()
        for phrase in (
            "can't breathe",
            "cannot breathe",
            "not breathing",
            "unconscious",
            "overdose",
            "kill myself",
            "suicide",
            "immediate danger",
            "severe bleeding",
            "ശ്വാസം കിട്ടുന്നില്ല",
            "ആത്മഹത്യ",
            "അബോധാവസ്ഥ",
            "അപകടത്തിലാണ്",
        )
    )
    if urgent:
        result = {"escalation": "urgent"}
    elif not options:
        result = {}
    else:
        try:
            result = engine_call(
                "assistant",
                "/app-guide",
                {
                    "message": message,
                    "destinations": [
                        {
                            "id": row["id"],
                            "label": row["label"][language],
                            "description": row["description"][language],
                        }
                        for row in options
                    ],
                },
            )
        except Unavailable:
            result = {}
    if not isinstance(result, dict):
        result = {}
    escalation = result.get("escalation")
    if escalation in ("urgent", "blocked", "clinician"):
        messages = {
            "urgent": (
                "If someone is in immediate danger or has severe acute symptoms, call 112 or go to the nearest emergency department. Do not wait for the assistant or an appointment.",
                "ഉടൻ അപകടമോ ഗുരുതരമായ ലക്ഷണങ്ങളോ ഉണ്ടെങ്കിൽ 112-ൽ വിളിക്കുക അല്ലെങ്കിൽ അടുത്ത അത്യാഹിത വിഭാഗത്തിൽ പോകുക. അസിസ്റ്റന്റിനോ കൂടിക്കാഴ്ചയ്ക്കോ കാത്തിരിക്കരുത്.",
            ),
            "blocked": (
                "I can help you find pages in your account. I cannot reveal private records, secrets or instructions.",
                "നിങ്ങളുടെ അക്കൗണ്ടിലെ പേജുകൾ കണ്ടെത്താൻ സഹായിക്കാം. സ്വകാര്യ രേഖകളോ രഹസ്യങ്ങളോ നിർദ്ദേശങ്ങളോ വെളിപ്പെടുത്താനാവില്ല.",
            ),
            "clinician": (
                "I can help you find care and record observations, but I cannot diagnose or make treatment decisions. Discuss individual concerns with a qualified healthcare professional.",
                "പരിചരണം കണ്ടെത്താനും നിരീക്ഷണങ്ങൾ രേഖപ്പെടുത്താനും സഹായിക്കാം. രോഗനിർണയമോ ചികിത്സാ തീരുമാനമോ നൽകാനാവില്ല. വ്യക്തിഗത ആശങ്കകൾ യോഗ്യതയുള്ള ആരോഗ്യവിദഗ്ധനുമായി ചർച്ച ചെയ്യുക.",
            ),
        }
        return {
            "answer": messages[escalation][language == "ml"],
            "language": language,
            "status": "safety_response",
            "escalation": escalation,
            "citations": [],
            "actions": ["booking"] if escalation == "clinician" and "booking" in allowed else [],
        }
    selected = result.get("destination")
    ids = [selected] if isinstance(selected, str) and selected in allowed else []
    if not ids:
        # shortcut: lexical fallback only finds named features; use Browse all sections for ambiguous requests.
        text = message.casefold()
        scored = [
            (
                sum(
                    word in text
                    for word in set(row["keywords"].casefold().split())
                    if len(word) > 2
                ),
                row["id"],
            )
            for row in options
        ]
        ids = [key for score, key in sorted(scored, reverse=True)[:3] if score > 0]
    if ids:
        answer = (
            "Here is where you can do that. Choose a button to open the section."
            if language == "en"
            else "ഇതിനുള്ള വിഭാഗങ്ങൾ ഇവിടെയുണ്ട്. തുറക്കാൻ താഴെയുള്ള ബട്ടൺ തിരഞ്ഞെടുക്കുക."
        )
    else:
        ids = [key for key in ("milestones", "booking", "account") if key in allowed]
        answer = (
            "I can help you find your way around NeuroNest. Try one of these sections, or tell me what you want to do."
            if language == "en"
            else "NeuroNest-ലെ വിഭാഗങ്ങൾ കണ്ടെത്താൻ സഹായിക്കാം. ഇവയിൽ ഒന്ന് തിരഞ്ഞെടുക്കുക, അല്ലെങ്കിൽ ചെയ്യേണ്ടത് പറയുക."
        )
    return {
        "answer": answer,
        "language": language,
        "status": "navigation",
        "escalation": "none",
        "citations": [],
        "actions": ids,
    }
