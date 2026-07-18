/**
 * ApexVector · AV-02 · Module manifest
 */
import AlertTriageSimulator from './components/AlertTriageSimulator.jsx';
import { triageAlert, triageBatch, summarize, ENGINE_VERSION, ALERT_TYPES } from './engine/triage.js';
import { exportJson, exportCsv, SAMPLE_ALERTS } from './data/sample.js';

export const manifest = {
  id: 'av-02',
  name: 'Alert Triage Simulator',
  pillar: 'ai-for-security',
  version: ENGINE_VERSION,
  summary: 'Structure SOC alert triage — false-positive likelihood, escalation tier, and next actions.',
  tags: ['soc', 'alert-triage', 'detection', 'incident-response'],
  component: AlertTriageSimulator,
  api: { triage: triageAlert, triageBatch, summarize, exportJson, exportCsv, alertTypes: ALERT_TYPES, samples: SAMPLE_ALERTS },
  provides: ['triaged-alerts', 'triage-summary'],
  consumes: ['alerts'],
};
export default manifest;
