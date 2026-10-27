from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied
from .models import Child, Guardianship, Grant, Practitioner, Audit, Outbox

SCOPES = {"records", "observations", "therapy", "screening", "messages", "export"}


class AuthorizationRows:
    """Authorization rows for one user over a fixed child set, loaded once.

    can_access needs guardianships (for the user and for every grantor), the
    user's live grants and their practitioner standing. Resolving those per
    child turns a list view into one query per child per scope, so a caller
    holding the whole candidate set loads them together and passes this in.
    """

    def __init__(self, user, children):
        self.user_id = user.pk
        self.child_ids = {child.pk for child in children}
        self._clinician = None
        self.memberships = {}
        # Every active guardianship on these children, not only the caller's:
        # a clinician grant is only live while its grantor still shares.
        for row in Guardianship.objects.filter(
            child_id__in=self.child_ids, status="active", revoked_at__isnull=True
        ):
            self.memberships.setdefault((row.user_id, row.child_id), []).append(row)
        self.grants = {}
        for row in Grant.objects.filter(
            child_id__in=self.child_ids,
            recipient_id=user.pk,
            revoked_at__isnull=True,
            expires_at__gt=timezone.now(),
        ).select_related("grantor"):
            self.grants.setdefault(row.child_id, []).append(row)

    def covers(self, child):
        return child.pk in self.child_ids

    def owns(self, user, child):
        return user.pk == self.user_id and child.pk in self.child_ids

    def clinician(self, user):
        if self._clinician is None:
            self._clinician = clinician_active(user)
        return self._clinician


def clinician_active(user):
    return (
        user.is_active
        and user.role in {"doctor", "therapist", "mentor"}
        and Practitioner.objects.filter(
            user=user, profession=user.role, verified=True, status="active"
        ).exists()
    )


def adult(child):
    today = timezone.localdate()
    return (
        today.year
        - child.date_of_birth.year
        - ((today.month, today.day) < (child.date_of_birth.month, child.date_of_birth.day))
    ) >= 18


def adult_subject(user, child):
    return (
        user.is_authenticated
        and user.is_active
        and adult(child)
        and child.transition_status == "adult_managed"
        and child.adult_subject_id == user.pk
    )


def guardian(user, child, share=False, scope=None, rows=None):
    if rows is not None and rows.covers(child):
        memberships = rows.memberships.get((user.pk, child.pk), [])
    else:
        memberships = list(
            Guardianship.objects.filter(
                user=user, child=child, status="active", revoked_at__isnull=True
            )
        )
    if share:
        memberships = [g for g in memberships if g.can_share]
    if scope:
        memberships = [g for g in memberships if g.can_share or scope in g.scopes]
    return user.is_active and bool(memberships) and not adult(child)


def can_access(user, child, scope="records", share=False, rows=None):
    if not user.is_authenticated or not user.is_active:
        return False
    if adult_subject(user, child):
        return not share and scope in SCOPES
    if guardian(user, child, share, scope=scope, rows=rows):
        return True
    if share or adult(child):
        return False
    # Grants and practitioner standing are the caller's own; a prefetch for a
    # different user answers only the guardianship half above.
    mine = rows is not None and rows.owns(user, child)
    if not (rows.clinician(user) if mine else clinician_active(user)):
        return False
    if user.role == "mentor" and scope != "messages":
        return False
    grants = (
        rows.grants.get(child.pk, [])
        if mine
        else Grant.objects.filter(
            child=child, recipient=user, revoked_at__isnull=True, expires_at__gt=timezone.now()
        )
    )
    for grant in grants:
        if scope in grant.scopes and guardian(grant.grantor, child, share=True, rows=rows):
            return True
    return False


def require_child(user, child, scope="records", share=False):
    if not can_access(user, child, scope, share):
        raise PermissionDenied("No active authorization for this child and purpose.")
    return child


def candidate_children(user):
    ids = Guardianship.objects.filter(
        user=user, status="active", revoked_at__isnull=True
    ).values_list("child_id", flat=True)
    return list(
        Child.objects.filter(
            Q(adult_subject=user)
            | Q(id__in=ids)
            | Q(
                id__in=Grant.objects.filter(
                    recipient=user, revoked_at__isnull=True, expires_at__gt=timezone.now()
                ).values("child_id")
            )
        )
    )


def visible_children(user, scope="records"):
    return visible_children_any(user, [scope])


def visible_children_any(user, scopes):
    """Children reachable under any of these scopes, over one load of authorization rows."""
    candidates = candidate_children(user)
    rows = AuthorizationRows(user, candidates)
    return Child.objects.filter(
        id__in=[
            c.pk
            for c in candidates
            if any(can_access(user, c, scope, rows=rows) for scope in scopes)
        ]
    )


def record_disclosure_filter(user):
    """Unsigned clinical drafts stay visible only to their author."""
    return Q(status="signed") | Q(status="draft", author=user)


def audit(user, child, action, obj=None, purpose=""):
    return Audit.objects.create(
        actor=user,
        child=child,
        action=action,
        object_id=str(obj.pk if hasattr(obj, "pk") else obj or ""),
        purpose=purpose,
    )


def emit(kind, obj, actor=None, child=None, dedupe_key=None, **payload):
    values = {
        "kind": kind,
        "aggregate_id": str(obj.pk if hasattr(obj, "pk") else obj),
        "actor_id": actor.pk if actor else None,
        "child_id": child.pk if child else None,
        "payload": payload,
        "available_at": timezone.now(),
    }
    if dedupe_key:
        item, _ = Outbox.objects.get_or_create(dedupe_key=dedupe_key, defaults=values)
        return item
    return Outbox.objects.create(**values)
