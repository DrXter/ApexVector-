/**
 * ApexVector · AV-05 · Data layer
 * Sample presets + exporters.
 */

// A realistic "mid-adoption, under-governed" pipeline — the common case.
export const SAMPLE_ANSWERS = {
  provenance: 'no',
  'sca-ai-deps': 'partial',
  'secret-scan': 'yes',
  'sast-tuned': 'no',
  'review-policy': 'partial',
  'license-check': 'no',
  'test-coverage': 'partial',
  'prompt-supply': 'no',
  'data-leak': 'partial',
  'pipeline-authz': 'no',
  'incident-ai': 'no',
  training: 'partial',
};

export const SAMPLE_USAGES = ['autocomplete', 'nl-to-code', 'agent-commits', 'external-model'];

export function exportReadinessJson(result) {
  return JSON.stringify({
    module: 'av-05',
    mode: 'pipeline-readiness',
    generatedAt: new Date().toISOString(),
    score: result.score,
    level: result.level,
    levelNote: result.levelNote,
    gaps: result.gaps.map((g) => ({ control: g.id, group: g.group, severity: g.severity, gap: g.gap })),
  }, null, 2);
}

export function exportRiskJson(result) {
  return JSON.stringify({
    module: 'av-05',
    mode: 'ai-code-risk-profile',
    generatedAt: new Date().toISOString(),
    score: result.score,
    tier: result.tier,
    governance: result.governance,
    surfaces: result.surfaces.map((s) => ({ usage: s.label, attackSurface: s.surface, risks: s.risks, control: s.control })),
    priorityControls: result.priorityControls,
    summary: result.summary,
  }, null, 2);
}

export function exportReadinessCsv(result) {
  const head = 'control,group,severity,gap';
  const esc = (s) => (/[",\n]/.test(String(s)) ? `"${String(s).replace(/"/g, '""')}"` : s);
  const rows = result.gaps.map((g) => [g.id, g.group, g.severity, esc(g.gap)].join(','));
  return [head, ...rows].join('\n');
}
