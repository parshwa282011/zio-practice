// Crops the figures listed in scripts/figures.json out of the question-paper PDFs (.cache/pdf) into public/figures.
//   node scripts/make-figures.mjs [year...]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { renderPage } from './render-page.mjs';

/** Trim white borders (keeps a small margin) so crops hug the figure. */
async function trim(buf, pad = 10) {
  const img = await loadImage(buf);
  const c = createCanvas(img.width, img.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, img.width, img.height);
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    if (data[i] < 235 || data[i + 1] < 235 || data[i + 2] < 235) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return buf;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(width - 1, x1 + pad); y1 = Math.min(height - 1, y1 + pad);
  const out = createCanvas(x1 - x0 + 1, y1 - y0 + 1);
  out.getContext('2d').drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out.toBuffer('image/png');
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const figs = JSON.parse(fs.readFileSync(path.join(root, 'scripts/figures.json'), 'utf8'));
const only = process.argv.slice(2).map(String);
const outDir = path.join(root, 'public/figures');
fs.mkdirSync(outDir, { recursive: true });
for (const [year, list] of Object.entries(figs)) {
  if (year.startsWith('_') || (only.length && !only.includes(year))) continue;
  for (const f of list) {
    const file = path.join(root, '.cache/pdf', `${year}-${f.doc || 'q'}.pdf`);
    const crop = {
      top: f.cropTop ?? f.from + 10,
      bottom: f.cropBottom ?? f.to - 5,
      left: f.left ?? 60,
      right: f.right ?? 552,
    };
    const buf = await trim(await renderPage(file, f.page, { scale: 2, crop, masks: f.mask || [] }));
    fs.writeFileSync(path.join(outDir, `zio${year}-${f.id}.png`), buf);
    console.log('figure', year, f.id, buf.length);
  }
}
