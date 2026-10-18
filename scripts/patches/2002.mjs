import fs from 'node:fs';
import { PRE } from './helpers.mjs';

// The 2002 key is a plain-text file ("Model Solutions"); each problem's section is shown as preformatted text.
function sections() {
  const file = new URL('../../.cache/pdf/2002-s.txt', import.meta.url);
  const text = fs.readFileSync(file, 'utf8').replace(/\r/g, '');
  const lines = text.split('\n');
  const out = {};
  let cur = null;
  for (const line of lines) {
    const m = line.match(/^(\d)\. /);
    if (m) cur = out[m[1]] = [];
    if (/^={10,}/.test(line)) cur = null;
    if (cur) cur.push(line.replace(/\s+$/, ''));
  }
  const clean = {};
  for (const [k, ls] of Object.entries(out)) {
    while (ls.length && ls[ls.length - 1] === '') ls.pop();
    clean[k] = ls.join('\n');
  }
  return clean;
}

const secs = sections();
const solution = (n) => () => [PRE(secs[n])];

export default {
  problems: {
    1: { solution: solution(1) },
    2: { solution: solution(2) },
    3: { solution: solution(3) },
    4: { solution: solution(4) },
    5: { solution: solution(5) },
    6: { solution: solution(6), parts: () => [{ label: '', prompt: 'What is the relationship between the colour of the last marble and the starting contents of the bucket?' }] },
  },
};
