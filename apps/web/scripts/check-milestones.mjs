import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, mkdir } from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright";
import { respond } from "./responsive-fixtures.mjs";

// Browser plugin not available. This checks real UI behavior with synthetic API responses.
const catalog = JSON.parse(
  await readFile(
    new URL("../../../services/core/api/milestone_catalog.json", import.meta.url),
    "utf8",
  ),
);
const band = catalog.bands.find((b) => b.months === 4);
const ageReference = JSON.parse(
  await readFile(
    new URL("../../../services/core/api/milestone_reference.json", import.meta.url),
    "utf8",
  ),
);
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
const out = "/tmp/neuronest-milestones";
await mkdir(out, { recursive: true });
try {
  for (const width of [280, 390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    await page.clock.setFixedTime(new Date("2026-10-25T12:00:00Z"));
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    const history = [];
    let aiCalled = false;
    let aiAttempts = 0;
    await page.route("**/v1/**", (r) => {
      const url = new URL(r.request().url());
      const path = url.pathname;
      if (path === "/v1/children/")
        return r.fulfill({
          json: {
            count: 2,
            next: null,
            results: [
              {
                id: "c1",
                name: "Aira (synthetic)",
                date_of_birth: "2026-05-25",
                language: "en",
              },
              {
                id: "c2",
                name: "Isha (synthetic)",
                date_of_birth: "2024-09-25",
                language: "en",
              },
            ],
          },
        });
      const selected = url.searchParams.get("child") || "c1";
      if (path.endsWith("/catalog/"))
        return r.fulfill({
          json: {
            version: catalog.version,
            age_months: selected === "c1" ? 5 : 25,
            band: selected === "c1" ? band : catalog.bands.find((b) => b.months === 24),
            notice: catalog.notice,
            ai_enabled: true,
          },
        });
      if (path.endsWith("/explain/")) {
        assert.equal(r.request().postDataJSON().consent, true);
        aiCalled = true;
        aiAttempts++;
        if (aiAttempts === 1)
          return r.fulfill({
            json: {
              status: "unavailable",
              detail:
                "The AI service is awaiting provider activation. Your saved summary is still available.",
            },
          });
        const explanation = {
          status: "generated",
          method: "openai_decisions_v1",
          model: "gpt-6-luna",
          decision: "some_not_yet",
          language: r.request().postDataJSON().language,
          answer:
            r.request().postDataJSON().language === "ml"
              ? "രേഖപ്പെടുത്തിയ കഴിവുകളും വളർന്നുവരുന്ന കഴിവുകളും ഡോക്ടറുമായി ചർച്ച ചെയ്യുക."
              : "You reported selected skills as observed and others as emerging or uncertain. Discuss these observations with your clinician.",
          notice:
            "AI-assisted checklist review for the project demo. This describes reported answers, not a validated screening result or diagnosis.",
          citations: [],
        };
        history[0].ai_explanation = explanation;
        return r.fulfill({ json: explanation });
      }
      if (path === "/v1/milestone-checkins/") {
        if (r.request().method() === "POST") {
          const body = r.request().postDataJSON();
          assert.equal(body.band_months, 4);
          assert.equal(body.catalog_version, catalog.version);
          assert.equal(Object.keys(body.answers).length, 6);
          assert.equal(body.skill_loss, true);
          const counts = Object.fromEntries(
            ["yes", "in_progress", "not_yet", "unsure"].map((a) => [
              a,
              Object.values(body.answers).filter((v) => v === a).length,
            ]),
          );
          const row = {
            ...body,
            id: "checkin-1",
            age_months: 5,
            created_at: "2026-10-25T12:00:00Z",
            ai_explanation: {},
            summary: {
              kind: "parent_observation_summary",
              counts,
              follow_up_recommended: true,
              source_url: band.source_url,
              items: band.items.map((i) => ({ ...i, answer: body.answers[i.id] })),
              research_reference: {
                kind: ageReference.kind,
                version: ageReference.version,
                source: ageReference.source,
                covered_items: 2,
                total_items: 6,
                estimates: [
                  {
                    research_item: "ddicmd116",
                    label: ageReference.models.ddicmd116.label,
                    estimated_per_100: 80,
                    nearby_train_children: 794,
                  },
                  {
                    research_item: "ddigmd061",
                    label: ageReference.models.ddigmd061.label,
                    estimated_per_100: 70,
                    nearby_train_children: 648,
                  },
                ],
              },
            },
          };
          history.unshift(row);
          return r.fulfill({ status: 201, json: row });
        }
        const results = history.filter((row) => row.child === selected);
        return r.fulfill({ json: { count: results.length, next: null, results } });
      }
      return r.fulfill({ json: respond(path) });
    });
    const entry = `${base}/audit.html?view=milestones&child=c1`;
    await page.goto(entry);
    await page
      .getByRole("heading", { name: "Age-based developmental check-in" })
      .waitFor();
    assert.match(await page.title(), /NeuroNest/);
    assert.equal(new URL(page.url()).pathname, "/milestones");
    assert.equal(await page.locator(".checkin-age").count(), 0);
    await page
      .locator(".checkin-question")
      .first()
      .filter({ hasText: band.items[0].label.en })
      .waitFor();
    assert.equal(await page.locator(".checkin-question").count(), 8);
    assert.equal(await page.locator("vite-error-overlay").count(), 0);
    assert(await page.getByRole("button", { name: "Submit check-in" }).isDisabled());
    assert.equal(await page.locator("input[type=radio]:checked").count(), 0);
    await page.screenshot({ path: `${out}/questions-${width}.png`, fullPage: true });
    const values = ["Yes", "In progress", "Not yet", "Not sure", "Yes", "Yes"];
    for (let i = 0; i < 6; i++)
      await page
        .locator(".checkin-question")
        .nth(i)
        .getByLabel(values[i], { exact: true })
        .check();
    await page
      .locator(".checkin-question")
      .nth(6)
      .getByLabel("No", { exact: true })
      .check();
    assert(await page.getByRole("button", { name: "Submit check-in" }).isDisabled());
    await page
      .locator(".checkin-question")
      .nth(7)
      .getByLabel("Yes", { exact: true })
      .check();
    assert(
      await page
        .getByText(
          "Contact a qualified healthcare professional promptly about a lost skill. Do not wait for this check-in or an AI reply.",
          { exact: true },
        )
        .isVisible(),
    );
    await page.getByRole("button", { name: "Submit check-in" }).click();
    await page
      .getByRole("heading", { name: "Your developmental observations" })
      .waitFor();
    assert.equal(await page.locator(".checkin-response-list li").count(), 6);
    assert.equal(await page.locator(".checkin-research").getAttribute("open"), null);
    await page.getByText("Research age context", { exact: true }).click();
    assert(await page.getByText("Turns head to sound", { exact: true }).isVisible());
    assert(await page.getByText("About 80 in 100", { exact: true }).isVisible());
    assert.match(
      await page.locator(".checkin-research").innerText(),
      /not predictions about your child/,
    );
    assert.equal(
      await page.locator(".checkin-research a").getAttribute("href"),
      ageReference.source.url,
    );
    assert.equal(
      await page
        .locator(".checkin-counts dd")
        .allTextContents()
        .then((v) => v.join(",")),
      "3,1,1,1",
    );
    assert(
      await page
        .getByRole("heading", {
          name: "Discuss these observations with your clinician",
        })
        .isVisible(),
    );
    assert(
      await page
        .getByRole("heading", {
          name: "Would you like an AI review of your child’s milestone answers?",
          exact: true,
        })
        .isVisible(),
    );
    assert.equal(aiCalled, false);
    await page.getByRole("button", { name: "Not now", exact: true }).click();
    assert.equal(await page.locator(".checkin-ai-controls").count(), 0);
    assert.equal(aiAttempts, 0);
    await page
      .getByRole("button", { name: "Show AI review options", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Yes, show AI review", exact: true })
      .click();
    await page
      .getByText(
        "The AI service is awaiting provider activation. Your saved summary is still available.",
        { exact: true },
      )
      .waitFor();
    assert.equal(aiCalled, true);
    assert.equal(
      await page.getByRole("heading", { name: "AI review", exact: true }).count(),
      0,
    );
    await page.getByRole("button", { name: "Yes, show AI review" }).click();
    await page
      .getByRole("heading", { name: "Contact a clinician promptly", exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByText(
          "Only checklist questions and answers are shared with the AI service. Names and medical records are excluded.",
          { exact: true },
        )
        .count(),
      0,
    );
    assert.equal(await page.locator(".checkin-ai-controls").count(), 0);
    assert.equal(
      await page
        .getByRole("button", { name: "Yes, show AI review", exact: true })
        .count(),
      0,
    );
    assert.equal(
      await page
        .getByText(
          "AI-assisted checklist review for the project demo. This describes reported answers, not a validated screening result or diagnosis.",
          { exact: true },
        )
        .count(),
      0,
    );
    assert.doesNotMatch(
      await page.locator("body").innerText(),
      /OpenAI|gpt-\d|Gemini|Anthropic|Claude/i,
    );
    assert.equal(
      await page
        .getByText(
          "This is developmental monitoring, not a validated screening test or diagnosis. It cannot confirm typical development or predict a disorder.",
          { exact: true },
        )
        .count(),
      0,
    );
    assert(
      await page
        .getByRole("link", { name: "View age reference", exact: true })
        .isVisible(),
    );
    assert(await page.getByText("Disorder probability", { exact: true }).isVisible());
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${out}/summary-${width}.png`, fullPage: true });
    if (width === 1440)
      await page.screenshot({ path: `${out}/summary-preview.png`, fullPage: false });
    await page.goto(entry);
    await page.getByRole("button", { name: "View summary" }).click();
    await page
      .getByRole("heading", { name: "Your developmental observations" })
      .waitFor();
    await page
      .getByRole("heading", { name: "Contact a clinician promptly", exact: true })
      .waitFor();
    assert.equal(await page.locator(".checkin-ai-controls").count(), 0);
    const resultPanel = page.locator(".checkin-ai");
    assert.equal(
      await resultPanel.locator(".checkin-probability dd").innerText(),
      "Not estimated from milestone answers",
    );
    assert.doesNotMatch(
      await resultPanel.innerText(),
      /You reported selected skills|Reported as observed|\d+\s*%|AI review/,
    );
    assert.equal(
      await page
        .getByRole("heading", {
          name: "Discuss these observations with your clinician",
          exact: true,
        })
        .count(),
      0,
    );
    await page
      .getByRole("button", { name: "Book a doctor’s appointment", exact: true })
      .click();
    assert.equal(new URL(page.url()).pathname, "/care");
    assert.equal(new URL(page.url()).searchParams.get("child"), "c1");
    await page.getByRole("button", { name: "Milestones", exact: true }).first().click();
    await page.getByRole("button", { name: "View summary" }).click();
    await page
      .getByRole("heading", { name: "Contact a clinician promptly", exact: true })
      .waitFor();
    if (width === 390) {
      await page.locator(".language-button").selectOption("ml");
      assert(
        await page
          .getByText("ഗവേഷണത്തിലെ പ്രായസംബന്ധമായ വിവരങ്ങൾ", { exact: true })
          .isVisible(),
      );
      await page.locator(".checkin-ai-controls").waitFor({ state: "visible" });
      assert.equal(await page.locator(".checkin-ai").count(), 0);
      assert.equal(await page.locator(".language-button").inputValue(), "ml");
      assert.equal(await page.locator("html").getAttribute("lang"), "ml");
      await page
        .getByRole("button", { name: "അതെ, AI അവലോകനം കാണിക്കുക", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "വൈകാതെ ഡോക്ടറെ ബന്ധപ്പെടുക", exact: true })
        .waitFor();
      assert.match(
        await page.locator(".checkin-ai").innerText(),
        /മുമ്പുണ്ടായിരുന്ന ഒരു കഴിവ്/,
      );
      assert.doesNotMatch(
        await page.locator(".checkin-ai").innerText(),
        /You reported|Discuss these/,
      );
      await page.locator(".language-button").selectOption("en");
      assert.equal(await page.locator(".language-button").inputValue(), "en");
      await page
        .getByRole("button", { name: "Yes, show AI review", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "Contact a clinician promptly", exact: true })
        .waitFor();
      assert.equal(await page.locator(".checkin-ai-controls").count(), 0);
    }
    if (width === 1440) {
      const row = history[0];
      row.skill_loss = false;
      for (const state of ["mixed", "all-observed", "parent-concern"]) {
        row.parent_concern = state === "parent-concern";
        row.summary.follow_up_recommended = state !== "all-observed";
        if (state !== "mixed") {
          row.answers = Object.fromEntries(band.items.map((item) => [item.id, "yes"]));
          row.summary.items = band.items.map((item) => ({ ...item, answer: "yes" }));
          row.summary.counts = { yes: 6, in_progress: 0, not_yet: 0, unsure: 0 };
        }
        await page.goto(entry);
        await page.getByRole("button", { name: "View summary" }).click();
        await page
          .getByRole("heading", {
            name:
              state === "all-observed"
                ? "Continue regular developmental checks"
                : "Arrange a developmental review",
            exact: true,
          })
          .waitFor();
        assert.equal(
          await page.locator(".checkin-probability dd").innerText(),
          "Not estimated from milestone answers",
        );
        assert.doesNotMatch(
          await page.locator(".checkin-ai").innerText(),
          /\d+\s*%|normal/i,
        );
        await page.screenshot({
          path: `${out}/guidance-${state}.png`,
          fullPage: false,
        });
      }
    }
    await page
      .getByRole("combobox", { name: "Select child profile" })
      .selectOption("c2");
    await page
      .getByRole("heading", { name: "Age-based developmental check-in" })
      .waitFor();
    await page
      .locator(".checkin-question")
      .first()
      .filter({ hasText: catalog.bands.find((b) => b.months === 24).items[0].label.en })
      .waitFor();
    assert.equal(await page.locator("input[type=radio]:checked").count(), 0);
    assert.equal(
      await page
        .getByRole("heading", { name: "Your developmental observations" })
        .count(),
      0,
    );
    assert(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    );
    assert.equal(await page.getByRole("button", { name: "View summary" }).count(), 0);
    assert.deepEqual(errors, []);
    await page.close();
    console.log(
      `PASS ${width}px: five-month/four-month mapping, completion, mixed answers, skill-loss escalation, saved history, explicit AI consent, provider activation error, generated explanation, child isolation, console and layout`,
    );
  }
  for (const state of [
    "catalog-error",
    "unsupported-age",
    "malayalam",
    "doctor",
    "save-error",
  ]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 1000 } });
    await page.route("**/v1/**", (r) => {
      const path = new URL(r.request().url()).pathname;
      if (path.endsWith("/catalog/"))
        return state === "catalog-error"
          ? r.fulfill({ status: 503, json: { detail: "Could not load checklist." } })
          : r.fulfill({
              json: {
                version: catalog.version,
                age_months: state === "unsupported-age" ? 1 : 5,
                band: state === "unsupported-age" ? null : band,
                notice: catalog.notice,
                ai_enabled: false,
              },
            });
      if (path === "/v1/milestone-checkins/" && r.request().method() === "POST")
        return r.fulfill({ status: 503, json: { detail: "Unable to save check-in." } });
      return r.fulfill({ json: respond(path) });
    });
    await page.goto(
      `${base}/audit.html?view=milestones&child=c1&role=${state === "doctor" ? "doctor" : "parent"}&lang=${state === "malayalam" ? "ml" : "en"}`,
    );
    if (state === "catalog-error") {
      await page.getByRole("button", { name: "Reload checklist" }).waitFor();
      assert.equal(await page.locator(".checkin-question").count(), 0);
    } else if (state === "unsupported-age") {
      await page.getByText(/These checklists cover ages 2 to 71/).waitFor();
      assert.equal(await page.locator(".checkin-question").count(), 0);
    } else if (state === "malayalam") {
      await page
        .getByRole("heading", { name: "പ്രായത്തിനനുസരിച്ചുള്ള വികാസ രേഖപ്പെടുത്തൽ" })
        .waitFor();
      assert(
        await page
          .locator("legend")
          .filter({ hasText: band.items[0].label.ml })
          .isVisible(),
      );
    } else if (state === "doctor") {
      await page
        .getByText(
          "Parents complete this check-in. Authorized care professionals can review saved responses below.",
        )
        .waitFor();
      assert.equal(await page.locator("input[type=radio]").count(), 0);
    } else {
      await page.locator(".checkin-question").last().waitFor();
      for (let i = 0; i < 6; i++)
        await page
          .locator(".checkin-question")
          .nth(i)
          .getByLabel("Yes", { exact: true })
          .check();
      for (let i = 6; i < 8; i++)
        await page
          .locator(".checkin-question")
          .nth(i)
          .getByLabel("No", { exact: true })
          .check();
      await page.getByRole("button", { name: "Submit check-in" }).click();
      await page
        .getByRole("alert")
        .filter({ hasText: "Unable to save check-in." })
        .waitFor();
      assert.equal(await page.locator("input[type=radio]:checked").count(), 8);
      assert.equal(
        await page
          .getByRole("heading", { name: "Your developmental observations" })
          .count(),
        0,
      );
    }
    await page.close();
    console.log(`PASS ${state}`);
  }
} finally {
  await browser.close();
  await server.close();
}
