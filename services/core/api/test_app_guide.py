import json
from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from . import models as m
from .app_guide import GUIDE, destinations
from .errors import Unavailable


class AppGuideTests(TestCase):
    def setUp(self):
        self.user = m.Account.objects.create_user(
            username="guide-parent", email="guide@example.invalid", role="parent"
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def ask(self, message="Where do I book an appointment?", **extra):
        return self.client.post(
            "/v1/assistant/",
            {"message": message, "language": "en", "app_help": True, **extra},
            format="json",
        )

    def test_graph_projected_directory_is_private_authenticated_and_role_filtered(self):
        self.assertEqual(
            len({row["id"] for row in GUIDE["destinations"]}), len(GUIDE["destinations"])
        )
        self.assertTrue(
            all(
                (row["graph_node"] or row.get("source_kind") == "route_extension")
                and row["source_file"]
                for row in GUIDE["destinations"]
            )
        )
        result = self.client.get("/v1/assistant-guide/?language=en")
        self.assertEqual(result.status_code, 200)
        self.assertEqual(
            {d["view"] for d in result.data["destinations"]},
            {
                "today",
                "milestones",
                "activities",
                "assessments",
                "reports",
                "care",
                "library",
                "records",
                "account",
                "notifications",
            },
        )
        for row in result.data["destinations"]:
            self.assertEqual(set(row), {"id", "view", "tab", "label", "description"})
        self.assertNotIn("graph_node", json.dumps(result.data))
        self.assertNotIn("keywords", json.dumps(result.data))
        for role, denied in [
            ("mentor", {"records", "reports", "milestones", "assessments", "operations", "today"}),
            ("doctor", {"assessments", "operations"}),
            ("admin", {"records", "milestones", "assessments", "today", "reports"}),
        ]:
            self.user.role = role
            self.assertFalse({d["view"] for d in destinations(self.user)} & denied)
        self.user.role = "admin"
        self.assertIn("operations", {d["view"] for d in destinations(self.user)})
        self.client.force_authenticate(None)
        self.assertIn(self.client.get("/v1/assistant-guide/").status_code, (401, 403))

    def test_malayalam_directory_and_invalid_language(self):
        data = self.client.get("/v1/assistant-guide/?language=ml").data
        self.assertIn(
            "ഡോക്ടറെ", next(d["label"] for d in data["destinations"] if d["id"] == "booking")
        )
        self.assertEqual(self.client.get("/v1/assistant-guide/?language=xx").status_code, 400)

    @patch("api.app_guide.engine_call")
    def test_navigation_sends_no_child_identifiers_records_or_graph_code(self, engine):
        engine.return_value = {
            "destination": "booking",
            "answer": "Untrusted provider text",
            "confidence": 0.9,
        }
        before = (
            m.Appointment.objects.count(),
            m.Payment.objects.count(),
            m.Record.objects.count(),
        )
        result = self.ask()
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.data["actions"], ["booking"])
        self.assertNotIn("Untrusted", result.data["answer"])
        self.assertNotIn("confidence", result.data)
        payload = engine.call_args.args[2]
        self.assertEqual(engine.call_args.args[:2], ("assistant", "/app-guide"))
        self.assertEqual(set(payload), {"message", "destinations"})
        self.assertTrue(
            all(set(d) == {"id", "label", "description"} for d in payload["destinations"])
        )
        self.assertFalse(any(d["id"].startswith("operations") for d in payload["destinations"]))
        self.assertEqual(
            before,
            (m.Appointment.objects.count(), m.Payment.objects.count(), m.Record.objects.count()),
        )
        engine.reset_mock()
        self.assertEqual(self.ask(include_records=True).status_code, 400)
        self.assertEqual(self.ask(child="00000000-0000-0000-0000-000000000001").status_code, 400)
        engine.assert_not_called()

    @patch("api.app_guide.engine_call")
    def test_invalid_destinations_never_become_external_or_privileged_actions(self, engine):
        allowed = {row["id"] for row in destinations(self.user)}
        for output in [
            {"destination": "operations"},
            {"destination": "https://evil.example/"},
            {"destination": ["booking"]},
            None,
            "invalid",
            {"destination": None},
        ]:
            engine.return_value = output
            result = self.ask("unrelated xyz")
            self.assertEqual(result.status_code, 200)
            self.assertTrue(set(result.data["actions"]) <= allowed)
        engine.side_effect = Unavailable("private service error")
        result = self.ask("Where can I upload a file?")
        self.assertIn("files", result.data["actions"])
        self.assertNotIn("private service error", str(result.data))

    @patch("api.app_guide.engine_call")
    def test_emergency_guard_survives_service_outage_and_prevents_classification(self, engine):
        for question in ["my child cannot breathe", "കുട്ടിക്ക് ശ്വാസം കിട്ടുന്നില്ല"]:
            result = self.ask(question)
            self.assertEqual(result.data["escalation"], "urgent")
            self.assertEqual(result.data["actions"], [])
            self.assertIn("112", result.data["answer"])
        engine.assert_not_called()
        engine.return_value = {"escalation": "clinician", "destination": "milestones"}
        result = self.ask("Please diagnose my child")
        self.assertEqual(result.data["actions"], ["booking"])
        self.assertIn("cannot diagnose", result.data["answer"])

    @patch("api.app_guide.engine_call")
    def test_activities_route_is_available_in_both_languages_during_engine_outage(self, engine):
        engine.side_effect = Unavailable("offline")
        for message in ("Where are the games and activities?", "കളികൾ എവിടെയാണ്?"):
            result = self.ask(message)
            self.assertIn("activities", result.data["actions"])
        data = self.client.get("/v1/assistant-guide/?language=ml").data
        row = next(d for d in data["destinations"] if d["id"] == "activities")
        self.assertEqual(row["view"], "activities")
        self.assertEqual(row["label"], "കളികളും പ്രവർത്തനങ്ങളും")
