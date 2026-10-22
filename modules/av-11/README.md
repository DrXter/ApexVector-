# AV-11 · Pentest Cadence Gap Calculator

> Your annual pentest is a photograph of a river.

Module 11 of **ApexVector**, Season 2, Episode 1. Enter how often a system ships and how often it is tested, and get the number of days a year the live system is not the one that was tested. Then a person has to accept or reject that gap, in writing, with a named owner and a review date.

Built for Global Capability Centres, which often ship on the parent's release train while being assured on the parent's audit cycle.

## What it does

- **Cadence gap.** Releases per month, the share that change the attack surface, and full-scope tests per year go in. Exposed days per year, a year strip, changes per test and a cadence comparison come out.
- **Parent check.** Optionally enter the tests per year the parent requires. It flags a cadence that meets the parent's requirement and is still exposed most of the year.
- **Decision gate.** The result ends in a plain-language risk-acceptance statement. Accepting needs an owner and a review date. Rejecting is recorded as is. Changing any number clears the decision.
- **LLM-ready export.** Download JSON or prompt-ready Markdown in the shared `apexvector.llm-export/1` schema: inputs, outputs, the human decision, assumptions and limits. It is generated in the browser and nothing is sent anywhere.

## Model

```
changes per year = releases per month × 12 × share that change the attack surface

A day is EXPOSED when at least one attack-surface change has shipped since the
most recent test. A test covers every change released on or before the day it
completes. Changes and tests are spread evenly. The count is taken over a
steady-state year (the middle of three simulated years).
```

Levels by share of the year exposed: COVERED (<10%) · DRIFTING (<30%) · EXPOSED (<60%) · BLIND (≥60%)

The suggested cadence is the first of annual, half-yearly, quarterly, monthly, fortnightly, weekly, twice weekly or daily that keeps exposure at or under 25% of the year. If none does, it falls back to testing per release.

## What this is not

- Arithmetic on stated assumptions. It does not predict breaches or measure real risk.
- It does not weigh how severe a change is, or how long a test takes to cover a release.
- The tiers and the 25% target are ApexVector defaults, not a standard.
- The sample GCC is synthetic. No real organisation or engagement data is used.

## Architecture

```
av-11/
├── src/
│   ├── module.js                          Platform manifest — registry + headless API
│   ├── engine/
│   │   ├── cadence.js                     Pure engine (no UI, no DOM)
│   │   └── cadence.test.mjs               Unit tests (47 assertions)
│   ├── data/sample.js                     Synthetic presets + LLM-ready exporters
│   └── components/CadenceGapCalculator.jsx
└── index.html                             Self-contained standalone build
```

`provides: ['cadence-gap', 'risk-acceptance-decision']`

## Run

```bash
npm test                    # node src/engine/cadence.test.mjs
npm install                 # for rebuilding the standalone page
npx esbuild entry.jsx --bundle --minify --format=iife --outfile=bundle.js --loader:.jsx=jsx --jsx=automatic
# inline bundle.js into index.html, as in the other modules
```

The headless API (`assessCadence`, `recordDecision`, `exportCadenceJson`, `exportCadenceMarkdown`) works without React, which is what the Season 2 master tool consumes.
