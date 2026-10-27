#!/usr/bin/env python3
"""Fit a non-clinical age reference from pinned, public CC BY 4.0 milestone data."""

import argparse
import csv
import hashlib
import io
import json
from pathlib import Path
from urllib.request import urlopen

REVISION = "b9ba1bf4932ef6d098619eed8f28bd40470e60fa"
DATA_URL = f"https://raw.githubusercontent.com/d-score/childdevdata/{REVISION}/data-raw/data/gcdg_nld_smocc.txt"
DATA_SHA256 = "0160e68cce052d97134804eb241702020f4371932e865e1832a4f5cf62523b34"
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "services/core/api/milestone_reference.json"
REPORT = ROOT / "docs/research/milestone-reference-evaluation.json"

# These are related research tasks, not validated equivalents of the CDC prompts.
# Never substitute a parent answer for an instrument score or a clinical outcome.
ITEMS = {
    "ddicmm030": (["2m-1"], "Smiles in response", "മറുപടിയായി ചിരിക്കുന്നു"),
    "ddicmm031": (["4m-3"], "Vocalizes in response", "മറുപടിയായി ശബ്ദമുണ്ടാക്കുന്നു"),
    "ddicmd116": (["4m-4"], "Turns head to sound", "ശബ്ദത്തിലേക്ക് തല തിരിക്കുന്നു"),
    "ddigmd061": (["4m-5"], "Balances head while sitting", "ഇരിക്കുമ്പോൾ തല സ്ഥിരമായി നിർത്തുന്നു"),
    "ddigmd006": (["6m-3"], "Grasps an object within reach", "കൈയെത്തുന്ന വസ്തു പിടിക്കുന്നു"),
    "ddigmd063": (["9m-5"], "Sits without support", "പിന്തുണയില്ലാതെ ഇരിക്കുന്നു"),
    "ddigmm067": (["12m-6"], "Walks holding furniture", "ഫർണിച്ചറിൽ പിടിച്ച് നടക്കുന്നു"),
    "ddifmd013": (["15m-4"], "Builds a tower of two cubes", "രണ്ട് കട്ടകൾ അടുക്കുന്നു"),
    "ddigmd068": (["15m-5", "18m-5"], "Walks alone", "സ്വന്തമായി നടക്കുന്നു"),
    "ddicmm039": (["18m-2"], "Says three words", "മൂന്ന് വാക്കുകൾ പറയുന്നു"),
    "ddicmm041": (["24m-2"], "Says two-word sentences", "രണ്ട് വാക്കുള്ള വാക്യം പറയുന്നു"),
    "ddigmd071": (["24m-5"], "Kicks a ball", "പന്ത് ചവിട്ടുന്നു"),
    "ddifmd154": (["24m-6"], "Eats with a spoon without help", "സഹായമില്ലാതെ സ്പൂൺ ഉപയോഗിച്ച് കഴിക്കുന്നു"),
}


def holdout(subject):
    # The same child stays in one partition across every visit and every item.
    return int(hashlib.sha256(subject.encode()).hexdigest()[:8], 16) % 5 == 0


def parse(raw):
    if hashlib.sha256(raw).hexdigest() != DATA_SHA256:
        raise ValueError("Source digest changed; inspect a new release before retraining")
    rows = list(csv.DictReader(io.StringIO(raw.decode()), delimiter="\t"))
    keys = [(r["subjid"], r["agedays"]) for r in rows]
    if len(rows) != 16722 or len(set(keys)) != len(keys):
        raise ValueError("Unexpected cohort size or duplicate child/visit")
    for row in rows:
        if row["agedays"] and not 0 <= float(row["agedays"]) <= 1100:
            raise ValueError("Invalid source age")
        for item in ITEMS:
            if row[item] not in {"", "0", "1"}:
                raise ValueError("Unexpected item score; missing must never mean failed")
    return rows


def fit(rows):
    import numpy as np
    import sklearn
    from sklearn.isotonic import IsotonicRegression

    original_count = len(rows)
    rows = [r for r in rows if r["agedays"]]
    subjects = {r["subjid"] for r in rows}
    report = {
        "dataset": "GCDG-NLD-SMOCC via childdevdata",
        "source_sha256": DATA_SHA256,
        "visits": len(rows),
        "source_visits": original_count,
        "excluded_missing_age": original_count - len(rows),
        "children": len(subjects),
        "training_versions": {"numpy": np.__version__, "scikit_learn": sklearn.__version__},
        "age_days": [
            min(float(r["agedays"]) for r in rows),
            max(float(r["agedays"]) for r in rows),
        ],
        "train_children": sum(not holdout(s) for s in subjects),
        "test_children": sum(holdout(s) for s in subjects),
        "split": "SHA256 child ID modulo 5; partition 0 held out; no refit on test children",
        "weighting": "Each child's observed visits for an item sum to one within its partition",
        "method": "Monotone isotonic regression: age in days -> instrument-task pass rate",
        "limitations": [
            "Historical Netherlands cohort, not calibrated to Indian children or Malayalam use",
            "Predicts an observed instrument task, not delay, diagnosis, future outcome or a child's abilities",
            "Age-only model; parent answers do not become research instrument scores",
            "Related-task links are engineering mappings, not clinically validated equivalents",
            "Internal child-held-out evaluation only; no independent-site validation",
            "Age/visit selection and missing-by-design measurements can bias rates",
        ],
        "items": {},
    }
    models = {}
    for item, (links, en, ml) in ITEMS.items():
        observed = [r for r in rows if r[item] != ""]
        train = [r for r in observed if not holdout(r["subjid"])]
        test = [r for r in observed if holdout(r["subjid"])]

        def arrays(partition, column):
            counts = {}
            for row in partition:
                counts[row["subjid"]] = counts.get(row["subjid"], 0) + 1
            return (
                np.array([float(r["agedays"]) for r in partition]),
                np.array([int(r[column]) for r in partition]),
                np.array([1 / counts[r["subjid"]] for r in partition]),
            )

        x, y, w = arrays(train, item)
        tx, ty, tw = arrays(test, item)
        estimator = IsotonicRegression(y_min=0, y_max=1, out_of_bounds="clip").fit(
            x, y, sample_weight=w
        )
        # Evaluate only measured training-age support; report excluded test rows.
        eligible = (tx >= x.min()) & (tx <= x.max())
        predictions = estimator.predict(tx[eligible])
        brier = float(np.average((predictions - ty[eligible]) ** 2, weights=tw[eligible]))
        baseline = float(
            np.average((float(np.average(y, weights=w)) - ty[eligible]) ** 2, weights=tw[eligible])
        )
        usable = (
            len(set(r["subjid"] for r in train)) >= 200
            and int(eligible.sum()) >= 50
            and brier <= baseline
        )
        report["items"][item] = {
            "label": en,
            "observed_visits": len(observed),
            "missing_visits": len(rows) - len(observed),
            "train_children": len({r["subjid"] for r in train}),
            "test_children": len({r["subjid"] for r in test}),
            "test_visits_in_age_support": int(eligible.sum()),
            "test_visits_outside_age_support": int((~eligible).sum()),
            "child_weighted_brier": round(brier, 6),
            "training_mean_baseline_brier": round(baseline, 6),
            "eligible_for_research_reference": usable,
        }
        if not usable:
            continue
        lo, hi = int(x.min()), int(x.max())
        # Only aggregate counts are shipped; no row or source subject identifier.
        support = [
            len({r["subjid"] for r in train if abs(float(r["agedays"]) - day) <= 31})
            for day in range(lo, hi + 1)
        ]
        models[item] = {
            "label": {"en": en, "ml": ml},
            "related_checklist_items": links,
            "age_days": [lo, hi],
            "knots": [
                [float(a), float(b)]
                for a, b in zip(estimator.X_thresholds_, estimator.y_thresholds_, strict=True)
            ],
            "nearby_train_children": support,
            "test_children": report["items"][item]["test_children"],
        }
    artifact = {
        "schema_version": 1,
        "kind": "research_age_reference",
        "algorithm": "isotonic_age_only_v1",
        "source": {
            "title": "childdevdata / Netherlands SMOCC cohort",
            "url": "https://d-score.org/childdevdata/",
            "documentation_url": "https://d-score.org/childdevdata/reference/gcdg_nld_smocc.html",
            "license": "CC BY 4.0",
            "revision": REVISION,
            "sha256": DATA_SHA256,
            "citation": "Herngreen WP et al. The SMOCC-study: Design of a representative cohort of live-born infants in the Netherlands. European Journal of Public Health. 1992;2:117-122. Data harmonised by van Buuren et al., childdevdata.",
            "changes": "Selected related tasks; child-partitioned, weighted isotonic age models and aggregate support counts by NeuroNest. No raw records distributed.",
        },
        "models": models,
    }
    canonical = json.dumps(artifact, sort_keys=True, ensure_ascii=False, allow_nan=False).encode()
    artifact["version"] = hashlib.sha256(canonical).hexdigest()[:20]
    report["artifact_version"] = artifact["version"]
    return artifact, report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--cache", type=Path, required=True, help="Private local cache outside the repository"
    )
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    path = args.cache / "gcdg_nld_smocc.txt"
    if not path.exists():
        with urlopen(DATA_URL, timeout=60) as response:
            path.write_bytes(response.read(5_000_000))
    artifact, report = fit(parse(path.read_bytes()))
    for path, value in [(OUTPUT, artifact), (REPORT, report)]:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(value, indent=2, ensure_ascii=False, allow_nan=False) + "\n")
    print(
        json.dumps(
            {
                "version": artifact["version"],
                "children": report["children"],
                "models": len(artifact["models"]),
            }
        )
    )


if __name__ == "__main__":
    main()
