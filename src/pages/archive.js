import { h, fill, clear } from '../app/dom.js';
import { icon } from '../components/icons.js';
import { siteHeader, siteFooter } from '../components/chrome.js';
import { confirmDialog } from '../components/dialog.js';
import { getManifest, describeMinutes } from '../lib/papers.js';
import { STATUS, STATUS_LABEL } from '../lib/schema.js';
import { getHistory, clearAllData, deleteAttemptsForYear, getAttempt, storageAvailable, approximateBytes } from '../lib/storage/local.js';

const STATUS_CHIP = {
  [STATUS.READY]: { cls: 'chip-ok', icon: 'check' },
  [STATUS.NEEDS_KEY]: { cls: 'chip-warn', icon: 'alert' },
  [STATUS.IMPORT_REQUIRED]: { cls: 'chip-muted', icon: 'alert' },
};

const FILTERS = [
  ['all', 'All'],
  [STATUS.READY, 'Ready to practise'],
  [STATUS.NEEDS_KEY, 'Needs answer key'],
  [STATUS.IMPORT_REQUIRED, 'Import required'],
];

function lastResult(history, year) {
  return history.find((e) => e.year === year) || null;
}

function card(p, history) {
  const chip = STATUS_CHIP[p.status];
  const last = lastResult(history, p.year);
  const active = getAttempt(p.year);
  const unverified = !p.questionsReviewed || !p.answersReviewed;
  const tags = [
    h('span', { class: `chip ${chip.cls}` }, icon(chip.icon, { size: 14 }), STATUS_LABEL[p.status]),
    unverified ? h('span', { class: 'chip chip-warn', title: 'Not yet checked against the original PDF' }, icon('alert', { size: 14 }), 'Not verified') : null,
    p.mode === 'self-check' ? h('span', { class: 'chip chip-info' }, 'Self-check scoring') : null,
    p.mode === 'mixed' ? h('span', { class: 'chip chip-info' }, 'Partly self-check') : null,
  ];
  return h(
    'li',
    { class: 'year-card', dataset: { year: p.year } },
    h('div', { class: 'year-card-head' }, h('h2', { class: 'year-title' }, p.year), h('div', { class: 'year-tags' }, tags)),
    h(
      'dl',
      { class: 'year-meta' },
      h('div', {}, h('dt', {}, 'Problems'), h('dd', {}, p.problems ? `${p.problems} (${p.parts} test cases)` : 'Not imported')),
      h('div', {}, h('dt', {}, 'Time limit'), h('dd', {}, p.durationMinutes ? describeMinutes(p.durationMinutes) : 'Not specified')),
      h('div', {}, h('dt', {}, 'Marks'), h('dd', {}, p.markingSchemeVerified && p.maximumMarks ? `${p.maximumMarks} (verified scheme)` : 'Not specified')),
    ),
    last
      ? h('p', { class: 'last-attempt' }, icon('clock', { size: 14 }), ' Last attempt: ', lastSummary(last))
      : active
        ? h('p', { class: 'last-attempt' }, icon('clock', { size: 14 }), ' Attempt in progress – you can resume it.')
        : null,
    h(
      'div',
      { class: 'year-actions' },
      h('a', { class: 'btn btn-primary', href: `#/paper/${p.year}`, 'aria-label': `${active ? 'Resume' : 'Start'} test, ZIO ${p.year}` }, active ? 'Resume test' : 'Start test'),
      h('a', { class: 'btn', href: `#/paper/${p.year}/study`, 'aria-label': `Study questions, ZIO ${p.year}` }, icon('book', { size: 16 }), 'Study questions'),
      p.questionPaperUrl ? h('a', { class: 'btn btn-ghost', href: p.questionPaperUrl, target: '_blank', rel: 'noopener noreferrer', 'aria-label': `Original PDF, ZIO ${p.year} (opens in a new tab)` }, 'Original PDF', icon('external', { size: 14 })) : null,
    ),
  );
}

function lastSummary(e) {
  const t = e.totals;
  const bits = [`${t.correct} of ${t.correct + t.incorrect + t.unanswered + (t.ungraded || 0)} correct`];
  if (e.marks) bits.push(`${e.marks.obtained}/${e.marks.maximum} marks`);
  return bits.join(' · ');
}

export function mountArchive(root) {
  const data = getManifest();
  const history = getHistory();
  const state = { q: '', filter: 'all' };

  const search = h('input', { id: 'year-search', class: 'input', type: 'search', inputmode: 'numeric', placeholder: 'e.g. 2019', autocomplete: 'off', oninput: (e) => { state.q = e.target.value.trim(); renderList(); } });
  const filterSel = h('select', { id: 'status-filter', class: 'input', onchange: (e) => { state.filter = e.target.value; renderList(); } }, FILTERS.map(([v, l]) => h('option', { value: v }, l)));
  const list = h('ul', { class: 'year-grid', 'aria-label': 'Past papers' });
  const count = h('p', { class: 'muted result-count', role: 'status' });

  function renderList() {
    const items = data.papers.filter((p) => (!state.q || String(p.year).includes(state.q)) && (state.filter === 'all' || p.status === state.filter));
    fill(list, ...items.map((p) => card(p, history)));
    count.textContent = items.length ? `${items.length} paper${items.length === 1 ? '' : 's'}` : '';
    if (!items.length) list.append(h('li', { class: 'empty' }, h('p', {}, 'No papers match your search.'), h('button', { class: 'btn', type: 'button', onclick: () => { search.value = ''; filterSel.value = 'all'; state.q = ''; state.filter = 'all'; renderList(); } }, 'Clear search')));
  }

  const dataSection = dataPanel(history);

  fill(root, 
    siteHeader(),
    h(
      'main',
      { id: 'main', class: 'page archive' },
      h(
        'section',
        { class: 'hero' },
        h('h1', {}, 'Practise past ZIO papers'),
        h('p', { class: 'lead' }, 'Pick a year and work through the Zonal Informatics Olympiad paper in a focused test screen. Answers are checked only after you submit.'),
        h('p', { class: 'muted' }, 'Papers are taken from the ', h('a', { href: 'https://www.codechef.com/ioi/zio', target: '_blank', rel: 'noopener noreferrer' }, 'CodeChef ZIO archive'), ' so you can verify any question against the original PDF. Papers are marked as “not verified” until they have been checked.'),
      ),
      h('section', { class: 'controls', 'aria-label': 'Find a paper' }, h('div', { class: 'field' }, h('label', { for: 'year-search' }, 'Search by year'), search), h('div', { class: 'field' }, h('label', { for: 'status-filter' }, 'Show'), filterSel), count),
      list,
      dataSection,
    ),
    siteFooter(),
  );
  renderList();
  document.title = 'ZIO Practice – past Zonal Informatics Olympiad papers';
  return () => {};
}

function dataPanel(history) {
  const bytes = approximateBytes();
  const kb = Math.max(1, Math.round(bytes / 1024));
  const years = [...new Set(history.map((e) => e.year))];
  const status = h('p', { class: 'muted', role: 'status' });
  const clearBtn = h('button', { class: 'btn btn-danger', type: 'button', onclick: async () => {
    const choice = await confirmDialog({
      title: 'Clear all local data?',
      body: h('p', {}, 'This deletes every saved attempt, result and history entry stored by this site in this browser. Your theme choice is kept. This cannot be undone.'),
      actions: [{ id: 'cancel', label: 'Cancel' }, { id: 'clear', label: 'Clear local data', kind: 'danger' }],
    });
    if (choice === 'clear') {
      clearAllData();
      status.textContent = 'Local data cleared.';
      setTimeout(() => location.reload(), 500);
    }
  } }, 'Clear local data');
  return h(
    'section',
    { class: 'data-panel', 'aria-labelledby': 'data-h' },
    h('h2', { id: 'data-h', class: 'h3' }, 'Your data'),
    h('p', {}, 'There are no accounts. Active attempts, finished results and your theme choice are saved in this browser only (about ', `${kb} KB`, '). They belong to this browser profile and are lost if you clear site data or use another device.'),
    !storageAvailable() ? h('p', { class: 'notice notice-warn' }, 'Your browser is blocking local storage, so progress will not survive a refresh.') : null,
    years.length ? h('p', {}, `Saved results for: ${years.sort((a, b) => b - a).join(', ')}.`) : h('p', { class: 'muted' }, 'No saved results yet.'),
    h('div', { class: 'row' }, clearBtn),
    status,
  );
}
