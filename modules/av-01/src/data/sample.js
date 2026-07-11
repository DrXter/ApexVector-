/**
 * ApexVector · AV-01 · Sample dataset
 * Representative findings for demonstration and testing.
 * Mix of internet-facing / internal, varied severity and exploitability.
 */
export const SAMPLE_FINDINGS = [
  { title: 'Remote code execution via npm lifecycle hook', cvss: 9.8, assetCriticality: 'high', internetFacing: true },
  { title: 'IMDSv1 credential exposure on build server', cvss: 9.1, assetCriticality: 'high', internetFacing: true },
  { title: 'SQL injection in legacy reporting endpoint', cvss: 8.9, assetCriticality: 'med', internetFacing: true },
  { title: 'Kubernetes service-account token readable', cvss: 8.2, assetCriticality: 'high', internetFacing: false },
  { title: 'Container running as root', cvss: 7.6, assetCriticality: 'high', internetFacing: false },
  { title: 'Reflected XSS in search parameter', cvss: 6.1, assetCriticality: 'med', internetFacing: true },
  { title: 'Weak password policy on admin portal', cvss: 5.9, assetCriticality: 'high', internetFacing: true },
  { title: 'Outdated TLS 1.0 supported', cvss: 5.3, assetCriticality: 'med', internetFacing: true },
  { title: 'Verbose error messages leak stack traces', cvss: 4.3, assetCriticality: 'low', internetFacing: false },
  { title: 'Missing HTTP security headers', cvss: 3.7, assetCriticality: 'low', internetFacing: true },
];

export const SAMPLE_PIPE_TEXT = SAMPLE_FINDINGS
  .map((f) => `${f.title} | ${f.cvss} | ${f.assetCriticality} | ${f.internetFacing ? 'y' : 'n'}`)
  .join('\n');
