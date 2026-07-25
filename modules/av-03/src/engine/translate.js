/**
 * ApexVector · AV-03 · Risk Translator Engine
 * Framework-agnostic — no UI, no DOM.
 *
 * Translates a technical security finding into the language a board hears:
 *   - a plain-English executive summary
 *   - the business consequence (what actually happens to the organisation)
 *   - a qualitative risk rating
 *   - an OPTIONAL financial exposure range (likelihood × impact)
 *
 * The financial model is deliberately transparent and conservative. It is a
 * conversation-starter for board discussion, not an actuarial figure.
 */

export const ENGINE_VERSION = '1.0.0';
export const MODULE_ID = 'av-03';

/** Business risk ratings on the 0–100 scale. */
export const RISK_RATINGS = Object.freeze([
  { id: 'severe',   label: 'SEVERE',   min: 75, board: 'requires board attention now' },
  { id: 'elevated', label: 'ELEVATED', min: 50, board: 'brief the risk committee this cycle' },
  { id: 'moderate', label: 'MODERATE', min: 28, board: 'track in the risk register' },
  { id: 'low',      label: 'LOW',      min: 0,  board: 'manage within the security team' },
]);

/**
 * Finding categories → business consequence templates.
 * Each maps a technical class to what the organisation actually experiences.
 */
const CATEGORY_MODEL = {
  'data-exposure': {
    consequence: 'exposure of customer or regulated data',
    drivers: ['regulatory penalties', 'breach notification costs', 'customer churn', 'litigation'],
    impactBase: 0.85,
    execFraming: 'a direct data-protection and regulatory exposure',
  },
  'ransomware-path': {
    consequence: 'business operations halted by ransomware',
    drivers: ['operational downtime', 'ransom / recovery costs', 'reputational damage'],
    impactBase: 0.9,
    execFraming: 'a business-continuity threat',
  },
  'account-takeover': {
    consequence: 'unauthorised access to privileged accounts',
    drivers: ['fraud exposure', 'lateral compromise', 'insider-level access to systems'],
    impactBase: 0.75,
    execFraming: 'an identity and access-control weakness',
  },
  'financial-fraud': {
    consequence: 'direct financial loss through fraudulent transactions',
    drivers: ['transaction fraud', 'chargebacks', 'regulatory scrutiny'],
    impactBase: 0.8,
    execFraming: 'a direct financial-loss exposure',
  },
  'service-disruption': {
    consequence: 'customer-facing services taken offline',
    drivers: ['revenue loss during downtime', 'SLA penalties', 'customer trust'],
    impactBase: 0.65,
    execFraming: 'a service-availability risk',
  },
  'supply-chain': {
    consequence: 'compromise reaching the organisation through a third party',
    drivers: ['downstream breach', 'vendor-introduced malware', 'contractual liability'],
    impactBase: 0.7,
    execFraming: 'a third-party and supply-chain risk',
  },
  'compliance-gap': {
    consequence: 'failure to meet a regulatory or contractual obligation',
    drivers: ['fines', 'audit findings', 'loss of certification', 'contract breach'],
    impactBase: 0.55,
    execFraming: 'a compliance and audit exposure',
  },
  'ip-theft': {
    consequence: 'loss of proprietary information or trade secrets',
    drivers: ['competitive disadvantage', 'lost R&D value', 'market-position erosion'],
    impactBase: 0.72,
    execFraming: 'an intellectual-property risk',
  },
  'other': {
    consequence: 'a security weakness with business implications',
    drivers: ['operational risk', 'potential financial impact'],
    impactBase: 0.5,
    execFraming: 'a security risk requiring assessment',
  },
};

export const FINDING_CATEGORIES = Object.keys(CATEGORY_MODEL);

/** Exposure (internet-facing, exploitability) → likelihood of the event. */
const EXPLOITABILITY = { high: 0.8, med: 0.45, low: 0.15 };
/** Organisation size bands → rough impact scaling for the financial model. */
export const ORG_SIZE = {
  enterprise: { label: 'Enterprise (5,000+)', scale: 1.0, recordBase: 4_000_000 },
  midmarket:  { label: 'Mid-market (500–5,000)', scale: 0.4, recordBase: 1_500_000 },
  smb:        { label: 'SMB (<500)', scale: 0.15, recordBase: 400_000 },
};

const clamp = (n, lo = 0, hi = 1) => Math.min(Math.max(n, lo), hi);
const money = (n) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1000)}K`;
  return `$${Math.round(n)}`;
};

/**
 * Translate one finding into a business-risk object.
 * @param {Object} f
 * @param {string} f.title             technical finding title
 * @param {string} f.category          one of FINDING_CATEGORIES
 * @param {number} f.cvss              0–10 technical severity
 * @param {string} f.exploitability    high|med|low
 * @param {string} f.dataVolume        high|med|low (records/sensitivity in scope) — used by $ model
 * @param {Object} [opts]
 * @param {boolean} [opts.financial]   include the $ exposure range
 * @param {string}  [opts.orgSize]     enterprise|midmarket|smb
 */
export function translate(f, opts = {}) {
  const cat = CATEGORY_MODEL[f.category] ? f.category : 'other';
  const model = CATEGORY_MODEL[cat];

  const severity = clamp((Number(f.cvss) || 5) / 10);
  const likelihood = EXPLOITABILITY[f.exploitability] ?? EXPLOITABILITY.med;

  // business risk score blends technical severity, business impact of the
  // category, and likelihood of the event actually occurring
  const composite = severity * 0.30 + model.impactBase * 0.40 + likelihood * 0.30;
  const score = Math.round(composite * 100);
  const rating = RISK_RATINGS.find((r) => score >= r.min) ?? RISK_RATINGS.at(-1);

  const result = {
    ...f,
    category: cat,
    score,
    rating: rating.id,
    ratingLabel: rating.label,
    boardGuidance: rating.board,
    likelihood,
    execSummary: buildExecSummary(f, model, rating, likelihood),
    businessConsequence: model.consequence,
    impactDrivers: model.drivers,
  };

  if (opts.financial) {
    result.financial = estimateFinancial(model, likelihood, f, opts.orgSize || 'enterprise');
  }
  return result;
}

/** Board-ready one-paragraph summary — no jargon. */
function buildExecSummary(f, model, rating, likelihood) {
  const likWord = likelihood >= 0.8 ? 'highly likely to be exploited'
    : likelihood >= 0.45 ? 'realistically exploitable'
    : 'less likely but possible to exploit';
  return `This is ${model.execFraming}. In business terms, it could lead to ${model.consequence}. ` +
    `It is ${likWord} in its current state, which places it at a ${rating.label.toLowerCase()} level of business risk. ` +
    `Left unaddressed, the primary exposures are ${model.drivers.slice(0, 3).join(', ')}.`;
}

/**
 * Transparent, conservative financial exposure range.
 * Range = (low, expected, high) driven by likelihood and a category/size base.
 * This is intentionally a discussion range, not a precise prediction.
 */
function estimateFinancial(model, likelihood, f, orgSizeKey) {
  const org = ORG_SIZE[orgSizeKey] || ORG_SIZE.enterprise;
  const volumeFactor = { high: 1.0, med: 0.5, low: 0.2 }[f.dataVolume] ?? 0.5;

  // single-loss-expectancy style base, scaled by org size and data in scope
  const base = org.recordBase * model.impactBase * volumeFactor * org.scale;

  const expected = base * likelihood;
  const low = expected * 0.4;
  const high = expected * 2.2;

  return {
    low: money(low),
    expected: money(expected),
    high: money(high),
    lowRaw: Math.round(low),
    expectedRaw: Math.round(expected),
    highRaw: Math.round(high),
    basis: `Range reflects ${(likelihood * 100).toFixed(0)}% event likelihood against a ${org.label.toLowerCase()} impact base, scaled by data in scope. A planning range for board discussion — not an actuarial figure.`,
  };
}

/** Translate + rank a batch into a board-ready register. */
export function translateRegister(findings, opts = {}) {
  return findings
    .map((f) => translate(f, opts))
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

/** Portfolio roll-up for the board summary line. */
export function summarize(register) {
  const byRating = { severe: 0, elevated: 0, moderate: 0, low: 0 };
  let totalExpected = 0;
  let hasFinancial = false;
  for (const r of register) {
    byRating[r.rating] = (byRating[r.rating] || 0) + 1;
    if (r.financial) { hasFinancial = true; totalExpected += r.financial.expectedRaw; }
  }
  return {
    count: register.length,
    byRating,
    topRisk: register[0] || null,
    aggregateExposure: hasFinancial ? money(totalExpected) : null,
    aggregateExposureRaw: hasFinancial ? Math.round(totalExpected) : null,
  };
}
