import io
import json
import tempfile
from datetime import date, timedelta
from unittest.mock import patch
from django.db import IntegrityError, transaction
from django.test import TestCase, override_settings
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from . import models as m
from .access import can_access, clinician_active
from .finance import create_slot, hold_appointment, create_payment, simulate_capture
from .tasks import create_reminders, process_outbox, revoke_rooms


def rows(response):
    """List endpoints return a page envelope; assertions care about the rows in it."""
    data = response.json() if hasattr(response, "json") else response
    return data["results"] if isinstance(data, dict) and "results" in data else data


@override_settings(
    DEMO_MODE=True,
    LOCAL_TEST_SCANNER=True,
    CLAMAV_HOST="",
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
)
class CoreSecurityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.parent = m.Account.objects.create_user(
            username="parent", email="parent@example.test", display_name="Parent", role="parent"
        )
        self.other = m.Account.objects.create_user(
            username="other", email="other@example.test", display_name="Other", role="parent"
        )
        self.doctor = m.Account.objects.create_user(
            username="doctor", email="doctor@example.test", display_name="Doctor", role="doctor"
        )
        self.admin = m.Account.objects.create_user(
            username="admin", email="admin@example.test", display_name="Admin", role="admin"
        )
        self.child = m.Child.objects.create(
            name="First", date_of_birth=date(2020, 1, 2), language="en"
        )
        self.foreign = m.Child.objects.create(
            name="Second", date_of_birth=date(2020, 2, 3), language="en"
        )
        for child, user in [(self.child, self.parent), (self.foreign, self.other)]:
            m.Guardianship.objects.create(
                child=child,
                user=user,
                email=user.email,
                can_share=True,
                status="active",
                invited_by=user,
            )
        self.practitioner = m.Practitioner.objects.create(
            user=self.doctor,
            profession="doctor",
            specialty="Synthetic",
            fee_minor=100000,
            verified=True,
            status="active",
        )
        self.grant = m.Grant.objects.create(
            child=self.child,
            recipient=self.doctor,
            grantor=self.parent,
            scopes=["records", "observations", "therapy", "screening", "messages", "export"],
            purpose="test",
            expires_at=timezone.now() + timedelta(days=30),
        )
        self.record = m.Record.objects.create(
            child=self.child,
            author=self.doctor,
            kind="note",
            title="Test note",
            body="First family",
        )
        self.foreign_record = m.Record.objects.create(
            child=self.foreign,
            author=self.other,
            kind="report",
            title="Private note",
            body="Second family",
        )
        self.login(self.parent)

    def login(self, user):
        self.client.force_authenticate(user)

    def post(self, path, data):
        return self.client.post("/v1/" + path + "/", data, format="json")

    def test_family_isolation_lists_details_exports_writes(self):
        # A clinician draft is not part of the family chart until it is signed.
        self.assertEqual(rows(self.client.get("/v1/records/")), [])
        self.assertEqual(self.client.get(f"/v1/records/{self.record.pk}/").status_code, 404)
        exported = self.post("exports", {"child": str(self.child.pk)})
        self.assertEqual(exported.status_code, 200)
        self.assertEqual(exported.data["records"], [])
        self.login(self.doctor)
        self.assertEqual(self.client.get(f"/v1/records/{self.record.pk}/").status_code, 200)
        self.login(self.parent)
        self.record.status = "signed"
        self.record.signed_at = timezone.now()
        self.record.save(update_fields=["status", "signed_at"])
        self.assertEqual(len(rows(self.client.get("/v1/records/"))), 1)
        self.assertEqual(self.client.get(f"/v1/records/{self.record.pk}/").status_code, 200)
        self.assertEqual(
            len(self.post("exports", {"child": str(self.child.pk)}).data["records"]), 1
        )
        self.assertEqual(self.client.get(f"/v1/records/{self.foreign_record.pk}/").status_code, 404)
        self.assertEqual(self.client.get(f"/v1/records/?child={self.foreign.pk}").status_code, 403)
        self.assertEqual(self.post("exports", {"child": str(self.foreign.pk)}).status_code, 403)
        self.assertEqual(
            self.post(
                "records",
                {"child": str(self.foreign.pk), "kind": "report", "title": "Attempt", "body": "No"},
            ).status_code,
            403,
        )

    def test_scoped_updates_cannot_move_children(self):
        obj = m.Observation.objects.create(
            child=self.child,
            author=self.parent,
            domain="communication",
            title="Observed",
            status="observed",
            observed_on=timezone.localdate(),
        )
        response = self.client.patch(
            f"/v1/observations/{obj.pk}/", {"child": str(self.foreign.pk)}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        obj.refresh_from_db()
        self.assertEqual(obj.child_id, self.child.id)

    def test_revoked_and_expired_grants_lose_access(self):
        self.login(self.doctor)
        self.assertEqual(self.client.get(f"/v1/records/{self.record.pk}/").status_code, 200)
        self.grant.revoked_at = timezone.now()
        self.grant.save()
        self.assertEqual(self.client.get(f"/v1/records/{self.record.pk}/").status_code, 404)
        self.assertEqual(self.post("exports", {"child": str(self.child.pk)}).status_code, 403)
        self.grant.revoked_at = None
        self.grant.expires_at = timezone.now() - timedelta(seconds=1)
        self.grant.save()
        self.assertFalse(can_access(self.doctor, self.child))

    def test_suspended_or_mismatched_professional_loses_access(self):
        self.login(self.doctor)
        self.practitioner.status = "suspended"
        self.practitioner.save()
        self.assertEqual(rows(self.client.get("/v1/records/")), [])
        self.practitioner.status = "active"
        self.practitioner.profession = "therapist"
        self.practitioner.save()
        self.assertFalse(clinician_active(self.doctor))
        self.assertEqual(self.post(f"records/{self.record.pk}/sign", {}).status_code, 404)

    def test_operations_cannot_read_patient_chart(self):
        self.login(self.admin)
        self.assertEqual(rows(self.client.get("/v1/children/")), [])
        self.assertEqual(rows(self.client.get("/v1/records/")), [])
        self.assertEqual(self.post("exports", {"child": str(self.child.pk)}).status_code, 403)

    def test_limited_caregiver_cannot_read_records_or_export(self):
        invite = self.post(
            "guardianships",
            {
                "child": str(self.child.pk),
                "email": self.other.email,
                "relationship": "caregiver",
                "can_share": False,
                "scopes": ["observations", "therapy", "messages"],
            },
        )
        self.assertEqual(invite.status_code, 201, invite.data)
        self.login(self.other)
        self.assertEqual(
            self.post(f"guardianships/{invite.data['id']}/accept", {}).status_code, 200
        )
        self.assertEqual(self.client.get(f"/v1/records/?child={self.child.pk}").status_code, 403)
        self.assertEqual(self.post("exports", {"child": str(self.child.pk)}).status_code, 403)
        self.assertEqual(
            self.client.get(f"/v1/observations/?child={self.child.pk}").status_code, 200
        )
        self.assertEqual(
            self.post(
                "grants",
                {
                    "child": str(self.child.pk),
                    "recipient": str(self.doctor.pk),
                    "scopes": ["records"],
                    "purpose": "Test",
                    "expires_at": (timezone.now() + timedelta(days=1)).isoformat(),
                },
            ).status_code,
            403,
        )

    def test_invitation_requires_matching_email_and_active_grantor(self):
        invite = self.post(
            "guardianships",
            {
                "child": str(self.child.pk),
                "email": self.other.email,
                "relationship": "parent",
                "can_share": True,
            },
        )
        self.assertEqual(
            self.post(f"guardianships/{invite.data['id']}/accept", {}).status_code, 403
        )
        m.Guardianship.objects.filter(child=self.child, user=self.parent).update(status="revoked")
        self.login(self.other)
        self.assertEqual(
            self.post(f"guardianships/{invite.data['id']}/accept", {}).status_code, 403
        )

    def test_adult_transition_removes_old_guardian_authority(self):
        self.child.date_of_birth = date(2000, 1, 1)
        self.child.save()
        self.assertEqual(rows(self.client.get("/v1/records/")), [])
        self.assertEqual(self.post("exports", {"child": str(self.child.pk)}).status_code, 403)
        self.assertEqual(
            self.post(
                "privacy-requests",
                {
                    "kind": "adult_transition",
                    "child": str(self.child.pk),
                    "detail": "Request reviewed transfer.",
                },
            ).status_code,
            201,
        )

    def test_signed_note_is_immutable_and_amendment_preserves_original(self):
        self.login(self.doctor)
        self.assertEqual(self.post(f"records/{self.record.pk}/sign", {}).status_code, 200)
        response = self.client.patch(
            f"/v1/records/{self.record.pk}/", {"body": "overwrite"}, format="json"
        )
        self.assertEqual(response.status_code, 403)
        response = self.post(
            f"records/{self.record.pk}/amend",
            {"body": "Correction", "reason": "Correct an observation"},
        )
        self.assertEqual(response.status_code, 201)
        self.record.refresh_from_db()
        self.assertEqual(self.record.body, "First family")
        self.assertEqual(str(response.data["amendment_of"]), str(self.record.pk))
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                m.Record.objects.filter(pk=self.record.pk).update(body="Bypass API")

    def test_parent_cannot_prescribe_or_sign(self):
        self.assertEqual(
            self.post(
                "records",
                {"child": str(self.child.pk), "kind": "prescription", "title": "No", "body": "No"},
            ).status_code,
            403,
        )
        self.assertEqual(self.post(f"records/{self.record.pk}/sign", {}).status_code, 404)

    def test_observation_idempotency_and_reauthorization(self):
        data = {
            "child": str(self.child.pk),
            "domain": "communication",
            "title": "New request",
            "status": "observed",
            "note": "Sample",
            "observed_on": str(timezone.localdate()),
        }
        first = self.client.post(
            "/v1/observations/", data, format="json", HTTP_IDEMPOTENCY_KEY="draft-one"
        )
        second = self.client.post(
            "/v1/observations/", data, format="json", HTTP_IDEMPOTENCY_KEY="draft-one"
        )
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(str(first.data["id"]), str(second.data["id"]))
        self.assertEqual(m.Observation.objects.count(), 1)
        changed = self.client.post(
            "/v1/observations/",
            {**data, "title": "Different"},
            format="json",
            HTTP_IDEMPOTENCY_KEY="draft-one",
        )
        self.assertEqual(changed.status_code, 409)
        m.Guardianship.objects.filter(child=self.child, user=self.parent).update(status="revoked")
        self.assertEqual(
            self.client.post(
                "/v1/observations/", data, format="json", HTTP_IDEMPOTENCY_KEY="draft-one"
            ).status_code,
            403,
        )

    def test_parent_can_record_a_concern_with_auditable_safe_values(self):
        response = self.client.post(
            "/v1/observations/",
            {
                "child": str(self.child.pk),
                "domain": "emotional_regulation",
                "title": "  Became upset after a loud hand dryer  ",
                "status": "unsure",
                "note": "  It happened twice this week.  ",
                "observed_on": str(timezone.localdate()),
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["title"], "Became upset after a loud hand dryer")
        self.assertEqual(response.data["note"], "It happened twice this week.")
        self.assertTrue(
            m.Audit.objects.filter(
                actor=self.parent,
                child=self.child,
                action="observation.created",
                object_id=response.data["id"],
            ).exists()
        )
        for field, value in [("domain", "diagnosis"), ("status", "urgent")]:
            invalid = self.client.post(
                "/v1/observations/",
                {
                    "child": str(self.child.pk),
                    "domain": "other",
                    "title": "A concern",
                    "status": "observed",
                    "observed_on": str(timezone.localdate()),
                    field: value,
                },
                format="json",
            )
            self.assertEqual(invalid.status_code, 400, invalid.data)

    def test_parent_questionnaire_is_private_and_non_diagnostic(self):
        payload = {
            "child": str(self.child.pk),
            "questionnaire_id": "developmental-check-in",
            "questionnaire_version": "1",
            "answers": {
                "communication": "sometimes",
                "connection": "often",
                "play": "almost_always",
                "sensory": "concerned",
                "coordination": "never",
                "regulation": "sometimes",
            },
        }
        with patch("api.views.engine_call") as diagnostic_engine:
            response = self.client.post("/v1/parent-questionnaires/", payload, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["questionnaire_id"], "developmental-check-in")
        self.assertEqual(response.data["answers"], payload["answers"])
        diagnostic_engine.assert_not_called()
        self.assertTrue(
            m.Audit.objects.filter(
                actor=self.parent,
                child=self.child,
                action="parent_questionnaire_response.completed",
                object_id=response.data["id"],
            ).exists()
        )
        self.assertEqual(
            self.client.get(f"/v1/parent-questionnaires/{response.data['id']}/").status_code, 200
        )
        self.assertTrue(
            m.Audit.objects.filter(
                actor=self.parent,
                child=self.child,
                action="parent_questionnaire_response.read",
                object_id=response.data["id"],
            ).exists()
        )
        exported = self.post("exports", {"child": str(self.child.pk)})
        self.assertNotIn("parent_questionnaires", exported.data)

        with (
            override_settings(PATIENT_AI_ENABLED=True),
            patch(
                "api.views.engine_call", return_value={"answer": "Education"}
            ) as assistant_engine,
        ):
            self.assertEqual(
                self.post(
                    "assistant",
                    {"message": "Explain", "child": str(self.child.pk), "include_records": True},
                ).status_code,
                200,
            )
            self.assertNotIn(response.data["id"], json.dumps(assistant_engine.call_args.args[2]))
            self.assertNotIn("parent_questionnaire", json.dumps(assistant_engine.call_args.args[2]))

        self.login(self.doctor)
        self.assertEqual(rows(self.client.get("/v1/parent-questionnaires/")), [])
        self.assertEqual(
            self.client.get(f"/v1/parent-questionnaires/?child={self.child.pk}").status_code, 403
        )
        self.assertEqual(
            self.client.post("/v1/parent-questionnaires/", payload, format="json").status_code, 403
        )
        self.login(self.other)
        self.assertEqual(
            self.client.get(f"/v1/parent-questionnaires/?child={self.child.pk}").status_code, 403
        )
        self.assertEqual(
            self.client.post("/v1/parent-questionnaires/", payload, format="json").status_code, 403
        )
        self.login(self.parent)
        m.Guardianship.objects.filter(child=self.child, user=self.parent).update(status="revoked")
        self.assertEqual(
            self.client.post("/v1/parent-questionnaires/", payload, format="json").status_code, 403
        )

    def test_parent_questionnaire_requires_every_fixed_answer(self):
        base = {
            "child": str(self.child.pk),
            "questionnaire_id": "developmental-check-in",
            "questionnaire_version": "1",
            "answers": {
                "communication": "sometimes",
                "connection": "often",
                "play": "almost_always",
                "sensory": "concerned",
                "coordination": "never",
                "regulation": "sometimes",
            },
        }
        omitted = {key: value for key, value in base.items() if key != "answers"}
        self.assertEqual(
            self.client.post("/v1/parent-questionnaires/", omitted, format="json").status_code, 400
        )
        missing = {**base, "answers": {k: v for k, v in base["answers"].items() if k != "play"}}
        self.assertEqual(
            self.client.post("/v1/parent-questionnaires/", missing, format="json").status_code, 400
        )
        invalid = {**base, "answers": {**base["answers"], "play": "score:9"}}
        self.assertEqual(
            self.client.post("/v1/parent-questionnaires/", invalid, format="json").status_code, 400
        )

    def test_attachment_quarantine_scanning_and_revoked_download(self):
        with (
            tempfile.TemporaryDirectory() as directory,
            override_settings(MEDIA_ROOT=__import__("pathlib").Path(directory)),
        ):
            response = self.client.post(
                "/v1/attachments/",
                {
                    "child": str(self.child.pk),
                    "file": SimpleUploadedFile(
                        "report.pdf",
                        b"%PDF-1.4\nSynthetic sample\n%%EOF",
                        content_type="application/pdf",
                    ),
                },
                format="multipart",
            )
            self.assertEqual(response.status_code, 201, response.data)
            identifier = response.data["id"]
            self.assertEqual(
                self.client.get(f"/v1/attachments/{identifier}/content/").status_code, 409
            )
            item = m.Outbox.objects.get(kind="attachment.scan")
            process_outbox(str(item.pk))
            self.assertEqual(
                self.client.get(f"/v1/attachments/{identifier}/content/").status_code, 200
            )
            self.login(self.other)
            self.assertEqual(
                self.client.get(f"/v1/attachments/{identifier}/content/").status_code, 404
            )
            self.login(self.doctor)
            self.grant.revoked_at = timezone.now()
            self.grant.save()
            self.assertEqual(
                self.client.get(f"/v1/attachments/{identifier}/content/").status_code, 404
            )

    def test_malware_scan_failure_keeps_quarantine(self):
        with (
            tempfile.TemporaryDirectory() as directory,
            override_settings(
                MEDIA_ROOT=__import__("pathlib").Path(directory), LOCAL_TEST_SCANNER=False
            ),
        ):
            response = self.client.post(
                "/v1/attachments/",
                {
                    "child": str(self.child.pk),
                    "file": SimpleUploadedFile("report.pdf", b"%PDF-1.4\n%%EOF"),
                },
                format="multipart",
            )
            process_outbox(str(m.Outbox.objects.get(kind="attachment.scan").pk))
            self.assertEqual(
                m.Attachment.objects.get(pk=response.data["id"]).scan_status, "quarantined"
            )
            self.assertEqual(
                self.client.get(f"/v1/attachments/{response.data['id']}/content/").status_code, 409
            )

    def test_image_uploads_decode_and_remain_quarantined(self):
        from PIL import Image
        from .storage import read_bytes

        with (
            tempfile.TemporaryDirectory() as directory,
            override_settings(MEDIA_ROOT=__import__("pathlib").Path(directory), S3_BUCKET=""),
        ):
            for image_format in ["PNG", "JPEG"]:
                with self.subTest(image_format=image_format):
                    data = io.BytesIO()
                    Image.new("RGB", (3, 2), "green").save(data, format=image_format)
                    response = self.client.post(
                        "/v1/attachments/",
                        {
                            "child": str(self.child.pk),
                            "file": SimpleUploadedFile("sample", data.getvalue()),
                        },
                        format="multipart",
                    )
                    self.assertEqual(response.status_code, 201, response.data)
                    attachment = m.Attachment.objects.get(pk=response.data["id"])
                    self.assertEqual(attachment.scan_status, "quarantined")
                    with Image.open(io.BytesIO(read_bytes(attachment))) as sanitized:
                        sanitized.load()
                        self.assertEqual(sanitized.size, (3, 2))
                        self.assertEqual(sanitized.format, image_format)
                    self.assertEqual(
                        self.client.get(f"/v1/attachments/{attachment.pk}/content/").status_code,
                        409,
                    )
            count = m.Attachment.objects.count()
            for malformed in [b"\x89PNG\r\n\x1a\ninvalid", b"\xff\xd8\xffinvalid"]:
                response = self.client.post(
                    "/v1/attachments/",
                    {
                        "child": str(self.child.pk),
                        "file": SimpleUploadedFile("broken", malformed),
                    },
                    format="multipart",
                )
                self.assertEqual(response.status_code, 400, response.data)
            self.assertEqual(m.Attachment.objects.count(), count)

    @override_settings(PRODUCTION=True, S3_BUCKET="", CLAMAV_HOST="", OUTBOX_WORKER_ENABLED=False)
    def test_production_rejects_attachments_without_persistent_scan_delivery(self):
        response = self.client.post(
            "/v1/attachments/",
            {
                "child": str(self.child.pk),
                "file": SimpleUploadedFile("report.pdf", b"%PDF-1.4\n%%EOF"),
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, 503)
        self.assertFalse(m.Attachment.objects.exists())

    def test_content_review_and_unsafe_video_urls(self):
        self.assertEqual(
            self.post(
                "content",
                {
                    "title": "Unreviewed",
                    "summary": "No",
                    "language": "en",
                    "kind": "article",
                    "source_url": "https://example.com",
                },
            ).status_code,
            403,
        )
        self.login(self.admin)
        response = self.post(
            "content",
            {
                "title": "Unreviewed",
                "summary": "No",
                "language": "en",
                "kind": "article",
                "source_url": "https://example.com",
            },
        )
        self.assertEqual(response.status_code, 201)
        self.login(self.parent)
        self.assertEqual(rows(self.client.get("/v1/content/")), [])
        self.login(self.admin)
        self.post(f"content/{response.data['id']}/review", {"status": "approved"})
        self.login(self.parent)
        self.assertEqual(len(rows(self.client.get("/v1/content/"))), 1)

    def test_assistant_does_not_receive_records_without_explicit_approval(self):
        with patch(
            "api.views.engine_call",
            return_value={
                "answer": "Education",
                "language": "en",
                "citations": [],
                "escalation": False,
                "status": "ok",
            },
        ) as mock:
            self.assertEqual(
                self.post(
                    "assistant", {"message": "Help", "language": "en", "child": str(self.child.pk)}
                ).status_code,
                200,
            )
            self.assertNotIn("context", mock.call_args.args[2])
            self.assertEqual(
                self.post(
                    "assistant",
                    {"message": "Help", "child": str(self.child.pk), "include_records": True},
                ).status_code,
                503,
            )
            self.assertEqual(
                self.post(
                    "assistant", {"message": "Help", "child": str(self.foreign.pk)}
                ).status_code,
                403,
            )

    def test_assistant_minimizes_authorized_context(self):
        self.record.status = "signed"
        self.record.signed_at = timezone.now()
        self.record.save()
        with (
            override_settings(PATIENT_AI_ENABLED=True),
            patch("api.views.engine_call", return_value={"answer": "Education"}) as mock,
        ):
            self.assertEqual(
                self.post(
                    "assistant",
                    {"message": "Explain", "child": str(self.child.pk), "include_records": True},
                ).status_code,
                200,
            )
            context = mock.call_args.args[2]["context"]
            self.assertEqual(context["subject_id"], str(self.child.pk))
            self.assertEqual(len(context["records"]), 1)
            self.assertNotIn("date_of_birth", context)

    def test_assistant_context_uses_live_category_scopes_and_review_signals(self):
        self.record.status = "signed"
        self.record.signed_at = timezone.now()
        self.record.save(update_fields=["status", "signed_at"])
        m.Observation.objects.create(
            child=self.child,
            author=self.parent,
            domain="communication",
            title="Words used less often",
            status="lost",
            note="Parent observation",
            observed_on=timezone.localdate(),
        )
        m.Goal.objects.create(child=self.child, author=self.parent, title="Shared play")
        m.Screening.objects.create(
            child=self.child,
            author=self.parent,
            instrument_id="workflow-only",
            status="follow_up_required",
            answers={"never_send": True},
            result={"never_send": "score"},
        )
        with (
            override_settings(PATIENT_AI_ENABLED=True),
            patch("api.views.engine_call", return_value={"answer": "Education"}) as mock,
        ):
            self.assertEqual(
                self.post(
                    "assistant",
                    {"message": "Explain", "child": str(self.child.pk), "include_records": True},
                ).status_code,
                200,
            )
            context = mock.call_args.args[2]["context"]
        self.assertEqual(
            context["longitudinal"]["triage_signals"],
            [
                "reported_skill_loss",
                "screening_follow_up_pending",
            ],
        )
        self.assertNotIn("date_of_birth", context)
        self.assertNotIn("never_send", json.dumps(context))

        self.login(self.doctor)
        self.grant.scopes = ["records"]
        self.grant.save(update_fields=["scopes"])
        with (
            override_settings(PATIENT_AI_ENABLED=True),
            patch("api.views.engine_call", return_value={"answer": "Education"}) as mock,
        ):
            self.assertEqual(
                self.post(
                    "assistant",
                    {"message": "Explain", "child": str(self.child.pk), "include_records": True},
                ).status_code,
                200,
            )
            limited = mock.call_args.args[2]["context"]["longitudinal"]
        self.assertEqual(limited["observations"], [])
        self.assertEqual(limited["goals"], [])
        self.assertEqual(limited["screenings"], [])

    def test_screening_followup_can_retry_missing_answers(self):
        run = m.Screening.objects.create(
            child=self.child, author=self.parent, instrument_id="synthetic-development-v1"
        )
        with patch(
            "api.views.engine_call",
            side_effect=[
                {"status": "follow_up_required"},
                {"status": "incomplete"},
                {"status": "completed"},
            ],
        ) as mock:
            first = self.post(
                f"screenings/{run.pk}/submit", {"answers": {"q1": True, "q2": False, "q3": True}}
            )
            self.assertEqual(first.status_code, 200)
            second = self.post(f"screenings/{run.pk}/submit", {"answers": {}})
            self.assertEqual(second.data["status"], "follow_up_required")
            third = self.post(f"screenings/{run.pk}/submit", {"answers": {"f1": True}})
            self.assertEqual(third.data["status"], "completed")
            self.assertEqual(mock.call_args.args[2]["stage"], "follow_up")
            self.assertEqual(mock.call_args.args[2]["prior_answers"]["q3"], True)
        self.login(self.doctor)
        self.assertEqual(
            self.post(f"screenings/{run.pk}/review", {"note": "Synthetic reviewed"}).status_code,
            200,
        )
        self.login(self.parent)
        self.assertEqual(self.post(f"screenings/{run.pk}/submit", {"answers": {}}).status_code, 409)

    def test_screening_creation_checks_the_child_language(self):
        self.child.language = "ml"
        self.child.save(update_fields=["language"])
        with patch(
            "api.views.engine_call",
            return_value=[{"id": "m-chat-r-f", "enabled": False}],
        ) as diagnostic_engine:
            response = self.post(
                "screenings",
                {"child": str(self.child.pk), "instrument_id": "m-chat-r-f"},
            )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(diagnostic_engine.call_args.args[1], "/instruments?language=ml")

    def test_message_requires_recipient_grant_and_participant_scope(self):
        self.grant.scopes = ["records"]
        self.grant.save()
        self.assertEqual(
            self.post(
                "messages",
                {"child": str(self.child.pk), "recipient": str(self.doctor.pk), "body": "Hello"},
            ).status_code,
            400,
        )
        self.grant.scopes = ["records", "messages"]
        self.grant.save()
        self.assertEqual(
            self.post(
                "messages",
                {"child": str(self.child.pk), "recipient": str(self.doctor.pk), "body": "Hello"},
            ).status_code,
            201,
        )
        self.login(self.doctor)
        self.assertEqual(len(rows(self.client.get("/v1/messages/"))), 1)
        self.login(self.other)
        self.assertEqual(rows(self.client.get("/v1/messages/")), [])

    def test_future_consultation_cannot_be_completed(self):
        slot = create_slot(
            self.doctor,
            timezone.now() + timedelta(days=1),
            timezone.now() + timedelta(days=1, minutes=30),
        )
        appointment = hold_appointment(self.parent, self.child, slot)
        simulate_capture(create_payment(self.parent, appointment))
        self.login(self.doctor)
        self.assertEqual(self.post(f"appointments/{appointment.pk}/complete", {}).status_code, 409)
        self.grant.revoked_at = timezone.now()
        self.grant.save()
        self.assertEqual(self.post(f"appointments/{appointment.pk}/no-show", {}).status_code, 404)

    @override_settings(
        PRODUCTION=True,
        LIVEKIT_URL="wss://self-hosted.example.test",
        LIVEKIT_API_KEY="synthetic",
        LIVEKIT_API_SECRET="synthetic-secret",
    )
    def test_production_video_refuses_unverified_token_revocation(self):
        policy = {
            "schema_version": 1,
            "version": "test-approved",
            "environment": "production",
            "approval": {
                "status": "approved",
                "reference": "test:approved-policy",
                "approved_by": "test",
                "approved_at": timezone.now().isoformat(),
            },
            "currency": "INR",
            "booking": {"hold_minutes": 10},
            "fees": {"platform_fee_bps": 0},
            "cancellation": {"notice_hours": 24, "refund_percent": 100, "late_refund_percent": 100},
            "retention": {
                "clinical_days": 30,
                "financial_days": 30,
                "audit_days": 30,
                "conversation_days": 1,
            },
        }
        with patch("api.finance.booking_policy_snapshot", return_value=policy):
            slot = create_slot(
                self.doctor,
                timezone.now() + timedelta(days=1),
                timezone.now() + timedelta(days=1, minutes=30),
            )
            appointment = hold_appointment(self.parent, self.child, slot)
            simulate_capture(create_payment(self.parent, appointment))
        self.assertEqual(self.post(f"appointments/{appointment.pk}/join", {}).status_code, 503)

    def test_booking_key_replay_rejects_different_input_and_rechecks_access(self):
        slot = create_slot(
            self.doctor,
            timezone.now() + timedelta(days=1),
            timezone.now() + timedelta(days=1, minutes=30),
        )
        data = {"child": str(self.child.pk), "slot": str(slot.pk)}
        first = self.client.post(
            "/v1/appointments/", data, format="json", HTTP_IDEMPOTENCY_KEY="booking-retry"
        )
        replay = self.client.post(
            "/v1/appointments/", data, format="json", HTTP_IDEMPOTENCY_KEY="booking-retry"
        )
        self.assertEqual(first.status_code, 201)
        self.assertEqual(replay.status_code, 200, replay.data)
        self.assertEqual(first.data["id"], replay.data["id"])
        self.assertEqual(m.Appointment.objects.count(), 1)
        changed = self.client.post(
            "/v1/appointments/",
            {**data, "extra": "different"},
            format="json",
            HTTP_IDEMPOTENCY_KEY="booking-retry",
        )
        self.assertEqual(changed.status_code, 409)
        m.Guardianship.objects.filter(child=self.child, user=self.parent).update(status="revoked")
        self.assertEqual(
            self.client.post(
                "/v1/appointments/", data, format="json", HTTP_IDEMPOTENCY_KEY="booking-retry"
            ).status_code,
            403,
        )

    def test_recipient_directory_rechecks_scopes_for_both_participants(self):
        url = f"/v1/messages/recipients/?child={self.child.pk}"
        self.assertEqual([row["id"] for row in rows(self.client.get(url))], [str(self.doctor.pk)])
        self.login(self.doctor)
        self.assertEqual([row["id"] for row in rows(self.client.get(url))], [str(self.parent.pk)])
        self.login(self.other)
        self.assertEqual(self.client.get(url).status_code, 403)
        self.login(self.parent)
        self.grant.scopes = ["records"]
        self.grant.save()
        self.assertEqual(rows(self.client.get(url)), [])
        self.grant.scopes = ["messages"]
        self.grant.save()
        m.Guardianship.objects.filter(child=self.child, user=self.parent).update(
            can_share=False, scopes=["observations"]
        )
        self.login(self.doctor)
        self.assertEqual(
            self.post(
                "messages",
                {
                    "child": str(self.child.pk),
                    "recipient": str(self.parent.pk),
                    "body": "No current messaging permission",
                },
            ).status_code,
            403,
        )

    def test_payment_lists_filter_selected_child_and_record_reads_are_audited(self):
        slot = create_slot(
            self.doctor,
            timezone.now() + timedelta(days=1),
            timezone.now() + timedelta(days=1, minutes=30),
        )
        payment = create_payment(self.parent, hold_appointment(self.parent, self.child, slot))
        self.assertEqual(
            [row["id"] for row in rows(self.client.get(f"/v1/payments/?child={self.child.pk}"))],
            [str(payment.pk)],
        )
        self.assertEqual(rows(self.client.get(f"/v1/payments/?child={self.foreign.pk}")), [])
        self.record.status = "signed"
        self.record.signed_at = timezone.now()
        self.record.save(update_fields=["status", "signed_at"])
        self.client.get("/v1/records/")
        self.client.get(f"/v1/records/{self.record.pk}/")
        self.assertTrue(
            m.Audit.objects.filter(
                actor=self.parent, child=self.child, action="record.listed"
            ).exists()
        )
        self.assertTrue(
            m.Audit.objects.filter(
                actor=self.parent, child=self.child, action="record.read"
            ).exists()
        )

    def test_clinician_loses_appointment_and_payment_metadata_after_revocation(self):
        slot = create_slot(
            self.doctor,
            timezone.now() + timedelta(days=1),
            timezone.now() + timedelta(days=1, minutes=30),
        )
        appointment = hold_appointment(self.parent, self.child, slot)
        payment = create_payment(self.parent, appointment)
        self.login(self.doctor)
        self.assertEqual(self.client.get(f"/v1/appointments/{appointment.pk}/").status_code, 200)
        self.assertEqual(self.client.get(f"/v1/payments/{payment.pk}/").status_code, 200)
        self.login(self.parent)
        self.grant.revoked_at = timezone.now()
        self.grant.save(update_fields=["revoked_at"])
        self.login(self.doctor)
        self.assertEqual(self.client.get(f"/v1/appointments/{appointment.pk}/").status_code, 404)
        self.assertEqual(self.client.get(f"/v1/payments/{payment.pk}/").status_code, 404)

    def test_family_cannot_create_clinical_records_or_edit_another_author(self):
        self.assertEqual(
            self.post(
                "records",
                {
                    "child": str(self.child.pk),
                    "kind": "report",
                    "title": "Family report",
                    "body": "Use an attachment or observation.",
                },
            ).status_code,
            403,
        )
        clinician_observation = m.Observation.objects.create(
            child=self.child,
            author=self.doctor,
            domain="communication",
            title="Clinical observation",
            status="observed",
            observed_on=timezone.localdate(),
        )
        self.assertEqual(
            self.client.patch(
                f"/v1/observations/{clinician_observation.pk}/",
                {"note": "Family overwrite"},
                format="json",
            ).status_code,
            403,
        )
        own = m.Observation.objects.create(
            child=self.child,
            author=self.parent,
            domain="communication",
            title="Family observation",
            status="observed",
            observed_on=timezone.localdate(),
        )
        self.assertEqual(
            self.client.patch(
                f"/v1/observations/{own.pk}/", {"note": "Family correction"}, format="json"
            ).status_code,
            200,
        )

    @override_settings(S3_BUCKET="synthetic-private-bucket")
    def test_quarantine_storage_preserves_bucket_encryption_policy(self):
        from .storage import upload

        with patch("api.storage.client") as s3:
            obj = upload(
                self.parent, self.child, SimpleUploadedFile("report.pdf", b"%PDF-1.4 synthetic")
            )
            kwargs = s3.return_value.put_object.call_args.kwargs
            self.assertNotIn("ServerSideEncryption", kwargs)
            self.assertTrue(kwargs["Key"].startswith("quarantine/"))
            self.assertEqual(obj.scan_status, "quarantined")

    def test_legacy_demo_endpoints_are_not_routable(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get("/v1/dev/accounts/").status_code, 404)
        self.assertEqual(self.post("dev/session", {"email": self.parent.email}).status_code, 404)

    def test_cascading_guardian_revocation_removes_video_participants(self):
        from .access import emit

        slot = create_slot(
            self.doctor,
            timezone.now() + timedelta(days=1),
            timezone.now() + timedelta(days=1, minutes=30),
        )
        appointment = hold_appointment(self.parent, self.child, slot)
        simulate_capture(create_payment(self.parent, appointment))
        membership = m.Guardianship.objects.get(child=self.child, user=self.parent)
        membership.status = "revoked"
        membership.revoked_at = timezone.now()
        membership.save()
        self.grant.revoked_at = timezone.now()
        self.grant.save()
        item = emit("consent.revoked", membership, self.parent, self.child)
        with (
            override_settings(
                LIVEKIT_URL="http://localhost:7880",
                LIVEKIT_API_KEY="test",
                LIVEKIT_API_SECRET="test-secret-at-least-32-characters",
            ),
            patch("api.tasks.httpx.post") as request,
        ):
            request.return_value.status_code = 200
            revoke_rooms(item)
            participants = {call.kwargs["json"]["identity"] for call in request.call_args_list}
            self.assertEqual(participants, {str(self.parent.pk), str(self.doctor.pk)})

    def test_failed_push_does_not_resend_the_email_that_already_left(self):
        from .access import emit
        from django.core import mail

        self.doctor.push_notifications = True
        self.doctor.push_token = "ExponentPushToken[synthetic]"
        self.doctor.save()
        message = m.Message.objects.create(
            child=self.child, author=self.parent, recipient=self.doctor, body="Hello"
        )
        item = emit("message.created", message, self.parent, self.child)
        with patch("api.tasks.httpx.post", side_effect=RuntimeError("provider down")):
            process_outbox(str(item.pk))
        item.refresh_from_db()
        notification = m.Notification.objects.get()
        self.assertEqual((item.status, item.lease_until), ("pending", None))
        # The mail left the building; only the push is still owed.
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual((notification.email_status, notification.push_status), ("sent", "pending"))
        with patch("api.tasks.httpx.post") as push:
            push.return_value.json.return_value = {"data": {"status": "ok"}}
            process_outbox(str(item.pk))
        item.refresh_from_db()
        notification.refresh_from_db()
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual((item.status, notification.push_status), ("completed", "sent"))

    def test_a_leased_delivery_is_not_run_twice(self):
        from .access import emit

        message = m.Message.objects.create(
            child=self.child, author=self.parent, recipient=self.doctor, body="Hello"
        )
        item = emit("message.created", message, self.parent, self.child)
        m.Outbox.objects.filter(pk=item.pk).update(
            status="processing", lease_until=timezone.now() + timedelta(minutes=15)
        )
        with patch("api.tasks.handle") as handler:
            process_outbox(str(item.pk))
        handler.assert_not_called()

    def test_list_endpoints_are_bounded_and_pageable(self):
        """An unbounded list is an unbounded query, serialization and render."""
        m.Observation.objects.bulk_create(
            m.Observation(
                child=self.child,
                author=self.parent,
                domain="communication",
                title=f"Moment {i}",
                status="observed",
                observed_on=timezone.localdate(),
            )
            for i in range(150)
        )
        body = self.client.get(f"/v1/observations/?child={self.child.pk}").json()
        self.assertEqual(body["count"], 150)
        self.assertEqual(len(body["results"]), 100, "the default page is bounded")
        self.assertTrue(body["next"], "more pages are advertised")

        second = self.client.get(f"/v1/observations/?child={self.child.pk}&page=2").json()
        self.assertEqual(len(second["results"]), 50)
        self.assertFalse(second["next"])
        first_ids = {row["id"] for row in body["results"]}
        self.assertFalse(
            first_ids & {row["id"] for row in second["results"]}, "pages do not overlap"
        )

        # A caller cannot ask for an unbounded page.
        capped = self.client.get(f"/v1/observations/?child={self.child.pk}&page_size=100000").json()
        self.assertEqual(len(capped["results"]), 150 if 150 <= 500 else 500)
        self.assertLessEqual(len(capped["results"]), 500)

    def test_a_page_only_audits_the_rows_it_disclosed(self):
        m.Observation.objects.bulk_create(
            m.Observation(
                child=self.child,
                author=self.parent,
                domain="communication",
                title=f"Moment {i}",
                status="observed",
                observed_on=timezone.localdate(),
            )
            for i in range(120)
        )
        self.client.get(f"/v1/observations/?child={self.child.pk}")
        self.assertTrue(
            m.Audit.objects.filter(action="observation.listed", child=self.child).exists()
        )

    def test_outbox_processing_is_idempotent_and_checks_current_recipient_access(self):
        from .access import emit
        from django.core import mail

        message = m.Message.objects.create(
            child=self.child, author=self.parent, recipient=self.doctor, body="Hello"
        )
        item = emit("message.created", message, self.parent, self.child)
        process_outbox(str(item.pk))
        process_outbox(str(item.pk))
        self.assertEqual(m.Notification.objects.count(), 1)
        self.assertEqual(len(mail.outbox), 1)
        self.grant.revoked_at = timezone.now()
        self.grant.save()
        next_item = emit("message.created", message, self.parent, self.child)
        process_outbox(str(next_item.pk))
        self.assertEqual(m.Notification.objects.count(), 1)

    @override_settings(OUTBOX_WORKER_ENABLED=True, OUTBOX_DISPATCH_TOKEN="scheduler-test")
    def test_scheduler_endpoint_reclaims_expired_work_and_requires_its_token(self):
        from .access import emit

        message = m.Message.objects.create(
            child=self.child, author=self.parent, recipient=self.doctor, body="Hello"
        )
        item = emit("message.created", message, self.parent, self.child)
        m.Outbox.objects.filter(pk=item.pk).update(
            status="processing", lease_until=timezone.now() - timedelta(seconds=1)
        )
        self.assertEqual(
            self.client.post(
                "/v1/internal/scheduler/", {"job": "outbox"}, format="json"
            ).status_code,
            403,
        )
        response = self.client.post(
            "/v1/internal/scheduler/",
            {"job": "outbox"},
            format="json",
            HTTP_X_NEURONEST_SCHEDULER="scheduler-test",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["status"], "completed")
        item.refresh_from_db()
        self.assertEqual(item.status, "completed")
        self.assertTrue(m.SchedulerHeartbeat.objects.get(name="outbox").last_success_at)

    @override_settings(
        PRODUCTION=True,
        BUSINESS_POLICY_PATH="",
        OUTBOX_WORKER_ENABLED=True,
        RAZORPAY_KEY_ID="rzp_test_readiness",
        RAZORPAY_KEY_SECRET="test-secret",
        RAZORPAY_WEBHOOK_SECRET="test-webhook-secret",
    )
    @patch("api.tasks.scheduler_healthy", return_value=True)
    def test_readiness_does_not_mark_payments_ready_without_approved_policy(self, _worker):
        payments = self.client.get("/v1/readiness/").data["capabilities"]["payments"]
        self.assertFalse(payments["ready"])
        self.assertFalse(payments["policy_ready"])

    def test_recurring_reminders_create_one_durable_event_each(self):
        slot = m.Slot.objects.create(
            practitioner=self.practitioner,
            starts_at=timezone.now() + timedelta(hours=12),
            ends_at=timezone.now() + timedelta(hours=13),
        )
        m.Appointment.objects.create(
            child=self.child,
            booker=self.parent,
            practitioner=self.practitioner,
            slot=slot,
            status="confirmed",
            amount_minor=100000,
            hold_expires_at=timezone.now(),
        )
        m.Vaccination.objects.create(
            child=self.child,
            author=self.parent,
            name="Reminder",
            due_on=timezone.localdate() + timedelta(days=2),
        )
        create_reminders()
        create_reminders()
        self.assertEqual(m.Outbox.objects.filter(kind="appointment.reminder").count(), 1)
        self.assertEqual(m.Outbox.objects.filter(kind="vaccination.reminder").count(), 1)
