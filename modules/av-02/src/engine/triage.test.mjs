/**
 * ApexVector · AV-02 · Triage engine tests
 * Run: node src/engine/triage.test.mjs
 */
import { triageAlert, triageBatch, summarize, ALERT_TYPES, TRIAGE_TIERS } from './triage.js';

let pass = 0, fail = 0;
const assert = (c, m) => { if (c) pass++; else { fail++; console.error('  ✗', m); } };

// 1. High-signal alert escalates
const hot = triageAlert({
  title: 'Kerberoasting attempt against domain admin',
  alertType: 'credential-access', severity: 9,
  assetCriticality: 'high', userPrivilege: 'high',
  corroboration: 'high', anomaly: 'high', threatIntel: 'high',
});
assert(hot.tier === 'escalate', 'high-signal alert should escalate');
assert(hot.score >= 70, 'high-signal score >= 70');

// 2. Recon noise should not escalate
const noise = triageAlert({
  title: 'Port scan from internal subnet',
  alertType: 'recon', severity: 3,
  assetCriticality: 'low', userPrivilege: 'low',
  corroboration: 'none', anomaly: 'low', threatIntel: 'none',
});
assert(noise.tier === 'close' || noise.tier === 'monitor', 'recon noise should not escalate');
assert(noise.fpLikelihood > 0.6, 'recon noise has high FP likelihood');

// 3. Known-good context sharply reduces confidence
const withoutCtx = triageAlert({ title:'x', alertType:'execution', severity:7, assetCriticality:'high', userPrivilege:'high', corroboration:'med', anomaly:'med', threatIntel:'low' });
const withCtx = triageAlert({ ...{ title:'x', alertType:'execution', severity:7, assetCriticality:'high', userPrivilege:'high', corroboration:'med', anomaly:'med', threatIntel:'low' }, knownGoodContext:true });
assert(withCtx.score < withoutCtx.score, 'known-good context lowers confidence');

// 4. Context can outweigh raw severity
const lowSevHighCtx = triageAlert({ title:'a', alertType:'credential-access', severity:4, assetCriticality:'high', userPrivilege:'high', corroboration:'high', anomaly:'high', threatIntel:'high' });
const highSevLowCtx = triageAlert({ title:'b', alertType:'anomaly', severity:9, assetCriticality:'low', userPrivilege:'low', corroboration:'none', anomaly:'low', threatIntel:'none' });
assert(lowSevHighCtx.score > highSevLowCtx.score, 'context should outweigh raw severity');

// 5. Score bounds and tier mapping
assert(hot.score >= 0 && hot.score <= 100, 'score within bounds');
assert(TRIAGE_TIERS.some(t => t.id === hot.tier), 'tier is valid');

// 6. Explainability present
assert(hot.drivers.length === 3, 'top-3 drivers returned');
assert(typeof hot.reasoning === 'string' && hot.reasoning.length > 20, 'reasoning generated');
assert(Array.isArray(hot.actions) && hot.actions.length > 0, 'actions recommended');

// 7. TI + corroboration compounding
const tiBoost = triageAlert({ title:'c', alertType:'malware', severity:7, assetCriticality:'med', userPrivilege:'med', corroboration:'high', anomaly:'med', threatIntel:'high' });
const noTi = triageAlert({ title:'c', alertType:'malware', severity:7, assetCriticality:'med', userPrivilege:'med', corroboration:'high', anomaly:'med', threatIntel:'none' });
assert(tiBoost.score > noTi.score, 'TI match raises confidence');

// 8. Batch ranking + summary
const batch = triageBatch([noise, hot]);
assert(batch[0].rank === 1 && batch[0].score >= batch[1].score, 'batch ranked by score');
const sum = summarize(batch);
assert(sum.count === 2, 'summary counts alerts');
assert(sum.noiseRatio >= 0 && sum.noiseRatio <= 1, 'noise ratio in range');

// 9. Unknown alert type falls back safely
const unknown = triageAlert({ title:'d', alertType:'not-a-real-type', severity:5 });
assert(unknown.alertType === 'other', 'unknown type falls back to other');

// 10. Privileged-user extra action fires
assert(hot.actions.some(a => a.toLowerCase().includes('privileged')), 'privileged-account action added');

console.log(`\nAV-02 triage engine: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
