// Regenerates the synthetic sample exports. Run: node examples/make-samples.mjs
import { writeFileSync } from 'node:fs';
import { assessCadenceGap } from '../src/engine/cadence.js';
import { SAMPLE_GCC, exportBundleJson, exportBundleMarkdown, exportPrompt } from '../src/data/sample.js';

const at = '2026-10-22T00:00:00.000Z';
const r = assessCadenceGap(SAMPLE_GCC);
writeFileSync(new URL('./sample-export.json', import.meta.url), exportBundleJson(r, 'pending', SAMPLE_GCC.name, at));
writeFileSync(new URL('./sample-export.md', import.meta.url), exportBundleMarkdown(r, 'pending', SAMPLE_GCC.name, at));
writeFileSync(new URL('./sample-prompt.txt', import.meta.url), exportPrompt(r, 'pending', SAMPLE_GCC.name, at));
console.log('wrote sample-export.json, sample-export.md, sample-prompt.txt');
