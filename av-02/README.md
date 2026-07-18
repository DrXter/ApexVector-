# AV-02 · Alert Triage Simulator

> Structure the triage decision — false-positive likelihood, escalation tier, and next actions.

Module 02 of **ApexVector**. Built as a production module: a framework-agnostic triage
engine, transparent signal weighting, and a platform-mountable React component.

## The problem

46% of SOC analysts spend more time maintaining tools than defending against threats.
Alert queues are triaged on severity and instinct, and the two most predictive signals —
corroboration and asset/identity context — are usually applied inconsistently.

This module makes the decision explicit: every signal, weight, and reason is shown.

## Scoring model

```
composite = severity·0.20 + assetCriticality·0.18 + userPrivilege·0.14
          + corroboration·0.18 + anomaly·0.15 + threatIntel·0.15

confidence = composite·0.65 + alertTypePrior·0.35
```

Category base rates (e.g. recon 22% TP, credential-access 62% TP) blend with live context.
Known-good context (change windows, approved tooling) sharply reduces confidence — the
single largest source of false positives in most SOCs.

**Tiers:** ESCALATE (≥70) · INVESTIGATE (≥45) · MONITOR (≥25) · LIKELY BENIGN (<25)

## Architecture

```
av-02/
├── src/
│   ├── module.js                     Platform manifest — registry + headless API
│   ├── engine/
│   │   ├── triage.js                 Pure triage engine (no UI, no DOM)
│   │   └── triage.test.mjs           Unit tests (17 assertions)
│   ├── data/sample.js                Representative shift queue + exporters
│   └── components/
│       └── AlertTriageSimulator.jsx  Platform-mountable React module
└── index.html                        Self-contained standalone build
```

## Platform integration

```js
import manifest from './src/module.js';
const result  = manifest.api.triage(alert);
const queue   = manifest.api.triageBatch(alerts);
const summary = manifest.api.summarize(queue);
```

`provides: ['triaged-alerts', 'triage-summary']`

## Run

```bash
node src/engine/triage.test.mjs
npx esbuild entry.jsx --bundle --outfile=bundle.js --loader:.jsx=jsx --jsx=automatic
# open index.html
```

## Credits
Part of [ApexVector](https://github.com/DrXter/ApexVector-) — AI for Security · Security for AI.
