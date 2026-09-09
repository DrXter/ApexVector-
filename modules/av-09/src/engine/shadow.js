/**
 * ApexVector · AV-09 · Shadow AI Risk Scanner
 * Framework-agnostic engine — no UI, no DOM.
 *
 * Security for AI. Two capabilities:
 *   1) assessOrgExposure() — scores an organisation's exposure to shadow AI
 *      (ungoverned/unsanctioned AI tool use) across governance dimensions,
 *      surfaces the gaps, and produces a prioritised action plan.
 *   2) scoreTool() — evaluates a single AI tool/vendor against risk criteria
 *      (data handling, access, compliance, training-on-your-data, etc.) and
 *      returns a risk rating with the specific concerns to raise.
 *
 * Shadow AI = the AI equivalent of shadow IT: employees using AI tools the
 * organisation hasn't sanctioned, governed, or even inventoried. The risk
 * isn't the tools — it's the invisibility. You cannot govern what you cannot see.
 */

export const ENGINE_VERSION = '1.0.0';
export const MODULE_ID = 'av-09';

// ---------------------------------------------------------------------------
// MODE 1 · Organisational shadow-AI exposure
// ---------------------------------------------------------------------------

/**
 * Governance controls, grouped. Each is a yes/partial/no question about the
 * org's shadow-AI posture. Weight reflects how much the control reduces
 * ungoverned-AI risk.
 */
export const EXPOSURE_CONTROLS = [
  { id: 'inventory', group: 'Visibility', weight: 0.13,
    q: 'Do you have an inventory of the AI tools employees actually use (not just the sanctioned ones)?',
    gap: 'No AI inventory — you cannot govern, assess, or respond to tools you cannot see.',
    action: 'Discover AI usage: network/DNS/SaaS-egress analysis, expense review, and an amnesty survey.' },
  { id: 'policy', group: 'Policy', weight: 0.11,
    q: 'Is there a clear, communicated acceptable-use policy for AI tools?',
    gap: 'No acceptable-use policy — employees have no guidance on what is and isn\'t allowed.',
    action: 'Publish a plain-language AI acceptable-use policy; make it easy to find and follow.' },
  { id: 'sanctioned-path', group: 'Enablement', weight: 0.12,
    q: 'Is there a sanctioned, easy-to-use AI option so people don\'t need to go rogue?',
    gap: 'No sanctioned alternative — people use shadow tools because there\'s no approved path.',
    action: 'Provide a governed AI option (enterprise tier / internal gateway) that\'s genuinely usable.' },
  { id: 'data-controls', group: 'Data', weight: 0.14,
    q: 'Are there controls preventing sensitive data from being pasted into external AI tools?',
    gap: 'No data-egress controls — source code, PII, and secrets can flow into external models unchecked.',
    action: 'Deploy DLP for AI endpoints; block or warn on sensitive-data submission to unsanctioned tools.' },
  { id: 'approval', group: 'Procurement', weight: 0.10,
    q: 'Is there a lightweight approval / vetting path for new AI tools?',
    gap: 'No vetting path — tools enter the org with no security, privacy, or compliance review.',
    action: 'Stand up a fast AI-tool intake review (security + privacy + legal) with a clear SLA.' },
  { id: 'training', group: 'People', weight: 0.09,
    q: 'Are employees trained on shadow-AI risks (data leakage, compliance, IP)?',
    gap: 'No awareness training — employees don\'t know why pasting data into a random AI tool is risky.',
    action: 'Run targeted awareness: what not to share, why, and where the sanctioned path is.' },
  { id: 'compliance-map', group: 'Compliance', weight: 0.12,
    q: 'Do you know which regulations (DPDP, GDPR, sector rules) your AI usage touches?',
    gap: 'No compliance mapping — ungoverned AI use may already be breaching data-protection obligations.',
    action: 'Map AI data flows to applicable regimes; flag cross-border and sensitive-category processing.' },
  { id: 'monitoring', group: 'Detection', weight: 0.10,
    q: 'Do you monitor for new/emerging shadow-AI usage on an ongoing basis?',
    gap: 'No ongoing monitoring — the inventory goes stale the day after you build it.',
    action: 'Make discovery continuous, not one-off; alert on new AI-domain egress.' },
  { id: 'incident', group: 'Response', weight: 0.09,
    q: 'Does your incident response cover an AI-tool data-leak scenario?',
    gap: 'No AI-leak response plan — no defined path when data lands somewhere it shouldn\'t.',
    action: 'Add an AI-data-exposure playbook: contain, assess regulatory duty, notify as required.' },
];

export const EXPOSURE_LEVELS = Object.freeze([
  { id: 'critical', label: 'CRITICAL EXPOSURE', min: 70, note: 'shadow AI is largely ungoverned — significant data & compliance risk' },
  { id: 'elevated', label: 'ELEVATED EXPOSURE', min: 45, note: 'meaningful gaps — visibility and data controls need closing now' },
  { id: 'moderate', label: 'MODERATE EXPOSURE', min: 22, note: 'foundational controls present — tighten and make continuous' },
  { id: 'managed',  label: 'MANAGED',           min: 0,  note: 'strong shadow-AI governance — maintain and monitor' },
]);

const ANSWER_VALUE = { yes: 1, partial: 0.5, no: 0 };
const clamp = (n, lo = 0, hi = 1) => Math.min(Math.max(n, lo), hi);

/**
 * Assess org-wide shadow-AI exposure.
 * @param {Object} answers  controlId -> 'yes'|'partial'|'no'
 */
export function assessOrgExposure(answers = {}) {
  const totalWeight = EXPOSURE_CONTROLS.reduce((s, c) => s + c.weight, 0);
  let riskAccum = 0;
  const gaps = [];

  for (const c of EXPOSURE_CONTROLS) {
    const v = ANSWER_VALUE[answers[c.id]] ?? 0;
    riskAccum += (1 - v) * c.weight;
    if (v < 1) gaps.push({ id: c.id, group: c.group, severity: v === 0 ? 'open' : 'partial', gap: c.gap, action: c.action, weight: c.weight });
  }

  const score = Math.round(clamp(riskAccum / totalWeight) * 100);
  const level = EXPOSURE_LEVELS.find((l) => score >= l.min) ?? EXPOSURE_LEVELS.at(-1);
  gaps.sort((a, b) => (a.severity === b.severity ? b.weight - a.weight : a.severity === 'open' ? -1 : 1));

  return {
    score,
    level: level.id,
    levelLabel: level.label,
    levelNote: level.note,
    gaps,
    actionPlan: gaps.map((g, i) => ({ priority: i + 1, group: g.group, action: g.action, severity: g.severity })),
    answered: Object.keys(answers).length,
    total: EXPOSURE_CONTROLS.length,
    empty: Object.keys(answers).length === 0,
  };
}

// ---------------------------------------------------------------------------
// MODE 2 · Individual AI tool / vendor risk scorer
// ---------------------------------------------------------------------------

/**
 * Risk criteria for scoring a single AI tool. Each answer maps to a risk
 * contribution; higher = riskier.
 */
export const TOOL_CRITERIA = [
  { id: 'data-sensitivity', label: 'Sensitivity of data staff put into it',
    options: { high: 1.0, medium: 0.55, low: 0.15 }, weight: 0.22,
    concernHigh: 'Sensitive data (PII, source, secrets) is being submitted to this tool.' },
  { id: 'trains-on-data', label: 'Does the vendor train on your inputs?',
    options: { yes: 1.0, unclear: 0.7, no: 0.1 }, weight: 0.20,
    concernHigh: 'Vendor may train on your data — your inputs could surface elsewhere or leak IP.' },
  { id: 'data-residency', label: 'Data residency / cross-border handling',
    options: { unknown: 1.0, offshore: 0.6, compliant: 0.15 }, weight: 0.14,
    concernHigh: 'Data location is unknown or crosses borders — likely a compliance exposure.' },
  { id: 'access-scope', label: 'What the tool can access (integrations/permissions)',
    options: { broad: 1.0, moderate: 0.5, minimal: 0.15 }, weight: 0.16,
    concernHigh: 'Tool has broad access to systems/data — large blast radius if compromised.' },
  { id: 'certifications', label: 'Security certifications / assurances',
    options: { none: 1.0, claimed: 0.5, verified: 0.1 }, weight: 0.12,
    concernHigh: 'No verified security certifications (SOC 2, ISO 27001) — unverified posture.' },
  { id: 'sanctioned', label: 'Sanctioned / approved by the org?',
    options: { no: 1.0, pending: 0.5, yes: 0.0 }, weight: 0.16,
    concernHigh: 'Tool is unsanctioned — in use without any org review.' },
];

export const TOOL_RATINGS = Object.freeze([
  { id: 'block',   label: 'BLOCK / URGENT REVIEW', min: 70, note: 'high risk — restrict use pending review' },
  { id: 'review',  label: 'FORMAL REVIEW NEEDED',  min: 45, note: 'material risk — vet before broader use' },
  { id: 'caution', label: 'USE WITH CONDITIONS',   min: 24, note: 'acceptable with guardrails and data limits' },
  { id: 'low',     label: 'LOW RISK',              min: 0,  note: 'limited risk — standard monitoring' },
]);

/**
 * Score a single AI tool.
 * @param {Object} answers  criterionId -> option key
 * @param {string} [toolName]
 */
export function scoreTool(answers = {}, toolName = '') {
  const totalWeight = TOOL_CRITERIA.reduce((s, c) => s + c.weight, 0);
  let riskAccum = 0;
  const concerns = [];

  for (const c of TOOL_CRITERIA) {
    const key = answers[c.id];
    const val = c.options[key] ?? 0.5; // unknown answer treated as mid-risk
    riskAccum += val * c.weight;
    if (val >= 0.7) concerns.push({ id: c.id, label: c.label, concern: c.concernHigh, weight: c.weight });
  }

  const score = Math.round(clamp(riskAccum / totalWeight) * 100);
  const rating = TOOL_RATINGS.find((r) => score >= r.min) ?? TOOL_RATINGS.at(-1);
  concerns.sort((a, b) => b.weight - a.weight);

  return {
    toolName: toolName || 'unnamed tool',
    score,
    rating: rating.id,
    ratingLabel: rating.label,
    ratingNote: rating.note,
    concerns,
    empty: Object.keys(answers).length === 0,
  };
}

export const EXPOSURE_CONTROL_LIST = EXPOSURE_CONTROLS.map((c) => ({ id: c.id, group: c.group, q: c.q }));
