import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright";
import { respond } from "./responsive-fixtures.mjs";
import { translate } from "../src/i18n.ts";
// Real UI with synthetic services. Razorpay itself is exercised separately in production test mode.
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
const base = `http://127.0.0.1:${server.httpServer.address().port}`;
await mkdir("/tmp/neuronest-demo-booking", { recursive: true });
try {
  for (const [fee, width, lang, mode] of [
    [100, 1440, "en", "online"],
    [150, 390, "en", "in_person"],
    [200, 1440, "ml", "online"],
    [300, 390, "ml", "in_person"],
  ]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const tr = (t) => translate(t, lang);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.clock.setFixedTime(new Date("2026-10-27T03:30:00Z"));
    let prepared = false,
      prepareCalls = 0,
      grantCalls = 0,
      payments = 0,
      verifies = 0,
      held = null;
    const profiles = [100, 150, 200, 300].map((f, i) => ({
      id: `p${f}`,
      user: `doctor-${f}`,
      display_name: `Demo Dr. ${["Asha", "Nila", "Arun", "Mira"][i]} — test only`,
      specialty: [
        "General pediatrics",
        "Developmental pediatrics",
        "Pediatric neurology",
        "Child psychiatry",
      ][i],
      is_demo: true,
      verified: true,
      status: "active",
      profession: "doctor",
      fee_minor: f * 100,
      languages: ["en", "ml"],
    }));
    const slots = Object.fromEntries(
      profiles.map((p) => [
        p.id,
        [
          {
            id: `online-${p.id}`,
            practitioner: p.id,
            starts_at: "2026-10-28T05:00:00Z",
            ends_at: "2026-10-28T05:30:00Z",
            available: true,
            consultation_mode: "online",
            clinic_address: "",
          },
          {
            id: `clinic-${p.id}`,
            practitioner: p.id,
            starts_at: "2026-10-28T05:30:00Z",
            ends_at: "2026-10-28T06:00:00Z",
            available: true,
            consultation_mode: "in_person",
            clinic_address: "NeuroNest demo clinic — project simulation only",
          },
        ],
      ]),
    );
    await page.addInitScript(() => {
      window.Razorpay = class {
        constructor(options) {
          this.options = options;
        }
        open() {
          window.__testCheckout = {
            amount: this.options.amount,
            order_id: this.options.order_id,
            key: this.options.key,
          };
          this.options.handler();
        }
      };
    });
    await page.route("**/v1/**", async (route) => {
      const req = route.request(),
        url = new URL(req.url()),
        path = url.pathname;
      if (path === "/v1/readiness/")
        return route.fulfill({
          json: {
            capabilities: {
              demo_bookings: { ready: true, mode: "sandbox" },
              payments: { ready: false },
              payment_demo: { ready: true },
              video: { ready: false },
            },
          },
        });
      if (path === "/v1/demo-bookings/prepare/") {
        assert.equal(req.method(), "POST");
        assert.deepEqual(req.postDataJSON(), {});
        prepared = true;
        prepareCalls++;
        return route.fulfill({ json: { status: "ready", profiles: 4 } });
      }
      if (path === "/v1/practitioners/")
        return route.fulfill({
          json: {
            count: prepared ? 4 : 0,
            next: null,
            results: prepared ? profiles : [],
          },
        });
      if (path === "/v1/slots/")
        return route.fulfill({
          json: {
            count: 2,
            next: null,
            results: slots[url.searchParams.get("practitioner")] || [],
          },
        });
      if (path === "/v1/grants/") {
        grantCalls++;
        throw new Error("Fictional doctors must not receive record grants");
      }
      if (path === "/v1/appointments/" && req.method() === "POST") {
        const body = req.postDataJSON();
        assert.equal(body.child, "c1");
        const slot = Object.values(slots)
          .flat()
          .find((s) => s.id === body.slot);
        assert(slot);
        assert.equal(slot.consultation_mode, mode);
        held = {
          id: "held-demo",
          child: "c1",
          practitioner: slot.practitioner,
          provider_name: profiles.find((p) => p.id === slot.practitioner).display_name,
          ...slot,
          id: "held-demo",
          slot: slot.id,
          is_demo: true,
          status: "awaiting_payment",
          amount_minor: fee * 100,
          hold_expires_at: "2026-10-27T03:40:00Z",
        };
        return route.fulfill({ status: 201, json: held });
      }
      if (path === "/v1/appointments/")
        return route.fulfill({
          json: { count: held ? 1 : 0, next: null, results: held ? [held] : [] },
        });
      if (path === "/v1/appointments/held-demo/") return route.fulfill({ json: held });
      if (path === "/v1/payments/" && req.method() === "POST") {
        assert.deepEqual(req.postDataJSON(), { appointment: "held-demo" });
        payments++;
        return route.fulfill({
          status: 201,
          json: {
            id: "payment-demo",
            appointment: "held-demo",
            provider_order_id: "order_test_demo",
            amount_minor: fee * 100,
            checkout: { key: "rzp_test_fixture", amount: fee * 100, currency: "INR" },
          },
        });
      }
      if (path === "/v1/payments/payment-demo/verify/") {
        assert.deepEqual(req.postDataJSON(), {});
        verifies++;
        held.status = "confirmed";
        return route.fulfill({ json: { status: "captured" } });
      }
      if (req.method() !== "GET") throw new Error(`Unexpected write ${path}`);
      return route.fulfill({ json: respond(path) });
    });
    await page.goto(`${base}/audit.html?view=care&child=c1&lang=${lang}`);
    await page
      .getByRole("button", { name: tr("Book an appointment"), exact: true })
      .click();
    const profile = profiles.find((p) => p.fee_minor === fee * 100);
    const visibleName = profile.display_name.replace(/^Demo (.+) — test only$/, "$1");
    const card = page.locator(".provider-card").filter({ hasText: visibleName });
    await card.waitFor();
    assert.equal(await page.locator(".care-exhibition-mode").count(), 1);
    assert.match(
      await page.locator(".care-exhibition-mode").innerText(),
      new RegExp(tr("Exhibition mode")),
    );
    assert.doesNotMatch(
      await card.innerText(),
      /Demo Dr\.|test only|Test profile|Verified/,
    );
    assert.equal(prepareCalls, 1);
    assert(
      !(await page.locator(".provider-card").first().getAttribute("class")).includes(
        "featured-specialist",
      ),
    );
    assert.match(await card.innerText(), new RegExp(`₹${fee}`));
    await page.screenshot({
      path: `/tmp/neuronest-demo-booking/doctors-${fee}.png`,
      fullPage: true,
    });
    await card
      .getByRole("button", { name: tr("View availability"), exact: true })
      .click();
    await page.locator(".time-slot").first().waitFor();
    assert.match(
      await page.locator(".booking-provider").innerText(),
      new RegExp(visibleName),
    );
    assert.doesNotMatch(
      await page.locator(".booking-provider").innerText(),
      /Demo Dr\.|test only|Test profile|Verified/,
    );
    if (mode === "in_person") {
      await page
        .getByRole("button", { name: tr("In-person appointment"), exact: true })
        .click();
      await page.locator(".time-slot").first().waitFor();
    }
    await page.locator(".time-slot").first().click();
    await page
      .getByRole("button", { name: tr("Continue to review"), exact: true })
      .click();
    assert.match(
      await page.locator(".booking-summary").innerText(),
      new RegExp(visibleName),
    );
    assert.doesNotMatch(
      await page.locator(".booking-summary").innerText(),
      /Demo Dr\.|test only/,
    );
    assert(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    );
    await page.getByRole("button", { name: tr("Hold this time"), exact: true }).click();
    assert.match(await page.getByRole("dialog").innerText(), new RegExp(visibleName));
    assert.doesNotMatch(
      await page.getByRole("dialog").innerText(),
      /Demo Dr\.|test only/,
    );
    await page
      .getByRole("dialog")
      .getByRole("button", { name: tr("Hold this time"), exact: true })
      .click();
    await page
      .getByRole("button", { name: tr("Pay & confirm"), exact: true })
      .waitFor();
    assert.equal(grantCalls, 0);
    assert.equal(held.amount_minor, fee * 100);
    assert.equal(held.provider_name, profile.display_name);
    assert.match(held.provider_name, /^Demo Dr\..+ — test only$/);
    await page.getByRole("button", { name: tr("Pay & confirm"), exact: true }).click();
    await page
      .getByText(tr("Your appointment is confirmed."), { exact: true })
      .waitFor();
    assert.equal(verifies, 1);
    assert.equal(payments, 1);
    assert.equal(held.status, "confirmed");
    assert.match(
      await page.locator(".appointment-row").innerText(),
      new RegExp(visibleName),
    );
    assert.doesNotMatch(
      await page.locator(".appointment-row").innerText(),
      /Demo Dr\.|test only/,
    );
    assert.deepEqual(await page.evaluate(() => window.__testCheckout), {
      amount: fee * 100,
      order_id: "order_test_demo",
      key: "rzp_test_fixture",
    });
    await page.screenshot({
      path: `/tmp/neuronest-demo-booking/confirmed-${fee}.png`,
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      `PASS INR ${fee} ${mode} ${width}px ${lang}: prepare, slots, hold, no record grants, server-verified test checkout`,
    );
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
