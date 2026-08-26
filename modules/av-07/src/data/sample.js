/**
 * ApexVector · AV-07 · Data layer
 * Sample agent config + exporters.
 */

// A realistic "customer-ops agent" — capable, under-guarded: the common case.
export const SAMPLE_AGENT = {
  name: 'Customer Operations Agent',
  tools: ['read-internal', 'write-internal', 'send-comms', 'financial', 'external-http'],
  autonomy: 'notify-only',
  exposure: 'public',
  hasMemory: true,
  leastPrivilege: false,
  actionValidation: false,
};

export function exportJson(blast, threatModel, agentName) {
  return JSON.stringify({
    module: 'av-07',
    generatedAt: new Date().toISOString(),
    agent: agentName || 'unnamed-agent',
    blastRadius: {
      score: blast.score,
      band: blast.band,
      capability: blast.capability,
      autonomy: blast.autonomy.label,
      exposure: blast.exposure.label,
      irreversibleActions: blast.irreversibleTools,
      guardrailGaps: blast.guardrailGaps.map((g) => g.text),
      summary: blast.summary,
    },
    threatModel: threatModel ? {
      applicableThreats: threatModel.threats.map((t) => ({ threat: t.name, description: t.desc, mitigations: t.mitigations })),
    } : null,
    note: 'Blast radius is defined by what the agent can DO, not what it can say. A defensive threat-modelling aid; validate against your own architecture.',
  }, null, 2);
}
