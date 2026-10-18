// Paper data format (schemaVersion 1) – validation and status helpers shared by the app, the data build and the tests.

export const SCHEMA_VERSION = 1;

export const STATUS = {
  READY: 'ready',
  NEEDS_KEY: 'needs-key',
  IMPORT_REQUIRED: 'import-required',
};

export const STATUS_LABEL = {
  [STATUS.READY]: 'Ready to practise',
  [STATUS.NEEDS_KEY]: 'Needs answer key',
  [STATUS.IMPORT_REQUIRED]: 'Import required',
};

const BLOCK_TYPES = new Set(['paragraph', 'list', 'table', 'math', 'figure', 'code']);

/** Every answerable input of a part: [{ id, label, graded }]. A part without `fields` has one input. */
export function partFields(part) {
  if (Array.isArray(part.fields) && part.fields.length) {
    return part.fields.map((f) => ({ id: f.id, label: f.label, graded: f.graded !== false }));
  }
  return [{ id: null, label: null, graded: true }];
}

/** Printed label of a part, e.g. "(a)"; parts without a label (single-answer problems) read "Answer". */
export function partLabel(part) {
  return part.label ? `(${part.label})` : 'Answer';
}

export function allParts(paper) {
  return paper.problems.flatMap((p) => p.parts.map((part) => ({ problem: p, part })));
}

/** True if the part has an official answer that can be marked automatically. */
export function isAutoMarkable(part) {
  if (part.officialAnswer === null || part.officialAnswer === undefined) return false;
  if (part.comparison === 'manual') return false;
  return true;
}

/** Derived status of a paper (see README: never show a year as ready without checked questions and a key). */
export function paperStatus(paper) {
  if (!paper || !Array.isArray(paper.problems) || paper.problems.length === 0) return STATUS.IMPORT_REQUIRED;
  const parts = allParts(paper);
  if (parts.length === 0) return STATUS.IMPORT_REQUIRED;
  const questionsOk = paper.verification?.questionsReviewed === true;
  const answersOk = paper.verification?.answersReviewed === true && parts.every(({ part }) => part.officialAnswer != null);
  if (!questionsOk) return STATUS.IMPORT_REQUIRED;
  if (!answersOk) return STATUS.NEEDS_KEY;
  return STATUS.READY;
}

export function paperMode(paper) {
  const parts = allParts(paper);
  const auto = parts.filter(({ part }) => isAutoMarkable(part)).length;
  if (auto === parts.length) return 'auto';
  if (auto === 0) return 'self-check';
  return 'mixed';
}

function validateBlock(b, where, errors) {
  if (!b || typeof b !== 'object' || !BLOCK_TYPES.has(b.type)) {
    errors.push(`${where}: unknown block type ${JSON.stringify(b?.type)}`);
    return;
  }
  if (b.type === 'paragraph' && typeof b.text !== 'string') errors.push(`${where}: paragraph needs text`);
  if (b.type === 'list' && !Array.isArray(b.items)) errors.push(`${where}: list needs items`);
  if (b.type === 'table' && !Array.isArray(b.rows)) errors.push(`${where}: table needs rows`);
  if (b.type === 'math' && typeof b.tex !== 'string') errors.push(`${where}: math needs tex`);
  if (b.type === 'code' && typeof b.text !== 'string') errors.push(`${where}: code needs text`);
  if (b.type === 'figure') {
    if (typeof b.src !== 'string' || !isSafeImageSrc(b.src)) errors.push(`${where}: figure src must be a relative path or data:image URI`);
    if (!b.alt) errors.push(`${where}: figure needs alt text`);
  }
}

/** Only local images are allowed so a paper can never trigger a network request. */
export function isSafeImageSrc(src) {
  if (/^data:image\/(png|jpeg|gif|webp);base64,/i.test(src)) return true;
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(src)) return false;
  return !src.includes('..');
}

export function validatePaper(paper) {
  const errors = [];
  if (!paper || typeof paper !== 'object') return ['paper is not an object'];
  if (paper.schemaVersion !== SCHEMA_VERSION) errors.push(`schemaVersion must be ${SCHEMA_VERSION}`);
  if (typeof paper.id !== 'string' || !paper.id) errors.push('id is required');
  if (!Number.isInteger(paper.year)) errors.push('year must be an integer');
  if (typeof paper.title !== 'string') errors.push('title is required');
  if (!paper.metadata || typeof paper.metadata !== 'object') errors.push('metadata is required');
  if (!paper.verification || typeof paper.verification.questionsReviewed !== 'boolean' || typeof paper.verification.answersReviewed !== 'boolean') {
    errors.push('verification.questionsReviewed and verification.answersReviewed must be booleans');
  }
  if (!Array.isArray(paper.problems)) {
    errors.push('problems must be an array');
    return errors;
  }
  const ids = new Set();
  const seen = (id, where) => {
    if (ids.has(id)) errors.push(`${where}: duplicate id ${id}`);
    ids.add(id);
  };
  for (const p of paper.problems) {
    const pw = `problem ${p.id}`;
    seen(p.id, pw);
    if (!Array.isArray(p.content)) errors.push(`${pw}: content must be an array`);
    else p.content.forEach((b, i) => validateBlock(b, `${pw} content[${i}]`, errors));
    (p.solution || []).forEach((b, i) => validateBlock(b, `${pw} solution[${i}]`, errors));
    if (!Array.isArray(p.parts)) {
      errors.push(`${pw}: parts must be an array`);
      continue;
    }
    for (const part of p.parts) {
      const w = `part ${part.id}`;
      seen(part.id, w);
      if (typeof part.prompt !== 'string') errors.push(`${w}: prompt must be a string`);
      (part.content || []).forEach((b, i) => validateBlock(b, `${w} content[${i}]`, errors));
      const fields = partFields(part);
      const ans = part.officialAnswer;
      if (ans !== null && ans !== undefined) {
        if (fields[0].id === null) {
          if (typeof ans !== 'string') errors.push(`${w}: officialAnswer must be a string`);
        } else {
          if (typeof ans !== 'object') errors.push(`${w}: officialAnswer must map field ids to strings`);
          else for (const f of fields) if (typeof ans[f.id] !== 'string') errors.push(`${w}: officialAnswer missing field ${f.id}`);
        }
      }
    }
  }
  const m = paper.metadata;
  if (m && m.markingSchemeVerified === true && !m.scoring) errors.push('markingSchemeVerified requires metadata.scoring');
  return errors;
}

/** Consistency checks for papers that claim to be verified. */
export function verifiedPaperWarnings(paper) {
  const out = [];
  if (paper.verification.answersReviewed) {
    for (const { part } of allParts(paper)) if (part.officialAnswer == null) out.push(`part ${part.id} has no official answer`);
  }
  if (paper.verification.questionsReviewed && paper.problems.some((p) => p.parts.length === 0)) out.push('a problem has no answerable parts');
  return out;
}
