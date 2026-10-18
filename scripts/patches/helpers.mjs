// Small helpers for hand-written patches (content that the heuristic parser cannot recover).
export const P = (text) => ({ type: 'paragraph', text });
export const L = (...items) => ({ type: 'list', ordered: false, items });
export const OL = (...items) => ({ type: 'list', ordered: true, items });
export const TABLE = (headers, rows, caption = null) => ({ type: 'table', headers, rows, caption });
export const MATH = (tex, fallback) => ({ type: 'math', tex, fallback });
export const FIG = (src, alt, caption = null) => ({ type: 'figure', src, alt, caption, source: null });
export const PRE = (text) => ({ type: 'code', text });
