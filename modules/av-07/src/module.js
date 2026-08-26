/**
 * ApexVector · AV-07 · Module manifest
 */
import AgenticThreatModeller from './components/AgenticThreatModeller.jsx';
import { analyzeBlastRadius, buildThreatModel, ENGINE_VERSION, TOOL_CATALOG, THREAT_CATEGORIES } from './engine/agentic.js';
import { exportJson, SAMPLE_AGENT } from './data/sample.js';

export const manifest = {
  id: 'av-07',
  name: 'Agentic AI Threat Modeller',
  pillar: 'security-for-ai',
  version: ENGINE_VERSION,
  summary: 'Model an AI agent\'s blast radius and applicable agentic threats from its tools, autonomy, and exposure.',
  tags: ['agentic-ai', 'threat-modelling', 'blast-radius', 'llm-security', 'owasp-agentic'],
  component: AgenticThreatModeller,
  api: { analyzeBlastRadius, buildThreatModel, exportJson, toolCatalog: TOOL_CATALOG, threatCategories: THREAT_CATEGORIES, sample: SAMPLE_AGENT },
  provides: ['agent-blast-radius', 'agentic-threat-model'],
  consumes: ['agent-config'],
};
export default manifest;
