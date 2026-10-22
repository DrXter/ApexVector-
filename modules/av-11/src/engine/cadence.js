/**
 * ApexVector · AV-11 · Pentest Cadence Gap Calculator
 * Framework-agnostic engine — no UI, no DOM.
 *
 * Season 2 · Episode 1 · AI-led pentest for GCCs.
 *
 * Question: how much of the year does the system in production differ from
 * the last system anyone actually tested?
 *
 * A pentest is a photograph of a river. It is accurate on the day it is taken
 * and starts ageing at the next release that touches the attack surface. This
 * module is plain arithmetic on the assumptions you state. It does not predict
 * breaches.
 *
 * Model (every step is shown on screen):
 *   releases/yr            R = releasesPerMonth × 12
 *   surface-changing       C = R × surfaceShare
 *   spacing of changes     d = 365 / C            (days between surface-changing releases)
 *   test interval          I = 365 / T            (T = tests per year, evenly spaced)
 *   A test stays valid until the next surface-changing release. With the
 *   change landing at a random point after the test:
 *       d ≤ I :  valid days per test = d / 2
 *       d > I :  valid days per test = I − I² / (2d)
 *   covered days/yr   = T × valid days per test      (capped at 365)
 *   untested days/yr  = 365 − covered days
 */

export const ENGINE_VERSION = '1.0.0';
export const MODULE_ID = 'av-11';
export const DAYS = 365;

/** Synthetic defaults. Illustrative only — replace with your own numbers. */
export const DEFAULTS = Object.freeze({
  releasesPerMonth: 4,
  testsPerYear: 1,
  surfaceShare: 0.5,
  parentTestsPerYear: 1,
  tolerance: 0.2,
});

export const GAP_BANDS = Object.freeze([
  { id: 'photograph', label: 'PHOTOGRAPH OF A RIVER', min: 75, note: 'most of the year the running system is not the one that was tested' },
  { id: 'wide', label: 'WIDE GAP', min: 50, note: 'the tested state is the exception, not the rule' },
  { id: 'narrowing', label: 'NARROWING GAP', min: 25, note: 'meaningful coverage, but change still outruns testing' },
  { id: 'tight', label: 'TIGHT COVERAGE', min: 0, note: 'testing keeps close to the pace of change' },
]);

/** ApexVector's own tier ladder, keyed on tests per year. Not a standard. */
export const CADENCE_TIERS = Object.freeze([
  { id: 'annual', label: 'Annual', maxTests: 1, note: 'one point-in-time test a year' },
  { id: 'semiannual', label: 'Semi-annual', maxTests: 2, note: 'two tests a year' },
  { id: 'quarterly', label: 'Quarterly', maxTests: 4, note: 'a test every quarter' },
  { id: 'monthly', label: 'Monthly', maxTests: 12, note: 'a test every month' },
  { id: 'continuous', label: 'Continuous validation', maxTests: Infinity, note: 'automated validation on every surface-changing release, with human depth tests on a schedule' },
]);

export const ASSUMPTIONS = Object.freeze([
  'Tests are evenly spaced across the year.',
  'Surface-changing releases arrive at a steady rate; a change lands at a random point after a test.',
  'A test stops being valid at the next release that changes the attack surface.',
  'Every number is entered by the user. Defaults are synthetic and illustrative.',
]);

export const LIMITS = Object.freeze([
  'Arithmetic on stated assumptions, shown on screen. It does not predict breaches.',
  'Not a compliance determination and not a standard. The tier ladder is ApexVector\'s own.',
  'A release that changes the attack surface is a judgment call. The share you enter drives the result.',
  'A test after every surface-changing release would narrow the gap further; the model reports how many that would be.',
]);

const clamp = (n, lo, hi) => Math.min(Math.max(n, lo), hi);
const round1 = (n) => Math.round(n * 10) / 10;

/** Days in the year the system matches a tested state, for T tests/yr and C changing releases/yr. */
export function coveredDays(T, C) {
  if (!(T > 0)) return 0;
  if (!(C > 0)) return DAYS; // nothing ever changes the attack surface: a test stays valid
  const I = DAYS / T;
  const d = DAYS / C;
  const perTest = d <= I ? d / 2 : I - (I * I) / (2 * d);
  return clamp(T * perTest, 0, DAYS);
}

export function untestedShare(T, C) {
  return 1 - coveredDays(T, C) / DAYS;
}

/**
 * Smallest whole number of tests per year that keeps the untested share at or
 * below `tolerance`. Returns Infinity when even 1,000 tests a year is not enough.
 */
export function neededTests(C, tolerance) {
  for (let T = 1; T <= 1000; T++) {
    if (untestedShare(T, C) <= tolerance + 1e-9) return T;
  }
  return Infinity;
}

export function tierFor(tests) {
  return CADENCE_TIERS.find((t) => tests <= t.maxTests) ?? CADENCE_TIERS.at(-1);
}

/** Validate and normalise raw form input. */
export function validateInputs(raw = {}) {
  const errors = [];
  const num = (v) => (v === '' || v === null || v === undefined ? NaN : Number(v));
  const releasesPerMonth = num(raw.releasesPerMonth);
  const testsPerYear = num(raw.testsPerYear);
  const surfaceShare = num(raw.surfaceShare);
  const parentTestsPerYear = raw.parentTestsPerYear === '' || raw.parentTestsPerYear == null ? 0 : num(raw.parentTestsPerYear);
  const tolerance = raw.tolerance === '' || raw.tolerance == null ? DEFAULTS.tolerance : num(raw.tolerance);

  if (!Number.isFinite(releasesPerMonth) || releasesPerMonth < 0) errors.push('Releases per month must be a number, 0 or more.');
  if (!Number.isFinite(testsPerYear) || testsPerYear < 0) errors.push('Tests per year must be a number, 0 or more.');
  if (!Number.isFinite(surfaceShare) || surfaceShare < 0 || surfaceShare > 1) errors.push('Share of releases that change the attack surface must be between 0 and 1.');
  if (!Number.isFinite(parentTestsPerYear) || parentTestsPerYear < 0) errors.push('Parent-required tests per year must be a number, 0 or more.');
  if (!Number.isFinite(tolerance) || tolerance < 0 || tolerance > 1) errors.push('Tolerated untested share must be between 0 and 1.');

  return {
    ok: errors.length === 0,
    errors,
    values: { releasesPerMonth, testsPerYear, surfaceShare, parentTestsPerYear, tolerance },
  };
}

/**
 * Assess the cadence gap.
 * @param {Object} raw  { releasesPerMonth, testsPerYear, surfaceShare (0–1), parentTestsPerYear, tolerance (0–1) }
 */
export function assessCadenceGap(raw = {}) {
  const v = validateInputs(raw);
  if (!v.ok) return { ok: false, errors: v.errors, empty: Object.keys(raw).length === 0 };

  const { releasesPerMonth, testsPerYear: T, surfaceShare, parentTestsPerYear: P, tolerance } = v.values;
  const R = releasesPerMonth * 12;
  const C = R * surfaceShare;
  const covered = coveredDays(T, C);
  const untested = DAYS - covered;
  const share = untested / DAYS;
  const pct = Math.round(share * 100);
  const band = GAP_BANDS.find((b) => pct >= b.min) ?? GAP_BANDS.at(-1);

  const needed = neededTests(C, tolerance);
  const tier = tierFor(needed);

  const atParent = P > 0 ? untestedShare(P, C) : 1;
  const intervalDays = T > 0 ? DAYS / T : null;
  const spacingDays = C > 0 ? DAYS / C : null;

  const result = {
    ok: true,
    inputs: { ...v.values },
    steps: {
      releasesPerYear: round1(R),
      surfaceChangingPerYear: round1(C),
      spacingDays: spacingDays === null ? null : round1(spacingDays),
      testIntervalDays: intervalDays === null ? null : round1(intervalDays),
      averageAgeOfLastTestDays: intervalDays === null ? null : round1(intervalDays / 2),
    },
    coveredDays: round1(covered),
    untestedDays: round1(untested),
    untestedShare: share,
    untestedPercent: pct,
    coveragePercent: 100 - pct,
    band: band.id,
    bandLabel: band.label,
    bandNote: band.note,
    suggested: {
      testsPerYear: needed,
      tier: tier.id,
      tierLabel: tier.label,
      tierNote: tier.note,
      toleranceUsed: tolerance,
      releaseTriggeredTestsPerYear: round1(C),
    },
    parent: {
      requiredTestsPerYear: P,
      met: T >= P,
      shortfallTests: Math.max(0, P - T),
      untestedPercentAtParentCadence: Math.round(atParent * 100),
    },
    assumptions: [...ASSUMPTIONS],
    limits: [...LIMITS],
  };
  result.statement = riskStatement(result);
  return result;
}

/** The sentence a person must accept or reject. */
export function riskStatement(r, systemName = 'this system') {
  const days = Math.round(r.untestedDays);
  return `On the assumptions shown, ${systemName} runs in an untested state for about ${days} days a year (${r.untestedPercent}% of the year). I accept this exposure and own it until the next test.`;
}

/** The only valid decisions for the human gate. */
export const DECISIONS = Object.freeze(['accepted', 'rejected', 'pending']);
