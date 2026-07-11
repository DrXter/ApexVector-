/**
 * ApexVector · AV-01 · VulnPriority Engine
 * Core scoring engine — framework-agnostic, platform-importable.
 *
 * This module exposes a pure scoring API with no UI or DOM dependencies,
 * so it can be consumed by the AV-01 React module, the ApexVector platform
 * backend, a CLI, or any other module in the registry.
 *
 * Composite model:
 *   score = (CVSS_norm * W.cvss) + (EPSS * W.epss) + (SSVC * W.ssvc)
 *
 * Where EPSS (exploit probability) and SSVC (business/exposure weight)
 * are either supplied directly (preferred, from live feeds) or estimated
 * from finding characteristics when feeds are unavailable.
 */

export const ENGINE_VERSION = '1.0.0';
export const MODULE_ID = 'av-01';

/** Default composite weights. Override per-deployment via scoreFindings(opts). */
export const DEFAULT_WEIGHTS = Object.freeze({
  cvss: 0.35,
  epss: 0.40,
  ssvc: 0.25,
});

/** Priority bands on the 0–100 composite scale. */
export const PRIORITY_BANDS = Object.freeze([
  { id: 'critical', label: 'CRITICAL', min: 62, action: 'remediate immediately' },
  { id: 'high',     label: 'HIGH',     min: 45, action: 'prioritize this sprint' },
  { id: 'medium',   label: 'MEDIUM',   min: 30, action: 'plan near-term fix' },
  { id: 'low',      label: 'LOW',      min: 0,  action: 'schedule in normal cycle' },
]);

// ---- Exploit-signal lexicons (used only for estimation fallback) ----
const HIGH_EXPLOIT_SIGNALS = [
  'remote code execution', 'rce', 'sql injection', 'sqli', 'deserialization',
  'credential', 'imds', 'service-account token', 'ssrf', 'authentication bypass',
  'auth bypass', 'path traversal', 'command injection', 'arbitrary file',
];
const MED_EXPLOIT_SIGNALS = [
  'xss', 'cross-site scripting', 'csrf', 'open redirect', 'injection',
  'information disclosure', 'privilege escalation', 'idor', 'insecure deserial',
];

const ASSET_CRITICALITY = Object.freeze({ high: 0.85, med: 0.55, low: 0.25 });

/** Clamp helper. */
const clamp = (n, lo = 0, hi = 1) => Math.min(Math.max(n, lo), hi);

/**
 * Estimate EPSS-like exploit probability (0..1) from finding characteristics.
 * Only used when a finding does not carry a real EPSS value.
 */
export function estimateEpss(finding) {
  const title = (finding.title || '').toLowerCase();
  const cvss = Number(finding.cvss) || 5.0;
  const internetFacing = !!finding.internetFacing;

  let base = 0.05;
  if (HIGH_EXPLOIT_SIGNALS.some((k) => title.includes(k))) base = 0.55;
  else if (MED_EXPLOIT_SIGNALS.some((k) => title.includes(k))) base = 0.25;

  if (internetFacing) base *= 1.7;
  base *= 0.6 + (cvss / 10) * 0.7;

  return clamp(base, 0, 0.97);
}

/**
 * Derive an SSVC-style business/exposure weight (0..1).
 * Uses asset criticality + internet exposure + severity amplification.
 */
export function estimateSsvc(finding) {
  const cvss = Number(finding.cvss) || 5.0;
  const crit = ASSET_CRITICALITY[finding.assetCriticality] ?? ASSET_CRITICALITY.med;
  let w = crit;
  if (finding.internetFacing) w += 0.15;
  if (cvss >= 9) w += 0.1;
  return clamp(w, 0, 1);
}

/**
 * Score a single finding into a composite result.
 * Real EPSS / SSVC values on the finding take precedence over estimates.
 */
export function scoreFinding(finding, weights = DEFAULT_WEIGHTS) {
  const cvss = clamp(Number(finding.cvss) || 5.0, 0, 10);
  const epss = finding.epss != null ? clamp(Number(finding.epss)) : estimateEpss(finding);
  const ssvc = finding.ssvc != null ? clamp(Number(finding.ssvc)) : estimateSsvc(finding);

  const composite =
    (cvss / 10) * weights.cvss +
    epss * weights.epss +
    ssvc * weights.ssvc;

  const score = Math.round(composite * 100);
  const band = PRIORITY_BANDS.find((b) => score >= b.min) ?? PRIORITY_BANDS.at(-1);

  return {
    ...finding,
    cvss,
    epss,
    ssvc,
    composite,
    score,
    priority: band.id,
    priorityLabel: band.label,
    action: band.action,
    rationale: buildRationale(finding, { cvss, epss, ssvc, action: band.action }),
    estimated: {
      epss: finding.epss == null,
      ssvc: finding.ssvc == null,
    },
  };
}

/**
 * Score and rank a list of findings, highest composite first.
 * @param {Array} findings  normalized finding objects
 * @param {Object} [opts]
 * @param {Object} [opts.weights]  composite weight overrides
 * @returns {Array} ranked scored findings
 */
export function scoreFindings(findings, opts = {}) {
  const weights = { ...DEFAULT_WEIGHTS, ...(opts.weights || {}) };
  return findings
    .map((f) => scoreFinding(f, weights))
    .sort((a, b) => b.score - a.score)
    .map((f, i) => ({ ...f, rank: i + 1 }));
}

/** Human-readable rationale string. */
function buildRationale(finding, { cvss, epss, ssvc, action }) {
  const parts = [];
  if (epss > 0.5) parts.push('high real-world exploit likelihood');
  else if (epss > 0.25) parts.push('moderate exploit likelihood');
  else parts.push('low exploit likelihood');

  if (finding.internetFacing) parts.push('internet-facing');
  if (finding.assetCriticality === 'high') parts.push('high-criticality asset');
  if (cvss >= 9) parts.push('critical severity');

  return `${parts.join(', ')} \u2192 ${action}.`;
}

/**
 * Aggregate portfolio-level metrics — consumed by the platform dashboard
 * when multiple modules feed a unified risk view.
 */
export function summarize(scored) {
  const byBand = { critical: 0, high: 0, medium: 0, low: 0 };
  let total = 0;
  for (const f of scored) {
    byBand[f.priority] = (byBand[f.priority] || 0) + 1;
    total += f.score;
  }
  return {
    count: scored.length,
    byBand,
    meanScore: scored.length ? Math.round(total / scored.length) : 0,
    topRisk: scored[0] || null,
  };
}
