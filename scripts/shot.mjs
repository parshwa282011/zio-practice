// Dev helper: screenshot pages of the running preview server.  node scripts/shot.mjs <hash> <out.png> [width] [height] [dark]
import { chromium } from 'playwright-core';
const [hash = '/', out = 'shot.png', w = '1280', hgt = '900', theme = 'light'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const ctx = await browser.newContext({ viewport: { width: Number(w), height: Number(hgt) }, colorScheme: theme });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto(`http://localhost:4173/#${hash}`);
await page.waitForTimeout(800);
await page.screenshot({ path: out, fullPage: false });
console.log(errors.length ? errors.join('\n') : 'no errors');
await browser.close();
