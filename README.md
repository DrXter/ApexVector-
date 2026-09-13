# ApexVector

> **AI for Security · Security for AI**

An open-source security toolkit — built one real problem at a time.

Every module starts as a problem practitioners actually face, gets validated by the community, and ships as a working tool you can open in your browser. No frameworks. No whitepapers. No sign-up.

**Season 1 is complete — ten modules across two problem spaces.** Season 2 is coming up next, built for the boardroom and the difficult decisions it has to make on AI risk.

---

## Modules

| ID | Module | Pillar | Status | Open |
|----|--------|--------|--------|------|
| **AV-01** | [VulnPriority Engine](./modules/av-01/) | AI for Security | ✅ Live | [Open tool ↗](https://drxter.github.io/ApexVector-/modules/av-01/) |
| **AV-02** | [Alert Triage Simulator](./modules/av-02/) | AI for Security | ✅ Live | [Open tool ↗](https://drxter.github.io/ApexVector-/modules/av-02/) |
| **AV-03** | [Risk Translator](./modules/av-03/) | AI for Security | ✅ Live | [Open tool ↗](https://drxter.github.io/ApexVector-/modules/av-03/) |
| **AV-04** | [Red Team Recon Planner](./modules/av-04/) | AI for Security | ✅ Live | [Open tool ↗](https://drxter.github.io/ApexVector-/modules/av-04/) |
| **AV-05** | [DevSecOps AI Readiness Checker](./modules/av-05/) | AI for Security | ✅ Live | [Open tool ↗](https://drxter.github.io/ApexVector-/modules/av-05/) |
| **AV-06** | [Prompt Injection Test Suite](./modules/av-06/) | 🔴 Security for AI | ✅ Live | [Open tool ↗](https://drxter.github.io/ApexVector-/modules/av-06/) |
| **AV-07** | [Agentic AI Threat Modeller](./modules/av-07/) | 🔴 Security for AI | ✅ Live | [Open tool ↗](https://drxter.github.io/ApexVector-/modules/av-07/) |
| **AV-08** | [AI Memory Attack Simulator](./modules/av-08/) | 🔴 Security for AI | ✅ Live | [Open tool ↗](https://drxter.github.io/ApexVector-/modules/av-08/) |
| **AV-09** | [Shadow AI Risk Scanner](./modules/av-09/) | 🔴 Security for AI | ✅ Live | [Open tool ↗](https://drxter.github.io/ApexVector-/modules/av-09/) |
| **AV-10** | [The Final Showdown](./modules/av-10/) | 🟡 Season 1 Finale | ✅ Live | [Open tool ↗](https://drxter.github.io/ApexVector-/modules/av-10/) |

### — AI for Security —

**AV-01 · VulnPriority Engine**
Rank vulnerability findings by what to fix first. Composite scoring weighs severity (CVSS), real-world exploit probability (EPSS), and business context (SSVC) — because a CVSS 9.8 on an unreachable internal box matters less than a 7.5 on your internet-facing auth service with a public exploit in the wild.

**AV-02 · Alert Triage Simulator**
Structure the SOC triage decision. Enter an alert and its context, get a false-positive likelihood, an escalation tier, and concrete next actions — with every signal that drove the call shown openly. Context beats severity: corroboration and identity privilege outrank raw alert score.

**AV-03 · Risk Translator**
Turn a technical finding into the language a board actually hears — the business consequence, a risk rating, and an optional financial exposure range. Because "CVSS 9.8" means nothing in a boardroom, but "\$4M regulatory exposure, highly likely to be exploited" ends the debate. Single-finding mode and a board-ready risk register with aggregate exposure.

**AV-04 · Red Team Recon Planner**
Attackers break out in ~29 minutes; a red team's hours are finite. Rank your in-scope surface by foothold probability, aligned to your objective, timebox, and stealth constraints — then get ATT&CK-mapped attack-path hypotheses to validate first. A planning aid for **authorized, scoped** engagements: it sequences effort and methodology, never exploits or attack code.

**AV-05 · DevSecOps AI Readiness Checker**
Your CI/CD pipeline scans human code. Your developers are shipping AI code. Those aren't the same threat model. Score how ready your pipeline is to ship AI-generated code safely — provenance, hallucinated dependencies, license contamination, agents that can modify their own guardrails — then map the new attack surface AI introduces across your SDLC.

### — Security for AI —

*An escalating arc: content → actions → persistence → governance.*

**AV-06 · Prompt Injection Test Suite**
Your LLM cannot tell the difference between your instructions and an attacker's — they arrive in the same context window. Test a system prompt you own for the hardening controls that actually matter, get a robustness score and the injection classes you're exposed to, and browse the full catalogue of known attack classes with their defenses. A defensive tool: it hardens what you own, it doesn't weaponise against others. *(The content problem.)*

**AV-07 · Agentic AI Threat Modeller**
A prompt injection is a content problem — until the model has tools. Then it's an actions problem. Describe your agent's capabilities, autonomy, and exposure, and see its blast radius: how much damage a single hijack could do, which actions are irreversible, where the guardrails are missing, and which agentic threats apply (goal manipulation, tool misuse, indirect injection, excessive agency, memory poisoning, exfiltration). The blast radius is defined by what the agent can do, not what it can say. *(The actions problem.)*

**AV-08 · AI Memory Attack Simulator**
A prompt injection is a one-shot — unless your agent has memory. Then a single poisoned entry persists into every future session, and one win becomes a durable foothold. Analyse your memory setup for poisoning, persistence, and cross-user leakage, get the controls you're missing, and browse the memory attack classes with defenses. The core defense: treat stored memory as untrusted input that happens to persist, not as trusted truth. *(The persistence problem.)*

**AV-09 · Shadow AI Risk Scanner**
Your employees are already using AI tools you've never heard of — pasting data into models you've never vetted. Shadow AI is shadow IT's faster, hungrier cousin, and the risk isn't the tools; it's the invisibility. Assess your org's exposure across nine governance dimensions and get a prioritised action plan, or score an individual unsanctioned tool against data, access, and compliance criteria. You cannot govern what you cannot see: discover first, enable second, control third. *(The governance problem.)*

### — Season 1 Finale —

**AV-10 · The Final Showdown**
Nine modules. Nine lenses on the same organisation. One shared intake runs through all of them — vulnerability priority feeds straight into board risk translation, the one real chain in the series — and every lens rolls up into a single composite AI-security posture score. Not a fake pipeline pretending unrelated risk domains cause one another: nine honest, independent measurements, combined into one portfolio view. Edit the intake, run the pipeline, see which of the nine lenses is your weakest link.

---

## Two problem spaces

**AI for Security** — using AI to do security better: faster triage, smarter testing, sharper prioritisation, risk translated into language a board acts on.

**Security for AI** — securing AI systems themselves: prompt injection, agentic threat models, memory poisoning, shadow AI, AI supply chain risk.

Most security programmes treat these as separate. They aren't. Season 1 built out **AI for Security** first (AV-01–05), then moved into **Security for AI** (AV-06–09), tracing an escalating arc from content to actions to persistence to governance — before closing with a composite view across all nine (AV-10).

---

## Design principles

**Real problems only.** Every module maps to a pain point surfaced from practitioners — not invented in a boardroom.

**Ship working tools, not opinions.** Each release is something you can open and use today.

**Explainable by default.** Every score shows its signals, weights, and reasoning. If you disagree with the output, you can see exactly why it said what it said.

**Responsible by design.** Offensive-leaning and AI-attack-adjacent tools are scoped to lawful, authorized, defensive use — methodology, hardening, and threat-modelling, never weaponisation.

**Honest about relationships.** AV-10 combines nine independent risk lenses into one score without fabricating causal links between domains that don't actually depend on each other. A portfolio view, not a false pipeline.

**Nothing leaves your machine.** All modules run entirely client-side. No accounts, no telemetry, no data collection.

**Open source, always.** MIT licensed. Fork it, extend it, run it locally.

---

## Repository structure

```
ApexVector-/
├── README.md
└── modules/
    ├── av-01/                        VulnPriority Engine
    ├── av-02/                        Alert Triage Simulator
    ├── av-03/                        Risk Translator
    ├── av-04/                        Red Team Recon Planner
    ├── av-05/                        DevSecOps AI Readiness Checker
    ├── av-06/                        Prompt Injection Test Suite
    ├── av-07/                        Agentic AI Threat Modeller
    ├── av-08/                        AI Memory Attack Simulator
    ├── av-09/                        Shadow AI Risk Scanner
    └── av-10/                        The Final Showdown (Season 1 finale)
        ├── index.html                Standalone build — open in any browser
        ├── README.md
        └── src/
            ├── module.js             Platform manifest — registry + headless API
            ├── engine(s)/            Pure engine (no UI, no DOM) + tests
            ├── data/                 Samples, parsers, exporters
            └── components/           Platform-mountable React module
```

Every module follows the same shape: a **pure engine** with no UI dependency, a **data layer**, a **React component**, and a **manifest** the platform registry reads to mount it.

---

## Platform integration

Modules are built to run standalone *and* to plug into the wider ApexVector platform. Each exports a manifest with a headless API:

```js
import manifest from './modules/av-01/src/module.js';

// Mount the UI
<manifest.component onResult={(scored, summary) => bus.emit('ranked-findings', scored)} />

// Or call it headlessly — no UI required
const findings = manifest.api.parse(rawText);
const enriched = await manifest.api.enrich(findings);   // live EPSS
const ranked   = manifest.api.score(enriched);
const summary  = manifest.api.summarize(ranked);
```

Manifests declare `provides` and `consumes`, so modules feed each other through a shared data bus. Across the module set:

```
AV-01 ranked-findings ──▶ AV-03 consumes ranked-findings ──▶ business-risk-register + financial-exposure
AV-04 recon-plan          ─┐
AV-05 ai-readiness        ─┤
AV-06 injection-exposure   ─┤
AV-07 agent-blast-radius   ─┼──▶ AV-10 combines all nine into one composite AI-security posture score
AV-08 memory-attack-exposure ─┤
AV-09 shadow-ai-exposure    ─┘
AV-02 triaged-alerts      ─┘
```

AV-10 is explicit that only the AV-01 → AV-03 link is a genuine causal chain; every other module feeds the composite as an independent lens, not a fabricated pipeline stage.

---

## Running locally

```bash
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
node src/engine/injection.test.mjs    # av-06
node src/engine/agentic.test.mjs      # av-07
node src/engine/memory.test.mjs       # av-08
node src/engine/shadow.test.mjs       # av-09
node src/engines/posture.test.mjs     # av-10
```

Each module's `index.html` is fully self-contained — no build step, no dependencies, no network calls required.

---

## What's next — Season 2

Season 1 was built for practitioners — engineers, analysts, red-teamers who open a tool and use it. **Season 2 is built for the boardroom** — CISOs, CXOs, board and audit-committee members who fund, govern, and ultimately answer for AI risk. Same open-source discipline, same weekly rhythm, different questions: AI security budget and ROI, accountability when an AI system fails, exposure from shadow AI and ungoverned agents, AI supply chain due diligence, and where a company's AI-driven IP is actually at risk.

Details land here as Season 2 begins.

---

## Contributing

Have a problem worth solving? Open an issue describing it: what the pain is, who feels it, and what it costs in time or risk. The most common, most painful problems get built first.

Bug reports and module improvements welcome via pull request.

---

## About

ApexVector is a personal open-source project by **Abhiram Manthripragada** — a cybersecurity practitioner working across offensive security, AI governance, and cyber risk advisory.

Not affiliated with any employer. All tools, research, and opinions are my own.

- LinkedIn: [Abhiram Manthripragada](https://www.linkedin.com/in/abhiram-manthripragada-3b632ab4/)
- Series: `#ApexVector`

---

## License

MIT — use it, fork it, build on it.

---

*ApexVector · AI for Security · Security for AI · Season 1 complete · Built in public.*
