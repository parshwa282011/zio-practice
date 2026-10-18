// KaTeX is loaded lazily so the archive page stays light. Rendering never throws: unparsable maths falls back
// to readable plain text.
let katexPromise = null;

export function loadMath() {
  katexPromise ??= Promise.all([import('katex'), import('katex/dist/katex.min.css')]).then(([m]) => m.default || m).catch(() => null);
  return katexPromise;
}

/** Render `tex` into `el`. Falls back to `fallback` (or the raw TeX) when KaTeX is unavailable or fails. */
export function renderTex(katex, el, tex, { display = false, fallback } = {}) {
  if (!katex) {
    el.textContent = fallback ?? tex;
    return;
  }
  try {
    katex.render(tex, el, { displayMode: display, throwOnError: true, output: 'htmlAndMathml', trust: false, strict: 'ignore' });
  } catch {
    el.textContent = fallback ?? tex;
  }
}

/** Split text containing $…$ into [{ text } | { math }] segments. A literal dollar sign is written \$ . */
export function splitMath(text) {
  const out = [];
  let buf = '';
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '\\' && text[i + 1] === '$') {
      buf += '$';
      i += 2;
    } else if (c === '$') {
      const end = text.indexOf('$', i + 1);
      if (end === -1) {
        buf += c;
        i++;
      } else {
        if (buf) out.push({ text: buf });
        buf = '';
        out.push({ math: text.slice(i + 1, end) });
        i = end + 1;
      }
    } else {
      buf += c;
      i++;
    }
  }
  if (buf) out.push({ text: buf });
  return out;
}

/** Plain-text reading of a math snippet (used as fallback and for aria-labels). */
export function mathToPlain(tex) {
  return tex
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/_\{([^}]*)\}/g, '$1')
    .replace(/\^\{([^}]*)\}/g, (_m, s) => (s.length === 1 ? `^${s}` : `^(${s})`))
    .replace(/\\([a-zA-Z]+)/g, '$1');
}
