# AV-10 · The Final Showdown — Season 1 Finale

> Nine modules. Nine lenses on the same organisation. One shared intake, one composite AI-security posture score.

The Season 1 capstone. Not a dashboard bolting nine tools together — a **connected pipeline**: one intake feeds all nine prior modules' scoring logic, the one genuine sequential dependency in the series (AV-01's ranked findings → AV-03's board translation) actually chains, and every lens rolls into a single composite score.

## Honest design note

Most of the nine risk domains in this series do **not** causally depend on each other — an agent's blast radius doesn't feed shadow-AI exposure, and pretending otherwise would be a fabricated pipeline. This module doesn't pretend. It runs nine independent, faithful re-implementations of each module's scoring model against one shared intake, chains the one real dependency (AV-01 → AV-03), and combines all nine into one composite posture score. Nine honest measurements, one number — not a fake assembly line.

## What it does

Paste (or edit) one JSON intake spanning all nine dimensions — vulnerability findings, alerts, attack surfaces, DevSecOps controls, prompt-hardening controls, an agent configuration, memory controls, and shadow-AI governance controls — and get:

- A **composite AI-security posture score** (0–100) with a band (STRONG → CRITICAL)
- All **nine lenses ranked by risk**, each labelled with what drove its score
- The **one real chain** in the series made explicit: AV-01 → AV-03
- A summary naming the weakest and strongest dimension

## Model

```
composite = Σ(lensRiskScore × weight) / Σ(weights)   → 0–100
```

Each lens is weighted roughly equally; AV-01 and AV-03 (the chained pair) are weighted slightly lower individually so their combined contribution matches the other seven independent lenses.

Bands: CRITICAL (≥65) · WEAK (≥45) · DEVELOPING (≥25) · STRONG (<25)

## Architecture

```
av-10/
├── src/
│   ├── module.js                    Platform manifest — registry + headless API
│   ├── engines/
│   │   ├── posture.js                Pure engine — 9 faithful sub-scorers + composite (no UI, no DOM)
│   │   └── posture.test.mjs          Unit tests (15 assertions)
│   ├── data/sample.js                One sample intake spanning all 9 dimensions
│   └── components/FinalShowdown.jsx  Platform-mountable React module
└── index.html                        Self-contained standalone build
```

`provides: ['ai-security-posture-score']`
`consumes: ['findings', 'alerts', 'surfaces', 'devSecOpsControls', 'promptControls', 'agent', 'memoryControls', 'shadowAiControls']`

## Run

```bash
node src/engines/posture.test.mjs
npx esbuild entry.jsx --bundle --outfile=bundle.js --loader:.jsx=jsx --jsx=automatic
# open index.html
```

## Credits
The Season 1 finale of [ApexVector](https://github.com/DrXter/ApexVector-) — AI for Security · Security for AI. Built on the scoring models of AV-01 through AV-09.
