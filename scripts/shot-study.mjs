// Dev helper: full-page screenshots of the study view of a paper, split into chunks.  node scripts/shot-study.mjs <year> <outDir> [chunkHeight] [width]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const [year, outDir, chunk = '1500', width = '900'] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const ctx = await browser.newContext({ viewport: { width: Number(width), height: 900 }, colorScheme: 'light', deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto(`http://localhost:4173/#/paper/${year}/study`);
await page.waitForSelector('.question');
await page.waitForTimeout(700);
await page.evaluate(() => document.querySelectorAll('img').forEach((i) => (i.loading = 'eager')));
await page.waitForTimeout(500);
const h = await page.evaluate(() => document.documentElement.scrollHeight);
let n = 0;
for (let y = 0; y < h; y += Number(chunk)) {
  await page.screenshot({ path: `${outDir}/${year}-${String(++n).padStart(2, '0')}.png`, clip: { x: 0, y, width: Number(width), height: Math.min(Number(chunk), h - y) }, fullPage: true });
}
console.log(year, 'height', h, 'chunks', n, errors.join('|') || 'no errors');
await browser.close();
