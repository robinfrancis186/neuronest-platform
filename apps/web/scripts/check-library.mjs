import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createServer } from "vite";
import { chromium } from "playwright";
import { respond } from "./responsive-fixtures.mjs";

const catalog = JSON.parse(
  await readFile(
    new URL("../../../packages/contracts/learning-catalog.json", import.meta.url),
  ),
);
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
const out = "/tmp/neuronest-library";
await mkdir(out, { recursive: true });
try {
  for (const width of [280, 390, 1440])
    for (const theme of ["light", "dark"])
      for (const lang of ["en", "ml"]) {
        const context = await browser.newContext({ viewport: { width, height: 1000 } });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        page.on("console", (m) => {
          if (m.type() === "error") errors.push(m.text());
        });
        await context.route("https://www.youtube.com/**", (r) =>
          r.fulfill({ body: "Synthetic external destination" }),
        );
        const embedRequests = [];
        await context.route("https://www.youtube-nocookie.com/embed/**", (r) => {
          embedRequests.push(r.request().url());
          assert.equal(
            r.request().headers().referer,
            `http://127.0.0.1:${server.httpServer.address().port}/`,
          );
          return r.fulfill({
            contentType: "text/html",
            body: "<html><body style='margin:0;background:#111;color:white'>Embedded player fixture</body></html>",
          });
        });
        await context.route(
          "https://www.cdc.gov/act-early/resources/videos.html",
          (r) => r.fulfill({ body: "Synthetic CDC collection destination" }),
        );
        await context.route("https://i.ytimg.com/**", (r) => {
          const id = new URL(r.request().url()).pathname.split("/")[2];
          assert.ok(catalog.resources.some((resource) => resource.youtubeId === id));
          return r.fulfill({
            contentType: "image/svg+xml",
            body: `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><rect width="480" height="360" fill="#c5d9cd"/><text x="240" y="180" text-anchor="middle">Test cover ${id}</text></svg>`,
          });
        });
        await page.route("**/v1/**", (r) => {
          const path = new URL(r.request().url()).pathname;
          let data = structuredClone(respond(path));
          if (path === "/v1/content/")
            data = {
              results: [
                {
                  id: "old",
                  kind: "video",
                  title: "Legacy autism video",
                  review_status: "approved",
                  available: true,
                  url: "https://www.youtube.com/watch?v=DTIz2D0K_EE",
                },
                {
                  id: "article",
                  kind: "article",
                  title: "Synthetic reviewed article",
                  summary: "A saved learning article",
                  review_status: "approved",
                  language: "en",
                  url: "https://example.org/article",
                },
                {
                  id: "unreviewed",
                  kind: "article",
                  title: "Unreviewed article",
                  review_status: "pending",
                  url: "https://example.org/pending",
                },
              ],
            };
          if (path === "/v1/resources/")
            data = {
              results: [
                {
                  id: "support",
                  review_status: "approved",
                  name: "Synthetic local support",
                  location: "Kochi",
                  kind: "Parent support",
                  url: "https://example.org/support",
                },
              ],
            };
          if (Array.isArray(data.results)) {
            data.count = data.results.length;
            data.next = null;
            data.previous = null;
          }
          return r.fulfill({ json: data });
        });
        await page.goto(
          `http://127.0.0.1:${server.httpServer.address().port}/audit.html?view=library&child=c1&lang=${lang}&theme=${theme}`,
        );
        await page
          .getByRole("heading", {
            name: lang === "en" ? "Parent learning" : "രക്ഷിതാക്കൾക്കുള്ള അറിവ്",
            exact: true,
          })
          .waitFor();
        await page
          .getByRole("heading", { name: "Synthetic reviewed article" })
          .waitFor();
        await page.locator(".loading-bar").waitFor({ state: "detached" });
        assert.equal(await page.locator(".learning-topic").count(), 10);
        assert.equal(await page.getByText("Legacy autism video").count(), 0);
        assert.equal(
          await page.getByText("Unreviewed article", { exact: true }).count(),
          0,
        );
        assert.equal(await page.locator("iframe").count(), 0);
        assert.deepEqual(
          await page
            .locator(".learning-topic-copy > a")
            .evaluateAll((links) => links.map((a) => a.href)),
          catalog.resources.filter((r) => r.kind !== "video").map((r) => r.sourceUrl),
        );
        assert.equal(
          await page
            .locator(".learning-topic-copy > a[target='_blank'][rel='noreferrer']")
            .count(),
          1,
        );
        assert.equal(
          await page.locator('.learning-topic-copy > a[href*="/results?"]').count(),
          0,
        );
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
        assert.equal(
          await page
            .locator(".topbar")
            .evaluate((el) => getComputedStyle(el).backgroundColor),
          theme === "light" ? "rgb(227, 238, 231)" : "rgb(27, 48, 39)",
        );
        if (width === 1440) {
          assert.equal(
            await page
              .locator(".sidebar")
              .evaluate((el) => getComputedStyle(el).backgroundColor),
            theme === "light" ? "rgb(25, 75, 61)" : "rgb(16, 44, 35)",
          );
          const active = page.locator('.nav-item[aria-current="page"]');
          assert.equal(await active.count(), 1);
        }
        assert.equal(await page.locator(".learning-preview img").count(), 9);
        assert.equal(await page.locator(".learning-preview").count(), 10);
        assert.equal(await page.locator(".learning-preview-play").count(), 9);
        for (const resource of catalog.resources.filter((r) => r.kind === "video")) {
          const image = page.locator(
            `.learning-preview img[src*="/${resource.youtubeId}/"]`,
          );
          await image.scrollIntoViewIfNeeded();
          await image.evaluate((img) => img.decode());
          assert.ok(await image.evaluate((img) => img.naturalWidth > 0));
          assert.equal(await image.getAttribute("referrerpolicy"), "no-referrer");
          assert.equal(
            await image.locator("..").evaluate((el) => el.tagName),
            "BUTTON",
          );
        }
        await page.locator(".search-field input").fill("Understood");
        assert.equal(await page.locator(".learning-topic").count(), 1);
        assert.equal(
          await page.locator(".learning-topic h3").textContent(),
          "Attention-deficit/hyperactivity disorder (ADHD)",
        );
        await page.locator(".search-field input").fill("no-such-topic-xyz");
        assert.equal(await page.locator(".learning-topic").count(), 0);
        await page
          .getByText(
            lang === "en" ? "No matching topics" : "പൊരുത്തപ്പെടുന്ന വിഷയങ്ങളില്ല",
            { exact: true },
          )
          .waitFor();
        await page.locator(".search-field input").fill("");
        await page
          .getByRole("tab", { name: lang === "en" ? "Read" : "വായിക്കുക", exact: true })
          .click();
        assert.equal(await page.locator(".learning-topic").count(), 0);
        await page
          .getByRole("heading", { name: "Synthetic reviewed article" })
          .waitFor();
        await page.locator(".loading-bar").waitFor({ state: "detached" });
        await page
          .getByRole("tab", {
            name: lang === "en" ? "Local support" : "പ്രാദേശിക പിന്തുണ",
            exact: true,
          })
          .click();
        await page
          .getByRole("heading", { name: "Synthetic local support" })
          .waitFor({ timeout: 10000 })
          .catch(async (error) => {
            await page.screenshot({
              path: `${out}/failure-${width}-${theme}-${lang}.png`,
            });
            console.error(errors, await page.locator("main").innerText());
            throw error;
          });
        await page
          .getByRole("tab", {
            name: lang === "en" ? "Topics" : "വിഷയങ്ങൾ",
            exact: true,
          })
          .click();
        await page.locator(".loading-bar").waitFor({ state: "detached" });
        assert.equal(await page.locator(".learning-topic").count(), 10);
        assert.equal(
          await page
            .getByRole("heading", { name: "Synthetic reviewed article" })
            .count(),
          0,
        );
        const closeLabel = lang === "en" ? "Close video" : "വീഡിയോ അടയ്ക്കുക";
        const player = page.getByRole("dialog", {
          name: "Early brain development",
          exact: true,
        });
        const launch = page.locator("button.learning-preview").first();
        const startUrl = page.url();
        await launch.click();
        await player.waitFor();
        const iframe = player.locator("iframe");
        const src = new URL(await iframe.getAttribute("src"));
        assert.equal(src.origin, "https://www.youtube-nocookie.com");
        assert.equal(src.pathname, `/embed/${catalog.resources[0].youtubeId}`);
        assert.equal(src.searchParams.get("autoplay"), "1");
        assert.equal(src.searchParams.get("playsinline"), "1");
        assert.equal(src.searchParams.get("hl"), lang);
        assert.equal(await iframe.getAttribute("referrerpolicy"), "strict-origin");
        await iframe.evaluate((el) => {
          if (!el.contentWindow) throw new Error("No embedded frame");
        });
        await page.waitForFunction(() =>
          document.querySelector("dialog.learning-player:modal"),
        );
        assert.equal(context.pages().length, 1);
        assert.equal(page.url(), startUrl);
        const bounds = await iframe.boundingBox();
        assert.ok(bounds.width >= 200 && bounds.height >= 200);
        assert.ok(await player.evaluate((el) => el.scrollWidth <= el.clientWidth + 1));
        await page.screenshot({ path: `${out}/player-${width}-${theme}-${lang}.png` });
        await page.keyboard.press("Escape");
        await player.waitFor({ state: "detached" });
        assert.equal(await page.locator("iframe").count(), 0);
        assert.ok(await launch.evaluate((el) => el === document.activeElement));
        await page.locator(".learning-topic-copy > button").first().click();
        await player.waitFor();
        assert.equal(
          await player.getByRole("link").getAttribute("href"),
          catalog.resources[0].sourceUrl,
        );
        await player.getByRole("button", { name: closeLabel, exact: true }).click();
        await player.waitFor({ state: "detached" });
        await launch.click();
        await player.waitFor();
        await page.mouse.click(2, 2);
        await player.waitFor({ state: "detached" });
        if (width === 390 && theme === "light" && lang === "en") {
          const videos = catalog.resources.filter((r) => r.kind === "video");
          for (let i = 0; i < videos.length; i++) {
            await page.locator("button.learning-preview").nth(i).click();
            const selected = page.getByRole("dialog", {
              name: videos[i].title,
              exact: true,
            });
            await selected.waitFor();
            assert.equal(
              new URL(await selected.locator("iframe").getAttribute("src")).pathname,
              `/embed/${videos[i].youtubeId}`,
            );
            await selected.getByRole("button", { name: closeLabel }).click();
            await selected.waitFor({ state: "detached" });
          }
        }
        assert.ok(embedRequests.length >= 3);
        const popupPromise = page.waitForEvent("popup");
        await page.locator(".learning-topic-copy > a").first().click();
        const popup = await popupPromise;
        await popup.waitForLoadState();
        assert.equal(
          popup.url(),
          catalog.resources.find((r) => r.kind === "collection").sourceUrl,
        );
        await popup.close();
        if (width === 390 && theme === "light" && lang === "en") {
          const firstImage = page.locator(".learning-preview img").first();
          const cardHeight = await page
            .locator(".learning-preview")
            .first()
            .evaluate((el) => el.getBoundingClientRect().height);
          await firstImage.dispatchEvent("error");
          assert.equal(await page.locator(".learning-preview img").count(), 8);
          await page.getByText("Video preview unavailable", { exact: true }).waitFor();
          assert.equal(
            await page
              .locator(".learning-preview")
              .first()
              .evaluate((el) => el.getBoundingClientRect().height),
            cardHeight,
          );
          await page.screenshot({ path: `${out}/thumbnail-fallback.png` });
        }
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: `${out}/library-${width}-${theme}-${lang}.png` });
        assert.deepEqual(errors, []);
        console.log(
          `PASS Library ${width}px ${theme} ${lang}: embedded playback dialog, no popup, close/Escape/backdrop, focus, origin-only referrer, links, filters, no console errors`,
        );
        await context.close();
      }
} finally {
  await browser.close();
  await server.close();
}
