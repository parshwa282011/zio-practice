import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { validatePaper, verifiedPaperWarnings, paperStatus, allParts, STATUS } from '../src/lib/schema.js';
import { markAttempt } from '../src/lib/answer-marking/mark.js';

const dir = path.resolve(__dirname, '../src/data/papers');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/manifest.json'), 'utf8'));

describe('bundled papers', () => {
  it('covers 2002–2023', () => {
    expect(files.map((f) => Number(f.match(/\d{4}/)[0]))).toEqual(Array.from({ length: 22 }, (_, i) => 2002 + i));
  });
  for (const f of files) {
    const paper = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    describe(f, () => {
      it('validates', () => expect(validatePaper(paper)).toEqual([]));
      it('has consistent verification flags', () => expect(verifiedPaperWarnings(paper)).toEqual([]));
      it('points at the official sources', () => {
        expect(paper.questionPaperUrl).toMatch(/^https:\/\/www\.iarcs\.org\.in\//);
        expect(paper.sourcePage).toBe('https://www.codechef.com/ioi/zio');
      });
      it('is reflected in the manifest', () => {
        const e = manifest.papers.find((m) => m.year === paper.year);
        expect(e.status).toBe(paperStatus(paper));
      });
      it('marks a perfect attempt of auto-markable parts as fully correct', () => {
        const answers = {};
        for (const { part } of allParts(paper)) {
          if (part.comparison === 'manual' || part.officialAnswer == null) continue;
          answers[part.id] = part.officialAnswer;
        }
        const r = markAttempt(paper, answers);
        expect(r.totals.incorrect).toBe(0);
        if (paper.metadata.markingSchemeVerified) {
          expect(r.marks.obtained).toBe(r.marks.maximum);
          expect(r.marks.maximum).toBe(paper.metadata.maximumMarks);
        }
      });
    });
  }
  it('has ready papers', () => expect(manifest.papers.some((p) => p.status === STATUS.READY)).toBe(true));
});
