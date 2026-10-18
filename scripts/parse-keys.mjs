import fs from 'node:fs';
import { parseKey } from './lib/parse-keys.mjs';
for (const y of process.argv.slice(2)) {
  const j = JSON.parse(fs.readFileSync(`.cache/text/${y}-s.json`, 'utf8'));
  if (!j.pages) { console.log(y, 'plain-text key'); continue; }
  const secs = parseKey(j.pages);
  console.log(`\n== ${y}`);
  for (const s of secs) console.log(`  ${s.number}. ${s.title}\n     ` + s.parts.map((p) => `(${p.label}) ${p.answer}`).join('  |  '));
}
