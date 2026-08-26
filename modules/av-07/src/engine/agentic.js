/**
 * ApexVector · AV-07 · Agentic AI Threat Modeller
 * Framework-agnostic engine — no UI, no DOM.
 *
 * Security for AI. Two capabilities:
 *   1) analyzeBlastRadius() — given an agent's tools, permissions, autonomy,
 *      and exposure, computes how much damage a compromised or hijacked agent
 *      could do, and where the guardrail gaps are.
 *   2) buildThreatModel() — maps the agent's configuration to the recognised
 *      agentic threat categories (aligned to OWASP Agentic / emerging agentic
 *      security taxonomies) with concrete mitigations.
 *
 * Premise, following directly from AV-06: once a model has tools and autonomy,
 * a bypassed instruction stops being a content problem and becomes an ACTIONS
 * problem. The blast radius is defined by what the agent can DO, not what it
 * can say. This tool makes that radius explicit.
 */

export const ENGINE_VERSION = '1.0.0';
export const MODULE_ID = 'av-07';

// ---------------------------------------------------------------------------
// Tool capability catalogue — each tool an agent holds carries inherent risk.
// ---------------------------------------------------------------------------
export const TOOL_CATALOG = {
  'read-internal': { label: 'Read internal data / documents', damage: 0.4, reversible: true, category: 'data' },
  'write-internal': { label: 'Write / modify internal data', damage: 0.65, reversible: false, category: 'data' },
  'send-comms': { label: 'Send email / messages externally', damage: 0.7, reversible: false, category: 'exfil' },
  'external-http': { label: 'Make outbound web / API calls', damage: 0.6, reversible: true, category: 'exfil' },
  'code-exec': { label: 'Execute code / shell commands', damage: 0.95, reversible: false, category: 'execution' },
  'financial': { label: 'Move money / issue refunds / transact', damage: 0.9, reversible: false, category: 'financial' },
  'provision': { label: 'Provision / modify infrastructure', damage: 0.9, reversible: false, category: 'infra' },
  'db-admin': { label: 'Database read/write/delete', damage: 0.8, reversible: false, category: 'data' },
  'file-system': { label: 'Read/write host filesystem', damage: 0.75, reversible: false, category: 'execution' },
  'call-other-agents': { label: 'Invoke other agents / sub-agents', damage: 0.7, reversible: false, category: 'chaining' },
};

export const TOOL_KEYS = Object.keys(TOOL_CATALOG);

const AUTONOMY = {
  'human-approval': { label: 'Human approves every action', factor: 0.35 },
  'human-on-loop':  { label: 'Human monitors, can interrupt', factor: 0.6 },
  'notify-only':    { label: 'Acts autonomously, notifies after', factor: 0.85 },
  'full-auto':      { label: 'Fully autonomous, no oversight', factor: 1.0 },
};
export const AUTONOMY_KEYS = Object.keys(AUTONOMY);

const EXPOSURE = {
  'trusted-only':   { label: 'Trusted internal input only', factor: 0.4 },
  'authenticated':  { label: 'Authenticated users', factor: 0.65 },
  'public':         { label: 'Public / untrusted input', factor: 0.9 },
  'retrieval':      { label: 'Ingests external/retrieved content', factor: 1.0 },
};
export const EXPOSURE_KEYS = Object.keys(EXPOSURE);

export const BLAST_BANDS = Object.freeze([
  { id: 'catastrophic', label: 'CATASTROPHIC', min: 72, note: 'a single hijack could cause irreversible, high-impact damage' },
  { id: 'severe',       label: 'SEVERE',       min: 50, note: 'compromise leads to serious, hard-to-reverse harm' },
  { id: 'moderate',     label: 'MODERATE',     min: 28, note: 'meaningful damage, largely contained or reversible' },
  { id: 'contained',    label: 'CONTAINED',    min: 0,  note: 'limited blast radius — good guardrails or low capability' },
]);

const clamp = (n, lo = 0, hi = 1) => Math.min(Math.max(n, lo), hi);

/**
 * Compute an agent's blast radius.
 * @param {Object} cfg
 * @param {string[]} cfg.tools     keys from TOOL_CATALOG
 * @param {string} cfg.autonomy    key from AUTONOMY
 * @param {string} cfg.exposure    key from EXPOSURE
 * @param {boolean} cfg.leastPrivilege  are tools scoped to least privilege
 * @param {boolean} cfg.actionValidation are tool args validated outside the model
 */
export function analyzeBlastRadius(cfg = {}) {
  const tools = (cfg.tools || []).filter((t) => TOOL_CATALOG[t]).map((t) => ({ id: t, ...TOOL_CATALOG[t] }));
  const autonomy = AUTONOMY[cfg.autonomy] || AUTONOMY['human-on-loop'];
  const exposure = EXPOSURE[cfg.exposure] || EXPOSURE['authenticated'];

  // capability: highest-damage tool dominates, others add tapering weight
  const sorted = [...tools].sort((a, b) => b.damage - a.damage);
  let capability = 0;
  sorted.forEach((t, i) => { capability += t.damage * Math.pow(0.55, i); });
  capability = clamp(capability / 1.9);

  // raw blast = capability shaped by how autonomously it acts and how exposed it is
  let blast = capability * (0.5 + 0.5 * autonomy.factor) * (0.55 + 0.45 * exposure.factor);

  // mitigations pull it down
  if (cfg.leastPrivilege) blast *= 0.8;
  if (cfg.actionValidation) blast *= 0.78;

  blast = clamp(blast);
  const score = Math.round(blast * 100);
  const band = BLAST_BANDS.find((b) => score >= b.min) ?? BLAST_BANDS.at(-1);

  const irreversible = sorted.filter((t) => !t.reversible);

  return {
    score,
    band: band.id,
    bandLabel: band.label,
    bandNote: band.note,
    capability: Math.round(capability * 100),
    autonomy: { key: cfg.autonomy, label: autonomy.label },
    exposure: { key: cfg.exposure, label: exposure.label },
    tools: sorted.map((t) => ({ id: t.id, label: t.label, damage: Math.round(t.damage * 100), reversible: t.reversible, category: t.category })),
    irreversibleTools: irreversible.map((t) => t.label),
    mitigations: {
      leastPrivilege: !!cfg.leastPrivilege,
      actionValidation: !!cfg.actionValidation,
    },
    guardrailGaps: findGaps(cfg, sorted, autonomy, exposure),
    summary: buildSummary(sorted, band, autonomy, exposure, irreversible),
  };
}

function findGaps(cfg, tools, autonomy, exposure) {
  const gaps = [];
  const hasIrreversible = tools.some((t) => !t.reversible);
  const hasHighDamage = tools.some((t) => t.damage >= 0.8);

  if (!cfg.leastPrivilege) gaps.push({ id: 'least-privilege', text: 'Tools are not scoped to least privilege — a hijacked agent inherits full tool power.' });
  if (!cfg.actionValidation && hasHighDamage) gaps.push({ id: 'action-validation', text: 'High-damage tool arguments are not validated outside the model — the model alone decides consequential actions.' });
  if (hasIrreversible && autonomy.factor >= 0.85) gaps.push({ id: 'irreversible-auto', text: 'Irreversible actions run with little or no human checkpoint — no chance to catch a hijack before impact.' });
  if (exposure.factor >= 0.9 && !cfg.actionValidation) gaps.push({ id: 'untrusted-to-action', text: 'Untrusted/retrieved input can reach consequential tools without an independent gate — the classic indirect-injection-to-action path.' });
  if (tools.some((t) => t.id === 'call-other-agents')) gaps.push({ id: 'chaining', text: 'Agent can invoke other agents — compromise can propagate across the agent graph, multiplying blast radius.' });
  if (tools.some((t) => t.id === 'code-exec' || t.id === 'file-system')) gaps.push({ id: 'code-exec', text: 'Code/filesystem execution is the highest-leverage capability — treat as crown-jewel access with strict isolation.' });
  return gaps;
}

function buildSummary(tools, band, autonomy, exposure, irreversible) {
  if (tools.length === 0) return 'No tools configured — this agent has no action-based blast radius. Risk is limited to its outputs.';
  const top = tools[0];
  return `This agent's blast radius is ${band.label.toLowerCase()}. Its highest-leverage capability is "${top.label}". ` +
    `It operates under "${autonomy.label.toLowerCase()}" with ${exposure.label.toLowerCase()}. ` +
    (irreversible.length
      ? `${irreversible.length} of its actions are irreversible — a single successful hijack cannot be undone. `
      : 'Its actions are largely reversible, which limits worst-case damage. ') +
    'The blast radius is defined by what it can DO, not what it can say.';
}

// ---------------------------------------------------------------------------
// MODE 2 · Framework-mapped agentic threat model
// ---------------------------------------------------------------------------

/**
 * Agentic threat categories (aligned to OWASP Agentic Security Initiative &
 * emerging agentic taxonomies). Each maps to when it applies and how to
 * mitigate. Applicability is derived from the agent config.
 */
export const THREAT_CATEGORIES = [
  {
    id: 'goal-manipulation', name: 'Goal / instruction manipulation',
    desc: 'Attacker alters the agent\'s objective via injected instructions, redirecting it toward attacker goals.',
    appliesWhen: (c) => true,
    mitigations: ['Treat all input as untrusted data', 'Anchor and re-validate the goal independently of input', 'Detect goal drift between steps'],
  },
  {
    id: 'tool-misuse', name: 'Tool misuse / unauthorized action',
    desc: 'The agent is steered into calling its tools with attacker-chosen arguments.',
    appliesWhen: (c) => (c.tools || []).length > 0,
    mitigations: ['Least privilege per tool', 'Validate tool arguments outside the model', 'Human approval for irreversible actions'],
  },
  {
    id: 'indirect-injection', name: 'Indirect injection via retrieved content',
    desc: 'Malicious instructions hidden in content the agent ingests trigger unintended actions.',
    appliesWhen: (c) => c.exposure === 'retrieval' || c.exposure === 'public',
    mitigations: ['Label and sanitise retrieved content as untrusted', 'Never let retrieved content trigger privileged actions unchecked', 'Strip instruction-like patterns before ingestion'],
  },
  {
    id: 'excessive-agency', name: 'Excessive agency',
    desc: 'The agent has more autonomy or capability than the task requires, widening blast radius unnecessarily.',
    appliesWhen: (c) => c.autonomy === 'notify-only' || c.autonomy === 'full-auto',
    mitigations: ['Scope autonomy to the minimum the task needs', 'Add human checkpoints on high-impact steps', 'Time-box and rate-limit autonomous runs'],
  },
  {
    id: 'agent-chaining', name: 'Multi-agent compromise propagation',
    desc: 'A compromised agent invokes or influences other agents, spreading the attack across the graph.',
    appliesWhen: (c) => (c.tools || []).includes('call-other-agents'),
    mitigations: ['Authenticate inter-agent calls', 'Isolate agent trust domains', 'Constrain what one agent can ask another to do'],
  },
  {
    id: 'memory-poisoning', name: 'Memory / state poisoning',
    desc: 'Attacker plants persistent content in the agent\'s memory that influences future runs.',
    appliesWhen: (c) => c.hasMemory === true,
    mitigations: ['Treat stored memory as untrusted on read-back', 'Scope and expire memory', 'Validate memory writes'],
  },
  {
    id: 'exfiltration', name: 'Data exfiltration',
    desc: 'The agent is induced to send sensitive data outside the trust boundary via its comms/HTTP tools.',
    appliesWhen: (c) => (c.tools || []).some((t) => ['send-comms', 'external-http'].includes(t)),
    mitigations: ['Egress allow-listing', 'DLP on agent outbound channels', 'Separate read-sensitive from send-external capabilities'],
  },
];

/**
 * Build the applicable threat model for an agent config.
 * @param {Object} cfg  same shape as analyzeBlastRadius + optional hasMemory
 */
export function buildThreatModel(cfg = {}) {
  const applicable = THREAT_CATEGORIES.filter((t) => t.appliesWhen(cfg));
  return {
    count: applicable.length,
    threats: applicable.map((t) => ({ id: t.id, name: t.name, desc: t.desc, mitigations: t.mitigations })),
    notApplicable: THREAT_CATEGORIES.filter((t) => !t.appliesWhen(cfg)).map((t) => t.name),
  };
}
