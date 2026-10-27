import json
import os
import unittest
from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient

import app

TOKEN = "synthetic-test-service-token-32-characters"


class MilestoneExplanationTests(unittest.TestCase):
    def setUp(self):
        self.environment = patch.dict(
            os.environ,
            {
                "ENGINE_SERVICE_TOKEN": TOKEN,
                "MILESTONE_AI_ENABLED": "true",
                "OPENAI_API_KEY": "synthetic-openai-key",
                "ALLOW_PATIENT_AI": "false",
            },
            clear=True,
        )
        self.environment.start()
        self.addCleanup(self.environment.stop)
        self.client = TestClient(app.app)
        self.payload = {
            "language": "en",
            "band_months": 4,
            "items": [
                {"label": f"Selected skill {i}", "answer": answer}
                for i, answer in enumerate(
                    ["yes", "in_progress", "not_yet", "unsure", "yes", "yes"]
                )
            ],
            "parent_concern": False,
            "skill_loss": False,
        }

    def post(self, payload=None):
        return self.client.post(
            "/milestone-explanation",
            headers={"X-Service-Token": TOKEN},
            json=payload or self.payload,
        )

    def response(self, pattern="some_not_yet", status=200, **extra):
        return httpx.Response(
            status,
            request=httpx.Request("POST", "https://api.openai.com/v1/decisions"),
            json={
                "model": "gpt-6-luna",
                "answers": [
                    {
                        "name": "response_pattern",
                        "type": "choice",
                        "choice": pattern,
                        "confidence": 0.99,
                        "probabilities": [{"value": pattern, "probability": 0.99}],
                    }
                ],
                **extra,
            },
        )

    @patch("milestone_explanations.httpx.post")
    def test_separate_feature_flag_and_service_auth(self, provider):
        self.assertEqual(
            self.client.post("/milestone-explanation", json=self.payload).status_code, 401
        )
        with patch.dict(os.environ, {"MILESTONE_AI_ENABLED": "false"}):
            self.assertEqual(self.post().json()["status"], "unavailable")
        with patch.dict(os.environ, {"OPENAI_API_KEY": ""}):
            self.assertEqual(self.post().json()["code"], "activation_required")
        provider.assert_not_called()

    @patch("milestone_explanations.httpx.post")
    def test_strict_request_rejects_private_fields_and_invalid_answers(self, provider):
        for key in ["child", "date_of_birth", "name", "records", "note"]:
            self.assertEqual(self.post({**self.payload, key: "unexpected"}).status_code, 422)
        self.assertEqual(
            self.post({**self.payload, "items": self.payload["items"][:5]}).status_code, 422
        )
        self.assertEqual(self.post({**self.payload, "parent_concern": "false"}).status_code, 422)
        self.assertEqual(
            self.post(
                {
                    **self.payload,
                    "items": [{**row, "note": "unexpected"} for row in self.payload["items"]],
                }
            ).status_code,
            422,
        )
        provider.assert_not_called()

    @patch("milestone_explanations.httpx.post")
    def test_decisions_uses_requested_model_and_minimal_input(self, provider):
        provider.return_value = self.response()
        result = self.post().json()
        self.assertEqual(result["status"], "generated")
        self.assertEqual(result["method"], "openai_decisions_v1")
        self.assertEqual(result["model"], "gpt-6-luna")
        self.assertEqual(result["decision"], "some_not_yet")
        self.assertIn("Discuss skills", result["answer"])
        self.assertIn("project demo", result["notice"])
        self.assertFalse(app.patient_context_enabled())
        args = provider.call_args
        self.assertEqual(args.args[0], "https://api.openai.com/v1/decisions")
        body = args.kwargs["json"]
        self.assertEqual(set(body), {"model", "input", "questions"})
        self.assertEqual(body["model"], "gpt-6-luna")
        self.assertEqual(body["questions"][0]["type"], "choice")
        content = json.loads(body["input"])
        self.assertEqual(set(content), {"checklist_age_months", "parent_answers"})
        self.assertEqual(result["citations"], [])
        for private in (
            "confidence",
            "probability",
            "probabilities",
            "0.99",
            "parent_concern",
            "skill_loss",
        ):
            self.assertNotIn(private, json.dumps(result))

    @patch("milestone_explanations.httpx.post")
    def test_each_pattern_and_each_answer_category_remain_distinct(self, provider):
        for codes, pattern in [
            (["yes"] * 6, "all_observed"),
            (["in_progress"] * 6, "emerging_or_uncertain"),
            (["unsure"] * 6, "emerging_or_uncertain"),
            (["yes", "not_yet", "in_progress", "unsure", "yes", "yes"], "some_not_yet"),
        ]:
            payload = {
                **self.payload,
                "items": [{"label": f"Skill {i}", "answer": code} for i, code in enumerate(codes)],
            }
            provider.return_value = self.response(pattern)
            result = self.post(payload).json()
            self.assertEqual(result["decision"], pattern)
            for i, code in enumerate(codes):
                heading = {
                    "yes": "Reported as observed",
                    "in_progress": "Reported as emerging",
                    "not_yet": "Not yet observed",
                    "unsure": "Uncertain",
                }[code]
                line = next(line for line in result["answer"].splitlines() if heading + ":" in line)
                self.assertIn(f"Skill {i}", line)

    @patch("milestone_explanations.httpx.post")
    def test_refusal_wrong_class_and_invalid_outputs_fail_closed(self, provider):
        for payload in [
            {"model": "other-model"},
            {"answers": []},
            {"answers": None},
            {"answers": [None]},
            {"answers": [{"type": "refusal", "name": "response_pattern"}]},
            {"answers": [{"type": "choice", "name": "wrong", "choice": "some_not_yet"}]},
            {"answers": [{"type": "choice", "name": "response_pattern", "choice": "all_observed"}]},
            {"answers": [{"type": "choice", "name": "response_pattern", "choice": "autism"}]},
            {"answers": [{"type": "predicate", "name": "response_pattern", "probability": 1}]},
        ]:
            provider.return_value = self.response(**payload)
            self.assertEqual(self.post().json()["status"], "unavailable", payload)

    @patch("milestone_explanations.httpx.post")
    def test_model_text_and_probabilities_are_never_displayed(self, provider):
        provider.return_value = self.response(answer="Your child has autism with 70% probability.")
        result = self.post().json()
        self.assertEqual(result["status"], "generated")
        for forbidden in ("autism", "70%", "confidence", "probability"):
            self.assertNotIn(forbidden, json.dumps(result))

    @patch("milestone_explanations.httpx.post")
    def test_lost_skill_and_parent_concern_follow_up_cannot_be_removed(self, provider):
        provider.return_value = self.response("all_observed")
        payload = {
            **self.payload,
            "items": [{**item, "answer": "yes"} for item in self.payload["items"]],
        }
        self.assertIn("Continue regular", self.post(payload).json()["answer"])
        result = self.post({**payload, "skill_loss": True}).json()
        self.assertIn("promptly about the reported lost skill", result["answer"])
        self.assertIn(
            "Discuss skills", self.post({**payload, "parent_concern": True}).json()["answer"]
        )
        self.assertNotIn("skill_loss", provider.call_args.kwargs["json"]["input"])
        self.assertNotIn("parent_concern", provider.call_args.kwargs["json"]["input"])

    @patch("milestone_explanations.httpx.post")
    def test_provider_errors_never_become_success_or_leak_details(self, provider):
        for status, code in [
            (401, "activation_required"),
            (403, "activation_required"),
            (402, "credits_unavailable"),
            (429, "credits_unavailable"),
            (500, "generation_unavailable"),
        ]:
            provider.return_value = self.response(status=status)
            self.assertEqual(self.post().json()["code"], code)
        provider.side_effect = httpx.ReadTimeout("private provider detail")
        result = self.post().json()
        self.assertEqual(result["status"], "unavailable")
        self.assertNotIn("private provider detail", str(result))

    @patch("milestone_explanations.httpx.post")
    def test_malayalam_is_rendered_from_saved_labels_without_model_prose(self, provider):
        provider.return_value = self.response()
        payload = {
            **self.payload,
            "language": "ml",
            "items": [
                {**item, "label": f"കഴിവ് {i}"} for i, item in enumerate(self.payload["items"])
            ],
        }
        result = self.post(payload).json()
        self.assertEqual(result["status"], "generated")
        self.assertEqual(result["language"], "ml")
        self.assertIn("ഇനിയും കണ്ടിട്ടില്ല: കഴിവ് 2", result["answer"])
        self.assertIn("ഉറപ്പില്ല: കഴിവ് 3", result["answer"])


if __name__ == "__main__":
    unittest.main()
