# AV-11 · Pentest Cadence Gap Calculator

> Your annual pentest is a photograph of a river. It is accurate on the day it is taken and starts ageing at the next release that touches the attack surface.

Module 11 of **ApexVector**, Season 2 (AI-led pentest for GCCs), Episode 1, in the **AI for Security** pillar.

## What it answers

How many days a year does the system running in production differ from the last system anyone actually tested?

You enter: releases per month, the share that change the attack surface, pentests per year, the tests per year the parent requires, and the untested share you can tolerate. You get untested days per year, the arithmetic step by step, the gap against the parent's assurance cycle, a suggested cadence tier, and a **human risk-acceptance gate**: the tool states the exposure and a person accepts or rejects it.

## Model

```
R = releasesPerMonth × 12           releases a year
C = R × surfaceShare                surface-changing releases a year
d = 365 / C                         days between surface-changing releases
I = 365 / T                         days between tests (T tests a year)

valid days per test = d / 2              if d ≤ I
                    = I − I² / (2d)      if d > I
covered   = min(365, T × valid days per test)
untested  = 365 − covered
```

A test is assumed valid until the next release that changes the attack surface, which lands at a random point after it. Tests are evenly spaced and changes arrive at a steady rate.

Bands: PHOTOGRAPH OF A RIVER (≥75% untested) · WIDE GAP (≥50) · NARROWING GAP (≥25) · TIGHT COVERAGE.
Cadence ladder (ApexVector's own, not a standard): annual · semi-annual · quarterly · monthly · continuous validation.

## Honest limits

- Arithmetic on assumptions you enter, shown on screen. It does not predict breaches.
- Not a compliance determination. The tier ladder is a rubric, not a standard.
- Which releases change the attack surface is a judgment call, and it drives the result.
- Synthetic sample data only. Runs in the browser; nothing is sent anywhere.

## LLM-ready export

JSON and Markdown from the shared Season 2 schema (`apexvector-export` 1.0): inputs, outputs, the human decision, assumptions and limits.

## Architecture

```
av-11/
├── src/
│   ├── module.js                      Platform manifest
│   ├── engine/cadence.js              Pure engine (no UI, no DOM)
│   ├── engine/cadence.test.mjs        Unit tests
│   ├── export/schema.js               Shared LLM-ready export schema
│   ├── data/sample.js                 Synthetic GCC sample + exporters
│   └── components/CadenceGapCalculator.jsx
└── index.html                         Self-contained standalone build
```

`provides: ['pentest-cadence-gap', 'cadence-tier-recommendation']`

## Run

```bash
node src/engine/cadence.test.mjs
npm install && node build.mjs     # writes index.html
```

## Credits
Part of [ApexVector](https://github.com/DrXter/ApexVector-). Not affiliated with any employer.
