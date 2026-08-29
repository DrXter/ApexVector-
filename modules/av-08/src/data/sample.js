/**
 * ApexVector · AV-08 · Data layer
 * Sample memory setup + exporters.
 */

// A realistic "assistant with memory, under-guarded" setup — the common case.
export const SAMPLE_ANSWERS = {
  'untrusted-readback': 'no',
  'write-validation': 'no',
  'partition': 'partial',
  'expiry': 'no',
  'reassert-constraints': 'partial',
  'access-control': 'partial',
  'no-secrets': 'yes',
};

export const SAMPLE_CTX = { untrustedInput: true, sharedMemory: false };

export function exportJson(result) {
  return JSON.stringify({
    module: 'av-08',
    mode: 'memory-risk-analysis',
    generatedAt: new Date().toISOString(),
    score: result.score,
    tier: result.tier,
    context: result.context,
    controlsMissing: result.missing.map((m) => ({ control: m.label, why: m.note, severity: m.severity })),
    exposedAttackClasses: result.exposedClasses.map((c) => ({ class: c.name, severity: c.severity, defenses: c.defenses })),
    note: 'Defensive memory-risk heuristic. Memory turns a one-shot injection into a persistent foothold — treat stored state as untrusted. Validate against your real architecture.',
  }, null, 2);
}
