# AV-07 · Agentic AI Threat Modeller

> A prompt injection is a content problem — until the model has tools. Then it's an actions problem. The blast radius is defined by what your agent can DO, not what it can say.

Module 07 of **ApexVector**, in the **Security for AI** pillar. The direct follow-on to AV-06: prompt injection showed instructions can be bypassed; this shows what happens when a bypassed agent holds tools, autonomy, and exposure.

## Two modes

- **Blast radius** — describe your agent's tools, autonomy level, input exposure, memory, and mitigations. Get a blast-radius score (CATASTROPHIC → CONTAINED), the irreversible actions, and the specific guardrail gaps a hijack would exploit.
- **Threat model** — the applicable agentic threat categories (aligned to OWASP Agentic Security Initiative & emerging taxonomies): goal manipulation, tool misuse, indirect injection, excessive agency, multi-agent compromise propagation, memory poisoning, data exfiltration — each with concrete mitigations. Applicability is derived from your config, so you only see what's relevant.

## Model

```
capability = tapering sum of tool damage scores (highest dominates)
blast = capability × autonomyFactor × exposureFactor × mitigations   → 0–100
```

Bands: CATASTROPHIC (≥72) · SEVERE (≥50) · MODERATE (≥28) · CONTAINED (<28)

Autonomy (human-approval → full-auto) and exposure (trusted-only → retrieval) raise the blast radius; least-privilege scoping and out-of-model action validation lower it.

## Responsible framing

A defensive threat-modelling aid. It reasons about the blast radius your configuration implies and maps applicable threats — it does not attack anything. Consistent with AV-04 and AV-06: methodology and hardening, never weaponisation.

## Architecture

```
av-07/
├── src/
│   ├── module.js                         Platform manifest — registry + headless API
│   ├── engine/
│   │   ├── agentic.js                     Pure engine (no UI, no DOM)
│   │   └── agentic.test.mjs               Unit tests (20 assertions)
│   ├── data/sample.js                     Sample agent + exporter
│   └── components/AgenticThreatModeller.jsx
└── index.html                             Self-contained standalone build
```

`provides: ['agent-blast-radius', 'agentic-threat-model']`

## Run

```bash
node src/engine/agentic.test.mjs
npx esbuild entry.jsx --bundle --outfile=bundle.js --loader:.jsx=jsx --jsx=automatic
# open index.html
```

## Credits
Part of [ApexVector](https://github.com/DrXter/ApexVector-) — AI for Security · Security for AI.
