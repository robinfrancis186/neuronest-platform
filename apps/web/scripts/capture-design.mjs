import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { respond } from './responsive-fixtures.mjs';

const out = new URL('../../../output/playwright/design-refresh/', import.meta.url).pathname;
await mkdir(out, { recursive: true });
const server = await createServer({ server: { port: 0 }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
try {
  for (const width of [390, 1440]) {
    for (const view of ['today', 'journey', 'assessments', 'reports', 'care', 'library', 'records', 'account', 'notifications', 'operations']) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      await page.route('**/v1/**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(respond(new URL(route.request().url()).pathname)) }));
      await page.goto(`http://localhost:${server.httpServer.address().port}/audit.html?view=${view}&role=${view === 'operations' ? 'admin' : 'parent'}&child=c1`);
      await page.locator('.app-shell').waitFor();
      await page.waitForTimeout(600);
      if (new URL(page.url()).pathname !== `/${view}`) throw Error(`Wrong page for ${view}: ${page.url()}`);
      await page.screenshot({ path: `${out}${view}-${width}.png`, fullPage: true });
      await page.close();
    }
  }
  const views = ['today', 'journey', 'assessments', 'reports', 'care', 'library', 'records', 'account', 'notifications', 'operations'];
  await writeFile(`${out}index.html`, `<!doctype html><meta name="viewport" content="width=device-width"><title>NeuroNest design review</title><style>body{font:16px system-ui;background:#f5f7f5;color:#263e37;margin:32px}section{margin:32px 0}div{display:flex;gap:20px;align-items:start}img{max-width:100%;border:1px solid #dce4dd;border-radius:12px}a:first-child{width:75%}a:last-child{width:25%}</style><h1>NeuroNest design review</h1><p>Local UI captures using synthetic fixtures. Desktop and mobile web; not production or native-device evidence.</p>${views.map(view => `<section><h2>${view}</h2><div><a href="${view}-1440.png"><img loading="lazy" src="${view}-1440.png"></a><a href="${view}-390.png"><img loading="lazy" src="${view}-390.png"></a></div></section>`).join('')}`);
  console.log(`Saved 20 local synthetic layout captures: ${out}`);
} finally { await browser.close(); await server.close(); }
