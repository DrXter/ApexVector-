/**
 * ApexVector · AV-05 · DevSecOps AI Readiness Checker
 * Framework-agnostic engine — no UI, no DOM.
 *
 * Two capabilities:
 *   1) assessReadiness() — scores a DevSecOps pipeline on how prepared it is
 *      to safely ship AI-assisted / AI-generated code, and surfaces the gaps.
 *   2) profileAiCodeRisk() — given how a team uses AI in its SDLC, maps the
 *      NEW attack surface that AI introduces (the surface human-code scanning
 *      was never designed to catch).
 *
 * Thesis: your CI/CD pipeline scans human code. Your developers are shipping
 * AI code. Those are not the same threat model.
 */

export const ENGINE_VERSION = '1.0.0';
export const MODULE_ID = 'av-05';

// ----------------------------------------------------------------------------
// MODE 1 · Pipeline AI-readiness assessment
// ----------------------------------------------------------------------------

/**
 * Readiness controls, grouped. Each is a yes/partial/no question about the
 * pipeline. Weights reflect how much each control reduces AI-code risk.
 */
export const READINESS_CONTROLS = [
  { id: 'provenance', group: 'Provenance', weight: 0.10,
    q: 'Can you tell which code in your repos was AI-generated or AI-assisted?',
    gap: 'No AI-code provenance — you cannot scope review or incident response to AI-authored changes.' },
  { id: 'sca-ai-deps', group: 'Dependencies', weight: 0.09,
    q: 'Do you catch hallucinated or typo-squatted packages AI tools suggest before they merge?',
    gap: 'AI frequently invents plausible-but-nonexistent packages; without dependency validation these become supply-chain entry points.' },
  { id: 'secret-scan', group: 'Secrets', weight: 0.09,
    q: 'Do you scan AI-generated code for hardcoded secrets and unsafe defaults before commit?',
    gap: 'AI code often ships example keys, permissive CORS, and debug defaults that pass human review.' },
  { id: 'sast-tuned', group: 'SAST', weight: 0.08,
    q: 'Is your SAST tuned for the vulnerability patterns AI code tends to produce?',
    gap: 'Generic SAST misses AI-specific patterns (insecure deserialization, weak crypto defaults, injection via string-built queries).' },
  { id: 'review-policy', group: 'Review', weight: 0.10,
    q: 'Does AI-generated code get a heightened human review, not just the normal PR flow?',
    gap: 'AI code reviewed at the same depth as trusted human code — reviewers over-trust fluent output.' },
  { id: 'license-check', group: 'Licensing', weight: 0.07,
    q: 'Do you check AI-generated code for license contamination / verbatim training-data reproduction?',
    gap: 'AI can reproduce licensed code verbatim, creating IP and license-compliance exposure.' },
  { id: 'test-coverage', group: 'Testing', weight: 0.08,
    q: 'Do you require tests for AI-generated code that AI did not also write?',
    gap: 'AI writing both code and its tests validates its own assumptions — blind spots pass silently.' },
  { id: 'prompt-supply', group: 'Tooling', weight: 0.07,
    q: 'Are the AI coding tools / models your devs use governed and inventoried?',
    gap: 'Ungoverned AI tooling = shadow AI in the SDLC; no control over what leaves in prompts or comes back in code.' },
  { id: 'data-leak', group: 'Data', weight: 0.09,
    q: 'Do you prevent proprietary code / secrets from being sent to external AI tools in prompts?',
    gap: 'Source and secrets pasted into external models is data exfiltration your DLP may not see.' },
  { id: 'pipeline-authz', group: 'Pipeline', weight: 0.08,
    q: 'Are AI agents / assistants with repo or pipeline access scoped to least privilege?',
    gap: 'Over-permissioned AI agents can modify build config or enforcement files — the sandbox-disabling-the-sandbox class of risk.' },
  { id: 'incident-ai', group: 'Response', weight: 0.07,
    q: 'Does your IR plan account for a vulnerability traced to AI-generated code?',
    gap: 'No AI-code incident pathway — slow, unscoped response when AI-authored code is the root cause.' },
  { id: 'training', group: 'People', weight: 0.08,
    q: 'Are developers trained on the specific risks of shipping AI-generated code?',
    gap: 'Devs treat AI output as authoritative; without training, fluent-but-wrong code merges on trust.' },
];

export const READINESS_LEVELS = Object.freeze([
  { id: 'ready',      label: 'AI-READY',        min: 78, note: 'strong controls — maintain and monitor' },
  { id: 'partial',    label: 'PARTIALLY READY', min: 52, note: 'core gaps remain — close before scaling AI adoption' },
  { id: 'exposed',    label: 'EXPOSED',         min: 30, note: 'shipping AI code faster than you can govern it' },
  { id: 'blind',      label: 'FLYING BLIND',    min: 0,  note: 'no AI-specific controls — high unmanaged risk' },
]);

const ANSWER_VALUE = { yes: 1, partial: 0.5, no: 0 };
const clamp = (n, lo = 0, hi = 1) => Math.min(Math.max(n, lo), hi);

/**
 * Assess pipeline readiness.
 * @param {Object} answers  map of controlId -> 'yes'|'partial'|'no'
 */
export function assessReadiness(answers = {}) {
  const totalWeight = READINESS_CONTROLS.reduce((s, c) => s + c.weight, 0);
  let earned = 0;
  const gaps = [];

  for (const c of READINESS_CONTROLS) {
    const v = ANSWER_VALUE[answers[c.id]] ?? 0;
    earned += v * c.weight;
    if (v < 1) gaps.push({ id: c.id, group: c.group, severity: v === 0 ? 'open' : 'partial', gap: c.gap, weight: c.weight });
  }

  const score = Math.round((earned / totalWeight) * 100);
  const level = READINESS_LEVELS.find((l) => score >= l.min) ?? READINESS_LEVELS.at(-1);
  gaps.sort((a, b) => (a.severity === b.severity ? b.weight - a.weight : a.severity === 'open' ? -1 : 1));

  return {
    score,
    level: level.id,
    levelLabel: level.label,
    levelNote: level.note,
    gaps,
    topGaps: gaps.slice(0, 5),
    answered: Object.keys(answers).length,
    total: READINESS_CONTROLS.length,
  };
}

// ----------------------------------------------------------------------------
// MODE 2 · AI-code risk profile
// ----------------------------------------------------------------------------

/**
 * Ways teams use AI in the SDLC, each mapping to the new attack surface it
 * introduces. Selecting the ones a team does builds their risk profile.
 */
export const AI_USAGE_VECTORS = {
  'autocomplete': {
    label: 'AI autocomplete in the IDE', exposure: 0.5,
    surface: 'Insecure patterns suggested inline and accepted on trust',
    risks: ['insecure defaults merged silently', 'subtle logic flaws in fluent code'],
    control: 'Heightened review + SAST tuned for AI patterns',
  },
  'agent-commits': {
    label: 'AI agents that commit / open PRs', exposure: 0.85,
    surface: 'Autonomous code changes, potentially to build and enforcement config',
    risks: ['over-permissioned agent modifies pipeline', 'enforcement files overwritten', 'unreviewed autonomous merges'],
    control: 'Least-privilege agent scoping + mandatory human approval on config paths',
  },
  'nl-to-code': {
    label: 'Natural-language-to-code generation', exposure: 0.7,
    surface: 'Whole functions/modules generated from prompts',
    risks: ['hallucinated dependencies', 'injection via naive string-built queries', 'weak crypto defaults'],
    control: 'Dependency validation + secret scanning + tests not written by the same AI',
  },
  'ai-tests': {
    label: 'AI writes the tests too', exposure: 0.6,
    surface: 'AI validating its own code against its own assumptions',
    risks: ['blind spots pass silently', 'false confidence from green suites'],
    control: 'Require independent test authorship or adversarial test review',
  },
  'external-model': {
    label: 'Code / prompts sent to external models', exposure: 0.8,
    surface: 'Proprietary code and secrets leaving your boundary',
    risks: ['source-code exfiltration via prompts', 'secrets in context windows', 'training-data license reproduction'],
    control: 'Prompt DLP + governed/inventoried tooling + license checks',
  },
  'ai-infra': {
    label: 'AI generates IaC / pipeline config', exposure: 0.75,
    surface: 'Infrastructure and CI/CD defined by AI output',
    risks: ['over-permissioned cloud roles', 'public storage defaults', 'weakened pipeline gates'],
    control: 'IaC policy-as-code scanning + config-change review',
  },
};

export const USAGE_KEYS = Object.keys(AI_USAGE_VECTORS);

export const RISK_TIERS = Object.freeze([
  { id: 'critical', label: 'CRITICAL SURFACE', min: 70 },
  { id: 'elevated', label: 'ELEVATED SURFACE', min: 45 },
  { id: 'moderate', label: 'MODERATE SURFACE', min: 22 },
  { id: 'limited',  label: 'LIMITED SURFACE',  min: 0 },
]);

/**
 * Build an AI-code risk profile.
 * @param {string[]} usages    selected keys from AI_USAGE_VECTORS
 * @param {Object} [ctx]
 * @param {string} [ctx.governance]  high|med|low — existing AI governance maturity
 */
export function profileAiCodeRisk(usages = [], ctx = {}) {
  const selected = usages.filter((u) => AI_USAGE_VECTORS[u]).map((u) => ({ id: u, ...AI_USAGE_VECTORS[u] }));
  const govFactor = { high: 0.55, med: 0.8, low: 1.1 }[ctx.governance] ?? 1.0;

  // aggregate exposure: highest single surface dominates, others add tapering weight
  const sorted = [...selected].sort((a, b) => b.exposure - a.exposure);
  let agg = 0;
  sorted.forEach((s, i) => { agg += s.exposure * Math.pow(0.6, i); });
  const raw = clamp((agg / 2.2) * govFactor);
  const score = Math.round(raw * 100);
  const tier = RISK_TIERS.find((t) => score >= t.min) ?? RISK_TIERS.at(-1);

  return {
    score,
    tier: tier.id,
    tierLabel: tier.label,
    governance: ctx.governance || 'unspecified',
    surfaces: sorted.map((s) => ({ id: s.id, label: s.label, surface: s.surface, risks: s.risks, control: s.control, exposure: s.exposure })),
    priorityControls: dedupeControls(sorted),
    summary: buildRiskSummary(sorted, tier, ctx),
  };
}

function dedupeControls(surfaces) {
  const seen = new Set();
  const out = [];
  for (const s of surfaces) {
    if (!seen.has(s.control)) { seen.add(s.control); out.push(s.control); }
  }
  return out;
}

function buildRiskSummary(surfaces, tier, ctx) {
  if (surfaces.length === 0) return 'No AI usage selected — no AI-specific attack surface to profile.';
  const top = surfaces[0];
  const gov = ctx.governance === 'low' || !ctx.governance
    ? 'With limited AI governance in place, this surface is largely unmanaged.'
    : ctx.governance === 'high'
      ? 'Existing governance reduces but does not eliminate this surface.'
      : 'Partial governance leaves meaningful gaps.';
  return `Your highest-risk AI usage is "${top.label}" — introducing ${top.surface.toLowerCase()}. ` +
    `Across ${surfaces.length} AI usage pattern${surfaces.length > 1 ? 's' : ''}, this is a ${tier.label.toLowerCase()}. ${gov} ` +
    `The controls below are ordered by how much surface they close.`;
}
