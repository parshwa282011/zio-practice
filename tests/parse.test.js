import { describe, it, expect } from 'vitest';
import { rowText, wrapInlineMath, stripMath } from '../scripts/lib/rows.mjs';

const it_ = (str, x, extra = {}) => ({ str, x, w: str.length * 5, size: 12, font: 'CMR12', ...extra });

describe('row text', () => {
  it('turns math-italic runs into inline maths', () => {
    const row = { items: [it_('Let ', 0), it_('n', 20, { font: 'CMMI12' }), it_(' be odd', 26)] };
    expect(rowText(row)).toBe('Let $n$ be odd');
  });
  it('keeps subscripts inside the maths', () => {
    const row = { items: [it_('x', 0, { font: 'CMMI12' }), it_('1', 7, { script: 'sub', size: 8 })] };
    expect(rowText(row)).toBe('$x_{1}$');
  });
  it('inserts a space for real gaps only', () => {
    expect(rowText({ items: [it_('ab', 0), it_('cd', 10)] })).toBe('abcd');
    expect(rowText({ items: [it_('ab', 0), it_('cd', 20)] })).toBe('ab cd');
  });
});

describe('math helpers', () => {
  it('wraps script runs and leaves existing maths alone', () => {
    expect(wrapInlineMath('P_{1} and $x_{2}$')).toBe('$P_{1}$ and $x_{2}$');
  });
  it('gives a plain-text reading', () => {
    expect(stripMath('$x_{1}+10^{6}$')).toBe('x1+10^6');
    expect(stripMath('$a^{12}$')).toBe('a^(12)');
  });
});
