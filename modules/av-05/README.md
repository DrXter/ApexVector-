# AV-05 · DevSecOps AI Readiness Checker

> Your CI/CD pipeline scans human code. Your developers are shipping AI code. Those aren't the same threat model.

Module 05 of **ApexVector**. Two modes: score how ready your pipeline is to ship AI-generated code safely, and map the new attack surface AI introduces into your SDLC.

## Two modes

- **Pipeline readiness** — 12 yes/partial/no controls covering provenance, hallucinated dependencies, secret scanning, AI-tuned SAST, review policy, license contamination, test authorship, tooling governance, prompt data-leak, agent least-privilege, IR, and developer training. Returns an AI-readiness score, a level, and the ranked gaps to close.
- **AI-code risk profile** — select how your team uses AI (autocomplete, agents that commit, NL-to-code, AI-written tests, external models, AI-generated IaC), set your governance maturity, and get the mapped attack surface plus priority controls.

## Models

```
readiness = Σ(control answer × weight) / Σ(weights)   → 0–100
  yes = 1.0 · partial = 0.5 · no = 0

risk = aggregate(sorted surface exposures, tapering) × governanceFactor  → 0–100
  governance: high ×0.55 · med ×0.8 · low ×1.1
```

Readiness levels: AI-READY (≥78) · PARTIALLY READY (≥52) · EXPOSED (≥30) · FLYING BLIND (<30)
Risk tiers: CRITICAL (≥70) · ELEVATED (≥45) · MODERATE (≥22) · LIMITED (<22)

## Why it exists

Generic DevSecOps tooling was built for human code and human mistakes. AI code fails differently: hallucinated dependencies, licensed code reproduced verbatim, fluent-but-wrong logic that passes review on trust, and agents that can modify the very config that governs them. This module surfaces those AI-specific gaps.

## Architecture

```
av-05/
├── src/
│   ├── module.js                      Platform manifest — registry + headless API
│   ├── engine/
│   │   ├── readiness.js               Pure engine (no UI, no DOM)
│   │   └── readiness.test.mjs         Unit tests (21 assertions)
│   ├── data/sample.js                 Sample presets + exporters
│   └── components/AiReadinessChecker.jsx
└── index.html                         Self-contained standalone build
```

`provides: ['ai-readiness-score', 'ai-code-risk-profile']`

## Run

```bash
node src/engine/readiness.test.mjs
npx esbuild entry.jsx --bundle --outfile=bundle.js --loader:.jsx=jsx --jsx=automatic
# open index.html
```

## Credits
Part of [ApexVector](https://github.com/DrXter/ApexVector-) — AI for Security · Security for AI.
