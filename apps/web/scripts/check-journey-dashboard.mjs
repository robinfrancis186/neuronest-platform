import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { respond } from './responsive-fixtures.mjs';
const server = await createServer({ server: { port: 0, host: '127.0.0.1' } });
await server.listen();
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
try {
  await mkdir('../../output/playwright/journey-dashboard', { recursive: true });
  for (const width of [390, 1086, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 710 } });
    await page.route('**/v1/**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(respond(new URL(route.request().url()).pathname)) }));
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/audit.html?view=journey&tab=observations&child=c1`);
    await page.getByRole('heading', { name: 'What have you noticed?', exact: true }).waitFor();
    assert.equal(await page.getByRole('tablist', { name: 'Journey sections' }).count(), 0);
    for (const id of ['observations', 'screening', 'therapy']) assert.ok(await page.locator(`#journey-${id}`).isVisible());
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: `../../output/playwright/journey-dashboard/${width}.png`, fullPage: true });
    for (const name of ['Record a concern', 'Plan session']) {
      await page.getByRole('button', { name, exact: true }).click();
      await page.getByRole('dialog').waitFor();
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
    }
    await page.close();
    console.log(`Journey dashboard ${width}px passed`);
  }
} finally { await browser.close(); await server.close(); }
