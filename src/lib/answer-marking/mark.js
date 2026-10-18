// Marking rules. Comparison is deliberately strict:
//   - answers are only trimmed (leading/trailing whitespace) before comparing;
//   - a part may opt in to `comparison: "compact"` (all whitespace removed) and/or `inputMap` (single-character
//     substitutions such as v → ∨) – these are stored with the paper and shown to the student;
//   - `acceptedAnswers` lists other answers the official key accepts.
// Nothing is ever guessed: a part without an official answer is never marked.
import { allParts, isAutoMarkable, partFields } from '../schema.js';

export function normalize(value, part) {
  let s = String(value ?? '').trim();
  if (part.inputMap) s = [...s].map((c) => part.inputMap[c] ?? c).join('');
  if (part.comparison === 'compact') s = s.replace(/\s+/g, '');
  return s;
}

function acceptedFor(part, fieldId) {
  if (fieldId === null) return part.acceptedAnswers || [];
  return part.acceptedAnswers?.[fieldId] || [];
}

function officialFor(part, fieldId) {
  return fieldId === null ? part.officialAnswer : part.officialAnswer?.[fieldId];
}

/** Read the student's raw value for a field from an answers object. */
export function rawValue(answers, part, fieldId) {
  const a = answers?.[part.id];
  if (fieldId === null) return typeof a === 'string' ? a : '';
  return a && typeof a === 'object' ? a[fieldId] ?? '' : '';
}

export function isAnswered(answers, part) {
  return partFields(part).some((f) => String(rawValue(answers, part, f.id)).trim() !== '');
}

/**
 * Mark one part. Returns { status, fieldResults, marks }.
 * status: 'unanswered' | 'correct' | 'incorrect' | 'ungraded' (no key / manual comparison)
 */
export function markPart(part, answers) {
  if (!isAutoMarkable(part)) return { status: isAnswered(answers, part) ? 'ungraded' : 'unanswered', fieldResults: {} };
  const fields = partFields(part);
  const fieldResults = {};
  for (const f of fields) {
    if (!f.graded) continue;
    const given = normalize(rawValue(answers, part, f.id), part);
    const options = [officialFor(part, f.id), ...acceptedFor(part, f.id)].filter((x) => x != null).map((x) => normalize(x, part));
    fieldResults[f.id ?? 'value'] = given !== '' && options.includes(given);
  }
  if (!isAnswered(answers, part)) return { status: 'unanswered', fieldResults };
  const graded = Object.values(fieldResults);
  const all = graded.length > 0 && graded.every(Boolean);
  return { status: all ? 'correct' : 'incorrect', fieldResults };
}

/** Marks for one part (only meaningful when the paper's scheme is verified). */
function partMarks(part, result, perPart) {
  if (result.status === 'correct') return part.marks ?? perPart ?? 0;
  if (result.status === 'incorrect' && part.partialMarks) {
    let best = 0;
    for (const rule of part.partialMarks) {
      if (rule.fields.every((id) => result.fieldResults[id])) best = Math.max(best, rule.marks);
    }
    return best;
  }
  return 0;
}

/**
 * Mark a whole attempt.
 * answers: { [partId]: string | { [fieldId]: string } }
 * selfMarks: { [partId]: boolean } for parts without an auto-markable key.
 */
export function markAttempt(paper, answers, selfMarks = {}) {
  const totals = { correct: 0, incorrect: 0, unanswered: 0, ungraded: 0 };
  const parts = {};
  const problems = [];
  const scoring = paper.metadata?.scoring;
  const marksOk = paper.metadata?.markingSchemeVerified === true && !!scoring;
  let obtained = 0;
  let maximum = 0;
  for (const problem of paper.problems) {
    const p = { id: problem.id, correct: 0, incorrect: 0, unanswered: 0, ungraded: 0, marks: 0, maxMarks: 0 };
    let allCorrect = problem.parts.length > 0;
    let partsMarks = 0;
    for (const part of problem.parts) {
      const result = markPart(part, answers);
      if (result.status === 'ungraded' && selfMarks[part.id] === true) result.status = 'correct';
      else if (result.status === 'ungraded' && selfMarks[part.id] === false) result.status = 'incorrect';
      parts[part.id] = result;
      totals[result.status] += 1;
      p[result.status] += 1;
      if (result.status !== 'correct') allCorrect = false;
      if (marksOk) {
        partsMarks += partMarks(part, result, scoring.perPart);
        p.maxMarks += part.marks ?? scoring.perPart ?? 0;
      }
    }
    if (marksOk) {
      if (scoring.allCorrect != null) {
        p.maxMarks = scoring.allCorrect;
        p.marks = allCorrect ? scoring.allCorrect : partsMarks;
      } else p.marks = partsMarks;
      obtained += p.marks;
      maximum += p.maxMarks;
    }
    problems.push(p);
  }
  return { parts, problems, totals, marks: marksOk ? { obtained, maximum } : null };
}
