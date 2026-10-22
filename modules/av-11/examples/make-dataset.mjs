// Generates a synthetic training set for AV-11, one JSON record per line (JSONL).
// Every record is built by the module's own engine from randomly sampled inputs.
// Seeded, so the same seed gives the same file. Synthetic data only.
//
//   node examples/make-dataset.mjs [count=500] [seed=11] > av11-synthetic.jsonl
import { assessCadenceGap } from '../src/engine/cadence.js';
import { toTrainingRecord } from '../src/data/sample.js';
import { exportJsonl } from '../src/export/schema.js';

const count = Number(process.argv[2] ?? 500);
const seed = Number(process.argv[3] ?? 11);

// mulberry32: small, deterministic PRNG
let a = seed >>> 0;
const rand = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (xs) => xs[Math.floor(rand() * xs.length)];

const releases = [0.5, 1, 2, 4, 6, 8, 12, 20, 30];
const shares = [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.7, 0.9];
const tests = [0, 1, 2, 4, 6, 12, 24];
const parents = [0, 1, 1, 2, 4];
const tolerances = [0.1, 0.2, 0.2, 0.3, 0.5];
const decisions = ['accepted', 'rejected', 'pending'];

const records = [];
for (let i = 0; i < count; i++) {
  const inputs = { releasesPerMonth: pick(releases), surfaceShare: pick(shares), testsPerYear: pick(tests), parentTestsPerYear: pick(parents), tolerance: pick(tolerances) };
  const r = assessCadenceGap(inputs);
  records.push(toTrainingRecord(r, pick(decisions), `Synthetic GCC platform ${i + 1}`, '2026-10-22T00:00:00.000Z'));
}
process.stdout.write(exportJsonl(records));
