import assert from 'node:assert/strict';
import { classifyFinding, recordAssignment, classifyQueue, CLASSES, FLAGS, THRESHOLD } from './classifier.js';

let n = 0;
const t = (name, fn) => { fn(); n++; };
const cf = (classId, flags, extra) => classifyFinding({ classId, flags, ...extra });

t('every class has scores in 0..100 and a unique id', () => {
  assert.equal(new Set(CLASSES.map((c) => c.id)).size, CLASSES.length);
  assert.equal(CLASSES.length, 20);
  for (const c of CLASSES) { assert.ok(c.agent >= 0 && c.agent <= 100 && c.human >= 0 && c.human <= 100); }
});
t('XSS with defaults leans agent: 85/20 -> AGENT, HIGH', () => {
  const r = cf('xss');
  assert.equal(r.agentScore, 85); assert.equal(r.humanScore, 20); assert.equal(r.lean, 65);
  assert.equal(r.verdict, 'AGENT'); assert.equal(r.confidence, 'HIGH'); assert.equal(r.margin, 40);
});
t('business logic leans human', () => {
  const r = cf('logic');
  assert.equal(r.verdict, 'HUMAN'); assert.equal(r.lean, -70);
});
t('IDOR 60/55 is BOTH, HIGH confidence (margin 20)', () => {
  const r = cf('idor');
  assert.equal(r.lean, 5); assert.equal(r.verdict, 'BOTH'); assert.equal(r.margin, 20); assert.equal(r.confidence, 'HIGH');
});
t('exactly at the threshold counts as AGENT and HUMAN', () => {
  assert.equal(cf('xss', {}, { baseOverride: { agent: 50, human: 25 } }).verdict, 'AGENT');
  assert.equal(cf('xss', {}, { baseOverride: { agent: 25, human: 50 } }).verdict, 'HUMAN');
  assert.equal(cf('xss', {}, { baseOverride: { agent: 49, human: 25 } }).verdict, 'BOTH');
});
t('yes applies full delta, unsure half, no none', () => {
  const y = cf('xss', { chained: 'yes' }); const u = cf('xss', { chained: 'unsure' }); const no = cf('xss', { chained: 'no' });
  assert.equal(y.agentScore, 60); assert.equal(y.humanScore, 40);
  assert.equal(u.agentScore, 72.5); assert.equal(u.humanScore, 30);
  assert.equal(no.agentScore, 85);
});
t('scores clamp to 0..100', () => {
  const r = cf('outdated', { verifiable: 'yes', breadth: 'yes' });
  assert.equal(r.agentScore, 100); assert.equal(r.humanScore, 0);
  const low = cf('novel', { chained: 'yes', businessContext: 'yes', novel: 'yes' });
  assert.equal(low.agentScore, 0); assert.equal(low.humanScore, 100);
});
t('chaining flips an agent class towards human', () => {
  const r = cf('xss', { chained: 'yes', businessContext: 'yes' });
  assert.equal(r.agentScore, 35); assert.equal(r.humanScore, 65); assert.equal(r.verdict, 'HUMAN');
});
t('unsure lowers confidence by 5 each', () => {
  const a = cf('xss', { chained: 'unsure' });
  const b = cf('xss', { chained: 'unsure', verifiable: 'unsure' });
  assert.equal(b.unsureCount, 2);
  assert.equal(a.confidenceScore - b.confidenceScore, 5 + (a.margin - b.margin));
});
t('LOW confidence fires low-confidence gate', () => {
  const r = cf('idor', {}, { baseOverride: { agent: 60, human: 33 } }); // lean 27, margin 2
  assert.equal(r.confidence, 'LOW'); assert.ok(r.gates.some((g) => g.id === 'low-confidence'));
});
t('parent boundary turns AGENT into BOTH', () => {
  const r = cf('xss', { parentSystems: 'yes' });
  assert.equal(r.ruleVerdict, 'AGENT'); assert.equal(r.verdict, 'BOTH');
  assert.ok(r.gates.some((g) => g.id === 'parent-scope'));
  assert.ok(r.reasons.some((x) => x.startsWith('Boundary rule')));
});
t('unsure on a boundary flag also turns AGENT into BOTH', () => {
  assert.equal(cf('xss', { realData: 'unsure' }).verdict, 'BOTH');
  assert.equal(cf('xss', { parentIp: 'unsure' }).verdict, 'BOTH');
});
t('boundary never changes a HUMAN verdict', () => {
  assert.equal(cf('logic', { parentSystems: 'yes' }).verdict, 'HUMAN');
});
t('boundary flags do not change scores', () => {
  const a = cf('xss'); const b = cf('xss', { parentSystems: 'yes', parentIp: 'yes', realData: 'yes' });
  assert.equal(a.agentScore, b.agentScore); assert.equal(a.humanScore, b.humanScore);
});
t('input validation', () => {
  assert.equal(cf('nope').ok, false);
  assert.equal(cf('xss', { bogus: 'yes' }).ok, false);
  assert.equal(cf('xss', { chained: 'maybe' }).ok, false);
  assert.equal(cf('xss', {}, { baseOverride: { agent: 120 } }).ok, false);
  assert.equal(cf('xss', {}, { baseOverride: { human: -1 } }).ok, false);
});
t('baseOverride changes the base', () => {
  const r = cf('xss', {}, { baseOverride: { agent: 40, human: 40 } });
  assert.equal(r.verdict, 'BOTH'); assert.equal(r.base.agent, 40);
});
t('deterministic', () => {
  assert.deepEqual(cf('sso', { chained: 'unsure' }), cf('sso', { chained: 'unsure' }));
});
t('result carries assumptions and limits', () => {
  const r = cf('xss'); assert.ok(r.assumptions.length >= 3); assert.ok(r.limits.length >= 4);
});
t('threshold constant', () => assert.equal(THRESHOLD, 25));
t('flags list: 5 scoring, 3 boundary', () => {
  assert.equal(FLAGS.filter((f) => f.scores).length, 5); assert.equal(FLAGS.filter((f) => !f.scores).length, 3);
});

// decision gate
t('gate: needs a classified result', () => assert.equal(recordAssignment(null, {}).ok, false));
t('gate: invalid assignment refused', () => assert.equal(recordAssignment(cf('xss'), { assignment: 'robot', owner: 'A' }).ok, false));
t('gate: owner required', () => assert.equal(recordAssignment(cf('xss'), { assignment: 'agent', owner: ' ' }).ok, false));
t('gate: following the verdict needs no reason', () => {
  const g = recordAssignment(cf('xss'), { assignment: 'agent', owner: 'Priya' });
  assert.equal(g.ok, true); assert.equal(g.record.overridden, false); assert.equal(g.record.gate, 'hunter-assignment');
});
t('gate: override needs a reason', () => {
  const r = cf('xss');
  assert.equal(recordAssignment(r, { assignment: 'both', owner: 'Priya' }).ok, false);
  const g = recordAssignment(r, { assignment: 'both', owner: 'Priya', reason: 'Customer-facing release' });
  assert.equal(g.ok, true); assert.equal(g.record.overridden, true);
});
t('gate: LOW confidence needs a reason even when following', () => {
  const r = cf('idor', {}, { baseOverride: { agent: 60, human: 33 } });
  assert.equal(recordAssignment(r, { assignment: r.verdict.toLowerCase(), owner: 'P' }).ok, false);
  assert.equal(recordAssignment(r, { assignment: r.verdict.toLowerCase(), owner: 'P', reason: 'Reviewed' }).ok, true);
});
t('gate: agent-only refused with production data or parent scope', () => {
  const r = cf('xss', { realData: 'yes' });
  const g = recordAssignment(r, { assignment: 'agent', owner: 'P', reason: 'Fast' });
  assert.equal(g.ok, false); assert.match(g.error, /Agent-only/);
  assert.equal(recordAssignment(r, { assignment: 'both', owner: 'P' }).ok, true);
});
t('gate: choosing human over agent verdict is an override', () => {
  const g = recordAssignment(cf('xss'), { assignment: 'human', owner: 'P', reason: 'Policy' });
  assert.equal(g.ok, true); assert.equal(g.record.overridden, true);
});

// queue
t('queue: counts and ids', () => {
  const q = classifyQueue([
    { title: 'a', classId: 'xss' }, { title: 'b', classId: 'logic' },
    { title: 'c', classId: 'idor' }, { title: 'd', classId: 'xss', flags: { parentSystems: 'yes' } },
    { title: 'e', classId: 'nope' },
  ]);
  assert.equal(q.summary.total, 5); assert.equal(q.summary.invalid, 1);
  assert.equal(q.summary.agent, 1); assert.equal(q.summary.human, 1); assert.equal(q.summary.both, 2);
  assert.equal(q.summary.boundary, 1); assert.equal(q.rows[0].id, 'F-01');
});
t('queue: empty', () => assert.equal(classifyQueue().summary.total, 0));

console.log(`AV-12 engine: ${n} tests passed`);
