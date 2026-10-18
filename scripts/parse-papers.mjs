// Draft generator: .cache/text/<year>-q.json -> .cache/draft/<year>.json  (review before committing to src/data/papers)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseQuestionPaper } from './lib/parse-questions.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const years = process.argv.slice(2).map(Number);
const figs = fs.existsSync(path.join(root, 'scripts/figures.json')) ? JSON.parse(fs.readFileSync(path.join(root, 'scripts/figures.json'), 'utf8')) : {};
fs.mkdirSync(path.join(root, '.cache/draft'), { recursive: true });
for (const y of years) {
  const q = JSON.parse(fs.readFileSync(path.join(root, `.cache/text/${y}-q.json`), 'utf8'));
  const draft = parseQuestionPaper(q.pages, { year: y, figures: figs[y] || [] });
  fs.writeFileSync(path.join(root, `.cache/draft/${y}.json`), JSON.stringify(draft, null, 2));
  console.log(y, 'instr', draft.instructions.length, 'problems', draft.problems.map((p) => `${p.number}:${p.parts.length}`).join(' '));
}
