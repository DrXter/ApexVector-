/**
 * ApexVector · AV-05 · Module manifest
 */
import AiReadinessChecker from './components/AiReadinessChecker.jsx';
import { assessReadiness, profileAiCodeRisk, ENGINE_VERSION, READINESS_CONTROLS, AI_USAGE_VECTORS } from './engine/readiness.js';
import { exportReadinessJson, exportRiskJson, exportReadinessCsv, SAMPLE_ANSWERS, SAMPLE_USAGES } from './data/sample.js';

export const manifest = {
  id: 'av-05',
  name: 'DevSecOps AI Readiness Checker',
  pillar: 'ai-for-security',
  version: ENGINE_VERSION,
  summary: 'Score how ready a pipeline is to ship AI-generated code safely; map the AI-code attack surface.',
  tags: ['devsecops', 'ai-code', 'supply-chain', 'ci-cd', 'appsec'],
  component: AiReadinessChecker,
  api: { assessReadiness, profileAiCodeRisk, exportReadinessJson, exportRiskJson, exportReadinessCsv, controls: READINESS_CONTROLS, usageVectors: AI_USAGE_VECTORS, samples: { answers: SAMPLE_ANSWERS, usages: SAMPLE_USAGES } },
  provides: ['ai-readiness-score', 'ai-code-risk-profile'],
  consumes: ['pipeline-config'],
};
export default manifest;
