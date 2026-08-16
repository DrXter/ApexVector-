# AV-06 · Prompt Injection Test Suite

> Your LLM cannot tell the difference between your instructions and an attacker's — they arrive in the same context window. Robustness comes from the controls around the model, not from hoping it notices.

Module 06 of **ApexVector** — and the first in the **Security for AI** pillar. A **defensive** tool: test a system prompt you own for hardening controls, and learn the known injection classes with their defenses.

## Two modes

- **Test my prompt** — paste a system prompt you own; it checks for the presence of known hardening controls (untrusted-input handling, constraint reassertion, input delimiting, tool guards, refusal behaviour, secret hygiene), scores robustness 0–100, and maps which OWASP LLM01 injection classes you're exposed to — with defenses. Context flags (drives tools / uses retrieval) raise the bar appropriately.
- **Injection classes** — a catalogue of the known classes (direct override, role-play escape, indirect/second-order, system-prompt extraction, tool abuse, encoding/obfuscation): how each works conceptually, why the model is susceptible, and how to defend. No operational payloads.

## Responsible framing

This tool inspects a prompt **you own** for missing defenses and teaches the threat model. It does **not** generate working attacks against third-party systems. Framing mirrors AV-04: methodology and hardening, never weaponisation.

## Model

```
robustness = Σ(present control weights) / Σ(all weights)   → 0–100
  × context penalties (tools without tool-guard; retrieval without input controls)
```

Levels: HARDENED (≥78) · MODERATE (≥50) · WEAK (≥28) · EXPOSED (<28)

Heuristic and transparent: it detects the *shape* of a control, not its guaranteed effectiveness. Prompt-level defenses are necessary but never sufficient — real resilience needs live red-teaming and controls outside the prompt.

## Architecture

```
av-06/
├── src/
│   ├── module.js                        Platform manifest — registry + headless API
│   ├── engine/
│   │   ├── injection.js                 Pure engine (no UI, no DOM)
│   │   └── injection.test.mjs           Unit tests (19 assertions)
│   ├── data/sample.js                   Sample + hardened reference prompts
│   └── components/PromptInjectionSuite.jsx
└── index.html                           Self-contained standalone build
```

`provides: ['prompt-robustness-score', 'injection-exposure']`

## Run

```bash
node src/engine/injection.test.mjs
npx esbuild entry.jsx --bundle --outfile=bundle.js --loader:.jsx=jsx --jsx=automatic
# open index.html
```

## Credits
Part of [ApexVector](https://github.com/DrXter/ApexVector-) — AI for Security · Security for AI.
