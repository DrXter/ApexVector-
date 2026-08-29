/**
 * ApexVector · AV-08 · Module manifest
 */
import MemoryAttackSimulator from './components/MemoryAttackSimulator.jsx';
import { analyzeMemoryRisk, getMemoryAttackClasses, ENGINE_VERSION, MEMORY_ATTACK_CLASSES, CONTROLS } from './engine/memory.js';
import { exportJson, SAMPLE_ANSWERS, SAMPLE_CTX } from './data/sample.js';

export const manifest = {
  id: 'av-08',
  name: 'AI Memory Attack Simulator',
  pillar: 'security-for-ai',
  version: ENGINE_VERSION,
  summary: 'Analyse an agent memory design for poisoning, persistence, and cross-user-leak risk; learn the attack classes.',
  tags: ['ai-memory', 'memory-poisoning', 'llm-security', 'persistence', 'defensive'],
  component: MemoryAttackSimulator,
  api: { analyzeMemoryRisk, getMemoryAttackClasses, exportJson, attackClasses: MEMORY_ATTACK_CLASSES, controls: CONTROLS, samples: { answers: SAMPLE_ANSWERS, ctx: SAMPLE_CTX } },
  provides: ['memory-risk-score', 'memory-attack-exposure'],
  consumes: ['agent-memory-config'],
};
export default manifest;
