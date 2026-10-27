import assert from "node:assert/strict";
import test from "node:test";
import {
  activityAge,
  ageStage,
  GAMES,
  gameLevel,
  gameQuestion,
  PICTURE_NAMES,
  pictureDeck,
  PLAY,
} from "./activities.ts";
import { translate } from "./i18n.ts";

test("activity age uses complete calendar months and rejects missing, impossible or future dates", () => {
  assert.equal(activityAge("2026-05-27", "2026-10-26"), 4);
  assert.equal(activityAge("2026-05-27", "2026-10-27"), 5);
  assert.equal(activityAge("2024-10-27", "2026-10-26"), 23);
  assert.equal(activityAge("2024-10-27", "2026-10-27"), 24);
  assert.equal(activityAge("2024-02-29", "2026-02-28"), 23);
  for (const value of [undefined, "", "bad", "2026-02-30", "2026-13-01", "2026-10-28"])
    assert.equal(activityAge(value, "2026-10-27"), null);
  assert.equal(activityAge("2026-05-27", "invalid"), null);
});

test("each age has guided suggestions and young children never receive child screen games", () => {
  for (let months = 0; months < 216; months++) {
    assert(PLAY.some((p) => months >= p.min && months <= p.max));
    const games = GAMES.filter((g) => months >= g.min);
    assert.equal(games.length, months < 24 ? 0 : months < 36 ? 3 : 6);
  }
  assert.deepEqual([0, 6, 12, 24, 36, 60].map(ageStage), [
    "0–5 months",
    "6–11 months",
    "1 year",
    "2 years",
    "3–4 years",
    "5 years and up",
  ]);
  assert.equal(gameLevel(24).choices, 2);
  assert.equal(gameLevel(36).choices, 3);
  assert.equal(gameLevel(60).choices, 4);
  assert.equal(gameLevel(36).pairs, 2);
  assert.equal(gameLevel(48).pairs, 4);
  assert.equal(gameLevel(72).pairs, 6);
});

test("every playable question has one answer, distinct choices and a solvable age-scaled prompt", () => {
  for (const months of [24, 35, 36, 47, 48, 59, 60, 72, 120]) {
    for (const game of GAMES.filter((g) => months >= g.min && g.id !== "pairs")) {
      for (let round = 0; round < gameLevel(months).rounds; round++) {
        const q = gameQuestion(game.id, months, round);
        assert(q.choices.includes(q.answer));
        assert.equal(new Set(q.choices).size, q.choices.length);
        assert(q.choices.length >= 2 && q.choices.length <= 4);
        assert(q.sequence.every((s) => s >= 0 && s < gameLevel(months).choices));
        if (game.id === "counting")
          assert(q.answer >= 1 && q.answer <= gameLevel(months).countTo);
      }
    }
  }
  assert(
    gameQuestion("patterns", 60, 0).sequence.length >
      gameQuestion("patterns", 36, 0).sequence.length,
  );
  assert.equal(
    Math.max(
      ...Array.from({ length: 5 }, (_, r) => gameQuestion("counting", 72, r).answer),
    ),
    8,
  );
});

test("picture decks always contain exactly two of each supported picture", () => {
  for (const pairs of [2, 4, 6])
    for (let run = 0; run < 10; run++) {
      const deck = pictureDeck(pairs);
      assert.equal(deck.length, pairs * 2);
      for (let picture = 0; picture < pairs; picture++)
        assert.equal(deck.filter((v) => v === picture).length, 2);
      assert(deck.every((v) => v >= 0 && v < PICTURE_NAMES.length));
    }
});

test("all activity catalogue content is available in Malayalam", () => {
  const copy = [
    ...GAMES.flatMap((g) => [g.title, g.description]),
    ...PLAY.flatMap((p) => [p.title, p.description, ...p.steps]),
    ...PICTURE_NAMES,
  ];
  for (const text of copy) assert.notEqual(translate(text, "ml"), text, text);
});
