import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { guideDestinations } from "./assistant-guide.ts";
import { VIEWS } from "./routing.ts";

const guide = JSON.parse(
  readFileSync(
    new URL("../../../services/core/api/app_guide.json", import.meta.url),
    "utf8",
  ),
);
const rows = guide.destinations.map((d: any) => ({
  ...d,
  label: d.label.en,
  description: d.description.en,
}));
test("graph-backed routes resolve to existing views/tabs and parent routes exclude operations", () => {
  assert.equal(guideDestinations(rows, "admin", VIEWS).length, rows.length);
  const parent = guideDestinations(
    rows,
    "parent",
    VIEWS.filter((v) => v !== "operations"),
  );
  assert.equal(parent.length, 21);
  assert(parent.some((d) => d.view === "activities"));
  assert(!parent.some((d) => d.view === "operations"));
  assert.equal(new Set(rows.map((d: any) => d.id)).size, rows.length);
});
test("malformed, external, forbidden and invented destinations are never actionable", () => {
  const row = rows[0];
  const unsafe = [
    null,
    {},
    { ...row, id: "https://evil.example" },
    { ...row, view: "https://evil.example" },
    { ...row, view: "records", tab: "../../operations" },
    { ...row, view: "care", tab: "invalid" },
    { ...row, label: 4 },
    { ...row, view: "operations" },
  ];
  assert.deepEqual(guideDestinations(unsafe, "parent", ["today", "care"]), []);
  assert.deepEqual(guideDestinations(null, "parent", ["today"]), []);
});
