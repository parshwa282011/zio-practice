// CI check: every bundled paper validates, its figures exist, ids are unique and the manifest matches.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePaper, verifiedPaperWarnings, paperStatus } from '../src/lib/schema.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'src/data/papers');
let bad = 0;
const fail = (m) => { console.error('FAIL', m); bad++; };

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src/data/manifest.json'), 'utf8'));
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
if (files.length !== manifest.papers.length) fail(`manifest lists ${manifest.papers.length} papers but ${files.length} files exist`);

for (const f of files) {
  const paper = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  for (const e of validatePaper(paper)) fail(`${f}: ${e}`);
  for (const w of verifiedPaperWarnings(paper)) fail(`${f}: ${w}`);
  const srcs = [];
  const walk = (bs = []) => bs.forEach((b) => b.type === 'figure' && srcs.push(b.src));
  for (const p of paper.problems) { walk(p.content); walk(p.solution); p.parts.forEach((x) => walk(x.content)); }
  for (const s of srcs) if (!s.startsWith('data:') && !fs.existsSync(path.join(root, 'public', s))) fail(`${f}: missing figure ${s}`);
  const entry = manifest.papers.find((m) => m.year === paper.year);
  if (!entry || entry.status !== paperStatus(paper)) fail(`${f}: manifest entry out of date (run node scripts/build-papers.mjs)`);
}
console.log(bad ? `${bad} problem(s)` : `${files.length} papers valid`);
process.exitCode = bad ? 1 : 0;
