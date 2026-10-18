// Turn extracted pdf.js rows into text lines with sub/superscripts and column gaps.

const SPACE_GAP = 0.22; // gap (in font-size units) above which we insert a space

const isMathFont = (it) => /^CMMI/.test(it.font || '');

const mathEscape = (t) => t.replace(/`/g, '\\ell ').replace(/([%#&$])/g, '\\$1');

/**
 * Build the text of one row. Runs set in the TeX math-italic font (CMMI) become $…$ inline maths; sub/superscripts
 * attached to them stay inside the maths, other scripts become `_{..}` / `^{..}` for wrapInlineMath.
 */
export function rowText(row) {
  const parts = []; // { math: bool, s: string }
  let prev = null;
  let i = 0;
  const items = row.items;
  const last = () => parts[parts.length - 1];
  while (i < items.length) {
    const it = items[i];
    let str = it.str;
    let script = it.script;
    if (script && str.trim() === '') script = undefined;
    if (script) {
      let j = i + 1;
      while (j < items.length && items[j].script === script) {
        str += items[j].str;
        j++;
      }
      const trailing = /\s$/.test(str);
      str = str.trim();
      const body = /^[A-Za-z]{2,}$/.test(str) ? `\\text{${str}}` : str;
      const piece = `${script === 'sub' ? '_' : '^'}{${body}}`;
      const lp = last();
      if (lp) lp.s += piece;
      else parts.push({ math: false, s: piece });
      if (trailing) parts.push({ math: false, s: ' ' });
      prev = { ...items[j - 1], str: ' ' };
      i = j;
      continue;
    }
    let sp = '';
    if (prev) {
      const gap = it.x - (prev.x + prev.w);
      if (gap > it.size * SPACE_GAP && !/\s$/.test(str.slice(0, 0)) && !/^\s/.test(str)) sp = ' ';
    }
    const fontMath = isMathFont(it);
    const hasLetter = /[A-Za-z\u0370-\u03ff`]/.test(str);
    const lp = last();
    if (sp && !(lp && /\s$/.test(lp.s))) parts.push({ math: false, s: ' ' });
    if (fontMath && hasLetter) parts.push({ math: true, s: mathEscape(str) });
    else if (fontMath) parts.push({ math: false, neutral: true, s: str }); // punctuation/digits set in the maths font
    else if (lp && !lp.math && !lp.neutral && !sp) lp.s += str;
    else parts.push({ math: false, s: str });
    prev = it;
    i++;
  }
  const mathAhead = (k) => {
    for (let n = k + 1; n < parts.length; n++) {
      if (parts[n].math) return true;
      if (parts[n].neutral || parts[n].s.trim() === '') continue;
      return false;
    }
    return false;
  };
  let out = '';
  let inMath = false;
  let pending = '';
  parts.forEach((p, k) => {
    if (p.math) {
      const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(p.s);
      if (!inMath) {
        out += pending + m[1] + '$';
        inMath = true;
      } else out += pending + m[1];
      pending = '';
      out += m[2];
      pending = m[3];
    } else if (inMath && (p.neutral || p.s.trim() === '') && mathAhead(k)) {
      out += pending + p.s;
      pending = '';
    } else {
      if (inMath) {
        out += '$';
        inMath = false;
      }
      out += pending + p.s;
      pending = '';
    }
  });
  if (inMath) out += '$';
  out += pending;
  return fixGlyphs(out.replace(/\s+/g, ' ').trim());
}

/** TeX glyphs that pdf.js extracts as odd characters. */
export function fixGlyphs(t) {
  return t.replace(/(^|\s)6=(\s|$)/g, '$1≠$2').replace(/`/g, 'ℓ');
}

/** Split a row into cells wherever there is a horizontal gap larger than `minGap` points. */
export function rowCells(row, minGap = 9) {
  const cells = [];
  let cur = null;
  for (const it of row.items) {
    if (it.str.trim() === '') {
      // a wide whitespace item is a column separator (TeX \\hfill / tab)
      if (cur && it.w > minGap) {
        cells.push(cur);
        cur = null;
      }
      if (!cur) continue;
    }
    if (cur && (it.x - cur.x1 > minGap || (/^\([a-h]\)/.test(it.str) && cur.items.length))) {
      cells.push(cur);
      cur = null;
    }
    if (!cur) cur = { x0: it.x, x1: it.x + it.w, items: [] };
    cur.items.push(it);
    cur.x1 = Math.max(cur.x1, it.x + it.w);
  }
  if (cur) cells.push(cur);
  return cells
    .map((c) => ({ x0: c.x0, x1: c.x1, text: rowText({ items: c.items }) }))
    .filter((c) => c.text !== '');
}

/** Wrap `base_{sub}` / `base^{sup}` runs in $…$ so KaTeX can render them (text already inside $…$ is left alone). */
export function wrapInlineMath(text) {
  return text
    .split(/(\$[^$]*\$)/)
    .map((seg, i) =>
      i % 2 === 1
        ? seg
        : seg.replace(/([A-Za-z0-9()]+|\d+(?:\.\d+)?)((?:[_^]\{(?:[^{}]|\{[^{}]*\})*\})+)/g, (_m, base, scripts) => `$${base}${scripts}$`),
    )
    .join('');
}

/** Plain-text version of text containing $…$ math, used as a readable fallback. */
export function stripMath(text) {
  return text
    .replace(/\$([^$]*)\$/g, (_m, tex) =>
      tex
        .replace(/\\text\{([^}]*)\}/g, '$1')
        .replace(/_\{([^}]*)\}/g, '$1')
        .replace(/\^\{([^}]*)\}/g, (_n, s) => (s.length === 1 ? `^${s}` : `^(${s})`)),
    );
}
