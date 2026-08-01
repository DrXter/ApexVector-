# AV-04 · Red Team Scope & Recon Planner

> Attackers break out in ~29 minutes. Your red team's hours are finite. This ranks your in-scope surface so limited time hits the highest-yield paths first.

Module 04 of **ApexVector**. A planning and prioritization aid for **authorized, scoped** red-team engagements. It sequences recon effort and proposes ATT&CK-mapped attack-path hypotheses — it does **not** generate exploits, payloads, or attack instructions.

## What it does

- Rank in-scope surfaces by foothold probability, adjusted for exposure, defensive hardening, engagement objective, timebox, and stealth constraints
- Map each surface to its MITRE ATT&CK tactic and technique reference
- Propose tactic-level **attack-path hypotheses** to validate first — sequenced toward your objective
- Export the plan as JSON or CSV for your engagement notes

## Model

```
priority = surfaceYield·0.45 + exposure·0.30 − hardening·0.20
         + objectiveAlignment(+0.15) + timeboxFit − stealthPenalty
```

Bands: PRIMARY VECTOR (≥68) · SECONDARY (≥45) · TERTIARY (≥25) · INFORMATIONAL (<25)

## Responsible use

Gated behind an authorization confirmation. Outputs methodology and sequencing for lawful, scoped testing mapped to MITRE ATT&CK — never exploitation steps. Operate only within your signed rules of engagement.

## Architecture

```
av-04/
├── src/
│   ├── module.js                   Platform manifest — registry + headless API
│   ├── engine/
│   │   ├── recon.js                Pure planning engine (no UI, no DOM)
│   │   └── recon.test.mjs          Unit tests (18 assertions)
│   ├── data/sample.js              Sample scope + exporters
│   └── components/ReconPlanner.jsx Platform-mountable React module
└── index.html                      Self-contained standalone build
```

`provides: ['recon-plan', 'attack-path-hypotheses']` · `consumes: ['engagement-scope']`

## Run

```bash
node src/engine/recon.test.mjs
npx esbuild entry.jsx --bundle --outfile=bundle.js --loader:.jsx=jsx --jsx=automatic
# open index.html
```

## Credits
Part of [ApexVector](https://github.com/DrXter/ApexVector-) — AI for Security · Security for AI.
