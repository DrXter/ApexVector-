/**
 * ApexVector · AV-09 · Data layer
 * Sample presets + exporters.
 */

// A realistic "AI everywhere, little governance" org — the common case.
export const SAMPLE_ORG = {
  inventory: 'no',
  policy: 'partial',
  'sanctioned-path': 'no',
  'data-controls': 'no',
  approval: 'no',
  training: 'partial',
  'compliance-map': 'no',
  monitoring: 'no',
  incident: 'no',
};

// A typical unsanctioned tool under review.
export const SAMPLE_TOOL = {
  name: 'Free AI Writing Assistant',
  answers: {
    'data-sensitivity': 'high',
    'trains-on-data': 'unclear',
    'data-residency': 'unknown',
    'access-scope': 'moderate',
    'certifications': 'none',
    'sanctioned': 'no',
  },
};

export function exportOrgJson(result) {
  return JSON.stringify({
    module: 'av-09',
    mode: 'org-exposure',
    generatedAt: new Date().toISOString(),
    score: result.score,
    level: result.level,
    gaps: result.gaps.map((g) => ({ area: g.group, severity: g.severity, gap: g.gap })),
    actionPlan: result.actionPlan.map((a) => ({ priority: a.priority, area: a.group, action: a.action })),
    note: 'Shadow AI = ungoverned AI tool use. The risk is invisibility — you cannot govern what you cannot see. Discovery first, then controls.',
  }, null, 2);
}

export function exportToolJson(result) {
  return JSON.stringify({
    module: 'av-09',
    mode: 'tool-risk',
    generatedAt: new Date().toISOString(),
    tool: result.toolName,
    score: result.score,
    rating: result.rating,
    concerns: result.concerns.map((c) => c.concern),
  }, null, 2);
}
