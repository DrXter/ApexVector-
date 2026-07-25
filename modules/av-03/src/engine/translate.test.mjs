/**
 * ApexVector · AV-03 · Risk Translator engine tests
 * Run: node src/engine/translate.test.mjs
 */
import { translate, translateRegister, summarize, FINDING_CATEGORIES, RISK_RATINGS, ORG_SIZE } from './translate.js';

let pass = 0, fail = 0;
const assert = (c, m) => { if (c) pass++; else { fail++; console.error('  ✗', m); } };

// 1. High-impact, high-exploitability data exposure → severe/elevated
const bad = translate({ title: 'Public S3 bucket with customer PII', category: 'data-exposure', cvss: 9, exploitability: 'high', dataVolume: 'high' });
assert(['severe', 'elevated'].includes(bad.rating), 'high data exposure should be severe/elevated');
assert(bad.score >= 50, 'high-risk score >= 50');

// 2. Exec summary is jargon-light and non-empty
assert(typeof bad.execSummary === 'string' && bad.execSummary.length > 40, 'exec summary generated');
assert(!/CVSS|EPSS|payload|buffer/i.test(bad.execSummary), 'exec summary avoids technical jargon');

// 3. Business consequence present
assert(bad.businessConsequence.length > 0, 'business consequence present');
assert(Array.isArray(bad.impactDrivers) && bad.impactDrivers.length > 0, 'impact drivers present');

// 4. Financial toggle off by default
assert(bad.financial === undefined, 'no financial unless requested');

// 5. Financial toggle on produces a range
const fin = translate({ title: 'x', category: 'data-exposure', cvss: 9, exploitability: 'high', dataVolume: 'high' }, { financial: true, orgSize: 'enterprise' });
assert(fin.financial && fin.financial.expectedRaw > 0, 'financial estimate produced');
assert(fin.financial.lowRaw < fin.financial.expectedRaw && fin.financial.expectedRaw < fin.financial.highRaw, 'low < expected < high');

// 6. Org size scales impact
const ent = translate({ title:'x', category:'data-exposure', cvss:9, exploitability:'high', dataVolume:'high' }, { financial:true, orgSize:'enterprise' });
const smb = translate({ title:'x', category:'data-exposure', cvss:9, exploitability:'high', dataVolume:'high' }, { financial:true, orgSize:'smb' });
assert(ent.financial.expectedRaw > smb.financial.expectedRaw, 'enterprise exposure > SMB');

// 7. Likelihood scales with exploitability
const hi = translate({ title:'x', category:'account-takeover', cvss:7, exploitability:'high', dataVolume:'med' }, { financial:true });
const lo = translate({ title:'x', category:'account-takeover', cvss:7, exploitability:'low', dataVolume:'med' }, { financial:true });
assert(hi.score > lo.score, 'higher exploitability → higher score');
assert(hi.financial.expectedRaw > lo.financial.expectedRaw, 'higher likelihood → higher exposure');

// 8. Unknown category falls back
const unk = translate({ title:'x', category:'not-real', cvss:5, exploitability:'med' });
assert(unk.category === 'other', 'unknown category falls back to other');

// 9. Register ranks by score
const reg = translateRegister([
  { title:'Low compliance gap', category:'compliance-gap', cvss:4, exploitability:'low', dataVolume:'low' },
  { title:'Ransomware path', category:'ransomware-path', cvss:9, exploitability:'high', dataVolume:'high' },
], { financial: true });
assert(reg[0].rank === 1 && reg[0].score >= reg[1].score, 'register ranked by score');

// 10. Summary aggregates exposure
const sum = summarize(reg);
assert(sum.count === 2, 'summary counts findings');
assert(sum.aggregateExposureRaw > 0, 'aggregate exposure summed');
assert(sum.topRisk.rank === 1, 'summary topRisk is rank 1');

// 11. Rating thresholds valid
assert(RISK_RATINGS.every(r => typeof r.min === 'number'), 'rating thresholds defined');

console.log(`\nAV-03 risk translator engine: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
