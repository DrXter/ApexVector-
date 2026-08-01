/**
 * ApexVector · AV-04 · Module manifest
 */
import ReconPlanner from './components/ReconPlanner.jsx';
import { buildPlan, scoreSurface, summarize, ENGINE_VERSION, SURFACE_TYPES, OBJECTIVES } from './engine/recon.js';
import { exportJson, exportCsv, SAMPLE_SCOPE } from './data/sample.js';

export const manifest = {
  id: 'av-04',
  name: 'Red Team Recon Planner',
  pillar: 'ai-for-security',
  version: ENGINE_VERSION,
  summary: 'Prioritize authorized red-team scope by foothold probability; propose ATT&CK-mapped attack-path hypotheses.',
  tags: ['red-team', 'recon', 'attack-path', 'mitre-attack', 'engagement-planning'],
  component: ReconPlanner,
  api: { buildPlan, scoreSurface, summarize, exportJson, exportCsv, surfaceTypes: SURFACE_TYPES, objectives: OBJECTIVES, sample: SAMPLE_SCOPE },
  provides: ['recon-plan', 'attack-path-hypotheses'],
  consumes: ['engagement-scope'],
};
export default manifest;
