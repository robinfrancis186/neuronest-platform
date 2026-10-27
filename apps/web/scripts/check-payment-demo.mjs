import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright";
import { respond } from "./responsive-fixtures.mjs";

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
const out = "/tmp/neuronest-payment-demo";
await mkdir(out, { recursive: true });
try {
  for (const width of [280, 390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    let creates = 0,
      reads = 0,
      paid = false,
      unavailable = false;
    await page.addInitScript(() => {
      window.Razorpay = class {
        constructor(options) {
          window.testCheckout = options;
        }
        open() {
          window.testOpened = (window.testOpened || 0) + 1;
        }
        on(_, fn) {
          window.testFailure = fn;
        }
      };
    });
    await page.route("**/v1/**", (r) => {
      const path = new URL(r.request().url()).pathname;
      let data = structuredClone(respond(path));
      if (path === "/v1/readiness/")
        data = {
          capabilities: {
            payments: { ready: false, mode: "unavailable" },
            payment_demo: { ready: true, mode: "sandbox" },
          },
        };
      if (path === "/v1/payment-demo/") {
        creates++;
        assert.deepEqual(r.request().postDataJSON(), {});
        data = {
          order_id: `order_test${creates}`,
          key: "rzp_test_fixture",
          amount_minor: 25000,
          currency: "INR",
          status: "pending",
        };
      } else if (path.startsWith("/v1/payment-demo/")) {
        reads++;
        if (unavailable)
          return r.fulfill({
            status: 503,
            json: { detail: "Test provider status unavailable" },
          });
        data = {
          order_id: `order_test${creates}`,
          key: "rzp_test_fixture",
          amount_minor: 25000,
          currency: "INR",
          status: paid ? "paid" : "pending",
        };
      }
      return r.fulfill({ json: data });
    });
    await page.goto(
      `http://127.0.0.1:${server.httpServer.address().port}/audit.html?view=care&child=c1`,
    );
    await page
      .getByRole("button", { name: "Try Razorpay test checkout", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Razorpay test checkout", exact: true })
      .waitFor();
    const pay = page.getByRole("button", {
      name: "Try ₹250 test payment",
      exact: true,
    });
    await pay.click();
    await page.waitForFunction(() => window.testOpened === 1);
    assert.equal(creates, 1);
    assert.equal(
      await page
        .getByText("Test payment confirmed by Razorpay. No appointment was booked.", {
          exact: true,
        })
        .count(),
      0,
    );
    assert.equal(
      await page.evaluate(() => window.testCheckout.key),
      "rzp_test_fixture",
    );
    assert.equal(await page.evaluate(() => window.testCheckout.amount), 25000);
    await page.evaluate(() =>
      window.testCheckout.handler({ razorpay_payment_id: "client_claim" }),
    );
    await page.waitForFunction(
      () => document.querySelector("#care-payments code") !== null,
    );
    while (reads < 1) await page.waitForTimeout(25);
    assert.equal(
      await page
        .getByText("Test payment confirmed by Razorpay. No appointment was booked.", {
          exact: true,
        })
        .count(),
      0,
    );
    paid = true;
    await page
      .getByText("Test payment confirmed by Razorpay. No appointment was booked.", {
        exact: true,
      })
      .waitFor();
    paid = false;
    await page
      .getByRole("button", { name: "Try ₹250 test payment", exact: true })
      .click();
    await page.waitForFunction(() => window.testOpened === 2);
    assert.equal(creates, 2);
    await page.evaluate(() => window.testCheckout.modal.ondismiss());
    await page
      .getByText("Checkout closed. Check the test payment status before retrying.", {
        exact: true,
      })
      .waitFor();
    await page
      .getByRole("button", { name: "Reopen test checkout", exact: true })
      .click();
    assert.equal(creates, 2, "Reopening uses the same pending order");
    await page.evaluate(() => window.testFailure());
    await page
      .getByText("Test payment failed. You can check status or retry checkout.", {
        exact: true,
      })
      .waitFor();
    unavailable = true;
    await page
      .getByRole("button", { name: "Check test payment status", exact: true })
      .click();
    await page.getByText("Test provider status unavailable", { exact: true }).waitFor();
    assert.equal(
      await page
        .getByText("Test payment confirmed by Razorpay. No appointment was booked.", {
          exact: true,
        })
        .count(),
      0,
    );
    unavailable = false;
    paid = true;
    await page
      .getByRole("button", { name: "Check test payment status", exact: true })
      .click();
    await page
      .getByText("Test payment confirmed by Razorpay. No appointment was booked.", {
        exact: true,
      })
      .waitFor();
    assert(reads >= 2);
    assert.equal(creates, 2);
    assert(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    );
    await page.screenshot({ path: `${out}/payment-demo-${width}.png`, fullPage: true });
    assert.deepEqual(
      errors.filter((message) => !message.includes("503 (Service Unavailable)")),
      [],
    );
    assert.equal(
      errors.filter((message) => message.includes("503 (Service Unavailable)")).length,
      1,
      "Only the deliberate provider failure is expected in the console",
    );
    await page.close();
    console.log(
      `PASS test checkout ${width}px: pending/reopen/failure/provider-error/verified-success; no appointment`,
    );
  }
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 1000 } });
    let childWrites = 0;
    await page.route("**/v1/**", (r) => {
      const path = new URL(r.request().url()).pathname;
      if (path === "/v1/children/" && r.request().method() !== "GET") childWrites++;
      let data = respond(path);
      if (path === "/v1/children/") data = { count: 0, next: null, results: [] };
      if (path === "/v1/readiness/")
        data = { capabilities: { payment_demo: { ready: true, mode: "sandbox" } } };
      return r.fulfill({ json: data });
    });
    await page.goto(
      `http://127.0.0.1:${server.httpServer.address().port}/audit.html?view=today&choose_child=1`,
    );
    await page.getByRole("heading", { name: "Choose a child", exact: true }).waitFor();
    await page
      .getByRole("button", { name: "Try Razorpay test checkout", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Project payment demo", exact: true })
      .waitFor();
    assert.equal(await page.locator(".sidebar").count(), 0);
    assert.equal(
      await page
        .getByRole("button", { name: "Try ₹250 test payment", exact: true })
        .isEnabled(),
      true,
    );
    await page
      .getByRole("button", { name: "Back to child profiles", exact: true })
      .click();
    await page.getByRole("heading", { name: "Choose a child", exact: true }).waitFor();
    assert.equal(
      childWrites,
      0,
      "The payment demo cannot create a child or clear child selection",
    );
    await page.close();
    console.log("PASS child-free payment demo and preserved child-selection gate");
  }
  for (const kind of ["unavailable", "script-error"]) {
    const page = await browser.newPage();
    let creates = 0;
    await page.route("**/v1/**", (r) => {
      const path = new URL(r.request().url()).pathname;
      if (path === "/v1/payment-demo/") creates++;
      return r.fulfill({
        json:
          path === "/v1/readiness/"
            ? { capabilities: { payment_demo: { ready: kind !== "unavailable" } } }
            : respond(path),
      });
    });
    await page.route("https://checkout.razorpay.com/v1/checkout.js", (r) => r.abort());
    await page.goto(
      `http://127.0.0.1:${server.httpServer.address().port}/audit.html?view=care&tab=payments&child=c1`,
    );
    const button = page.getByRole("button", {
      name: "Try ₹250 test payment",
      exact: true,
    });
    await button.waitFor();
    await page.locator(".loading-bar").waitFor({ state: "detached" });
    if (kind === "unavailable") assert(await button.isDisabled());
    else {
      await button.click();
      await page
        .getByText("Could not load secure checkout. Please retry.", { exact: true })
        .waitFor();
    }
    assert.equal(creates, 0, "Unavailable SDK/config cannot create a test order");
    await page.close();
    console.log(`PASS test checkout ${kind}`);
  }
} finally {
  await browser.close();
  await server.close();
}
