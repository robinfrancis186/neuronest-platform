import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright";
import { respond } from "./responsive-fixtures.mjs";
// Browser plugin not available; use the existing synthetic workspace harness.
const server = await createServer({
  define: { "import.meta.env.VITE_API_URL": JSON.stringify("http://127.0.0.1:8123") },
  server: { port: 0, host: "127.0.0.1" },
  logLevel: "error",
});
await server.listen();
const base = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const out = "/tmp/neuronest-home";
await mkdir(out, { recursive: true });
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (["error", "warning"].includes(m.type())) errors.push(m.text());
    });
    await page.route("**/v1/**", (r) => {
      const path = new URL(r.request().url()).pathname;
      const data = structuredClone(respond(path));
      if (path === "/v1/appointments/")
        data.results.push({
          ...data.results[0],
          id: "future",
          starts_at: new Date(Date.now() + 86400000).toISOString(),
        });
      return r.fulfill({ json: data });
    });
    await page.goto(`${base}/audit.html?view=journey&child=c1`);
    await page.locator(".home-note").first().waitFor();
    assert.match(await page.title(), /NeuroNest/);
    assert.equal(new URL(page.url()).pathname, "/today");
    assert.equal(await page.locator(".home-dashboard > section").count(), 3);
    assert.equal(await page.locator(".home-note").count(), 3);
    assert.equal(
      await page.locator(".home-note h3").first().textContent(),
      "Little moment 8",
    );
    assert.equal(await page.locator("main img, vite-error-overlay").count(), 0);
    assert.equal(await page.getByText("Today & Journey", { exact: true }).count(), 0);
    assert(
      await page.getByRole("button", { name: "Home", exact: true }).last().isVisible(),
    );
    assert(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    );
    await page.screenshot({ path: `${out}/home-${width}.png`, fullPage: true });
    await page.getByRole("button", { name: "Add observation", exact: true }).click();
    await page.getByRole("dialog").waitFor();
    assert(
      await page
        .getByRole("textbox", { name: "What happened or changed?" })
        .isVisible(),
    );
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "View all", exact: true }).click();
    await page
      .getByRole("heading", { name: "What have you noticed?", exact: true })
      .waitFor();
    assert.equal(await page.locator(".observation-card").count(), 8);
    for (const name of ["Developmental screening", "Therapy & home practice"])
      assert(await page.getByRole("heading", { name, exact: true }).isVisible());
    assert.equal(new URL(page.url()).pathname, "/today/observations");
    assert.equal(new URL(page.url()).searchParams.get("child"), "c1");
    await page.getByRole("button", { name: "Back to Home", exact: true }).click();
    await page.locator(".home-note").first().waitFor();
    await page.getByRole("button", { name: "View appointment", exact: true }).click();
    assert.equal(new URL(page.url()).pathname, "/care/appointments");
    assert.deepEqual(errors, []);
    await page.close();
    console.log(
      `PASS Home: three sections, recent order, observation form, history, care navigation, console and layout at ${width}px`,
    );
  }
  for (const state of ["empty", "error", "new-family", "malayalam", "dark"]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 1000 } });
    await page.route("**/v1/**", (r) => {
      const path = new URL(r.request().url()).pathname;
      if (state === "error" && path === "/v1/observations/")
        return r.fulfill({
          status: 500,
          json: { detail: "Unable to load observations." },
        });
      const empty =
        (state === "empty" &&
          ["/v1/observations/", "/v1/appointments/"].includes(path)) ||
        (state === "new-family" && path === "/v1/children/");
      return r.fulfill({
        json: empty ? { count: 0, next: null, results: [] } : respond(path),
      });
    });
    await page.goto(
      `${base}/audit.html?view=today&child=c1&lang=${state === "malayalam" ? "ml" : "en"}&theme=${state === "dark" ? "dark" : "light"}`,
    );
    if (state === "empty") {
      await page
        .getByText("No observations yet. Your notes will appear here.", { exact: true })
        .waitFor();
      assert(
        await page.getByText("No upcoming appointments.", { exact: true }).isVisible(),
      );
      await page
        .getByRole("button", { name: "Find your care team", exact: true })
        .click();
      assert.equal(new URL(page.url()).pathname, "/care");
    } else if (state === "error") {
      await page.locator(".home-notes [role=alert]").waitFor();
      assert.equal(
        await page
          .getByText("No observations yet. Your notes will appear here.", {
            exact: true,
          })
          .count(),
        0,
      );
    } else if (state === "new-family") {
      await page.getByRole("button", { name: "Create a child profile" }).click();
      await page.getByRole("dialog").waitFor();
      assert(await page.getByRole("textbox", { name: "Child’s name" }).isVisible());
    } else if (state === "malayalam") {
      await page.getByRole("heading", { name: "സമീപകാല കുറിപ്പുകൾ" }).waitFor();
      assert(
        await page.getByRole("button", { name: "ഹോം", exact: true }).last().isVisible(),
      );
    } else {
      await page.locator(".home-note").first().waitFor();
      await page.screenshot({ path: `${out}/home-dark-390.png`, fullPage: true });
    }
    await page.close();
    console.log(`PASS Home state: ${state}`);
  }
} finally {
  await browser.close();
  await server.close();
}
