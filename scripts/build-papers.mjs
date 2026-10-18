// Assemble src/data/papers/zio<year>.json from: parsed question PDF (+ figure specs), hand patches, the transcribed
// answer key (answers.json) and the review record (verified.json).  Then write src/data/manifest.json.
//   node scripts/build-papers.mjs [year...]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseQuestionPaper } from './lib/parse-questions.mjs';
import { stripMath } from './lib/rows.mjs';
import { paperStatus, paperMode, validatePaper, verifiedPaperWarnings } from '../src/lib/schema.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
const sources = read('scripts/sources.json');
const figures = read('scripts/figures.json');
const answers = read('scripts/answers.json');
const verified = fs.existsSync(path.join(root, 'scripts/verified.json')) ? read('scripts/verified.json') : {};
const outDir = path.join(root, 'src/data/papers');
fs.mkdirSync(outDir, { recursive: true });

const only = process.argv.slice(2).map(Number);

async function loadPatch(year) {
  const f = path.join(root, `scripts/patches/${year}.mjs`);
  return fs.existsSync(f) ? (await import(pathToFileURL(f).href)).default : { problems: {} };
}

function durationFrom(instructions) {
  for (const s of instructions) {
    const m = s.match(/duration of the examination is (\d+) hours?/i);
    if (m) return Number(m[1]) * 60;
  }
  return null;
}

/** Plain-text fallback of a block of prompt text (math wrappers removed). */
const plain = (s) => stripMath(s);

function buildPart(problem, part, ans, key) {
  const out = {
    id: part.label ? `p${problem.number}${part.label}` : `p${problem.number}-answer`,
    label: part.label,
    prompt: part.prompt,
  };
  if (part.content?.length) out.content = part.content;
  const fields = key?.fields?.[problem.number];
  if (fields) out.fields = fields;
  const isNum = (v) => /^\d+$/.test(v);
  let value = null;
  let accept = null;
  let manual = false;
  if (ans !== undefined) {
    if (typeof ans === 'string') value = ans;
    else if (ans.fields) {
      value = ans.fields;
      accept = ans.accept ?? null;
    }
    else if (ans.manual) {
      value = ans.manual;
      manual = true;
    } else {
      value = ans.value;
      accept = ans.accept ?? null;
    }
  }
  const nums = value !== null && (typeof value === 'string' ? isNum(value) : Object.values(value).every(isNum));
  out.answerType = nums ? 'integer' : 'text';
  out.officialAnswer = value;
  if (accept) out.acceptedAnswers = accept;
  const comparison = manual ? 'manual' : key?.comparison?.[problem.number];
  if (comparison) out.comparison = comparison;
  const map = key?.inputMap?.[problem.number];
  if (map) out.inputMap = map;
  const partial = key?.partial?.[problem.number];
  if (partial) out.partialMarks = partial;
  out.marks = null;
  out.explanation = null;
  return out;
}

const manifest = [];
for (const src of sources.papers) {
  const year = src.year;
  if (only.length && !only.includes(year)) {
    const f = path.join(outDir, `zio${year}.json`);
    if (fs.existsSync(f)) manifest.push(JSON.parse(fs.readFileSync(f, 'utf8')));
    continue;
  }
  const q = read(`.cache/text/${year}-q.json`);
  const draft = parseQuestionPaper(q.pages, { year, figures: figures[year] || [] });
  const patch = await loadPatch(year);
  const key = answers[year];
  const problems = draft.problems.map((p) => {
    const patched = patch.problems?.[p.number] || {};
    const content = patched.content ? patched.content(p.content) : p.content;
    const parts = (patched.parts ? patched.parts(p.parts) : p.parts).map((part) => buildPart(p, part, key?.answers?.[p.number]?.[part.label ? part.label.charCodeAt(0) - 97 : 0], key));
    const problem = { id: p.id, number: p.number, title: p.title, sourcePages: p.sourcePages, content, parts };
    if (patched.solution) problem.solution = patched.solution();
    return problem;
  });
  const instructions = key?.instructions ?? draft.instructions;
  const hasKey = !!key;
  const v = verified[year] || {};
  const paper = {
    schemaVersion: 1,
    id: `zio-${year}`,
    year,
    title: `ZIO ${year}`,
    sourcePage: sources.sourcePage,
    questionPaperUrl: src.questionPaperUrl,
    answerKeyUrl: src.answerKeyUrl,
    editorialUrls: src.editorials,
    metadata: {
      durationMinutes: key?.durationMinutes ?? durationFrom(instructions),
      maximumMarks: key?.maximumMarks ?? null,
      markingSchemeVerified: key?.markingSchemeVerified === true,
      scoring: key?.scoring ?? null,
      instructions,
      notes: key?.notes ?? [],
      attribution: 'Question paper and answer key © their authors (IARCS). Source: https://www.iarcs.org.in/ via the CodeChef ZIO archive.',
    },
    verification: {
      questionsReviewed: v.questionsReviewed === true,
      answersReviewed: hasKey && v.answersReviewed === true,
      reviewedOn: v.reviewedOn ?? null,
      reviewNotes: v.notes ?? null,
    },
    problems,
  };
  const errors = validatePaper(paper);
  if (errors.length) {
    console.error(`INVALID ${year}:\n  ` + errors.slice(0, 15).join('\n  '));
    process.exitCode = 1;
  }
  const warn = verifiedPaperWarnings(paper);
  if (warn.length) console.warn(`WARN ${year}: ${warn.join('; ')}`);
  fs.writeFileSync(path.join(outDir, `zio${year}.json`), JSON.stringify(paper, null, 2) + '\n');
  manifest.push(paper);
  console.log(`built ${year}: ${problems.length} problems, ${problems.reduce((n, p) => n + p.parts.length, 0)} parts, status ${paperStatus(paper)}`);
}

const entries = manifest
  .sort((a, b) => b.year - a.year)
  .map((p) => ({
    id: p.id,
    year: p.year,
    title: p.title,
    file: `zio${p.year}.json`,
    status: paperStatus(p),
    mode: paperMode(p),
    problems: p.problems.length,
    parts: p.problems.reduce((n, pr) => n + pr.parts.length, 0),
    durationMinutes: p.metadata.durationMinutes,
    maximumMarks: p.metadata.maximumMarks,
    markingSchemeVerified: p.metadata.markingSchemeVerified,
    questionsReviewed: p.verification.questionsReviewed,
    answersReviewed: p.verification.answersReviewed,
    questionPaperUrl: p.questionPaperUrl,
    answerKeyUrl: p.answerKeyUrl,
    editorialUrls: p.editorialUrls,
  }));
fs.writeFileSync(path.join(root, 'src/data/manifest.json'), JSON.stringify({ schemaVersion: 1, sourcePage: sources.sourcePage, checkedOn: sources.checkedOn, papers: entries }, null, 2) + '\n');
console.log('manifest:', entries.length, 'papers');
