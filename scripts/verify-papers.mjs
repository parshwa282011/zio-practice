// Verification gate. For each year it
//   1. compares the words of the question PDF with the words stored in the paper JSON (ignoring words that were
//      drawn as figures/tables, which are reviewed by eye), and
//   2. checks every transcribed official answer against the text of the answer-key file.
// Output is a report; scripts/verified.json records the years a human has signed off after reading it.
//   node scripts/verify-papers.mjs [year...]
import fs from 'node:fs';
import { flattenRows, cleanRows, cutAnswerSheet, splitSections } from './lib/parse-questions.mjs';
import { rowText } from './lib/rows.mjs';

const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const figures = read('scripts/figures.json');
const answers = read('scripts/answers.json');
const sources = read('scripts/sources.json');

const norm = (s) =>
  s
    .toLowerCase()
    .replace(/\$|\\text\{|\\xrightarrow|\\left|\\right|\\begin\{[a-z]+\}|\\end\{[a-z]+\}|\\\\|\\[a-z]+/g, ' ')
    .replace(/[_^{}]/g, ' ')
    .replace(/(\w)-\s+(\w)/g, '$1$2')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);

function jsonTokens(paper) {
  const out = [];
  const blocks = (bs = []) => {
    for (const b of bs) {
      if (b.type === 'paragraph' || b.type === 'code') out.push(...norm(b.text));
      else if (b.type === 'list') b.items.forEach((i) => out.push(...norm(i)));
      else if (b.type === 'table') {
        if (b.caption) out.push(...norm(b.caption));
        (b.headers || []).forEach((c) => out.push(...norm(c)));
        b.rows.forEach((r) => r.forEach((c) => out.push(...norm(c))));
      } else if (b.type === 'math') out.push(...norm(b.fallback || b.tex));
    }
  };
  for (const p of paper.problems) {
    blocks(p.content);
    for (const part of p.parts) {
      out.push(...norm(part.label), ...norm(part.prompt));
      blocks(part.content);
    }
  }
  return out;
}

function insideFigure(row, specs) {
  return specs.some((f) => f.page === row.page && row.y <= (f.cropTop ?? f.from + 14) + 1 && row.y >= (f.cropBottom ?? f.to - 8) - 1 && !f.table);
}

const years = process.argv.slice(2).map(Number);
const list = years.length ? years : sources.papers.map((p) => p.year);
let problems = 0;
for (const y of list.sort((a, b) => b - a)) {
  const q = read(`.cache/text/${y}-q.json`);
  let rows = cutAnswerSheet(flattenRows(q.pages)).filter((r) => !/^Zonal Informatics Olympiad/i.test(r.text));
  rows = cleanRows(rows);
  const { instrIdx, qIdx } = splitSections(rows);
  const start = qIdx !== -1 ? qIdx + 1 : instrIdx !== -1 ? rows.findIndex((r, i) => i > instrIdx && r.page > rows[instrIdx].page) : 0;
  const specs = figures[y] || [];
  const pdfRows = rows.slice(start >= 0 ? start : 0).filter((r) => !insideFigure(r, specs));
  const pdf = norm(pdfRows.map((r) => r.text).join(' '));
  const paper = read(`src/data/papers/zio${y}.json`);
  const have = new Map();
  for (const t of jsonTokens(paper)) have.set(t, (have.get(t) || 0) + 1);
  const missing = [];
  for (const t of pdf) {
    const n = have.get(t) || 0;
    if (n > 0) have.set(t, n - 1);
    else missing.push(t);
  }
  // ignore stray page/question numbers
  const real = missing.filter((t) => !/^\d{1,2}$/.test(t));
  // answers vs key text
  const keyFile = `.cache/text/${y}-s.json`;
  const key = read(keyFile);
  const keyText = (key.plain ? key.plain : key.pages.flatMap((p) => p.rows.map((r) => rowText(r))).join('\n')).toLowerCase();
  const keyTokens = new Set(norm(keyText));
  const keyCompact = keyText.replace(/[^\p{L}\p{N}]+/gu, '');
  const badAnswers = [];
  for (const pr of paper.problems)
    for (const part of pr.parts) {
      if (part.comparison === 'manual' || part.officialAnswer == null) continue;
      const vals = typeof part.officialAnswer === 'string' ? [part.officialAnswer] : Object.values(part.officialAnswer);
      for (const v of vals) { const compact = v.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ''); if (!norm(v).every((t) => keyTokens.has(t)) && !keyCompact.includes(compact)) badAnswers.push(`${part.id}:${v}`); }
    }
  const status = real.length || badAnswers.length ? 'REVIEW' : 'ok';
  if (status !== 'ok') problems++;
  console.log(`${y}: ${status}  words ${pdf.length}, unexplained missing ${real.length}${real.length ? ' [' + real.slice(0, 25).join(' ') + ']' : ''}${badAnswers.length ? `; answers not found in key: ${badAnswers.join(', ')}` : ''}`);
}
process.exitCode = problems ? 1 : 0;
