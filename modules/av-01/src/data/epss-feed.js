/**
 * ApexVector · AV-01 · EPSS feed adapter
 *
 * Connects to FIRST.org's public EPSS API to pull real exploit-prediction
 * scores when findings carry CVE identifiers. Falls back cleanly to the
 * engine's heuristic estimate when a CVE is absent or the feed is unreachable.
 *
 * The platform can replace this adapter with an internal threat-intel feed
 * implementing the same `enrich(findings)` contract.
 */

const EPSS_ENDPOINT = 'https://api.first.org/data/v1/epss';
const CVE_RE = /CVE-\d{4}-\d{4,7}/i;

/** Extract a CVE id from a finding title or explicit field. */
export function extractCve(finding) {
  if (finding.cve) return finding.cve.toUpperCase();
  const m = (finding.title || '').match(CVE_RE);
  return m ? m[0].toUpperCase() : null;
}

/**
 * Enrich findings with live EPSS scores where a CVE is available.
 * Returns a new array; never throws — on failure, findings pass through
 * unchanged and the engine will estimate EPSS instead.
 *
 * @param {Array} findings
 * @param {Object} [opts]
 * @param {Function} [opts.fetchImpl]  injectable fetch (for testing / platform)
 * @returns {Promise<Array>}
 */
export async function enrich(findings, opts = {}) {
  const fetchImpl = opts.fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
  if (!fetchImpl) return findings;

  const cveMap = new Map();
  for (const f of findings) {
    const cve = extractCve(f);
    if (cve) cveMap.set(cve, true);
  }
  if (cveMap.size === 0) return findings;

  const cves = [...cveMap.keys()].join(',');
  let scores = {};
  try {
    const res = await fetchImpl(`${EPSS_ENDPOINT}?cve=${encodeURIComponent(cves)}`);
    if (res.ok) {
      const json = await res.json();
      for (const row of json.data || []) {
        scores[row.cve.toUpperCase()] = parseFloat(row.epss);
      }
    }
  } catch (_) {
    // network unreachable → graceful fallback, findings unchanged
    return findings;
  }

  return findings.map((f) => {
    const cve = extractCve(f);
    if (cve && scores[cve] != null) {
      return { ...f, epss: scores[cve], epssSource: 'first.org' };
    }
    return f;
  });
}
