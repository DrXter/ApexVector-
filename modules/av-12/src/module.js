/**
 * ApexVector · AV-12 · Module manifest
 * Season 2 · Episode 2 · AI for Security
 */
import FindingClassifier from './components/FindingClassifier.jsx';
import { classifyFinding, classifyQueue, recordAssignment, ENGINE_VERSION, CLASSES, FLAGS } from './engine/classifier.js';
import { exportBundleJson, exportBundleMarkdown, exportQueueJson, SAMPLE_FINDING, SAMPLE_QUEUE, MODULE_NAME } from './data/sample.js';

export const manifest = {
  id: 'av-12',
  name: MODULE_NAME,
  pillar: 'ai-for-security',
  season: 2,
  version: ENGINE_VERSION,
  summary: 'For each class of finding: should an AI agent hunt it, a person, or both? With a human assignment gate.',
  tags: ['pentest', 'ai-agents', 'gcc', 'triage', 'decision-gate'],
  component: FindingClassifier,
  api: { classifyFinding, classifyQueue, recordAssignment, exportBundleJson, exportBundleMarkdown, exportQueueJson, classes: CLASSES, flags: FLAGS, samples: { finding: SAMPLE_FINDING, queue: SAMPLE_QUEUE } },
  provides: ['hunter-verdict', 'hunter-assignment-decision'],
  consumes: [],
};
export default manifest;
