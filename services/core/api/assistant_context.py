"""Minimized, authorized context passed from core to the assistant engine."""

from django.utils import timezone

from . import models as m
from .access import can_access


def age_months(date_of_birth):
    today = timezone.localdate()
    return (today.year - date_of_birth.year) * 12 + today.month - date_of_birth.month - (
        today.day < date_of_birth.day
    )


def build(user, child):
    """Return only current-scope fields that are relevant to a care explanation.

    The caller has already required records access. Other categories are independently
    omitted if their live grant is absent, revoked, or expired.
    """
    observations = []
    if can_access(user, child, "observations"):
        observations = [
            {
                "domain": row.domain,
                "title": row.title,
                "status": row.status,
                "observed_on": row.observed_on.isoformat(),
                "note": row.note[:500],
            }
            for row in m.Observation.objects.filter(child=child)
            .order_by("-observed_on", "-created_at")[:10]
        ]

    goals = []
    if can_access(user, child, "therapy"):
        goals = [
            {
                "title": row.title,
                "status": row.status,
                "target_date": row.target_date.isoformat() if row.target_date else None,
            }
            for row in m.Goal.objects.filter(child=child).order_by("-created_at")[:5]
        ]

    screenings = []
    if can_access(user, child, "screening"):
        screenings = [
            {
                "instrument_id": row.instrument_id,
                "status": row.status,
                "reviewed_at": row.reviewed_at.isoformat() if row.reviewed_at else None,
            }
            for row in m.Screening.objects.filter(child=child).order_by("-created_at")[:5]
        ]

    triage_signals = []
    # ponytail: a retained "lost" status remains a review signal; add a clinician-reviewed
    # resolution state and recency policy before any automated care workflow depends on it.
    if any(row["status"] == "lost" for row in observations):
        triage_signals.append("reported_skill_loss")
    if any(row["status"] == "follow_up_required" for row in screenings):
        triage_signals.append("screening_follow_up_pending")

    records = [
        {
            "id": str(row.id),
            "subject_id": str(child.id),
            "title": row.title,
            "body": row.body[:2000],
        }
        for row in m.Record.objects.filter(child=child, status="signed").order_by("-created_at")[:5]
    ]
    return {
        "subject_id": str(child.id),
        "records": records,
        "longitudinal": {
            "age_months": age_months(child.date_of_birth),
            "language": child.language,
            "observations": observations,
            "goals": goals,
            "screenings": screenings,
            "triage_signals": triage_signals,
        },
    }
