/**
 * ApexVector · AV-08 · Memory Attack Simulator engine tests
 * Run: node src/engine/memory.test.mjs
 */
import { analyzeMemoryRisk, getMemoryAttackClasses, MEMORY_ATTACK_CLASSES, RISK_TIERS, CONTROLS } from './memory.js';

let pass = 0, fail = 0;
const assert = (c, m) => { if (c) pass++; else { fail++; console.error('  ✗', m); } };

// 1. Empty answers → high risk, flagged empty
const empty = analyzeMemoryRisk({});
assert(empty.empty === true, 'empty flagged');
assert(empty.score >= 70, 'no controls → critical risk');
assert(empty.tier === 'critical', 'no controls → critical tier');

// 2. All controls present → hardened, low score
const allYes = Object.fromEntries(CONTROLS.map((c) => [c.id, 'yes']));
const hardened = analyzeMemoryRisk(allYes);
assert(hardened.tier === 'hardened', 'all controls → hardened');
assert(hardened.score < 22, 'all controls → low score');
assert(hardened.missing.length === 0, 'all controls → no gaps');

// 3. All-no → every control missing, all classes exposed
const allNo = Object.fromEntries(CONTROLS.map((c) => [c.id, 'no']));
const exposed = analyzeMemoryRisk(allNo);
assert(exposed.missing.length === CONTROLS.length, 'all no → all gaps');
assert(exposed.exposedClasses.length > 0, 'all no → exposed classes');

// 4. Partial answers score mid-range
const allPartial = Object.fromEntries(CONTROLS.map((c) => [c.id, 'partial']));
const partial = analyzeMemoryRisk(allPartial);
assert(partial.score > 0 && partial.score < 70, 'all partial mid-range');

// 5. Context amplifiers raise risk
const base = analyzeMemoryRisk(allPartial, {});
const amplified = analyzeMemoryRisk(allPartial, { untrustedInput: true, sharedMemory: true });
assert(amplified.score >= base.score, 'context amplifiers raise risk');

// 6. Open gaps sorted before partial
const mixed = analyzeMemoryRisk({ ...allYes, partition: 'no', expiry: 'partial' });
assert(mixed.missing[0].severity === 'open', 'open gaps first');

// 7. Shared memory raises cross-user-leak severity
const shared = analyzeMemoryRisk(allNo, { sharedMemory: true });
const crossUser = shared.exposedClasses.find((c) => c.id === 'cross-user-leak');
assert(crossUser && crossUser.severity >= 85, 'shared memory raises cross-user-leak severity');

// 8. Untrusted input raises poisoning severity
const untrusted = analyzeMemoryRisk(allNo, { untrustedInput: true });
const poison = untrusted.exposedClasses.find((c) => c.id === 'memory-poisoning');
assert(poison && poison.severity >= 90, 'untrusted input raises poisoning severity');

// 9. Score bounds + tier validity
assert(exposed.score >= 0 && exposed.score <= 100, 'score within bounds');
assert(RISK_TIERS.some((t) => t.id === exposed.tier), 'tier valid');

// 10. Missing controls carry notes + counters
assert(exposed.missing.every((m) => m.note && Array.isArray(m.counters)), 'missing controls have notes + counters');

// 11. topGaps capped at 5
assert(exposed.topGaps.length <= 5, 'topGaps capped at 5');

// 12. Catalogue returns all classes with defenses, no payloads
const cat = getMemoryAttackClasses();
assert(cat.length === MEMORY_ATTACK_CLASSES.length, 'catalogue returns all classes');
assert(cat.every((c) => Array.isArray(c.defenses) && c.defenses.length > 0), 'every class has defenses');
assert(cat.every((c) => !/step 1|payload:|exploit:/i.test(c.idea)), 'no operational payloads');

// 13. Catalogue sorted by severity
assert(cat[0].severity >= cat[cat.length - 1].severity, 'catalogue sorted by severity');

// 14. Exposed classes sorted desc
if (exposed.exposedClasses.length > 1) {
  assert(exposed.exposedClasses[0].severity >= exposed.exposedClasses[1].severity, 'exposed classes sorted desc');
}

console.log(`\nAV-08 memory attack simulator engine: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
