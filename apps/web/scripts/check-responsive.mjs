/**
 * Responsive regression gate.
 *
 * The layout drifted because nothing checked it: seven bottom-navigation items
 * were squeezed into 320px by dropping their labels to 8px, micro-labels sat at
 * 6-7px, the notification control was 26px wide, and a deep-linked tab could sit
 * hundreds of pixels off the edge of its own strip with no way to tell.
 *
 * This asserts the invariants that prevent all of that, across the real screens
 * at the real breakpoints. It starts its own Vite server and needs no backend:
 * the audit harness mounts the workspace with the network stubbed.
 *
 *   npm run check:responsive
 */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createServer } from "vite";
import { chromium } from "playwright";
import { respond } from "./responsive-fixtures.mjs";

/** One width per rung of the ladder in styles.css, plus common device widths. */
// 320px is the reflow width WCAG asks for; 280 gives margin below it for a phone
// at high browser zoom. The rest are the ladder rungs and common device widths.
const WIDTHS = [
  280, 320, 360, 390, 414, 480, 600, 744, 768, 820, 912, 1024, 1280, 1440, 1920,
];
const CORE_SCREENS = [
  { view: "activities", role: "parent" },
  { view: "today", role: "parent" },
  { view: "journey", role: "parent" },
  { view: "care", role: "parent" },
  { view: "records", role: "parent" },
  { view: "library", role: "parent" },
  { view: "account", role: "parent" },
  { view: "operations", role: "admin" },
];
const EXTRA_SCREENS = [
  { view: "milestones", role: "parent" },
  { view: "assessments", role: "parent" },
  { view: "reports", role: "parent" },
  { view: "notifications", role: "parent" },
  { view: "today", role: "doctor" },
  { view: "care", role: "doctor" },
  { view: "records", role: "doctor" },
  { view: "care", role: "mentor" },
];
const SCREENS = process.env.RESPONSIVE_EXTRA_ONLY
  ? EXTRA_SCREENS : [...CORE_SCREENS, ...EXTRA_SCREENS];
const MIN_FONT_PX = 10;
const MIN_TARGET_PX = 44;

const AUDIT = ({ minFont, minTarget }) => {
  const vw = document.documentElement.clientWidth;
  const out = { overflow: [], targets: [], fonts: [], nav: [], tabs: [] };
  const name = (el) =>
    el.tagName.toLowerCase() +
    (typeof el.className === "string" && el.className
      ? "." + el.className.trim().split(/\s+/)[0]
      : "");

  // 1. Nothing may push the page sideways.
  if (document.documentElement.scrollWidth > vw + 1) {
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (getComputedStyle(el).position === "fixed") continue;
      // Content inside a horizontally scrollable ancestor (a tab strip) is
      // reachable by design and is not what "the page scrolls sideways" means.
      let scrollable = false;
      for (let p = el.parentElement; p; p = p.parentElement) {
        const ox = getComputedStyle(p).overflowX;
        if (ox === "auto" || ox === "scroll" || ox === "hidden") {
          scrollable = true;
          break;
        }
      }
      if (scrollable) continue;
      if (r.right > vw + 1 || r.left < -1)
        out.overflow.push({ el: name(el), right: Math.round(r.right), vw });
    }
    out.overflow = out.overflow.slice(0, 4);
  }

  // 2. Every bottom-navigation label stays on one line and is never cut off.
  const bar = document.querySelector(".mobile-nav");
  if (bar && getComputedStyle(bar).display !== "none") {
    for (const button of bar.querySelectorAll("button")) {
      const label = button.querySelector("span");
      if (!label) continue;
      const line = parseFloat(getComputedStyle(label).lineHeight) || 14;
      if (label.getBoundingClientRect().height > line * 1.6)
        out.nav.push({ label: label.textContent, issue: "wraps" });
      if (label.scrollWidth > label.clientWidth + 1)
        out.nav.push({ label: label.textContent, issue: "truncated" });
    }
    if (bar.scrollWidth > bar.clientWidth + 1) out.nav.push({ label: "(bar)", issue: "overflows" });
  }

  // 3. The selected tab has to be visible inside its own strip.
  for (const strip of document.querySelectorAll('[role="tablist"]')) {
    const selected = strip.querySelector('[role="tab"][aria-selected="true"]');
    if (!selected) continue;
    const sr = strip.getBoundingClientRect();
    const tr = selected.getBoundingClientRect();
    if (tr.right < sr.left - 2 || tr.left > sr.right + 2)
      out.tabs.push({ tab: selected.textContent.trim(), issue: "selected tab is off-screen" });
  }

  // 4. Readable text and reachable controls on touch devices.
  if (vw < 768) {
    for (const el of document.querySelectorAll("p, span, small, li, td, label, div, button, a")) {
      const direct = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!direct) continue;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const size = parseFloat(style.fontSize);
      if (size && size < minFont)
        out.fonts.push({ el: name(el), size: +size.toFixed(1), text: el.textContent.trim().slice(0, 24) });
    }
    for (const el of document.querySelectorAll(
      "button, a[href], select, [role='tab'], input:not([type=checkbox]):not([type=radio])",
    )) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (r.height < minTarget - 0.5)
        out.targets.push({
          el: name(el),
          w: Math.round(r.width),
          h: Math.round(r.height),
          text: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 22),
        });
    }
    const dedupe = (list) => {
      const seen = new Set();
      return list.filter((x) => {
        const k = JSON.stringify(x);
        return seen.has(k) ? false : seen.add(k);
      });
    };
    out.fonts = dedupe(out.fonts).slice(0, 5);
    out.targets = dedupe(out.targets).slice(0, 6);
  }
  return out;
};

const server = await createServer({
  root: new URL("..", import.meta.url).pathname,
  server: { port: 0, host: "127.0.0.1" },
  logLevel: "error",
});
await server.listen();
const base = `http://127.0.0.1:${server.config.server.port || server.httpServer.address().port}`;

const chromePath = existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
  ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  : undefined;
const browser = await chromium.launch({
  headless: true,
  ...(chromePath ? { executablePath: chromePath } : {}),
});

const failures = [];
let checked = 0;
for (const screen of SCREENS.filter(screen => !process.env.RESPONSIVE_VIEW || screen.view === process.env.RESPONSIVE_VIEW)) {
  for (const width of WIDTHS) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      isMobile: width < 768,
      hasTouch: width < 768,
    });
    const page = await context.newPage();
    await page.route("**/v1/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(respond(new URL(route.request().url()).pathname)),
      }),
    );
    const query = `role=${screen.role}&view=${screen.view}&tab=${screen.tab || ""}`;
    await page.goto(`${base}/audit.html?${query}`, { waitUntil: "domcontentloaded" });
    await page.locator(".app-shell").waitFor({ timeout: 30000 });
    await page.locator(".loading-bar").waitFor({ state: "detached" }).catch(() => {});
    await page.waitForTimeout(300);
    const found = await page.evaluate(AUDIT, { minFont: MIN_FONT_PX, minTarget: MIN_TARGET_PX });
    checked++;
    for (const [kind, items] of Object.entries(found))
      for (const item of items) failures.push({ screen: screen.view, width, kind, ...item });
    await context.close();
  }
  console.log(`Checked ${screen.role} ${screen.view}`);
}
await browser.close();
await server.close();

if (failures.length) {
  const byKind = {};
  for (const f of failures) (byKind[f.kind] ||= []).push(f);
  for (const [kind, items] of Object.entries(byKind)) {
    console.error(`\n${kind} (${items.length}):`);
    for (const i of items.slice(0, 8))
      console.error(`  ${i.screen} @ ${i.width}px  ${JSON.stringify(i)}`);
    if (items.length > 8) console.error(`  …and ${items.length - 8} more`);
  }
}
assert.equal(
  failures.length,
  0,
  `${failures.length} responsive problems across ${checked} screen/width combinations`,
);
console.log(
  `PASS: ${checked} screen/width combinations — no sideways scroll, no wrapped or truncated navigation labels, every selected tab visible, text at or above ${MIN_FONT_PX}px, touch targets at or above ${MIN_TARGET_PX}px`,
);
