/**
 * ApexVector · AV-10 · Final Showdown — Unified AI Security Posture Engine
 * Framework-agnostic engine — no UI, no DOM.
 *
 * Season 1 capstone. A CONNECTED PIPELINE, not a dashboard:
 *   - One shared intake feeds all 9 prior modules' scoring logic.
 *   - AV-01 → AV-03 is the one genuine sequential chain in the series:
 *     ranked findings feed directly into the board risk translation.
 *   - The other 7 modules are parallel, independent risk lenses — each
 *     reasons over its own slice of the intake.
 *   - All 9 outputs roll into ONE composite AI-Security Posture Score.
 *
 * Honest design note: most of these 9 domains do NOT causally depend on
 * each other (an agent's blast radius doesn't feed shadow-AI exposure).
 * This engine does not pretend otherwise. It is nine lenses on one
 * organisation, combined into one number — not a fabricated assembly line.
 */

export const ENGINE_VERSION = '1.0.0';
export const MODULE_ID = 'av-10';

const clamp = (n, lo = 0, hi = 1) => Math.min(Math.max(n, lo), hi);
const ANSWER_VALUE = { yes: 1, partial: 0.5, no: 0 };

// ---------------------------------------------------------------------------
// Each sub-engine below is a faithful, compact re-implementation of the
// corresponding AV-0X module's scoring model, so it can run headlessly here
// against one shared intake. Each returns { score (0-100, RISK not health,
// so higher = worse), label, detail } for uniform aggregation.
// ---------------------------------------------------------------------------

/** AV-01 · VulnPriority — composite finding risk (severity/EPSS/business ctx). */
function runVulnPriority(intake) {
  const findings = intake.findings || [];
  if (!findings.length) return { id: 'av01', name: 'Vulnerability Priority', score: 0, label: 'no findings supplied', ranked: [] };
  const ranked = findings.map((f) => {
    const cvss = clamp((f.cvss ?? 5) / 10);
    const epss = clamp(f.epss ?? 0.3);
    const biz = clamp(f.businessContext ?? 0.5);
    const composite = cvss * 0.35 + epss * 0.40 + biz * 0.25;
    return { ...f, score: Math.round(composite * 100) };
  }).sort((a, b) => b.score - a.score);
  const topScore = ranked[0]?.score ?? 0;
  return { id: 'av01', name: 'Vulnerability Priority', score: topScore, label: `top finding: ${ranked[0]?.title ?? 'n/a'}`, ranked };
}

/** AV-02 · Alert Triage — worst-case alert risk from context signals. */
function runAlertTriage(intake) {
  const alerts = intake.alerts || [];
  if (!alerts.length) return { id: 'av02', name: 'Alert Triage', score: 0, label: 'no alerts supplied' };
  const scored = alerts.map((a) => {
    const sev = clamp(a.severity ?? 0.5);
    const assetCrit = clamp(a.assetCriticality ?? 0.5);
    const priv = clamp(a.userPrivilege ?? 0.3);
    const corrob = clamp(a.corroboration ?? 0.3);
    const composite = sev * 0.20 + assetCrit * 0.18 + priv * 0.14 + corrob * 0.18 + clamp(a.anomaly ?? 0.4) * 0.15 + clamp(a.threatIntel ?? 0.3) * 0.15;
    return Math.round(composite * 100);
  });
  const top = Math.max(...scored);
  return { id: 'av02', name: 'Alert Triage', score: top, label: `${alerts.length} alert(s) assessed, highest tier score ${top}` };
}

/** AV-03 · Risk Translator — consumes AV-01's ranked findings (the real chain link). */
function runRiskTranslator(vulnResult) {
  const top = vulnResult.ranked?.[0];
  if (!top) return { id: 'av03', name: 'Board Risk Translation', score: 0, label: 'no findings to translate (depends on AV-01)' };
  // business risk blends technical severity (proxy: the AV-01 score) with category impact
  const severity = clamp(top.score / 100);
  const impact = clamp(top.businessContext ?? 0.5);
  const likelihood = clamp(top.epss ?? 0.3);
  const composite = severity * 0.30 + impact * 0.40 + likelihood * 0.30;
  return { id: 'av03', name: 'Board Risk Translation', score: Math.round(composite * 100), label: `translating "${top.title ?? 'top finding'}" for the board`, dependsOn: 'av01' };
}

/** AV-04 · Recon Planner — highest blast-relevant surface priority (informational risk lens on scope, not an attack). */
function runReconPlanner(intake) {
  const surfaces = intake.surfaces || [];
  if (!surfaces.length) return { id: 'av04', name: 'Attack Surface Priority', score: 0, label: 'no scope supplied' };
  const scored = surfaces.map((s) => {
    const yieldFactor = clamp(s.yield ?? 0.6);
    const exposure = clamp(s.exposure ?? 0.5);
    const hardening = clamp(s.hardening ?? 0.5);
    return Math.round(clamp(yieldFactor * 0.45 + exposure * 0.30 - hardening * 0.20) * 100);
  });
  const top = Math.max(...scored);
  return { id: 'av04', name: 'Attack Surface Priority', score: top, label: `${surfaces.length} surface(s) in scope, lead vector at ${top}` };
}

/** AV-05 · DevSecOps AI Readiness — inverted to a RISK score (100 - readiness). */
function runAiReadiness(intake) {
  const answers = intake.devSecOpsControls || {};
  const keys = Object.keys(answers);
  if (!keys.length) return { id: 'av05', name: 'DevSecOps AI Readiness', score: 70, label: 'no controls supplied — assumed unassessed (treated as risky)' };
  const avg = keys.reduce((s, k) => s + (ANSWER_VALUE[answers[k]] ?? 0), 0) / keys.length;
  const readiness = Math.round(avg * 100);
  return { id: 'av05', name: 'DevSecOps AI Readiness', score: 100 - readiness, label: `pipeline readiness ${readiness}/100` };
}

/** AV-06 · Prompt Injection — inverted robustness (100 - robustness) = risk. */
function runPromptInjection(intake) {
  const controls = intake.promptControls || {};
  const keys = Object.keys(controls);
  if (!keys.length) return { id: 'av06', name: 'Prompt Injection Robustness', score: 70, label: 'no prompt supplied — assumed unhardened' };
  const avg = keys.reduce((s, k) => s + (controls[k] ? 1 : 0), 0) / keys.length;
  const robustness = Math.round(avg * 100);
  return { id: 'av06', name: 'Prompt Injection Robustness', score: 100 - robustness, label: `robustness ${robustness}/100` };
}

/** AV-07 · Agentic Threat — blast radius as direct risk score. */
function runAgenticThreat(intake) {
  const agent = intake.agent;
  if (!agent) return { id: 'av07', name: 'Agentic Blast Radius', score: 0, label: 'no agent configured' };
  const tools = agent.tools || [];
  const damageMap = { 'code-exec': 0.95, financial: 0.9, provision: 0.9, 'db-admin': 0.8, 'file-system': 0.75, 'send-comms': 0.7, 'call-other-agents': 0.7, 'write-internal': 0.65, 'external-http': 0.6, 'read-internal': 0.4 };
  const sorted = tools.map((t) => damageMap[t] ?? 0.5).sort((a, b) => b - a);
  let capability = 0; sorted.forEach((d, i) => { capability += d * Math.pow(0.55, i); });
  capability = clamp(capability / 1.9);
  const autonomyFactor = { 'human-approval': 0.35, 'human-on-loop': 0.6, 'notify-only': 0.85, 'full-auto': 1.0 }[agent.autonomy] ?? 0.6;
  const exposureFactor = { 'trusted-only': 0.4, authenticated: 0.65, public: 0.9, retrieval: 1.0 }[agent.exposure] ?? 0.65;
  const blast = clamp(capability * (0.5 + 0.5 * autonomyFactor) * (0.55 + 0.45 * exposureFactor));
  return { id: 'av07', name: 'Agentic Blast Radius', score: Math.round(blast * 100), label: `${tools.length} tool(s), ${agent.autonomy ?? 'unspecified'} autonomy` };
}

/** AV-08 · Memory Attack — direct risk score from missing controls. */
function runMemoryAttack(intake) {
  const controls = intake.memoryControls || {};
  const keys = Object.keys(controls);
  if (!keys.length) return { id: 'av08', name: 'Memory Attack Exposure', score: 70, label: 'no memory config supplied — assumed unguarded' };
  const riskAccum = keys.reduce((s, k) => s + (1 - (ANSWER_VALUE[controls[k]] ?? 0)), 0) / keys.length;
  return { id: 'av08', name: 'Memory Attack Exposure', score: Math.round(clamp(riskAccum) * 100), label: `${keys.length} memory control(s) assessed` };
}

/** AV-09 · Shadow AI — direct risk score from governance gaps. */
function runShadowAi(intake) {
  const controls = intake.shadowAiControls || {};
  const keys = Object.keys(controls);
  if (!keys.length) return { id: 'av09', name: 'Shadow AI Exposure', score: 70, label: 'no governance data supplied — assumed ungoverned' };
  const riskAccum = keys.reduce((s, k) => s + (1 - (ANSWER_VALUE[controls[k]] ?? 0)), 0) / keys.length;
  return { id: 'av09', name: 'Shadow AI Exposure', score: Math.round(clamp(riskAccum) * 100), label: `${keys.length} governance dimension(s) assessed` };
}

// ---------------------------------------------------------------------------
// Composite posture
// ---------------------------------------------------------------------------

export const POSTURE_BANDS = Object.freeze([
  { id: 'critical', label: 'CRITICAL POSTURE', min: 65, note: 'multiple high-severity gaps across attack mechanics and governance' },
  { id: 'weak',     label: 'WEAK POSTURE',     min: 45, note: 'meaningful exposure across several dimensions — prioritise and close gaps' },
  { id: 'developing', label: 'DEVELOPING POSTURE', min: 25, note: 'foundational controls exist — tighten the weaker dimensions' },
  { id: 'strong',   label: 'STRONG POSTURE',   min: 0,  note: 'consistently well-governed across all nine dimensions' },
]);

// Equal-weight by default; the two chained modules (av01,av03) are weighted
// slightly lower individually since they jointly represent one risk thread,
// keeping the total contribution comparable to the other seven lenses.
const WEIGHTS = { av01: 0.08, av02: 0.11, av03: 0.08, av04: 0.11, av05: 0.11, av06: 0.13, av07: 0.13, av08: 0.13, av09: 0.12 };

/**
 * Run the full pipeline against one shared intake object and produce the
 * composite AI-Security Posture Score.
 * @param {Object} intake  see module.js / data/sample.js for shape
 */
export function runPipeline(intake = {}) {
  const av01 = runVulnPriority(intake);
  const av02 = runAlertTriage(intake);
  const av03 = runRiskTranslator(av01); // the one real chain: av01 -> av03
  const av04 = runReconPlanner(intake);
  const av05 = runAiReadiness(intake);
  const av06 = runPromptInjection(intake);
  const av07 = runAgenticThreat(intake);
  const av08 = runMemoryAttack(intake);
  const av09 = runShadowAi(intake);

  const lenses = [av01, av02, av03, av04, av05, av06, av07, av08, av09];

  const totalWeight = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  const weighted = lenses.reduce((sum, l) => sum + (l.score / 100) * (WEIGHTS[l.id] ?? 0.11), 0);
  const composite = Math.round(clamp(weighted / totalWeight) * 100);
  const band = POSTURE_BANDS.find((b) => composite >= b.min) ?? POSTURE_BANDS.at(-1);

  const sortedLenses = [...lenses].sort((a, b) => b.score - a.score);

  return {
    composite,
    band: band.id,
    bandLabel: band.label,
    bandNote: band.note,
    lenses: sortedLenses,
    weakestLens: sortedLenses[0],
    strongestLens: sortedLenses[sortedLenses.length - 1],
    chain: { from: 'av01', to: 'av03', note: 'Ranked findings (AV-01) feed directly into the board risk translation (AV-03) — the one genuine sequential dependency in the series.' },
    summary: buildSummary(sortedLenses, band, composite),
  };
}

function buildSummary(sortedLenses, band, composite) {
  const weakest = sortedLenses[0];
  const strongest = sortedLenses[sortedLenses.length - 1];
  return `Composite AI-security posture: ${composite}/100 — ${band.label}. ` +
    `The weakest lens is ${weakest.name} (${weakest.score}), the strongest is ${strongest.name} (${strongest.score}). ` +
    `This score combines nine independent risk lenses — most do not causally depend on each other; ` +
    `the one genuine chain is ranked findings (AV-01) flowing into board translation (AV-03). ` +
    `Treat this as a portfolio view, not a single root cause.`;
}
