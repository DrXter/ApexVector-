/**
 * ApexVector · AV-10 · Module manifest — Season 1 Finale
 */
import FinalShowdown from './components/FinalShowdown.jsx';
import { runPipeline, ENGINE_VERSION, POSTURE_BANDS } from './engines/posture.js';
import { exportJson, SAMPLE_INTAKE } from './data/sample.js';

export const manifest = {
  id: 'av-10',
  name: 'Final Showdown',
  pillar: 'season-1-finale',
  version: ENGINE_VERSION,
  summary: 'Unified AI-security posture engine — runs all 9 prior modules against one shared intake and combines them into one composite score.',
  tags: ['posture', 'season-finale', 'ai-security', 'aggregate-risk'],
  component: FinalShowdown,
  api: { runPipeline, exportJson, postureBands: POSTURE_BANDS, sample: SAMPLE_INTAKE },
  provides: ['ai-security-posture-score'],
  consumes: ['findings', 'alerts', 'surfaces', 'devSecOpsControls', 'promptControls', 'agent', 'memoryControls', 'shadowAiControls'],
};
export default manifest;
