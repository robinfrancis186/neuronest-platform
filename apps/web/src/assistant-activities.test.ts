import assert from "node:assert/strict";
import test from "node:test";
import {
  activityDestinations,
  activityRequest,
  recommendActivities,
} from "./assistant-activities.ts";
import type { MilestoneCheckIn } from "./milestones.ts";
import { translate } from "./i18n.ts";
import { validTab } from "./routing.ts";
const tr = (text: string) => text;
const checkin = (overrides: Partial<MilestoneCheckIn> = {}) =>
  ({
    child: "c1",
    age_months: 40,
    created_at: "2026-10-27T00:00:00Z",
    skill_loss: false,
    parent_concern: false,
    summary: {
      items: [
        {
          id: "a",
          domain: "cognitive",
          answer: "not_yet",
          label: { en: "Notices a pattern", ml: "ക്രമം ശ്രദ്ധിക്കുന്നു" },
        },
      ],
    },
    ...overrides,
  }) as MilestoneCheckIn;
const suggest = (history: MilestoneCheckIn[] = [], months: number | null = 40) =>
  recommendActivities("c1", months, history, "en", tr);

test("recommendations use only the latest selected-child check-in and explain the saved answer", () => {
  const result = suggest([
    checkin({ created_at: "2026-01-01T00:00:00Z", skill_loss: true }),
    checkin(),
    checkin({ child: "c2", skill_loss: true }),
  ]);
  assert.equal(result.recommendations[0].tab, "patterns");
  assert.match(result.recommendations[0].description, /Notices a pattern — Not yet/);
  assert.equal(result.recommendations.length, 3);
  assert(!result.actions.includes("booking"));
  const communication = checkin();
  communication.summary.items[0].domain = "communication";
  const other = suggest([communication]);
  assert.equal(other.recommendations[0].tab, "stories");
  assert.notDeepEqual(
    other.recommendations.map((d) => d.tab),
    result.recommendations.map((d) => d.tab),
  );
});

test("age gates every link, including infant guided play and older games", () => {
  for (const months of [0, 5, 11, 18, 24, 35, 36, 60, 84]) {
    const result = suggest([], months);
    assert(result.recommendations.length > 0);
    for (const d of result.recommendations) {
      assert.equal(d.view, "activities");
      assert.equal(validTab(d.view, d.tab), d.tab);
    }
    if (months < 24)
      assert(
        result.recommendations.every(
          (d) =>
            !["shapes", "pairs", "patterns", "colours", "counting", "sizes"].includes(
              d.tab,
            ),
        ),
      );
  }
  assert.equal(suggest([], null).recommendations.length, 0);
  assert.match(suggest([], null).text, /valid date of birth/);
});

test("missing, unavailable and previous age-group answers are not presented as current personalization", () => {
  assert.match(suggest().text, /age only/);
  assert(suggest().actions.includes("milestones"));
  assert.match(suggest([checkin({ age_months: 18 })]).text, /earlier age group/);
  assert(
    !suggest([checkin({ age_months: 18 })]).recommendations.some((d) =>
      /From your check-in/.test(d.description),
    ),
  );
  assert.match(recommendActivities("c1", 40, [], "en", tr, true).text, /couldn’t load/);
});

test("reported skill loss prioritizes care and concerns add a care action", () => {
  const lost = suggest([checkin({ skill_loss: true })]);
  assert.equal(lost.recommendations.length, 0);
  assert(lost.actions.includes("booking"));
  assert.match(lost.text, /promptly/);
  assert(suggest([checkin({ parent_concern: true })]).actions.includes("booking"));
});

test("all-yes answers keep recommendations age-based without inventing a missing skill", () => {
  const yes = checkin();
  yes.summary.items[0].answer = "yes";
  const result = suggest([yes]);
  assert.match(result.text, /skills as observed/);
  assert(
    result.recommendations.every((d) => /Selected for their age/.test(d.description)),
  );
});

test("Malayalam recommendations and direct routes stay localized and allowlisted", () => {
  const result = recommendActivities("c1", 40, [checkin()], "ml", (t) =>
    translate(t, "ml"),
  );
  assert(!result.text.includes("These suggestions"));
  assert.match(result.recommendations[0].description, /ക്രമം ശ്രദ്ധിക്കുന്നു/);
  for (const d of activityDestinations(40, (t) => translate(t, "ml")))
    assert.equal(validTab(d.view, d.tab), d.tab);
  assert(activityRequest("Suggest games for my child"));
  assert(activityRequest("കുട്ടിക്ക് കളികൾ നിർദ്ദേശിക്കൂ"));
  assert(!activityRequest("Book a doctor"));
  assert(!activityRequest("Play a video about development"));
  assert(!activityRequest("ഡോക്ടറെ ശുപാർശ ചെയ്യൂ"));
});
