// Dev helper: render a PDF page (or a cropped region) to PNG.
//   node scripts/render-page.mjs <year> <q|s> <page> [scale] [out]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas } from '@napi-rs/canvas';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function renderPage(file, pageNo, { scale = 1.5, crop = null, masks = [] } = {}) {
  const doc = await getDocument({ data: new Uint8Array(fs.readFileSync(file)), useSystemFonts: true }).promise;
  const page = await doc.getPage(pageNo);
  const vp = page.getViewport({ scale });
  const canvas = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
  // masks = [[x0, y0, x1, y1]] in PDF points (y measured from the page bottom): painted white
  for (const [mx0, my0, mx1, my1] of masks) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(mx0 * scale, (page.view[3] - my1) * scale, (mx1 - mx0) * scale, (my1 - my0) * scale);
  }
  if (!crop) return canvas.toBuffer('image/png');
  // crop = { top, bottom, left?, right? } in PDF points measured from the page bottom (pdf.js y axis)
  const H = page.view[3];
  const x0 = Math.max(0, (crop.left ?? 0) * scale);
  const x1 = Math.min(canvas.width, (crop.right ?? page.view[2]) * scale);
  const y0 = Math.max(0, (H - crop.top) * scale);
  const y1 = Math.min(canvas.height, (H - crop.bottom) * scale);
  const out = createCanvas(Math.ceil(x1 - x0), Math.ceil(y1 - y0));
  out.getContext('2d').drawImage(canvas, x0, y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0);
  return out.toBuffer('image/png');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [year, kind, page, scale = '1.5', out] = process.argv.slice(2);
  const file = path.join(root, '.cache/pdf', `${year}-${kind}.pdf`);
  const dest = out || path.join(root, '.cache/png', `${year}-${kind}-p${page}.png`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, await renderPage(file, Number(page), { scale: Number(scale) }));
  console.log(dest);
}
