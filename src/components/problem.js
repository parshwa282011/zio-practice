import { h } from '../app/dom.js';
import { renderBlocks, richText } from './blocks.js';
import { icon } from './icons.js';
import { originalPageUrl } from '../lib/papers.js';
import { partLabel } from '../lib/schema.js';

/** The statement of one problem (heading, source links, content blocks). */
export function problemStatement(paper, problem, katex) {
  const page = problem.sourcePages?.[0];
  const url = originalPageUrl(paper, page);
  return h(
    'div',
    { class: 'statement' },
    h('h2', { tabindex: '-1', class: 'problem-heading' }, `Problem ${problem.number}`),
    h(
      'div',
      { class: 'source-links' },
      url ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, `Original paper, page ${page}`, icon('external', { size: 13 })) : null,
      paper.sourcePage ? h('a', { href: paper.sourcePage, target: '_blank', rel: 'noopener noreferrer' }, 'CodeChef archive', icon('external', { size: 13 })) : null,
    ),
    h('div', { class: 'question-body' }, renderBlocks(problem.content, katex)),
  );
}

function noPromptText(part) {
  const first = part.content?.find((b) => b.type === 'figure' || b.type === 'table');
  return first?.type === 'table' ? 'See the table below.' : first ? 'See the figure below.' : 'See the original paper.';
}

/** One test case (part): label, prompt and any tables/figures. `footer` is an optional Node placed underneath. */
export function caseItem(part, katex, { footer, id } = {}) {
  return h(
    'li',
    { class: 'case', id },
    h('span', { class: 'case-label' }, partLabel(part)),
    h('div', { class: 'case-prompt' }, part.prompt ? richText(part.prompt, katex) : h('span', { class: 'muted' }, noPromptText(part))),
    part.content?.length ? h('div', { class: 'case-extra' }, renderBlocks(part.content, katex)) : null,
    footer ? h('div', { class: 'case-foot' }, footer) : null,
  );
}
