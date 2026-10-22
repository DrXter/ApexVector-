/**
 * ApexVector · AV-11 · Pentest Cadence Gap engine tests
 * Run: node src/engine/cadence.test.mjs
 */
import {
  assessCadence, normaliseInputs, recordDecision, simulate, changesPerYear,
  EXPOSURE_LEVELS, CADENCE_OPTIONS, ENGINE_VERSION,
} from './cadence.js';
import { SAMPLE_INPUTS, SAMPLE_PRESETS, exportCadenceJson, exportCadenceMarkdown, EXPORT_SCHEMA } from '../data/sample.js';

let pass = 0, fail = 0;
const assert = (c, m) => { if (c) pass++; else { fail++; console.error('  ✗', m); } };

const base = { releasesPerMonth: 16, attackSurfaceChangeShare: 35, testsPerYear: 1, parentTestsPerYear: 1 };

// 1. Changes per year arithmetic
assert(Math.abs(changesPerYear(16, 35) - 67.2) < 1e-9, '16 releases/mo at 35% → 67.2 changes/yr');

// 2. No attack-surface changes → nothing exposed
const none = assessCadence({ ...base, attackSurfaceChangeShare: 0 });
assert(none.ok && none.exposedDays === 0, 'no surface changes → 0 exposed days');
assert(none.level.key === 'covered', 'no surface changes → COVERED');

// 3. Changes but never tested → whole year exposed
const never = assessCadence({ ...base, testsPerYear: 0 });
assert(never.exposedDays === 365, 'no testing → 365 exposed days');
assert(never.level.key === 'blind', 'no testing → BLIND');
assert(never.testIntervalDays === null && never.changesPerTest === null, 'no testing → null interval and changes-per-test');

// 4. Testing every change covers the year
const perRelease = assessCadence({ ...base, testsPerYear: 365, releasesPerMonth: 4, attackSurfaceChangeShare: 100 });
assert(perRelease.exposedDays === 0, 'a test for every change → 0 exposed days');

// 5. The sample GCC is heavily exposed on an annual cadence
const sample = assessCadence(SAMPLE_INPUTS);
assert(sample.ok, 'sample inputs are valid');
assert(sample.exposedDays >= 300, `sample annual cadence exposed ≥ 300 days (got ${sample.exposedDays})`);
assert(sample.level.key === 'blind', 'sample annual cadence → BLIND');
assert(sample.changesPerTest === 67.2, 'sample: 67.2 surface changes per annual test');

// 6. More frequent testing never increases exposure
let prev = Infinity;
let monotone = true;
for (const c of CADENCE_OPTIONS) {
  const r = assessCadence({ ...base, testsPerYear: c.testsPerYear });
  if (r.exposedDays > prev) monotone = false;
  prev = r.exposedDays;
}
assert(monotone, 'exposure never rises as cadence increases');

// 7. Quarterly is better than annual for the sample
const quarterly = assessCadence({ ...base, testsPerYear: 4 });
assert(quarterly.exposedDays < sample.exposedDays, 'quarterly exposure < annual exposure');

// 8. Suggested cadence actually hits the target
const sugg = sample.suggested;
const check = assessCadence({ ...base, testsPerYear: sugg.testsPerYear });
assert(check.exposedShare <= 25, `suggested cadence keeps exposure ≤ 25% (got ${check.exposedShare})`);
assert(sugg.exposedDays === check.exposedDays, 'suggested cadence exposure matches a re-run');

// 9. Slower-moving system needs less testing
const slow = SAMPLE_PRESETS.find((p) => p.id === 'gcc-slow');
const slowResult = assessCadence(slow.inputs);
assert(slowResult.exposedDays < sample.exposedDays, 'slower release rate → fewer exposed days at the same cadence');

// 10. Parent requirement checks
assert(sample.parent.meets === true, 'annual test meets an annual parent requirement');
assert(sample.parent.compliantButExposed === true, 'meets parent requirement yet exposed ≥ 30%');
const below = assessCadence({ ...base, testsPerYear: 1, parentTestsPerYear: 4 });
assert(below.parent.meets === false && below.parent.shortfallTestsPerYear === 3, 'below parent requirement → shortfall of 3');
const noParent = assessCadence({ ...base, parentTestsPerYear: '' });
assert(noParent.ok && noParent.parent === null, 'blank parent requirement → parent is null');

// 11. Validation
assert(assessCadence({ ...base, releasesPerMonth: -1 }).ok === false, 'negative releases rejected');
assert(assessCadence({ ...base, attackSurfaceChangeShare: 101 }).ok === false, 'share over 100 rejected');
assert(assessCadence({ ...base, testsPerYear: 'abc' }).ok === false, 'non-numeric tests rejected');
assert(assessCadence({ ...base, testsPerYear: 400 }).ok === false, 'tests over 365 rejected');
assert(normaliseInputs({ ...base, releasesPerMonth: '' }).ok === false, 'blank releases rejected');
assert(assessCadence({}).errors.length >= 3, 'empty input reports several errors');

// 12. Determinism and timeline shape
const again = assessCadence(SAMPLE_INPUTS);
assert(again.exposedDays === sample.exposedDays, 'same input → same result');
assert(sample.timeline.exposed.length === 365, 'timeline covers 365 days');
assert(sample.timeline.exposed.filter(Boolean).length === sample.exposedDays, 'timeline agrees with exposed day count');
assert(simulate(10, 0).exposedDays === 365 && simulate(0, 5).exposedDays === 0, 'simulate edge cases');

// 13. Exposure levels are ordered
assert(EXPOSURE_LEVELS.every((l, i) => i === 0 || l.min > EXPOSURE_LEVELS[i - 1].min), 'exposure level thresholds ascend');

// 14. Decision gate
const NOW = '2026-11-05T09:00:00.000Z';
assert(recordDecision(sample, { decision: 'accept' }).ok === false, 'accept with no owner or expiry is refused');
assert(recordDecision(sample, { decision: 'accept', owner: 'GCC Head', expiry: 'soon' }).ok === false, 'accept with a bad expiry is refused');
assert(recordDecision(sample, { decision: 'maybe' }).ok === false, 'unknown decision refused');
const accepted = recordDecision(sample, { decision: 'accept', owner: ' GCC Head ', expiry: '2027-03-31', note: 'Quarterly cadence funded next cycle', now: NOW });
assert(accepted.ok && accepted.decision.owner === 'GCC Head' && accepted.decision.expiry === '2027-03-31', 'valid acceptance is recorded with trimmed owner');
assert(accepted.decision.statement === sample.acceptanceStatement, 'decision carries the exact statement that was accepted');
const rejected = recordDecision(sample, { decision: 'reject', now: NOW });
assert(rejected.ok && rejected.decision.expiry === null && rejected.decision.owner === null, 'rejection needs no owner or expiry');

// 15. Exports
const json = JSON.parse(exportCadenceJson(sample, accepted.decision, { now: NOW }));
assert(json.schema === EXPORT_SCHEMA, 'JSON export uses the shared schema');
assert(json.module.id === 'av-11' && json.module.version === ENGINE_VERSION, 'JSON export names the module and version');
assert(json.outputs.exposedDays === sample.exposedDays, 'JSON export carries the result');
assert(json.decisions.length === 1 && json.decisions[0].decision === 'accept', 'JSON export carries the human decision');
assert(json.assumptions.length > 0 && json.limits.length > 0, 'JSON export carries assumptions and limits');
assert(JSON.parse(exportCadenceJson(sample, null, { now: NOW })).decisions.length === 0, 'JSON export with no decision has an empty decisions list');
const md = exportCadenceMarkdown(sample, accepted.decision, { now: NOW });
assert(md.includes('av-11') && md.includes(`${sample.exposedDays} of 365`), 'Markdown export names the module and the exposed days');
assert(md.includes('GCC Head') && md.includes('## Limits'), 'Markdown export carries the decision and limits');
assert(exportCadenceMarkdown(sample, null, { now: NOW }).includes('No decision recorded yet.'), 'Markdown export notes when no decision is recorded');
assert(exportCadenceJson(sample, null, { now: NOW }) === exportCadenceJson(sample, null, { now: NOW }), 'exports are reproducible with a fixed time');

console.log(`\nAV-11 engine: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
