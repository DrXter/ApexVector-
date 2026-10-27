import React, { useState, useMemo } from 'react';
import { classifyFinding, recordAssignment, classifyQueue, CLASSES, FLAGS, THRESHOLD } from '../engine/classifier.js';
import { SAMPLE_FINDING, SAMPLE_QUEUE, exportBundleJson, exportBundleMarkdown, exportPrompt, exportTrainingJsonl, exportQueueJson } from '../data/sample.js';

const VERDICT_COLOR = { AGENT: '#00FF41', BOTH: '#F5A623', HUMAN: '#FF8C42' };
const CONF_COLOR = { HIGH: '#00FF41', MEDIUM: '#F5A623', LOW: '#FF4444' };

function download(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/**
 * ApexVector · AV-12 · Human vs Agent Finding Classifier
 * Platform-mountable React module. Props: onResult?(result) ; embedded?
 */
export default function FindingClassifier({ onResult, embedded = false }) {
  const [title, setTitle] = useState(SAMPLE_FINDING.title);
  const [classId, setClassId] = useState(SAMPLE_FINDING.classId);
  const [flags, setFlags] = useState({ ...SAMPLE_FINDING.flags });
  const [result, setResult] = useState(() => classifyFinding({ classId: SAMPLE_FINDING.classId, flags: SAMPLE_FINDING.flags }));
  const [assignment, setAssignment] = useState(null);
  const [owner, setOwner] = useState('');
  const [reason, setReason] = useState('');
  const [choice, setChoice] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const reset = (c, f) => {
    const r = classifyFinding({ classId: c, flags: f });
    setResult(r); setAssignment(null); setError(''); setChoice(''); setReason('');
    if (r.ok) onResult?.(r);
  };
  const changeClass = (c) => { setClassId(c); reset(c, flags); };
  const changeFlag = (id, v) => { const f = { ...flags, [id]: v }; setFlags(f); reset(classId, f); };
  const loadSample = () => { setTitle(SAMPLE_FINDING.title); setClassId(SAMPLE_FINDING.classId); setFlags({ ...SAMPLE_FINDING.flags }); setOwner(''); reset(SAMPLE_FINDING.classId, SAMPLE_FINDING.flags); };

  const record = () => {
    const g = recordAssignment(result, { assignment: choice, owner, reason });
    if (!g.ok) { setError(g.error); return; }
    setError(''); setAssignment(g.record);
  };

  const queue = useMemo(() => classifyQueue(SAMPLE_QUEUE), []);

  return (
    <div style={S.root}>
      {!embedded && (
        <>
          <div style={S.termBar}>
            <span style={S.dot} /><span style={S.dot} /><span style={S.dot} />
            <span style={S.termTitle}>apexvector — finding-classifier — av-12</span>
          </div>
          <header style={S.header}>
            <div style={S.eyebrow}><span style={{ color: 'var(--av-red)' }}>APEXVECTOR</span> · SEASON 2 · EPISODE 2 · AV-12 · AI-LED PENTEST FOR GCCs</div>
            <h1 style={S.h1}>Human vs Agent Finding Classifier<span style={S.cursor}>_</span></h1>
            <p style={S.tagline}>
              An AI agent can top a bug bounty leaderboard and still miss the finding that matters most to your business.
              Pick a class of finding, say what is true about it, and see who should hunt it: an agent, a person, or both.
              Then a person signs the assignment.
            </p>
          </header>
        </>
      )}

      <section style={S.io}>
        <div style={S.labelRow}>
          <span style={S.sectionLabel}>▸ THE FINDING</span>
          <span style={S.hint}>defaults are a synthetic GCC finding — replace with yours</span>
        </div>
        <input style={S.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Finding title" aria-label="Finding title" />
        <select style={S.select} value={classId} onChange={(e) => changeClass(e.target.value)} aria-label="Vulnerability class">
          {CLASSES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <div style={{ ...S.labelRow, marginTop: 18 }}>
          <span style={S.sectionLabel}>▸ WHAT IS TRUE ABOUT IT</span>
          <span style={S.hint}>unsure counts as half a yes and lowers confidence</span>
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {FLAGS.map((f) => (
            <div key={f.id} style={S.flagRow}>
              <span style={{ fontSize: 13 }}>{f.label}</span>
              <span style={S.seg} role="group" aria-label={f.label}>
                {['yes', 'unsure', 'no'].map((v) => (
                  <button key={v} style={{ ...S.segBtn, ...(flags[f.id] === v ? S.segOn : {}) }} onClick={() => changeFlag(f.id, v)} aria-pressed={flags[f.id] === v}>{v}</button>
                ))}
              </span>
            </div>
          ))}
        </div>
        <div style={S.controls}>
          <button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={loadSample}>sample finding</button>
        </div>
      </section>

      {result.ok && (
        <Result r={result} title={title} assignment={assignment} choice={choice} setChoice={setChoice}
          owner={owner} setOwner={setOwner} reason={reason} setReason={setReason} error={error} record={record}
          undo={() => { setAssignment(null); setError(''); }} copied={copied}
          onCopy={async () => {
            try { await navigator.clipboard.writeText(exportPrompt(result, assignment, title)); setCopied('copied. paste it into your local model'); }
            catch { setCopied('copy blocked by the browser: use export Markdown instead'); }
          }}
          onJson={() => download(exportBundleJson(result, assignment, title), 'apexvector-av12-finding.json', 'application/json')}
          onMd={() => download(exportBundleMarkdown(result, assignment, title), 'apexvector-av12-finding.md', 'text/markdown')}
          onTrain={() => download(exportTrainingJsonl(result, assignment, title), 'apexvector-av12-training-record.jsonl', 'application/x-ndjson')} />
      )}

      <section style={{ ...S.resultPanel, marginTop: 20, border: '1px solid var(--av-border, #1A3D2A)' }}>
        <div style={S.labelRow}>
          <span style={S.sectionLabel}>▸ THE QUEUE · SYNTHETIC BACKLOG OF SIX</span>
          <button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={() => download(exportQueueJson(SAMPLE_QUEUE), 'apexvector-av12-queue.json', 'application/json')}>export queue JSON</button>
        </div>
        <div style={S.legend}>
          <span>agent {queue.summary.agent}</span><span>both {queue.summary.both}</span><span>human {queue.summary.human}</span>
          <span>low confidence {queue.summary.lowConfidence}</span><span>boundary gate {queue.summary.boundary}</span>
        </div>
        <div style={{ overflowX: 'auto', marginTop: 10 }}>
          <table style={S.table}>
            <thead><tr><th style={S.th}>ID</th><th style={S.th}>Finding</th><th style={S.th}>Verdict</th><th style={S.th}>Confidence</th><th style={S.th}>Lean</th></tr></thead>
            <tbody>
              {queue.rows.map((q) => (
                <tr key={q.id}>
                  <td style={S.td}>{q.id}</td><td style={S.td}>{q.title}</td>
                  <td style={{ ...S.td, color: VERDICT_COLOR[q.result.verdict], fontWeight: 700 }}>{q.result.verdict}</td>
                  <td style={{ ...S.td, color: CONF_COLOR[q.result.confidence] }}>{q.result.confidence}</td>
                  <td style={S.td}>{q.result.lean > 0 ? '+' : ''}{q.result.lean}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {!embedded && (
        <>
          <section style={S.notBox}>
            <div style={S.blockLabel}>▸ WHAT THIS TOOL IS NOT</div>
            <p style={S.notText}>
              The scores are ApexVector's own defaults, set to make the reasoning visible. They are not measured agent
              performance and not a benchmark. The tool sees a class and your answers, not the finding itself, and it says
              nothing about severity or whether a finding exists. Agents change fast: re-check the base scores each quarter.
              Runs entirely in your browser; nothing is sent anywhere.
            </p>
          </section>
          <footer style={S.foot}>
            <span>apexvector · av-12 · season 2 · open source</span>
            <span style={{ color: 'var(--av-green-dim)' }}>github.com/DrXter/ApexVector-</span>
          </footer>
        </>
      )}
    </div>
  );
}

function ScoreBar({ label, value, color }) {
  return (
    <div style={S.scoreBarWrap}>
      <span style={S.scoreBarLabel}>{label}</span>
      <div style={S.scoreTrack}><div style={{ width: `${value}%`, height: '100%', background: color }} /></div>
      <span style={S.scoreNum}>{value}</span>
    </div>
  );
}

function Result({ r, title, assignment, choice, setChoice, owner, setOwner, reason, setReason, error, record, undo, onJson, onMd, onTrain, onCopy, copied }) {
  const c = VERDICT_COLOR[r.verdict];
  const needsReason = choice && (choice !== r.verdict.toLowerCase() || r.confidence === 'LOW');
  return (
    <div style={S.resultPanel}>
      <div style={S.verdictRow}>
        <div>
          <div style={{ ...S.verdict, color: c }}>{r.verdict === 'AGENT' ? 'AGENT LEADS' : r.verdict === 'HUMAN' ? 'PERSON LEADS' : 'AGENT AND PERSON'}</div>
          <div style={S.note}>{title || 'This finding'} — {r.label}</div>
        </div>
        <div style={S.scoreCol}>
          <div style={{ ...S.scoreBig, color: CONF_COLOR[r.confidence] }}>{r.confidence}</div>
          <div style={S.scoreLabel}>CONFIDENCE</div>
        </div>
      </div>

      <div style={S.block}>
        <div style={S.blockLabel}>▸ THE SCORES, SHOWN</div>
        <ScoreBar label="agent" value={r.agentScore} color="#00FF41" />
        <ScoreBar label="person" value={r.humanScore} color="#FF8C42" />
        <Step k="Base for this class (agent / person)" v={`${r.base.agent} / ${r.base.human}`} />
        {r.steps.map((s) => <Step key={s.flag} k={`${FLAGS.find((f) => f.id === s.flag).label}: ${s.answer}`} v={`agent ${s.agent >= 0 ? '+' : ''}${s.agent}, person ${s.human >= 0 ? '+' : ''}${s.human}`} />)}
        <Step k="Lean (agent − person)" v={`${r.lean > 0 ? '+' : ''}${r.lean}   (agent ≥ +${THRESHOLD}, person ≤ −${THRESHOLD})`} strong />
        <Step k="Confidence" v={`margin ${r.margin} − ${r.unsureCount} unsure × 5 = ${r.confidenceScore}`} />
      </div>

      {(r.gates.length > 0 || r.ruleVerdict !== r.verdict) && (
        <div style={S.block}>
          <div style={S.blockLabel}>▸ GATES FIRED</div>
          {r.gates.map((g) => <span key={g.id} style={S.gateTag}>{g.label}{g.fired === 'unsure' ? ' (unsure)' : ''}</span>)}
          {r.ruleVerdict !== r.verdict && <p style={S.para}>The scores alone say {r.ruleVerdict}. Because the parent’s systems, the parent’s IP or real data is involved, a person stays in the loop: {r.verdict}.</p>}
        </div>
      )}

      <div style={{ ...S.block, ...S.gate }}>
        <div style={S.blockLabel}>▸ HUMAN GATE · WHO HUNTS THIS?</div>
        {assignment ? (
          <>
            <p style={S.statement}>Assigned to <b>{assignment.assignment.toUpperCase()}</b> by {assignment.owner}. {assignment.overridden ? `Overrode the ${assignment.verdict} verdict` : 'Followed the verdict'}{assignment.reason ? `: ${assignment.reason}` : '.'}</p>
            <div style={S.controls}><button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={undo}>undo</button></div>
          </>
        ) : (
          <>
            <p style={S.statement}>The tool advises. A named person assigns. Following the verdict is quick; overriding it, or any LOW-confidence call, needs a written reason. Agent-only is blocked while parent scope, parent IP or real data is in play.</p>
            <div style={S.controls}>
              {['agent', 'both', 'human'].map((a) => (
                <button key={a} style={{ ...S.btn, ...(choice === a ? S.btnAccepted : S.btnGhost) }} onClick={() => setChoice(a)}>{a === 'human' ? 'PERSON' : a.toUpperCase()}</button>
              ))}
            </div>
            <input style={{ ...S.input, marginTop: 14, marginBottom: 8 }} value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Owner of this decision (a named person)" aria-label="Owner" />
            {needsReason && <input style={{ ...S.input, marginBottom: 8 }} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required for an override or LOW confidence)" aria-label="Reason" />}
            <div style={S.controls}><button style={{ ...S.btn, ...S.btnPrimary }} disabled={!choice} onClick={record}>▸ RECORD ASSIGNMENT</button></div>
            {error && <div style={S.errLine}>▲ {error}</div>}
            <div style={S.decisionLine}>Decision: pending. The tool does not decide; a person does.</div>
          </>
        )}
      </div>

      <div style={S.controls}>
        <button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={onJson}>export JSON</button>
        <button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={onMd}>export Markdown for your LLM</button>
        <button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={onTrain}>export training record (JSONL)</button>
        <button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={onCopy}>copy as prompt for your local LLM</button>
        <span style={S.hint}>{copied || 'generated in your browser, includes the decision above. nothing is sent anywhere'}</span>
      </div>
    </div>
  );
}

function Step({ k, v, strong }) {
  return (
    <div style={{ ...S.stepRow, ...(strong ? S.stepStrong : {}) }}>
      <span style={S.stepK}>{k}</span>
      <span style={S.stepV}>{v}</span>
    </div>
  );
}

const S = {
  root: { fontFamily: "'Courier New', monospace", color: 'var(--av-text, #C8E6D0)', maxWidth: 1000, margin: '0 auto' },
  termBar: { background: 'var(--av-panel, #0A140D)', border: '1px solid var(--av-border, #1A3D2A)', borderRadius: '10px 10px 0 0', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 },
  dot: { width: 11, height: 11, borderRadius: '50%', background: 'var(--av-border-bright, #2A6B3E)', opacity: 0.5 },
  termTitle: { marginLeft: 12, fontSize: 12, color: 'var(--av-text-dim, #6A9A78)', letterSpacing: 1 },
  header: { background: 'var(--av-panel, #0A140D)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none', padding: '28px 24px' },
  eyebrow: { fontSize: 11, color: 'var(--av-green-dim, #2E8B4E)', letterSpacing: 3, marginBottom: 12 },
  h1: { fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', margin: 0 },
  cursor: { color: 'var(--av-red, #FF4444)' },
  tagline: { fontSize: 14, color: 'var(--av-text-dim, #6A9A78)', maxWidth: 740, marginTop: 8, lineHeight: 1.6 },

  io: { background: 'var(--av-panel, #0A140D)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none', padding: 24 },
  labelRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 },
  sectionLabel: { fontSize: 12, color: 'var(--av-green, #00FF41)', letterSpacing: 2 },
  hint: { fontSize: 11, color: 'var(--av-faint, #3A6048)' },
  input: { width: '100%', background: 'var(--av-bg, #0C0C0C)', border: '1px solid var(--av-border, #1A3D2A)', borderRadius: 6, color: 'var(--av-text, #C8E6D0)', fontFamily: "'Courier New', monospace", fontSize: 13, padding: '12px 14px', marginBottom: 16 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 14px', background: 'var(--av-bg, #0C0C0C)', border: '1px solid var(--av-border, #1A3D2A)', borderRadius: 6 },
  fieldLabel: { fontSize: 12, color: 'var(--av-text, #C8E6D0)' },
  fieldHint: { fontSize: 10, color: 'var(--av-faint, #3A6048)' },
  numInput: { background: 'transparent', border: '1px solid var(--av-border, #1A3D2A)', borderRadius: 5, color: '#fff', fontFamily: "'Courier New', monospace", fontSize: 16, padding: '8px 10px' },
  controls: { display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap', alignItems: 'center' },
  btn: { fontFamily: "'Courier New', monospace", fontSize: 13, padding: '11px 22px', borderRadius: 6, cursor: 'pointer', letterSpacing: 1, border: '1px solid var(--av-border-bright, #2A6B3E)' },
  btnPrimary: { background: 'var(--av-green, #00FF41)', color: '#041209', borderColor: 'var(--av-green, #00FF41)', fontWeight: 700 },
  btnGhost: { background: 'transparent', color: 'var(--av-text-dim, #6A9A78)' },
  btnAccepted: { background: '#F5A62326', color: '#F5A623', borderColor: '#F5A623', fontWeight: 700 },
  btnRejected: { background: '#00FF4122', color: '#00FF41', borderColor: '#00FF41', fontWeight: 700 },
  small: { padding: '8px 14px', fontSize: 12 },

  errPanel: { background: 'var(--av-panel, #0A140D)', border: '1px solid #FF4444', borderTop: 'none', padding: 18 },
  errRow: { color: '#FF8C42', fontSize: 13, padding: '4px 0' },

  resultPanel: { background: 'var(--av-panel, #0A140D)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none', padding: 24 },
  verdictRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, paddingBottom: 20, borderBottom: '1px solid var(--av-border, #1A3D2A)' },
  verdict: { fontSize: 26, fontWeight: 700, letterSpacing: -0.5 },
  note: { fontSize: 13, color: 'var(--av-text-dim, #6A9A78)', marginTop: 4, fontStyle: 'italic', maxWidth: 560, lineHeight: 1.5 },
  scoreCol: { textAlign: 'right' },
  scoreBig: { fontSize: 40, fontWeight: 700, lineHeight: 1 },
  pct: { fontSize: 18, color: 'var(--av-faint, #3A6048)' },
  scoreLabel: { fontSize: 10, color: 'var(--av-faint, #3A6048)', letterSpacing: 1.5, marginTop: 4 },
  block: { marginTop: 24 },
  blockLabel: { fontSize: 11, color: 'var(--av-green, #00FF41)', letterSpacing: 2, marginBottom: 12 },
  legend: { display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 11, color: 'var(--av-text-dim, #6A9A78)', marginTop: 8 },
  sw: { display: 'inline-block', width: 10, height: 10, marginRight: 6, verticalAlign: 'middle' },
  bar: { height: 14, background: '#1b0d0d', border: '1px solid #3a1a1a', marginTop: 14, borderRadius: 3, overflow: 'hidden' },
  barCovered: { height: '100%', background: '#00FF4199' },
  barLabels: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--av-text-dim, #6A9A78)', marginTop: 6, flexWrap: 'wrap', gap: 8 },
  stepRow: { display: 'flex', justifyContent: 'space-between', gap: 16, padding: '9px 0', borderBottom: '1px solid var(--av-border, #1A3D2A)', fontSize: 13, flexWrap: 'wrap' },
  stepStrong: { color: '#fff', fontWeight: 700 },
  stepK: { color: 'var(--av-text-dim, #6A9A78)' },
  stepV: { color: 'var(--av-text, #C8E6D0)', textAlign: 'right' },
  para: { fontSize: 13, color: 'var(--av-text, #C8E6D0)', lineHeight: 1.7, margin: 0 },
  tierRow: { display: 'flex', gap: 18, alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 8 },
  tier: { fontSize: 20, fontWeight: 700 },
  gate: { border: '1px dashed var(--av-border-bright, #2A6B3E)', padding: 18, background: 'var(--av-panel-2, #0E1A12)' },
  statement: { fontSize: 14, color: '#fff', lineHeight: 1.7, margin: 0 },
  decisionLine: { fontSize: 12, color: 'var(--av-text-dim, #6A9A78)', marginTop: 12 },

  notBox: { marginTop: 20, padding: '16px 20px', border: '1px solid var(--av-border, #1A3D2A)', background: 'var(--av-panel, #0A140D)' },
  notText: { fontSize: 11, color: 'var(--av-text-dim, #6A9A78)', lineHeight: 1.8, margin: 0 },
  foot: { marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--av-border, #1A3D2A)', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--av-faint, #3A6048)', flexWrap: 'wrap', gap: 10 },
  select: { width: '100%', background: 'var(--av-bg, #0C0C0C)', border: '1px solid var(--av-border, #1A3D2A)', borderRadius: 6, color: 'var(--av-text, #C8E6D0)', fontFamily: "'Courier New', monospace", fontSize: 13, padding: '12px 14px' },
  flagRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '10px 14px', background: 'var(--av-bg, #0C0C0C)', border: '1px solid var(--av-border, #1A3D2A)', borderRadius: 6 },
  seg: { display: 'inline-flex', border: '1px solid var(--av-border-bright, #2A6B3E)', borderRadius: 6, overflow: 'hidden' },
  segBtn: { fontFamily: "'Courier New', monospace", fontSize: 12, padding: '6px 14px', background: 'transparent', color: 'var(--av-text-dim, #6A9A78)', border: 'none', cursor: 'pointer' },
  segOn: { background: 'var(--av-green, #00FF41)', color: '#041209', fontWeight: 700 },
  scoreBarWrap: { display: 'flex', alignItems: 'center', gap: 12, margin: '6px 0', fontSize: 12 },
  scoreBarLabel: { width: 60, color: 'var(--av-text-dim, #6A9A78)' },
  scoreTrack: { flex: 1, height: 12, background: '#101a13', border: '1px solid var(--av-border, #1A3D2A)', borderRadius: 3, overflow: 'hidden' },
  scoreNum: { width: 44, textAlign: 'right', color: '#fff' },
  gateTag: { display: 'inline-block', fontSize: 11, padding: '4px 10px', border: '1px solid #F5A623', color: '#F5A623', borderRadius: 4, marginRight: 8, marginBottom: 6 },
  errLine: { fontSize: 12, color: '#FF8C42', marginTop: 10 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { textAlign: 'left', color: 'var(--av-text-dim, #6A9A78)', fontWeight: 400, padding: '8px 6px', borderBottom: '1px solid var(--av-border, #1A3D2A)' },
  td: { padding: '8px 6px', borderBottom: '1px solid var(--av-border, #1A3D2A)', verticalAlign: 'top' },
};
