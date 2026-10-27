// Regenerates the synthetic sample exports. Run: node examples/make-samples.mjs
import { writeFileSync } from 'node:fs';
import { classifyFinding, recordAssignment } from '../src/engine/classifier.js';
import { SAMPLE_FINDING, exportBundleJson, exportBundleMarkdown, exportPrompt } from '../src/data/sample.js';

const at = '2026-10-27T00:00:00.000Z';
const r = classifyFinding({ classId: SAMPLE_FINDING.classId, flags: SAMPLE_FINDING.flags });
const a = recordAssignment(r, { assignment: 'both', owner: 'Sample owner', reason: 'Low confidence and parent scope: keep a person in the loop' }).record;
writeFileSync(new URL('./sample-export.json', import.meta.url), exportBundleJson(r, a, SAMPLE_FINDING.title, at));
writeFileSync(new URL('./sample-export.md', import.meta.url), exportBundleMarkdown(r, a, SAMPLE_FINDING.title, at));
writeFileSync(new URL('./sample-prompt.txt', import.meta.url), exportPrompt(r, a, SAMPLE_FINDING.title, at));
console.log('wrote sample-export.json, sample-export.md, sample-prompt.txt');
