import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createServer } from "vite";
import { chromium } from "playwright";
import { respond } from "./responsive-fixtures.mjs";
const graph = JSON.parse(
  await readFile(
    new URL("../../../services/core/api/app_guide.json", import.meta.url),
    "utf8",
  ),
);
const guide = (language) => ({
  destinations: graph.destinations
    .filter((d) => d.view !== "operations")
    .map((d) => ({
      id: d.id,
      view: d.view,
      tab: d.tab,
      label: d.label[language],
      description: d.description[language],
    })),
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
const out = "/tmp/neuronest-assistant-guide-checks";
await mkdir(out, { recursive: true });
try {
  for (const [width, height, lang, theme] of [
    [280, 640, "en", "light"],
    [390, 844, "en", "light"],
    [825, 700, "en", "light"],
    [1440, 900, "en", "light"],
    [740, 400, "en", "light"],
    [390, 844, "ml", "dark"],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let posts = 0,
      directoryRequests = 0;
    await page.route("**/v1/**", async (route) => {
      const request = route.request(),
        url = new URL(request.url());
      if (url.pathname === "/v1/assistant-guide/") {
        directoryRequests++;
        return route.fulfill({ json: guide(url.searchParams.get("language") || "en") });
      }
      if (request.method() === "POST") {
        assert.equal(
          url.pathname,
          "/v1/assistant/",
          "No record, booking or payment writes",
        );
        const payload = request.postDataJSON();
        assert.deepEqual(Object.keys(payload).sort(), [
          "app_help",
          "include_records",
          "language",
          "message",
        ]);
        assert.equal(payload.app_help, true);
        assert.equal(payload.include_records, false);
        posts++;
        await new Promise((resolve) => setTimeout(resolve, 200));
        return route.fulfill({
          json: {
            answer: "Open uploaded files to add your report.",
            actions: ["files", "https://evil.invalid", "operations"],
            citations: [],
          },
        });
      }
      return route.fulfill({ json: respond(url.pathname) });
    });
    await page.goto(
      `http://localhost:${server.httpServer.address().port}/audit.html?view=care&child=c1&lang=${lang}&theme=${theme}`,
    );
    const launcher = page.locator(".assistant-launcher");
    await launcher.waitFor({ state: "visible" });
    assert.equal(directoryRequests, 0);
    await launcher.click();
    const dialog = page.locator("#assistant-dialog");
    await dialog.waitFor({ state: "visible" });
    await dialog.locator(".assistant-shortcuts button").first().waitFor();
    assert.equal(await dialog.locator(".assistant-shortcuts button").count(), 4);
    assert.equal(
      await dialog.locator("textarea").evaluate((el) => el === document.activeElement),
      true,
    );
    const send = dialog.locator(".chat-composer button");
    assert(await send.isDisabled());
    assert(
      await dialog.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return (
          r.left >= 0 &&
          r.top >= 0 &&
          r.right <= innerWidth + 1 &&
          r.bottom <= innerHeight + 1 &&
          el.scrollWidth <= el.clientWidth
        );
      }),
      `Overflow ${width}x${height}`,
    );
    for (const selector of ["textarea", ".assistant-close", ".chat-composer button"]) {
      const r = await dialog.locator(selector).boundingBox();
      assert(
        r && r.y >= 0 && r.y + r.height <= height + 1 && r.x + r.width <= width + 1,
        selector,
      );
    }
    await dialog.screenshot({ path: `${out}/welcome-${width}-${lang}.png` });
    await dialog.locator(".assistant-browse").click();
    assert.equal(await dialog.locator(".assistant-directory-list button").count(), 21);
    assert(
      !/Operations|OpenAI|gpt-/i.test(
        await dialog.locator(".assistant-directory-list").innerText(),
      ),
    );
    await dialog.locator(".assistant-directory > button").click();
    await dialog
      .locator(".assistant-shortcuts button")
      .filter({ hasText: lang === "ml" ? "ഡോക്ടറെ" : "Find a doctor" })
      .click();
    await dialog.waitFor({ state: "hidden" });
    await page.waitForURL(/\/care\/specialists\?child=c1$/);
    assert.equal(
      await page
        .locator("#main-content")
        .evaluate((el) => el === document.activeElement),
      true,
    );
    await launcher.click();
    await dialog.waitFor({ state: "visible" });
    const field = dialog.locator("textarea");
    await field.fill("Where can I upload a medical report?");
    await field.press("Shift+Enter");
    assert((await field.inputValue()).includes("\n"));
    assert.equal(posts, 0);
    await field.press("Enter");
    await dialog.locator(".nest-pending").waitFor({ state: "visible" });
    await dialog
      .locator(".assistant-result-actions button")
      .waitFor({ state: "visible" });
    assert.equal(posts, 1);
    assert.equal(await dialog.locator(".assistant-result-actions button").count(), 1);
    assert.match(page.url(), /care\/specialists/);
    await dialog.screenshot({ path: `${out}/conversation-${width}-${lang}.png` });
    await dialog.locator(".assistant-result-actions button").click();
    await dialog.waitFor({ state: "hidden" });
    await page.waitForURL(/\/records\/files\?child=c1$/);
    await page.locator('#main-content[aria-busy="true"]').waitFor({ state: "hidden" });
    assert(
      await page.locator("#records-files").evaluate((el) => {
        const r = el.getBoundingClientRect();
        return r.top >= 0 && r.top < innerHeight - 100;
      }),
      "Opening a destination must keep its section in view after focus moves",
    );
    await launcher.click();
    await dialog.waitFor({ state: "visible" });
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    assert.equal(await launcher.evaluate((el) => el === document.activeElement), true);
    assert.deepEqual(errors, []);
    console.log(
      `PASS ${width}x${height} ${lang}/${theme}: directory, Enter, buttons, child context, focus, close and fit`,
    );
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
  let attempts = 0,
    resolveReply;
  await page.route("**/v1/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/v1/assistant-guide/") {
      if (++attempts === 1)
        return route.fulfill({ status: 503, json: { detail: "Temporary outage" } });
      return route.fulfill({ json: guide("en") });
    }
    if (url.pathname === "/v1/assistant/") {
      await new Promise((resolve) => (resolveReply = resolve));
      return route.fulfill({
        json: { answer: "STALE CHILD REPLY", actions: ["files"] },
      });
    }
    return route.fulfill({ json: respond(url.pathname) });
  });
  await page.goto(
    `http://localhost:${server.httpServer.address().port}/audit.html?view=today&child=c1`,
  );
  await page.locator(".assistant-launcher").click();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page.locator(".assistant-shortcuts button").first().waitFor();
  await page.locator("#chat-message").fill("Upload a report");
  await page.locator("#chat-message").press("Enter");
  await page.locator(".nest-pending").waitFor();
  await page.keyboard.press("Escape");
  await page
    .locator("select")
    .filter({ has: page.locator('option[value="c2"]') })
    .selectOption("c2");
  await page.waitForURL(/child=c2/);
  resolveReply();
  await page.locator(".assistant-launcher").click();
  await page.locator(".assistant-shortcuts button").first().waitFor();
  assert.equal(await page.getByText("STALE CHILD REPLY").count(), 0);
  assert.equal(await page.locator(".chat-message").count(), 0);
  await page.close();
  console.log("PASS directory retry and late reply isolation after child switch");
} finally {
  await browser.close();
  await server.close();
}
