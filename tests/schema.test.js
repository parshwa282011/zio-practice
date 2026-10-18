import { describe, it, expect } from 'vitest';
import { validatePaper, paperStatus, STATUS, isSafeImageSrc } from '../src/lib/schema.js';

const base = () => ({
  schemaVersion: 1, id: 'zio-1', year: 2001, title: 'ZIO 2001',
  metadata: { durationMinutes: null, markingSchemeVerified: false },
  verification: { questionsReviewed: true, answersReviewed: true },
  problems: [{ id: 'p1', content: [{ type: 'paragraph', text: 'x' }], parts: [{ id: 'p1a', label: 'a', prompt: 'q', officialAnswer: '1' }] }],
});

describe('paperStatus', () => {
  it('is ready only with reviewed questions and a complete reviewed key', () => {
    expect(paperStatus(base())).toBe(STATUS.READY);
  });
  it('needs an answer key when answers are unreviewed or missing', () => {
    const a = base(); a.verification.answersReviewed = false;
    expect(paperStatus(a)).toBe(STATUS.NEEDS_KEY);
    const b = base(); b.problems[0].parts[0].officialAnswer = null;
    expect(paperStatus(b)).toBe(STATUS.NEEDS_KEY);
  });
  it('requires import when questions are not reviewed or absent', () => {
    const a = base(); a.verification.questionsReviewed = false;
    expect(paperStatus(a)).toBe(STATUS.IMPORT_REQUIRED);
    expect(paperStatus({ ...base(), problems: [] })).toBe(STATUS.IMPORT_REQUIRED);
  });
});

describe('validatePaper', () => {
  it('accepts a minimal paper', () => expect(validatePaper(base())).toEqual([]));
  it('rejects duplicate ids and unknown block types', () => {
    const p = base();
    p.problems[0].parts.push({ id: 'p1a', label: 'b', prompt: '', officialAnswer: '2' });
    p.problems[0].content.push({ type: 'script', text: '<b>' });
    const e = validatePaper(p).join('\n');
    expect(e).toMatch(/duplicate id p1a/);
    expect(e).toMatch(/unknown block type/);
  });
  it('requires alt text and local sources for figures', () => {
    const p = base();
    p.problems[0].content.push({ type: 'figure', src: 'https://example.org/x.png', alt: '' });
    const e = validatePaper(p).join('\n');
    expect(e).toMatch(/figure src/);
    expect(e).toMatch(/alt text/);
  });
  it('requires a scoring rule when the marking scheme is marked verified', () => {
    const p = base(); p.metadata.markingSchemeVerified = true;
    expect(validatePaper(p).join()).toMatch(/scoring/);
  });
});

describe('isSafeImageSrc', () => {
  it('allows only relative paths and data images', () => {
    expect(isSafeImageSrc('figures/a.png')).toBe(true);
    expect(isSafeImageSrc('data:image/png;base64,AAAA')).toBe(true);
    expect(isSafeImageSrc('https://x.org/a.png')).toBe(false);
    expect(isSafeImageSrc('//x.org/a.png')).toBe(false);
    expect(isSafeImageSrc('../secret.png')).toBe(false);
    expect(isSafeImageSrc('javascript:alert(1)')).toBe(false);
  });
});
