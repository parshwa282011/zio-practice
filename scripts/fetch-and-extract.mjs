// Offline helper: downloads the PDFs listed in scripts/sources.json into .cache/
// and dumps their text (grouped into lines, per page) as .cache/text/<year>-<q|s>.json.
// Nothing here runs in the browser or at deploy time.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cache = path.join(root, '.cache');
const sources = JSON.parse(fs.readFileSync(path.join(root, 'scripts/sources.json'), 'utf8'));

async function download(url, dest) {
  if (fs.existsSync(dest)) return;
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (zio-practice offline parser)' } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

/**
 * Group pdf.js text items into visual rows. Small-font items (sub/superscripts) are attached to the
 * nearest body-font row and tagged with script: 'sub' | 'sup'.
 * Returns pages: [{ page, width, height, rows: [{ y, items: [{ x, w, size, str, script }] }] }]
 */
export async function extractPdfLines(file) {
  const doc = await getDocument({ data: new Uint8Array(fs.readFileSync(file)), useSystemFonts: true, fontExtraProperties: true }).promise;
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    await page.getOperatorList(); // loads the fonts so their real names are available
    const fontName = (id) => {
      try {
        return String(page.commonObjs.get(id).name || '').replace(/^[A-Z]{6}\+/, '');
      } catch {
        return '';
      }
    };
    const items = tc.items
      .filter((it) => 'str' in it && it.str !== '')
      .map((it) => ({ x: it.transform[4], y: it.transform[5], w: it.width, size: Math.abs(it.transform[3]) || it.height, str: it.str, font: fontName(it.fontName) }));
    const sizeCount = new Map();
    for (const it of items) {
      const k = Math.round(it.size * 2) / 2;
      sizeCount.set(k, (sizeCount.get(k) || 0) + it.str.length);
    }
    const body = [...sizeCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 12;
    const big = items.filter((it) => it.size >= body * 0.85);
    const small = items.filter((it) => it.size < body * 0.85);
    const rows = [];
    for (const it of big) {
      let row = rows.find((r) => Math.abs(r.y - it.y) < 2.5);
      if (!row) rows.push((row = { y: it.y, items: [] }));
      row.items.push({ ...it });
    }
    for (const it of small) {
      let best = null;
      for (const r of rows) {
        const d = Math.abs(r.y - it.y);
        if (d < 7 && (!best || d < best.d)) best = { r, d };
      }
      if (best && best.d >= 0.8) {
        best.r.items.push({ ...it, script: it.y > best.r.y ? 'sup' : 'sub' });
      } else if (best) {
        best.r.items.push({ ...it });
      } else {
        rows.push({ y: it.y, items: [{ ...it }] });
      }
    }
    rows.sort((a, b) => b.y - a.y);
    for (const r of rows) {
      r.items.sort((a, b) => a.x - b.x);
      r.items = r.items.map(({ y, ...rest }) => rest);
    }
    pages.push({ page: p, width: page.view[2], height: page.view[3], body, rows });
  }
  return pages;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fs.mkdirSync(path.join(cache, 'pdf'), { recursive: true });
  fs.mkdirSync(path.join(cache, 'text'), { recursive: true });
  for (const p of sources.papers) {
    for (const [kind, url] of [['q', p.questionPaperUrl], ['s', p.answerKeyUrl]]) {
      if (!url) continue;
      const ext = url.endsWith('.txt') ? 'txt' : 'pdf';
      const raw = path.join(cache, 'pdf', `${p.year}-${kind}.${ext}`);
      await download(url, raw);
      const out = path.join(cache, 'text', `${p.year}-${kind}.json`);
      if (ext === 'txt') {
        fs.writeFileSync(out, JSON.stringify({ plain: fs.readFileSync(raw, 'utf8') }));
      } else {
        fs.writeFileSync(out, JSON.stringify({ pages: await extractPdfLines(raw) }));
      }
      console.log('ok', p.year, kind);
    }
  }
}
