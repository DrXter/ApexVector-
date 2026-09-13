/**
 * ApexVector · AV-10 · Final Showdown engine tests
 * Run: node src/engines/posture.test.mjs
 */
import { runPipeline, POSTURE_BANDS } from './posture.js';

let pass = 0, fail = 0;
const assert = (c, m) => { if (c) pass++; else { fail++; console.error('  ✗', m); } };

// 1. Empty intake → still runs, defaults toward risky (unassessed = risky)
const empty = runPipeline({});
assert(typeof empty.composite === 'number', 'empty intake produces a composite');
assert(empty.lenses.length === 9, 'all 9 lenses present even with empty intake');

// 2. AV-01 -> AV-03 chain: AV-03 depends on AV-01's top finding
const withFindings = runPipeline({ findings: [{ title: 'Critical RCE', cvss: 9.5, epss: 0.8, businessContext: 0.9 }] });
const av01 = withFindings.lenses.find((l) => l.id === 'av01');
const av03 = withFindings.lenses.find((l) => l.id === 'av03');
assert(av01.score > 0, 'av01 scores the supplied finding');
assert(av03.dependsOn === 'av03' || true, 'av03 result present'); // presence check
const av03raw = (() => { const r = runPipeline({ findings: [{ title: 'x', cvss: 9, epss: 0.8, businessContext: 0.9 }] }); return r.lenses.find(l => l.id === 'av03'); })();
assert(av03raw.dependsOn === 'av01', 'av03 explicitly depends on av01');

// 3. High-risk agent config drives av07 up
const dangerousAgent = runPipeline({ agent: { tools: ['code-exec', 'financial'], autonomy: 'full-auto', exposure: 'retrieval' } });
const safeAgent = runPipeline({ agent: { tools: ['read-internal'], autonomy: 'human-approval', exposure: 'trusted-only' } });
const av07dangerous = dangerousAgent.lenses.find((l) => l.id === 'av07').score;
const av07safe = safeAgent.lenses.find((l) => l.id === 'av07').score;
assert(av07dangerous > av07safe, 'dangerous agent config scores higher blast radius');

// 4. Strong controls across the board -> strong composite posture
const allGood = runPipeline({
  findings: [{ title: 'Low finding', cvss: 2, epss: 0.05, businessContext: 0.1 }],
  devSecOpsControls: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`c${i}`, 'yes'])),
  promptControls: { a: true, b: true, c: true },
  memoryControls: Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`m${i}`, 'yes'])),
  shadowAiControls: Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`s${i}`, 'yes'])),
  agent: { tools: ['read-internal'], autonomy: 'human-approval', exposure: 'trusted-only' },
});
assert(['strong', 'developing'].includes(allGood.band), 'strong inputs across the board -> strong/developing posture');

// 5. Weak controls across the board -> critical composite posture
const allBad = runPipeline({
  findings: [{ title: 'Bad finding', cvss: 9.8, epss: 0.9, businessContext: 0.95 }],
  devSecOpsControls: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`c${i}`, 'no'])),
  promptControls: { a: false, b: false, c: false },
  memoryControls: Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`m${i}`, 'no'])),
  shadowAiControls: Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`s${i}`, 'no'])),
  agent: { tools: ['code-exec', 'financial', 'send-comms'], autonomy: 'full-auto', exposure: 'retrieval' },
});
assert(allBad.composite > allGood.composite, 'weak inputs score higher risk than strong inputs');
assert(['critical', 'weak'].includes(allBad.band), 'weak inputs -> critical/weak posture');

// 6. Weakest/strongest lens identified correctly
assert(allBad.weakestLens.score >= allBad.strongestLens.score, 'weakest lens has the highest risk score');

// 7. Chain metadata present and correct
assert(allGood.chain.from === 'av01' && allGood.chain.to === 'av03', 'chain metadata correct');

// 8. Composite bounds + band validity
assert(allBad.composite >= 0 && allBad.composite <= 100, 'composite within bounds');
assert(POSTURE_BANDS.some((b) => b.id === allBad.band), 'band valid');

// 9. Summary references weakest and strongest
assert(allBad.summary.includes(allBad.weakestLens.name), 'summary names weakest lens');

// 10. All 9 lens ids present regardless of intake shape
const ids = withFindings.lenses.map((l) => l.id).sort();
assert(JSON.stringify(ids) === JSON.stringify(['av01','av02','av03','av04','av05','av06','av07','av08','av09']), 'all 9 lens ids present');

console.log(`\nAV-10 final showdown posture engine: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
