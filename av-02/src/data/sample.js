/**
 * ApexVector · AV-02 · Data layer
 * Sample alerts + parsers/exporters for the triage module.
 */

export const SAMPLE_ALERTS = [
  {
    title: 'Kerberoasting attempt — service ticket requests for domain admin SPN',
    alertType: 'credential-access', severity: 9,
    assetCriticality: 'high', userPrivilege: 'high',
    corroboration: 'high', anomaly: 'high', threatIntel: 'high',
  },
  {
    title: 'PowerShell encoded command executed on finance workstation',
    alertType: 'execution', severity: 7,
    assetCriticality: 'high', userPrivilege: 'med',
    corroboration: 'med', anomaly: 'high', threatIntel: 'low',
  },
  {
    title: 'Large outbound transfer to unrecognised cloud storage domain',
    alertType: 'exfiltration', severity: 8,
    assetCriticality: 'high', userPrivilege: 'med',
    corroboration: 'low', anomaly: 'high', threatIntel: 'med',
  },
  {
    title: 'New scheduled task created on database server',
    alertType: 'persistence', severity: 6,
    assetCriticality: 'high', userPrivilege: 'high',
    corroboration: 'low', anomaly: 'med', threatIntel: 'none',
    knownGoodContext: true,
  },
  {
    title: 'SMB connections to 40+ internal hosts from single workstation',
    alertType: 'lateral-movement', severity: 8,
    assetCriticality: 'med', userPrivilege: 'med',
    corroboration: 'med', anomaly: 'high', threatIntel: 'none',
  },
  {
    title: 'EDR signature match — generic trojan heuristic',
    alertType: 'malware', severity: 6,
    assetCriticality: 'low', userPrivilege: 'low',
    corroboration: 'none', anomaly: 'low', threatIntel: 'low',
  },
  {
    title: 'Internal vulnerability scanner sweeping DMZ subnet',
    alertType: 'recon', severity: 4,
    assetCriticality: 'low', userPrivilege: 'low',
    corroboration: 'none', anomaly: 'low', threatIntel: 'none',
    knownGoodContext: true,
  },
  {
    title: 'User login from new country — impossible travel flag',
    alertType: 'credential-access', severity: 7,
    assetCriticality: 'med', userPrivilege: 'high',
    corroboration: 'low', anomaly: 'high', threatIntel: 'none',
  },
  {
    title: 'Local admin group membership modified',
    alertType: 'privilege-escalation', severity: 8,
    assetCriticality: 'high', userPrivilege: 'high',
    corroboration: 'med', anomaly: 'med', threatIntel: 'none',
  },
  {
    title: 'Cloud storage sync client installed against policy',
    alertType: 'policy-violation', severity: 3,
    assetCriticality: 'low', userPrivilege: 'low',
    corroboration: 'none', anomaly: 'low', threatIntel: 'none',
  },
];

/** Export triaged results as JSON for the platform bus / ticketing. */
export function exportJson(triaged) {
  return JSON.stringify({
    module: 'av-02',
    generatedAt: new Date().toISOString(),
    alerts: triaged.map((a) => ({
      rank: a.rank,
      title: a.title,
      alertType: a.alertType,
      confidence: a.score,
      fpLikelihood: Number((a.fpLikelihood * 100).toFixed(0)),
      tier: a.tier,
      sla: a.sla,
      topDrivers: a.drivers.map((d) => d.signal),
      actions: a.actions,
      reasoning: a.reasoning,
    })),
  }, null, 2);
}

/** Export as CSV for shift handover / reporting. */
export function exportCsv(triaged) {
  const head = 'rank,title,type,confidence,fp_likelihood,tier,sla';
  const esc = (s) => (/[",\n]/.test(s) ? `"${String(s).replace(/"/g, '""')}"` : s);
  const rows = triaged.map((a) =>
    [a.rank, esc(a.title), a.alertType, a.score, `${(a.fpLikelihood * 100).toFixed(0)}%`, a.tier, esc(a.sla)].join(',')
  );
  return [head, ...rows].join('\n');
}
