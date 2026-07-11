/**
 * ApexVector · AV-01 · Module manifest
 *
 * The platform's module registry reads this manifest to discover, describe,
 * and mount the module. Every ApexVector module exports a manifest of this
 * shape so the platform shell can render nav, route, and wire data flow
 * without knowing the module's internals.
 */
import VulnPriorityEngine from './components/VulnPriorityEngine.jsx';
import { scoreFindings, summarize, ENGINE_VERSION } from './engine/scoring.js';
import { parseInput, exportJson, exportCsv } from './data/parsers.js';
import { enrich } from './data/epss-feed.js';

export const manifest = {
  id: 'av-01',
  name: 'VulnPriority Engine',
  pillar: 'ai-for-security',
  version: ENGINE_VERSION,
  summary: 'Rank vulnerability findings by composite CVSS + EPSS + SSVC priority.',
  tags: ['vulnerability-management', 'prioritization', 'triage', 'appsec'],

  // The React component the platform mounts.
  component: VulnPriorityEngine,

  // Headless API the platform can call without the UI — e.g. to feed a
  // unified cross-module risk dashboard or run scoring in a pipeline.
  api: {
    parse: parseInput,
    enrich,          // async EPSS enrichment
    score: scoreFindings,
    summarize,
    exportJson,
    exportCsv,
  },

  // Declares what this module produces for the platform's shared data bus,
  // so other modules (e.g. a reporting module) can consume its output.
  provides: ['ranked-findings', 'risk-summary'],
  consumes: ['findings'],
};

export default manifest;
