/**
 * ApexVector · AV-05 · DevSecOps AI Readiness engine tests
 * Run: node src/engine/readiness.test.mjs
 */
import { assessReadiness, profileAiCodeRisk, READINESS_CONTROLS, READINESS_LEVELS, AI_USAGE_VECTORS, USAGE_KEYS, RISK_TIERS } from './readiness.js';

let pass = 0, fail = 0;
const assert = (c, m) => { if (c) pass++; else { fail++; console.error('  ✗', m); } };

// ---- Mode 1: readiness ----

// 1. All-yes → AI-READY, high score
const allYes = Object.fromEntries(READINESS_CONTROLS.map((c) => [c.id, 'yes']));
const ready = assessReadiness(allYes);
assert(ready.level === 'ready', 'all yes → AI-READY');
assert(ready.score >= 78, 'all yes score >= 78');
assert(ready.gaps.length === 0, 'all yes → no gaps');

// 2. All-no → FLYING BLIND, score 0, all gaps
const allNo = Object.fromEntries(READINESS_CONTROLS.map((c) => [c.id, 'no']));
const blind = assessReadiness(allNo);
assert(blind.level === 'blind', 'all no → FLYING BLIND');
assert(blind.score === 0, 'all no score 0');
assert(blind.gaps.length === READINESS_CONTROLS.length, 'all no → every control is a gap');

// 3. Partial answers score between
const allPartial = Object.fromEntries(READINESS_CONTROLS.map((c) => [c.id, 'partial']));
const partial = assessReadiness(allPartial);
assert(partial.score > 0 && partial.score < 78, 'all partial scores mid-range');
assert(partial.gaps.every((g) => g.severity === 'partial'), 'partial answers → partial-severity gaps');

// 4. Open gaps sort before partial gaps
const mixed = assessReadiness({ ...allYes, provenance: 'no', 'review-policy': 'partial' });
const firstGap = mixed.gaps[0];
assert(firstGap.severity === 'open', 'open gaps sorted first');
assert(mixed.topGaps.length <= 5, 'topGaps capped at 5');

// 5. Empty answers → flying blind, score 0
const empty = assessReadiness({});
assert(empty.score === 0 && empty.level === 'blind', 'no answers → flying blind');

// ---- Mode 2: AI-code risk profile ----

// 6. Empty usage → limited, score 0
const none = profileAiCodeRisk([]);
assert(none.score === 0, 'no usage → score 0');
assert(none.surfaces.length === 0, 'no usage → no surfaces');

// 7. High-risk usage → elevated/critical
const agentic = profileAiCodeRisk(['agent-commits', 'external-model', 'nl-to-code'], { governance: 'low' });
assert(['critical', 'elevated'].includes(agentic.tier), 'multiple high-risk usages → elevated/critical');
assert(agentic.surfaces[0].exposure >= agentic.surfaces[1].exposure, 'surfaces sorted by exposure');

// 8. Governance reduces score
const lowGov = profileAiCodeRisk(['agent-commits', 'external-model'], { governance: 'low' });
const highGov = profileAiCodeRisk(['agent-commits', 'external-model'], { governance: 'high' });
assert(highGov.score < lowGov.score, 'higher governance lowers risk score');

// 9. Priority controls deduped
const dup = profileAiCodeRisk(USAGE_KEYS, { governance: 'med' });
assert(new Set(dup.priorityControls).size === dup.priorityControls.length, 'controls are deduped');

// 10. Summary references top surface
assert(agentic.summary.includes(AI_USAGE_VECTORS['agent-commits'].label) || agentic.summary.includes(AI_USAGE_VECTORS['external-model'].label), 'summary references top surface');

// 11. Unknown usage keys ignored
const withBad = profileAiCodeRisk(['agent-commits', 'not-a-real-usage']);
assert(withBad.surfaces.length === 1, 'unknown usage keys ignored');

// 12. Score bounds
assert(agentic.score >= 0 && agentic.score <= 100, 'risk score within bounds');
assert(RISK_TIERS.some((t) => t.id === agentic.tier), 'tier valid');

console.log(`\nAV-05 DevSecOps AI readiness engine: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
