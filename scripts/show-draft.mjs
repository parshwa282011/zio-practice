import fs from 'node:fs';
const [file, only] = process.argv.slice(2);
const d = JSON.parse(fs.readFileSync(file, 'utf8'));
for (const p of d.problems) {
  if (only && Number(only) !== p.number) continue;
  console.log(`\n##### P${p.number} pages ${p.sourcePages}`);
  p.content.forEach((b, bi) => {
    const k = `${bi}`.padStart(2);
    if (b.type === 'paragraph') console.log(`${k} [P]`, b.text);
    else if (b.type === 'list') b.items.forEach((i) => console.log(`${k} [${b.ordered ? '#' : '•'}]`, i));
    else if (b.type === 'table') console.log(`${k} [T] ${(b.headers || []).join(' | ')} // ` + b.rows.map((r) => r.join(' | ')).join(' // '));
    else console.log(`${k} [F]`, b.src);
  });
  for (const pt of p.parts) {
    console.log(`   (${pt.label}) ${pt.prompt}`);
    for (const b of pt.content || []) console.log('       +', b.type, b.type === 'table' ? b.rows.map((r) => r.join(' ')).join(' / ') : b.text || b.src);
  }
}
