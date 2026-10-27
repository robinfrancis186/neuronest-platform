import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createServer } from "vite";
import { chromium } from "playwright";
import { respond } from "./responsive-fixtures.mjs";

// Real Care components, synthetic services; no payment or medical session is performed.
const server = await createServer({
  define: { "import.meta.env.VITE_API_URL": JSON.stringify("http://127.0.0.1:8123") },
  server: { host: "127.0.0.1", port: 0 },
  logLevel: "error",
});
await server.listen();
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch(
  existsSync(chrome) ? { executablePath: chrome } : {},
);
const out = "/tmp/neuronest-care";
await mkdir(out, { recursive: true });
try {
  for (const width of [280, 390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    await page.clock.setFixedTime(new Date("2026-09-09T08:00:00Z"));
    const errors = [];
    let joins = 0;
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.route("**/v1/**", (r) => {
      const path = new URL(r.request().url()).pathname;
      let data = structuredClone(respond(path));
      if (path === "/v1/readiness/")
        data = {
          capabilities: {
            payments: { ready: true, mode: "sandbox" },
            video: { ready: true },
          },
        };
      if (path === "/v1/practitioners/") {
        data.results = data.results.map((p) => ({ ...p, user: "doctor-user" }));
        data.results.push({
          ...data.results[0],
          id: "demo-only",
          user: "demo-user",
          display_name: "Demo Doctor 1 — test only",
        });
      }
      if (path === "/v1/appointments/") {
        data.results = data.results.map((a) => ({
          ...a,
          consultation_mode: "online",
          clinic_address: "",
        }));
        data.results.push({
          ...data.results[0],
          id: "clinic",
          consultation_mode: "in_person",
          clinic_address: "Synthetic Clinic, Kochi",
          starts_at: "2026-09-12T10:30:00Z",
          ends_at: "2026-09-12T11:00:00Z",
        });
      }
      if (path === "/v1/slots/")
        data.results = data.results.map((s, i) => ({
          ...s,
          available: true,
          consultation_mode: i % 2 ? "in_person" : "online",
          clinic_address: i % 2 ? "Synthetic Clinic, Kochi" : "",
        }));
      if (path.endsWith("/join/")) {
        joins++;
        data = { detail: "Synthetic video service unavailable; appointment retained." };
      }
      return r.fulfill({ json: data });
    });
    await page.goto(
      `http://127.0.0.1:${server.httpServer.address().port}/audit.html?view=care&child=c1`,
    );
    await page
      .getByRole("heading", { name: "Doctor appointments", exact: true })
      .waitFor();
    await page.locator(".appointment-row").last().waitFor();
    assert.match(await page.title(), /NeuroNest/);
    assert.equal(new URL(page.url()).pathname, "/care");
    assert(await page.locator("#care-specialists").isVisible());
    for (const name of ["messages", "payments", "referrals"])
      assert.equal(await page.locator(`#care-${name}`).count(), 0);
    assert.equal(
      await page
        .getByRole("button", { name: "Join online visit", exact: true })
        .count(),
      1,
    );
    const featured = page.locator(".featured-specialist");
    await featured
      .getByRole("heading", { name: "Dr. Keerthy S", exact: true })
      .waitFor();
    assert(
      await featured
        .getByText("MBBS, MD in Developmental Pediatrics", { exact: true })
        .isVisible(),
    );
    assert(await featured.getByText("₹250", { exact: true }).isVisible());
    assert(
      await featured
        .getByText("Monday–Friday, 10:30 am–3:00 pm IST, excluding lunch break.", {
          exact: true,
        })
        .isVisible(),
    );
    assert.equal(
      await featured.getByRole("button").count(),
      0,
      "An informational profile cannot create a booking or payment",
    );
    assert.equal(
      await featured.getByRole("link", { name: "Contact NIPMR" }).getAttribute("href"),
      "https://www.nipmr.org.in/developmental-pediatrics.php",
    );
    assert.equal(
      await page.locator(".provider-card").filter({ hasText: "Demo Doctor" }).count(),
      0,
    );
    assert.equal(await page.locator(".care-service-status").count(), 0);
    await page.getByRole("textbox", { name: "Search specialists" }).fill("NIPMR");
    assert.equal(await page.locator(".provider-card").count(), 1);
    await page.getByRole("textbox", { name: "Search specialists" }).fill("");
    const clinic = page
      .locator(".appointment-row")
      .filter({ hasText: "Synthetic Clinic, Kochi" });
    assert.equal(
      await clinic
        .getByRole("button", { name: "Join online visit", exact: true })
        .count(),
      0,
    );
    await page.getByRole("button", { name: "Join online visit", exact: true }).click();
    await page
      .getByText("Synthetic video service unavailable; appointment retained.", {
        exact: true,
      })
      .waitFor();
    assert.equal(joins, 1);
    await page.getByRole("button", { name: "Dismiss error", exact: true }).click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${out}/care-${width}.png`, fullPage: true });
    if (width === 1440)
      await page.screenshot({ path: `${out}/care-preview.png`, fullPage: false });
    for (const tool of [
      { label: "Messages", id: "messages", action: "New message" },
      { label: "Payments", id: "payments" },
      { label: "Referrals", id: "referrals", action: "New referral" },
    ]) {
      await page
        .getByRole("navigation", { name: "Appointment tools", exact: true })
        .getByRole("button", { name: tool.label, exact: true })
        .click();
      assert(await page.locator(`#care-${tool.id}`).isVisible());
      assert.equal(await page.locator("#care-specialists").count(), 0);
      if (tool.action) {
        await page.getByRole("button", { name: tool.action, exact: true }).click();
        await page.getByRole("dialog").waitFor();
        await page.keyboard.press("Escape");
      }
    }
    await page
      .getByRole("navigation", { name: "Appointment tools" })
      .getByRole("button", { name: "Back to appointments", exact: true })
      .click();
    await page.getByRole("button", { name: "View availability", exact: true }).click();
    await page.locator(".time-slot").first().waitFor();
    const modes = page.getByRole("group", { name: "Consultation type", exact: true });
    await modes
      .getByRole("button", { name: "In-person appointment", exact: true })
      .click();
    await page.locator(".time-slot").first().waitFor();
    assert(
      (await modes
        .getByRole("button", { name: "In-person appointment", exact: true })
        .getAttribute("aria-pressed")) === "true",
    );
    await page.locator(".time-slot").first().click();
    await page.getByRole("button", { name: "Continue to review", exact: true }).click();
    assert(
      await page
        .locator(".booking-summary")
        .getByText("Synthetic Clinic, Kochi", { exact: true })
        .isVisible(),
    );
    assert(
      await page
        .locator(".booking-summary")
        .getByText("In-person appointment", { exact: true })
        .isVisible(),
    );
    await page.getByRole("button", { name: "Hold this time", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByText(/Synthetic Clinic, Kochi/)
      .waitFor();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("vite-error-overlay").count(), 0);
    assert(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    );
    await page.screenshot({
      path: `${out}/clinic-review-${width}.png`,
      fullPage: true,
    });
    await modes
      .getByRole("button", { name: "Online consultation", exact: true })
      .click();
    assert.equal(await page.locator(".time-slot.selected").count(), 0);
    assert.equal(
      await page
        .getByRole("button", { name: "Continue to review", exact: true })
        .count(),
      0,
    );
    assert.deepEqual(errors, []);
    await page.close();
    const info = await browser.newPage({ viewport: { width, height: 1000 } });
    let writes = 0;
    await info.route("**/v1/**", (r) => {
      const path = new URL(r.request().url()).pathname;
      let data = structuredClone(respond(path));
      if (r.request().method() !== "GET") writes++;
      if (path === "/v1/practitioners/")
        data = {
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: "demo",
              display_name: "Demo Doctor 1 — test only",
              specialty: "Demo",
              fee_minor: 100,
              verified: true,
            },
          ],
        };
      if (path === "/v1/appointments/")
        data = { count: 0, next: null, previous: null, results: [] };
      if (path === "/v1/readiness/")
        data = {
          capabilities: {
            payments: { ready: false, mode: "unavailable", policy_ready: false },
          },
        };
      return r.fulfill({ json: data });
    });
    await info.goto(
      `http://127.0.0.1:${server.httpServer.address().port}/audit.html?view=care&child=c1&lang=${width === 390 ? "ml" : "en"}&theme=${width === 390 ? "dark" : "light"}`,
    );
    await info
      .locator(".featured-specialist")
      .getByRole("heading", { name: "Dr. Keerthy S", exact: true })
      .waitFor();
    await info.locator(".loading-bar").waitFor({ state: "detached" });
    assert.equal(
      await info.locator(".provider-card").count(),
      1,
      "Only Dr. Keerthy's informational profile replaces demo cards",
    );
    assert.equal(await info.locator(".featured-specialist button").count(), 0);
    assert.equal(await info.locator(".featured-specialist a").count(), 1);
    assert.equal(await info.locator(".care-service-status").count(), 0);
    assert(
      await info
        .locator(".featured-specialist")
        .getByText("₹250", { exact: true })
        .isVisible(),
    );
    assert.equal(
      writes,
      0,
      "A public profile never creates a provider account, hold or payment",
    );
    assert(
      await info.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    );
    await info.evaluate(() => scrollTo(0, 0));
    await info.screenshot({ path: `${out}/dr-keerthy-${width}.png`, fullPage: true });
    if (width === 1440)
      await info
        .locator(".featured-specialist")
        .screenshot({ path: `${out}/dr-keerthy-card.png` });
    await info.close();
    console.log(
      `PASS Care ${width}px: two main sections, secondary tools, online-only join, failure handling, consultation modes, clinic address and cleared selection`,
    );
  }
} finally {
  await browser.close();
  await server.close();
}
