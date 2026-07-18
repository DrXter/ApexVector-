/**
 * ApexVector · AV-02 · Alert Triage Engine
 * Framework-agnostic triage scoring — no UI, no DOM.
 *
 * Produces a structured triage decision for a security alert:
 *   - false-positive likelihood
 *   - true-positive confidence
 *   - escalation tier
 *   - recommended next actions
 *   - the signals that drove the decision (explainable, never a black box)
 *
 * Designed to structure analyst judgment, not replace it.
 */

export const ENGINE_VERSION = '1.0.0';
export const MODULE_ID = 'av-02';

/** Triage outcome tiers. */
export const TRIAGE_TIERS = Object.freeze([
  { id: 'escalate',  label: 'ESCALATE',       min: 70, sla: 'immediate — page on-call' },
  { id: 'investigate', label: 'INVESTIGATE',  min: 45, sla: 'within 1 hour' },
  { id: 'monitor',   label: 'MONITOR',        min: 25, sla: 'batch review this shift' },
  { id: 'close',     label: 'LIKELY BENIGN',  min: 0,  sla: 'close with note — tune rule' },
]);

/**
 * Signal weights. Tuned so that context (asset value, user privilege,
 * corroboration) can outweigh raw alert severity — which is precisely
 * where most SOC triage goes wrong.
 */
export const SIGNAL_WEIGHTS = Object.freeze({
  severity: 0.20,
  assetCriticality: 0.18,
  userPrivilege: 0.14,
  corroboration: 0.18,
  anomaly: 0.15,
  threatIntel: 0.15,
});

// ---- Alert-type behavioural priors -------------------------------------
// Base true-positive rates observed across common detection categories.
// These are heuristic priors, surfaced transparently to the analyst.
const ALERT_TYPE_PRIORS = {
  'credential-access':  { tp: 0.62, note: 'credential attacks rarely fire without cause' },
  'lateral-movement':   { tp: 0.58, note: 'lateral movement is high-signal when detected' },
  'exfiltration':       { tp: 0.55, note: 'data movement alerts warrant fast validation' },
  'privilege-escalation': { tp: 0.60, note: 'priv-esc is high-signal, low base rate' },
  'execution':          { tp: 0.42, note: 'execution alerts mix real threats with admin activity' },
  'persistence':        { tp: 0.48, note: 'persistence often overlaps with legitimate tooling' },
  'malware':            { tp: 0.52, note: 'signature hits vary widely by engine confidence' },
  'phishing':           { tp: 0.45, note: 'user-reported phish skews higher than automated' },
  'recon':              { tp: 0.22, note: 'scanning noise dominates this category' },
  'policy-violation':   { tp: 0.28, note: 'usually behavioural, rarely malicious' },
  'anomaly':            { tp: 0.25, note: 'baseline drift produces high false-positive volume' },
  'other':              { tp: 0.35, note: 'no category prior available' },
};

export const ALERT_TYPES = Object.keys(ALERT_TYPE_PRIORS);

const clamp = (n, lo = 0, hi = 1) => Math.min(Math.max(n, lo), hi);

/** Normalise a 0–10 severity into 0–1. */
const normSeverity = (s) => clamp((Number(s) || 5) / 10);

/** Map categorical inputs to 0–1 weights. */
const LEVELS = { high: 0.9, med: 0.55, low: 0.2, none: 0.05 };
const level = (v, fallback = 'med') => LEVELS[(v || fallback)] ?? LEVELS.med;

/**
 * Triage a single alert.
 * @param {Object} alert
 * @param {string} alert.title
 * @param {string} alert.alertType         one of ALERT_TYPES
 * @param {number} alert.severity          0-10
 * @param {string} alert.assetCriticality  high|med|low
 * @param {string} alert.userPrivilege     high|med|low  (admin/service vs standard)
 * @param {string} alert.corroboration     high|med|low|none  (other alerts/log support)
 * @param {string} alert.anomaly           high|med|low  (deviation from baseline)
 * @param {string} alert.threatIntel       high|med|low|none (IOC / TI match)
 * @param {boolean} alert.knownGoodContext  matches an approved change/maintenance window
 */
export function triageAlert(alert) {
  const type = ALERT_TYPE_PRIORS[alert.alertType] ? alert.alertType : 'other';
  const prior = ALERT_TYPE_PRIORS[type];

  const signals = {
    severity: normSeverity(alert.severity),
    assetCriticality: level(alert.assetCriticality),
    userPrivilege: level(alert.userPrivilege),
    corroboration: level(alert.corroboration, 'low'),
    anomaly: level(alert.anomaly, 'med'),
    threatIntel: level(alert.threatIntel, 'none'),
  };

  // weighted signal composite
  let composite = 0;
  for (const [k, w] of Object.entries(SIGNAL_WEIGHTS)) composite += signals[k] * w;

  // blend with the alert-type behavioural prior
  let tpConfidence = composite * 0.65 + prior.tp * 0.35;

  // known-good context is a strong FP indicator (change window, approved tooling)
  if (alert.knownGoodContext) tpConfidence *= 0.45;

  // strong TI match + corroboration compounds confidence
  if (signals.threatIntel >= 0.9 && signals.corroboration >= 0.55) {
    tpConfidence = Math.min(tpConfidence * 1.25, 0.98);
  }

  tpConfidence = clamp(tpConfidence, 0.02, 0.98);
  const fpLikelihood = 1 - tpConfidence;

  const score = Math.round(tpConfidence * 100);
  const tier = TRIAGE_TIERS.find((t) => score >= t.min) ?? TRIAGE_TIERS.at(-1);

  return {
    ...alert,
    alertType: type,
    tpConfidence,
    fpLikelihood,
    score,
    tier: tier.id,
    tierLabel: tier.label,
    sla: tier.sla,
    typePrior: prior.tp,
    typeNote: prior.note,
    signals,
    drivers: rankDrivers(signals),
    actions: recommendActions(tier.id, alert, signals),
    reasoning: buildReasoning(tier, signals, prior, alert),
  };
}

/** Rank which signals contributed most to the decision (explainability). */
function rankDrivers(signals) {
  return Object.entries(signals)
    .map(([k, v]) => ({ signal: k, value: v, contribution: v * SIGNAL_WEIGHTS[k] }))
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3);
}

/** Concrete next actions by tier — what the analyst should actually do. */
function recommendActions(tierId, alert, s) {
  const base = {
    escalate: [
      'Page on-call / open incident channel',
      'Isolate affected host pending validation',
      'Pull full process tree and network connections for the time window',
      'Check for the same pattern across other hosts',
    ],
    investigate: [
      'Pull surrounding logs (±30 min) for the source and destination',
      'Verify with the asset owner whether the activity was expected',
      'Check the user’s recent authentication and access history',
      'Search for the same indicator across the estate',
    ],
    monitor: [
      'Add to shift review queue — no immediate action',
      'Confirm whether a change ticket covers this activity',
      'Watch for recurrence or escalation in the next 24h',
    ],
    close: [
      'Close with justification note',
      'Flag the detection rule for tuning — this pattern is generating noise',
      'Record as a known-good pattern if repeatable',
    ],
  }[tierId];

  const extra = [];
  if (s.userPrivilege >= 0.9) extra.push('Privileged account involved — verify session legitimacy directly with the user');
  if (s.threatIntel >= 0.9) extra.push('Active TI match — check the indicator against recent campaign reporting');
  if (s.corroboration <= 0.2 && tierId !== 'close') extra.push('Single-source alert — seek corroborating telemetry before escalating further');
  return [...base, ...extra];
}

/** Plain-English reasoning for the decision. */
function buildReasoning(tier, s, prior, alert) {
  const parts = [];
  parts.push(`Alert category baseline true-positive rate is ${(prior.tp * 100).toFixed(0)}% — ${prior.note}.`);

  if (s.corroboration >= 0.9) parts.push('Corroborating telemetry strongly supports this being real.');
  else if (s.corroboration <= 0.2) parts.push('No corroborating signal — treat single-source alerts with caution.');

  if (s.assetCriticality >= 0.9) parts.push('The affected asset is business-critical, raising impact if genuine.');
  if (s.userPrivilege >= 0.9) parts.push('A privileged identity is involved, which raises blast radius.');
  if (s.threatIntel >= 0.9) parts.push('Threat intel match increases confidence this is adversary activity.');
  if (s.anomaly <= 0.2) parts.push('Behaviour is close to baseline, which lowers suspicion.');
  if (alert.knownGoodContext) parts.push('Activity falls inside a known change/maintenance window — a strong false-positive indicator.');

  parts.push(`Recommended handling: ${tier.sla}.`);
  return parts.join(' ');
}

/** Triage a batch and rank by confidence, highest first. */
export function triageBatch(alerts) {
  return alerts
    .map(triageAlert)
    .sort((a, b) => b.score - a.score)
    .map((a, i) => ({ ...a, rank: i + 1 }));
}

/** Portfolio metrics for the platform dashboard. */
export function summarize(triaged) {
  const byTier = { escalate: 0, investigate: 0, monitor: 0, close: 0 };
  let sum = 0;
  for (const a of triaged) {
    byTier[a.tier] = (byTier[a.tier] || 0) + 1;
    sum += a.score;
  }
  const noiseRatio = triaged.length
    ? (byTier.close + byTier.monitor) / triaged.length
    : 0;
  return {
    count: triaged.length,
    byTier,
    meanConfidence: triaged.length ? Math.round(sum / triaged.length) : 0,
    noiseRatio: Number(noiseRatio.toFixed(2)),
    topAlert: triaged[0] || null,
  };
}
