from datetime import date, timedelta
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from . import models as m
from .access import can_access, visible_children


def rows(response):
    """List endpoints return a page envelope; assertions care about the rows in it."""
    data = response.json() if hasattr(response, "json") else response
    return data["results"] if isinstance(data, dict) and "results" in data else data


class PrivacyWorkflowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.parent = self.account("guardian")
        self.subject = self.account("adult")
        self.other = self.account("stranger")
        self.admin = self.account("operator", "admin")
        self.doctor = self.account("doctor", "doctor")
        m.Practitioner.objects.create(
            user=self.doctor,
            profession="doctor",
            specialty="Synthetic",
            verified=True,
            status="active",
        )
        self.child = m.Child.objects.create(
            name="Historical subject", date_of_birth=date(2000, 1, 1)
        )
        self.membership = m.Guardianship.objects.create(
            child=self.child,
            user=self.parent,
            email=self.parent.email,
            can_share=True,
            status="active",
            invited_by=self.parent,
        )
        self.grant = m.Grant.objects.create(
            child=self.child,
            recipient=self.doctor,
            grantor=self.parent,
            scopes=["records", "export"],
            purpose="Synthetic",
            expires_at=timezone.now() + timedelta(days=30),
        )
        self.record = m.Record.objects.create(
            child=self.child,
            author=self.doctor,
            kind="note",
            title="Retained historical note",
            body="Synthetic only",
            status="signed",
        )

    def account(self, name, role="parent"):
        return m.Account.objects.create_user(
            username=name, email=f"{name}@example.test", display_name=name, role=role
        )

    def post(self, user, path, body):
        self.client.force_authenticate(user)
        return self.client.post("/v1/privacy-requests/" + path, body, format="json")

    def create(self, kind="adult_transition"):
        body = {"kind": kind, "detail": "Synthetic request for reviewed execution"}
        if kind == "adult_transition":
            body["child"] = str(self.child.pk)
        response = self.post(self.parent, "", body)
        self.assertEqual(response.status_code, 201, response.data)
        return response.data["id"]

    def reviewed_transition(self):
        identifier = self.create()
        response = self.post(
            self.admin,
            f"{identifier}/review/",
            {
                "subject": str(self.subject.pk),
                "evidence_reference": "synthetic-identity-review-001",
            },
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["status"], "awaiting_acceptance")
        return identifier

    def test_adult_transfer_requires_review_personal_acceptance_and_revokes_inherited_access(self):
        self.assertFalse(can_access(self.parent, self.child))
        self.assertFalse(can_access(self.doctor, self.child))
        identifier = self.reviewed_transition()
        self.assertEqual(
            self.post(self.other, f"{identifier}/accept/", {"accept": True}).status_code, 404
        )
        self.assertEqual(
            self.post(self.subject, f"{identifier}/accept/", {"accept": "true"}).status_code, 400
        )
        accepted = self.post(self.subject, f"{identifier}/accept/", {"accept": True})
        self.assertEqual(accepted.status_code, 200, accepted.data)
        self.assertEqual(accepted.data["execution_receipt"]["revoked_guardianships"], 1)
        self.assertEqual(
            self.post(self.subject, f"{identifier}/accept/", {"accept": True}).data[
                "execution_receipt"
            ],
            accepted.data["execution_receipt"],
        )
        self.child.refresh_from_db()
        self.membership.refresh_from_db()
        self.grant.refresh_from_db()
        self.assertIsNotNone(self.membership.revoked_at)
        self.assertIsNotNone(self.grant.revoked_at)
        self.assertTrue(can_access(self.subject, self.child, "records"))
        self.assertTrue(can_access(self.subject, self.child, "observations"))
        self.assertFalse(can_access(self.subject, self.child, share=True))
        self.assertFalse(can_access(self.parent, self.child))
        self.assertFalse(can_access(self.doctor, self.child))
        self.assertEqual(list(visible_children(self.subject)), [self.child])
        self.client.force_authenticate(self.subject)
        self.assertEqual(self.client.get(f"/v1/records/{self.record.pk}/").status_code, 200)
        self.assertEqual(
            self.client.post(
                "/v1/exports/", {"child": str(self.child.pk)}, format="json"
            ).status_code,
            200,
        )
        self.assertEqual(
            self.client.post(
                "/v1/records/",
                {
                    "child": str(self.child.pk),
                    "kind": "report",
                    "title": "No child-care write",
                    "body": "No",
                },
                format="json",
            ).status_code,
            403,
        )
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.get(f"/v1/records/{self.record.pk}/").status_code, 404)

    def test_wrong_family_underage_subject_and_guardian_account_cannot_transfer(self):
        self.assertEqual(
            self.post(
                self.parent, "", {"kind": "adult_transition", "detail": "No record selected"}
            ).status_code,
            400,
        )
        denied = self.post(
            self.other,
            "",
            {"kind": "adult_transition", "child": str(self.child.pk), "detail": "No relationship"},
        )
        self.assertEqual(denied.status_code, 403)
        identifier = self.create()
        body = {"subject": str(self.parent.pk), "evidence_reference": "synthetic-proof-001"}
        self.assertEqual(self.post(self.admin, f"{identifier}/review/", body).status_code, 400)
        self.assertEqual(self.post(self.parent, f"{identifier}/review/", body).status_code, 403)
        self.child.date_of_birth = timezone.localdate() - timedelta(days=365 * 5)
        self.child.save()
        self.assertEqual(
            self.post(
                self.admin, f"{identifier}/review/", {**body, "subject": str(self.subject.pk)}
            ).status_code,
            403,
        )

    def test_pending_transfer_cannot_survive_revoked_requester_or_conflicting_review(self):
        identifier = self.reviewed_transition()
        second = self.create()
        self.assertEqual(
            self.post(
                self.admin,
                f"{second}/review/",
                {"subject": str(self.other.pk), "evidence_reference": "synthetic-proof-002"},
            ).status_code,
            409,
        )
        self.membership.status = "revoked"
        self.membership.revoked_at = timezone.now()
        self.membership.save()
        self.assertEqual(
            self.post(self.subject, f"{identifier}/accept/", {"accept": True}).status_code, 403
        )

    def test_privacy_relationship_is_checked_and_general_resolution_cannot_fake_execution(self):
        self.assertEqual(
            self.post(
                self.other,
                "",
                {"kind": "correction", "child": str(self.child.pk), "detail": "Unrelated"},
            ).status_code,
            403,
        )
        self.assertEqual(
            self.post(
                self.parent,
                "",
                {"kind": "deletion", "child": str(self.child.pk), "detail": "Erase chart"},
            ).status_code,
            400,
        )
        identifier = self.create("deletion")
        self.assertEqual(
            self.post(
                self.admin,
                f"{identifier}/resolve/",
                {"status": "resolved", "response": "Pretend complete"},
            ).status_code,
            400,
        )
        self.assertEqual(self.post(self.admin, f"{identifier}/execute/", {}).status_code, 409)
        self.assertEqual(
            self.post(
                self.admin,
                f"{identifier}/review/",
                {"evidence_reference": "synthetic-proof-001", "retention_holds": []},
            ).status_code,
            400,
        )

    def test_account_execution_disables_sessions_erases_inbox_preserves_records_and_is_idempotent(
        self,
    ):
        self.parent.push_token = "synthetic-device-token"
        self.parent.push_notifications = True
        self.parent.save()
        m.Notification.objects.create(
            user=self.parent,
            title="Synthetic",
            body="Inbox item",
            kind="test",
            reference="privacy-test",
        )
        identifier = self.create("deletion")
        approved = self.post(
            self.admin,
            f"{identifier}/review/",
            {
                "evidence_reference": "synthetic-request-verification-001",
                "retention_holds": [
                    "Clinical and financial retention requires approved policy and case review"
                ],
            },
        )
        self.assertEqual(approved.status_code, 200, approved.data)
        executed = self.post(self.admin, f"{identifier}/execute/", {})
        self.assertEqual(executed.status_code, 200, executed.data)
        self.assertEqual(executed.data["status"], "retention_blocked")
        self.assertEqual(executed.data["execution_receipt"]["notification_entries_erased"], 1)
        self.assertEqual(
            self.post(self.admin, f"{identifier}/execute/", {}).data["execution_receipt"],
            executed.data["execution_receipt"],
        )
        self.parent.refresh_from_db()
        self.grant.refresh_from_db()
        self.assertFalse(self.parent.is_active)
        self.assertEqual(self.parent.push_token, "")
        self.assertFalse(m.Notification.objects.filter(user=self.parent).exists())
        self.assertIsNotNone(self.grant.revoked_at)
        self.assertTrue(m.Record.objects.filter(pk=self.record.pk).exists())
        self.assertTrue(
            m.Audit.objects.filter(
                action="privacy.account_disabled", object_id=str(identifier)
            ).exists()
        )
        self.assertEqual(
            self.post(
                self.admin,
                f"{identifier}/resolve/",
                {"status": "resolved", "response": "Erase receipt"},
            ).status_code,
            409,
        )
        restored = self.post(
            self.admin,
            f"{identifier}/restore/",
            {"evidence_reference": "synthetic-restoration-review-001"},
        )
        self.assertEqual(restored.status_code, 200, restored.data)
        self.parent.refresh_from_db()
        self.membership.refresh_from_db()
        self.assertTrue(self.parent.is_active)
        self.assertEqual(self.membership.status, "revoked")
        self.assertFalse(self.parent.push_notifications)

    def test_reviewed_transfer_can_be_revoked_without_restoring_guardian_access(self):
        identifier = self.reviewed_transition()
        self.post(self.subject, f"{identifier}/accept/", {"accept": True})
        self.assertEqual(
            self.post(
                self.admin,
                f"{identifier}/revoke-transition/",
                {"evidence_reference": "synthetic-identity-correction-001"},
            ).status_code,
            200,
        )
        self.child.refresh_from_db()
        self.assertFalse(can_access(self.subject, self.child))
        self.assertFalse(can_access(self.parent, self.child))
        self.assertEqual(self.child.transition_status, "review_required")
        restored = self.post(
            self.admin,
            f"{identifier}/review/",
            {
                "subject": str(self.subject.pk),
                "evidence_reference": "synthetic-subject-reverified-001",
            },
        )
        self.assertEqual(restored.status_code, 200, restored.data)
        self.assertEqual(
            self.post(self.subject, f"{identifier}/accept/", {"accept": True}).status_code, 200
        )
        self.child.refresh_from_db()
        self.assertTrue(can_access(self.subject, self.child))
        self.assertFalse(can_access(self.parent, self.child))
