/**
 * ApexVector · AV-04 · Data layer
 * Sample in-scope surfaces + exporters.
 */

export const SAMPLE_SCOPE = {
  ctx: { objective: 'domain-dominance', timeboxDays: 14, stealth: true },
  surfaces: [
    { surface: 'external-web-app', exposure: 'high', hardening: 'med' },
    { surface: 'exposed-api', exposure: 'high', hardening: 'low' },
    { surface: 'vpn-remote-access', exposure: 'med', hardening: 'med' },
    { surface: 'identity-provider', exposure: 'med', hardening: 'high' },
    { surface: 'ad-internal', exposure: 'high', hardening: 'low' },
    { surface: 'cloud-console', exposure: 'med', hardening: 'med' },
    { surface: 'email-phishing', exposure: 'high', hardening: 'med' },
    { surface: 'endpoint-fleet', exposure: 'low', hardening: 'high' },
  ],
};

export function exportJson(plan) {
  return JSON.stringify({
    module: 'av-04',
    generatedAt: new Date().toISOString(),
    engagement: plan.ctx,
    leadVector: plan.summary.leadVector?.label ?? null,
    prioritizedSurfaces: plan.surfaces.map((s) => ({
      rank: s.rank,
      surface: s.label,
      priority: s.priority,
      score: s.score,
      tactic: s.tactic,
      attackRef: s.attackRef,
      reconFocus: s.reconFocus,
      rationale: s.rationale,
    })),
    attackPathHypotheses: plan.attackPathHypotheses,
    note: 'Planning aid for AUTHORIZED, scoped red-team engagements. Tactic-level hypotheses only — no exploitation instructions.',
  }, null, 2);
}

export function exportCsv(plan) {
  const head = 'rank,surface,priority,score,tactic,attack_ref';
  const esc = (s) => (/[",\n]/.test(String(s)) ? `"${String(s).replace(/"/g, '""')}"` : s);
  const rows = plan.surfaces.map((s) =>
    [s.rank, esc(s.label), s.priority, s.score, esc(s.tactic), esc(s.attackRef)].join(',')
  );
  return [head, ...rows].join('\n');
}
