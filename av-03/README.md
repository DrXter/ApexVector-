# AV-03 · Risk Translator

> Turn a technical finding into the language a board actually hears — business consequence, risk rating, and optional financial exposure.

Module 03 of **ApexVector**. "CVSS 9.8" means nothing in a boardroom. "$4M regulatory exposure, highly likely to be exploited" ends the debate. This module does that translation.

## Two modes

- **Single finding** — paste one finding, get an executive summary, the business consequence, a risk rating, and an optional financial exposure range.
- **Board risk register** — translate a portfolio of findings into a ranked, board-ready table with aggregate financial exposure.

## Model

```
businessRisk = severity·0.30 + categoryImpact·0.40 + likelihood·0.30   → 0–100
```

Ratings: SEVERE (≥75) · ELEVATED (≥50) · MODERATE (≥28) · LOW (<28)

The **optional** financial model is a transparent planning range (low / expected / high),
driven by event likelihood, category impact, org size, and data in scope. It is a
conversation-starter for the board — deliberately not presented as an actuarial figure.

## Architecture

```
av-03/
├── src/
│   ├── module.js                    Platform manifest — registry + headless API
│   ├── engine/
│   │   ├── translate.js             Pure translation engine (no UI, no DOM)
│   │   └── translate.test.mjs       Unit tests (18 assertions)
│   ├── data/sample.js               Sample findings + exporters
│   └── components/RiskTranslator.jsx Platform-mountable React module
└── index.html                       Self-contained standalone build
```

`provides: ['business-risk-register', 'financial-exposure']`
`consumes: ['ranked-findings']` — takes AV-01's output directly.

## Run

```bash
node src/engine/translate.test.mjs
npx esbuild entry.jsx --bundle --outfile=bundle.js --loader:.jsx=jsx --jsx=automatic
# open index.html
```

## Credits
Part of [ApexVector](https://github.com/DrXter/ApexVector-) — AI for Security · Security for AI.
