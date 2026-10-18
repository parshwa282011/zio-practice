// Everything the app remembers lives in this browser's localStorage under the "zio." prefix.
// Reads/writes are wrapped because storage can be unavailable (private windows, blocked site data) or full.

const PREFIX = 'zio.';
const memory = new Map(); // fallback when localStorage is unavailable

function available() {
  try {
    const k = `${PREFIX}__probe`;
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}
let usable = null;
const ok = () => (usable ??= available());

export function getItem(key) {
  if (!ok()) return memory.get(key) ?? null;
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return memory.get(key) ?? null;
  }
}

/** Returns { ok: true } or { ok: false, reason } (e.g. quota exceeded). */
export function setItem(key, value) {
  memory.set(key, value);
  if (!ok()) return { ok: false, reason: 'unavailable' };
  try {
    localStorage.setItem(PREFIX + key, value);
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e && e.name === 'QuotaExceededError' ? 'quota' : 'error' };
  }
}

export function removeItem(key) {
  memory.delete(key);
  try {
    if (ok()) localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

export function getJSON(key, fallback = null) {
  const raw = getItem(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export const setJSON = (key, value) => setItem(key, JSON.stringify(value));

export function storageAvailable() {
  return ok();
}

// ---- theme ---------------------------------------------------------------------------------------------------
export const getThemePref = () => getItem('theme') || 'system';
export const setThemePref = (pref) => setItem('theme', pref);

// ---- attempts ------------------------------------------------------------------------------------------------
// active attempt:  zio.attempt.<year>  = { year, mode, limitMinutes, startedAt, answers, review, current }
// finished result: zio.result.<year>   = latest finished attempt (answers + selfMarks + summary)
// history:         zio.history         = [{ id, year, finishedAt, mode, totals, marks }]
export const getAttempt = (year) => getJSON(`attempt.${year}`);
export const saveAttempt = (attempt) => setJSON(`attempt.${attempt.year}`, attempt);
export const clearAttempt = (year) => removeItem(`attempt.${year}`);
export const getResult = (year) => getJSON(`result.${year}`);
export const saveResult = (result) => setJSON(`result.${result.year}`, result);
export const getHistory = () => getJSON('history', []);

export function addHistory(entry) {
  const list = [entry, ...getHistory().filter((e) => e.id !== entry.id)].slice(0, 100);
  return setJSON('history', list);
}

export function deleteAttemptsForYear(year) {
  removeItem(`attempt.${year}`);
  removeItem(`result.${year}`);
  setJSON('history', getHistory().filter((e) => e.year !== year));
}

/** All keys the app owns. */
export function listKeys() {
  const keys = new Set(memory.keys());
  try {
    if (ok()) for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) keys.add(k.slice(PREFIX.length));
    }
  } catch {
    /* ignore */
  }
  return [...keys];
}

/** Remove every saved attempt, result and the history; keeps the theme preference. */
export function clearAllData({ keepTheme = true } = {}) {
  for (const k of listKeys()) {
    if (keepTheme && k === 'theme') continue;
    removeItem(k);
  }
}

export function approximateBytes() {
  let n = 0;
  for (const k of listKeys()) n += (getItem(k) || '').length * 2;
  return n;
}
