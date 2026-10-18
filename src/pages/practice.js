import { h, fill, clear, liveRegion } from '../app/dom.js';
import { navigate } from '../app/router.js';
import { icon } from '../components/icons.js';
import { themeSwitch, siteFooter } from '../components/chrome.js';
import { confirmDialog } from '../components/dialog.js';
import { problemStatement, caseItem } from '../components/problem.js';
import { loadPaper, manifestEntry, formatDuration, describeMinutes, originalPageUrl } from '../lib/papers.js';
import { loadMath } from '../lib/math.js';
import { partFields, partLabel, paperStatus, STATUS, STATUS_LABEL } from '../lib/schema.js';
import { markAttempt, isAnswered } from '../lib/answer-marking/mark.js';
import { getAttempt, saveAttempt, clearAttempt, saveResult, addHistory } from '../lib/storage/local.js';

const WARN_AT = [600, 300, 60]; // seconds remaining at which a countdown warning is announced

export function mountPractice(root, { year }) {
  let disposed = false;
  const cleanups = [];
  const cleanup = () => {
    disposed = true;
    cleanups.forEach((fn) => fn());
  };
  fill(root, h('div', { class: 'page', id: 'main' }, h('p', { class: 'muted', role: 'status' }, 'Loading paper…')));
  Promise.all([loadPaper(year), loadMath()])
    .then(([paper, katex]) => {
      if (!disposed) run(root, paper, katex, cleanups);
    })
    .catch((err) => {
      if (disposed) return;
      fill(root, h('div', { class: 'page', id: 'main' }, h('h1', {}, `ZIO ${year}`), h('p', { class: 'notice notice-warn', role: 'alert' }, `This paper could not be loaded (${err.message}).`), h('a', { class: 'btn', href: '#/' }, 'Back to the archive')));
    });
  return cleanup;
}

function run(root, paper, katex, cleanups) {
  const year = paper.year;
  const total = paper.problems.flatMap((p) => p.parts).length;
  const entry = manifestEntry(year);
  const status = paperStatus(paper);
  const unverified = !paper.verification.questionsReviewed;
  const keyOk = paper.verification.answersReviewed && status === STATUS.READY;
  document.title = `ZIO ${year} – ZIO Practice`;
  let attempt = getAttempt(year);
  if (attempt && attempt.status !== 'active') attempt = null;

  const view = h('div', { class: 'view' });
  fill(root, view);

  const onBeforeUnload = (e) => {
    e.preventDefault();
    e.returnValue = '';
  };

  function showStart() {
    window.removeEventListener('beforeunload', onBeforeUnload);
    fill(view, startScreen());
  }

  // -------------------------------------------------------------------------------------------- start screen
  function startScreen() {
    const limit = paper.metadata.durationMinutes;
    let mode = limit ? 'timed' : 'untimed';
    const customMin = h('input', { id: 'custom-limit', class: 'input', type: 'number', min: '1', max: '600', inputmode: 'numeric', placeholder: 'minutes', style: 'max-width:9rem' });
    const customWrap = h('div', { class: 'field', hidden: true, style: 'margin:6px 0 0 28px' }, h('label', { for: 'custom-limit' }, 'Your own time limit (minutes)'), customMin, h('span', { class: 'muted' }, 'This paper does not state a time limit, so the limit is your choice. Leave empty for a stopwatch.'));
    const radio = (value, title, desc) =>
      h('label', { class: 'mode-opt' }, h('input', { type: 'radio', name: 'mode', value, checked: mode === value, onchange: () => { mode = value; customWrap.hidden = !(mode === 'timed' && !limit); } }), h('span', {}, h('span', { class: 't' }, title), h('br'), h('span', { class: 'd' }, desc)));
    customWrap.hidden = !(mode === 'timed' && !limit);

    const resume = attempt
      ? h(
          'div',
          { class: 'notice notice-info', role: 'region', 'aria-label': 'Saved attempt' },
          h('p', {}, h('strong', {}, 'You have an attempt in progress. '), `Started ${new Date(attempt.startedAt).toLocaleString()} · ${attempt.mode === 'timed' ? 'timed' : 'untimed'}.`),
          h('div', { class: 'row' }, h('button', { class: 'btn btn-primary', type: 'button', onclick: () => showExam() }, 'Resume attempt'), h('button', { class: 'btn', type: 'button', onclick: async () => {
            const c = await confirmDialog({ title: 'Discard the saved attempt?', body: h('p', {}, 'Your saved answers for this paper will be deleted and you can start again.'), actions: [{ id: 'no', label: 'Keep it' }, { id: 'yes', label: 'Discard', kind: 'danger' }] });
            if (c === 'yes') { clearAttempt(year); attempt = null; showStart(); }
          } }, 'Discard and start over')),
        )
      : null;

    return h(
      'div',
      {},
      startBar(),
      h(
        'main',
        { id: 'main', class: 'page' },
        h(
          'div',
          { class: 'start-card' },
          h('h1', {}, `ZIO ${year}`),
          unverified ? h('p', { class: 'notice notice-warn', role: 'note' }, h('strong', {}, 'Not verified yet. '), 'This paper has not been checked against the original PDF. The text may contain extraction mistakes – compare with the original if something looks wrong.') : null,
          !keyOk && !unverified ? h('p', { class: 'notice notice-warn', role: 'note' }, 'The answer key for this paper has not been verified, so automatic scoring is unavailable. You can still practise.') : null,
          paper.metadata.notes?.length && keyOk ? null : null,
          h(
            'dl',
            { class: 'facts' },
            fact('Problems', `${paper.problems.length}`),
            fact('Test cases (answerable parts)', `${total}`),
            fact('Time limit', limit ? describeMinutes(limit) : 'Not specified'),
            fact('Maximum marks', paper.metadata.markingSchemeVerified && paper.metadata.maximumMarks ? `${paper.metadata.maximumMarks}` : 'Not specified'),
            fact('Status', STATUS_LABEL[status]),
          ),
          resume,
          h('fieldset', { class: 'mode-set' }, h('legend', {}, 'How do you want to practise?'), radio('timed', 'Timed exam', limit ? `A countdown of ${describeMinutes(limit)}. The paper is submitted when time runs out.` : 'Set your own limit below, or leave it empty for a stopwatch.'), radio('untimed', 'Untimed practice', 'A stopwatch shows how long you take. No pressure.'), customWrap),
          h('p', {}, 'You may use pen and paper for working. Only the final answers are typed in. Correct answers and explanations are revealed only after you submit.'),
          paper.metadata.instructions?.length
            ? h('details', { class: 'details-box' }, h('summary', {}, 'Original instructions to candidates'), h('ol', {}, paper.metadata.instructions.map((t) => h('li', {}, t))), h('p', { class: 'muted' }, 'Quoted from the original paper. Some details (such as how answers were entered) refer to the original exam software.'))
            : null,
          h(
            'p',
            { class: 'muted' },
            'Sources: ',
            paper.questionPaperUrl ? h('a', { href: paper.questionPaperUrl, target: '_blank', rel: 'noopener noreferrer' }, 'question paper (PDF)') : null,
            paper.answerKeyUrl ? [' · ', h('a', { href: paper.answerKeyUrl, target: '_blank', rel: 'noopener noreferrer' }, 'answer key')] : null,
            ' · ',
            h('a', { href: paper.sourcePage, target: '_blank', rel: 'noopener noreferrer' }, 'CodeChef archive'),
          ),
          h('div', { class: 'row' }, h('button', { class: 'btn btn-primary', type: 'button', id: 'start-btn', onclick: async () => {
            let limitMinutes = null;
            if (mode === 'timed') {
              limitMinutes = limit ?? (customMin.value ? Number(customMin.value) : null);
              if (limit == null && customMin.value && !(Number(customMin.value) >= 1)) { customMin.focus(); return; }
            }
            if (mode === 'timed' && limitMinutes) {
              const c = await confirmDialog({ title: 'Start the timed exam?', body: h('p', {}, `The ${describeMinutes(limitMinutes)} timer starts as soon as you confirm.`), actions: [{ id: 'cancel', label: 'Not yet' }, { id: 'go', label: 'Start timer', kind: 'primary' }] });
              if (c !== 'go') return;
            }
            attempt = { year, status: 'active', mode: mode === 'timed' && limitMinutes ? 'timed' : 'untimed', limitMinutes: mode === 'timed' ? limitMinutes : null, startedAt: Date.now(), answers: {}, review: {}, current: 0 };
            saveAttempt(attempt);
            showExam();
          } }, 'Start exam'), h('a', { class: 'btn', href: `#/paper/${year}/study` }, icon('book', { size: 16 }), 'Study the questions instead'), h('a', { class: 'btn btn-ghost', href: '#/' }, 'Back to archive')),
        ),
      ),
      siteFooter(),
    );
  }

  const fact = (l, v) => h('div', { class: 'fact' }, h('dt', {}, l), h('dd', {}, v));
  const startBar = () => h('header', { class: 'exam-bar' }, h('div', { class: 'exam-bar-inner' }, h('a', { class: 'brand', href: '#/' }, h('span', { class: 'brand-mark', 'aria-hidden': 'true' }, 'ZIO'), h('span', { class: 'brand-name' }, 'Practice')), h('div', { class: 'exam-title' }), themeSwitch()));

  // -------------------------------------------------------------------------------------------- exam
  function showExam() {
    attempt = getAttempt(year) || attempt;
    attempt.current = Math.min(attempt.current || 0, paper.problems.length - 1);
    fill(view, examScreen());
    window.addEventListener('beforeunload', onBeforeUnload);
    cleanups.push(() => window.removeEventListener('beforeunload', onBeforeUnload));
    document.getElementById('question-heading')?.focus?.();
  }

  function examScreen() {
    const live = liveRegion();
    const refs = new Map(); // partId -> { inputs: Map(fieldId, input), chipHost, reviewBtn }
    const groupEls = new Map();
    const saveNote = h('p', { class: 'muted', role: 'status', style: 'font-size:.8rem;margin:8px 0 0' });
    const timerText = h('span', {}, '0:00');
    const timerEl = h('span', { class: 'timer', role: 'timer', 'aria-label': attempt.mode === 'timed' ? 'Time remaining' : 'Time elapsed' }, icon('clock', { size: 16 }), timerText);

    const persist = () => {
      const r = saveAttempt(attempt);
      saveNote.textContent = r.ok ? '' : r.reason === 'quota' ? 'Progress could not be saved: browser storage is full.' : 'Progress is not being saved: browser storage is unavailable.';
    };

    // ---- answers panel
    const countHeading = h('span', { class: 'muted', style: 'font-size:.85rem;font-weight:600' });
    const panel = h('aside', { class: 'answers', id: 'answers-panel', 'aria-labelledby': 'answers-h' }, h('h2', { id: 'answers-h' }, 'Your answers', countHeading, h('button', { class: 'btn btn-sm drawer-close', type: 'button', onclick: () => toggleDrawer(false) }, 'Close')), h('p', { class: 'muted', style: 'font-size:.85rem;margin-top:-4px' }, 'Type only the final answer for each test case.'));
    const backdrop = h('div', { class: 'drawer-backdrop', hidden: true, onclick: () => toggleDrawer(false) });
    const drawerBtn = h('button', { class: 'btn btn-primary drawer-toggle', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'answers-panel', onclick: () => toggleDrawer(!panel.classList.contains('open')) }, icon('list', { size: 16 }), h('span', {}, 'Answers'));
    function toggleDrawer(open) {
      panel.classList.toggle('open', open);
      backdrop.hidden = !open;
      drawerBtn.setAttribute('aria-expanded', String(open));
      if (open) panel.querySelector('input')?.focus();
    }

    paper.problems.forEach((problem, pi) => {
      const group = h('section', { class: 'answer-group', 'aria-labelledby': `ag-${problem.id}` });
      const count = h('span', { class: 'muted', style: 'font-weight:500;font-size:.8rem;margin-left:6px' });
      group.append(h('h3', { id: `ag-${problem.id}` }, h('button', { type: 'button', 'aria-label': `Go to problem ${problem.number}`, onclick: () => { showProblem(pi); if (window.matchMedia('(max-width: 960px)').matches) toggleDrawer(false); } }, `Problem ${problem.number}`), count));
      groupEls.set(pi, { group, count });
      for (const part of problem.parts) {
        const fields = partFields(part);
        const inputs = new Map();
        const chipHost = h('div', { class: 'status' });
        const reviewBtn = h('button', { class: 'btn btn-sm review-btn', type: 'button', 'aria-pressed': 'false', 'aria-label': `Mark problem ${problem.number} ${part.label ? 'part ' + part.label : 'answer'} for review`, title: 'Mark for review', onclick: () => toggleReview(part) }, icon('flag', { size: 14 }), h('span', { class: 'sr-only' }, 'For review'));
        const mkInput = (field, idx) => {
          const id = `in-${part.id}-${field.id ?? 'v'}`;
          const input = h('input', { id, class: 'input', type: 'text', inputmode: part.answerType === 'integer' ? 'numeric' : 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-describedby': `st-${part.id}`, value: currentValue(part, field.id), oninput: (e) => setAnswer(part, field.id, e.target.value), onfocus: () => { if (attempt.current !== pi) showProblem(pi, { focus: false }); } });
          inputs.set(field.id, input);
          return { id, input };
        };
        if (fields[0].id === null) {
          const { id, input } = mkInput(fields[0]);
          group.append(h('div', { class: 'answer-row' }, h('label', { for: id }, h('span', { class: 'sr-only' }, `Problem ${problem.number}, `), partLabel(part)), input, reviewBtn, chipHost));
          chipHost.id = `st-${part.id}`;
          if (part.comparison === 'compact' || part.inputMap) group.append(h('p', { class: 'hint' }, hintFor(part)));
        } else {
          const set = h('fieldset', { class: 'field-set' }, h('legend', {}, h('span', { class: 'sr-only' }, `Problem ${problem.number}, `), partLabel(part), ' ', reviewBtn));
          chipHost.id = `st-${part.id}`;
          for (const f of fields) {
            const { id, input } = mkInput(f);
            set.append(h('div', { class: 'sub-field' }, h('label', { for: id }, f.label), input));
          }
          set.append(h('div', { class: 'answer-row' }, h('span'), chipHost));
          group.append(set);
        }
        refs.set(part.id, { inputs, chipHost, reviewBtn, part });
      }
      panel.append(group);
    });
    panel.append(saveNote);

    function currentValue(part, fieldId) {
      const a = attempt.answers[part.id];
      if (fieldId === null) return typeof a === 'string' ? a : '';
      return a && typeof a === 'object' ? a[fieldId] || '' : '';
    }
    function hintFor(part) {
      const bits = [];
      if (part.comparison === 'compact') bits.push('Spaces are ignored when your answer is checked.');
      if (part.inputMap) bits.push(`You can type ${Object.entries(part.inputMap).map(([k, v]) => `“${k}” for ${v}`).join(', ')}.`);
      return bits.join(' ');
    }
    function setAnswer(part, fieldId, value) {
      if (fieldId === null) attempt.answers[part.id] = value;
      else attempt.answers[part.id] = { ...(typeof attempt.answers[part.id] === 'object' ? attempt.answers[part.id] : {}), [fieldId]: value };
      persist();
      updateStatus(part);
      updateCounts();
    }
    function toggleReview(part) {
      attempt.review[part.id] = !attempt.review[part.id];
      if (!attempt.review[part.id]) delete attempt.review[part.id];
      persist();
      updateStatus(part);
      updateCounts();
      renderCases();
    }
    const stateOf = (part) => ({ answered: isAnswered(attempt.answers, part), review: !!attempt.review[part.id] });
    function chips(part) {
      const s = stateOf(part);
      return [
        s.answered ? h('span', { class: 'chip chip-ok' }, icon('check', { size: 13 }), 'Answered') : h('span', { class: 'chip chip-muted' }, icon('circle', { size: 13 }), 'Unanswered'),
        s.review ? h('span', { class: 'chip chip-warn' }, icon('flag', { size: 13 }), 'For review') : null,
      ];
    }
    function updateStatus(part) {
      const r = refs.get(part.id);
      fill(r.chipHost, ...chips(part));
      const s = stateOf(part);
      r.reviewBtn.setAttribute('aria-pressed', String(s.review));
    }
    function updateCounts() {
      let answered = 0;
      paper.problems.forEach((problem, pi) => {
        const n = problem.parts.filter((p) => isAnswered(attempt.answers, p)).length;
        answered += n;
        groupEls.get(pi).count.textContent = `${n}/${problem.parts.length} answered`;
        tabCounts.get(pi).textContent = `${n}/${problem.parts.length}`;
      });
      countHeading.textContent = `${answered}/${total} answered`;
      drawerBtn.lastChild.textContent = `Answers ${answered}/${total}`;
    }

    // ---- question column
    const tabCounts = new Map();
    const tabs = h('nav', { class: 'problem-tabs', 'aria-label': 'Problems' });
    const tabEls = paper.problems.map((problem, pi) => {
      const count = h('span', { class: 'count' });
      tabCounts.set(pi, count);
      const b = h('button', { type: 'button', class: 'problem-tab', onclick: () => showProblem(pi) }, `Problem ${problem.number}`, count);
      tabs.append(b);
      return b;
    });
    const article = h('article', { class: 'question', 'aria-labelledby': 'question-heading' });
    const pager = h('div', { class: 'pager' });
    const questionCol = h('div', { class: 'question-col' }, tabs, article, pager);

    function renderCases() {
      const problem = paper.problems[attempt.current];
      const list = article.querySelector('.case-list');
      if (!list) return;
      fill(list, ...problem.parts.map((part) => caseItem(part, katex, { id: `case-${part.id}`, footer: [h('span', { class: 'case-status' }, chips(part)), h('button', { class: 'btn btn-sm', type: 'button', onclick: () => focusInput(part), 'aria-label': `Answer problem ${problem.number} ${part.label ? 'part ' + part.label : ''}` }, 'Answer'), h('button', { class: 'btn btn-sm', type: 'button', 'aria-pressed': String(!!attempt.review[part.id]), onclick: () => toggleReview(part) }, icon('flag', { size: 14 }), attempt.review[part.id] ? 'Unmark review' : 'Mark for review')] })));
    }
    function focusInput(part) {
      const wide = !window.matchMedia('(max-width: 960px)').matches;
      if (!wide) toggleDrawer(true);
      const first = refs.get(part.id).inputs.values().next().value;
      first?.focus();
    }
    function showProblem(i, { focus = true } = {}) {
      attempt.current = i;
      persist();
      const problem = paper.problems[i];
      fill(article, 
        problemStatement(paper, problem, katex),
        h('section', { class: 'cases', 'aria-labelledby': `cases-h-${i}` }, h('h3', { id: `cases-h-${i}` }, 'Test cases'), h('p', { class: 'muted', style: 'margin-top:-4px;font-size:.9rem' }, 'Enter your answers in the “Your answers” panel.'), h('ol', { class: 'case-list', type: 'a' })),
      );
      article.querySelector('.problem-heading').id = 'question-heading';
      tabEls.forEach((b, k) => (k === i ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')));
      groupEls.forEach(({ group }, k) => group.classList.toggle('current', k === i));
      renderCases();
      fill(pager, 
        h('button', { class: 'btn', type: 'button', disabled: i === 0, onclick: () => showProblem(i - 1) }, icon('arrowLeft', { size: 16 }), 'Previous'),
        h('button', { class: 'btn', type: 'button', disabled: i === paper.problems.length - 1, onclick: () => showProblem(i + 1) }, 'Next', icon('arrowRight', { size: 16 })),
      );
      if (focus) {
        article.querySelector('#question-heading')?.focus({ preventScroll: true });
        questionCol.scrollIntoView({ block: 'start' });
      }
    }

    // ---- top bar
    const submitBtn = h('button', { class: 'btn btn-primary', type: 'button', onclick: () => submit(false) }, 'Submit');
    const bar = h('header', { class: 'exam-bar' }, h('div', { class: 'exam-bar-inner' },
      h('a', { class: 'brand', href: '#/', onclick: async (e) => {
        if (attempt.mode !== 'timed') return;
        e.preventDefault();
        const c = await confirmDialog({ title: 'Leave the timed exam?', body: h('p', {}, 'Your answers are saved, but the timer keeps running while you are away.'), actions: [{ id: 'stay', label: 'Stay here', kind: 'primary' }, { id: 'leave', label: 'Leave' }], cancelId: 'stay' });
        if (c === 'leave') navigate('/');
      } }, h('span', { class: 'brand-mark', 'aria-hidden': 'true' }, 'ZIO'), h('span', { class: 'brand-name' }, 'Practice')),
      h('div', { class: 'exam-title' }, h('span', { class: 'paper-name' }, `ZIO ${year}`), attempt.mode === 'timed' ? h('span', { class: 'chip chip-info' }, 'Timed') : h('span', { class: 'chip chip-muted' }, 'Untimed')),
      timerEl, themeSwitch(), submitBtn));

    // ---- timer
    let warned = new Set();
    const elapsedMs = () => Date.now() - attempt.startedAt;
    const limitMs = () => (attempt.mode === 'timed' && attempt.limitMinutes ? attempt.limitMinutes * 60000 : null);
    let finished = false;
    function tick() {
      const limit = limitMs();
      if (limit) {
        const left = limit - elapsedMs();
        timerText.textContent = formatDuration(left);
        timerEl.classList.toggle('timer-low', left <= 300000);
        const secLeft = Math.ceil(left / 1000);
        for (const w of WARN_AT) {
          if (secLeft <= w && !warned.has(w) && secLeft > 0) {
            warned.add(w);
            live.say(`${Math.round(w / 60)} minute${w === 60 ? '' : 's'} remaining.`);
          }
        }
        if (left <= 0 && !finished) timeUp();
      } else timerText.textContent = formatDuration(elapsedMs());
    }
    async function timeUp() {
      finished = true;
      live.say('Time is up. Your answers are being submitted.');
      await confirmDialog({ title: 'Time is up', body: h('p', {}, 'The time limit has been reached. Your answers will be submitted now.'), actions: [{ id: 'ok', label: 'See my results', kind: 'primary' }], cancelId: 'ok' });
      finalize();
    }
    const timerId = setInterval(tick, 1000);
    cleanups.push(() => clearInterval(timerId));
    tick();

    // ---- submit
    async function submit() {
      const answered = paper.problems.flatMap((p) => p.parts).filter((p) => isAnswered(attempt.answers, p)).length;
      const flagged = Object.values(attempt.review).filter(Boolean).length;
      const c = await confirmDialog({
        title: 'Submit your answers?',
        body: h('div', {}, h('p', {}, `You have answered ${answered} of ${total} test cases.`), total - answered ? h('p', {}, h('strong', {}, `${total - answered} unanswered`), ' will be counted as unanswered.') : null, flagged ? h('p', {}, `${flagged} marked for review.`) : null, h('p', { class: 'muted' }, 'After you submit you cannot change your answers.')),
        actions: [{ id: 'back', label: 'Keep working' }, { id: 'submit', label: 'Submit', kind: 'primary' }],
        cancelId: 'back',
      });
      if (c === 'submit') finalize();
    }
    function finalize() {
      finished = true;
      window.removeEventListener('beforeunload', onBeforeUnload);
      const marking = markAttempt(paper, attempt.answers, {});
      const result = { id: `${year}-${Date.now()}`, year, finishedAt: Date.now(), elapsedMs: elapsedMs(), mode: attempt.mode, limitMinutes: attempt.limitMinutes, answers: attempt.answers, review: attempt.review, selfMarks: {} };
      saveResult(result);
      addHistory({ id: result.id, year, finishedAt: result.finishedAt, mode: result.mode, totals: marking.totals, marks: marking.marks });
      clearAttempt(year);
      navigate(`/paper/${year}/results`);
    }

    // initial render
    for (const problem of paper.problems) for (const part of problem.parts) updateStatus(part);
    updateCounts();
    const frag = h('div', {}, bar, h('main', { id: 'main', class: 'exam' }, questionCol, panel, drawerBtn), backdrop);
    // defer first problem render until attached so focus works
    queueMicrotask(() => showProblem(attempt.current, { focus: false }));
    return frag;
  }

  showStart();
}
