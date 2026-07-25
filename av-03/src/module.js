/**
 * ApexVector · AV-03 · Module manifest
 */
import RiskTranslator from './components/RiskTranslator.jsx';
import { translate, translateRegister, summarize, ENGINE_VERSION, FINDING_CATEGORIES, ORG_SIZE } from './engine/translate.js';
import { exportJson, exportCsv, SAMPLE_FINDINGS } from './data/sample.js';

export const manifest = {
  id: 'av-03',
  name: 'Risk Translator',
  pillar: 'ai-for-security',
  version: ENGINE_VERSION,
  summary: 'Translate technical findings into board-ready business risk, with optional financial exposure.',
  tags: ['risk-communication', 'grc', 'board-reporting', 'business-risk'],
  component: RiskTranslator,
  api: { translate, translateRegister, summarize, exportJson, exportCsv, categories: FINDING_CATEGORIES, orgSizes: ORG_SIZE, samples: SAMPLE_FINDINGS },
  provides: ['business-risk-register', 'financial-exposure'],
  consumes: ['ranked-findings'],
};
export default manifest;
