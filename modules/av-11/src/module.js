/**
 * ApexVector · AV-11 · Module manifest
 */
import CadenceGapCalculator from './components/CadenceGapCalculator.jsx';
import {
  assessCadence, recordDecision, ENGINE_VERSION, CADENCE_OPTIONS, EXPOSURE_LEVELS,
} from './engine/cadence.js';
import {
  exportCadenceJson, exportCadenceMarkdown, buildExportBundle, SAMPLE_INPUTS, SAMPLE_PRESETS, EXPORT_SCHEMA,
} from './data/sample.js';

export const manifest = {
  id: 'av-11',
  name: 'Pentest Cadence Gap Calculator',
  pillar: 'ai-led-pentest',
  season: 2,
  version: ENGINE_VERSION,
  summary: 'Turn release rate and test cadence into the days a year the live system is not the one you tested, then record who accepts the gap.',
  tags: ['pentest', 'cadence', 'continuous-validation', 'gcc', 'risk-acceptance'],
  component: CadenceGapCalculator,
  api: {
    assessCadence, recordDecision, exportCadenceJson, exportCadenceMarkdown, buildExportBundle,
    cadenceOptions: CADENCE_OPTIONS, exposureLevels: EXPOSURE_LEVELS,
    samples: { inputs: SAMPLE_INPUTS, presets: SAMPLE_PRESETS },
  },
  provides: ['cadence-gap', 'risk-acceptance-decision'],
  consumes: [],
  exportSchema: EXPORT_SCHEMA,
};
export default manifest;
