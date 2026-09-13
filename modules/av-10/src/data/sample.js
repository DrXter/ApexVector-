/**
 * ApexVector · AV-10 · Data layer
 * A single realistic org intake, spanning all 9 dimensions, + exporter.
 */

export const SAMPLE_INTAKE = {
  findings: [
    { title: 'Unpatched VPN, pre-auth RCE', cvss: 9.8, epss: 0.85, businessContext: 0.9 },
    { title: 'Stored XSS in admin panel', cvss: 6.1, epss: 0.1, businessContext: 0.4 },
  ],
  alerts: [
    { severity: 0.7, assetCriticality: 0.8, userPrivilege: 0.6, corroboration: 0.4, anomaly: 0.6, threatIntel: 0.3 },
  ],
  surfaces: [
    { yield: 0.8, exposure: 0.75, hardening: 0.3 },
  ],
  devSecOpsControls: {
    provenance: 'no', scaAiDeps: 'partial', secretScan: 'yes', sastTuned: 'no',
    reviewPolicy: 'partial', licenseCheck: 'no', testCoverage: 'partial',
    promptSupply: 'no', dataLeak: 'partial', pipelineAuthz: 'no',
  },
  promptControls: { untrustedInput: false, reassert: true, delimit: false, noSecrets: true, toolGuard: false, refusal: true },
  agent: { tools: ['read-internal', 'write-internal', 'send-comms', 'financial'], autonomy: 'notify-only', exposure: 'public' },
  memoryControls: {
    untrustedReadback: 'no', writeValidation: 'no', partition: 'partial',
    expiry: 'no', reassertConstraints: 'partial', accessControl: 'partial', noSecrets: 'yes',
  },
  shadowAiControls: {
    inventory: 'no', policy: 'partial', sanctionedPath: 'no', dataControls: 'no',
    approval: 'no', training: 'partial', complianceMap: 'no', monitoring: 'no', incident: 'no',
  },
};

export function exportJson(result) {
  return JSON.stringify({
    module: 'av-10',
    generatedAt: new Date().toISOString(),
    compositePosture: result.composite,
    band: result.band,
    chain: result.chain,
    lenses: result.lenses.map((l) => ({ module: l.id, name: l.name, riskScore: l.score, note: l.label })),
    summary: result.summary,
    note: 'Season 1 capstone — nine independent risk lenses combined into one composite AI-security posture score. Not a single root-cause diagnosis; a portfolio view.',
  }, null, 2);
}
