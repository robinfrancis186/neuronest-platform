import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
import { createServer } from "vite";
import { chromium } from "playwright";
import { respond } from "./responsive-fixtures.mjs";
const graph = JSON.parse(
  readFileSync(
    new URL("../../../services/core/api/app_guide.json", import.meta.url),
    "utf8",
  ),
);
const guide = (lang) => ({
  destinations: graph.destinations
    .filter((d) => d.view !== "operations")
    .map((d) => ({ ...d, label: d.label[lang], description: d.description[lang] })),
});
const server = await createServer({
  define: { "import.meta.env.VITE_API_URL": JSON.stringify("http://127.0.0.1:8123") },
  server: { port: 0 },
  logLevel: "error",
});
await server.listen();
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch(
  existsSync(chrome) ? { executablePath: chrome } : {},
);
const out = "/tmp/neuronest-assistant-activities";
await mkdir(out, { recursive: true });
const dob = (months) => {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth() - months, 1))
    .toISOString()
    .slice(0, 10);
};
const prompt = (lang) =>
  lang === "ml"
    ? "എന്റെ കുട്ടിക്ക് അനുയോജ്യമായ കളികൾ നിർദ്ദേശിക്കൂ"
    : "Suggest activities for my child";
try {
  for (const scenario of [
    {
      name: "cognitive",
      months: 40,
      width: 1440,
      domain: "cognitive",
      expected: "patterns",
    },
    {
      name: "communication",
      months: 24,
      width: 390,
      domain: "communication",
      expected: "stories",
    },
    {
      name: "malayalam",
      months: 40,
      width: 390,
      lang: "ml",
      domain: "cognitive",
      expected: "patterns",
    },
    {
      name: "infant",
      months: 5,
      width: 390,
      domain: "communication",
      expected: "sounds",
    },
    { name: "missing", months: 60, width: 280, missing: true },
    { name: "unavailable", months: 40, width: 390, unavailable: true },
    { name: "skill-loss", months: 40, width: 390, lost: true },
  ]) {
    const lang = scenario.lang || "en";
    const page = await browser.newPage({
      viewport: { width: scenario.width, height: 844 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let assistantPosts = 0,
      checkinGets = 0;
    await page.route("**/v1/**", async (route) => {
      const request = route.request(),
        url = new URL(request.url());
      if (url.pathname === "/v1/assistant-guide/")
        return route.fulfill({ json: guide(lang) });
      if (url.pathname === "/v1/children/")
        return route.fulfill({
          json: {
            count: 2,
            next: null,
            results: [
              {
                id: "c1",
                name: "Demo Child — Synthetic",
                date_of_birth: dob(scenario.months),
                language: lang,
              },
              {
                id: "c2",
                name: "Other Synthetic Child",
                date_of_birth: dob(5),
                language: lang,
              },
            ],
          },
        });
      if (url.pathname === "/v1/milestone-checkins/") {
        checkinGets++;
        assert.equal(url.searchParams.get("child"), "c1");
        if (scenario.unavailable)
          return route.fulfill({ status: 503, json: { detail: "Unavailable" } });
        return route.fulfill({
          json: {
            count: scenario.missing ? 0 : 1,
            next: null,
            results: scenario.missing
              ? []
              : [
                  {
                    id: "checkin1",
                    child: "c1",
                    age_months: scenario.months,
                    created_at: new Date().toISOString(),
                    skill_loss: !!scenario.lost,
                    parent_concern: false,
                    summary: {
                      items: [
                        {
                          id: "a",
                          domain: scenario.domain || "cognitive",
                          answer: "not_yet",
                          label: {
                            en: "A saved developmental answer",
                            ml: "സൂക്ഷിച്ച വളർച്ചാ ഉത്തരം",
                          },
                        },
                      ],
                    },
                  },
                ],
          },
        });
      }
      if (request.method() === "POST") {
        assert.equal(
          url.pathname,
          "/v1/assistant/",
          "No clinical, booking or payment writes",
        );
        const body = request.postDataJSON();
        assert.deepEqual(Object.keys(body).sort(), [
          "app_help",
          "include_records",
          "language",
          "message",
        ]);
        assert.equal(body.include_records, false);
        assistantPosts++;
        return route.fulfill({
          json: {
            answer: "Open activities",
            actions: ["activities"],
            status: "navigation",
            escalation: "none",
          },
        });
      }
      return route.fulfill({ json: respond(url.pathname) });
    });
    await page.goto(
      `http://localhost:${server.httpServer.address().port}/audit.html?view=activities&child=c1&lang=${lang}&theme=light`,
    );
    assert.match(await page.title(), /NeuroNest/);
    await page.locator(".assistant-launcher").click();
    const dialog = page.locator("#assistant-dialog");
    await dialog.getByRole("button", { name: prompt(lang), exact: true }).click();
    await dialog.locator(".chat-message.assistant").waitFor();
    assert.equal(
      assistantPosts,
      0,
      "Quick recommendations never send saved answers or a chat request externally",
    );
    assert.equal(checkinGets, 1);
    const cards = dialog.locator(".assistant-result-actions button");
    const text = await dialog.locator(".chat-message.assistant").innerText();
    if (scenario.lost) {
      assert.match(text, /lost skill/);
      assert.equal(await cards.count(), 2);
    } else {
      assert((await cards.count()) >= 3);
      if (scenario.missing) assert.match(text, /age only/);
      else if (scenario.unavailable) assert.match(text, /couldn’t load/);
      else
        assert.match(
          text,
          lang === "ml" ? /സൂക്ഷിച്ച വളർച്ചാ ഉത്തരം/ : /A saved developmental answer/,
        );
    }
    assert(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1));
    await page.screenshot({ path: `${out}/${scenario.name}.png` });
    if (scenario.expected) {
      await cards.first().click();
      await dialog.waitFor({ state: "hidden" });
      await page.waitForURL(new RegExp(`/activities/${scenario.expected}\\?child=c1$`));
      await page.locator("#activity-title").waitFor();
      assert.equal(await page.locator(".assistant-dialog[open]").count(), 0);
    }
    assert.deepEqual(errors, []);
    console.log(
      `PASS ${scenario.name}: saved-answer basis, age-safe direct links, privacy and layout at ${scenario.width}px`,
    );
    await page.close();
  }
  // Typed activity requests retain the existing server safety gate before reading saved answers.
  for (const urgent of [false, true]) {
    const page = await browser.newPage({ viewport: { width: 825, height: 700 } });
    let reads = 0;
    await page.route("**/v1/**", (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/v1/assistant-guide/")
        return route.fulfill({ json: guide("en") });
      if (url.pathname === "/v1/assistant/")
        return route.fulfill({
          json: {
            answer: urgent ? "Urgent care response" : "Open activities",
            status: urgent ? "safety_response" : "navigation",
            escalation: urgent ? "urgent" : "none",
            actions: urgent ? [] : ["activities"],
          },
        });
      if (url.pathname === "/v1/milestone-checkins/") {
        reads++;
        return route.fulfill({ json: { count: 0, next: null, results: [] } });
      }
      return route.fulfill({ json: respond(url.pathname) });
    });
    await page.goto(
      `http://localhost:${server.httpServer.address().port}/audit.html?view=activities&child=c1`,
    );
    await page.locator(".assistant-launcher").click();
    await page
      .locator("#chat-message")
      .fill(
        urgent
          ? "My child cannot breathe, what game can we play?"
          : "What games can my child play?",
      );
    await page.locator("#chat-message").press("Enter");
    await page.locator(".chat-message.assistant").waitFor();
    assert.equal(reads, urgent ? 0 : 1);
    if (urgent)
      assert.match(
        await page.locator(".chat-message.assistant").innerText(),
        /Urgent care response/,
      );
    else
      assert.equal(await page.locator(".assistant-result-actions button").count(), 4);
    console.log(
      `PASS typed ${urgent ? "urgent safety priority" : "personalized activity request"}`,
    );
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 825, height: 700 } });
  let releaseCheckin;
  await page.route("**/v1/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/v1/assistant-guide/")
      return route.fulfill({ json: guide("en") });
    if (url.pathname === "/v1/milestone-checkins/") {
      await new Promise((resolve) => {
        releaseCheckin = resolve;
      });
      return route.fulfill({ json: { count: 0, next: null, results: [] } });
    }
    return route.fulfill({ json: respond(url.pathname) });
  });
  await page.goto(
    `http://localhost:${server.httpServer.address().port}/audit.html?view=activities&child=c1`,
  );
  await page.locator(".assistant-launcher").click();
  await page.getByRole("button", { name: prompt("en"), exact: true }).click();
  await page.locator(".nest-pending").waitFor();
  await page.keyboard.press("Escape");
  await page
    .getByRole("combobox", { name: "Select child profile", exact: true })
    .selectOption("c2");
  await page.waitForURL(/child=c2/);
  releaseCheckin();
  await page.locator(".assistant-launcher").click();
  await page.getByRole("button", { name: prompt("en"), exact: true }).waitFor();
  assert.equal(await page.locator(".chat-message").count(), 0);
  await page.close();
  console.log("PASS late recommendation isolation after child switch");
} finally {
  await browser.close();
  await server.close();
}
