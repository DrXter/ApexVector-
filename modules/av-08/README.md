# AV-08 · AI Memory Attack Simulator

> A prompt injection is a one-shot — unless your agent has memory. Then a single poisoned entry persists into every future session, and one win becomes a durable foothold.

Module 08 of **ApexVector**, in the **Security for AI** pillar. Continues the arc: AV-06 (a prompt can be bypassed) and AV-07 (an agent with tools has blast radius) are about a single session. Memory changes the *time axis* — poison what an agent remembers and the compromise persists.

## Two modes

- **Analyse my setup** — answer how your agent's memory works (untrusted read-back, write validation, per-user partitioning, expiry, constraint re-establishment, access control, secret hygiene). Get a memory-risk score, ranked gaps, and the memory attack classes you're exposed to. Context flags (untrusted input reaches storage / shared memory) amplify the relevant risks.
- **Memory attack classes** — a catalogue of the memory-specific classes (poisoning, persistent foothold, cross-user/cross-tenant leakage, memory flooding, false-memory fabrication, memory extraction): how each works and how to defend. No operational payloads.

## Model

```
risk = Σ((1 − controlAnswer) × weight) / Σ(weights)   → 0–100
  × context amplifiers (untrusted input reaches storage; shared memory)
```

Tiers: CRITICAL (≥70) · ELEVATED (≥45) · MODERATE (≥22) · HARDENED (<22)

## Responsible framing

A defensive analyser. It reasons about a memory design you own and maps applicable attack classes — it does not attack or poison anything. Consistent with AV-04/06/07: methodology and hardening, never weaponisation.

## Architecture

```
av-08/
├── src/
│   ├── module.js                          Platform manifest — registry + headless API
│   ├── engine/
│   │   ├── memory.js                       Pure engine (no UI, no DOM)
│   │   └── memory.test.mjs                 Unit tests (22 assertions)
│   ├── data/sample.js                      Sample setup + exporter
│   └── components/MemoryAttackSimulator.jsx
└── index.html                              Self-contained standalone build
```

`provides: ['memory-risk-score', 'memory-attack-exposure']`

## Run

```bash
node src/engine/memory.test.mjs
npx esbuild entry.jsx --bundle --outfile=bundle.js --loader:.jsx=jsx --jsx=automatic
# open index.html
```

## Credits
Part of [ApexVector](https://github.com/DrXter/ApexVector-) — AI for Security · Security for AI.
