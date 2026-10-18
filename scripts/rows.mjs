// Dev helper: list rows of a page with y / x0 so figure crops can be specified.
//   node scripts/rows.mjs <year> <q|s> <page>
import fs from 'node:fs';
import { rowText } from './lib/rows.mjs';
const [year, kind, page] = process.argv.slice(2);
const j = JSON.parse(fs.readFileSync(`.cache/text/${year}-${kind}.json`, 'utf8'));
const pg = j.pages[Number(page) - 1];
console.log(`page ${page} width ${pg.width} height ${pg.height}`);
for (const r of pg.rows) console.log(`${r.y.toFixed(0).padStart(4)} x${Math.round(r.items[0].x).toString().padStart(3)}  ${rowText(r).slice(0, 110)}`);
