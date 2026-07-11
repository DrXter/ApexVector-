/**
 * ApexVector · AV-01 · Data layer
 * Parsers, normalizers, and export adapters.
 *
 * Separated from the engine so the platform can swap in its own data sources
 * (scanner APIs, ticketing exports, SIEM feeds) without touching scoring logic.
 */

/** Canonical asset-criticality normalizer. */
export function normalizeCriticality(raw) {
  const v = (raw || '').toString().trim().toLowerCase();
  if (v.startsWith('h') || v === 'critical' || v === '1') return 'high';
  if (v.startsWith('l') || v === '3') return 'low';
  return 'med';
}

/** Canonical boolean normalizer for exposure flags. */
export function normalizeBool(raw) {
  const v = (raw || '').toString().trim().toLowerCase();
  return v === 'y' || v === 'yes' || v === 'true' || v === '1' || v === 'external';
}

/**
 * Parse the pipe-delimited quick-entry format:
 *   title | cvss | asset-criticality | internet-facing [ | epss | ssvc ]
 * Optional trailing epss / ssvc columns let users supply real feed values.
 */
export function parsePipeFormat(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  return lines.map((line) => {
    const p = line.split('|').map((s) => s.trim());
    const finding = {
      title: p[0] || 'Untitled finding',
      cvss: parseFloat(p[1]) || 5.0,
      assetCriticality: normalizeCriticality(p[2]),
      internetFacing: normalizeBool(p[3]),
    };
    if (p[4] !== undefined && p[4] !== '') finding.epss = clampUnit(parseFloat(p[4]));
    if (p[5] !== undefined && p[5] !== '') finding.ssvc = clampUnit(parseFloat(p[5]));
    return finding;
  });
}

/**
 * Parse CSV with a header row. Recognized columns (case-insensitive):
 * title, cvss, asset_criticality|criticality, internet_facing|exposure, epss, ssvc
 */
export function parseCsv(text) {
  const rows = text.split('\n').map((r) => r.trim()).filter(Boolean);
  if (!rows.length) return [];
  const headers = splitCsvRow(rows[0]).map((h) => h.toLowerCase().trim());

  const idx = (names) => headers.findIndex((h) => names.includes(h));
  const iTitle = idx(['title', 'finding', 'name', 'vulnerability']);
  const iCvss = idx(['cvss', 'cvss_score', 'severity_score']);
  const iCrit = idx(['asset_criticality', 'criticality', 'asset']);
  const iExp = idx(['internet_facing', 'exposure', 'external', 'facing']);
  const iEpss = idx(['epss', 'epss_score']);
  const iSsvc = idx(['ssvc', 'ssvc_weight']);

  return rows.slice(1).map((row) => {
    const c = splitCsvRow(row);
    const finding = {
      title: (c[iTitle] || 'Untitled finding').trim(),
      cvss: parseFloat(c[iCvss]) || 5.0,
      assetCriticality: normalizeCriticality(c[iCrit]),
      internetFacing: normalizeBool(c[iExp]),
    };
    if (iEpss >= 0 && c[iEpss]) finding.epss = clampUnit(parseFloat(c[iEpss]));
    if (iSsvc >= 0 && c[iSsvc]) finding.ssvc = clampUnit(parseFloat(c[iSsvc]));
    return finding;
  });
}

/** Parse a JSON array of findings (platform / API interchange format). */
export function parseJson(text) {
  const data = JSON.parse(text);
  const arr = Array.isArray(data) ? data : data.findings || [];
  return arr.map((f) => ({
    title: f.title || f.name || 'Untitled finding',
    cvss: Number(f.cvss) || 5.0,
    assetCriticality: normalizeCriticality(f.assetCriticality || f.criticality),
    internetFacing: normalizeBool(f.internetFacing ?? f.exposure),
    ...(f.epss != null ? { epss: clampUnit(Number(f.epss)) } : {}),
    ...(f.ssvc != null ? { ssvc: clampUnit(Number(f.ssvc)) } : {}),
  }));
}

/** Auto-detect format and parse. */
export function parseInput(text) {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) return parseJson(trimmed);
  if (trimmed.includes(',') && !trimmed.split('\n')[0].includes('|')) {
    // looks like CSV with header
    const firstLine = trimmed.split('\n')[0].toLowerCase();
    if (/title|cvss|finding|vulnerability/.test(firstLine)) return parseCsv(trimmed);
  }
  return parsePipeFormat(trimmed);
}

/** Export scored findings as the platform JSON interchange format. */
export function exportJson(scored, meta = {}) {
  return JSON.stringify(
    {
      module: 'av-01',
      generatedAt: new Date().toISOString(),
      ...meta,
      findings: scored.map((f) => ({
        rank: f.rank,
        title: f.title,
        cvss: f.cvss,
        epss: Number(f.epss.toFixed(4)),
        ssvc: Number(f.ssvc.toFixed(4)),
        composite: Number(f.composite.toFixed(4)),
        score: f.score,
        priority: f.priority,
        action: f.action,
        rationale: f.rationale,
        estimated: f.estimated,
      })),
    },
    null,
    2
  );
}

/** Export scored findings as CSV for ticketing / spreadsheet handoff. */
export function exportCsv(scored) {
  const head = 'rank,title,cvss,epss,ssvc,composite_score,priority,action';
  const rows = scored.map((f) =>
    [
      f.rank,
      csvEscape(f.title),
      f.cvss.toFixed(1),
      (f.epss * 100).toFixed(0) + '%',
      (f.ssvc * 100).toFixed(0) + '%',
      f.score,
      f.priority,
      csvEscape(f.action),
    ].join(',')
  );
  return [head, ...rows].join('\n');
}

// ---- helpers ----
function clampUnit(n) {
  if (Number.isNaN(n)) return undefined;
  // accept either 0..1 or 0..100 and normalize to 0..1
  const v = n > 1 ? n / 100 : n;
  return Math.min(Math.max(v, 0), 1);
}

function splitCsvRow(row) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') inQ = !inQ;
    else if (ch === ',' && !inQ) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.replace(/^"|"$/g, '').trim());
}

function csvEscape(s) {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
