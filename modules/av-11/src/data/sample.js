/**
 * ApexVector · AV-11 · Data layer
 * Synthetic sample + export helpers.
 */
import { MODULE_ID, ENGINE_VERSION } from '../engine/cadence.js';
import { buildExport, exportJson, exportMarkdown } from '../export/schema.js';

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
