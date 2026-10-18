// Renders paper content blocks (paragraph, list, table, math, figure, code) with DOM APIs only – paper data is
// never inserted as HTML, so imported JSON cannot inject markup.
import { h, append } from '../app/dom.js';
import { renderTex, splitMath, mathToPlain } from '../lib/math.js';
import { isSafeImageSrc } from '../lib/schema.js';

/** Rich text: plain text with inline $…$ maths. */
export function richText(text, katex) {
  const frag = document.createDocumentFragment();
  for (const seg of splitMath(String(text ?? ''))) {
    if ('math' in seg) {
      const span = h('span', { class: 'math-inline', role: 'math', 'aria-label': mathToPlain(seg.math) });
      renderTex(katex, span, seg.math, { fallback: mathToPlain(seg.math) });
      frag.append(span);
    } else frag.append(document.createTextNode(seg.text));
  }
  return frag;
}

function table(b, katex) {
  const rows = b.rows || [];
  const t = h('table', { class: 'data-table' });
  if (b.caption) t.append(h('caption', {}, richText(b.caption, katex)));
  if (b.headers) t.append(h('thead', {}, h('tr', {}, b.headers.map((c) => h('th', { scope: 'col' }, richText(c, katex))))));
  const body = h('tbody');
  for (const r of rows) body.append(h('tr', {}, r.map((c, i) => (!b.headers && i === 0 && b.rowHeaders ? h('th', { scope: 'row' }, richText(c, katex)) : h('td', {}, richText(c, katex))))));
  t.append(body);
  return h('div', { class: 'table-wrap', tabindex: '0', role: 'region', 'aria-label': b.caption || 'Table' }, t);
}

export function renderBlock(b, katex) {
  switch (b.type) {
    case 'paragraph':
      return h('p', { class: 'para' }, richText(b.text, katex));
    case 'list':
      return h(b.ordered ? 'ol' : 'ul', { class: 'list' }, b.items.map((i) => h('li', {}, richText(i, katex))));
    case 'table':
      return table(b, katex);
    case 'math': {
      const div = h('div', { class: 'math-display', role: 'math', 'aria-label': b.fallback || mathToPlain(b.tex) });
      renderTex(katex, div, b.tex, { display: true, fallback: b.fallback });
      return div;
    }
    case 'figure': {
      if (!isSafeImageSrc(b.src)) return h('p', { class: 'para muted' }, `[figure omitted: ${b.alt || 'image'}]`);
      return h('figure', { class: 'figure' }, h('div', { class: 'figure-frame' }, h('img', { src: b.src, alt: b.alt || '', loading: 'lazy', decoding: 'async' })), b.caption ? h('figcaption', {}, b.caption) : null);
    }
    case 'code':
      return h('pre', { class: 'pre' }, h('code', {}, b.text));
    default:
      return null;
  }
}

export function renderBlocks(blocks = [], katex) {
  const frag = document.createDocumentFragment();
  append(frag, blocks.map((b) => renderBlock(b, katex)));
  return frag;
}
