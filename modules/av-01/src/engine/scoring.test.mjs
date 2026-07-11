/**
 * ApexVector · AV-01 · Engine tests
 * Run: node src/engine/scoring.test.mjs
 */
import { scoreFindings, scoreFinding, estimateEpss, estimateSsvc, summarize, PRIORITY_BANDS } from './scoring.js';

let pass = 0, fail = 0;
const assert = (cond, msg) => {
  if (cond) { pass++; }
  else { fail++; console.error('  ✗ FAIL:', msg); }
};

// 1. RCE internet-facing high-crit must outrank low internal info leak
const ranked = scoreFindings([
  { title: 'Verbose error messages leak stack traces', cvss: 4.3, assetCriticality: 'low', internetFacing: false },
  { title: 'Remote code execution via npm lifecycle hook', cvss: 9.8, assetCriticality: 'high', internetFacing: true },
]);
assert(ranked[0].title.includes('Remote code execution'), 'RCE should rank #1');
assert(ranked[0].rank === 1 && ranked[1].rank === 2, 'ranks assigned in order');

// 2. Internet-facing raises EPSS vs identical internal finding
const ext = estimateEpss({ title: 'SQL injection', cvss: 8, internetFacing: true });
const int = estimateEpss({ title: 'SQL injection', cvss: 8, internetFacing: false });
assert(ext > int, 'internet-facing EPSS > internal EPSS');

// 3. Real EPSS/SSVC values override estimates
const withReal = scoreFinding({ title: 'Some CVE', cvss: 5, assetCriticality: 'low', internetFacing: false, epss: 0.9, ssvc: 0.9 });
assert(!withReal.estimated.epss && !withReal.estimated.ssvc, 'supplied values not flagged estimated');
assert(withReal.epss === 0.9, 'real EPSS preserved');

// 4. Score is 0..100 and band matches thresholds
const s = scoreFinding({ title: 'x', cvss: 10, assetCriticality: 'high', internetFacing: true, epss: 1, ssvc: 1 });
assert(s.score >= 0 && s.score <= 100, 'score within 0..100');
assert(s.priority === 'critical', 'max signals → critical');

// 5. SSVC weight ordering by criticality
assert(estimateSsvc({ assetCriticality: 'high', cvss: 5 }) > estimateSsvc({ assetCriticality: 'low', cvss: 5 }), 'high crit SSVC > low crit');

// 6. Summary aggregates correctly
const sum = summarize(ranked);
assert(sum.count === 2, 'summary counts findings');
assert(sum.topRisk.rank === 1, 'summary topRisk is rank 1');

// 7. Deterministic ordering
const a = scoreFindings([
  { title: 'RCE', cvss: 9.8, assetCriticality: 'high', internetFacing: true },
  { title: 'XSS', cvss: 6.1, assetCriticality: 'med', internetFacing: true },
]);
const b = scoreFindings([
  { title: 'XSS', cvss: 6.1, assetCriticality: 'med', internetFacing: true },
  { title: 'RCE', cvss: 9.8, assetCriticality: 'high', internetFacing: true },
]);
assert(a[0].title === b[0].title, 'ordering is input-independent');

console.log(`\nAV-01 engine tests: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
