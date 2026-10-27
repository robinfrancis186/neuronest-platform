import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createServer } from "vite";
import { chromium } from "playwright";
import { respond } from "./responsive-fixtures.mjs";

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
try {
  const page = await browser.newPage();
  await page.clock.setFixedTime(new Date("2026-09-09T08:00:00Z"));
  let held = 0,
    detailReads = 0,
    paymentReady = false,
    hasGrant = false;
  let heldAppointment = null;
  await page.addInitScript(() => {
    window.Razorpay = class {
      constructor(options) {
        this.options = options;
      }
      open() {
        this.options.handler();
      }
    };
  });
  await page.route("**/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body = respond(path);
    if (path === "/v1/practitioners/")
      body = {
        ...body,
        results: body.results.map((p) => ({ ...p, user: "doctor-user" })),
      };
    if (path === "/v1/grants/")
      body = hasGrant
        ? [
            {
              recipient: "doctor-user",
              scopes: ["records"],
              expires_at: "2099-01-01T00:00:00Z",
            },
          ]
        : [];
    if (path === "/v1/readiness/")
      body = { capabilities: { payments: { ready: paymentReady } } };
    if (path === "/v1/appointments/" && route.request().method() === "POST") {
      held++;
      assert.equal(route.request().postDataJSON().child, "c1");
      heldAppointment = {
        ...respond("/v1/appointments/").results[1],
        id: "held",
        status: "awaiting_payment",
        consultation_mode: "online",
        clinic_address: "",
      };
      body = heldAppointment;
    }
    if (path === "/v1/appointments/" && route.request().method() === "GET")
      body = {
        count: heldAppointment ? 1 : 0,
        next: null,
        results: heldAppointment ? [heldAppointment] : [],
      };
    if (path === "/v1/payments/" && route.request().method() === "POST") {
      assert.equal(route.request().postDataJSON().appointment, "held");
      body = {
        id: "test-payment",
        checkout: { key: "rzp_test_fixture" },
        provider_order_id: "test-order",
      };
    }
    if (path === "/v1/appointments/held/") {
      detailReads++;
      heldAppointment.status = detailReads > 1 ? "confirmed" : "awaiting_payment";
      body = heldAppointment;
    }
    await route.fulfill({ json: body });
  });
  await page.goto(
    `http://127.0.0.1:${server.httpServer.address().port}/audit.html?view=care&child=c1`,
  );
  await page.getByRole("button", { name: "View availability", exact: true }).click();
  await page.locator(".time-slot").first().click();
  await page.getByRole("button", { name: "Continue to review", exact: true }).click();
  assert.equal(await page.locator(".assistant-launcher").count(), 0);
  assert(
    await page
      .getByRole("button", { name: "Open Nest Assistant", exact: true })
      .isVisible(),
  );
  await page.getByRole("button", { name: "Hold this time", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Hold this time", exact: true })
    .click();
  await page.getByText(/Booking payments are not available yet/).waitFor();
  assert.equal(held, 0, "Unavailable checkout must not create a hold");
  paymentReady = true;
  await page.getByRole("button", { name: "Hold this time", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Hold this time", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByText(/Booking requires permission/)
    .waitFor();
  assert.equal(held, 0, "Missing care consent must not create a reservation");
  await page.keyboard.press("Escape");
  hasGrant = true;
  await page.getByRole("button", { name: "Hold this time", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Hold this time", exact: true })
    .click();
  await page
    .getByText("Appointment held. Complete payment before the hold expires.", {
      exact: true,
    })
    .waitFor();
  assert.equal(held, 1);
  await page
    .getByRole("button", { name: "Pay & confirm", exact: true })
    .first()
    .click();
  await page.getByText("Your appointment is confirmed.", { exact: true }).waitFor();
  assert.equal(
    detailReads,
    2,
    "Confirmation must come from the server, after pending status",
  );
  console.log(
    "PASS: unavailable payment guard, slot hold and server-confirmed checkout (mock services).",
  );
} finally {
  await browser.close();
  await server.close();
}
