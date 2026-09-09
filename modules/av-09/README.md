# AV-09 · Shadow AI Risk Scanner

> Your employees are already using AI tools you've never heard of — pasting data into models you've never vetted. Shadow AI is shadow IT's faster, hungrier cousin. The risk isn't the tools; it's the invisibility.

Module 09 of **ApexVector**, in the **Security for AI** pillar. Where AV-06 to AV-08 covered how AI systems get attacked, this one addresses how AI risk enters an org unmanaged — ungoverned, unsanctioned AI tool use.

## Two modes

- **Org exposure** — answer nine governance questions (inventory, policy, sanctioned path, data controls, approval, training, compliance mapping, monitoring, incident response). Get an exposure score, level (MANAGED → CRITICAL), and a **prioritised action plan** ordered by severity and weight.
- **Score a tool** — evaluate a single AI tool/vendor against six risk criteria (data sensitivity, training-on-your-data, data residency, access scope, certifications, sanctioned status). Get a risk rating (LOW → BLOCK) and the key concerns to raise in review.

## Models

```
org exposure = Σ((1 − controlAnswer) × weight) / Σ(weights)   → 0–100
tool risk    = Σ(criterionRisk × weight) / Σ(weights)         → 0–100
```

Exposure levels: CRITICAL (≥70) · ELEVATED (≥45) · MODERATE (≥22) · MANAGED (<22)
Tool ratings: BLOCK (≥70) · REVIEW (≥45) · CAUTION (≥24) · LOW (<24)

## Why it exists

Shadow AI is the AI-era shadow IT: staff adopt tools faster than security can vet them, and paste sensitive data into models with unknown training, residency, and retention. The first control isn't a block — it's **discovery**. You cannot govern what you cannot see. Then policy, a sanctioned path people actually want to use, and data-egress controls.

## Architecture

```
av-09/
├── src/
│   ├── module.js                     Platform manifest — registry + headless API
│   ├── engine/
│   │   ├── shadow.js                  Pure engine (no UI, no DOM)
│   │   └── shadow.test.mjs            Unit tests (25 assertions)
│   ├── data/sample.js                Sample presets + exporters
│   └── components/ShadowAiScanner.jsx
└── index.html                        Self-contained standalone build
```

`provides: ['shadow-ai-exposure', 'ai-tool-risk-score']`

## Run

```bash
node src/engine/shadow.test.mjs
npx esbuild entry.jsx --bundle --outfile=bundle.js --loader:.jsx=jsx --jsx=automatic
# open index.html
```

## Credits
Part of [ApexVector](https://github.com/DrXter/ApexVector-) — AI for Security · Security for AI.
