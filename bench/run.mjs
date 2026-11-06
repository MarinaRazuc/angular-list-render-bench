// Benchmark harness: runs every strategy × size in a fresh browser context and records
// initial render, filter latency, scroll smoothness, DOM size and JS heap.
//
//   npm run bench                         # defaults below
//   SIZES=1000,10000 RUNS=3 CPU=4 npm run bench
//   CHROME_PATH=/usr/bin/google-chrome npm run bench   # use a system Chrome
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { startServer } from './serve.mjs';

const STRATEGIES = (process.env.STRATEGIES ?? 'naive,optimized,chunked,virtual').split(',');
const SIZES = (process.env.SIZES ?? '1000,10000,50000').split(',').map(Number);
const RUNS = Number(process.env.RUNS ?? 5);
const CPU = Number(process.env.CPU ?? 4); // CPU throttling factor (4 ≈ mid-range laptop / phone)
const FILTER_TERM = 'leche';
const PORT = 4321;

const root = resolve('dist/angular-list-render-bench/browser');
const server = await startServer(root, PORT);
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--no-sandbox', '--enable-precise-memory-info'],
});

// Collected inside the page from the very first script.
const initScript = () => {
  window.__longTasks = [];
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) window.__longTasks.push({ start: e.startTime, duration: e.duration });
  }).observe({ type: 'longtask', buffered: true });
};

// Interaction → next paint, measured in the page: dispatch, then wait for rAF + task.
const interact = async (page, value) =>
  page.evaluate(async (v) => {
    const input = document.querySelector('[data-testid="filter"]');
    const t0 = performance.now();
    input.value = v;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
    return performance.now() - t0;
  }, value);

const scrollThrough = (page) =>
  page.evaluate(async () => {
    const vp = document.querySelector('[data-testid="viewport"]');
    const frames = [];
    let last = performance.now();
    const t0 = last;
    for (let i = 0; i < 40; i++) {
      vp.scrollTop += 1500; // 40 × 1500px ≈ 1,650 rows
      await new Promise((r) => requestAnimationFrame(r));
      const now = performance.now();
      frames.push(now - last);
      last = now;
    }
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
    frames.sort((a, b) => a - b);
    return {
      totalMs: performance.now() - t0,
      p95FrameMs: frames[Math.floor(frames.length * 0.95)],
      longFrames: frames.filter((f) => f > 50).length,
      domNodes: document.getElementsByTagName('*').length,
    };
  });

async function measureOnce(strategy, rows) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.addInitScript(initScript);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });

  await page.goto(`http://localhost:${PORT}/${strategy}?n=${rows}`);
  await page.waitForFunction(() => window.__bench, null, { timeout: 180_000 });
  const ready = await page.evaluate(() => window.__bench);
  const tbt = await page.evaluate(() =>
    window.__longTasks
      .filter((t) => t.start < window.__bench.readyMs)
      .reduce((sum, t) => sum + Math.max(0, t.duration - 50), 0),
  );

  await cdp.send('HeapProfiler.collectGarbage');
  const { usedSize } = await cdp.send('Runtime.getHeapUsage');

  const filterMs = await interact(page, FILTER_TERM);
  const clearMs = await interact(page, '');
  const scroll = await scrollThrough(page);

  await context.close();
  return {
    readyMs: ready.readyMs,
    tbtMs: tbt,
    domNodes: ready.domNodes,
    heapMB: usedSize / 1024 / 1024,
    filterMs,
    clearFilterMs: clearMs,
    scrollP95FrameMs: scroll.p95FrameMs,
    scrollLongFrames: scroll.longFrames,
    domNodesAfterScroll: scroll.domNodes,
  };
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const results = [];
for (const rows of SIZES) {
  for (const strategy of STRATEGIES) {
    const runs = [];
    for (let i = 0; i < RUNS; i++) runs.push(await measureOnce(strategy, rows));
    const summary = Object.fromEntries(Object.keys(runs[0]).map((k) => [k, median(runs.map((r) => r[k]))]));
    results.push({ strategy, rows, runs: RUNS, ...summary });
    console.log(`${String(rows).padStart(6)} ${strategy.padEnd(10)} ready ${summary.readyMs.toFixed(0)} ms · filter ${summary.filterMs.toFixed(0)} ms · DOM ${summary.domNodes}`);
  }
}

await browser.close();
server.close();

// ---- Report -------------------------------------------------------------
const fmt = (n, d = 0) => n.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });
const LABELS = { naive: 'Naive', optimized: 'Signals + track', chunked: 'Render incremental', virtual: 'Virtual scroll (CDK)' };

let md = `_Mediana de ${RUNS} corridas · Chrome headless · CPU ×${CPU} · ${new Date().toISOString().slice(0, 10)}_\n`;
for (const rows of SIZES) {
  const rowsFor = results.filter((r) => r.rows === rows);
  const base = rowsFor.find((r) => r.strategy === 'naive');
  md += `\n### ${fmt(rows)} filas\n\n`;
  md += '| Estrategia | Primer render | vs. naive | TBT | Filtrar | Quitar filtro | Scroll p95 frame | Nodos DOM | Heap JS |\n';
  md += '|---|--:|--:|--:|--:|--:|--:|--:|--:|\n';
  for (const r of rowsFor) {
    const speedup = base ? `${fmt(base.readyMs / r.readyMs, 1)}×` : '–';
    md += `| ${LABELS[r.strategy] ?? r.strategy} | ${fmt(r.readyMs)} ms | ${speedup} | ${fmt(r.tbtMs)} ms | ${fmt(r.filterMs)} ms | ${fmt(r.clearFilterMs)} ms | ${fmt(r.scrollP95FrameMs, 1)} ms | ${fmt(r.domNodes)} | ${fmt(r.heapMB, 1)} MB |\n`;
  }
}

await mkdir('results', { recursive: true });
await writeFile('results/results.json', JSON.stringify({ cpuThrottling: CPU, runs: RUNS, results }, null, 2));
await writeFile('results/RESULTS.md', md);

// Keep the README table in sync between the markers.
const readme = await readFile('README.md', 'utf8').catch(() => null);
if (readme?.includes('<!-- results:start -->')) {
  await writeFile(
    'README.md',
    readme.replace(/<!-- results:start -->[\s\S]*<!-- results:end -->/, `<!-- results:start -->\n${md}\n<!-- results:end -->`),
  );
}
console.log('\nResultados en results/RESULTS.md y results/results.json');
