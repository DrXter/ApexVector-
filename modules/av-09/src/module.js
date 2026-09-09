/**
 * ApexVector · AV-09 · Module manifest
 */
import ShadowAiScanner from './components/ShadowAiScanner.jsx';
import { assessOrgExposure, scoreTool, ENGINE_VERSION, EXPOSURE_CONTROLS, TOOL_CRITERIA } from './engine/shadow.js';
import { exportOrgJson, exportToolJson, SAMPLE_ORG, SAMPLE_TOOL } from './data/sample.js';

export const manifest = {
  id: 'av-09',
  name: 'Shadow AI Risk Scanner',
  pillar: 'security-for-ai',
  version: ENGINE_VERSION,
  summary: 'Assess org-wide shadow-AI exposure with an action plan, and score individual unsanctioned AI tools.',
  tags: ['shadow-ai', 'ai-governance', 'third-party-risk', 'dlp', 'compliance'],
  component: ShadowAiScanner,
  api: { assessOrgExposure, scoreTool, exportOrgJson, exportToolJson, controls: EXPOSURE_CONTROLS, criteria: TOOL_CRITERIA, samples: { org: SAMPLE_ORG, tool: SAMPLE_TOOL } },
  provides: ['shadow-ai-exposure', 'ai-tool-risk-score'],
  consumes: ['ai-usage-inventory'],
};
export default manifest;
