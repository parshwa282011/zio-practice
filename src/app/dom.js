// Tiny DOM helper: h('button', { class: 'btn', onclick }, 'Label', child…)
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'hidden' || k === 'open') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, children);
  return el;
}

export function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

/** Replace all children of `el` (nullish/false children are skipped). */
export function fill(el, ...children) {
  clear(el);
  return append(el, children);
}

let uid = 0;
export const nextId = (prefix = 'id') => `${prefix}-${++uid}`;

/** Visually hidden live region used for polite announcements (timer warnings, results). */
export function liveRegion() {
  let el = document.getElementById('live-region');
  if (!el) {
    el = h('div', { id: 'live-region', class: 'sr-only', 'aria-live': 'polite', 'aria-atomic': 'true' });
    document.body.append(el);
  }
  return {
    say(msg) {
      el.textContent = '';
      // re-set on next frame so repeated identical messages are announced
      requestAnimationFrame(() => (el.textContent = msg));
    },
  };
}
