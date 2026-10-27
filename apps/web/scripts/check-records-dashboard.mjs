import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { fixtures, respond } from './responsive-fixtures.mjs';

const server = await createServer({ define: { 'import.meta.env.VITE_API_URL': JSON.stringify('http://127.0.0.1:8123') }, server: { port: 0, host: '127.0.0.1' } });
await server.listen();
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const sections = ['records', 'health', 'files', 'sharing'];
const recordLists = new Set(['records', 'growth', 'vaccinations', 'attachments', 'grants']);
const output = '/tmp/neuronest-records-compact';
try {
  await mkdir(output, { recursive: true });
  for (const width of [390, 1086, 1440]) {
    for (const empty of [true, false]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      let release;
      let held = 0;
      const pending = new Promise(resolve => { release = resolve; });
      await page.route('**/v1/**', async route => {
        const path = new URL(route.request().url()).pathname;
        const key = path.replace(/^\/v1\//, '').replace(/\/$/, '');
        if (empty && recordLists.has(key)) {
          held++;
          await pending;
          return route.fulfill({ json: { count: 0, next: null, results: [] } });
        }
        return route.fulfill({ json: respond(path) });
      });
      await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/audit.html?view=records&child=c1`);
      await page.getByRole('heading', { name: 'Documents & reports', exact: true }).waitFor();
      let before;
      if (empty) {
        await page.waitForFunction(() => document.querySelector('.records-dashboard h2')?.textContent === 'Aarav Nair’s health records');
        const deadline = Date.now() + 10000;
        while (held < recordLists.size && Date.now() < deadline) await page.waitForTimeout(20);
        assert.ok(held >= recordLists.size, 'All record lists must be requested before checking loading layout');
        before = await Promise.all(sections.map(id => page.locator(`#records-${id}`).boundingBox()));
        release();
      }
      await page.locator('main[aria-busy="false"]').waitFor();
      assert.equal(await page.getByRole('tablist', { name: 'Record sections' }).count(), 0);
      for (const id of sections) assert.ok(await page.locator(`#records-${id}`).isVisible());
      assert.equal(await page.locator('.records-dashboard .empty').count(), 0);
      if (empty) {
        const after = await Promise.all(sections.map(id => page.locator(`#records-${id}`).boundingBox()));
        after.forEach((box, index) => {
          assert.ok(Math.abs(box.height - before[index].height) < 2, `${sections[index]} expanded after empty results`);
          assert.ok(Math.abs(box.y - before[index].y) < 2, `${sections[index]} moved after empty results`);
        });
      } else {
        assert.equal(await page.locator('.record-card').count(), fixtures.records.results.length);
        assert.ok(await page.getByRole('heading', { name: fixtures.records.results[0].title, exact: true }).isVisible());
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: `${output}/${empty ? 'empty' : 'populated'}-${width}.png`, fullPage: true });
      for (const name of ['Add measurement', 'Share with care team']) {
        await page.getByRole('button', { name, exact: true }).click();
        await page.getByRole('dialog').waitFor();
        await page.keyboard.press('Escape');
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
      }
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`PASS records ${width}px ${empty ? 'empty: stable through loading' : 'populated: saved records visible'}; actions and overflow checked`);
    }
  }
} finally { await browser.close(); await server.close(); }
