import React, { useState, useCallback, useMemo } from 'react';
import { triageAlert, triageBatch, summarize, ALERT_TYPES, SIGNAL_WEIGHTS } from '../engine/triage.js';
import { SAMPLE_ALERTS, exportJson, exportCsv } from '../data/sample.js';

/**
 * ApexVector · AV-02 · Alert Triage Simulator
 * Platform-mountable React module.
 *
 * Props:
 *   onResult?  (result, summary) => void   — emits to platform data bus
 *   embedded?  boolean                     — hides standalone chrome
 */
export default function AlertTriageSimulator({ onResult, embedded = false }) {
  const [mode, setMode] = useState('single');
  const [alert, setAlert] = useState({
    title: 'PowerShell encoded command executed on finance workstation',
    alertType: 'execution',
    severity: 7,
    assetCriticality: 'high',
    userPrivilege: 'med',
    corroboration: 'med',
    anomaly: 'high',
    threatIntel: 'low',
    knownGoodContext: false,
  });
  const [result, setResult] = useState(null);
  const [batch, setBatch] = useState([]);

  const set = (k, v) => setAlert((a) => ({ ...a, [k]: v }));

  const runSingle = useCallback(() => {
    const r = triageAlert(alert);
    setResult(r);
    setBatch([]);
    onResult?.(r, null);
  }, [alert, onResult]);

  const runBatch = useCallback(() => {
    const b = triageBatch(SAMPLE_ALERTS);
    setBatch(b);
    setResult(null);
    onResult?.(b, summarize(b));
  }, [onResult]);

  const batchSummary = useMemo(() => (batch.length ? summarize(batch) : null), [batch]);

  const download = (kind) => {
    const data = batch.length ? batch : result ? [{ ...result, rank: 1 }] : [];
    if (!data.length) return;
    const content = kind === 'json' ? exportJson(data) : exportCsv(data);
    const blob = new Blob([content], { type: kind === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `apexvector-av02-triage.${kind}`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={S.root}>
      {!embedded && (
        <>
          <div style={S.termBar}>
            <span style={S.dot} /><span style={S.dot} /><span style={S.dot} />
            <span style={S.termTitle}>apexvector — alert-triage-simulator — av-02</span>
          </div>
          <header style={S.header}>
            <div style={S.eyebrow}><span style={{ color: 'var(--av-green)' }}>APEXVECTOR</span> · AV-02 · AI FOR SECURITY</div>
            <h1 style={S.h1}>Alert Triage Simulator<span style={S.cursor}>_</span></h1>
            <p style={S.tagline}>
              Structure the triage decision. Enter an alert and its context — get a false-positive
              likelihood, an escalation tier, and the specific next actions, with every signal that
              drove the call shown openly.
            </p>
            <div style={S.formula}>
              Context beats severity. A CVSS-9 alert on a low-value asset with no corroboration
              ranks below a moderate alert on a domain admin with threat-intel support.
            </div>
          </header>
        </>
      )}

      {/* Mode toggle */}
      <div style={S.modeBar}>
        <button style={{ ...S.tab, ...(mode === 'single' ? S.tabOn : {}) }} onClick={() => setMode('single')}>
          ▸ SINGLE ALERT
        </button>
        <button style={{ ...S.tab, ...(mode === 'batch' ? S.tabOn : {}) }} onClick={() => setMode('batch')}>
          ▸ BATCH / SHIFT QUEUE
        </button>
      </div>

      {mode === 'single' ? (
        <section style={S.io}>
          <div style={S.labelRow}>
            <span style={S.sectionLabel}>▸ ALERT DETAILS</span>
            <span style={S.hint}>describe the alert as it appears in your queue</span>
          </div>

          <input
            style={S.input}
            value={alert.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Alert title as it appears in your SIEM/EDR"
          />

          <div style={S.grid}>
            <Field label="ALERT TYPE">
              <select style={S.select} value={alert.alertType} onChange={(e) => set('alertType', e.target.value)}>
                {ALERT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>

            <Field label={`SEVERITY · ${alert.severity}`}>
              <input type="range" min="0" max="10" step="1" style={S.range}
                value={alert.severity} onChange={(e) => set('severity', Number(e.target.value))} />
            </Field>

            <Select label="ASSET CRITICALITY" value={alert.assetCriticality} onChange={(v) => set('assetCriticality', v)} opts={['high','med','low']} />
            <Select label="USER PRIVILEGE" value={alert.userPrivilege} onChange={(v) => set('userPrivilege', v)} opts={['high','med','low']} />
            <Select label="CORROBORATING SIGNAL" value={alert.corroboration} onChange={(v) => set('corroboration', v)} opts={['high','med','low','none']} />
            <Select label="BEHAVIOURAL ANOMALY" value={alert.anomaly} onChange={(v) => set('anomaly', v)} opts={['high','med','low']} />
            <Select label="THREAT INTEL MATCH" value={alert.threatIntel} onChange={(v) => set('threatIntel', v)} opts={['high','med','low','none']} />

            <Field label="KNOWN-GOOD CONTEXT">
              <label style={S.check}>
                <input type="checkbox" checked={alert.knownGoodContext}
                  onChange={(e) => set('knownGoodContext', e.target.checked)} />
                <span>change window / approved activity</span>
              </label>
            </Field>
          </div>

          <div style={S.controls}>
            <button style={{ ...S.btn, ...S.btnPrimary }} onClick={runSingle}>▸ TRIAGE ALERT</button>
            {result && <>
              <button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={() => download('json')}>export JSON</button>
              <button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={() => download('csv')}>export CSV</button>
            </>}
          </div>
        </section>
      ) : (
        <section style={S.io}>
          <div style={S.labelRow}>
            <span style={S.sectionLabel}>▸ SHIFT QUEUE</span>
            <span style={S.hint}>triage a representative queue of 10 alerts</span>
          </div>
          <p style={S.batchNote}>
            Runs a mixed queue — credential access, lateral movement, exfiltration, recon noise,
            policy violations — and ranks by confidence so the queue orders itself.
          </p>
          <div style={S.controls}>
            <button style={{ ...S.btn, ...S.btnPrimary }} onClick={runBatch}>▸ TRIAGE QUEUE</button>
            {batch.length > 0 && <>
              <button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={() => download('json')}>export JSON</button>
              <button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={() => download('csv')}>export CSV</button>
            </>}
          </div>
        </section>
      )}

      {/* ---- Single result ---- */}
      {result && <SingleResult r={result} />}

      {/* ---- Batch results ---- */}
      {batch.length > 0 && (
        <>
          <div style={S.resultsHeader}>
            <span style={S.count}>
              {batchSummary.count} alerts triaged · mean confidence {batchSummary.meanConfidence}% ·
              <span style={{ color: 'var(--av-red)' }}> {batchSummary.byTier.escalate} escalate</span>,
              <span style={{ color: 'var(--av-amber)' }}> {batchSummary.byTier.investigate} investigate</span>
            </span>
            <span style={S.noise}>
              noise ratio {(batchSummary.noiseRatio * 100).toFixed(0)}% — monitor or close
            </span>
          </div>
          <div style={S.queue}>
            {batch.map((a) => <BatchRow key={a.rank} a={a} />)}
          </div>
        </>
      )}

      {!embedded && (
        <footer style={S.foot}>
          <span>apexvector · av-02 · open source · free forever</span>
          <span style={{ color: 'var(--av-green-dim)' }}>github.com/DrXter/ApexVector-</span>
        </footer>
      )}

      {!embedded && (
        <p style={S.disclaimer}>
          This tool structures analyst judgment using transparent heuristics and category base rates —
          it does not replace investigation. Every signal, weight, and reason is shown so you can
          disagree with it. Tune the model to your environment before relying on it operationally.
        </p>
      )}
    </div>
  );
}

// ---------- sub-components ----------
function Field({ label, children }) {
  return (
    <div>
      <div style={S.fieldLabel}>{label}</div>
      {children}
    </div>
  );
}

function Select({ label, value, onChange, opts }) {
  return (
    <Field label={label}>
      <select style={S.select} value={value} onChange={(e) => onChange(e.target.value)}>
        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
  );
}

const TIER_COLOR = {
  escalate: '#FF4444',
  investigate: '#F5A623',
  monitor: '#00FF41',
  close: '#6A9A78',
};

function SingleResult({ r }) {
  const c = TIER_COLOR[r.tier];
  return (
    <div style={S.resultPanel}>
      <div style={S.verdictRow}>
        <div>
          <div style={{ ...S.verdict, color: c }}>{r.tierLabel}</div>
          <div style={S.sla}>{r.sla}</div>
        </div>
        <div style={S.confBox}>
          <div style={{ ...S.confNum, color: c }}>{r.score}<span style={S.pct}>%</span></div>
          <div style={S.confLabel}>TRUE-POSITIVE CONFIDENCE</div>
          <div style={S.fpLine}>false-positive likelihood {(r.fpLikelihood * 100).toFixed(0)}%</div>
        </div>
      </div>

      <div style={S.block}>
        <div style={S.blockLabel}>▸ REASONING</div>
        <p style={S.reasoning}>{r.reasoning}</p>
      </div>

      <div style={S.block}>
        <div style={S.blockLabel}>▸ TOP SIGNALS DRIVING THIS CALL</div>
        <div style={S.drivers}>
          {r.drivers.map((d) => (
            <div key={d.signal} style={S.driver}>
              <div style={S.driverName}>{d.signal.replace(/([A-Z])/g, ' $1').toLowerCase()}</div>
              <div style={S.barTrack}>
                <div style={{ ...S.barFill, width: `${d.value * 100}%`, background: c }} />
              </div>
              <div style={S.driverVal}>{(d.value * 100).toFixed(0)}%</div>
            </div>
          ))}
        </div>
      </div>

      <div style={S.block}>
        <div style={S.blockLabel}>▸ RECOMMENDED ACTIONS</div>
        <ul style={S.actions}>
          {r.actions.map((a, i) => <li key={i} style={S.action}>{a}</li>)}
        </ul>
      </div>
    </div>
  );
}

function BatchRow({ a }) {
  const c = TIER_COLOR[a.tier];
  return (
    <div style={S.row}>
      <div style={{ ...S.rank, color: a.rank === 1 ? 'var(--av-amber)' : 'var(--av-faint)' }}>
        {String(a.rank).padStart(2, '0')}
      </div>
      <div>
        <div style={S.rowTitle}>{a.title}</div>
        <div style={S.meta}>
          <span><span style={S.k}>type</span> {a.alertType}</span>
          <span><span style={S.k}>FP</span> {(a.fpLikelihood * 100).toFixed(0)}%</span>
          <span><span style={S.k}>drivers</span> {a.drivers.map((d) => d.signal).join(', ')}</span>
        </div>
        <div style={S.rowSla}>{a.sla}</div>
      </div>
      <div style={S.scoreBox}>
        <div style={{ ...S.scoreNum, color: c }}>{a.score}</div>
        <div style={S.scoreLabel}>CONFIDENCE</div>
        <span style={{ ...S.tierTag, background: `${c}22`, color: c }}>{a.tierLabel}</span>
      </div>
    </div>
  );
}

// ---------- styles ----------
const S = {
  root: { fontFamily: "'Courier New', monospace", color: 'var(--av-text, #C8E6D0)', maxWidth: 1000, margin: '0 auto' },
  termBar: { background: 'var(--av-panel, #0A140D)', border: '1px solid var(--av-border, #1A3D2A)', borderRadius: '10px 10px 0 0', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 },
  dot: { width: 11, height: 11, borderRadius: '50%', background: 'var(--av-border-bright, #2A6B3E)', opacity: 0.5 },
  termTitle: { marginLeft: 12, fontSize: 12, color: 'var(--av-text-dim, #6A9A78)', letterSpacing: 1 },
  header: { background: 'var(--av-panel, #0A140D)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none', padding: '28px 24px' },
  eyebrow: { fontSize: 11, color: 'var(--av-green-dim, #2E8B4E)', letterSpacing: 3, marginBottom: 12 },
  h1: { fontSize: 30, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', margin: 0 },
  cursor: { color: 'var(--av-green, #00FF41)' },
  tagline: { fontSize: 14, color: 'var(--av-text-dim, #6A9A78)', maxWidth: 680, marginTop: 8 },
  formula: { marginTop: 18, padding: '12px 16px', background: 'var(--av-panel-2, #0E1A12)', borderLeft: '2px solid var(--av-green, #00FF41)', borderRadius: '0 6px 6px 0', fontSize: 13, color: 'var(--av-text-dim, #6A9A78)' },

  modeBar: { display: 'flex', gap: 0, background: 'var(--av-panel, #0A140D)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none' },
  tab: { flex: 1, background: 'transparent', border: 'none', borderBottom: '2px solid transparent', color: 'var(--av-text-dim, #6A9A78)', fontFamily: "'Courier New', monospace", fontSize: 12, padding: '14px 12px', cursor: 'pointer', letterSpacing: 1 },
  tabOn: { color: 'var(--av-green, #00FF41)', borderBottom: '2px solid var(--av-green, #00FF41)', background: 'var(--av-panel-2, #0E1A12)' },

  io: { background: 'var(--av-panel, #0A140D)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none', padding: 24 },
  labelRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 },
  sectionLabel: { fontSize: 12, color: 'var(--av-green, #00FF41)', letterSpacing: 2 },
  hint: { fontSize: 11, color: 'var(--av-faint, #3A6048)' },
  input: { width: '100%', background: 'var(--av-bg, #0C0C0C)', border: '1px solid var(--av-border, #1A3D2A)', borderRadius: 6, color: 'var(--av-text, #C8E6D0)', fontFamily: "'Courier New', monospace", fontSize: 13, padding: '12px 14px', marginBottom: 18 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 },
  fieldLabel: { fontSize: 10, color: 'var(--av-faint, #3A6048)', letterSpacing: 1.5, marginBottom: 6 },
  select: { width: '100%', background: 'var(--av-bg, #0C0C0C)', border: '1px solid var(--av-border, #1A3D2A)', borderRadius: 6, color: 'var(--av-text, #C8E6D0)', fontFamily: "'Courier New', monospace", fontSize: 13, padding: '9px 10px' },
  range: { width: '100%', accentColor: '#00FF41' },
  check: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--av-text-dim, #6A9A78)', cursor: 'pointer', paddingTop: 6 },
  batchNote: { fontSize: 13, color: 'var(--av-text-dim, #6A9A78)', marginBottom: 16 },
  controls: { display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap', alignItems: 'center' },
  btn: { fontFamily: "'Courier New', monospace", fontSize: 13, padding: '11px 22px', borderRadius: 6, cursor: 'pointer', letterSpacing: 1, border: '1px solid var(--av-border-bright, #2A6B3E)' },
  btnPrimary: { background: 'var(--av-green, #00FF41)', color: '#041209', borderColor: 'var(--av-green, #00FF41)', fontWeight: 700 },
  btnGhost: { background: 'transparent', color: 'var(--av-text-dim, #6A9A78)' },
  small: { padding: '8px 14px', fontSize: 12 },

  resultPanel: { background: 'var(--av-panel, #0A140D)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: 24 },
  verdictRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, paddingBottom: 20, borderBottom: '1px solid var(--av-border, #1A3D2A)' },
  verdict: { fontSize: 32, fontWeight: 700, letterSpacing: -0.5 },
  sla: { fontSize: 13, color: 'var(--av-text-dim, #6A9A78)', marginTop: 4 },
  confBox: { textAlign: 'right' },
  confNum: { fontSize: 44, fontWeight: 700, lineHeight: 1 },
  pct: { fontSize: 22 },
  confLabel: { fontSize: 10, color: 'var(--av-faint, #3A6048)', letterSpacing: 1.5, marginTop: 4 },
  fpLine: { fontSize: 12, color: 'var(--av-text-dim, #6A9A78)', marginTop: 6 },

  block: { marginTop: 22 },
  blockLabel: { fontSize: 11, color: 'var(--av-green, #00FF41)', letterSpacing: 2, marginBottom: 10 },
  reasoning: { fontSize: 13, color: 'var(--av-text, #C8E6D0)', lineHeight: 1.7 },
  drivers: { display: 'flex', flexDirection: 'column', gap: 10 },
  driver: { display: 'grid', gridTemplateColumns: '150px 1fr 50px', gap: 12, alignItems: 'center' },
  driverName: { fontSize: 12, color: 'var(--av-text-dim, #6A9A78)' },
  barTrack: { height: 8, background: 'var(--av-bg, #0C0C0C)', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--av-border, #1A3D2A)' },
  barFill: { height: '100%', borderRadius: 4 },
  driverVal: { fontSize: 12, color: 'var(--av-text-dim, #6A9A78)', textAlign: 'right' },
  actions: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 },
  action: { fontSize: 13, color: 'var(--av-text, #C8E6D0)', paddingLeft: 18, position: 'relative', lineHeight: 1.6 },

  resultsHeader: { background: 'var(--av-panel-2, #0E1A12)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  count: { fontSize: 13, color: 'var(--av-green, #00FF41)' },
  noise: { fontSize: 12, color: 'var(--av-text-dim, #6A9A78)' },
  queue: { background: 'var(--av-panel, #0A140D)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none', borderRadius: '0 0 10px 10px' },
  row: { display: 'grid', gridTemplateColumns: '54px 1fr 140px', gap: 16, padding: '16px 20px', borderBottom: '1px solid var(--av-border, #1A3D2A)', alignItems: 'center' },
  rank: { fontSize: 24, fontWeight: 700, textAlign: 'center' },
  rowTitle: { fontSize: 14, color: '#fff', marginBottom: 6 },
  meta: { display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11, color: 'var(--av-text-dim, #6A9A78)' },
  k: { color: 'var(--av-faint, #3A6048)' },
  rowSla: { fontSize: 12, color: 'var(--av-text-dim, #6A9A78)', marginTop: 6, fontStyle: 'italic' },
  scoreBox: { textAlign: 'right' },
  scoreNum: { fontSize: 26, fontWeight: 700, lineHeight: 1 },
  scoreLabel: { fontSize: 9, color: 'var(--av-faint, #3A6048)', letterSpacing: 1, marginTop: 3 },
  tierTag: { display: 'inline-block', fontSize: 10, padding: '2px 8px', borderRadius: 3, marginTop: 6, letterSpacing: 1 },

  foot: { marginTop: 28, paddingTop: 18, borderTop: '1px solid var(--av-border, #1A3D2A)', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--av-faint, #3A6048)', flexWrap: 'wrap', gap: 10 },
  disclaimer: { marginTop: 14, fontSize: 11, color: 'var(--av-faint, #3A6048)', lineHeight: 1.7 },
};
