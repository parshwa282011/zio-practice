// Heuristic parser: pdf.js rows of a ZIO question paper -> draft paper structure.
// The output is a *draft*: every paper is reviewed against its PDF before being marked verified.
import { rowText, rowCells, wrapInlineMath } from './rows.mjs';

const HEADER_RE = /^Zonal Informatics Olympiad/i;

function median(a) {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
}

/** Flatten pages into annotated rows, dropping running headers, page numbers and blank pages. */
export function flattenRows(pages) {
  const rows = [];
  for (const pg of pages) {
    for (const r of pg.rows) {
      const text = rowText(r).replace(/\s*\(\d+ marks\)\s*$/, '').trim();
      if (!text) continue;
      const x0 = r.items[0].x;
      const last = r.items[r.items.length - 1];
      rows.push({ page: pg.page, y: r.y, x0, x1: last.x + last.w, text, raw: r, pageWidth: pg.width, pageHeight: pg.height });
    }
  }
  return rows;
}

export function cleanRows(rows) {
  const out = [];
  for (const r of rows) {
    if (/^This page (is )?intentionally (left )?blank/i.test(r.text)) continue;
    if (/^\d{1,2}$/.test(r.text) && r.y < r.pageHeight * 0.17 && Math.abs(r.x0 - r.pageWidth / 2) < 25) continue; // page number
    if (/^Page \d{1,2}$/.test(r.text)) continue;
    out.push(r);
  }
  return out;
}

/** Cut rows at the first answer-sheet header; returns { questionRows, hadAnswerSheet }. */
export function cutAnswerSheet(rows) {
  const idx = rows.findIndex((r) => HEADER_RE.test(r.text) && /answer sheet/i.test(r.text));
  return idx === -1 ? rows : rows.slice(0, idx);
}

/**
 * Apply manual figure crops. A figure spec is { page, from, to, ... } where `from`/`to` are the baseline
 * y-coordinates (PDF points, bottom-up) of the first and last text rows covered. Rows inside are removed
 * and a figure marker row takes their place so reading order is preserved.
 */
export function applyFigures(rows, figures) {
  let out = rows;
  for (const f of figures) {
    if (f.crop) continue; // image-only spec (content supplied by a patch)
    const skip = f.skip || [];
    const inside = (r) => r.page === f.page && !r.figure && !r.synthetic && r.y <= f.from + 1 && r.y >= f.to - 1 && !skip.includes(r.text.replace(/\$/g, ''));
    const removed = out.filter(inside);
    if (!f.keep) out = out.filter((r) => !inside(r));
    const markerY = f.markerY ?? f.from;
    const marker = { page: f.page, y: markerY, x0: 0, x1: 0, text: '', figure: f, tableRows: f.table ? removed : null };
    let at = out.findIndex((r) => r.page > f.page || (r.page === f.page && r.y < markerY - 0.5));
    if (at === -1) at = out.length;
    if (f.label) {
      // a part label that sat inside the table: re-create it as its own row just before the table
      out.splice(at, 0, { synthetic: true, page: f.page, y: markerY + 0.5, x0: f.labelX ?? 101, x1: (f.labelX ?? 101) + 15, text: `(${f.label})`, raw: { items: [{ x: f.labelX ?? 101, w: 15, size: 12, str: `(${f.label})` }] } });
      at++;
    }
    out.splice(at, 0, marker);
  }
  return out;
}

/** Find the "Instructions" rows and the index where the problems start. */
export function splitSections(rows) {
  const instrIdx = rows.findIndex((r) => /^Instructions to candidates/i.test(r.text));
  const qIdx = rows.findIndex((r, i) => i > instrIdx && /^Questions?$/i.test(r.text));
  return { instrIdx, qIdx };
}

export function parseInstructions(rows) {
  const items = [];
  for (const r of rows) {
    const m = r.text.match(/^(\d+)\.\s+(.*)$/);
    if (m && Number(m[1]) === items.length + 1) items.push(m[2]);
    else if (items.length) items[items.length - 1] += (/-$/.test(items[items.length - 1]) ? '' : ' ') + r.text;
  }
  return items.map((s) => s.replace(/(\w)- (\w)/g, '$1$2').replace(/\s+/g, ' ').trim());
}

/** Split rows into problems by sequential "N." markers. */
export function splitProblems(rows) {
  const probs = [];
  let cur = null;
  // problem numbers hang slightly to the left of the body text
  const xs = rows.filter((r) => !r.figure).map((r) => Math.round(r.x0));
  const counts = new Map();
  xs.forEach((x) => counts.set(x, (counts.get(x) || 0) + 1));
  const bodyLeft = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 100;
  for (const r of rows) {
    const m = r.text.match(/^(\d+)\.\s+(.*)$/);
    if (m && Number(m[1]) === probs.length + 1 && !r.figure && r.x0 < bodyLeft + 6) {
      cur = { number: Number(m[1]), rows: [{ ...r, text: m[2] }] };
      probs.push(cur);
    } else if (cur) cur.rows.push(r);
  }
  return probs;
}

function isBullet(t) {
  return /^[•·▪◦-]\s+/.test(t) && !/^-\d/.test(t);
}
const BULLET_RE = /^[•·▪◦-]\s+/;
const NUM_RE = /^\d{1,2}\.\s+/;

/** Merge hyphen-broken words at line ends (TeX hyphenation: "Ques-" + "tions"). */
function joinLines(lines) {
  let s = '';
  for (const l of lines) {
    if (!s) s = l;
    else if (/[A-Za-z]-$/.test(s) && /^[a-z]/.test(l)) s = s.slice(0, -1) + l;
    else if (/[A-Za-z]-$/.test(s) && /^[A-Z][a-z]/.test(l)) s += l; // compound such as Column-Product split at the hyphen
    else s += ' ' + l;
  }
  return s.replace(/\s+/g, ' ').trim();
}

const T = (s) => wrapInlineMath(s);

/**
 * Convert rows into content blocks: paragraph | list | table | figure.
 * ctx = { pitch, rightMargin }
 */
export function rowsToBlocks(rows, ctx) {
  const blocks = [];
  let para = null; // { lines: [] }
  let list = null; // { items: [ [lines] ] }
  let table = null; // { rows: [[cells]] }
  const flush = () => {
    if (para) blocks.push({ type: 'paragraph', text: T(joinLines(para.lines)) });
    if (list) blocks.push({ type: 'list', ordered: list.ordered, items: list.items.map((ls) => T(joinLines(ls))) });
    if (table) {
      const width = Math.max(...table.rows.map((r) => r.length));
      blocks.push({ type: 'table', headers: null, rows: table.rows.map((r) => [...r, ...Array(width - r.length).fill('')].map(T)) });
    }
    para = list = table = null;
  };
  let prev = null;
  for (const r of rows) {
    if (r.figure && r.tableRows) {
      flush();
      const trs = r.tableRows.map((tr) => rowCells(tr.raw, 6).filter((c) => (r.figure.xMin == null || c.x0 >= r.figure.xMin) && (r.figure.xMax == null || c.x0 < r.figure.xMax)).filter((c, i) => !(i === 0 && /^\([a-h]\)$/.test(c.text))).map((c) => T(c.text)));
      const nonEmpty = trs.filter((x) => x.length > 0);
      const width = Math.max(...nonEmpty.map((x) => x.length));
      const padded = nonEmpty.map((x) => [...x, ...Array(width - x.length).fill('')]);
      const headers = r.figure.header === false ? null : padded[0];
      blocks.push({ type: 'table', headers, rows: headers ? padded.slice(1) : padded, caption: r.figure.caption ?? null });
      prev = r;
      continue;
    }
    if (r.figure) {
      flush();
      blocks.push({ type: 'figure', src: r.figure.src, alt: r.figure.alt, caption: r.figure.caption ?? null, source: r.figure.source ?? null });
      prev = r;
      continue;
    }
    const gap = prev && prev.page === r.page ? prev.y - r.y : 0;
    const pageBreakPara = prev && prev.page !== r.page && /[.?!:]$/.test(prev.text) && /^[A-Z(]/.test(r.text);
    const bigGap = (prev && prev.page === r.page && gap > ctx.pitch * 1.35) || pageBreakPara;
    const prevShort = prev && prev.x1 < ctx.rightMargin - 18;
    const cells = rowCells(r.raw);
    const numbered = NUM_RE.test(r.text) && r.x0 > ctx.bodyLeft + 6 && !r.text.match(/^\d+\.\s+\d/);
    const tabular = cells.length >= 3 && !isBullet(r.text) && !numbered;
    if (tabular) {
      if (!table) {
        flush();
        table = { rows: [] };
      }
      table.rows.push(cells.map((c) => c.text));
    } else if (isBullet(r.text) || numbered) {
      if (list && list.ordered !== numbered) flush();
      if (!list) {
        flush();
        list = { ordered: numbered, items: [] };
      }
      list.items.push([r.text.replace(numbered ? NUM_RE : BULLET_RE, '')]);
    } else if (list && !bigGap && !(prevShort && /^[A-Z]/.test(r.text) && list.items.length === 0)) {
      // continuation of the last list item while lines are tightly packed and previous line was full
      if (prev && !prevShort) list.items[list.items.length - 1].push(r.text);
      else {
        flush();
        para = { lines: [r.text] };
      }
    } else if (table) {
      flush();
      para = { lines: [r.text] };
    } else if (!para || bigGap || (prevShort && prev && !prev.figure)) {
      flush();
      para = { lines: [r.text] };
    } else para.lines.push(r.text);
    prev = r;
  }
  flush();
  return blocks;
}

const LETTERS = 'abcdefgh';

/** Locate the trailing "(a) (b) (c)…" group of a problem. Returns array of {rowIdx, cellIdx, letter, x0} or null. */
export function findPartStarts(rows) {
  const starts = [];
  rows.forEach((r, ri) => {
    if (r.figure) return;
    const cells = rowCells(r.raw);
    cells.forEach((c, ci) => {
      const m = c.text.match(/^\(([a-h])\)(\s|$)/);
      if (m) starts.push({ rowIdx: ri, cellIdx: ci, letter: m[1], x0: c.x0, text: c.text, cells });
    });
  });
  // last 'a' followed (later) by 'b'
  for (let i = starts.length - 1; i >= 0; i--) {
    if (starts[i].letter !== 'a') continue;
    const seq = [starts[i]];
    for (let j = i + 1; j < starts.length; j++) {
      if (starts[j].letter === LETTERS[seq.length]) seq.push(starts[j]);
    }
    if (seq.length >= 2) return seq;
  }
  return null;
}

export function parseProblem(prob, ctx, year) {
  const id = `p${prob.number}`;
  const starts = findPartStarts(prob.rows);
  let stmtRows = prob.rows;
  let parts = [];
  if (starts) {
    const firstRow = starts[0].rowIdx;
    stmtRows = prob.rows.slice(0, firstRow);
    const groupRows = prob.rows.slice(firstRow);
    // multi-column group: several part starts share a row
    const columnar = starts.filter((s) => s.rowIdx === starts[0].rowIdx).length > 1 || new Set(starts.map((s) => s.rowIdx)).size < starts.length;
    if (columnar) {
      parts = columnarParts(groupRows, starts.map((s) => ({ ...s, rowIdx: s.rowIdx - firstRow })), ctx);
    } else {
      starts.forEach((s, k) => {
        const from = s.rowIdx - firstRow;
        const to = k + 1 < starts.length ? starts[k + 1].rowIdx - firstRow : groupRows.length;
        const rs = groupRows.slice(from, to).map((r, i) => (i === 0 ? { ...r, text: r.text.replace(/^\([a-h]\)\s*/, '') } : r));
        const blocks = rowsToBlocks(rs, ctx);
        parts.push(partFromBlocks(id, s.letter, blocks));
      });
    }
  }
  const content = rowsToBlocks(stmtRows, ctx);
  const pages = [...new Set(prob.rows.map((r) => r.page))];
  return { id, number: prob.number, title: `Problem ${prob.number}`, sourcePages: pages, content, parts };
}

function partFromBlocks(pid, letter, blocks) {
  let prompt = '';
  const extra = [];
  for (const b of blocks) {
    if (b.type === 'paragraph' && !extra.length) prompt = prompt ? `${prompt}\n${b.text}` : b.text;
    else extra.push(b);
  }
  const part = { id: `${pid}${letter}`, label: letter, prompt, answerType: 'text', officialAnswer: null, marks: null, explanation: null };
  if (extra.length) part.content = extra;
  return part;
}

/**
 * Parts laid out in one or more row groups, possibly side by side in columns. A group starts at a row that
 * holds part-start cells; later rows are assigned to the column (start x0) they sit under.
 */
function columnarParts(groupRows, starts, ctx) {
  const parts = [];
  let group = null;
  const startRows = new Set(starts.map((s) => s.rowIdx));
  groupRows.forEach((r, ri) => {
    const cells = r.figure ? [] : rowCells(r.raw);
    if (startRows.has(ri)) {
      const cols = starts.filter((s) => s.rowIdx === ri).map((s) => ({ letter: s.letter, x0: s.x0, lines: [], extra: [] }));
      group = { cols };
      parts.push(...cols);
    }
    if (!group) return;
    if (r.figure) {
      group.cols[0].extra.push({ figure: r });
      return;
    }
    const colOf = (x) => {
      let k = 0;
      group.cols.forEach((c, i) => {
        if (x >= c.x0 - 3) k = i;
      });
      return k;
    };
    const perCol = new Map();
    for (const c of cells) {
      const k = colOf(c.x0);
      perCol.set(k, (perCol.get(k) ? perCol.get(k) + ' ' : '') + c.text);
    }
    for (const [k, t] of perCol) group.cols[k].lines.push(startRows.has(ri) ? t.replace(/^\([a-h]\)\s*/, '') : t);
  });
  return parts.map((c) => {
    const [first = '', ...rest] = c.lines;
    const dataLike = rest.length > 0 && rest.every((l) => l.split(/\s+/).every((tok) => tok.length <= 4));
    const part = { id: '', label: c.letter, prompt: T(dataLike ? first : [first, ...rest].join('\n').trim()), answerType: 'text', officialAnswer: null, marks: null, explanation: null };
    if (dataLike) part.content = [{ type: 'table', headers: null, rows: rest.map((l) => l.split(/\s+/).map(T)) }];
    return part;
  });
}

export function parseQuestionPaper(pages, { year, figures = [] }) {
  let rows = cutAnswerSheet(flattenRows(pages));
  rows = rows.filter((r) => !HEADER_RE.test(r.text));
  rows = cleanRows(rows);
  rows = applyFigures(rows, figures);
  const { instrIdx, qIdx } = splitSections(rows);
  const instrEnd = qIdx === -1 ? (instrIdx === -1 ? -1 : rows.findIndex((r, i) => i > instrIdx && r.page > rows[instrIdx].page)) : qIdx;
  const instructions = instrIdx === -1 ? [] : parseInstructions(rows.slice(instrIdx + 1, instrEnd === -1 ? rows.length : instrEnd));
  const qRows = rows.slice(qIdx === -1 ? (instrEnd === -1 ? 0 : instrEnd) : qIdx + 1);
  const gaps = [];
  for (let i = 1; i < qRows.length; i++) if (qRows[i].page === qRows[i - 1].page && !qRows[i].figure && !qRows[i - 1].figure) gaps.push(qRows[i - 1].y - qRows[i].y);
  const pitch = median(gaps.filter((g) => g > 5 && g < 25));
  const x1s = qRows.filter((r) => !r.figure).map((r) => r.x1).sort((a, b) => a - b);
  const rightMargin = x1s[Math.floor(x1s.length * 0.9)] || 520;
  const xs = qRows.filter((r) => !r.figure).map((r) => Math.round(r.x0));
  const cnt = new Map();
  xs.forEach((x) => cnt.set(x, (cnt.get(x) || 0) + 1));
  const bodyLeft = [...cnt.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 100;
  const ctx = { pitch: pitch || 14, rightMargin, bodyLeft };
  const problems = splitProblems(qRows).map((p) => parseProblem(p, ctx, year));
  return { instructions, problems, ctx };
}
