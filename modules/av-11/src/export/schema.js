/**
 * ApexVector · Season 2 · Shared LLM-ready export schema
 *
 * Every Season 2 module can download what a person selected and what the tool
 * produced as data for an LLM, in two forms from one schema:
 *   - JSON      for tools
 *   - Markdown  for pasting into a prompt
 * Files are generated in the browser. Nothing is sent anywhere.
 * Exports hold synthetic or user-entered data only.
 */

export const SCHEMA_ID = 'apexvector-export';
export const SCHEMA_VERSION = '1.0';

/**
 * @param {Object} p
 * @param {string} p.moduleId        e.g. 'av-11'
 * @param {string} p.moduleName
 * @param {string} p.moduleVersion
 * @param {Object} p.inputs          what the person entered or selected
 * @param {Object} p.outputs         what the module computed
 * @param {Array}  p.decisions       human decisions taken: [{ gate, decision, statement }]
 * @param {string[]} p.assumptions
 * @param {string[]} p.limits
 * @param {string} [p.generatedAt]   ISO timestamp (injectable for tests)
 */
export function buildExport({ moduleId, moduleName, moduleVersion, inputs, outputs, decisions = [], assumptions = [], limits = [], generatedAt }) {
  return {
    schema: SCHEMA_ID,
    schemaVersion: SCHEMA_VERSION,
    module: { id: moduleId, name: moduleName, version: moduleVersion },
    generatedAt: generatedAt ?? new Date().toISOString(),
    dataNote: 'Synthetic or user-entered data only. No client or engagement data.',
    inputs,
    outputs,
    decisions,
    assumptions,
    limits,
  };
}

export function exportJson(bundle) {
  return JSON.stringify(bundle, null, 2);
}

const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function lines(obj, indent = 0) {
  const pad = '  '.repeat(indent);
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    if (isPlain(v)) {
      out.push(`${pad}- **${k}**:`);
      out.push(...lines(v, indent + 1));
    } else if (Array.isArray(v)) {
      out.push(`${pad}- **${k}**: ${v.map((x) => (isPlain(x) ? JSON.stringify(x) : String(x))).join('; ')}`);
    } else {
      out.push(`${pad}- **${k}**: ${v === null ? 'n/a' : String(v)}`);
    }
  }
  return out;
}

/** Markdown for pasting into a prompt. */
export function exportMarkdown(bundle) {
  const md = [];
  md.push(`# ${bundle.module.name} (${bundle.module.id.toUpperCase()} v${bundle.module.version})`);
  md.push('');
  md.push(`Export: ${bundle.schema} ${bundle.schemaVersion} · generated ${bundle.generatedAt}`);
  md.push(`Data: ${bundle.dataNote}`);
  md.push('', '## Inputs', ...lines(bundle.inputs));
  md.push('', '## Outputs', ...lines(bundle.outputs));
  md.push('', '## Human decisions');
  if (bundle.decisions.length === 0) md.push('- none taken');
  for (const d of bundle.decisions) md.push(`- **${d.gate}**: ${d.decision}${d.statement ? ` — ${d.statement}` : ''}`);
  md.push('', '## Assumptions', ...bundle.assumptions.map((a) => `- ${a}`));
  md.push('', '## Limits', ...bundle.limits.map((l) => `- ${l}`));
  md.push('');
  return md.join('\n');
}
