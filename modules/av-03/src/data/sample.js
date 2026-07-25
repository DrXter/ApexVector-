/**
 * ApexVector · AV-03 · Data layer
 * Sample findings for the risk register + exporters.
 */

export const SAMPLE_FINDINGS = [
  { title: 'Public cloud storage bucket exposing customer records', category: 'data-exposure', cvss: 9.1, exploitability: 'high', dataVolume: 'high' },
  { title: 'Unpatched VPN allowing pre-auth remote access', category: 'ransomware-path', cvss: 9.8, exploitability: 'high', dataVolume: 'high' },
  { title: 'Domain admin credentials reused across systems', category: 'account-takeover', cvss: 8.2, exploitability: 'med', dataVolume: 'med' },
  { title: 'Payment API missing transaction signing', category: 'financial-fraud', cvss: 8.0, exploitability: 'med', dataVolume: 'high' },
  { title: 'Critical vendor with unpatched remote-access software', category: 'supply-chain', cvss: 7.4, exploitability: 'med', dataVolume: 'med' },
  { title: 'Customer portal vulnerable to denial of service', category: 'service-disruption', cvss: 6.5, exploitability: 'high', dataVolume: 'low' },
  { title: 'Logging retention below regulatory requirement', category: 'compliance-gap', cvss: 5.0, exploitability: 'low', dataVolume: 'med' },
  { title: 'Source code repository accessible without MFA', category: 'ip-theft', cvss: 7.1, exploitability: 'med', dataVolume: 'high' },
];

export function exportJson(register, summary) {
  return JSON.stringify({
    module: 'av-03',
    generatedAt: new Date().toISOString(),
    aggregateExposure: summary?.aggregateExposure ?? null,
    register: register.map((r) => ({
      rank: r.rank,
      title: r.title,
      category: r.category,
      riskScore: r.score,
      rating: r.rating,
      boardGuidance: r.boardGuidance,
      execSummary: r.execSummary,
      businessConsequence: r.businessConsequence,
      impactDrivers: r.impactDrivers,
      ...(r.financial ? { financialExposure: { low: r.financial.low, expected: r.financial.expected, high: r.financial.high, basis: r.financial.basis } } : {}),
    })),
  }, null, 2);
}

export function exportCsv(register) {
  const hasFin = register.some((r) => r.financial);
  const head = ['rank', 'title', 'category', 'risk_score', 'rating', 'board_guidance']
    .concat(hasFin ? ['exposure_low', 'exposure_expected', 'exposure_high'] : []).join(',');
  const esc = (s) => (/[",\n]/.test(String(s)) ? `"${String(s).replace(/"/g, '""')}"` : s);
  const rows = register.map((r) => {
    const base = [r.rank, esc(r.title), r.category, r.score, r.rating, esc(r.boardGuidance)];
    if (hasFin) base.push(r.financial?.low ?? '', r.financial?.expected ?? '', r.financial?.high ?? '');
    return base.join(',');
  });
  return [head, ...rows].join('\n');
}
