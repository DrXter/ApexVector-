ApexVector


AI for Security · Security for AI



An open-source security toolkit — built one real problem at a time.

Every module starts as a problem practitioners actually face, gets validated by the community, and ships as a working tool you can open in your browser. No frameworks. No whitepapers. No sign-up.


Modules

IDModulePillarStatusOpenAV-01VulnPriority EngineAI for Security✅ LiveOpen tool ↗AV-02Alert Triage SimulatorAI for Security✅ LiveOpen tool ↗

AV-01 · VulnPriority Engine

Rank vulnerability findings by what to fix first. Composite scoring weighs severity (CVSS), real-world exploit probability (EPSS), and business context (SSVC) — because a CVSS 9.8 on an unreachable internal box matters less than a 7.5 on your internet-facing auth service with a public exploit in the wild.

AV-02 · Alert Triage Simulator

Structure the SOC triage decision. Enter an alert and its context, get a false-positive likelihood, an escalation tier, and concrete next actions — with every signal that drove the call shown openly. Context beats severity: corroboration and identity privilege outrank raw alert score.


Two problem spaces

AI for Security — using AI to do security better: faster triage, smarter testing, sharper prioritisation, risk translated into language a board acts on.

Security for AI — securing AI systems themselves: prompt injection, agentic threat models, shadow AI, memory poisoning, AI supply chain risk.

Most security programmes treat these as separate. They aren't.


Design principles

Real problems only. Every module maps to a pain point surfaced from practitioners — not invented in a boardroom.

Ship working tools, not opinions. Each release is something you can open and use today.

Explainable by default. Every score shows its signals, weights, and reasoning. If you disagree with the output, you can see exactly why it said what it said.

Nothing leaves your machine. All modules run entirely client-side. No accounts, no telemetry, no data collection.

Open source, always. MIT licensed. Fork it, extend it, run it locally.


Repository structure

ApexVector-/
├── README.md
└── modules/
    ├── av-01/                        VulnPriority Engine
    │   ├── index.html                Standalone build — open in any browser
    │   ├── README.md
    │   └── src/
    │       ├── module.js             Platform manifest — registry + headless API
    │       ├── engine/scoring.js     Pure scoring engine (no UI, no DOM)
    │       ├── data/                 Parsers, EPSS feed adapter, samples
    │       └── components/           Platform-mountable React module
    └── av-02/                        Alert Triage Simulator
        ├── index.html
        ├── README.md
        └── src/
            ├── module.js
            ├── engine/triage.js
            ├── data/sample.js
            └── components/

Every module follows the same shape: a pure engine with no UI dependency, a data layer, a React component, and a manifest the platform registry reads to mount it.


Platform integration

Modules are built to run standalone and to plug into the wider ApexVector platform. Each exports a manifest with a headless API:

jsimport manifest from './modules/av-01/src/module.js';

// Mount the UI
<manifest.component onResult={(scored, summary) => bus.emit('ranked-findings', scored)} />

// Or call it headlessly — no UI required
const findings = manifest.api.parse(rawText);
const enriched = await manifest.api.enrich(findings);   // live EPSS
const ranked   = manifest.api.score(enriched);
const summary  = manifest.api.summarize(ranked);

Manifests declare provides and consumes, so modules can feed each other through a shared data bus — AV-01's ranked findings become input to a future reporting module, AV-02's triage summary feeds a unified risk dashboard.


Running locally

bashgit clone https://github.com/DrXter/ApexVector-.git
cd ApexVector-/modules/av-01

# open index.html directly, or serve it
npx serve .

# run the engine tests
node src/engine/scoring.test.mjs

Each module's index.html is fully self-contained — no build step, no dependencies, no network calls required.


Contributing

Have a problem worth solving? Open an issue describing it: what the pain is, who feels it, and what it costs in time or risk. The most common, most painful problems get built first.

Bug reports and module improvements welcome via pull request.


About

ApexVector is a personal open-source project by Abhiram Manthripragada — a cybersecurity practitioner working across offensive security, AI governance, and cyber risk advisory.

Not affiliated with any employer. All tools, research, and opinions are my own.


LinkedIn: Abhiram Manthripragada
Series: #ApexVector



License

MIT — use it, fork it, build on it.


ApexVector · AI for Security · Security for AI · Built in public.
