# AV-01 · VulnPriority Engine

> Rank vulnerability findings by what to fix first — composite CVSS + EPSS + SSVC scoring.

Module 01 of the **ApexVector** platform. Built as a production module, not a demo:
a framework-agnostic scoring engine, a data layer with real import/export, a live
EPSS feed adapter, and a platform-mountable React component.

## Architecture

```
av-01/
├── src/
│   ├── module.js                  Platform manifest — registry discovery + headless API
│   ├── engine/
│   │   ├── scoring.js             Pure scoring engine (no UI, no DOM) — platform-importable
│   │   └── scoring.test.mjs       Unit tests (11 assertions)
│   ├── data/
│   │   ├── parsers.js             pipe / CSV / JSON import + JSON/CSV export
│   │   ├── epss-feed.js           Live FIRST.org EPSS adapter, graceful fallback
│   │   └── sample.js              Representative dataset
│   └── components/
│       └── VulnPriorityEngine.jsx Platform-mountable React module
└── final.html                     Self-contained standalone build (no CDN)
```

## Platform integration

The module exports a manifest the platform registry mounts:

```js
import manifest from './src/module.js';

// UI:  <manifest.component onResult={(scored, summary) => bus.emit('ranked-findings', scored)} />
// Headless:
const findings = manifest.api.parse(rawText);
const enriched = await manifest.api.enrich(findings);   // live EPSS
const ranked   = manifest.api.score(enriched);
const summary  = manifest.api.summarize(ranked);
```

`provides: ['ranked-findings', 'risk-summary']` — other modules (reporting,
dashboard) consume this module's output via the platform data bus.

## Scoring model

```
composite = (CVSS/10 × 0.35) + (EPSS × 0.40) + (SSVC × 0.25)   → 0–100
```

- **CVSS** — base severity
- **EPSS** — real-world exploit probability (live from FIRST.org for CVE-tagged findings, estimated otherwise)
- **SSVC** — business/exposure weight from asset criticality + internet exposure

Estimated values are flagged (`~`) so users always know what's measured vs. inferred.

## Run

```bash
npm install
node src/engine/scoring.test.mjs        # run tests
npx esbuild entry.jsx --bundle --outfile=bundle.js --loader:.jsx=jsx --jsx=automatic
# open final.html
```

## Credits
Part of [ApexVector](https://github.com/apexvector) — AI for Security · Security for AI.
