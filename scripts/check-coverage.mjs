// Verification aid: compares the words in a question PDF with the words in the built paper JSON and prints
// what is missing from the JSON (text drawn as figures/tables-as-images will show up here) and what the JSON
// has that the PDF does not (usually fixes made by hand patches).   node scripts/check-coverage.mjs <year...>
import fs from 'node:fs';
import { flattenRows, cleanRows, cutAnswerSheet, splitSections } from './lib/parse-questions.mjs';

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
  const addBlocks = (blocks = []) => {
    for (const b of blocks) {
      if (b.type === 'paragraph' || b.type === 'code') out.push(...norm(b.text));
      else if (b.type === 'list') b.items.forEach((i) => out.push(...norm(i)));
      else if (b.type === 'table') {
        (b.headers || []).forEach((c) => out.push(...norm(c)));
        b.rows.forEach((r) => r.forEach((c) => out.push(...norm(c))));
        if (b.caption) out.push(...norm(b.caption));
      } else if (b.type === 'math') out.push(...norm(b.fallback || b.tex));
      else if (b.type === 'figure') out.push(...norm(b.alt || ''), ...norm(b.caption || ''));
    }
  };
  for (const p of paper.problems) {
    addBlocks(p.content);
    for (const part of p.parts) {
      out.push(...norm(part.label), ...norm(part.prompt));
      addBlocks(part.content);
    }
  }
  return out;
}

for (const y of process.argv.slice(2)) {
  const q = JSON.parse(fs.readFileSync(`.cache/text/${y}-q.json`, 'utf8'));
  let rows = cutAnswerSheet(flattenRows(q.pages)).filter((r) => !/^Zonal Informatics Olympiad/i.test(r.text));
  rows = cleanRows(rows);
  const { qIdx } = splitSections(rows);
  const pdf = rows.slice(qIdx === -1 ? 0 : qIdx + 1).flatMap((r) => norm(r.text));
  const paper = JSON.parse(fs.readFileSync(`src/data/papers/zio${y}.json`, 'utf8'));
  const have = new Map();
  for (const t of jsonTokens(paper)) have.set(t, (have.get(t) || 0) + 1);
  const missing = [];
  for (const t of pdf) {
    const n = have.get(t) || 0;
    if (n > 0) have.set(t, n - 1);
    else missing.push(t);
  }
  const extra = [...have.entries()].filter(([, n]) => n > 0);
  console.log(`\n== ${y}: pdf words ${pdf.length}, missing from JSON ${missing.length}`);
  if (missing.length) console.log('   missing:', missing.slice(0, 80).join(' '));
  const extraWords = extra.flatMap(([t, n]) => Array(n).fill(t));
  if (extraWords.length) console.log(`   JSON-only (${extraWords.length}):`, extraWords.slice(0, 60).join(' '));
}
