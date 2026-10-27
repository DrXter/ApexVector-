# AV-12 · Human vs Agent Finding Classifier

> An AI can top a bug bounty leaderboard and still miss the finding that matters most to your business.

Module 12 of **ApexVector**, Season 2, Episode 2. Pick a class of finding, say what is true about it, and get a verdict on who should hunt it: an AI agent, a person, or both. Then a named person assigns it, in writing.

Built for Global Capability Centres, where the parent's systems, the parent's IP and production data are often a few hops away from the system being tested.

## What it does

- **Classifier.** 20 vulnerability classes, each with a base score for agents and for people. Eight yes / no / unsure questions move the scores. Every step is shown on screen.
- **Boundary rule.** If the parent's systems, the parent's IP or production data is involved (yes or unsure), an agent-only verdict becomes "both".
- **Decision gate.** A named person records the assignment. Overriding the verdict, or any LOW-confidence call, needs a written reason. Agent-only is refused while a boundary gate has fired.
- **Queue.** A synthetic backlog of six findings with counts by verdict.
- **LLM-ready export.** JSON, prompt-ready Markdown, one training record (JSONL), and a copy-as-prompt button, in the shared `apexvector-export` 1.0 schema. Generated in the browser; nothing is sent anywhere.

## Model

```
agent score  = clamp(base agent  + Σ flag deltas, 0, 100)
person score = clamp(base person + Σ flag deltas, 0, 100)
lean         = agent − person
verdict      = AGENT if lean ≥ +25 · HUMAN if lean ≤ −25 · otherwise BOTH
confidence   = (distance from lean to the nearest threshold) − 5 per "unsure"
               HIGH ≥ 15 · MEDIUM ≥ 7 · otherwise LOW
```

"Yes" applies a flag's full delta, "unsure" half, "no" none.

## What this is not

- The scores are ApexVector defaults chosen to make the reasoning visible. They are not measured agent or human performance and not a benchmark.
- It sees a class and your answers, not the finding. It says nothing about severity or whether a finding exists.
- Agent capability changes fast. Re-check the base scores each quarter.
- The sample findings and queue are synthetic. No real organisation or engagement data is used.

## Architecture

```
av-12/
├── src/
│   ├── module.js                          Platform manifest
│   ├── engine/classifier.js               Pure engine (no UI, no DOM)
│   ├── engine/classifier.test.mjs         Unit tests (30)
│   ├── export/schema.js                   Shared export + training-record schema
│   ├── data/sample.js                     Synthetic samples + exporters
│   └── components/FindingClassifier.jsx
├── examples/                              Local-model script, dataset generator, samples
└── index.html                             Self-contained standalone build
```

`provides: ['hunter-verdict', 'hunter-assignment-decision']`

## Run

```bash
npm test                                             # engine tests
npm install && npm run build                         # rebuild index.html
node examples/make-dataset.mjs 500 12 > av12.jsonl  # seeded synthetic training set
AV_MODEL=<your-model> node examples/ask-local-model.mjs examples/sample-export.md   # localhost only
```
