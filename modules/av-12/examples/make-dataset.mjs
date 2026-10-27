// Generates a synthetic training set for AV-12, one JSON record per line (JSONL).
// Every record is built by the module's own engine from randomly sampled inputs.
// Seeded, so the same seed gives the same file. Synthetic data only.
//
//   node examples/make-dataset.mjs [count=500] [seed=12] > av12-synthetic.jsonl
import { classifyFinding, recordAssignment, CLASSES, FLAGS } from '../src/engine/classifier.js';
import { toTrainingRecord } from '../src/data/sample.js';
import { exportJsonl } from '../src/export/schema.js';

const count = Number(process.argv[2] ?? 500);
const seed = Number(process.argv[3] ?? 12);

// mulberry32: small, deterministic PRNG
let a = seed >>> 0;
const rand = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (xs) => xs[Math.floor(rand() * xs.length)];
const answers = ['no', 'no', 'no', 'yes', 'unsure'];

const records = [];
for (let i = 0; i < count; i++) {
  const cls = pick(CLASSES);
  const flags = Object.fromEntries(FLAGS.map((f) => [f.id, pick(answers)]));
  const r = classifyFinding({ classId: cls.id, flags });
  // The synthetic human follows the verdict most of the time; sometimes it is a refusal-safe override.
  let assignment = null;
  const want = rand() < 0.8 ? r.verdict.toLowerCase() : pick(['both', 'human']);
  const g = recordAssignment(r, { assignment: want, owner: 'Synthetic owner', reason: 'Synthetic reason' });
  if (g.ok) assignment = g.record;
  records.push(toTrainingRecord(r, assignment, `Synthetic finding ${i + 1}: ${cls.label}`, '2026-10-27T00:00:00.000Z'));
}
process.stdout.write(exportJsonl(records));
