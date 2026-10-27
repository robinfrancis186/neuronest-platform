import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright";
import { respond } from "./responsive-fixtures.mjs";
import {
  COLOUR_NAMES,
  GAMES,
  gameLevel,
  gameQuestion,
  SHAPE_NAMES,
} from "../src/activities.ts";

// Browser plugin not available. The actual UI uses synthetic API rows for reproducible age scenarios.
const server = await createServer({
  define: { "import.meta.env.VITE_API_URL": JSON.stringify("http://127.0.0.1:8123") },
  server: { host: "127.0.0.1", port: 0 },
  logLevel: "error",
});
await server.listen();
const base = `http://127.0.0.1:${server.httpServer.address().port}`;
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch(
  existsSync(chrome) ? { executablePath: chrome } : {},
);
const output = "/tmp/neuronest-activities-v2";
await mkdir(output, { recursive: true });
const children = [
  { id: "c1", name: "Maya (synthetic)", date_of_birth: "2022-09-27", language: "en" },
  {
    id: "c2",
    name: "Toddler (synthetic)",
    date_of_birth: "2024-09-27",
    language: "en",
  },
  { id: "c3", name: "Baby (synthetic)", date_of_birth: "2026-05-27", language: "en" },
  {
    id: "c4",
    name: "Older child (synthetic)",
    date_of_birth: "2019-09-27",
    language: "en",
  },
];
try {
  for (const width of [280, 390, 820, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1250 } });
    const errors = [],
      writes = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.clock.setFixedTime(new Date("2026-10-27T06:00:00Z"));
    await page.route("**/v1/**", (r) => {
      if (r.request().method() !== "GET") writes.push(r.request().url());
      const path = new URL(r.request().url()).pathname;
      return r.fulfill({
        json:
          path === "/v1/children/"
            ? { count: children.length, results: children }
            : respond(path),
      });
    });
    await page.goto(`${base}/audit.html?view=activities&child=c1`);
    await page.getByText("Picked for 3–4 years", { exact: true }).waitFor();
    assert.equal(await page.title(), "NeuroNest responsive audit harness");
    assert.equal(await page.locator(".activity-card").count(), 6);
    assert.equal(await page.locator(".guided-activity").count(), 4);
    assert((await page.request.get(`${base}/activities/play-sprites-v2.png`)).ok());
    const fits = async () =>
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        `overflow at ${width}`,
      );
    await fits();
    if (width === 1440)
      await page.screenshot({ path: `${output}/desktop.png`, fullPage: true });
    for (const game of GAMES) {
      await page
        .getByRole("button", { name: `Play: ${game.title}`, exact: true })
        .click();
      assert(new URL(page.url()).pathname === `/activities/${game.id}`);
      assert.equal(await page.locator("#activity-title:focus").count(), 1);
      await fits();
      if (game.id === "sizes") {
        const small = await page.locator(".size-0 .size-ball-inner").boundingBox();
        const big = await page.locator(".size-1 .size-ball-inner").boundingBox();
        assert(
          small.width / big.width > 0.5 && small.width / big.width < 0.6,
          "size relation survives responsive scaling",
        );
        if (width === 1440)
          await page.screenshot({ path: `${output}/sizes.png`, fullPage: false });
      }
      if (game.id === "pairs") {
        const board = page.locator(".memory-board"),
          values = [];
        assert.equal(await board.getByRole("button").count(), 8);
        for (let i = 0; i < 8; i += 2) {
          if (!(await board.count())) break;
          await board.getByRole("button").nth(i).click();
          values[i] = (
            await board.getByRole("button").nth(i).getAttribute("aria-label")
          ).split(": ")[1];
          await board
            .getByRole("button")
            .nth(i + 1)
            .click();
          values[i + 1] = (await board.count())
            ? (
                await board
                  .getByRole("button")
                  .nth(i + 1)
                  .getAttribute("aria-label")
              ).split(": ")[1]
            : values[i];
          const clear = page.getByRole("button", {
            name: "Try another pair",
            exact: true,
          });
          if (await clear.isVisible()) {
            assert.equal(await board.locator("button:not(:disabled)").count(), 0);
            await clear.click();
          }
        }
        for (const value of new Set(values)) {
          if (!(await board.count())) break;
          const indices = values
            .map((v, i) => (v === value ? i : -1))
            .filter((i) => i >= 0);
          assert.equal(indices.length, 2);
          if (await board.getByRole("button").nth(indices[0]).isEnabled()) {
            await board.getByRole("button").nth(indices[0]).click();
            await board.getByRole("button").nth(indices[1]).click();
          }
        }
      } else {
        for (let round = 0; round < gameLevel(49).rounds; round++) {
          const q = gameQuestion(game.id, 49, round);
          const label = (v) =>
            game.id === "colours"
              ? COLOUR_NAMES[v]
              : game.id === "counting"
                ? String(v)
                : game.id === "sizes"
                  ? v === 0
                    ? "Small ball"
                    : "Big ball"
                  : SHAPE_NAMES[v];
          if (round === 0) {
            await page
              .locator(".shape-options")
              .getByRole("button", {
                name: label(q.choices.find((v) => v !== q.answer)),
                exact: true,
              })
              .click();
            await page
              .getByText("Have another look. You can try again.", { exact: true })
              .waitFor();
          }
          await page
            .locator(".shape-options")
            .getByRole("button", { name: label(q.answer), exact: true })
            .press("Enter");
          const next = page.getByRole("button", {
            name: round === 3 ? "Finish activity" : "Next round",
            exact: true,
          });
          assert(await next.evaluate((button) => button === document.activeElement));
          await next.press("Enter");
          if (round < 3)
            assert(
              await page
                .locator(".shape-prompt h3")
                .evaluate((heading) => heading === document.activeElement),
            );
        }
      }
      await page.getByText("You finished this activity!", { exact: true }).waitFor();
      await page.getByRole("button", { name: "Restart game", exact: true }).click();
      await page
        .getByText(game.id === "pairs" ? "Pairs found: 0 / 4" : "Round 1 / 4", {
          exact: true,
        })
        .waitFor();
      await page.getByRole("button", { name: "All activities", exact: true }).click();
    }
    await page
      .getByRole("button", { name: "Try together: Picture stories", exact: true })
      .click();
    assert.equal(await page.locator(".activity-steps li").count(), 3);
    await page.getByRole("button", { name: "All activities", exact: true }).click();
    await page.locator(".language-button").selectOption("ml");
    await page
      .getByRole("button", { name: "കളിക്കാം: നിറം കണ്ടെത്താം", exact: true })
      .click();
    await page.getByRole("button", { name: "ചുവപ്പ്", exact: true }).click();
    await page.getByText("കണ്ടെത്തി!", { exact: true }).waitFor();
    await fits();
    assert(
      await page
        .locator(".mobile-nav")
        .evaluate((bar) =>
          Array.from(bar.querySelectorAll("button > span")).every(
            (label) =>
              label.scrollWidth <= label.clientWidth + 1 &&
              label.getBoundingClientRect().height <=
                (parseFloat(getComputedStyle(label).lineHeight) || 14) * 1.6,
          ),
        ),
    );
    if (width === 390)
      await page.screenshot({
        path: `${output}/mobile-malayalam.png`,
        fullPage: false,
      });
    await page.locator(".language-button").selectOption("en");
    await page
      .getByRole("combobox", { name: "Select child profile", exact: true })
      .selectOption("c2");
    await page.getByText("Round 1 / 3", { exact: true }).waitFor();
    assert.equal(await page.locator(".shape-option").count(), 2);
    await page.getByRole("button", { name: "All activities", exact: true }).click();
    assert.equal(await page.locator(".activity-card").count(), 3);
    await page
      .getByRole("combobox", { name: "Select child profile", exact: true })
      .selectOption("c3");
    await page.getByText("Picked for 0–5 months", { exact: true }).waitFor();
    assert.equal(await page.locator(".activity-card").count(), 0);
    assert.equal(await page.locator(".guided-activity").count(), 3);
    if (width === 1440)
      await page.screenshot({ path: `${output}/baby.png`, fullPage: true });
    await page
      .getByRole("combobox", { name: "Select child profile", exact: true })
      .selectOption("c4");
    await page
      .getByRole("button", { name: "Play: Match the pairs", exact: true })
      .click();
    assert.equal(await page.locator(".memory-card").count(), 12);
    await page.getByRole("button", { name: "All activities", exact: true }).click();
    await page
      .getByRole("combobox", { name: "Select child profile", exact: true })
      .selectOption("c1");
    if (width === 1440) {
      await page.getByRole("button", { name: "Use dark theme", exact: true }).click();
      await page.screenshot({ path: `${output}/dark.png`, fullPage: true });
      await fits();
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(writes, []);
    await page.close();
    console.log(
      `PASS ${width}px: six games, retries, completion, restart, keyboard, Malayalam, age filtering/scaling and child reset; no writes/errors.`,
    );
  }
  const infant = await browser.newPage();
  await infant.clock.setFixedTime(new Date("2026-10-27T06:00:00Z"));
  await infant.route("**/v1/**", (r) =>
    r.fulfill({
      json:
        new URL(r.request().url()).pathname === "/v1/children/"
          ? { count: children.length, results: children }
          : respond(new URL(r.request().url()).pathname),
    }),
  );
  await infant.goto(`${base}/audit.html?view=activities&tab=shapes&child=c3`);
  await infant
    .getByRole("button", { name: "See age-matched play", exact: true })
    .waitFor();
  assert.equal(await infant.locator(".shape-options").count(), 0);
  await infant
    .getByRole("button", { name: "See age-matched play", exact: true })
    .click();
  await infant
    .getByRole("button", { name: "Try together: Faces and smiles", exact: true })
    .click();
  assert.equal(await infant.locator(".activity-steps li").count(), 3);
  console.log(
    "PASS infant deep link: no game controls; age-matched caregiver instructions work.",
  );
} finally {
  await browser.close();
  await server.close();
}
