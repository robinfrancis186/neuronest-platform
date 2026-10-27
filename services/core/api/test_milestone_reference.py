from copy import deepcopy
import json
from unittest.mock import patch

from django.test import SimpleTestCase

from .milestone_reference import artifact, reference_for


class ResearchAgeReferenceTests(SimpleTestCase):
    def tearDown(self):
        artifact.cache_clear()

    def test_real_aggregate_artifact_and_age_specific_predictions(self):
        data = artifact()
        self.assertIsNotNone(data)
        self.assertEqual(data["source"]["license"], "CC BY 4.0")
        result = reference_for([{"id": "4m-3"}, {"id": "4m-4"}, {"id": "4m-5"}], 153)
        self.assertGreaterEqual(len(result["estimates"]), 1)
        self.assertEqual(result["total_items"], 3)
        self.assertEqual(result["kind"], "research_age_reference")
        for estimate in result["estimates"]:
            self.assertGreaterEqual(estimate["nearby_train_children"], 50)
            self.assertIn(estimate["estimated_per_100"], range(0, 101, 5))
        # The same task's age-only rate must not fall as age increases.
        early = reference_for([{"id": "4m-4"}], 110)["estimates"][0]
        later = reference_for([{"id": "4m-4"}], 180)["estimates"][0]
        self.assertLessEqual(early["estimated_per_100"], later["estimated_per_100"])
        self.assertNotIn("probability", result)
        self.assertNotIn("diagnosis", result)
        self.assertNotIn("subjid", json.dumps(data))

    def test_no_extrapolation_unknown_items_or_missing_answers_as_failures(self):
        for days, items in [
            (0, [{"id": "4m-4"}]),
            (2000, [{"id": "4m-4"}]),
            (153, [{"id": "unknown"}]),
        ]:
            self.assertEqual(reference_for(items, days)["estimates"], [])
        for invalid_age in [-1, 153.5, None, True]:
            self.assertIsNone(reference_for([{"id": "4m-4"}], invalid_age))

    def test_sparse_age_support_is_withheld(self):
        data = deepcopy(artifact())
        data["models"]["ddicmd116"]["nearby_train_children"] = [0] * len(
            data["models"]["ddicmd116"]["nearby_train_children"]
        )
        with patch("api.milestone_reference.artifact", return_value=data):
            self.assertEqual(reference_for([{"id": "4m-4"}], 153)["estimates"], [])

    def test_missing_or_modified_artifact_cannot_invent_estimates(self):
        data = deepcopy(artifact())
        data["models"]["ddicmd116"]["knots"][0][1] = 99
        artifact.cache_clear()
        with patch("api.milestone_reference.Path.read_text", return_value=json.dumps(data)):
            self.assertIsNone(artifact())
        artifact.cache_clear()
        with patch("api.milestone_reference.Path.read_text", side_effect=FileNotFoundError):
            self.assertIsNone(reference_for([{"id": "4m-4"}], 153))
