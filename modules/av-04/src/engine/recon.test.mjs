/**
 * ApexVector · AV-04 · Recon Planner engine tests
 * Run: node src/engine/recon.test.mjs
 */
import { scoreSurface, buildPlan, summarize, SURFACE_TYPES, OBJECTIVES, PRIORITY_BANDS } from './recon.js';

let pass = 0, fail = 0;
const assert = (c, m) => { if (c) pass++; else { fail++; console.error('  ✗', m); } };

const ctx = { objective: 'initial-access', timeboxDays: 10, stealth: false };

// 1. High-exposure low-hardening high-yield surface → primary
const hot = scoreSurface({ surface: 'ad-internal', exposure: 'high', hardening: 'low' }, { objective: 'domain-dominance', timeboxDays: 10, stealth: false });
assert(hot.priority === 'primary', 'high-value AD surface should be primary');
assert(hot.score >= 68, 'primary score >= 68');

// 2. Well-hardened surface scores lower than soft equivalent
const soft = scoreSurface({ surface: 'external-web-app', exposure: 'high', hardening: 'low' }, ctx);
const hard = scoreSurface({ surface: 'external-web-app', exposure: 'high', hardening: 'high' }, ctx);
assert(soft.score > hard.score, 'hardening lowers priority');

// 3. Objective alignment boosts matching tactic
const aligned = scoreSurface({ surface: 'ad-internal', exposure: 'med', hardening: 'med' }, { objective: 'domain-dominance', timeboxDays: 10, stealth: false });
const unaligned = scoreSurface({ surface: 'ad-internal', exposure: 'med', hardening: 'med' }, { objective: 'initial-access', timeboxDays: 10, stealth: false });
assert(aligned.score > unaligned.score, 'objective alignment boosts score');

// 4. Stealth penalizes noisy surfaces
const loud = scoreSurface({ surface: 'email-phishing', exposure: 'high', hardening: 'low' }, { objective:'initial-access', timeboxDays:10, stealth:true });
const loudNoStealth = scoreSurface({ surface: 'email-phishing', exposure: 'high', hardening: 'low' }, { objective:'initial-access', timeboxDays:10, stealth:false });
assert(loud.score < loudNoStealth.score, 'stealth penalizes noisy surface');

// 5. Score bounds and band validity
assert(hot.score >= 0 && hot.score <= 100, 'score within bounds');
assert(PRIORITY_BANDS.some(b => b.id === hot.priority), 'band valid');

// 6. Produces ATT&CK mapping + recon focus, no exploit content
assert(hot.attackRef && hot.tactic && hot.reconFocus, 'ATT&CK + focus present');
assert(!/payload|exploit code|reverse shell/i.test(hot.reconFocus), 'no exploit payloads in focus');

// 7. buildPlan ranks and generates path hypotheses
const plan = buildPlan([
  { surface: 'endpoint-fleet', exposure: 'low', hardening: 'high' },
  { surface: 'ad-internal', exposure: 'high', hardening: 'low' },
  { surface: 'exposed-api', exposure: 'high', hardening: 'low' },
], { objective: 'domain-dominance', timeboxDays: 14, stealth: false });
assert(plan.surfaces[0].rank === 1, 'plan ranks surfaces');
assert(plan.surfaces[0].score >= plan.surfaces[1].score, 'ranked by score desc');
assert(Array.isArray(plan.attackPathHypotheses), 'path hypotheses generated');

// 8. Path hypotheses are tactic-level chains, not step instructions
if (plan.attackPathHypotheses.length) {
  const h = plan.attackPathHypotheses[0];
  assert(h.hypothesis.includes('→'), 'hypothesis is a tactic chain');
  assert(h.validateFirst && h.entryVector, 'hypothesis has entry + validation focus');
}

// 9. Summary aggregates
const sum = summarize(plan.surfaces);
assert(sum.count === 3, 'summary counts surfaces');
assert(sum.leadVector.rank === 1, 'lead vector is rank 1');

// 10. Unknown surface falls back safely
const unk = scoreSurface({ surface: 'not-real', exposure: 'med', hardening: 'med' }, ctx);
assert(unk.surface === 'external-web-app', 'unknown surface falls back');

// 11. Short timebox favors low-effort surfaces
const shortBox = scoreSurface({ surface: 'email-phishing', exposure: 'high', hardening: 'med' }, { objective:'initial-access', timeboxDays:3, stealth:false });
const longBox = scoreSurface({ surface: 'email-phishing', exposure: 'high', hardening: 'med' }, { objective:'initial-access', timeboxDays:20, stealth:false });
assert(shortBox.score >= longBox.score, 'short timebox favors low-effort surface');

console.log(`\nAV-04 recon planner engine: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
