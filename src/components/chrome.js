import { h } from '../app/dom.js';
import { icon } from './icons.js';
import { getThemePref } from '../lib/storage/local.js';
import { setTheme, onThemeChange } from '../app/theme.js';

export function themeSwitch() {
  const options = [
    ['light', 'Light', 'sun'],
    ['dark', 'Dark', 'moon'],
    ['system', 'System', 'monitor'],
  ];
  const wrap = h('div', { class: 'theme-switch', role: 'group', 'aria-label': 'Colour theme' });
  const buttons = options.map(([value, label, ic]) =>
    h('button', { type: 'button', 'aria-pressed': 'false', 'aria-label': `${label} theme`, dataset: { theme: value }, onclick: () => setTheme(value) }, icon(ic, { size: 16 }), h('span', { class: 'label' }, label)),
  );
  const sync = (pref = getThemePref()) => buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.theme === pref)));
  sync();
  onThemeChange(sync);
  wrap.append(...buttons);
  return wrap;
}

export function siteHeader({ right = [], onBrand } = {}) {
  const brand = h('a', { class: 'brand', href: '#/', onclick: onBrand }, h('span', { class: 'brand-mark', 'aria-hidden': 'true' }, 'ZIO'), h('span', { class: 'brand-name' }, 'Practice'));
  return h('header', { class: 'site-header' }, h('div', { class: 'site-header-inner' }, brand, h('div', { class: 'header-right' }, right, themeSwitch())));
}

export function siteFooter() {
  return h(
    'footer',
    { class: 'site-footer' },
    h(
      'p',
      {},
      'Question papers and answer keys come from the ',
      h('a', { href: 'https://www.codechef.com/ioi/zio', target: '_blank', rel: 'noopener noreferrer' }, 'CodeChef ZIO archive'),
      ' (hosted by ',
      h('a', { href: 'https://www.iarcs.org.in/', target: '_blank', rel: 'noopener noreferrer' }, 'IARCS'),
      '). They belong to their authors. Always check the original before relying on a question or an answer.',
    ),
    h('p', { class: 'muted' }, 'This site has no server: your answers stay in this browser and are never sent anywhere.'),
  );
}
