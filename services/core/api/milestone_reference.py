"""Age-only research estimates; never used for clinical scoring or follow-up rules."""

from bisect import bisect_right
from functools import lru_cache
import hashlib
import json
import math
from pathlib import Path


@lru_cache(maxsize=1)
def artifact():
    try:
        data = json.loads(Path(__file__).with_suffix(".json").read_text())
        version = data.pop("version")
        canonical = json.dumps(data, sort_keys=True, ensure_ascii=False, allow_nan=False).encode()
        if (
            hashlib.sha256(canonical).hexdigest()[:20] != version
            or data["kind"] != "research_age_reference"
            or data["algorithm"] != "isotonic_age_only_v1"
        ):
            return None
        for model in data["models"].values():
            lo, hi = model["age_days"]
            knots = model["knots"]
            if (
                type(lo) is not int
                or type(hi) is not int
                or not 0 <= lo < hi <= 1100
                or len(model["nearby_train_children"]) != hi - lo + 1
                or not knots
                or knots[0][0] != lo
                or knots[-1][0] != hi
                or any(
                    not (math.isfinite(x) and math.isfinite(y) and 0 <= y <= 1) for x, y in knots
                )
                or any(a[0] >= b[0] or a[1] > b[1] for a, b in zip(knots, knots[1:], strict=False))
                or any(type(n) is not int or n < 0 for n in model["nearby_train_children"])
            ):
                return None
        return {**data, "version": version}
    except (OSError, ValueError, KeyError, TypeError, IndexError):
        return None


def reference_for(items, age_days):
    data = artifact()
    if data is None or type(age_days) is not int or age_days < 0:
        return None
    ids = {item["id"] for item in items}
    estimates = []
    for research_id, model in data["models"].items():
        related = ids.intersection(model["related_checklist_items"])
        lo, hi = model["age_days"]
        if not related or not lo <= age_days <= hi:
            continue
        support = model["nearby_train_children"][age_days - lo]
        if support < 50:
            continue
        knots = model["knots"]
        index = min(bisect_right([k[0] for k in knots], age_days), len(knots) - 1)
        x1, y1 = knots[max(0, index - 1)]
        x2, y2 = knots[index]
        rate = y1 if x1 == x2 else y1 + (y2 - y1) * (age_days - x1) / (x2 - x1)
        estimates.append(
            {
                "research_item": research_id,
                "related_checklist_items": sorted(related),
                "label": model["label"],
                # Round to five in a hundred; this is not an individual confidence score.
                "estimated_per_100": int(math.floor(rate * 20 + 0.5) * 5),
                "nearby_train_children": support,
            }
        )
    return {
        "kind": data["kind"],
        "version": data["version"],
        "age_days": age_days,
        "source": data["source"],
        "estimates": estimates,
        "covered_items": len({i for e in estimates for i in e["related_checklist_items"]}),
        "total_items": len(items),
    }
