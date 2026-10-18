// Heuristic extraction of answers from an answer-key PDF (rows from pdf.js). Output is a draft for hand review.
import { flattenRows, cleanRows } from './parse-questions.mjs';
import { rowCells } from './rows.mjs';

const HEADER_RE = /^Zonal Informatics Olympiad/i;

function lastAnswer(text) {
  let t = text.replace(/(\s?\.){3,}/g, ' ').replace(/\s+/g, ' ').trim();
  const colon = t.lastIndexOf(':');
  if (/Answer\s*:/i.test(t)) t = t.replace(/^.*Answer\s*:/i, '');
  else if (colon !== -1) t = t.slice(colon + 1);
  else if (t.includes('—')) t = t.slice(t.lastIndexOf('—') + 1);
  else if (t.includes('=')) t = t.slice(t.lastIndexOf('=') + 1);
  return t.trim();
}

export function parseKey(pages) {
  let rows = cleanRows(flattenRows(pages)).filter((r) => !HEADER_RE.test(r.text) || /answer sheet/i.test(r.text) === false);
  rows = rows.filter((r) => !HEADER_RE.test(r.text));
  const sections = [];
  let cur = null;
  for (const r of rows) {
    if (/^(Marking|Qualifying cutoff|Score distribution|Partial scores)/i.test(r.text) && cur) {
      cur = null;
    }
    const m = r.text.match(/^(?:Question\s+)?(\d+)(?:\.|\s)\s*(.*)$/);
    if (m && Number(m[1]) === sections.length + 1 && !/^\(/.test(m[2]) === true) {
      cur = { number: Number(m[1]), title: m[2], rows: [] };
      sections.push(cur);
      continue;
    }
    const m2 = r.text.match(/^(\d+)\.\s+(\(a\).*)$/);
    if (m2 && Number(m2[1]) === sections.length + 1) {
      cur = { number: Number(m2[1]), title: '', rows: [{ ...r, text: m2[2] }] };
      sections.push(cur);
      continue;
    }
    if (cur) cur.rows.push(r);
  }
  return sections.map((s) => {
    const parts = [];
    for (const r of s.rows) {
      for (const c of rowCells(r.raw)) {
        const mm = c.text.match(/^\(([a-h])\)\s*(.*)$/);
        if (mm) parts.push({ label: mm[1], text: mm[2] });
        else if (parts.length) parts[parts.length - 1].text += ' ' + c.text;
      }
    }
    return { number: s.number, title: s.title, parts: parts.map((p) => ({ label: p.label, raw: p.text.trim(), answer: lastAnswer(p.text) })) };
  });
}
