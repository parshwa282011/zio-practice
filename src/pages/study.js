import { h, fill, clear } from '../app/dom.js';
import { icon } from '../components/icons.js';
import { themeSwitch, siteFooter } from '../components/chrome.js';
import { problemStatement, caseItem } from '../components/problem.js';
import { loadPaper } from '../lib/papers.js';
import { loadMath } from '../lib/math.js';
import { formatOfficial } from './results.js';

export function mountStudy(root, { year }) {
  let disposed = false;
  fill(root, h('div', { class: 'page', id: 'main' }, h('p', { class: 'muted', role: 'status' }, 'Loading paper…')));
  Promise.all([loadPaper(year), loadMath()])
    .then(([paper, katex]) => {
      if (!disposed) render(root, paper, katex);
    })
    .catch((err) => {
      if (!disposed) fill(root, h('div', { class: 'page', id: 'main' }, h('p', { class: 'notice notice-warn', role: 'alert' }, `This paper could not be loaded (${err.message}).`), h('a', { class: 'btn', href: '#/' }, 'Back to the archive')));
    });
  return () => {
    disposed = true;
  };
}

function render(root, paper, katex) {
  document.title = `Study ZIO ${paper.year} – ZIO Practice`;
  const unverified = !paper.verification.questionsReviewed;
  const answersOk = paper.verification.answersReviewed;
  fill(root, 
    h('header', { class: 'exam-bar' }, h('div', { class: 'exam-bar-inner' }, h('a', { class: 'brand', href: '#/' }, h('span', { class: 'brand-mark', 'aria-hidden': 'true' }, 'ZIO'), h('span', { class: 'brand-name' }, 'Practice')), h('div', { class: 'exam-title' }, `Study · ZIO ${paper.year}`), themeSwitch(), h('a', { class: 'btn btn-primary', href: `#/paper/${paper.year}` }, 'Take it as a test'))),
    h(
      'main',
      { id: 'main', class: 'page' },
      h('h1', {}, `ZIO ${paper.year}: study the questions`),
      h('p', { class: 'muted' }, 'No timer and nothing is saved. Answers stay hidden until you choose to reveal them.'),
      unverified ? h('p', { class: 'notice notice-warn' }, 'This paper has not been verified against the original PDF yet.') : null,
      ...paper.problems.map((problem) =>
        h(
          'article',
          { class: 'question', style: 'margin-bottom:18px', 'aria-labelledby': `sh-${problem.id}` },
          problemStatement(paper, problem, katex),
          h('section', { class: 'cases' }, h('h3', {}, 'Test cases'), h('ol', { class: 'case-list', type: 'a' }, problem.parts.map((part) => caseItem(part, katex, { footer: reveal(part, answersOk) })))),
        ),
      ),
    ),
    siteFooter(),
  );
}

function reveal(part, answersOk) {
  const official = formatOfficial(part);
  if (!answersOk || official == null) return h('span', { class: 'muted' }, 'No verified answer available.');
  const out = h('div', { class: 'revealed', hidden: true, id: `rv-${part.id}` }, h('strong', {}, 'Official answer: '), h('code', { style: 'white-space:pre-wrap' }, official));
  const btn = h('button', { class: 'btn btn-sm', type: 'button', 'aria-expanded': 'false', 'aria-controls': out.id, onclick: () => {
    const show = out.hidden;
    out.hidden = !show;
    btn.setAttribute('aria-expanded', String(show));
    btn.textContent = show ? 'Hide answer' : 'Show answer';
  } }, 'Show answer');
  return [btn, out];
}
