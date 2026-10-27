import json
import os
import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

import app
import pipeline

TOKEN = "synthetic-test-service-token-32-characters"


class EngineTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(
            os.environ,
            {"APP_ENV": "test", "LOCAL_DEMO": "true", "ENGINE_SERVICE_TOKEN": TOKEN},
            clear=True,
        )
        self.env.start()
        self.client = TestClient(app.app)
        self.headers = {"X-Service-Token": TOKEN}
        self.body = {
            "instrument_id": "synthetic-development-v1",
            "date_of_birth": "2020-01-01",
            "language": "en",
            "answers": {"q1": True, "q2": False, "q3": False},
        }

    def tearDown(self):
        self.env.stop()

    def approved_mchat_env(self, languages=("en",)):
        content = {
            "instrument_id": "m-chat-r-f",
            "name": "M-CHAT-R/F",
            "version": "rights-cleared-fixture-1",
            "source_url": "https://www.mchatscreen.com/",
            "languages": {},
        }
        for language in languages:
            questions = [
                {
                    "id": f"q{index}",
                    "text": f"Rights-cleared fixture question {index}",
                    "options": [
                        {"value": "yes", "label": "Yes"},
                        {"value": "no", "label": "No"},
                    ],
                }
                for index in range(1, 21)
            ]
            content["languages"][language] = {
                "questions": questions,
                "follow_up_questions": questions,
                "scoring": {
                    "initial_fail_when": {question["id"]: "yes" for question in questions},
                    "follow_up_fail_when": {question["id"]: "yes" for question in questions},
                    "initial_follow_up_min": 3,
                    "initial_high_risk_min": 8,
                    "follow_up_positive_min": 2,
                },
            }
        approval = {
            "instrument_id": "m-chat-r-f",
            "version": content["version"],
            "status": "approved",
            "content_sha256": app._content_digest(content),
            "approved_languages": list(languages),
            "license": {"status": "approved", "reference": "test:license"},
            "clinical": {
                "status": "approved",
                "reviewer": "test clinician",
                "reference": "test:clinical-review",
                "approved_at": "2026-01-01T00:00:00Z",
            },
        }
        return {
            "MCHAT_RF_CONTENT_JSON": json.dumps(content),
            "MCHAT_RF_APPROVAL_JSON": json.dumps(approval),
        }

    def test_auth_and_health(self):
        self.assertEqual(self.client.get("/health").status_code, 200)
        self.assertNotIn(TOKEN, self.client.get("/health").text)
        self.assertEqual(self.client.get("/instruments").status_code, 401)
        self.assertEqual(
            self.client.get("/instruments", headers={"X-Service-Token": "wrong"}).status_code, 401
        )
        with patch.dict(os.environ, {"ENGINE_SERVICE_TOKEN": "weak"}):
            self.assertEqual(self.client.get("/instruments", headers=self.headers).status_code, 503)

    def test_licensed_disabled_and_local_instrument_gated(self):
        rows = self.client.get("/instruments", headers=self.headers).json()
        self.assertFalse(rows[0]["enabled"])
        self.assertEqual(rows[0]["questions"], [])
        self.assertTrue(rows[1]["synthetic"])
        self.assertEqual(rows[1]["questions"][0]["options"][0]["value"], "yes")
        with patch.dict(os.environ, {"APP_ENV": "production"}):
            self.assertEqual(len(self.client.get("/instruments", headers=self.headers).json()), 1)
            self.assertEqual(
                self.client.post("/screen", json=self.body, headers=self.headers).status_code, 403
            )
        self.body["instrument_id"] = "m-chat-r-f"
        self.assertEqual(
            self.client.post("/screen", json=self.body, headers=self.headers).status_code, 409
        )

    def test_approved_mchat_bundle_is_available_and_scored(self):
        with patch.dict(os.environ, self.approved_mchat_env(), clear=False):
            rows = self.client.get("/instruments?language=en", headers=self.headers).json()
            self.assertTrue(rows[0]["enabled"])
            self.assertEqual(rows[0]["status"], "available")
            self.assertEqual(rows[0]["license_status"], "licensed")
            self.assertEqual(len(rows[0]["questions"]), 20)

            body = {
                "instrument_id": "m-chat-r-f",
                "date_of_birth": (date.today() - timedelta(days=600)).isoformat(),
                "language": "en",
                "answers": {f"q{index}": "no" for index in range(1, 21)},
            }
            result = self.client.post("/screen", json=body, headers=self.headers).json()
            self.assertEqual(result["status"], "completed")
            self.assertEqual(result["result"]["initial_score"], 0)
            self.assertFalse(result["result"]["screen_positive"])

            body["answers"].update({"q1": "yes", "q2": "yes", "q3": "yes"})
            result = self.client.post("/screen", json=body, headers=self.headers).json()
            self.assertEqual(result["status"], "follow_up_required")
            self.assertEqual(len(result["follow_up_questions"]), 3)

            body.update(
                stage="follow_up",
                prior_answers=body["answers"],
                answers={"q1": "yes", "q2": "no", "q3": "no"},
            )
            result = self.client.post("/screen", json=body, headers=self.headers).json()
            self.assertEqual(result["status"], "completed")
            self.assertEqual(result["result"]["follow_up_score"], 1)
            self.assertFalse(result["result"]["screen_positive"])

    def test_mchat_stays_disabled_when_approval_hash_changes(self):
        values = self.approved_mchat_env()
        approval = json.loads(values["MCHAT_RF_APPROVAL_JSON"])
        approval["content_sha256"] = "0" * 64
        values["MCHAT_RF_APPROVAL_JSON"] = json.dumps(approval)
        with patch.dict(os.environ, values, clear=False):
            row = self.client.get("/instruments?language=en", headers=self.headers).json()[0]
            self.assertFalse(row["enabled"])
            self.assertIn("Licensed questionnaire content", row["disabled_reason"])

    def test_stages_answers_age_and_language(self):
        result = self.client.post("/screen", json=self.body, headers=self.headers).json()
        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["result"]["synthetic_score"], 1)
        self.body["answers"] = {"q1": True}
        result = self.client.post("/screen", json=self.body, headers=self.headers).json()
        self.assertEqual(result["status"], "incomplete")
        self.assertEqual(result["missing_question_ids"], ["q2", "q3"])
        self.body["answers"] = {"q1": 9}
        self.assertEqual(
            self.client.post("/screen", json=self.body, headers=self.headers).status_code, 422
        )
        self.body["answers"] = {"unknown": True}
        self.assertEqual(
            self.client.post("/screen", json=self.body, headers=self.headers).status_code, 422
        )
        self.body["answers"] = {"q1": "yes", "q2": "no", "q3": "yes"}
        result = self.client.post("/screen", json=self.body, headers=self.headers).json()
        self.assertEqual(result["status"], "follow_up_required")
        self.assertIsNone(result["result"])
        self.body.update(
            stage="follow_up",
            prior_answers=self.body["answers"],
            answers={"f1": "yes"},
            language="ml",
        )
        result = self.client.post("/screen", json=self.body, headers=self.headers).json()
        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["language"], "ml")
        self.body["prior_answers"] = {}
        self.assertEqual(
            self.client.post("/screen", json=self.body, headers=self.headers).status_code, 422
        )
        self.body.update(date_of_birth="2000-01-01", stage="initial", prior_answers={})
        self.assertEqual(
            self.client.post("/screen", json=self.body, headers=self.headers).json()["status"],
            "ineligible",
        )
        self.body["date_of_birth"] = "2999-01-01"
        self.assertFalse(
            self.client.post("/screen", json=self.body, headers=self.headers).json()["eligible"]
        )
        self.body["language"] = "xx"
        self.assertEqual(
            self.client.post("/screen", json=self.body, headers=self.headers).status_code, 422
        )

    def test_predict_explicit_abstention(self):
        with (
            tempfile.TemporaryDirectory() as directory,
            patch.dict(os.environ, {"MODEL_REGISTRY": directory}),
        ):
            response = self.client.post(
                "/predict",
                headers=self.headers,
                json={"subject_id": "child-a", "features": {"practice_a": 0.2}},
            )
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["status"], "abstained")
            self.assertIsNone(response.json()["result"])
            self.assertEqual(response.json()["subject_id"], "child-a")


class PipelineTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.fixture = pipeline.synthetic_fixture(self.root / "data")
        self.registry = self.root / "models"

    def tearDown(self):
        self.temp.cleanup()

    def train(self):
        return pipeline.train(self.fixture["manifest"], self.fixture["rows"], self.registry)

    def test_reproducibility_split_metrics_and_synthetic_promotion_refusal(self):
        first, second = self.train(), self.train()
        self.assertEqual(first["version"], second["version"])
        model, metadata = pipeline.load_artifact(self.registry, first["version"])
        self.assertFalse(
            set(metadata["split"]["train_families"]) & set(metadata["split"]["test_families"])
        )
        self.assertIn("confidence_intervals_95_wilson", first["evaluation"])
        self.assertIn("calibration", first["evaluation"])
        self.assertIn("subgroups", first["evaluation"])
        approval = self.root / "approval.json"
        pipeline.save_json(approval, {})
        with self.assertRaisesRegex(ValueError, "Synthetic"):
            pipeline.promote(self.registry, first["version"], approval)
        model["intercept"] += 1
        pipeline.save_json(self.registry / first["version"] / "model.json", model)
        with self.assertRaisesRegex(ValueError, "integrity"):
            pipeline.load_artifact(self.registry, first["version"])

    def test_permission_and_outcome_leakage(self):
        manifest = pipeline.read_json(self.fixture["manifest"])
        manifest["permission"]["training"] = False
        pipeline.save_json(self.fixture["manifest"], manifest)
        with self.assertRaisesRegex(ValueError, "permission"):
            self.train()
        manifest["permission"]["training"] = True
        manifest["outcome_origin"] = "questionnaire_score"
        pipeline.save_json(self.fixture["manifest"], manifest)
        with self.assertRaisesRegex(ValueError, "Questionnaire"):
            self.train()

    def test_external_subject_family_and_site_leakage(self):
        model = self.train()
        with self.assertRaisesRegex(ValueError, "leakage"):
            pipeline.evaluate(
                self.registry, model["version"], self.fixture["manifest"], self.fixture["rows"]
            )
        external = pipeline.synthetic_fixture(self.root / "external", "external", 91)
        evaluation = pipeline.evaluate(
            self.registry, model["version"], external["manifest"], external["rows"]
        )
        self.assertTrue(evaluation["synthetic"])
        self.assertEqual(evaluation["metrics"]["n"], 160)

    def test_approval_hash_deployment_policy_prediction_and_rollback(self):
        # Synthetic TEST ONLY attestations exercise the positive control path; no artifact escapes this temporary directory.
        manifest = pipeline.read_json(self.fixture["manifest"])
        manifest.update(
            synthetic=False,
            outcome_origin="independent_clinical_reference",
            reference_standard_protocol="TEST ONLY reference protocol",
        )
        pipeline.save_json(self.fixture["manifest"], manifest)
        version = self.train()["version"]
        external = pipeline.synthetic_fixture(self.root / "external", "test-external", 91)
        external_manifest = pipeline.read_json(external["manifest"])
        external_manifest.update(
            synthetic=False,
            outcome_origin="independent_clinical_reference",
            reference_standard_protocol="TEST ONLY external protocol",
        )
        pipeline.save_json(external["manifest"], external_manifest)
        pipeline.evaluate(self.registry, version, external["manifest"], external["rows"])
        _, metadata = pipeline.load_artifact(self.registry, version)
        gate = {
            "approved": True,
            "reviewer": "test reviewer",
            "reference": "TEST ONLY",
            "approved_at": "2026-09-07",
        }
        approval = {
            "model_sha256": metadata["model_sha256"],
            **{
                name + "_approval": gate
                for name in ("clinical", "regulatory", "security", "language")
            },
            "intended_use": {
                "version": "TEST ONLY",
                "min_age_months": 0,
                "max_age_months": 215,
                "languages": ["en", "ml"],
                "feature_ranges": {name: [0, 1] for name in manifest["feature_names"]},
            },
            "minimum_metrics": {
                name: 0.01 for name in ("sensitivity", "specificity", "ppv", "coverage")
            },
            "abstention_interval": [0.49, 0.51],
        }
        approval_path = self.root / "approval.json"
        pipeline.save_json(approval_path, approval)
        pipeline.promote(self.registry, version, approval_path)
        request = {
            "subject_id": "child-test",
            "features": {name: 0.99 for name in manifest["feature_names"]},
            "age_months": 40,
            "language": "en",
        }
        prediction = pipeline.predict_approved(self.registry, request)
        self.assertTrue(prediction["eligible"])
        self.assertEqual(prediction["clinical_review_status"], "requires_clinician_review")
        self.assertEqual(prediction["status"], "review_required")
        with self.assertRaisesRegex(ValueError, "population"):
            pipeline.predict_approved(self.registry, {**request, "age_months": 220})
        with self.assertRaisesRegex(ValueError, "out-of-distribution"):
            pipeline.predict_approved(
                self.registry,
                {**request, "features": {name: 9 for name in manifest["feature_names"]}},
            )
        pipeline.promote(self.registry, version, approval_path)
        self.assertEqual(pipeline.rollback(self.registry)["active_version"], version)
        approval["minimum_metrics"]["coverage"] = 1.0
        approval["abstention_interval"] = [0.2, 0.8]
        pipeline.save_json(approval_path, approval)
        with self.assertRaisesRegex(ValueError, "threshold"):
            pipeline.promote(self.registry, version, approval_path)

    def test_row_permissions_and_child_group_consistency(self):
        rows = [json.loads(line) for line in Path(self.fixture["rows"]).read_text().splitlines()]
        rows[0]["training_permission"] = False
        Path(self.fixture["rows"]).write_text("\n".join(json.dumps(row) for row in rows))
        with self.assertRaisesRegex(ValueError, "permission"):
            self.train()
        rows[0]["training_permission"] = True
        rows[1]["family_id"] = "another-family"
        Path(self.fixture["rows"]).write_text("\n".join(json.dumps(row) for row in rows))
        with self.assertRaisesRegex(ValueError, "different split groups"):
            self.train()


if __name__ == "__main__":
    unittest.main()
