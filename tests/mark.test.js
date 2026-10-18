import { describe, it, expect } from 'vitest';
import { markPart, markAttempt, normalize } from '../src/lib/answer-marking/mark.js';

const paper = (parts, scoring = { perPart: 5, allCorrect: 20 }, verified = true) => ({
  metadata: { scoring, markingSchemeVerified: verified },
  problems: [{ id: 'p1', parts }],
});
const part = (id, official, extra = {}) => ({ id, label: id.slice(-1), prompt: '', officialAnswer: official, ...extra });

describe('normalize', () => {
  it('only trims by default', () => {
    expect(normalize('  42 \n', {})).toBe('42');
    expect(normalize('4 2', {})).toBe('4 2');
    expect(normalize('042', {})).toBe('042');
    expect(normalize('42.0', {})).toBe('42.0');
  });
  it('compact removes all whitespace only when the part opts in', () => {
    expect(normalize('4 1 3', { comparison: 'compact' })).toBe('413');
  });
  it('applies documented input maps', () => {
    expect(normalize('v^', { inputMap: { v: '∨', '^': '∧' } })).toBe('∨∧');
  });
});

describe('markPart', () => {
  it('marks exact answers correct and everything else incorrect', () => {
    expect(markPart(part('p1a', '65'), { p1a: ' 65 ' }).status).toBe('correct');
    expect(markPart(part('p1a', '65'), { p1a: '065' }).status).toBe('incorrect');
    expect(markPart(part('p1a', '65'), { p1a: '65.0' }).status).toBe('incorrect');
  });
  it('treats blank input as unanswered', () => {
    expect(markPart(part('p1a', '65'), {}).status).toBe('unanswered');
    expect(markPart(part('p1a', '65'), { p1a: '   ' }).status).toBe('unanswered');
  });
  it('never guesses: no official answer means ungraded', () => {
    expect(markPart(part('p1a', null), { p1a: '5' }).status).toBe('ungraded');
    expect(markPart(part('p1a', null), {}).status).toBe('unanswered');
  });
  it('accepts alternatives listed by the key', () => {
    const p = part('p1a', '08', { acceptedAnswers: ['8'] });
    expect(markPart(p, { p1a: '8' }).status).toBe('correct');
    expect(markPart(p, { p1a: '08' }).status).toBe('correct');
    expect(markPart(p, { p1a: '80' }).status).toBe('incorrect');
  });
  it('requires every graded field of a multi-field part', () => {
    const p = part('p1a', { a: '28', b: '57' }, { fields: [{ id: 'a' }, { id: 'b' }] });
    expect(markPart(p, { p1a: { a: '28', b: '57' } }).status).toBe('correct');
    expect(markPart(p, { p1a: { a: '28', b: '1' } }).status).toBe('incorrect');
    expect(markPart(p, { p1a: { a: '28' } }).status).toBe('incorrect');
  });
  it('skips ungraded fields', () => {
    const p = part('p1a', { v: '41', s: 'x y' }, { fields: [{ id: 'v' }, { id: 's', graded: false }] });
    expect(markPart(p, { p1a: { v: '41', s: 'anything' } }).status).toBe('correct');
  });
});

describe('markAttempt', () => {
  const parts = [part('p1a', '1'), part('p1b', '2'), part('p1c', '3')];
  it('gives 5 per part, and 20 when all three are correct', () => {
    expect(markAttempt(paper(parts), { p1a: '1', p1b: '2', p1c: '3' }).marks).toEqual({ obtained: 20, maximum: 20 });
    expect(markAttempt(paper(parts), { p1a: '1', p1b: '2', p1c: 'x' }).marks).toEqual({ obtained: 10, maximum: 20 });
    expect(markAttempt(paper(parts), {}).marks).toEqual({ obtained: 0, maximum: 20 });
  });
  it('reports totals', () => {
    const r = markAttempt(paper(parts), { p1a: '1', p1b: 'no' });
    expect(r.totals).toMatchObject({ correct: 1, incorrect: 1, unanswered: 1, ungraded: 0 });
  });
  it('does not compute marks unless the scheme is verified', () => {
    expect(markAttempt(paper(parts, null, false), { p1a: '1' }).marks).toBeNull();
    expect(markAttempt(paper(parts, { perPart: 5, allCorrect: 20 }, false), { p1a: '1' }).marks).toBeNull();
  });
  it('awards stated partial marks', () => {
    const p = part('p1a', { a: '1', b: '2' }, { fields: [{ id: 'a' }, { id: 'b' }], partialMarks: [{ fields: ['a'], marks: 2 }] });
    const r = markAttempt(paper([p], { perPart: 5, allCorrect: null }), { p1a: { a: '1', b: 'z' } });
    expect(r.marks.obtained).toBe(2);
  });
  it('lets the student self-mark parts that have no automatic key', () => {
    const manual = part('p1a', 'See solution', { comparison: 'manual' });
    const base = markAttempt(paper([manual]), { p1a: 'my answer' });
    expect(base.parts.p1a.status).toBe('ungraded');
    expect(markAttempt(paper([manual]), { p1a: 'my answer' }, { p1a: true }).parts.p1a.status).toBe('correct');
  });
});
