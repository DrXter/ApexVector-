/**
 * ApexVector · AV-12 · Data layer
 * Synthetic sample + export helpers.
 */
import { MODULE_ID, ENGINE_VERSION, classifyQueue } from '../engine/classifier.js';
import { buildExport, exportJson, exportMarkdown, buildTrainingRecord, exportJsonl } from '../export/schema.js';

export const MODULE_NAME = 'Human vs Agent Finding Classifier';

/** A synthetic finding in a captive GCC that is wired into the parent's tenant. */
export const SAMPLE_FINDING = Object.freeze({
  title: 'Approver can view other teams’ invoices by changing an ID',
  classId: 'idor',
  flags: Object.freeze({ chained: 'no', businessContext: 'yes', novel: 'no', verifiable: 'yes', breadth: 'no', parentSystems: 'yes', parentIp: 'no', realData: 'unsure' }),
});

/** A synthetic backlog of finding classes to triage. */
export const SAMPLE_QUEUE = Object.freeze([
  { id: 'F-01', title: 'Reflected script injection in a search box', classId: 'xss', flags: { verifiable: 'yes', breadth: 'yes' } },
  { id: 'F-02', title: 'Outdated library on a public page', classId: 'outdated', flags: { verifiable: 'yes', breadth: 'yes' } },
  { id: 'F-03', title: 'Discount stacking lets an order go negative', classId: 'logic', flags: { businessContext: 'yes' } },
  { id: 'F-04', title: 'Helpdesk role reaches the parent’s admin console', classId: 'chain', flags: { chained: 'yes', parentSystems: 'yes' } },
  { id: 'F-05', title: 'Token from the parent’s identity provider accepted by a GCC app', classId: 'sso', flags: { parentSystems: 'yes', parentIp: 'unsure' } },
  { id: 'F-06', title: 'Object IDs guessable in the reporting API', classId: 'idor', flags: { verifiable: 'yes', realData: 'unsure' } },
]);

export const flagSummary = (flags) => Object.entries(flags).filter(([, v]) => v !== 'no').map(([k, v]) => `${k}=${v}`).join(', ') || 'none set';

/** Shared-schema bundle for one classified finding and the human decision taken (or null). */
export function toBundle(result, assignment = null, title = SAMPLE_FINDING.title, generatedAt) {
  return buildExport({
    moduleId: MODULE_ID,
    moduleName: MODULE_NAME,
    moduleVersion: ENGINE_VERSION,
    generatedAt,
    inputs: { finding: title, vulnerabilityClass: result.label, contextFlags: result.inputs.flags },
    outputs: {
      baseAgentScore: result.base.agent,
      baseHumanScore: result.base.human,
      agentScore: result.agentScore,
      humanScore: result.humanScore,
      lean: result.lean,
      ruleVerdict: result.ruleVerdict,
      verdict: result.verdict,
      confidence: result.confidence,
      gatesFired: result.gates.map((g) => g.id),
    },
    decisions: [assignment
      ? { gate: 'hunter-assignment', decision: assignment.assignment, statement: `Owner: ${assignment.owner}. ${assignment.overridden ? `Overrode the ${assignment.verdict} verdict` : 'Followed the verdict'}${assignment.reason ? `: ${assignment.reason}` : '.'}` }
      : { gate: 'hunter-assignment', decision: 'pending', statement: 'A person assigns who hunts this class of finding.' }],
    assumptions: result.assumptions,
    limits: result.limits,
  });
}

export const exportBundleJson = (...a) => exportJson(toBundle(...a));
export const exportBundleMarkdown = (...a) => exportMarkdown(toBundle(...a));

/** Shared-schema bundle for a whole queue. */
export function toQueueBundle(items = SAMPLE_QUEUE, generatedAt) {
  const q = classifyQueue(items);
  return buildExport({
    moduleId: MODULE_ID,
    moduleName: MODULE_NAME,
    moduleVersion: ENGINE_VERSION,
    generatedAt,
    inputs: { findings: q.rows.map((r) => ({ id: r.id, title: r.title, class: r.result.ok ? r.result.label : 'invalid', flags: flagSummary(r.result.inputs?.flags ?? {}) })) },
    outputs: {
      summary: q.summary,
      verdicts: q.rows.map((r) => ({ id: r.id, verdict: r.result.ok ? r.result.verdict : 'invalid', confidence: r.result.ok ? r.result.confidence : 'n/a', lean: r.result.ok ? r.result.lean : null })),
    },
    decisions: [{ gate: 'hunter-assignment', decision: 'pending', statement: 'A person assigns each class of finding. None are assigned in this export.' }],
    assumptions: q.rows.find((r) => r.result.ok)?.result.assumptions ?? [],
    limits: q.rows.find((r) => r.result.ok)?.result.limits ?? [],
  });
}
export const exportQueueJson = (items, generatedAt) => exportJson(toQueueBundle(items, generatedAt));
export const exportQueueMarkdown = (items, generatedAt) => exportMarkdown(toQueueBundle(items, generatedAt));

/** Starter prompt for a local model. The export is appended below it. */
export const PROMPT_ASSIGNMENT_NOTE = `Here is my finding classifier export. Write a short note for the pentest lead: who should hunt this class of finding, why, and what the person needs to check before agreeing. Do not state any number that is not in the file. Respect the limits listed in the file. The human decision in the file stands; do not change it.`;

export const exportPrompt = (...a) => `${PROMPT_ASSIGNMENT_NOTE}\n\n---\n\n${exportBundleMarkdown(...a)}`;

export const TRAINING_SYSTEM_PROMPT = 'You are a pentest planning advisor for a Global Capability Centre. Use only the scores and flags in the input. Say who should hunt the finding, why, and what a person must confirm. A person makes the assignment, never you.';

/** The engine's answer, written out as the assistant turn. Deterministic. */
export function engineAnswer(r) {
  const gates = r.gates.length ? r.gates.map((g) => g.label).join('; ') : 'none';
  const steps = r.steps.length ? r.steps.map((s) => `${s.flag}=${s.answer} (agent ${s.agent >= 0 ? '+' : ''}${s.agent}, human ${s.human >= 0 ? '+' : ''}${s.human})`).join('; ') : 'no scoring flags set';
  return [
    `Verdict: ${r.verdict} (confidence ${r.confidence}).`,
    `${r.label}: agent ${r.agentScore}, human ${r.humanScore}, lean ${r.lean >= 0 ? '+' : ''}${r.lean}. Base ${r.base.agent}/${r.base.human}.`,
    `Flag effects: ${steps}.`,
    r.ruleVerdict !== r.verdict ? `The score alone says ${r.ruleVerdict}; the boundary rule keeps a person involved.` : 'The boundary rule did not change the verdict.',
    `Gates fired: ${gates}.`,
    `Assumptions: ${r.assumptions.join(' ')}`,
    `Limits: ${r.limits.join(' ')}`,
    'Decision: for a person to assign.',
  ].join('\n');
}

export function toTrainingRecord(result, assignment = null, title = SAMPLE_FINDING.title, generatedAt) {
  const user = JSON.stringify({ finding: title, vulnerabilityClass: result.classId, contextFlags: result.inputs.flags });
  return buildTrainingRecord({
    moduleId: MODULE_ID,
    moduleVersion: ENGINE_VERSION,
    system: TRAINING_SYSTEM_PROMPT,
    user,
    assistant: engineAnswer(result),
    labels: { gate: 'hunter-assignment', humanDecision: assignment ? assignment.assignment : 'pending', verdict: result.verdict, confidence: result.confidence },
    generatedAt,
  });
}
export const exportTrainingJsonl = (...a) => exportJsonl([toTrainingRecord(...a)]);
