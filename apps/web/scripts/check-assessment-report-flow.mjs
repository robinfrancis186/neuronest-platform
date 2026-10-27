import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createServer } from "vite";
import { chromium } from "playwright";
import { respond } from "./responsive-fixtures.mjs";

// Browser plugin not available. Real components, synthetic API responses.
const server = await createServer({
  define: { "import.meta.env.VITE_API_URL": JSON.stringify("http://127.0.0.1:8123") },
  server: { port: 0, host: "127.0.0.1" },
  logLevel: "error",
});
await server.listen();
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch(
  existsSync(chrome) ? { executablePath: chrome } : {},
);
const base = `http://127.0.0.1:${server.httpServer.address().port}`;
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    await page.clock.setFixedTime(new Date("2026-10-26T12:00:00Z"));
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const questionnaires = [];
    const checkins = [
      {
        id: "milestone-new",
        child: "c1",
        created_at: "2026-10-25T12:00:00Z",
        age_months: 5,
        summary: { counts: { yes: 2, in_progress: 2, not_yet: 1, unsure: 1 } },
      },
      {
        id: "milestone-old",
        child: "c1",
        created_at: "2026-07-01T12:00:00Z",
        age_months: 2,
        summary: { counts: { yes: 6, in_progress: 0, not_yet: 0, unsure: 0 } },
      },
      {
        id: "foreign",
        child: "c2",
        created_at: "2026-10-25T12:00:00Z",
        age_months: 999,
        summary: { counts: { yes: 999 } },
      },
    ];
    await page.route("**/v1/**", (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/v1/children/")
        return route.fulfill({
          json: {
            count: 2,
            next: null,
            results: [
              {
                id: "c1",
                name: "Synthetic infant",
                date_of_birth: "2026-05-26",
                language: "en",
              },
              {
                id: "c2",
                name: "Synthetic toddler",
                date_of_birth: "2024-09-26",
                language: "en",
              },
            ],
          },
        });
      if (path === "/v1/parent-questionnaires/") {
        if (route.request().method() === "POST") {
          const body = route.request().postDataJSON();
          assert.equal(body.child, "c1");
          assert.equal(Object.keys(body.answers).length, 6);
          const row = {
            ...body,
            id: "questionnaire-new",
            created_at: "2026-10-26T12:00:00Z",
          };
          questionnaires.push(row);
          return route.fulfill({ status: 201, json: row });
        }
        return route.fulfill({
          json: { count: questionnaires.length, next: null, results: questionnaires },
        });
      }
      // Deliberately include foreign rows: the report must also scope defensively.
      if (path === "/v1/milestone-checkins/")
        return route.fulfill({
          json: { count: checkins.length, next: null, results: checkins },
        });
      return route.fulfill({ json: respond(path) });
    });
    await page.goto(`${base}/audit.html?view=assessments&child=c1`);
    await page.getByRole("button", { name: "Next", exact: true }).waitFor();
    assert(await page.getByRole("button", { name: "Next", exact: true }).isDisabled());
    for (let step = 0; step < 6; step++) {
      await page.getByRole("radio", { name: "Often", exact: true }).check();
      await page
        .getByRole("button", {
          name: step === 5 ? "Save check-in" : "Next",
          exact: true,
        })
        .click();
    }
    await page.getByRole("heading", { name: "Your reflections are saved." }).waitFor();
    await page.getByRole("button", { name: "View report", exact: true }).click();
    const report = page.locator("section.reports-card").filter({
      has: page.getByRole("heading", { name: "Saved developmental check-ins" }),
    });
    await report
      .getByText("Yes: 2 · In progress: 2 · Not yet: 1 · Not sure: 1", { exact: true })
      .waitFor();
    assert.equal(
      await report
        .locator(".reports-growth-values dd")
        .allTextContents()
        .then((a) => a.join(",")),
      "1,1",
    );
    assert.doesNotMatch(await report.innerText(), /999/);
    await page.getByRole("tab", { name: "All recorded", exact: true }).click();
    assert.equal(await report.locator(".reports-checkin-list li").count(), 2);
    await report.getByRole("button", { name: "Review parent questionnaires" }).click();
    await page.getByText("Previous parent questionnaires", { exact: true }).waitFor();
    assert.equal(questionnaires.length, 1);
    if (!(await page.getByRole("button", { name: "Reports", exact: true }).isVisible()))
      await page.getByRole("button", { name: "More", exact: true }).click();
    await page.getByRole("button", { name: "Reports", exact: true }).click();
    await page
      .getByRole("combobox", { name: "Select child profile" })
      .selectOption("c2");
    await page.getByRole("heading", { name: "Synthetic toddler’s report" }).waitFor();
    assert.doesNotMatch(await report.innerText(), /Yes: 2 · In progress: 2/);
    assert.equal(errors.length, 0, errors.join("\n"));
    assert.equal(await page.locator("vite-error-overlay").count(), 0);
    assert(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    );
    await page.close();
    console.log(
      `PASS ${width}px: six-step assessment -> saved record -> report, period filter, history and child isolation`,
    );
  }
} finally {
  await browser.close();
  await server.close();
}
