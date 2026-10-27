"""Permissioned, reproducible structured-data baseline. JSON artifacts never execute model code."""

import argparse
import hashlib
import json
import math
import os
from datetime import datetime, timezone
from pathlib import Path


def read_json(path):
    return json.loads(Path(path).read_text())


def save_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, indent=2, ensure_ascii=False, allow_nan=False) + "\n")
    os.replace(temporary, path)


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, allow_nan=False).encode()).hexdigest()


def dataset(manifest_path, rows_path, purpose="training"):
    manifest = read_json(manifest_path)
    if not manifest.get("permission", {}).get(purpose) or not manifest["permission"].get(
        "reference"
    ):
        raise ValueError(f"Documented {purpose} permission is required")
    if not manifest["permission"].get("withdrawal_checked_at"):
        raise ValueError("A withdrawal/consent review timestamp is required")
    if not manifest.get("dataset_id") or not isinstance(manifest.get("synthetic"), bool):
        raise ValueError("Dataset ID and explicit synthetic classification are required")
    outcome = "synthetic_fixture" if manifest["synthetic"] else "independent_clinical_reference"
    if manifest.get("outcome_origin") != outcome:
        raise ValueError(
            "Questionnaire-derived or unverified outcomes cannot train this diagnostic baseline"
        )
    if not manifest["synthetic"] and not manifest.get("reference_standard_protocol"):
        raise ValueError("An independent clinical reference-standard protocol is required")
    names = manifest.get("feature_names", [])
    if not names or len(set(names)) != len(names) or len(names) > 100:
        raise ValueError("Unique feature names are required")
    if any(
        any(word in name.lower() for word in ("diagnosis", "outcome", "label", "autism_score"))
        for name in names
    ):
        raise ValueError("Outcome-derived feature names are prohibited")
    rows = [json.loads(line) for line in Path(rows_path).read_text().splitlines() if line.strip()]
    if len(rows) < 8:
        raise ValueError(
            "At least 8 rows are needed to exercise splitting; this is not a clinical sample-size requirement"
        )
    seen, families = set(), {}
    for row in rows:
        required = (
            "record_id",
            "subject_id",
            "family_id",
            "site_id",
            "language",
            "age_months",
            "features",
            "outcome",
        )
        if any(field not in row for field in required):
            raise ValueError("A record is missing required provenance fields")
        if row["record_id"] in seen:
            raise ValueError("Duplicate record identifier")
        seen.add(row["record_id"])
        subject, family = row["subject_id"], row["family_id"]
        if not all(
            isinstance(row[key], str) and row[key]
            for key in ("record_id", "subject_id", "family_id", "site_id")
        ):
            raise ValueError("Nonempty provenance identifiers are required")
        if subject in families and families[subject] != family:
            raise ValueError("A child cannot belong to different split groups")
        families[subject] = family
        if row.get("withdrawn") or row.get(f"{purpose}_permission") is not True:
            raise ValueError("Every row needs active purpose-specific permission")
        if type(row["outcome"]) is not int or row["outcome"] not in (0, 1):
            raise ValueError("Outcomes must be binary independent-reference labels")
        if set(row["features"]) != set(names):
            raise ValueError("Feature schema mismatch")
        if (
            type(row["age_months"]) is not int
            or not 0 <= row["age_months"] < 216
            or row["language"] not in {"en", "ml"}
        ):
            raise ValueError("Dataset outside the implemented child/language population")
        for value in row["features"].values():
            if value is not None and (type(value) not in (int, float) or not math.isfinite(value)):
                raise ValueError("Features must be finite numbers or explicitly missing")
    if len(set(row["family_id"] for row in rows)) < 4:
        raise ValueError("Insufficient independent families for a grouped development split")
    return manifest, rows


def metrics(labels, probabilities):
    import numpy as np
    from sklearn.metrics import brier_score_loss, confusion_matrix, roc_auc_score

    labels, probabilities = np.array(labels), np.array(probabilities)
    tp = int(((probabilities >= 0.5) & (labels == 1)).sum())
    tn = int(((probabilities < 0.5) & (labels == 0)).sum())
    fp = int(((probabilities >= 0.5) & (labels == 0)).sum())
    fn = int(((probabilities < 0.5) & (labels == 1)).sum())
    ratios = {
        "sensitivity": (tp, tp + fn),
        "specificity": (tn, tn + fp),
        "ppv": (tp, tp + fp),
        "npv": (tn, tn + fn),
    }
    result = {name: hits / count if count else None for name, (hits, count) in ratios.items()}
    intervals = {}
    for name, (hits, count) in ratios.items():
        if not count:
            intervals[name] = None
            continue
        p, z = hits / count, 1.96
        center = (p + z * z / (2 * count)) / (1 + z * z / count)
        margin = (
            z * math.sqrt(p * (1 - p) / count + z * z / (4 * count * count)) / (1 + z * z / count)
        )
        intervals[name] = [max(0, center - margin), min(1, center + margin)]
    calibration = []
    for lo in [0, 0.2, 0.4, 0.6, 0.8]:
        selected = (probabilities >= lo) & (
            probabilities < lo + 0.2 if lo < 0.8 else probabilities <= 1
        )
        calibration.append(
            {
                "range": [lo, round(lo + 0.2, 1)],
                "n": int(selected.sum()),
                "observed_rate": float(labels[selected].mean()) if selected.any() else None,
                "predicted_mean": float(probabilities[selected].mean()) if selected.any() else None,
            }
        )
    return {
        **result,
        "confidence_intervals_95_wilson": intervals,
        "n": len(labels),
        "confusion_matrix": confusion_matrix(labels, probabilities >= 0.5, labels=[0, 1]).tolist(),
        "roc_auc": float(roc_auc_score(labels, probabilities)) if len(set(labels)) == 2 else None,
        "brier_score": float(brier_score_loss(labels, probabilities)),
        "prevalence": float(labels.mean()),
        "coverage": 1.0,
        "abstention_rate": 0.0,
        "calibration": calibration,
        "threshold": 0.5,
        "notice": "Research evaluation; thresholds are not clinical release criteria. Wilson intervals assume independent observations; repeated-visit cohorts need a pre-specified clustered analysis.",
    }


def probabilities(model, rows):
    values = []
    for row in rows:
        logit = model["intercept"]
        for i, name in enumerate(model["feature_names"]):
            value = row["features"][name]
            value = model["imputer_medians"][i] if value is None else value
            logit += (value - model["means"][i]) / model["scales"][i] * model["coefficients"][i]
        values.append(1 / (1 + math.exp(-max(-700, min(700, logit)))))
    return values


def report(model, rows):
    predictions = probabilities(model, rows)
    result = metrics([row["outcome"] for row in rows], predictions)
    result["subgroups"] = {}
    for dimension in ("language", "site_id"):
        result["subgroups"][dimension] = {}
        for group in sorted({row[dimension] for row in rows}):
            indices = [i for i, row in enumerate(rows) if row[dimension] == group]
            result["subgroups"][dimension][group] = {
                **metrics([rows[i]["outcome"] for i in indices], [predictions[i] for i in indices]),
                "evidence_gap": len(indices) < 30,
            }
    return result


def train(manifest_path, rows_path, registry):
    import numpy as np
    from sklearn.impute import SimpleImputer
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import GroupShuffleSplit
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler

    manifest, rows = dataset(manifest_path, rows_path)
    x = np.array(
        [
            [
                np.nan if row["features"][name] is None else row["features"][name]
                for name in manifest["feature_names"]
            ]
            for row in rows
        ]
    )
    y = np.array([row["outcome"] for row in rows])
    train_indices, test_indices = next(
        GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=42).split(
            x, y, groups=[row["family_id"] for row in rows]
        )
    )
    if len(set(y[train_indices])) != 2 or len(set(y[test_indices])) != 2:
        raise ValueError(
            "Both outcomes must occur in each independent split; acquire appropriate data rather than resplitting for a favorable metric"
        )
    if np.isnan(x[train_indices]).all(axis=0).any():
        raise ValueError("A training feature is entirely missing")
    estimator = make_pipeline(
        SimpleImputer(strategy="median"),
        StandardScaler(),
        LogisticRegression(random_state=42, max_iter=1000),
    )
    estimator.fit(x[train_indices], y[train_indices])
    imputer, scaler, classifier = (
        estimator.steps[0][1],
        estimator.steps[1][1],
        estimator.steps[2][1],
    )
    model = {
        "schema_version": 1,
        "feature_names": manifest["feature_names"],
        "imputer_medians": imputer.statistics_.tolist(),
        "means": scaler.mean_.tolist(),
        "scales": scaler.scale_.tolist(),
        "coefficients": classifier.coef_[0].tolist(),
        "intercept": float(classifier.intercept_[0]),
        "algorithm": "sklearn_logistic_regression",
    }
    version = digest({"manifest": manifest, "rows": rows, "model": model})[:20]
    metadata = {
        "version": version,
        "dataset_id": manifest["dataset_id"],
        "dataset_digest": digest(rows),
        "manifest": manifest,
        "synthetic": manifest["synthetic"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "model_sha256": digest(model),
        "seed": 42,
        "status": "research_only",
        "external_evaluation": None,
        "family_ids": sorted({r["family_id"] for r in rows}),
        "subject_ids": sorted({r["subject_id"] for r in rows}),
        "site_ids": sorted({r["site_id"] for r in rows}),
        "split": {
            "train_families": sorted({rows[i]["family_id"] for i in train_indices}),
            "test_families": sorted({rows[i]["family_id"] for i in test_indices}),
        },
    }
    metadata["internal_evaluation"] = report(model, [rows[i] for i in test_indices])
    directory = Path(registry) / version
    save_json(directory / "model.json", model)
    save_json(directory / "metadata.json", metadata)
    return {
        "version": version,
        "synthetic": metadata["synthetic"],
        "status": "research_only",
        "evaluation": metadata["internal_evaluation"],
    }


def load_artifact(registry, version):
    if (
        not isinstance(version, str)
        or len(version) != 20
        or any(c not in "0123456789abcdef" for c in version)
    ):
        raise ValueError("Invalid artifact identifier")
    directory = Path(registry) / version
    model, metadata = read_json(directory / "model.json"), read_json(directory / "metadata.json")
    if digest(model) != metadata["model_sha256"]:
        raise ValueError("Model integrity check failed")
    return model, metadata


def evaluate(registry, version, manifest_path, rows_path):
    model, metadata = load_artifact(registry, version)
    manifest, rows = dataset(manifest_path, rows_path, "evaluation")
    if manifest["feature_names"] != model["feature_names"]:
        raise ValueError("External feature schema differs")
    for kind in ("family", "subject", "site"):
        if set(metadata[f"{kind}_ids"]) & {row[f"{kind}_id"] for row in rows}:
            raise ValueError(f"External evaluation {kind} leakage")
    evaluation = {
        "dataset_id": manifest["dataset_id"],
        "synthetic": manifest["synthetic"],
        "dataset_digest": digest(rows),
        "manifest": manifest,
        "metrics": report(model, rows),
        "cases": [
            {
                "label": row["outcome"],
                "probability": probability,
                "age_months": row["age_months"],
                "language": row["language"],
            }
            for row, probability in zip(rows, probabilities(model, rows), strict=True)
        ],
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
    }
    metadata["external_evaluation"] = evaluation
    save_json(Path(registry) / version / "metadata.json", metadata)
    return evaluation


def validate_approval(metadata, approval):
    if (
        metadata["synthetic"]
        or not metadata.get("external_evaluation")
        or metadata["external_evaluation"]["synthetic"]
    ):
        raise ValueError("Synthetic or externally unevaluated models cannot be promoted")
    if approval.get("model_sha256") != metadata["model_sha256"]:
        raise ValueError("Approval must bind to the exact artifact hash")
    for name in ("clinical", "regulatory", "security", "language"):
        gate = approval.get(f"{name}_approval", {})
        if gate.get("approved") is not True or not all(
            gate.get(field) for field in ("reviewer", "reference", "approved_at")
        ):
            raise ValueError(f"Documented {name} approval is required")
    intended = approval.get("intended_use", {})
    if (
        not intended.get("version")
        or not intended.get("languages")
        or not set(intended["languages"]) <= {"en", "ml"}
    ):
        raise ValueError("Validated intended use and languages are required")
    if not 0 <= intended.get("min_age_months", -1) <= intended.get("max_age_months", -1) < 216:
        raise ValueError("Validated child age range is required")
    ranges = intended.get("feature_ranges", {})
    if set(ranges) != set(metadata["manifest"]["feature_names"]):
        raise ValueError("Validated ranges are required for every feature")
    for bounds in ranges.values():
        if (
            len(bounds) != 2
            or not all(isinstance(x, (int, float)) and math.isfinite(x) for x in bounds)
            or bounds[0] >= bounds[1]
        ):
            raise ValueError("Invalid feature ranges")
    low, high = approval.get("abstention_interval", [-1, -1])
    if not 0 < low < high < 1:
        raise ValueError("A clinically approved abstention interval is required")
    cases = [
        case
        for case in metadata["external_evaluation"].get("cases", [])
        if intended["min_age_months"] <= case["age_months"] <= intended["max_age_months"]
        and case["language"] in intended["languages"]
    ]
    determined = [case for case in cases if not low <= case["probability"] <= high]
    if not determined:
        raise ValueError("No determinate external evidence in the approved population")
    deployed_metrics = metrics(
        [case["label"] for case in determined], [case["probability"] for case in determined]
    )
    deployed_metrics["coverage"] = len(determined) / len(cases)
    thresholds = approval.get("minimum_metrics", {})
    if not all(name in thresholds for name in ("sensitivity", "specificity", "ppv", "coverage")):
        raise ValueError("Pre-specified clinical acceptance thresholds are required")
    for name, minimum in thresholds.items():
        actual = deployed_metrics.get(name)
        if (
            type(minimum) not in (int, float)
            or not 0 < minimum <= 1
            or type(actual) not in (int, float)
            or actual < minimum
        ):
            raise ValueError("External evaluation does not satisfy every approved threshold")


def promote(registry, version, approval_path):
    _, metadata = load_artifact(registry, version)
    approval = read_json(approval_path)
    validate_approval(metadata, approval)
    pointer = Path(registry) / "active.json"
    previous = read_json(pointer) if pointer.exists() else None
    entry = {
        "version": version,
        "approval": approval,
        "metadata_sha256": digest(metadata),
        "activated_at": datetime.now(timezone.utc).isoformat(),
    }
    if previous:
        save_json(Path(registry) / "previous.json", previous)
    save_json(pointer, entry)
    return {"active_version": version}


def rollback(registry):
    previous = read_json(Path(registry) / "previous.json")
    _, metadata = load_artifact(registry, previous["version"])
    validate_approval(metadata, previous["approval"])
    if digest(metadata) != previous["metadata_sha256"]:
        raise ValueError("Previously approved metadata changed")
    save_json(Path(registry) / "active.json", previous)
    return {"active_version": previous["version"]}


def predict_approved(registry, request):
    active = read_json(Path(registry) / "active.json")
    model, metadata = load_artifact(registry, active["version"])
    validate_approval(metadata, active["approval"])
    if digest(metadata) != active["metadata_sha256"]:
        raise ValueError("Artifact evaluation changed after approval")
    intended = active["approval"]["intended_use"]
    age = request.get("age_months")
    if (
        age is None
        or not intended["min_age_months"] <= age <= intended["max_age_months"]
        or request["language"] not in intended["languages"]
    ):
        raise ValueError("Request not in the validated population")
    features = request["features"]
    if set(features) != set(model["feature_names"]):
        raise ValueError("Feature schema mismatch")
    for name, value in features.items():
        lo, hi = intended["feature_ranges"][name]
        if value is None or not math.isfinite(value) or not lo <= value <= hi:
            raise ValueError("Missing or out-of-distribution feature")
    probability = probabilities(model, [{"features": features}])[0]
    low, high = active["approval"]["abstention_interval"]
    abstain = low <= probability <= high
    # The clinical label and interpretation remain with a qualified reviewer.
    return {
        "eligible": True,
        "status": "abstained" if abstain else "review_required",
        "model_version": active["version"],
        "intended_use_version": intended["version"],
        "input_quality": "within_validated_ranges",
        "result": None if abstain else {"reference_outcome_probability": probability},
        "uncertainty": {"abstention_interval": [low, high]},
        "abstention_reason": "Within approved uncertainty interval" if abstain else None,
        "clinical_review_status": "requires_clinician_review",
        "provenance": {"model_sha256": metadata["model_sha256"]},
    }


def synthetic_fixture(directory, prefix="synthetic", seed=42):
    import random

    randomizer = random.Random(seed)
    manifest = {
        "dataset_id": prefix,
        "schema_version": 1,
        "synthetic": True,
        "outcome_origin": "synthetic_fixture",
        "feature_names": ["practice_a", "practice_b", "practice_c"],
        "permission": {
            "training": True,
            "evaluation": True,
            "reference": "Generated original synthetic fixture; not patient data",
            "withdrawal_checked_at": "not_applicable_synthetic",
        },
    }
    rows = []
    for i in range(160):
        values = [round(randomizer.random(), 5) for _ in range(3)]
        rows.append(
            {
                "record_id": f"{prefix}-r{i}",
                "subject_id": f"{prefix}-child{i // 2}",
                "family_id": f"{prefix}-family{i // 4}",
                "site_id": f"{prefix}-site{i % 3}",
                "language": "en" if i % 2 else "ml",
                "age_months": 20 + i % 180,
                "features": dict(zip(manifest["feature_names"], values, strict=True)),
                "outcome": int(sum(values) + randomizer.uniform(-0.7, 0.7) > 1.5),
                "training_permission": True,
                "evaluation_permission": True,
                "withdrawn": False,
            }
        )
    directory = Path(directory)
    save_json(directory / "manifest.json", manifest)
    (directory / "rows.jsonl").write_text("\n".join(json.dumps(row) for row in rows) + "\n")
    return {
        "manifest": str(directory / "manifest.json"),
        "rows": str(directory / "rows.jsonl"),
        "synthetic": True,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    fixture = commands.add_parser("synthetic-fixture")
    fixture.add_argument("directory")
    fixture.add_argument("--prefix", default="synthetic")
    fixture.add_argument("--seed", type=int, default=42)
    training = commands.add_parser("train")
    training.add_argument("manifest")
    training.add_argument("rows")
    training.add_argument("registry")
    evaluation = commands.add_parser("evaluate")
    evaluation.add_argument("registry")
    evaluation.add_argument("version")
    evaluation.add_argument("manifest")
    evaluation.add_argument("rows")
    promotion = commands.add_parser("promote")
    promotion.add_argument("registry")
    promotion.add_argument("version")
    promotion.add_argument("approval")
    revert = commands.add_parser("rollback")
    revert.add_argument("registry")
    args = parser.parse_args()
    try:
        if args.command == "synthetic-fixture":
            result = synthetic_fixture(args.directory, args.prefix, args.seed)
        elif args.command == "train":
            result = train(args.manifest, args.rows, args.registry)
        elif args.command == "evaluate":
            result = evaluate(args.registry, args.version, args.manifest, args.rows)
        elif args.command == "promote":
            result = promote(args.registry, args.version, args.approval)
        else:
            result = rollback(args.registry)
        print(json.dumps(result, indent=2))
    except (ValueError, OSError, KeyError) as error:
        parser.exit(1, f"Pipeline refused: {error}\n")


if __name__ == "__main__":
    main()
