# ApexVector

> **AI for Security · Security for AI**

An open-source security toolkit — built one real problem at a time.

Every module starts as a problem practitioners actually face, gets validated by the community, and ships as a working tool you can open in your browser. No frameworks. No whitepapers. No sign-up.

---

## Modules

| ID | Module | Pillar | Status | Open |
|----|--------|--------|--------|------|
| **AV-01** | [VulnPriority Engine](./modules/av-01/) | AI for Security | ✅ Live | [Open tool ↗](https://drxter.github.io/ApexVector-/modules/av-01/) |
| **AV-02** | [Alert Triage Simulator](./modules/av-02/) | AI for Security | ✅ Live | [Open tool ↗](https://drxter.github.io/ApexVector-/modules/av-02/) |
| **AV-03** | [Risk Translator](./modules/av-03/) | AI for Security | ✅ Live | [Open tool ↗](https://drxter.github.io/ApexVector-/modules/av-03/) |
| **AV-04** | [Red Team Recon Planner](./modules/av-04/) | AI for Security | ✅ Live | [Open tool ↗](https://drxter.github.io/ApexVector-/modules/av-04/) |
| **AV-05** | [DevSecOps AI Readiness Checker](./modules/av-05/) | AI for Security | ✅ Live | [Open tool ↗](https://drxter.github.io/ApexVector-/modules/av-05/) |

### AV-01 · VulnPriority Engine
Rank vulnerability findings by what to fix first. Composite scoring weighs severity (CVSS), real-world exploit probability (EPSS), and business context (SSVC) — because a CVSS 9.8 on an unreachable internal box matters less than a 7.5 on your internet-facing auth service with a public exploit in the wild.

### AV-02 · Alert Triage Simulator
Structure the SOC triage decision. Enter an alert and its context, get a false-positive likelihood, an escalation tier, and concrete next actions — with every signal that drove the call shown openly. Context beats severity: corroboration and identity privilege outrank raw alert score.

### AV-03 · Risk Translator
Turn a technical finding into the language a board actually hears — the business consequence, a risk rating, and an optional financial exposure range. Because "CVSS 9.8" means nothing in a boardroom, but "\$4M regulatory exposure, highly likely to be exploited" ends the debate. Single-finding mode and a board-ready risk register with aggregate exposure.

### AV-04 · Red Team Recon Planner
Attackers break out in ~29 minutes; a red team's hours are finite. Rank your in-scope surface by foothold probability, aligned to your objective, timebox, and stealth constraints — then get ATT&CK-mapped attack-path hypotheses to validate first. A planning aid for **authorized, scoped** engagements: it sequences effort and methodology, never exploits or attack code.

### AV-05 · DevSecOps AI Readiness Checker
Your CI/CD pipeline scans human code. Your developers are shipping AI code. Those aren't the same threat model. Score how ready your pipeline is to ship AI-generated code safely — provenance, hallucinated dependencies, license contamination, agents that can modify their own guardrails — then map the new attack surface AI introduces across your SDLC.

---

## Two problem spaces

**AI for Security** — using AI to do security better: faster triage, smarter testing, sharper prioritisation, risk translated into language a board acts on.

**Security for AI** — securing AI systems themselves: prompt injection, agentic threat models, memory poisoning, shadow AI, AI supply chain risk.

Most security programmes treat these as separate. They aren't.

---

## Design principles

**Real problems only.** Every module maps to a pain point surfaced from practitioners — not invented in a boardroom.

**Ship working tools, not opinions.** Each release is something you can open and use today.

**Explainable by default.** Every score shows its signals, weights, and reasoning. If you disagree with the output, you can see exactly why it said what it said.

**Responsible by design.** Offensive-leaning tools are scoped to lawful, authorized use — methodology and prioritisation, never exploitation instructions.

**Nothing leaves your machine.** All modules run entirely client-side. No accounts, no telemetry, no data collection.

**Open source, always.** MIT licensed. Fork it, extend it, run it locally.

---

## Repository structure

\`\`\`
ApexVector-/
├── README.md
└── modules/
    ├── av-01/                        VulnPriority Engine
    ├── av-02/                        Alert Triage Simulator
    ├── av-03/                        Risk Translator
    ├── av-04/                        Red Team Recon Planner
    └── av-05/                        DevSecOps AI Readiness Checker
        ├── index.html                Standalone build — open in any browser
        ├── README.md
        └── src/
            ├── module.js             Platform manifest — registry + headless API
            ├── engine/               Pure engine (no UI, no DOM) + tests
            ├── data/                 Samples, parsers, exporters
            └── components/           Platform-mountable React module
\`\`\`

Every module follows the same shape: a **pure engine** with no UI dependency, a **data layer**, a **React component**, and a **manifest** the platform registry reads to mount it.

---

## Platform integration

Modules are built to run standalone *and* to plug into the wider ApexVector platform. Each exports a manifest with a headless API:

\`\`\`js
import manifest from './modules/av-01/src/module.js';

// Mount the UI
<manifest.component onResult={(scored, summary) => bus.emit('ranked-findings', scored)} />

// Or call it headlessly — no UI required
const findings = manifest.api.parse(rawText);
const enriched = await manifest.api.enrich(findings);   // live EPSS
const ranked   = manifest.api.score(enriched);
const summary  = manifest.api.summarize(ranked);
\`\`\`

Manifests declare \`provides\` and \`consumes\`, so modules feed each other through a shared data bus. The pipeline is already visible across the module set:

\`\`\`
AV-01 ranked-findings ──▶ AV-03 consumes ranked-findings ──▶ business-risk-register + financial-exposure
AV-04 recon-plan      ──▶ (future) engagement-execution tracking
AV-05 ai-readiness    ──▶ (future) unified pipeline risk view
AV-02 triaged-alerts  ──▶ (future) unified risk dashboard
\`\`\`

Prioritise findings in AV-01, triage the alert queue in AV-02, translate it for the board in AV-03, plan the authorized engagement in AV-04, and check your pipeline is ready for AI code in AV-05 — one toolkit, one data model.

---

## Running locally

\`\`\`bash
git clone https://github.com/DrXter/ApexVector-.git
cd ApexVector-/modules/av-01

# open index.html directly, or serve it
npx serve .

# run the engine tests
node src/engine/scoring.test.mjs      # av-01
node src/engine/triage.test.mjs       # av-02
node src/engine/translate.test.mjs    # av-03
node src/engine/recon.test.mjs        # av-04
node src/engine/readiness.test.mjs    # av-05
\`\`\`

Each module's \`index.html\` is fully self-contained — no build step, no dependencies, no network calls required.

---

## Contributing

Have a problem worth solving? Open an issue describing it: what the pain is, who feels it, and what it costs in time or risk. The most common, most painful problems get built first.

Bug reports and module improvements welcome via pull request.

---

## About

ApexVector is a personal open-source project by **Abhiram Manthripragada** — a cybersecurity practitioner working across offensive security, AI governance, and cyber risk advisory.

Not affiliated with any employer. All tools, research, and opinions are my own.

- LinkedIn: [Abhiram Manthripragada](https://www.linkedin.com/in/abhiram-manthripragada-3b632ab4/)
- Series: \`#ApexVector\`

---

## License

MIT — use it, fork it, build on it.

---

*ApexVector · AI for Security · Security for AI · Built in public.*
