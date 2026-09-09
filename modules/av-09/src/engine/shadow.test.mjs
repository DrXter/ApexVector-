/**
 * ApexVector · AV-09 · Shadow AI Risk Scanner engine tests
 * Run: node src/engine/shadow.test.mjs
 */
import { assessOrgExposure, scoreTool, EXPOSURE_CONTROLS, EXPOSURE_LEVELS, TOOL_CRITERIA, TOOL_RATINGS } from './shadow.js';

let pass = 0, fail = 0;
const assert = (c, m) => { if (c) pass++; else { fail++; console.error('  ✗', m); } };

// ---- Mode 1: org exposure ----

// 1. Empty → critical exposure, flagged empty
const empty = assessOrgExposure({});
assert(empty.empty === true, 'empty flagged');
assert(empty.level === 'critical', 'no controls → critical exposure');
assert(empty.score >= 70, 'no controls → high score');

// 2. All yes → managed, low score, no gaps
const allYes = Object.fromEntries(EXPOSURE_CONTROLS.map((c) => [c.id, 'yes']));
const managed = assessOrgExposure(allYes);
assert(managed.level === 'managed', 'all yes → managed');
assert(managed.score < 22, 'all yes → low score');
assert(managed.gaps.length === 0, 'all yes → no gaps');

// 3. All no → every control a gap, action plan covers all
const allNo = Object.fromEntries(EXPOSURE_CONTROLS.map((c) => [c.id, 'no']));
const exposed = assessOrgExposure(allNo);
assert(exposed.gaps.length === EXPOSURE_CONTROLS.length, 'all no → all gaps');
assert(exposed.actionPlan.length === EXPOSURE_CONTROLS.length, 'action plan covers all gaps');
assert(exposed.actionPlan[0].priority === 1, 'action plan is prioritised');

// 4. Partial → mid-range
const allPartial = Object.fromEntries(EXPOSURE_CONTROLS.map((c) => [c.id, 'partial']));
const partial = assessOrgExposure(allPartial);
assert(partial.score > 0 && partial.score < 70, 'all partial mid-range');

// 5. Open gaps sort before partial
const mixed = assessOrgExposure({ ...allYes, 'data-controls': 'no', inventory: 'partial' });
assert(mixed.gaps[0].severity === 'open', 'open gaps first');

// 6. Every gap carries an action
assert(exposed.gaps.every((g) => g.action && g.gap), 'gaps carry action + description');

// 7. Score bounds + level validity
assert(exposed.score >= 0 && exposed.score <= 100, 'score within bounds');
assert(EXPOSURE_LEVELS.some((l) => l.id === exposed.level), 'level valid');

// ---- Mode 2: tool scorer ----

// 8. Empty → flagged empty
const toolEmpty = scoreTool({});
assert(toolEmpty.empty === true, 'tool empty flagged');

// 9. Worst-case tool → block
const badTool = scoreTool({
  'data-sensitivity': 'high', 'trains-on-data': 'yes', 'data-residency': 'unknown',
  'access-scope': 'broad', 'certifications': 'none', 'sanctioned': 'no',
}, 'RandomAI');
assert(badTool.rating === 'block', 'worst-case tool → block');
assert(badTool.score >= 70, 'worst-case scores high');
assert(badTool.concerns.length > 0, 'worst-case surfaces concerns');
assert(badTool.toolName === 'RandomAI', 'tool name carried');

// 10. Best-case tool → low risk
const goodTool = scoreTool({
  'data-sensitivity': 'low', 'trains-on-data': 'no', 'data-residency': 'compliant',
  'access-scope': 'minimal', 'certifications': 'verified', 'sanctioned': 'yes',
});
assert(goodTool.rating === 'low', 'best-case tool → low risk');
assert(goodTool.score < 24, 'best-case scores low');

// 11. Trains-on-data drives risk up
const trains = scoreTool({ 'trains-on-data': 'yes', 'data-sensitivity': 'high' });
const noTrain = scoreTool({ 'trains-on-data': 'no', 'data-sensitivity': 'high' });
assert(trains.score > noTrain.score, 'training-on-data raises risk');

// 12. Concerns sorted by weight
if (badTool.concerns.length > 1) {
  assert(badTool.concerns[0].weight >= badTool.concerns[1].weight, 'concerns sorted by weight');
}

// 13. Unknown answer treated as mid-risk (not zero)
const unknownAns = scoreTool({ 'data-sensitivity': 'nonsense' });
assert(unknownAns.score > 0, 'unknown answer treated as mid-risk not zero');

// 14. Rating validity
assert(TOOL_RATINGS.some((r) => r.id === badTool.rating), 'tool rating valid');

console.log(`\nAV-09 shadow AI risk scanner engine: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
