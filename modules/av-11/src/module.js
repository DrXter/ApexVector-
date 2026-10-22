/**
 * ApexVector · AV-11 · Module manifest
 * Season 2 · Episode 1 · AI for Security
 */
import CadenceGapCalculator from './components/CadenceGapCalculator.jsx';
import { assessCadenceGap, ENGINE_VERSION, CADENCE_TIERS, GAP_BANDS } from './engine/cadence.js';
import { exportBundleJson, exportBundleMarkdown, SAMPLE_GCC, MODULE_NAME } from './data/sample.js';

export const manifest = {
  id: 'av-11',
  name: MODULE_NAME,
  pillar: 'ai-for-security',
  season: 2,
  version: ENGINE_VERSION,
  summary: 'Untested days per year between your release train and your pentest cadence, with a human risk-acceptance gate.',
  tags: ['pentest', 'cadence', 'gcc', 'continuous-validation', 'risk-acceptance'],
  component: CadenceGapCalculator,
  api: { assessCadenceGap, exportBundleJson, exportBundleMarkdown, tiers: CADENCE_TIERS, bands: GAP_BANDS, samples: { gcc: SAMPLE_GCC } },
  provides: ['pentest-cadence-gap', 'cadence-tier-recommendation'],
  consumes: [],
};
export default manifest;
