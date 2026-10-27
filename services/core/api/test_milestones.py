from datetime import date, timedelta
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from . import models as m
from .milestones import CATALOG, age_months, band_for_age
from .tests import rows


@override_settings(DEMO_MODE=True)
class MilestoneTests(TestCase):
    def setUp(self):
        self.today = date(2026, 10, 25)
        self.clock = patch("api.milestones.timezone.localdate", return_value=self.today)
        self.clock.start()
        self.addCleanup(self.clock.stop)
        self.parent = m.Account.objects.create_user(
            username="milestone-parent", email="parent@example.invalid", role="parent"
        )
        self.other = m.Account.objects.create_user(
            username="milestone-other", email="other@example.invalid", role="parent"
        )
        self.doctor = m.Account.objects.create_user(
            username="milestone-doctor", email="doctor@example.invalid", role="doctor"
        )
        self.child = m.Child.objects.create(name="Synthetic child", date_of_birth=date(2026, 5, 25))
        self.guardian = m.Guardianship.objects.create(
            child=self.child,
            user=self.parent,
            email="synthetic@example.invalid",
            can_share=True,
            status="active",
            invited_by=self.parent,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.parent)
        self.band = band_for_age(5)
        self.payload = {
            "child": str(self.child.pk),
            "catalog_version": CATALOG["version"],
            "band_months": 4,
            "answers": {i["id"]: "yes" for i in self.band["items"]},
            "skill_loss": False,
            "parent_concern": False,
        }

    def post(self, payload=None):
        return self.client.post("/v1/milestone-checkins/", payload or self.payload, format="json")

    def test_age_boundaries_and_end_of_month(self):
        for age in [0, 1, 72, 120, -1]:
            self.assertIsNone(band_for_age(age))
        for age, expected in [
            (2, 2),
            (3, 2),
            (4, 4),
            (5, 4),
            (6, 6),
            (8, 6),
            (9, 9),
            (11, 9),
            (12, 12),
            (15, 15),
            (18, 18),
            (24, 24),
            (30, 30),
            (36, 36),
            (48, 48),
            (60, 60),
            (71, 60),
        ]:
            self.assertEqual(band_for_age(age)["months"], expected)
        self.assertEqual(age_months(date(2026, 5, 26), self.today), 4)
        self.assertEqual(age_months(date(2026, 5, 25), self.today), 5)
        self.assertEqual(age_months(date(2024, 1, 31), date(2024, 2, 29)), 1)
        self.assertEqual(age_months(date(2024, 1, 31), date(2024, 2, 28)), 0)

    def test_catalog_selects_completed_age_and_is_source_linked(self):
        response = self.client.get(f"/v1/milestone-checkins/catalog/?child={self.child.pk}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["age_months"], 5)
        self.assertEqual(response.data["band"]["months"], 4)
        self.assertIn("4-months.html", response.data["band"]["source_url"])
        self.assertFalse(response.data["ai_enabled"])
        for band in CATALOG["bands"]:
            self.assertEqual(len({i["id"] for i in band["items"]}), len(band["items"]))
            self.assertTrue(all(set(i["label"]) == {"en", "ml"} for i in band["items"]))

    def test_save_summary_reload_and_immutable_snapshot(self):
        result = self.post()
        self.assertEqual(result.status_code, 201, result.data)
        self.assertEqual(result.data["age_months"], 5)
        self.assertEqual(result.data["summary"]["counts"]["yes"], 6)
        self.assertFalse(result.data["summary"]["follow_up_recommended"])
        reference = result.data["summary"]["research_reference"]
        self.assertEqual(reference["kind"], "research_age_reference")
        self.assertEqual(reference["age_days"], 153)
        self.assertTrue(reference["estimates"])
        self.assertEqual(result.data["ai_explanation"], {})
        saved = self.client.get(f"/v1/milestone-checkins/{result.data['id']}/")
        self.assertEqual(saved.data["summary"], result.data["summary"])
        self.assertEqual(
            len(rows(self.client.get(f"/v1/milestone-checkins/?child={self.child.pk}"))), 1
        )
        self.assertEqual(
            self.client.patch(
                f"/v1/milestone-checkins/{result.data['id']}/", {"answers": {}}, format="json"
            ).status_code,
            405,
        )
        self.assertEqual(
            self.client.delete(f"/v1/milestone-checkins/{result.data['id']}/").status_code, 405
        )
        self.child.date_of_birth = date(2026, 1, 1)
        self.child.save()
        self.assertEqual(
            self.client.get(f"/v1/milestone-checkins/{result.data['id']}/").data["age_months"], 5
        )

    def test_each_non_yes_and_parent_signals_request_follow_up_without_score(self):
        for answer in ["in_progress", "not_yet", "unsure"]:
            payload = {
                **self.payload,
                "answers": {**self.payload["answers"], self.band["items"][0]["id"]: answer},
            }
            result = self.post(payload)
            self.assertEqual(result.status_code, 201)
            self.assertEqual(result.data["summary"]["counts"]["yes"], 5)
            self.assertEqual(result.data["summary"]["counts"][answer], 1)
            self.assertTrue(result.data["summary"]["follow_up_recommended"])
            self.assertNotIn("score", result.data["summary"])
            self.assertNotIn("probability", result.data["summary"])
        for flag in ["skill_loss", "parent_concern"]:
            result = self.post({**self.payload, flag: True})
            self.assertTrue(result.data["summary"]["follow_up_recommended"])

    def test_rejects_partial_extra_invalid_stale_and_out_of_range_answers(self):
        invalid = [
            {},
            {**self.payload["answers"], "future-skill": "yes"},
            {**self.payload["answers"], self.band["items"][0]["id"]: "sometimes"},
        ]
        for answers in invalid:
            self.assertEqual(self.post({**self.payload, "answers": answers}).status_code, 400)
        self.assertEqual(self.post({**self.payload, "band_months": 6}).status_code, 400)
        self.assertEqual(self.post({**self.payload, "catalog_version": "old"}).status_code, 400)
        for field in ["parent_concern", "skill_loss"]:
            self.assertEqual(
                self.post({k: v for k, v in self.payload.items() if k != field}).status_code, 400
            )
        self.child.date_of_birth = date(2026, 4, 25)
        self.child.save()
        self.assertEqual(self.post().status_code, 400)
        self.child.date_of_birth = date(2019, 1, 1)
        self.child.save()
        self.assertEqual(self.post().status_code, 400)
        self.assertFalse(m.MilestoneCheckIn.objects.exists())

    def test_client_cannot_forge_server_summary_age_or_ai(self):
        result = self.post(
            {
                **self.payload,
                "age_months": 60,
                "summary": {"score": 100},
                "ai_explanation": {"status": "generated"},
            }
        )
        self.assertEqual(result.status_code, 201)
        self.assertEqual(result.data["age_months"], 5)
        self.assertNotIn("score", result.data["summary"])
        self.assertEqual(result.data["ai_explanation"], {})

    def test_other_family_revoked_and_unscoped_caregiver_cannot_read_or_write(self):
        saved = self.post().data
        self.client.force_authenticate(self.other)
        self.assertEqual(self.post().status_code, 403)
        self.assertEqual(self.client.get(f"/v1/milestone-checkins/{saved['id']}/").status_code, 404)
        self.assertEqual(rows(self.client.get("/v1/milestone-checkins/")), [])
        self.assertEqual(
            self.client.get(f"/v1/milestone-checkins/catalog/?child={self.child.pk}").status_code,
            403,
        )
        self.client.force_authenticate(self.parent)
        self.guardian.can_share = False
        self.guardian.scopes = ["records"]
        self.guardian.save()
        self.assertEqual(self.post().status_code, 403)
        self.guardian.scopes = ["observations"]
        self.guardian.save()
        self.assertEqual(self.post().status_code, 201)
        self.guardian.revoked_at = timezone.now()
        self.guardian.save()
        self.assertEqual(self.post().status_code, 403)

    def test_authorized_clinician_can_read_but_not_submit(self):
        saved = self.post().data
        m.Practitioner.objects.create(
            user=self.doctor, profession="doctor", specialty="test", verified=True, status="active"
        )
        grant = m.Grant.objects.create(
            child=self.child,
            recipient=self.doctor,
            grantor=self.parent,
            scopes=["records"],
            purpose="test",
            expires_at=timezone.now() + timedelta(days=1),
        )
        self.client.force_authenticate(self.doctor)
        self.assertEqual(self.client.get(f"/v1/milestone-checkins/{saved['id']}/").status_code, 404)
        grant.scopes = ["observations"]
        grant.save()
        self.assertEqual(self.client.get(f"/v1/milestone-checkins/{saved['id']}/").status_code, 200)
        self.assertEqual(self.post().status_code, 403)
        self.assertEqual(
            self.client.post(
                f"/v1/milestone-checkins/{saved['id']}/explain/", {"consent": True}, format="json"
            ).status_code,
            403,
        )

    def test_export_includes_checkin_only_with_observation_scope(self):
        self.post()
        response = self.client.post("/v1/exports/", {"child": str(self.child.pk)}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["milestone_checkins"]), 1)
        self.guardian.can_share = False
        self.guardian.scopes = ["records", "export"]
        self.guardian.save()
        response = self.client.post("/v1/exports/", {"child": str(self.child.pk)}, format="json")
        self.assertNotIn("milestone_checkins", response.data)

    @patch("api.milestones.engine_call")
    def test_ai_disabled_and_missing_consent_never_call_engine(self, engine):
        saved = self.post().data
        endpoint = f"/v1/milestone-checkins/{saved['id']}/explain/"
        self.assertEqual(
            self.client.post(endpoint, {"consent": True}, format="json").status_code, 503
        )
        with override_settings(MILESTONE_AI_ENABLED=True):
            self.assertEqual(
                self.client.post(endpoint, {"consent": False}, format="json").status_code, 400
            )
        engine.assert_not_called()
        self.assertEqual(m.MilestoneCheckIn.objects.get(pk=saved["id"]).ai_explanation, {})

    @override_settings(MILESTONE_AI_ENABLED=True)
    @patch("api.milestones.engine_call")
    def test_optional_ai_uses_minimal_saved_context_and_persists_only_generated_text(self, engine):
        saved = self.post().data
        endpoint = f"/v1/milestone-checkins/{saved['id']}/explain/"
        engine.return_value = {"status": "reviewed_resources_only", "answer": "Preview"}
        response = self.client.post(endpoint, {"consent": True}, format="json")
        self.assertEqual(response.data["status"], "unavailable")
        self.assertEqual(m.MilestoneCheckIn.objects.get(pk=saved["id"]).ai_explanation, {})
        engine.return_value = {
            "status": "generated",
            "answer": "These are parent observations. Discuss any concerns with a clinician.",
            "language": "en",
            "citations": [],
            "notice": "Education only",
            "method": "openai_decisions_v1",
            "model": "gpt-6-luna",
            "decision": "all_observed",
        }
        response = self.client.post(
            endpoint, {"consent": True, "answers": {"fake": "yes"}}, format="json"
        )
        self.assertEqual(response.data["status"], "generated")
        payload = engine.call_args.args[2]
        self.assertEqual(engine.call_args.args[1], "/milestone-explanation")
        self.assertEqual(len(payload["items"]), 6)
        self.assertEqual(
            set(payload), {"language", "band_months", "items", "parent_concern", "skill_loss"}
        )
        self.assertNotIn(str(self.child.pk), str(payload))
        self.assertNotIn(self.child.name, str(payload))
        self.assertNotIn(str(self.child.date_of_birth), str(payload))
        self.assertEqual(
            m.MilestoneCheckIn.objects.get(pk=saved["id"]).ai_explanation["status"], "generated"
        )

    @override_settings(MILESTONE_AI_ENABLED=True)
    @patch("api.milestones.engine_call")
    def test_authority_revoked_during_ai_call_is_rechecked(self, engine):
        saved = self.post().data

        def revoke(*args):
            self.guardian.revoked_at = timezone.now()
            self.guardian.save()
            return {"status": "generated", "answer": "Withheld"}

        engine.side_effect = revoke
        response = self.client.post(
            f"/v1/milestone-checkins/{saved['id']}/explain/", {"consent": True}, format="json"
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(m.MilestoneCheckIn.objects.get(pk=saved["id"]).ai_explanation, {})

    @override_settings(
        MILESTONE_AI_ENABLED=True, PATIENT_AI_ENABLED=False, SERVICE_TOKEN="synthetic-token"
    )
    @patch("api.milestones.engine_call")
    def test_demo_flag_enables_only_milestone_ai_and_reuses_success(self, engine):
        catalog = self.client.get(f"/v1/milestone-checkins/catalog/?child={self.child.pk}")
        self.assertTrue(catalog.data["ai_enabled"])
        saved = self.post().data
        engine.return_value = {
            "status": "generated",
            "language": "en",
            "citations": [],
            "notice": "AI-generated demo explanation, not a diagnosis.",
            "method": "openai_decisions_v1",
            "model": "gpt-6-luna",
            "decision": "all_observed",
            "answer": "You reported the selected skills as observed.",
        }
        endpoint = f"/v1/milestone-checkins/{saved['id']}/explain/"
        old = m.MilestoneCheckIn.objects.get(pk=saved["id"])
        old.ai_explanation = {
            "status": "generated",
            "language": "en",
            "answer": "Old Responses explanation",
        }
        old.save(update_fields=["ai_explanation"])
        first = self.client.post(endpoint, {"consent": True}, format="json")
        self.assertEqual(first.status_code, 200)
        self.assertEqual(
            self.client.post(endpoint, {"consent": True}, format="json").data, first.data
        )
        self.assertEqual(engine.call_count, 1)
        self.assertEqual(first.data["model"], "gpt-6-luna")
        self.assertEqual(first.data["decision"], "all_observed")
        self.assertEqual(
            self.client.post(endpoint, {"consent": False}, format="json").status_code, 400
        )

    @override_settings(MILESTONE_AI_ENABLED=True)
    @patch("api.milestones.engine_call")
    def test_decisions_result_matches_saved_answers_and_discards_provider_confidence(self, engine):
        saved = self.post().data
        endpoint = f"/v1/milestone-checkins/{saved['id']}/explain/"
        result = {
            "status": "generated",
            "language": "ml",
            "answer": "രേഖപ്പെടുത്തിയ ഉത്തരങ്ങൾ മാത്രം.",
            "notice": "Demo only",
            "citations": [],
            "method": "openai_decisions_v1",
            "model": "gpt-6-luna",
            "decision": "some_not_yet",
            "confidence": 0.99,
        }
        engine.return_value = result
        self.assertEqual(
            self.client.post(
                endpoint, {"consent": True, "language": "ml"}, format="json"
            ).status_code,
            503,
        )
        self.assertEqual(m.MilestoneCheckIn.objects.get(pk=saved["id"]).ai_explanation, {})
        engine.return_value = {**result, "decision": "all_observed", "model": "other-model"}
        self.assertEqual(
            self.client.post(
                endpoint, {"consent": True, "language": "ml"}, format="json"
            ).status_code,
            503,
        )
        engine.return_value = {**result, "decision": "all_observed"}
        response = self.client.post(endpoint, {"consent": True, "language": "ml"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("confidence", response.data)
        self.assertNotIn(
            "confidence", m.MilestoneCheckIn.objects.get(pk=saved["id"]).ai_explanation
        )
        self.assertEqual(
            engine.call_args.args[2]["items"][0]["label"], self.band["items"][0]["label"]["ml"]
        )

    @override_settings(MILESTONE_AI_ENABLED=True)
    @patch("api.milestones.engine_call")
    def test_provider_activation_and_invalid_results_preserve_saved_summary(self, engine):
        saved = self.post().data
        endpoint = f"/v1/milestone-checkins/{saved['id']}/explain/"
        engine.return_value = {
            "status": "unavailable",
            "code": "activation_required",
            "detail": "Private provider text",
        }
        result = self.client.post(endpoint, {"consent": True}, format="json")
        self.assertIn("awaiting provider activation", result.data["detail"])
        self.assertNotIn("Private provider text", str(result.data))
        engine.return_value = {"status": "generated", "answer": "Incomplete result"}
        self.assertEqual(
            self.client.post(endpoint, {"consent": True}, format="json").status_code, 503
        )
        row = m.MilestoneCheckIn.objects.get(pk=saved["id"])
        self.assertEqual(row.ai_explanation, {})
        self.assertEqual(row.summary, saved["summary"])
