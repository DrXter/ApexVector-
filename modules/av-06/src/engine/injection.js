/**
 * ApexVector · AV-06 · Prompt Injection Test Suite
 * Framework-agnostic engine — no UI, no DOM.
 *
 * DEFENSIVE tool. Two capabilities:
 *   1) assessRobustness() — analyses YOUR OWN system prompt for the presence
 *      or absence of known hardening controls, and scores how resilient it is
 *      to the documented prompt-injection classes (OWASP LLM01).
 *   2) the INJECTION_CLASSES catalogue — explains each known class, how it
 *      works conceptually, and how to defend against it.
 *
 * This tool does NOT generate working attack payloads against arbitrary
 * third-party systems. It inspects a prompt you own for missing defenses,
 * and teaches the threat model. Framing mirrors AV-04: methodology and
 * hardening, not weaponisation.
 *
 * Core thesis: an LLM cannot inherently tell your instructions apart from
 * an attacker's. Robustness comes from controls around the model, not from
 * hoping the model "notices."
 */

export const ENGINE_VERSION = '1.0.0';
export const MODULE_ID = 'av-06';

/**
 * Known prompt-injection classes (aligned to OWASP LLM01 & public research).
 * Each is explained conceptually with defenses — no operational payloads.
 */
export const INJECTION_CLASSES = [
  {
    id: 'direct-override',
    name: 'Direct instruction override',
    idea: 'User input tells the model to ignore prior instructions and follow new ones instead.',
    why: 'The model processes system and user text in the same context window with no hard trust boundary between them.',
    defenses: [
      'Treat all user input as untrusted data, never as instructions',
      'Reassert critical constraints after user input, not only before',
      'Use structured/delimited input so the model knows where user text begins and ends',
    ],
    severity: 0.8,
  },
  {
    id: 'role-play-escape',
    name: 'Role-play / persona escape',
    idea: 'Input reframes the task as fiction, a game, or a "different mode" to slip past restrictions.',
    why: 'Instruction-following is strong; a convincing frame can outweigh a static guardrail sentence.',
    defenses: [
      'Anchor the role and refusal rules as non-negotiable, restated near the output boundary',
      'Add an output-side check independent of the model\'s own judgement',
      'Do not rely on a single "you are X and must never Y" line as the only control',
    ],
    severity: 0.7,
  },
  {
    id: 'indirect-injection',
    name: 'Indirect / second-order injection',
    idea: 'Malicious instructions hide inside content the model later retrieves — a web page, document, or email it summarises.',
    why: 'Retrieved content enters the same context as trusted instructions; the model cannot tell authored data from planted commands.',
    defenses: [
      'Sanitise and clearly label all retrieved/third-party content as untrusted',
      'Strip or escape instruction-like patterns from retrieved text before it reaches the model',
      'Never let retrieved content trigger privileged actions without human confirmation',
    ],
    severity: 0.9,
  },
  {
    id: 'system-prompt-leak',
    name: 'System prompt extraction',
    idea: 'Input coaxes the model into revealing its hidden system prompt or configuration.',
    why: 'The system prompt sits in context; without a control the model may repeat it when asked cleverly.',
    defenses: [
      'Assume the system prompt is not secret — never put credentials or keys in it',
      'Add an explicit non-disclosure instruction, but treat it as defence-in-depth, not a guarantee',
      'Keep sensitive logic server-side, outside the prompt entirely',
    ],
    severity: 0.5,
  },
  {
    id: 'tool-abuse',
    name: 'Tool / function-call abuse',
    idea: 'Injection steers an agent into calling its tools with attacker-chosen arguments — exfiltration, unwanted writes, privileged actions.',
    why: 'If the model decides tool calls and input can influence the model, input can influence tool calls.',
    defenses: [
      'Enforce least privilege on every tool the agent can call',
      'Require human approval for irreversible or privileged actions',
      'Validate tool arguments against policy independently of the model',
    ],
    severity: 0.95,
  },
  {
    id: 'encoding-obfuscation',
    name: 'Encoding / obfuscation',
    idea: 'Instructions are hidden via encoding, unusual characters, or translation to slip past naive filters.',
    why: 'Keyword filters see gibberish; the model still interprets the underlying meaning.',
    defenses: [
      'Do not rely on keyword/blocklist filtering as a primary control',
      'Normalise and decode input before any inspection',
      'Prefer allow-listing expected input shapes over blocklisting bad ones',
    ],
    severity: 0.6,
  },
];

/**
 * Hardening controls the assessor looks for in a system prompt. Presence of
 * signal phrases is a heuristic proxy — the tool is transparent that it checks
 * for the *shape* of a control, not its guaranteed effectiveness.
 */
const CONTROL_CHECKS = [
  {
    id: 'untrusted-input', weight: 0.20,
    label: 'Treats user input as untrusted data',
    signals: [/untrusted/i, /do not (follow|obey|execute) (instructions|commands) (in|from)/i, /treat .* as data/i, /never (follow|obey) instructions/i],
    missing: 'No sign the prompt treats user input as data rather than instructions — the core defense against direct override.',
    counters: ['direct-override', 'indirect-injection'],
  },
  {
    id: 'reassert', weight: 0.15,
    label: 'Reasserts constraints after user input',
    signals: [/regardless of/i, /even if (the user|asked|instructed)/i, /under no circumstances/i, /always .* regardless/i],
    missing: 'Constraints appear stated once; nothing reasserts them against contradicting input.',
    counters: ['direct-override', 'role-play-escape'],
  },
  {
    id: 'delimit', weight: 0.15,
    label: 'Delimits / structures user input',
    signals: [/```/, /<user_input>/i, /delimit/i, /between .* tags/i, /triple (backtick|quote)/i, /xml tag/i],
    missing: 'No structural boundary (delimiters/tags) separating user content from instructions.',
    counters: ['direct-override', 'indirect-injection'],
  },
  {
    id: 'no-secrets', weight: 0.15,
    label: 'Avoids secrets in the prompt',
    signals: [/never (reveal|share|disclose)/i, /do not (reveal|repeat|share) (this|the) (prompt|system)/i, /confidential/i],
    missing: 'No non-disclosure instruction — and remember, prompts should never contain real secrets regardless.',
    counters: ['system-prompt-leak'],
  },
  {
    id: 'tool-guard', weight: 0.20,
    label: 'Guards tool / action use',
    signals: [/human (approval|confirmation|review)/i, /least privilege/i, /confirm before/i, /do not (call|invoke|execute) .* without/i, /require approval/i],
    missing: 'No guardrail on tool or action use — critical if this prompt drives an agent with tools.',
    counters: ['tool-abuse'],
  },
  {
    id: 'refusal', weight: 0.15,
    label: 'Defines explicit refusal behaviour',
    signals: [/refuse/i, /decline/i, /if .* (unsafe|malicious|harmful) .* (do not|refuse|decline)/i, /respond with/i],
    missing: 'No explicit refusal behaviour defined for out-of-policy requests.',
    counters: ['role-play-escape', 'encoding-obfuscation'],
  },
];

export const ROBUSTNESS_LEVELS = Object.freeze([
  { id: 'hardened',  label: 'HARDENED',   min: 78, note: 'strong controls present — maintain and test against live red-teaming' },
  { id: 'moderate',  label: 'MODERATE',   min: 50, note: 'partial defenses — close the gaps before exposing to untrusted input' },
  { id: 'weak',      label: 'WEAK',       min: 28, note: 'few controls — vulnerable to common injection classes' },
  { id: 'exposed',   label: 'EXPOSED',    min: 0,  note: 'essentially undefended — do not connect to untrusted input or tools' },
]);

const clamp = (n, lo = 0, hi = 1) => Math.min(Math.max(n, lo), hi);

/**
 * Assess a system prompt's robustness by checking for hardening controls.
 * @param {string} prompt  the user's OWN system prompt
 * @param {Object} [ctx]
 * @param {boolean} [ctx.hasTools]  does this prompt drive an agent with tools/actions
 * @param {boolean} [ctx.usesRetrieval]  does it summarise/retrieve external content
 */
export function assessRobustness(prompt = '', ctx = {}) {
  const text = String(prompt);
  const totalWeight = CONTROL_CHECKS.reduce((s, c) => s + c.weight, 0);

  let earned = 0;
  const present = [];
  const missing = [];

  for (const c of CONTROL_CHECKS) {
    const hit = c.signals.some((re) => re.test(text));
    if (hit) { earned += c.weight; present.push({ id: c.id, label: c.label }); }
    else { missing.push({ id: c.id, label: c.label, note: c.missing, weight: c.weight, counters: c.counters }); }
  }

  let score = earned / totalWeight;

  // context penalties: tools/retrieval raise the bar
  if (ctx.hasTools && !present.some((p) => p.id === 'tool-guard')) score *= 0.75;
  if (ctx.usesRetrieval && !present.some((p) => p.id === 'delimit' || p.id === 'untrusted-input')) score *= 0.8;

  score = clamp(score);
  const val = Math.round(score * 100);
  const level = ROBUSTNESS_LEVELS.find((l) => val >= l.min) ?? ROBUSTNESS_LEVELS.at(-1);

  // which injection classes the prompt is most exposed to
  const exposedClasses = rankExposure(missing, ctx);

  missing.sort((a, b) => b.weight - a.weight);

  return {
    score: val,
    level: level.id,
    levelLabel: level.label,
    levelNote: level.note,
    present,
    missing,
    exposedClasses,
    context: { hasTools: !!ctx.hasTools, usesRetrieval: !!ctx.usesRetrieval },
    empty: text.trim().length === 0,
  };
}

/** Map missing controls to the injection classes now left open. */
function rankExposure(missing, ctx) {
  const openClassIds = new Set();
  for (const m of missing) for (const c of m.counters) openClassIds.add(c);

  return INJECTION_CLASSES
    .filter((cls) => openClassIds.has(cls.id))
    .map((cls) => {
      let sev = cls.severity;
      if (ctx.hasTools && cls.id === 'tool-abuse') sev = Math.min(sev * 1.1, 1);
      if (ctx.usesRetrieval && cls.id === 'indirect-injection') sev = Math.min(sev * 1.1, 1);
      return { id: cls.id, name: cls.name, severity: Math.round(sev * 100), idea: cls.idea, defenses: cls.defenses };
    })
    .sort((a, b) => b.severity - a.severity);
}

/** Return the full catalogue for browse mode. */
export function getInjectionClasses() {
  return INJECTION_CLASSES.map((c) => ({ ...c, severityPct: Math.round(c.severity * 100) }))
    .sort((a, b) => b.severity - a.severity);
}
