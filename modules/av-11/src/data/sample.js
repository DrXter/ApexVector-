/**
 * ApexVector · AV-11 · Data layer
 * Synthetic sample + export helpers.
 */
import { MODULE_ID, ENGINE_VERSION } from '../engine/cadence.js';
import { buildExport, exportJson, exportMarkdown, buildTrainingRecord, exportJsonl } from '../export/schema.js';

export const MODULE_NAME = 'Pentest Cadence Gap Calculator';

/**
 * A synthetic captive GCC: ships on the parent's weekly-ish release train,
 * is assured on the parent's annual pentest cycle. All numbers are illustrative.
 */
export const SAMPLE_GCC = Object.freeze({
  name: 'Synthetic GCC platform (captive, parent-tenant integrated)',
  releasesPerMonth: 8,
  surfaceShare: 0.4,
  testsPerYear: 1,
  parentTestsPerYear: 1,
  tolerance: 0.2,
});

/** Build the shared-schema bundle for a result and the human decision taken. */
export function toBundle(result, decision = 'pending', systemName = SAMPLE_GCC.name, generatedAt) {
  return buildExport({
    moduleId: MODULE_ID,
    moduleName: MODULE_NAME,
    moduleVersion: ENGINE_VERSION,
    generatedAt,
    inputs: {
      system: systemName,
      releasesPerMonth: result.inputs.releasesPerMonth,
      testsPerYear: result.inputs.testsPerYear,
      shareOfReleasesChangingAttackSurface: result.inputs.surfaceShare,
      parentRequiredTestsPerYear: result.inputs.parentTestsPerYear,
      toleratedUntestedShare: result.inputs.tolerance,
    },
    outputs: {
      releasesPerYear: result.steps.releasesPerYear,
      surfaceChangingReleasesPerYear: result.steps.surfaceChangingPerYear,
      testIntervalDays: result.steps.testIntervalDays,
      untestedExposureDaysPerYear: result.untestedDays,
      shareOfYearUncovered: result.untestedPercent,
      band: result.bandLabel,
      suggestedTestsPerYear: Number.isFinite(result.suggested.testsPerYear) ? result.suggested.testsPerYear : 'more than 1000',
      suggestedCadenceTier: result.suggested.tierLabel,
      parentCadenceMet: result.parent.met,
      untestedPercentAtParentCadence: result.parent.untestedPercentAtParentCadence,
    },
    decisions: [{ gate: 'risk-acceptance', decision, statement: result.statement }],
    assumptions: result.assumptions,
    limits: result.limits,
  });
}

export const exportBundleJson = (result, decision, systemName, generatedAt) => exportJson(toBundle(result, decision, systemName, generatedAt));
export const exportBundleMarkdown = (result, decision, systemName, generatedAt) => exportMarkdown(toBundle(result, decision, systemName, generatedAt));

/** Starter prompt for a local model. The export is appended below it. */
export const PROMPT_RISK_MEMO = `Here is my pentest cadence gap export. Draft a one-page risk memo for the platform owner: what the gap is, what it depends on, and two options with their trade-offs. Do not state any number that is not in the file. Respect the limits listed in the file. The human decision in the file stands; do not change it.`;

/** Prompt-ready text: starter prompt followed by the Markdown export. */
export const exportPrompt = (result, decision, systemName, generatedAt) =>
  `${PROMPT_RISK_MEMO}\n\n---\n\n${exportBundleMarkdown(result, decision, systemName, generatedAt)}`;

export const TRAINING_SYSTEM_PROMPT = 'You are a pentest cadence advisor for a Global Capability Centre. Use only the numbers in the input. State the assumptions and limits. A person makes the risk decision, never you.';

/** The engine's answer, written out as the assistant turn. Deterministic. */
export function engineAnswer(r) {
  const tests = Number.isFinite(r.suggested.testsPerYear) ? `${r.suggested.testsPerYear} tests a year` : 'more than 1000 tests a year';
  const parent = r.parent.requiredTestsPerYear > 0
    ? `Parent requirement: ${r.parent.requiredTestsPerYear} test(s) a year, ${r.parent.met ? 'met' : `short by ${r.parent.shortfallTests}`}. Doing only what the parent asks leaves ${r.parent.untestedPercentAtParentCadence}% of the year untested.`
    : 'No parent requirement was entered.';
  return [
    `Band: ${r.bandLabel}. ${r.bandNote}.`,
    `${r.steps.surfaceChangingPerYear} surface-changing releases a year, one every ${r.steps.spacingDays ?? 'n/a'} days; ${r.inputs.testsPerYear} test(s) a year.`,
    `Untested exposure: ${r.untestedDays} days a year (${r.untestedPercent}%).`,
    parent,
    `To keep untested time at or below ${Math.round(r.suggested.toleranceUsed * 100)}%: ${tests}, which is ${r.suggested.tierLabel.toLowerCase()} (${r.suggested.tierNote}).`,
    `Assumptions: ${r.assumptions.join(' ')}`,
    `Limits: ${r.limits.join(' ')}`,
    'Decision: for a person to accept or reject.',
  ].join('\n');
}

/** One training example from a result and the human decision taken. */
export function toTrainingRecord(result, decision = 'pending', systemName = SAMPLE_GCC.name, generatedAt) {
  const user = JSON.stringify({
    system: systemName,
    releasesPerMonth: result.inputs.releasesPerMonth,
    shareOfReleasesChangingAttackSurface: result.inputs.surfaceShare,
    testsPerYear: result.inputs.testsPerYear,
    parentRequiredTestsPerYear: result.inputs.parentTestsPerYear,
    toleratedUntestedShare: result.inputs.tolerance,
  });
  return buildTrainingRecord({
    moduleId: MODULE_ID,
    moduleVersion: ENGINE_VERSION,
    system: TRAINING_SYSTEM_PROMPT,
    user,
    assistant: engineAnswer(result),
    labels: { gate: 'risk-acceptance', humanDecision: decision, band: result.band, tier: result.suggested.tier },
    generatedAt,
  });
}

export const exportTrainingJsonl = (result, decision, systemName, generatedAt) =>
  exportJsonl([toTrainingRecord(result, decision, systemName, generatedAt)]);
