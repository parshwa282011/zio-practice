# ZIO Practice

Practise past **Zonal Informatics Olympiad (ZIO)** papers (2002–2023) in a focused test screen.
Pick a year, answer each test case in the side panel while the problem is in the middle, submit, and compare with the official answers.

It is a **static website**: no server, no database, no account, no analytics. Your answers stay in your browser's `localStorage` and are never sent anywhere.

Question papers and answer keys come from the [CodeChef ZIO archive](https://www.codechef.com/ioi/zio), where they are hosted by [IARCS](https://www.iarcs.org.in/). They belong to their authors. Every paper links back to the original PDF, answer key and editorials.

> **Before making a public repository:** the parsed papers in `src/data/papers/` are derived from IARCS material. Confirm that IARCS allows redistribution (or ask them) and keep the attribution and source links that every paper carries.

## Using the site

1. **Archive** – search by year; each card shows its status (*Ready to practise*, *Needs answer key*, *Import required*), whether it is verified, its time limit and marks (only when stated in the paper).
2. **Start screen** – choose *Timed exam* (countdown if the paper states a time limit, otherwise a limit of your choice or a stopwatch) or *Untimed practice*. The timer starts only after you confirm.
3. **Exam** – problem statement and its test cases in the middle, answer inputs in the right-hand panel (a bottom drawer on small screens). Previous/Next, *mark for review*, autosave on every keystroke (a refresh restores the attempt), warning before you leave an active attempt.
4. **Results** – correct / incorrect / unanswered, per-problem breakdown, your answer next to the official one, official solutions where the key has them, marks only when the paper's marking scheme is verified. Papers whose answers are not unique (2002–2004) ask you to mark yourself.

Rules the marking follows (see `src/lib/answer-marking/mark.js` and `tests/mark.test.js`):

* answers are only trimmed (leading/trailing whitespace); `042`, `42.0` and `42` are different answers;
* a paper may list extra accepted answers (for example 2014 3(c) accepts `08` or `8`), or declare that spaces are ignored (`comparison: "compact"`, used where an answer is a sequence such as 2011 problem 2) – shown next to the input;
* a part without a verified official answer is never marked automatically.

## Data

One JSON file per year in `src/data/papers/` (schema version 1, validated by `src/lib/schema.js`), plus `src/data/manifest.json`.
Papers are loaded on demand, so the archive page stays small.

```
src/data/papers/zio2021.json   problems[] → content[] blocks, parts[] → prompt, officialAnswer, …
public/figures/                diagrams cropped from the question paper PDFs
```

Content blocks: `paragraph`, `list`, `table`, `math` (KaTeX), `figure`, `code`. Text may contain inline maths in `$…$`. Paper data is never inserted as HTML, and figures may only use relative paths or `data:image` URIs, so a paper cannot trigger a network request.

### How the data was produced

```
scripts/sources.json            URLs found on the CodeChef page (all returned HTTP 200 when checked)
scripts/fetch-and-extract.mjs   downloads the PDFs into .cache/ and extracts text with pdf.js
scripts/lib/parse-*.mjs         heuristic parser: problems, (a)(b)(c) parts, maths, tables
scripts/figures.json            figure/table crop boxes (and image masks) per year
scripts/make-figures.mjs        renders those crops to public/figures/
scripts/patches/<year>.mjs      hand corrections for layouts the parser cannot recover
scripts/answers.json            the official answers, transcribed from the answer keys
scripts/build-papers.mjs        combines everything → src/data/papers + manifest.json
scripts/verify-papers.mjs       compares the PDF text word-for-word with the JSON and each answer with the key
scripts/verified.json           the years that were reviewed after that report
```

To regenerate the data, run
`node scripts/fetch-and-extract.mjs && node scripts/make-figures.mjs && npm run build:data && npm run verify:papers`.

Verification, honestly: the text of every question is matched word-for-word against the PDF; diagrams and tables were compared by eye with the rendered PDF pages; each answer was matched against the key. A paper is marked verified only after that. Mistakes are still possible – if you find one, compare with the linked original and please report it.

**Not auto-scored:** 2002 (algorithms and proofs), 2003 and 2004 (non-unique answers, diagrams). 2005 and 2006 do not state a marking scheme in the paper, so counts are shown but marks are not calculated. 2015 problem 4 and 2023 problem 1 accept both interpretations that the official key allows.

The original CodeChef/IARCS PDF URLs cannot be fetched from a browser (no CORS headers), which is why everything is pre-parsed. PDF import in the browser is deliberately not part of this version.

## Development

```
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests, incl. every bundled paper
npm run validate:papers
npm run build      # static site in dist/
npm run preview    # serve dist/ on http://localhost:4173
npm run e2e        # browser smoke test against the preview server (needs Google Chrome)
```

Plain JavaScript + Vite, hash-based routing (`#/paper/2021`), KaTeX for maths, no runtime backend.

## Deploying to GitHub Pages

1. Push this folder to a GitHub repository (default branch `main`).
2. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. The workflow in `.github/workflows/deploy.yml` validates the data, runs the tests, builds and publishes `dist/`.

The build uses relative asset paths and hash routing, so it works under `https://<user>.github.io/<repo>/` without further configuration.

**Opening `dist/index.html` directly (`file://`)** may not work in some browsers because module scripts are blocked there. Use `npm run preview` or the hosted site.

## Privacy and local data

Active attempts, finished results and your theme choice live in `localStorage` for this site only. They belong to the current browser profile and disappear if you clear site data. The archive page has **Clear local data** (with confirmation). Nothing is collected: no names, e-mail addresses, analytics or third-party requests.
