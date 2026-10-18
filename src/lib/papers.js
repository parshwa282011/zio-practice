import manifest from '../data/manifest.json';

const loaders = import.meta.glob('../data/papers/*.json');
const cache = new Map();

export function getManifest() {
  return manifest;
}

export function manifestEntry(year) {
  return manifest.papers.find((p) => p.year === Number(year)) || null;
}

/** Load a paper's JSON on demand (each year is its own chunk). */
export async function loadPaper(year) {
  const y = Number(year);
  if (cache.has(y)) return cache.get(y);
  const loader = loaders[`../data/papers/zio${y}.json`];
  if (!loader) throw new Error(`No data for ZIO ${y}`);
  const mod = await loader();
  const paper = mod.default || mod;
  cache.set(y, paper);
  return paper;
}

export function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function describeMinutes(min) {
  if (min == null) return 'Not specified';
  if (min % 60 === 0) return `${min / 60} hour${min === 60 ? '' : 's'}`;
  return `${min} minutes`;
}

/** Link to the original question paper at a given PDF page. */
export function originalPageUrl(paper, page) {
  const base = paper.questionPaperUrl;
  if (!base) return null;
  return /\.pdf$/i.test(base) && page ? `${base}#page=${page}` : base;
}
