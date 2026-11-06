// Correctness guard: a fast strategy is worthless if it shows different data.
// Every strategy must report the same result count for the same filter, and the
// first rendered row must be identical.
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { startServer } from './serve.mjs';

const PORT = 4322;
const STRATEGIES = ['naive', 'optimized', 'chunked', 'virtual'];
const TERMS = ['', 'leche', 'congelados', 'zzz-no-match'];

const server = await startServer(resolve('dist/angular-list-render-bench/browser'), PORT);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] });

let failed = false;
for (const term of TERMS) {
  const seen = [];
  for (const strategy of STRATEGIES) {
    const page = await browser.newPage();
    await page.goto(`http://localhost:${PORT}/${strategy}?n=10000`);
    await page.waitForFunction(() => window.__bench);
    await page.fill('[data-testid="filter"]', term);
    await page.waitForTimeout(200);
    const count = (await page.textContent('[data-testid="count"]')).trim();
    const firstRow = (await page.locator('.row').first().textContent({ timeout: 1000 }).catch(() => ''))
      .replace(/\s+/g, ' ')
      .trim();
    seen.push({ strategy, count, firstRow });
    await page.close();
  }
  const ok = seen.every((s) => s.count === seen[0].count && s.firstRow === seen[0].firstRow);
  console.log(`${ok ? '✔' : '✘'} filtro "${term}": ${seen[0].count}`);
  if (!ok) {
    failed = true;
    console.table(seen);
  }
}

await browser.close();
server.close();
process.exit(failed ? 1 : 0);
