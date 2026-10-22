/**
 * ApexVector · AV-11 · Pentest Cadence Gap Calculator
 * Framework-agnostic engine — no UI, no DOM.
 *
 * Question it answers: how many days a year does the live system differ from
 * the last version that was actually tested?
 *
 * Model (deterministic, shown on screen):
 *   - Attack-surface changes per year = releases/month × 12 × share of releases
 *     that change the attack surface.
 *   - Changes and tests are each spread evenly across the year.
 *   - A day is EXPOSED when at least one attack-surface change has shipped
 *     since the most recent test. A test is treated as covering every change
 *     released on or before the day it completes.
 *   - The count is taken over a steady-state year (the middle of three
 *     simulated years), so the result does not depend on where the year starts.
 *
 * This is arithmetic on stated assumptions. It does not predict breaches.
 */

export const ENGINE_VERSION = '1.0.0';
export const MODULE_ID = 'av-11';
export const MODULE_NAME = 'Pentest Cadence Gap Calculator';

const YEAR = 365;
const TARGET_EXPOSED_SHARE = 25; // % of the year the suggested cadence should stay under

export const EXPOSURE_LEVELS = [
  { key: 'covered', label: 'COVERED', min: 0 },
  { key: 'drifting', label: 'DRIFTING', min: 10 },
  { key: 'exposed', label: 'EXPOSED', min: 30 },
  { key: 'blind', label: 'BLIND', min: 60 },
];

export const CADENCE_OPTIONS = [
  { testsPerYear: 1, label: 'Annual' },
  { testsPerYear: 2, label: 'Half-yearly' },
  { testsPerYear: 4, label: 'Quarterly' },
  { testsPerYear: 12, label: 'Monthly' },
  { testsPerYear: 26, label: 'Fortnightly' },
  { testsPerYear: 52, label: 'Weekly' },
  { testsPerYear: 104, label: 'Twice weekly' },
  { testsPerYear: 365, label: 'Daily / continuous' },
];

export const ASSUMPTIONS = [
  'Releases that change the attack surface are spread evenly across the year.',
  'Tests are spread evenly across the year and each covers every change released on or before the day it completes.',
  'Any attack-surface change since the last test makes that day exposed, however small the change.',
  'The figure is taken over a steady-state year, not a calendar year.',
];

export const LIMITS = [
  'Arithmetic on the assumptions above. It does not predict breaches or measure real risk.',
  'It does not weigh how severe a change is, or how long a test takes to cover a release.',
  'Cadence tiers and the 25% target are ApexVector defaults, not a standard.',
];

// ----------------------------------------------------------------------------
// Input handling
// ----------------------------------------------------------------------------

const num = (v) => (typeof v === 'string' && v.trim() === '' ? NaN : Number(v));

/** Validate and normalise raw inputs. Returns { ok, errors, value }. */
export function normaliseInputs(raw = {}) {
  const errors = [];
  const releasesPerMonth = num(raw.releasesPerMonth);
  const share = num(raw.attackSurfaceChangeShare);
  const testsPerYear = num(raw.testsPerYear);
  const parentRaw = raw.parentTestsPerYear;
  const parentProvided = !(parentRaw === undefined || parentRaw === null || parentRaw === '');
  const parentTestsPerYear = parentProvided ? num(parentRaw) : null;

  if (!Number.isFinite(releasesPerMonth) || releasesPerMonth < 0 || releasesPerMonth > 1000) {
    errors.push('Releases per month must be a number from 0 to 1000.');
  }
  if (!Number.isFinite(share) || share < 0 || share > 100) {
    errors.push('Share of releases that change the attack surface must be from 0 to 100.');
  }
  if (!Number.isFinite(testsPerYear) || testsPerYear < 0 || testsPerYear > 365) {
    errors.push('Tests per year must be a number from 0 to 365.');
  }
  if (parentProvided && (!Number.isFinite(parentTestsPerYear) || parentTestsPerYear < 0 || parentTestsPerYear > 365)) {
    errors.push('Parent-required tests per year must be a number from 0 to 365, or left blank.');
  }
  if (errors.length) return { ok: false, errors, value: null };
  return {
    ok: true,
    errors: [],
    value: { releasesPerMonth, attackSurfaceChangeShare: share, testsPerYear, parentTestsPerYear },
  };
}

export const changesPerYear = (releasesPerMonth, sharePct) => (releasesPerMonth * 12 * sharePct) / 100;

// ----------------------------------------------------------------------------
// Simulation
// ----------------------------------------------------------------------------

function evenDays(perYear, span) {
  const days = [];
  if (perYear <= 0) return days;
  const gap = YEAR / perYear;
  for (let i = 0; ; i++) {
    const d = Math.floor(gap * (i + 0.5));
    if (d >= span) break;
    days.push(d);
  }
  return days;
}

/**
 * Walk a steady-state year (the middle of three) and mark each day exposed or
 * covered. Returns { exposedDays, exposed: boolean[365], testDays, changeDays }
 * with day indexes relative to the start of the measured year.
 */
export function simulate(changes, tests) {
  const exposed = new Array(YEAR).fill(false);
  if (changes <= 0) return { exposedDays: 0, exposed, testDays: [], changeDays: [] };
  if (tests <= 0) return { exposedDays: YEAR, exposed: exposed.fill(true), testDays: [], changeDays: [] };

  const span = 3 * YEAR;
  const changeDays = evenDays(changes, span);
  const testDays = evenDays(tests, span);

  let ci = -1;
  let ti = -1;
  let count = 0;
  for (let d = 0; d < span; d++) {
    while (ci + 1 < changeDays.length && changeDays[ci + 1] <= d) ci++;
    while (ti + 1 < testDays.length && testDays[ti + 1] <= d) ti++;
    const lastChange = ci >= 0 ? changeDays[ci] : -1;
    const lastTest = ti >= 0 ? testDays[ti] : -1;
    const isExposed = lastChange > lastTest;
    if (d >= YEAR && d < 2 * YEAR) {
      exposed[d - YEAR] = isExposed;
      if (isExposed) count++;
    }
  }
  return {
    exposedDays: count,
    exposed,
    testDays: testDays.filter((d) => d >= YEAR && d < 2 * YEAR).map((d) => d - YEAR),
    changeDays: changeDays.filter((d) => d >= YEAR && d < 2 * YEAR).map((d) => d - YEAR),
  };
}

export function levelFor(exposedShare) {
  let level = EXPOSURE_LEVELS[0];
  for (const l of EXPOSURE_LEVELS) if (exposedShare >= l.min) level = l;
  return level;
}

const cadenceLabel = (n) => {
  const hit = CADENCE_OPTIONS.find((c) => c.testsPerYear === n);
  return hit ? hit.label : `${n} per year`;
};

function suggestCadence(changes) {
  if (changes <= 0) return { testsPerYear: 1, label: 'Annual', exposedDays: 0, exposedShare: 0, note: 'No attack-surface changes, so the current cadence is enough.' };
  for (const c of CADENCE_OPTIONS) {
    const sim = simulate(changes, c.testsPerYear);
    const share = (sim.exposedDays / YEAR) * 100;
    if (share <= TARGET_EXPOSED_SHARE) {
      return { testsPerYear: c.testsPerYear, label: c.label, exposedDays: sim.exposedDays, exposedShare: round1(share), note: `First standard cadence that keeps exposure at or under ${TARGET_EXPOSED_SHARE}% of the year.` };
    }
  }
  const perRelease = Math.max(1, Math.ceil(changes));
  const sim = simulate(changes, perRelease);
  return {
    testsPerYear: perRelease,
    label: 'Per release',
    exposedDays: sim.exposedDays,
    exposedShare: round1((sim.exposedDays / YEAR) * 100),
    note: 'No standard cadence is enough; testing needs to follow each attack-surface change.',
  };
}

const round1 = (n) => Math.round(n * 10) / 10;

// ----------------------------------------------------------------------------
// Assessment
// ----------------------------------------------------------------------------

/**
 * Main entry point. Returns { ok:false, errors } for bad input, otherwise the
 * full result including the day-by-day timeline and the risk-acceptance text.
 */
export function assessCadence(raw) {
  const parsed = normaliseInputs(raw);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };
  const inp = parsed.value;

  const changes = changesPerYear(inp.releasesPerMonth, inp.attackSurfaceChangeShare);
  const sim = simulate(changes, inp.testsPerYear);
  const exposedShare = round1((sim.exposedDays / YEAR) * 100);
  const level = levelFor(exposedShare);
  const testIntervalDays = inp.testsPerYear > 0 ? Math.round(YEAR / inp.testsPerYear) : null;
  const changesPerTest = inp.testsPerYear > 0 ? round1(changes / inp.testsPerYear) : null;
  const suggested = suggestCadence(changes);

  let parent = null;
  if (inp.parentTestsPerYear !== null) {
    const meets = inp.testsPerYear >= inp.parentTestsPerYear;
    parent = {
      requiredTestsPerYear: inp.parentTestsPerYear,
      meets,
      shortfallTestsPerYear: meets ? 0 : round1(inp.parentTestsPerYear - inp.testsPerYear),
      compliantButExposed: meets && exposedShare >= 30,
    };
  }

  const result = {
    ok: true,
    engineVersion: ENGINE_VERSION,
    inputs: inp,
    changesPerYear: round1(changes),
    testIntervalDays,
    changesPerTest,
    exposedDays: sim.exposedDays,
    exposedShare,
    level: { key: level.key, label: level.label },
    suggested,
    parent,
    timeline: { exposed: sim.exposed, testDays: sim.testDays, changeDays: sim.changeDays },
  };
  result.acceptanceStatement = buildAcceptanceStatement(result);
  return result;
}

export function buildAcceptanceStatement(result) {
  const { exposedDays, exposedShare, inputs, suggested, parent } = result;
  const cadence = inputs.testsPerYear > 0 ? `${inputs.testsPerYear} test${inputs.testsPerYear === 1 ? '' : 's'} a year` : 'no testing';
  const lines = [
    `With ${cadence}, the live system differs from the last tested version on ${exposedDays} of 365 days (${exposedShare}%).`,
  ];
  if (parent && parent.compliantButExposed) {
    lines.push("The parent's required cadence is met, and the system is still exposed for most of the year.");
  } else if (parent && !parent.meets) {
    lines.push(`This is below the parent's requirement of ${parent.requiredTestsPerYear} tests a year.`);
  }
  if (exposedDays > 0) {
    lines.push(`Staying exposed for that time means accepting the risk of untested changes. ${suggested.label} testing (${suggested.testsPerYear} a year) would bring this to ${suggested.exposedDays} days.`);
  } else {
    lines.push('No exposed days at the stated release rate.');
  }
  return lines.join(' ');
}

// ----------------------------------------------------------------------------
// Decision gate
// ----------------------------------------------------------------------------

/**
 * Record the human decision on the gap. Accepting needs a named owner and an
 * expiry date, because an acceptance with no owner and no end date is not a
 * decision. Rejecting only needs to be recorded.
 */
export function recordDecision(result, input = {}) {
  const errors = [];
  const decision = input.decision;
  if (decision !== 'accept' && decision !== 'reject') errors.push('Decision must be accept or reject.');
  const owner = (input.owner || '').trim();
  const expiry = (input.expiry || '').trim();
  const note = (input.note || '').trim();
  if (decision === 'accept') {
    if (!owner) errors.push('Accepting the gap needs a named owner.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiry)) errors.push('Accepting the gap needs an expiry date (YYYY-MM-DD).');
  }
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    decision: {
      gate: 'cadence-gap-risk-acceptance',
      decision,
      owner: owner || null,
      expiry: decision === 'accept' ? expiry : null,
      note: note || null,
      statement: result.acceptanceStatement,
      recordedAt: input.now || new Date().toISOString(),
    },
  };
}
