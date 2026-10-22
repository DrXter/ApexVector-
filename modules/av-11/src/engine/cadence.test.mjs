/**
 * ApexVector · AV-11 · Pentest Cadence Gap Calculator engine tests
 * Run: node src/engine/cadence.test.mjs
 */
import {
  assessCadenceGap, validateInputs, coveredDays, untestedShare, neededTests, tierFor, riskStatement,
  GAP_BANDS, CADENCE_TIERS, DAYS, DEFAULTS, MODULE_ID, ENGINE_VERSION, DECISIONS,
} from './cadence.js';
import { SAMPLE_GCC, toBundle, exportBundleJson, exportBundleMarkdown, exportPrompt, PROMPT_RISK_MEMO, toTrainingRecord, exportTrainingJsonl, engineAnswer } from '../data/sample.js';
import { buildExport, exportJson, exportMarkdown, SCHEMA_ID } from '../export/schema.js';

let pass = 0, fail = 0;
const assert = (c, m) => { if (c) pass++; else { fail++; console.error('  ✗', m); } };
const near = (a, b, eps = 0.06) => Math.abs(a - b) <= eps;

// ---- Core arithmetic (hand-checked) ----

// 1. 4 releases/mo, 50% change the surface → C = 24, d = 15.2083; one test a year
const a = assessCadenceGap({ releasesPerMonth: 4, testsPerYear: 1, surfaceShare: 0.5, parentTestsPerYear: 1 });
assert(a.ok === true, 'valid input ok');
assert(near(a.steps.releasesPerYear, 48), 'releases per year = 48');
assert(near(a.steps.surfaceChangingPerYear, 24), 'surface-changing per year = 24');
assert(near(a.coveredDays, 7.6, 0.1), 'one test covers ~7.6 days (d/2)');
assert(near(a.untestedDays, 357.4, 0.1), 'untested ~357.4 days');
assert(a.untestedPercent === 98, 'share uncovered rounds to 98%');
assert(a.band === 'photograph', 'wide gap → photograph of a river');

// 2. Branch d > I: 1 release/mo, all change the surface, 24 tests → I=15.2 < d=30.4
const b = assessCadenceGap({ releasesPerMonth: 1, testsPerYear: 24, surfaceShare: 1 });
assert(near(b.coveredDays, 273.75, 0.1), 'd > I branch: covered ~273.75 days');
assert(near(b.untestedDays, 91.25, 0.1), 'd > I branch: untested ~91.25 days');

// 3. Never tested → entire year untested
const never = assessCadenceGap({ releasesPerMonth: 4, testsPerYear: 0, surfaceShare: 0.5 });
assert(never.untestedDays === 365, 'no tests → 365 untested days');
assert(never.untestedPercent === 100, 'no tests → 100%');
assert(never.steps.testIntervalDays === null, 'no tests → no interval');

// 4. Nothing changes the surface, one test → fully covered
const still = assessCadenceGap({ releasesPerMonth: 4, testsPerYear: 1, surfaceShare: 0 });
assert(still.untestedDays === 0, 'no surface change + one test → 0 untested');
assert(still.band === 'tight', 'fully covered → tight coverage');
assert(still.steps.spacingDays === null, 'no changes → no spacing');

// 5. More tests never widen the gap (monotonic)
let prev = Infinity, monotonic = true;
for (let T = 0; T <= 120; T++) {
  const u = untestedShare(T, 24);
  if (u > prev + 1e-9) monotonic = false;
  prev = u;
}
assert(monotonic, 'untested share never rises as tests rise');

// 6. More surface-changing releases never narrow the gap (monotonic)
prev = -Infinity; monotonic = true;
for (let C = 0; C <= 200; C += 4) {
  const u = untestedShare(4, C);
  if (u < prev - 1e-9) monotonic = false;
  prev = u;
}
assert(monotonic, 'untested share never falls as changes rise');

// 7. Bounds
assert(coveredDays(1000, 500) <= DAYS, 'covered days capped at 365');
assert(a.untestedShare >= 0 && a.untestedShare <= 1, 'share within [0,1]');
assert(near(a.coveredDays + a.untestedDays, DAYS, 0.11), 'covered + untested = 365');

// ---- Suggested cadence ----

// 8. Needed tests for C=24, tolerance 20% → ceil(24 / 0.4) = 60
assert(neededTests(24, 0.2) === 60, 'needed tests for C=24, tol 20% = 60');
assert(untestedShare(60, 24) <= 0.2 + 1e-9, 'needed tests actually meets tolerance');
assert(untestedShare(59, 24) > 0.2, 'one test fewer misses tolerance');

// 9. Needed tests when little changes
assert(neededTests(0, 0.2) === 1, 'nothing changes → one test is enough');
assert(neededTests(0.5, 0.2) === 2, 'C=0.5 → two tests a year');

// 10. Impossible tolerance → Infinity → continuous
assert(neededTests(500, 0.01) === Infinity, 'extreme change + tight tolerance → beyond 1000');
assert(tierFor(Infinity).id === 'continuous', 'Infinity → continuous validation');

// 11. Tier ladder
assert(tierFor(1).id === 'annual', '1 → annual');
assert(tierFor(2).id === 'semiannual', '2 → semi-annual');
assert(tierFor(4).id === 'quarterly', '4 → quarterly');
assert(tierFor(12).id === 'monthly', '12 → monthly');
assert(tierFor(13).id === 'continuous', '13 → continuous');
assert(a.suggested.tier === 'continuous', 'C=24 at default tolerance → continuous');
assert(a.suggested.releaseTriggeredTestsPerYear === 24, 'release-triggered equivalent = C');

// ---- Parent cadence (GCC lens) ----

// 12. Meeting the parent's annual cycle while the gap stays wide
assert(a.parent.met === true, 'one test meets a parent requirement of one');
assert(a.parent.untestedPercentAtParentCadence === 98, 'parent cadence alone leaves 98% untested');
const short = assessCadenceGap({ releasesPerMonth: 4, testsPerYear: 1, surfaceShare: 0.5, parentTestsPerYear: 4 });
assert(short.parent.met === false, 'one test misses a parent requirement of four');
assert(short.parent.shortfallTests === 3, 'shortfall = 3 tests');

// ---- Validation ----

assert(assessCadenceGap({}).ok === false, 'empty input not ok');
assert(assessCadenceGap({}).empty === true, 'empty input flagged');
assert(assessCadenceGap({ releasesPerMonth: -1, testsPerYear: 1, surfaceShare: 0.5 }).ok === false, 'negative releases rejected');
assert(assessCadenceGap({ releasesPerMonth: 4, testsPerYear: 1, surfaceShare: 1.5 }).ok === false, 'share above 1 rejected');
assert(assessCadenceGap({ releasesPerMonth: 4, testsPerYear: 'abc', surfaceShare: 0.5 }).ok === false, 'non-numeric tests rejected');
assert(validateInputs({ releasesPerMonth: '4', testsPerYear: '1', surfaceShare: '0.5' }).ok === true, 'numeric strings accepted');
assert(assessCadenceGap({ releasesPerMonth: 4, testsPerYear: 1, surfaceShare: 0.5, tolerance: 2 }).ok === false, 'tolerance above 1 rejected');
assert(validateInputs({ releasesPerMonth: 4, testsPerYear: 1, surfaceShare: 0.5 }).values.tolerance === DEFAULTS.tolerance, 'tolerance defaults');

// ---- Human gate ----

assert(typeof a.statement === 'string' && a.statement.includes('357'), 'risk statement carries the days figure');
assert(a.statement.includes('I accept'), 'risk statement is something a person accepts or rejects');
assert(riskStatement(a, 'Payments API').includes('Payments API'), 'statement names the system');
assert(DECISIONS.includes('accepted') && DECISIONS.includes('rejected') && DECISIONS.includes('pending'), 'decisions: accepted, rejected, pending');
assert(a.assumptions.length > 0 && a.limits.length > 0, 'assumptions and limits always carried');
assert(a.limits.some((l) => /does not predict breaches/i.test(l)), 'limit states it does not predict breaches');

// ---- Bands ----

assert(GAP_BANDS.every((x, i, arr) => i === 0 || arr[i - 1].min > x.min), 'bands descend by threshold');
assert(CADENCE_TIERS.at(-1).maxTests === Infinity, 'ladder ends in an open tier');

// ---- Synthetic sample ----

const s = assessCadenceGap(SAMPLE_GCC);
assert(s.ok === true, 'sample GCC assesses');
assert(near(s.steps.surfaceChangingPerYear, 38.4), 'sample: 38.4 surface-changing releases a year');
assert(s.parent.met === true, 'sample: compliant with the parent on paper');
assert(s.untestedPercent >= 98, 'sample: yet ~99% of the year untested');
assert(s.suggested.tier === 'continuous', 'sample: suggests continuous validation');

// ---- LLM-ready export (shared schema) ----

const fixed = '2026-10-22T00:00:00.000Z';
const json = JSON.parse(exportBundleJson(s, 'accepted', SAMPLE_GCC.name, fixed));
assert(json.schema === SCHEMA_ID, 'export names the shared schema');
assert(json.module.id === MODULE_ID && json.module.version === ENGINE_VERSION, 'export carries module id and version');
assert(json.inputs.releasesPerMonth === 8, 'export carries inputs');
assert(json.outputs.untestedExposureDaysPerYear === s.untestedDays, 'export carries outputs');
assert(json.decisions[0].gate === 'risk-acceptance' && json.decisions[0].decision === 'accepted', 'export carries the human decision');
assert(json.assumptions.length > 0 && json.limits.length > 0, 'export carries assumptions and limits');
assert(/synthetic or user-entered/i.test(json.dataNote), 'export states synthetic / user-entered data only');
assert(json.generatedAt === fixed, 'timestamp injectable');

const md = exportBundleMarkdown(s, 'rejected', SAMPLE_GCC.name, fixed);
['## Inputs', '## Outputs', '## Human decisions', '## Assumptions', '## Limits'].forEach((h) => assert(md.includes(h), `markdown has ${h}`));
assert(md.includes('rejected'), 'markdown carries the decision');
assert(md.includes('AV-11'), 'markdown names the module');

const pendingBundle = toBundle(s);
assert(pendingBundle.decisions[0].decision === 'pending', 'default decision is pending');

// generic schema works for any module
const generic = buildExport({ moduleId: 'av-99', moduleName: 'X', moduleVersion: '0.0.1', inputs: { a: 1 }, outputs: { b: { c: 2 } }, generatedAt: fixed });
assert(exportMarkdown(generic).includes('**c**: 2'), 'markdown flattens nested outputs');
assert(JSON.parse(exportJson(generic)).module.id === 'av-99', 'generic JSON round-trips');

// prompt for a local LLM
const pr = exportPrompt(s, 'pending', SAMPLE_GCC.name, fixed);
assert(pr.startsWith(PROMPT_RISK_MEMO), 'prompt starts with the starter prompt');
assert(pr.includes('## Limits') && pr.includes('## Human decisions'), 'prompt carries the limits and the human decision');
assert(pr.includes('Do not state any number that is not in the file'), 'prompt forbids invented numbers');

// training record
const tr = toTrainingRecord(s, 'rejected', SAMPLE_GCC.name, fixed);
assert(tr.schema === 'apexvector-training-record' && tr.module.id === 'av-11', 'training record names its schema and module');
assert(tr.messages.map((m) => m.role).join() === 'system,user,assistant', 'chat format: system, user, assistant');
assert(JSON.parse(tr.messages[1].content).releasesPerMonth === 8, 'user turn carries the inputs as data');
assert(tr.messages[2].content.includes('360.2') && tr.messages[2].content.includes('Limits:'), 'assistant turn carries engine numbers and the limits');
assert(tr.labels.humanDecision === 'rejected', 'human decision is a label');
assert(/synthetic or user-entered/i.test(tr.provenance.data), 'provenance says synthetic or user-entered');
assert(engineAnswer(s) === engineAnswer(assessCadenceGap(SAMPLE_GCC)), 'assistant turn is deterministic');
const jl = exportTrainingJsonl(s, 'accepted', SAMPLE_GCC.name, fixed).trim().split('\n');
assert(jl.length === 1 && JSON.parse(jl[0]).labels.humanDecision === 'accepted', 'JSONL is one valid JSON object per line');

console.log(`\nAV-11 pentest cadence gap calculator engine: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
