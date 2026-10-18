import { h, fill, clear, liveRegion } from '../app/dom.js';
import { navigate } from '../app/router.js';
import { icon } from '../components/icons.js';
import { themeSwitch, siteFooter } from '../components/chrome.js';
import { confirmDialog } from '../components/dialog.js';
import { problemStatement, caseItem } from '../components/problem.js';
import { loadPaper, formatDuration, originalPageUrl } from '../lib/papers.js';
import { loadMath } from '../lib/math.js';
import { partFields, partLabel, paperStatus, STATUS } from '../lib/schema.js';
import { markAttempt, rawValue } from '../lib/answer-marking/mark.js';
import { getResult, saveResult, clearAttempt, deleteAttemptsForYear, addHistory } from '../lib/storage/local.js';
import { richText, renderBlocks } from '../components/blocks.js';

export function formatOfficial(part) {
  const a = part.officialAnswer;
  if (a == null) return null;
  if (typeof a === 'string') return a;
  return partFields(part).map((f) => `${f.label}: ${a[f.id]}`).join('\n');
}

function formatGiven(part, answers) {
  const fields = partFields(part);
  if (fields[0].id === null) {
    const v = rawValue(answers, part, null);
    return v.trim() === '' ? null : v;
  }
  const lines = fields.map((f) => `${f.label}: ${rawValue(answers, part, f.id) || '—'}`);
  return fields.every((f) => String(rawValue(answers, part, f.id)).trim() === '') ? null : lines.join('\n');
}

const STATUS_VIEW = {
  correct: { cls: 'chip-ok', icon: 'check', text: 'Correct' },
  incorrect: { cls: 'chip-bad', icon: 'x', text: 'Incorrect' },
  unanswered: { cls: 'chip-muted', icon: 'circle', text: 'Unanswered' },
  ungraded: { cls: 'chip-info', icon: 'alert', text: 'Check yourself' },
};

export function mountResults(root, { year }) {
  let disposed = false;
  fill(root, h('div', { class: 'page', id: 'main' }, h('p', { class: 'muted', role: 'status' }, 'Loading results…')));
  Promise.all([loadPaper(year), loadMath()])
    .then(([paper, katex]) => {
      if (!disposed) render(root, paper, katex);
    })
    .catch((err) => {
      if (!disposed) fill(root, h('div', { class: 'page', id: 'main' }, h('p', { class: 'notice notice-warn', role: 'alert' }, `Could not load results (${err.message}).`), h('a', { class: 'btn', href: '#/' }, 'Back to the archive')));
    });
  return () => {
    disposed = true;
  };
}

function render(root, paper, katex) {
  const year = paper.year;
  const result = getResult(year);
  document.title = `Results – ZIO ${year}`;
  if (!result) {
    fill(root, h('div', { class: 'page', id: 'main' }, h('h1', {}, `ZIO ${year}`), h('p', {}, 'There is no finished attempt to show for this paper yet.'), h('div', { class: 'row' }, h('a', { class: 'btn btn-primary', href: `#/paper/${year}` }, 'Start the paper'), h('a', { class: 'btn', href: '#/' }, 'Back to the archive'))));
    return;
  }
  const keyOk = paperStatus(paper) === STATUS.READY;
  const live = liveRegion();
  let onlyMistakes = false;
  const host = h('div', {});
  fill(root, 
    h('header', { class: 'exam-bar' }, h('div', { class: 'exam-bar-inner' }, h('a', { class: 'brand', href: '#/' }, h('span', { class: 'brand-mark', 'aria-hidden': 'true' }, 'ZIO'), h('span', { class: 'brand-name' }, 'Practice')), h('div', { class: 'exam-title' }, `ZIO ${year} · results`), themeSwitch())),
    h('main', { id: 'main', class: 'page' }, host),
    siteFooter(),
  );

  function draw() {
    const marking = markAttempt(paper, result.answers, result.selfMarks || {});
    const t = marking.totals;
    const graded = t.correct + t.incorrect;
    const summary = `${t.correct} correct, ${t.incorrect} incorrect, ${t.unanswered} unanswered${t.ungraded ? `, ${t.ungraded} to check yourself` : ''}.`;
    live.say(`Results ready. ${summary}`);
    const missing = !keyOk && h('p', { class: 'notice notice-warn' }, 'The answer key for this paper has not been verified, so automatic scoring may be incomplete. Compare with the official key linked below.');
    fill(host, 
      h('h1', { id: 'results-h', tabindex: '-1' }, `ZIO ${year}: your results`),
      h('p', { class: 'muted' }, `Finished ${new Date(result.finishedAt).toLocaleString()} · ${result.mode === 'timed' ? 'timed' : 'untimed'} · time taken ${formatDuration(result.elapsedMs)}`),
      missing || null,
      h('p', { class: 'sr-only', role: 'status' }, summary),
      h(
        'div',
        { class: 'summary-grid' },
        stat(t.correct, 'Correct', 'ok'),
        stat(t.incorrect, 'Incorrect', 'bad'),
        stat(t.unanswered, 'Unanswered', 'muted'),
        t.ungraded ? stat(t.ungraded, 'To check yourself', 'info') : null,
        marking.marks ? stat(`${marking.marks.obtained}/${marking.marks.maximum}`, 'Marks (verified scheme)', 'info') : h('div', { class: 'stat' }, h('div', { class: 'n' }, '—'), h('div', { class: 'l' }, paper.metadata.markingSchemeVerified ? 'Marks' : 'Marks: scheme not verified, not calculated')),
      ),
      paper.metadata.notes?.length ? h('div', { class: 'notice notice-info' }, paper.metadata.notes.map((n) => h('p', { style: 'margin:0 0 .3em' }, n))) : null,
      h('p', { class: 'muted' }, 'This is a practice score, not an official result, and it does not predict qualification.'),
      h('div', { class: 'toolbar' }, h('label', { class: 'row', style: 'gap:6px' }, h('input', { type: 'checkbox', checked: onlyMistakes, onchange: (e) => { onlyMistakes = e.target.checked; draw(); } }), 'Show only mistakes and unanswered'), h('button', { class: 'btn btn-sm', type: 'button', onclick: () => host.querySelectorAll('details.result-problem').forEach((d) => (d.open = true)) }, 'Expand all'), h('button', { class: 'btn btn-sm', type: 'button', onclick: () => host.querySelectorAll('details.result-problem').forEach((d) => (d.open = false)) }, 'Collapse all')),
      ...paper.problems.map((problem, pi) => problemResult(problem, marking.problems[pi], marking)),
      h('section', { class: 'data-panel', style: 'max-width:none' }, h('h2', { class: 'h3' }, 'Official sources'), h('ul', {}, link('Question paper (PDF)', paper.questionPaperUrl), link('Answer key', paper.answerKeyUrl), ...(paper.editorialUrls || []).map((e) => link(`Editorial for problem ${e.problem}`, e.url)), link('CodeChef ZIO archive', paper.sourcePage))),
      h('div', { class: 'row', style: 'margin-top:18px' }, h('button', { class: 'btn btn-primary', type: 'button', onclick: () => { deleteAttemptsForYear(year); navigate(`/paper/${year}`); } }, icon('arrowLeft', { size: 16 }), 'Retry paper'), h('a', { class: 'btn', href: '#/' }, 'Return to archive'), h('button', { class: 'btn btn-ghost', type: 'button', onclick: async () => {
        const c = await confirmDialog({ title: 'Delete this result?', body: h('p', {}, 'The saved answers and result for this paper will be deleted from this browser.'), actions: [{ id: 'no', label: 'Cancel' }, { id: 'yes', label: 'Delete', kind: 'danger' }] });
        if (c === 'yes') { deleteAttemptsForYear(year); navigate('/'); }
      } }, 'Delete this result')),
    );
  }

  const stat = (n, label, kind) => h('div', { class: `stat stat-${kind}` }, h('div', { class: 'n' }, String(n)), h('div', { class: 'l' }, label));
  const link = (label, url) => (url ? h('li', {}, h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, label, icon('external', { size: 13 }))) : null);

  function problemResult(problem, pr, marking) {
    const rows = problem.parts
      .map((part) => ({ part, res: marking.parts[part.id] }))
      .filter(({ res }) => !onlyMistakes || res.status !== 'correct');
    const open = pr.correct < problem.parts.length;
    const details = h(
      'details',
      { class: 'result-problem', open: open || !onlyMistakes ? open : true },
      h('summary', {}, `Problem ${problem.number}`, h('span', { class: 'chip chip-ok' }, icon('check', { size: 13 }), `${pr.correct} correct`), pr.incorrect ? h('span', { class: 'chip chip-bad' }, icon('x', { size: 13 }), `${pr.incorrect} incorrect`) : null, pr.unanswered ? h('span', { class: 'chip chip-muted' }, icon('circle', { size: 13 }), `${pr.unanswered} unanswered`) : null, pr.ungraded ? h('span', { class: 'chip chip-info' }, `${pr.ungraded} to check`) : null, marking.marks ? h('span', { class: 'muted', style: 'font-weight:500' }, `${pr.marks}/${pr.maxMarks} marks`) : null),
      h('div', { class: 'result-body' }, rows.length ? rows.map(({ part, res }) => partRow(problem, part, res)) : h('p', { class: 'muted' }, 'Nothing to show here.'), problem.solution?.length ? h('div', { class: 'official-solution' }, h('h4', {}, 'Official solution'), renderBlocks(problem.solution, katex)) : null, originalLink(problem)),
    );
    return details;
  }

  function originalLink(problem) {
    const page = problem.sourcePages?.[0];
    const url = originalPageUrl(paper, page);
    return url ? h('p', { class: 'muted' }, h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, `Open the original question (page ${page})`, icon('external', { size: 13 }))) : null;
  }

  function partRow(problem, part, res) {
    const view = STATUS_VIEW[res.status];
    const given = formatGiven(part, result.answers);
    const official = formatOfficial(part);
    const accepted = part.acceptedAnswers ? (Array.isArray(part.acceptedAnswers) ? part.acceptedAnswers.join(', ') : null) : null;
    return h(
      'div',
      { class: 'result-row' },
      h('span', { class: 'case-label' }, partLabel(part)),
      h(
        'div',
        {},
        h('div', { class: 'row' }, h('span', { class: `chip ${view.cls}` }, icon(view.icon, { size: 13 }), view.text), result.review?.[part.id] ? h('span', { class: 'chip chip-warn' }, icon('flag', { size: 13 }), 'You marked this for review') : null),
        h('div', { class: 'case-prompt', style: 'margin-top:6px' }, part.prompt ? richText(part.prompt, katex) : h('span', { class: 'muted' }, 'See the original paper.')),
        h('dl', { class: 'cmp' }, h('dt', {}, 'Your answer'), h('dd', {}, given ?? '(no answer)'), h('dt', {}, 'Official answer'), h('dd', {}, official ?? '(not available)'), accepted ? [h('dt', {}, 'Also accepted'), h('dd', {}, accepted)] : null),
        part.explanation ? h('p', { class: 'muted' }, part.explanation) : null,
        res.status === 'ungraded' || (part.comparison === 'manual')
          ? h('div', { class: 'self-mark', role: 'group', 'aria-label': `Self-assessment, problem ${problem.number} ${part.label ? 'part ' + part.label : 'answer'}` }, ...[['yes', 'I got it right', true], ['no', 'I got it wrong', false]].map(([v, l, val]) => h('label', {}, h('input', { type: 'radio', name: `sm-${part.id}`, checked: result.selfMarks?.[part.id] === val, onchange: () => { result.selfMarks = { ...(result.selfMarks || {}), [part.id]: val }; saveResult(result); const m = markAttempt(paper, result.answers, result.selfMarks); addHistory({ id: result.id, year, finishedAt: result.finishedAt, mode: result.mode, totals: m.totals, marks: m.marks }); draw(); } }), l)))
          : null,
      ),
    );
  }

  draw();
  document.getElementById('results-h')?.focus?.();
}
