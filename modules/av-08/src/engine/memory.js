/**
 * ApexVector · AV-08 · AI Memory Attack Simulator
 * Framework-agnostic engine — no UI, no DOM.
 *
 * Security for AI. Two capabilities:
 *   1) analyzeMemoryRisk() — given how an agent's memory works (what gets
 *      stored, who can write it, whether it's shared, how it's read back),
 *      scores exposure to the memory-specific attack classes and surfaces
 *      the hardening controls that are missing.
 *   2) the MEMORY_ATTACK_CLASSES catalogue — explains each class, how it
 *      works conceptually, and how to defend. No operational payloads.
 *
 * Premise, continuing the arc: AV-06 (a prompt can be bypassed) and AV-07
 * (an agent with tools has blast radius) are about a SINGLE session. Memory
 * changes the time axis. Poison what an agent remembers and the compromise
 * PERSISTS — every future session inherits it. Memory turns a one-shot
 * injection into a durable foothold.
 */

export const ENGINE_VERSION = '1.0.0';
export const MODULE_ID = 'av-08';

/**
 * Memory-specific attack classes. Defensive explainer content — how each
 * works and how to defend, no step-by-step exploitation.
 */
export const MEMORY_ATTACK_CLASSES = [
  {
    id: 'memory-poisoning',
    name: 'Memory poisoning',
    idea: 'An attacker plants content during one interaction that is written to memory and shapes the agent\'s behaviour in later sessions.',
    why: 'If untrusted input can reach what gets stored, the attacker writes to the agent\'s future context — not just its current one.',
    defenses: [
      'Treat memory as untrusted data on read-back, not as trusted instruction',
      'Validate and sanitise what gets written to memory, not only what comes in',
      'Separate durable "facts" from anything instruction-like; never persist commands',
    ],
    severity: 0.9,
  },
  {
    id: 'persistence',
    name: 'Persistent foothold',
    idea: 'A single successful injection is stored, so the attacker\'s influence survives across sessions without needing to re-attack.',
    why: 'Memory removes the need to win every session — winning once and persisting is enough.',
    defenses: [
      'Scope and expire memory — durable by default is dangerous',
      'Re-establish critical constraints fresh each session rather than trusting stored state',
      'Log and diff memory writes so injected persistence is detectable',
    ],
    severity: 0.8,
  },
  {
    id: 'cross-user-leak',
    name: 'Cross-user / cross-tenant leakage',
    idea: 'Memory written in one user\'s context surfaces in another\'s — leaking data or carrying an injection across trust boundaries.',
    why: 'Shared or improperly partitioned memory lets one user\'s content influence another\'s session.',
    defenses: [
      'Hard-partition memory per user / tenant; never share a memory store across trust boundaries',
      'Namespace and access-control every memory read and write',
      'Treat cross-context retrieval as a privilege-boundary crossing',
    ],
    severity: 0.85,
  },
  {
    id: 'context-overflow',
    name: 'Memory flooding / context crowding',
    idea: 'An attacker fills memory with content that crowds out or dilutes legitimate context and safety instructions.',
    why: 'Finite context plus unbounded memory means attacker-controlled volume can push out what matters.',
    defenses: [
      'Cap and prioritise what memory can inject into context',
      'Rank memory relevance rather than dumping it all in',
      'Keep safety-critical instructions outside attacker-influenceable memory',
    ],
    severity: 0.6,
  },
  {
    id: 'false-memory',
    name: 'False memory / fact fabrication',
    idea: 'Attacker induces the agent to store fabricated "facts" it later treats as trusted ground truth.',
    why: 'If the agent stores its own inferences or user claims uncritically, fabrications become durable truth.',
    defenses: [
      'Attribute and source stored facts; keep provenance with the memory',
      'Do not let unverified user claims become authoritative memory',
      'Allow correction / invalidation of stored facts',
    ],
    severity: 0.7,
  },
  {
    id: 'memory-exfil',
    name: 'Memory extraction',
    idea: 'Attacker coaxes the agent into revealing what it has stored — potentially another user\'s data or sensitive context.',
    why: 'Memory concentrates sensitive data; without access control it can be read back out.',
    defenses: [
      'Never store secrets or another user\'s PII in agent-readable memory',
      'Access-control memory reads by the current principal',
      'Assume anything in memory can be surfaced — minimise what goes in',
    ],
    severity: 0.75,
  },
];

/**
 * Hardening controls the analyzer checks for. Each maps to the attack
 * classes it counters. Answered yes/partial/no about the user's setup.
 */
const CONTROL_CHECKS = [
  {
    id: 'untrusted-readback', weight: 0.20,
    label: 'Memory treated as untrusted on read-back',
    missing: 'Stored memory is read back as trusted context — a poisoned entry becomes trusted instruction.',
    counters: ['memory-poisoning', 'false-memory'],
  },
  {
    id: 'write-validation', weight: 0.16,
    label: 'Writes to memory are validated / sanitised',
    missing: 'Nothing validates what gets written — untrusted input flows straight into durable memory.',
    counters: ['memory-poisoning', 'false-memory'],
  },
  {
    id: 'partition', weight: 0.20,
    label: 'Memory hard-partitioned per user / tenant',
    missing: 'Memory is shared or weakly partitioned — one user\'s content can reach another\'s session.',
    counters: ['cross-user-leak', 'memory-exfil'],
  },
  {
    id: 'expiry', weight: 0.14,
    label: 'Memory is scoped and expires',
    missing: 'Memory is durable by default — an injection persists indefinitely with no decay.',
    counters: ['persistence'],
  },
  {
    id: 'reassert-constraints', weight: 0.12,
    label: 'Safety constraints re-established each session',
    missing: 'Critical constraints rely on stored state rather than being re-established fresh — persistence-friendly.',
    counters: ['persistence', 'context-overflow'],
  },
  {
    id: 'access-control', weight: 0.10,
    label: 'Memory reads/writes are access-controlled',
    missing: 'No access control on memory operations — reads and writes are not bound to the current principal.',
    counters: ['memory-exfil', 'cross-user-leak'],
  },
  {
    id: 'no-secrets', weight: 0.08,
    label: 'No secrets / PII stored in agent-readable memory',
    missing: 'Sensitive data may live in agent-readable memory, where extraction can surface it.',
    counters: ['memory-exfil'],
  },
];

export const RISK_TIERS = Object.freeze([
  { id: 'critical', label: 'CRITICAL', min: 70, note: 'memory is a durable attack surface — a single injection can persist and spread' },
  { id: 'elevated', label: 'ELEVATED', min: 45, note: 'meaningful memory exposure — close the gaps before trusting stored state' },
  { id: 'moderate', label: 'MODERATE', min: 22, note: 'some memory risk — mostly contained' },
  { id: 'hardened', label: 'HARDENED', min: 0,  note: 'strong memory controls — low persistence/poisoning exposure' },
]);

const clamp = (n, lo = 0, hi = 1) => Math.min(Math.max(n, lo), hi);
const ANSWER_VALUE = { yes: 1, partial: 0.5, no: 0 };

/**
 * Analyze an agent's memory setup for risk.
 * @param {Object} answers  controlId -> 'yes'|'partial'|'no'
 * @param {Object} [ctx]
 * @param {boolean} [ctx.untrustedInput]  can untrusted input reach what's stored
 * @param {boolean} [ctx.sharedMemory]    is memory shared across users/sessions
 */
export function analyzeMemoryRisk(answers = {}, ctx = {}) {
  const totalWeight = CONTROL_CHECKS.reduce((s, c) => s + c.weight, 0);

  // risk = weighted absence of controls
  let riskAccum = 0;
  const missing = [];
  const present = [];
  for (const c of CONTROL_CHECKS) {
    const v = ANSWER_VALUE[answers[c.id]] ?? 0;
    riskAccum += (1 - v) * c.weight;
    if (v < 1) missing.push({ id: c.id, label: c.label, note: c.missing, weight: c.weight, severity: v === 0 ? 'open' : 'partial', counters: c.counters });
    else present.push({ id: c.id, label: c.label });
  }

  let risk = riskAccum / totalWeight;
  // context amplifiers
  if (ctx.untrustedInput) risk = clamp(risk * 1.15);
  if (ctx.sharedMemory) risk = clamp(risk * 1.15);

  risk = clamp(risk);
  const score = Math.round(risk * 100);
  const tier = RISK_TIERS.find((t) => score >= t.min) ?? RISK_TIERS.at(-1);

  missing.sort((a, b) => (a.severity === b.severity ? b.weight - a.weight : a.severity === 'open' ? -1 : 1));

  return {
    score,
    tier: tier.id,
    tierLabel: tier.label,
    tierNote: tier.note,
    present,
    missing,
    topGaps: missing.slice(0, 5),
    exposedClasses: rankExposure(missing, ctx),
    context: { untrustedInput: !!ctx.untrustedInput, sharedMemory: !!ctx.sharedMemory },
    empty: Object.keys(answers).length === 0,
  };
}

function rankExposure(missing, ctx) {
  const openIds = new Set();
  for (const m of missing) for (const c of m.counters) openIds.add(c);
  return MEMORY_ATTACK_CLASSES
    .filter((cls) => openIds.has(cls.id))
    .map((cls) => {
      let sev = cls.severity;
      if (ctx.sharedMemory && cls.id === 'cross-user-leak') sev = Math.min(sev * 1.1, 1);
      if (ctx.untrustedInput && cls.id === 'memory-poisoning') sev = Math.min(sev * 1.1, 1);
      return { id: cls.id, name: cls.name, severity: Math.round(sev * 100), idea: cls.idea, defenses: cls.defenses };
    })
    .sort((a, b) => b.severity - a.severity);
}

/** Full catalogue for browse mode. */
export function getMemoryAttackClasses() {
  return MEMORY_ATTACK_CLASSES.map((c) => ({ ...c, severityPct: Math.round(c.severity * 100) }))
    .sort((a, b) => b.severity - a.severity);
}

export const CONTROLS = CONTROL_CHECKS.map((c) => ({ id: c.id, label: c.label }));
