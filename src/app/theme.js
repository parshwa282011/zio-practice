import { getThemePref, setThemePref } from '../lib/storage/local.js';

const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
const listeners = new Set();

export function resolveTheme(pref) {
  if (pref === 'dark') return 'dark';
  if (pref === 'light') return 'light';
  return mq && mq.matches ? 'dark' : 'light';
}

export function applyTheme(pref = getThemePref()) {
  const root = document.documentElement;
  root.setAttribute('data-theme', resolveTheme(pref));
  root.setAttribute('data-theme-pref', pref);
  for (const fn of listeners) fn(pref);
}

export function setTheme(pref) {
  setThemePref(pref);
  applyTheme(pref);
}

export const onThemeChange = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export function initTheme() {
  applyTheme();
  // Follow the operating system while "System" is selected.
  mq?.addEventListener?.('change', () => {
    if (getThemePref() === 'system') applyTheme('system');
  });
}
