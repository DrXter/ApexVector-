/**
 * ApexVector · AV-06 · Module manifest
 */
import PromptInjectionSuite from './components/PromptInjectionSuite.jsx';
import { assessRobustness, getInjectionClasses, ENGINE_VERSION, INJECTION_CLASSES } from './engine/injection.js';
import { exportJson, SAMPLE_PROMPT, HARDENED_EXAMPLE } from './data/sample.js';

export const manifest = {
  id: 'av-06',
  name: 'Prompt Injection Test Suite',
  pillar: 'security-for-ai',
  version: ENGINE_VERSION,
  summary: 'Test a system prompt\'s robustness against known injection classes; learn the threat model and defenses.',
  tags: ['prompt-injection', 'llm-security', 'owasp-llm01', 'ai-red-team', 'defensive'],
  component: PromptInjectionSuite,
  api: { assessRobustness, getInjectionClasses, exportJson, injectionClasses: INJECTION_CLASSES, samples: { basic: SAMPLE_PROMPT, hardened: HARDENED_EXAMPLE } },
  provides: ['prompt-robustness-score', 'injection-exposure'],
  consumes: ['system-prompt'],
};
export default manifest;
