/**
 * ApexVector · AV-07 · Agentic Threat Modeller engine tests
 * Run: node src/engine/agentic.test.mjs
 */
import { analyzeBlastRadius, buildThreatModel, TOOL_CATALOG, TOOL_KEYS, BLAST_BANDS, THREAT_CATEGORIES } from './agentic.js';

let pass = 0, fail = 0;
const assert = (c, m) => { if (c) pass++; else { fail++; console.error('  ✗', m); } };

// 1. No tools → contained, no action blast radius
const none = analyzeBlastRadius({ tools: [], autonomy: 'full-auto', exposure: 'public' });
assert(none.band === 'contained', 'no tools → contained');
assert(none.tools.length === 0, 'no tools listed');

// 2. Dangerous config → catastrophic/severe
const bad = analyzeBlastRadius({ tools: ['code-exec', 'financial', 'send-comms'], autonomy: 'full-auto', exposure: 'retrieval' });
assert(['catastrophic', 'severe'].includes(bad.band), 'dangerous config → catastrophic/severe');
assert(bad.score >= 50, 'dangerous config scores high');

// 3. Mitigations reduce blast radius
const withMit = analyzeBlastRadius({ tools: ['financial', 'write-internal'], autonomy: 'notify-only', exposure: 'public', leastPrivilege: true, actionValidation: true });
const withoutMit = analyzeBlastRadius({ tools: ['financial', 'write-internal'], autonomy: 'notify-only', exposure: 'public' });
assert(withMit.score < withoutMit.score, 'mitigations lower blast radius');

// 4. Human approval lowers vs full auto
const approve = analyzeBlastRadius({ tools: ['financial'], autonomy: 'human-approval', exposure: 'authenticated' });
const auto = analyzeBlastRadius({ tools: ['financial'], autonomy: 'full-auto', exposure: 'authenticated' });
assert(approve.score < auto.score, 'human approval lowers blast radius');

// 5. Irreversible tools surfaced
assert(bad.irreversibleTools.length > 0, 'irreversible tools surfaced');

// 6. Highest-damage tool leads the sorted list
assert(bad.tools[0].damage >= bad.tools[1].damage, 'tools sorted by damage desc');

// 7. Gaps: no least privilege flagged
const noLP = analyzeBlastRadius({ tools: ['db-admin'], autonomy: 'human-on-loop', exposure: 'authenticated' });
assert(noLP.guardrailGaps.some((g) => g.id === 'least-privilege'), 'missing least privilege flagged');

// 8. Gaps: chaining flagged
const chain = analyzeBlastRadius({ tools: ['call-other-agents'], autonomy: 'notify-only', exposure: 'public' });
assert(chain.guardrailGaps.some((g) => g.id === 'chaining'), 'agent chaining gap flagged');

// 9. Gaps: untrusted-to-action path
const untrusted = analyzeBlastRadius({ tools: ['financial'], autonomy: 'notify-only', exposure: 'retrieval' });
assert(untrusted.guardrailGaps.some((g) => g.id === 'untrusted-to-action'), 'untrusted-to-action gap flagged');

// 10. Score bounds + band validity
assert(bad.score >= 0 && bad.score <= 100, 'score within bounds');
assert(BLAST_BANDS.some((b) => b.id === bad.band), 'band valid');

// 11. Unknown tools ignored
const withBad = analyzeBlastRadius({ tools: ['financial', 'not-a-tool'], autonomy: 'full-auto', exposure: 'public' });
assert(withBad.tools.length === 1, 'unknown tools ignored');

// --- Threat model ---

// 12. Goal manipulation always applies
const tm = buildThreatModel({ tools: ['financial'], autonomy: 'full-auto', exposure: 'public' });
assert(tm.threats.some((t) => t.id === 'goal-manipulation'), 'goal manipulation always applies');

// 13. Indirect injection applies with retrieval
const tmRet = buildThreatModel({ tools: [], autonomy: 'human-on-loop', exposure: 'retrieval' });
assert(tmRet.threats.some((t) => t.id === 'indirect-injection'), 'indirect injection applies with retrieval');

// 14. Memory poisoning only with memory
const tmMem = buildThreatModel({ tools: [], autonomy: 'human-on-loop', exposure: 'trusted-only', hasMemory: true });
const tmNoMem = buildThreatModel({ tools: [], autonomy: 'human-on-loop', exposure: 'trusted-only', hasMemory: false });
assert(tmMem.threats.some((t) => t.id === 'memory-poisoning'), 'memory poisoning applies with memory');
assert(!tmNoMem.threats.some((t) => t.id === 'memory-poisoning'), 'memory poisoning excluded without memory');

// 15. Exfiltration applies with comms tools
const tmExfil = buildThreatModel({ tools: ['send-comms'], autonomy: 'notify-only', exposure: 'public' });
assert(tmExfil.threats.some((t) => t.id === 'exfiltration'), 'exfiltration applies with comms tool');

// 16. Every threat carries mitigations
assert(tm.threats.every((t) => Array.isArray(t.mitigations) && t.mitigations.length > 0), 'every threat has mitigations');

console.log(`\nAV-07 agentic threat modeller engine: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
