/**
 * ApexVector · AV-12 · Human vs Agent Finding Classifier
 * Framework-agnostic engine — no UI, no DOM.
 *
 * Season 2 · Episode 2 · AI-led pentest for GCCs.
 *
 * Question: for this kind of finding, should an AI agent hunt it, a person
 * hunt it, or both?
 *
 * Agents are strong where a check is repeatable, verifiable and wide. People
 * are strong where the finding depends on business meaning, chaining several
 * weaknesses, or something nobody has seen before. This module turns that
 * into a transparent scoring rule. The scores are ApexVector defaults chosen
 * to make the reasoning visible. They are a starting opinion, not a benchmark
 * and not measured agent performance.
 *
 * Model (every step is shown on screen):
 *   base scores        agent A0 and human H0 per vulnerability class (0-100)
 *   context flags      yes / no / unsure. yes applies the full delta,
 *                      unsure applies half, no applies nothing.
 *   agent score        A = clamp(A0 + sum of agent deltas, 0, 100)
 *   human score        H = clamp(H0 + sum of human deltas, 0, 100)
 *   lean               L = A − H
 *   verdict            L ≥ +25 AGENT · L ≤ −25 HUMAN · otherwise BOTH
 *   confidence         margin = distance from L to the nearest threshold (±25)
 *                      minus 5 per unsure flag. HIGH ≥ 15 · MEDIUM ≥ 7 · else LOW
 *   boundary rule      parent systems, parent IP or production data on the
 *                      line (yes or unsure) turns AGENT into BOTH
 *   decision gate      a person records the assignment; see recordAssignment
 */

export const ENGINE_VERSION = '1.0.0';
export const MODULE_ID = 'av-12';

export const THRESHOLD = 25;
export const CONFIDENCE_HIGH = 15;
export const CONFIDENCE_MEDIUM = 7;
export const UNSURE_PENALTY = 5;

export const VERDICTS = Object.freeze(['AGENT', 'BOTH', 'HUMAN']);
export const ASSIGNMENTS = Object.freeze(['agent', 'both', 'human']);
export const ANSWERS = Object.freeze(['yes', 'no', 'unsure']);

/** Vulnerability classes with base [agent, human] scores. Defaults, not measurements. */
export const CLASSES = Object.freeze([
  { id: 'xss', label: 'Cross-site scripting', agent: 85, human: 20, note: 'Pattern-heavy and easy to confirm.' },
  { id: 'sqli', label: 'SQL injection', agent: 85, human: 25, note: 'Well-known payloads, clear signal.' },
  { id: 'cmdi', label: 'Command injection', agent: 80, human: 30, note: 'Verifiable by an out-of-band callback.' },
  { id: 'ssrf', label: 'Server-side request forgery', agent: 70, human: 40, note: 'Automatable, but impact needs judgement.' },
  { id: 'misconfig', label: 'Security misconfiguration', agent: 80, human: 20, note: 'Wide and repetitive.' },
  { id: 'outdated', label: 'Known vulnerable component', agent: 90, human: 10, note: 'Version matching at scale.' },
  { id: 'secrets', label: 'Exposed secret or credential', agent: 80, human: 20, note: 'Search problem.' },
  { id: 'authn', label: 'Weak authentication', agent: 65, human: 45, note: 'Some automatable, some design-specific.' },
  { id: 'session', label: 'Session handling flaw', agent: 60, human: 50, note: 'Depends on how the app uses sessions.' },
  { id: 'idor', label: 'Broken object-level authorisation (IDOR)', agent: 60, human: 55, note: 'Agents can try IDs; knowing which objects matter is human.' },
  { id: 'authz', label: 'Privilege escalation', agent: 45, human: 70, note: 'Needs the role model in the owner’s head.' },
  { id: 'api', label: 'API abuse (rate, mass assignment)', agent: 65, human: 45, note: 'Spec-driven checks help.' },
  { id: 'upload', label: 'Unsafe file upload', agent: 60, human: 45, note: 'Partly pattern, partly app logic.' },
  { id: 'cloud', label: 'Cloud IAM over-permission', agent: 55, human: 60, note: 'Reading policy is easy; judging intent is not.' },
  { id: 'sso', label: 'SSO / identity federation flaw', agent: 40, human: 75, note: 'Trust relationships across tenants.' },
  { id: 'logic', label: 'Business logic flaw', agent: 20, human: 90, note: 'Needs to know what the system is for.' },
  { id: 'chain', label: 'Chained attack path', agent: 30, human: 85, note: 'Combining weaknesses across steps and systems.' },
  { id: 'race', label: 'Race condition', agent: 35, human: 75, note: 'Timing and state, hard to specify.' },
  { id: 'social', label: 'Social engineering / process abuse', agent: 25, human: 80, note: 'People and process, not packets.' },
  { id: 'novel', label: 'Novel or unclassified weakness', agent: 15, human: 85, note: 'No pattern to match.' },
]);

/** Context flags. Deltas apply on "yes"; half on "unsure". */
export const FLAGS = Object.freeze([
  { id: 'chained', label: 'Needs several weaknesses combined', agent: -25, human: 20, scores: true },
  { id: 'businessContext', label: 'Depends on business meaning or role rules', agent: -25, human: 25, scores: true },
  { id: 'novel', label: 'Nothing like it has been seen before', agent: -20, human: 20, scores: true },
  { id: 'verifiable', label: 'Has a clear pass/fail check', agent: 15, human: -5, scores: true },
  { id: 'breadth', label: 'Needs wide, repetitive coverage', agent: 20, human: -10, scores: true },
  { id: 'parentSystems', label: 'Touches the parent’s systems', agent: 0, human: 0, scores: false },
  { id: 'parentIp', label: 'Involves the parent’s intellectual property', agent: 0, human: 0, scores: false },
  { id: 'realData', label: 'Would touch production or real data', agent: 0, human: 0, scores: false },
]);

export const DEFAULT_FLAGS = Object.freeze(Object.fromEntries(FLAGS.map((f) => [f.id, 'no'])));

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const weight = (a) => (a === 'yes' ? 1 : a === 'unsure' ? 0.5 : 0);
const round1 = (n) => Math.round(n * 10) / 10;

const LIMITS = Object.freeze([
  'The scores are ApexVector defaults chosen to make the reasoning visible. They are not measured agent or human performance.',
  'The classifier works from the class and the flags only. It has not seen the finding itself.',
  'Agent capability changes quickly. Re-check the base scores each quarter.',
  'A verdict is advice on who should hunt for a class of finding. It does not say whether a finding exists or how severe it is.',
]);

const ASSUMPTIONS = Object.freeze([
  'Agents are rated on repeatability, verifiability and breadth. People are rated on context, chaining and novelty.',
  '"Unsure" counts as half a yes and lowers confidence by 5.',
  'Anything touching the parent’s systems, the parent’s IP or production data keeps a person involved.',
]);

export function findClass(id) {
  return CLASSES.find((c) => c.id === id) ?? null;
}

/**
 * Classify one finding class in context.
 * @param {{classId:string, flags?:Object<string,'yes'|'no'|'unsure'>, baseOverride?:{agent?:number,human?:number}}} input
 */
export function classifyFinding(input = {}) {
  const cls = findClass(input.classId);
  if (!cls) return { ok: false, error: `Unknown class "${input.classId}".` };

  const flags = { ...DEFAULT_FLAGS };
  for (const [k, v] of Object.entries(input.flags ?? {})) {
    if (!(k in DEFAULT_FLAGS)) return { ok: false, error: `Unknown flag "${k}".` };
    if (!ANSWERS.includes(v)) return { ok: false, error: `Flag "${k}" must be yes, no or unsure.` };
    flags[k] = v;
  }

  const ov = input.baseOverride ?? {};
  for (const k of ['agent', 'human']) {
    if (ov[k] !== undefined && !(Number.isFinite(ov[k]) && ov[k] >= 0 && ov[k] <= 100)) {
      return { ok: false, error: `baseOverride.${k} must be a number from 0 to 100.` };
    }
  }
  const baseAgent = ov.agent ?? cls.agent;
  const baseHuman = ov.human ?? cls.human;

  const steps = [];
  let agentDelta = 0;
  let humanDelta = 0;
  for (const f of FLAGS) {
    const w = weight(flags[f.id]);
    if (w === 0 || !f.scores) continue;
    const da = f.agent * w;
    const dh = f.human * w;
    agentDelta += da;
    humanDelta += dh;
    steps.push({ flag: f.id, answer: flags[f.id], agent: da, human: dh });
  }

  const agentScore = clamp(round1(baseAgent + agentDelta), 0, 100);
  const humanScore = clamp(round1(baseHuman + humanDelta), 0, 100);
  const lean = round1(agentScore - humanScore);

  let rule = lean >= THRESHOLD ? 'AGENT' : lean <= -THRESHOLD ? 'HUMAN' : 'BOTH';
  const unsureCount = Object.values(flags).filter((v) => v === 'unsure').length;
  const margin = round1(Math.min(Math.abs(lean - THRESHOLD), Math.abs(lean + THRESHOLD)));
  const confScore = round1(margin - UNSURE_PENALTY * unsureCount);
  const confidence = confScore >= CONFIDENCE_HIGH ? 'HIGH' : confScore >= CONFIDENCE_MEDIUM ? 'MEDIUM' : 'LOW';

  const touched = (id) => flags[id] === 'yes' || flags[id] === 'unsure';
  const gates = [];
  if (touched('parentSystems')) gates.push({ id: 'parent-scope', label: 'Touches the parent’s systems', fired: flags.parentSystems });
  if (touched('parentIp')) gates.push({ id: 'parent-ip', label: 'Involves the parent’s IP', fired: flags.parentIp });
  if (touched('realData')) gates.push({ id: 'production-data', label: 'Would touch production or real data', fired: flags.realData });
  if (confidence === 'LOW') gates.push({ id: 'low-confidence', label: 'Confidence is low', fired: 'yes' });

  const boundary = gates.some((g) => g.id !== 'low-confidence');
  const reasons = [];
  let verdict = rule;
  if (rule === 'AGENT' && boundary) {
    verdict = 'BOTH';
    reasons.push('Boundary rule: the agent would lead, but parent scope, parent IP or production data is involved, so a person stays in the loop.');
  }
  reasons.unshift(`${cls.label}: base agent ${baseAgent}, base human ${baseHuman}. ${cls.note}`);

  return {
    ok: true,
    engineVersion: ENGINE_VERSION,
    classId: cls.id,
    label: cls.label,
    inputs: { classId: cls.id, flags, baseOverride: ov },
    base: { agent: baseAgent, human: baseHuman },
    steps,
    agentScore,
    humanScore,
    lean,
    ruleVerdict: rule,
    verdict,
    margin,
    unsureCount,
    confidenceScore: confScore,
    confidence,
    gates,
    reasons,
    assumptions: [...ASSUMPTIONS],
    limits: [...LIMITS],
  };
}

/**
 * The human decision gate. A person assigns who hunts this class of finding.
 * Rules:
 *   - assignment must be agent, both or human, and an owner is named
 *   - a reason is required when overriding the verdict or when confidence is LOW
 *   - agent-only is refused while any boundary gate (parent scope, parent IP,
 *     production data) has fired
 */
export function recordAssignment(result, { assignment, owner, reason } = {}) {
  if (!result?.ok) return { ok: false, error: 'Classify a finding first.' };
  if (!ASSIGNMENTS.includes(assignment)) return { ok: false, error: 'Assignment must be agent, both or human.' };
  if (!owner || !String(owner).trim()) return { ok: false, error: 'Name the person who owns this decision.' };

  const boundary = result.gates.filter((g) => g.id !== 'low-confidence');
  if (assignment === 'agent' && boundary.length > 0) {
    return { ok: false, error: `Agent-only is not allowed here: ${boundary.map((g) => g.label.toLowerCase()).join('; ')}.` };
  }
  const overrides = assignment !== result.verdict.toLowerCase();
  const needsReason = overrides || result.confidence === 'LOW';
  if (needsReason && !(reason && String(reason).trim())) {
    return { ok: false, error: overrides ? 'Give a reason for overriding the verdict.' : 'Give a reason: confidence is low.' };
  }
  return {
    ok: true,
    record: {
      gate: 'hunter-assignment',
      assignment,
      verdict: result.verdict,
      overridden: overrides,
      confidence: result.confidence,
      owner: String(owner).trim(),
      reason: reason ? String(reason).trim() : '',
    },
  };
}

/** Classify a list of findings: [{ id, title, classId, flags }]. */
export function classifyQueue(items = []) {
  const rows = items.map((it, i) => {
    const result = classifyFinding({ classId: it.classId, flags: it.flags, baseOverride: it.baseOverride });
    return { id: it.id ?? `F-${String(i + 1).padStart(2, '0')}`, title: it.title ?? '', result };
  });
  const good = rows.filter((r) => r.result.ok);
  const count = (fn) => good.filter(fn).length;
  return {
    rows,
    summary: {
      total: rows.length,
      invalid: rows.length - good.length,
      agent: count((r) => r.result.verdict === 'AGENT'),
      both: count((r) => r.result.verdict === 'BOTH'),
      human: count((r) => r.result.verdict === 'HUMAN'),
      lowConfidence: count((r) => r.result.confidence === 'LOW'),
      boundary: count((r) => r.result.gates.some((g) => g.id !== 'low-confidence')),
    },
  };
}
