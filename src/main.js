import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import { initTheme } from './app/theme.js';
import { route, startRouter } from './app/router.js';
import { fill, h } from './app/dom.js';
import { mountArchive } from './pages/archive.js';
import { mountPractice } from './pages/practice.js';
import { mountResults } from './pages/results.js';
import { mountStudy } from './pages/study.js';

initTheme();
const root = document.getElementById('app');
let dispose = null;

route('/', () => mountArchive(root));
route('/paper/:year', (p) => mountPractice(root, p));
route('/paper/:year/study', (p) => mountStudy(root, p));
route('/paper/:year/results', (p) => mountResults(root, p));

function notFound() {
  fill(root, h('main', { id: 'main', class: 'page' }, h('h1', {}, 'Page not found'), h('p', {}, 'That address does not match any page.'), h('a', { class: 'btn btn-primary', href: '#/' }, 'Go to the archive')));
  return () => {};
}

startRouter((m) => {
  dispose?.();
  window.scrollTo(0, 0);
  const valid = m && (!m.params.year || /^\d{4}$/.test(m.params.year));
  dispose = valid ? m.handler(m.params) : notFound();
});
