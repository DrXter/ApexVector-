import React, { useState, useCallback, useMemo } from 'react';
import { translate, translateRegister, summarize, FINDING_CATEGORIES, ORG_SIZE } from '../engine/translate.js';
import { SAMPLE_FINDINGS, exportJson, exportCsv } from '../data/sample.js';

/**
 * ApexVector · AV-03 · Risk Translator
 * Platform-mountable React module.
 *
 * Props:
 *   onResult?  (result, summary) => void
 *   embedded?  boolean
 */
export default function RiskTranslator({ onResult, embedded = false }) {
  const [mode, setMode] = useState('single');
  const [financial, setFinancial] = useState(true);
  const [orgSize, setOrgSize] = useState('enterprise');

  const [finding, setFinding] = useState({
    title: 'Public cloud storage bucket exposing customer records',
    category: 'data-exposure',
    cvss: 9.1,
    exploitability: 'high',
    dataVolume: 'high',
  });
  const [result, setResult] = useState(null);
  const [register, setRegister] = useState([]);

  const set = (k, v) => setFinding((f) => ({ ...f, [k]: v }));
  const opts = useMemo(() => ({ financial, orgSize }), [financial, orgSize]);

  const runSingle = useCallback(() => {
    const r = translate(finding, opts);
    setResult(r); setRegister([]);
    onResult?.(r, null);
  }, [finding, opts, onResult]);

  const runRegister = useCallback(() => {
    const reg = translateRegister(SAMPLE_FINDINGS, opts);
    setRegister(reg); setResult(null);
    onResult?.(reg, summarize(reg));
  }, [opts, onResult]);

  const regSummary = useMemo(() => (register.length ? summarize(register) : null), [register]);

  const download = (kind) => {
    const data = register.length ? register : result ? [{ ...result, rank: 1 }] : [];
    if (!data.length) return;
    const content = kind === 'json' ? exportJson(data, regSummary) : exportCsv(data);
    const blob = new Blob([content], { type: kind === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `apexvector-av03-risk.${kind}`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={S.root}>
      {!embedded && (
        <>
          <div style={S.termBar}>
            <span style={S.dot} /><span style={S.dot} /><span style={S.dot} />
            <span style={S.termTitle}>apexvector — risk-translator — av-03</span>
          </div>
          <header style={S.header}>
            <div style={S.eyebrow}><span style={{ color: 'var(--av-green)' }}>APEXVECTOR</span> · AV-03 · AI FOR SECURITY</div>
            <h1 style={S.h1}>Risk Translator<span style={S.cursor}>_</span></h1>
            <p style={S.tagline}>
              Turn a technical finding into the language a board actually hears — the business
              consequence, a risk rating, and an optional financial exposure range. Because
              "CVSS 9.8" means nothing in a boardroom, but "$4M regulatory exposure" ends the debate.
            </p>
          </header>
        </>
      )}

      {/* Global controls */}
      <div style={S.globalBar}>
        <label style={S.toggle}>
          <input type="checkbox" checked={financial} onChange={(e) => setFinancial(e.target.checked)} />
          <span>financial exposure estimate</span>
        </label>
        {financial && (
          <label style={S.orgSelect}>
            <span style={S.orgLabel}>org size</span>
            <select style={S.selectSm} value={orgSize} onChange={(e) => setOrgSize(e.target.value)}>
              {Object.entries(ORG_SIZE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
        )}
      </div>

      {/* Mode toggle */}
      <div style={S.modeBar}>
        <button style={{ ...S.tab, ...(mode === 'single' ? S.tabOn : {}) }} onClick={() => setMode('single')}>▸ SINGLE FINDING</button>
        <button style={{ ...S.tab, ...(mode === 'register' ? S.tabOn : {}) }} onClick={() => setMode('register')}>▸ BOARD RISK REGISTER</button>
      </div>

      {mode === 'single' ? (
        <section style={S.io}>
          <div style={S.labelRow}>
            <span style={S.sectionLabel}>▸ TECHNICAL FINDING</span>
            <span style={S.hint}>describe it as it appears in your pentest / scan report</span>
          </div>
          <input style={S.input} value={finding.title} onChange={(e) => set('title', e.target.value)}
            placeholder="Finding title from your technical report" />
          <div style={S.grid}>
            <Field label="BUSINESS CATEGORY">
              <select style={S.select} value={finding.category} onChange={(e) => set('category', e.target.value)}>
                {FINDING_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/-/g, ' ')}</option>)}
              </select>
            </Field>
            <Field label={`TECHNICAL SEVERITY (CVSS) · ${finding.cvss}`}>
              <input type="range" min="0" max="10" step="0.1" style={S.range}
                value={finding.cvss} onChange={(e) => set('cvss', Number(e.target.value))} />
            </Field>
            <Select label="EXPLOITABILITY" value={finding.exploitability} onChange={(v) => set('exploitability', v)} opts={['high','med','low']} />
            <Select label="DATA / SCOPE IN PLAY" value={finding.dataVolume} onChange={(v) => set('dataVolume', v)} opts={['high','med','low']} />
          </div>
          <div style={S.controls}>
            <button style={{ ...S.btn, ...S.btnPrimary }} onClick={runSingle}>▸ TRANSLATE</button>
            {result && <>
              <button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={() => download('json')}>export JSON</button>
              <button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={() => download('csv')}>export CSV</button>
            </>}
          </div>
        </section>
      ) : (
        <section style={S.io}>
          <div style={S.labelRow}>
            <span style={S.sectionLabel}>▸ RISK REGISTER</span>
            <span style={S.hint}>translate a portfolio of findings into a board-ready table</span>
          </div>
          <p style={S.batchNote}>
            Runs a representative set of findings — data exposure, ransomware path, account takeover,
            fraud, supply chain — and produces a ranked register with business consequences
            {financial ? ' and aggregate financial exposure' : ''}.
          </p>
          <div style={S.controls}>
            <button style={{ ...S.btn, ...S.btnPrimary }} onClick={runRegister}>▸ BUILD REGISTER</button>
            {register.length > 0 && <>
              <button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={() => download('json')}>export JSON</button>
              <button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={() => download('csv')}>export CSV</button>
            </>}
          </div>
        </section>
      )}

      {result && <SingleResult r={result} />}

      {register.length > 0 && (
        <>
          <div style={S.resultsHeader}>
            <span style={S.count}>
              {regSummary.count} findings translated ·
              <span style={{ color: 'var(--av-red)' }}> {regSummary.byRating.severe} severe</span>,
              <span style={{ color: 'var(--av-amber)' }}> {regSummary.byRating.elevated} elevated</span>
            </span>
            {regSummary.aggregateExposure && (
              <span style={S.aggregate}>aggregate exposure ~{regSummary.aggregateExposure}</span>
            )}
          </div>
          <div style={S.queue}>
            {register.map((r) => <RegisterRow key={r.rank} r={r} />)}
          </div>
        </>
      )}

      {!embedded && (
        <footer style={S.foot}>
          <span>apexvector · av-03 · open source · free forever</span>
          <span style={{ color: 'var(--av-green-dim)' }}>github.com/DrXter/ApexVector-</span>
        </footer>
      )}
      {!embedded && (
        <p style={S.disclaimer}>
          Financial ranges are transparent planning figures for board discussion — derived from event
          likelihood, category impact, and organisation size — not actuarial predictions. The value of
          this tool is the translation and the conversation it starts, not decimal-point precision.
        </p>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return <div><div style={S.fieldLabel}>{label}</div>{children}</div>;
}
function Select({ label, value, onChange, opts }) {
  return <Field label={label}>
    <select style={S.select} value={value} onChange={(e) => onChange(e.target.value)}>
      {opts.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  </Field>;
}

const RATING_COLOR = { severe: '#FF4444', elevated: '#F5A623', moderate: '#00FF41', low: '#6A9A78' };

function SingleResult({ r }) {
  const c = RATING_COLOR[r.rating];
  return (
    <div style={S.resultPanel}>
      <div style={S.verdictRow}>
        <div>
          <div style={{ ...S.verdict, color: c }}>{r.ratingLabel} RISK</div>
          <div style={S.board}>{r.boardGuidance}</div>
        </div>
        <div style={S.scoreCol}>
          <div style={{ ...S.scoreBig, color: c }}>{r.score}</div>
          <div style={S.scoreLabel}>BUSINESS RISK</div>
        </div>
      </div>

      <div style={S.block}>
        <div style={S.blockLabel}>▸ FOR THE BOARD</div>
        <p style={S.exec}>{r.execSummary}</p>
      </div>

      <div style={S.block}>
        <div style={S.blockLabel}>▸ BUSINESS CONSEQUENCE</div>
        <p style={S.consequence}>If exploited: {r.businessConsequence}.</p>
        <div style={S.drivers}>
          {r.impactDrivers.map((d) => <span key={d} style={S.driverChip}>{d}</span>)}
        </div>
      </div>

      {r.financial && (
        <div style={S.block}>
          <div style={S.blockLabel}>▸ FINANCIAL EXPOSURE (PLANNING RANGE)</div>
          <div style={S.finRow}>
            <div style={S.finCell}><div style={S.finVal}>{r.financial.low}</div><div style={S.finKey}>LOW</div></div>
            <div style={S.finCell}><div style={{ ...S.finVal, color: c, fontSize: 30 }}>{r.financial.expected}</div><div style={S.finKey}>EXPECTED</div></div>
            <div style={S.finCell}><div style={S.finVal}>{r.financial.high}</div><div style={S.finKey}>HIGH</div></div>
          </div>
          <p style={S.finBasis}>{r.financial.basis}</p>
        </div>
      )}
    </div>
  );
}

function RegisterRow({ r }) {
  const c = RATING_COLOR[r.rating];
  return (
    <div style={S.row}>
      <div style={{ ...S.rank, color: r.rank === 1 ? 'var(--av-amber)' : 'var(--av-faint)' }}>{String(r.rank).padStart(2, '0')}</div>
      <div>
        <div style={S.rowTitle}>{r.title}</div>
        <div style={S.rowConsequence}>{r.businessConsequence}</div>
        <div style={S.meta}>
          <span><span style={S.k}>category</span> {r.category.replace(/-/g, ' ')}</span>
          {r.financial && <span><span style={S.k}>exposure</span> ~{r.financial.expected}</span>}
        </div>
      </div>
      <div style={S.scoreBoxR}>
        <div style={{ ...S.scoreNum, color: c }}>{r.score}</div>
        <span style={{ ...S.ratingTag, background: `${c}22`, color: c }}>{r.ratingLabel}</span>
      </div>
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
  h1: { fontSize: 30, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', margin: 0 },
  cursor: { color: 'var(--av-green, #00FF41)' },
  tagline: { fontSize: 14, color: 'var(--av-text-dim, #6A9A78)', maxWidth: 700, marginTop: 8, lineHeight: 1.6 },

  globalBar: { background: 'var(--av-panel-2, #0E1A12)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none', padding: '12px 24px', display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' },
  toggle: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--av-text-dim, #6A9A78)', cursor: 'pointer' },
  orgSelect: { display: 'flex', alignItems: 'center', gap: 8 },
  orgLabel: { fontSize: 11, color: 'var(--av-faint, #3A6048)', letterSpacing: 1 },
  selectSm: { background: 'var(--av-bg, #0C0C0C)', border: '1px solid var(--av-border, #1A3D2A)', borderRadius: 5, color: 'var(--av-text, #C8E6D0)', fontFamily: "'Courier New', monospace", fontSize: 12, padding: '6px 8px' },

  modeBar: { display: 'flex', background: 'var(--av-panel, #0A140D)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none' },
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
  batchNote: { fontSize: 13, color: 'var(--av-text-dim, #6A9A78)', marginBottom: 16, lineHeight: 1.6 },
  controls: { display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap', alignItems: 'center' },
  btn: { fontFamily: "'Courier New', monospace", fontSize: 13, padding: '11px 22px', borderRadius: 6, cursor: 'pointer', letterSpacing: 1, border: '1px solid var(--av-border-bright, #2A6B3E)' },
  btnPrimary: { background: 'var(--av-green, #00FF41)', color: '#041209', borderColor: 'var(--av-green, #00FF41)', fontWeight: 700 },
  btnGhost: { background: 'transparent', color: 'var(--av-text-dim, #6A9A78)' },
  small: { padding: '8px 14px', fontSize: 12 },

  resultPanel: { background: 'var(--av-panel, #0A140D)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: 24 },
  verdictRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, paddingBottom: 20, borderBottom: '1px solid var(--av-border, #1A3D2A)' },
  verdict: { fontSize: 30, fontWeight: 700, letterSpacing: -0.5 },
  board: { fontSize: 13, color: 'var(--av-text-dim, #6A9A78)', marginTop: 4, fontStyle: 'italic' },
  scoreCol: { textAlign: 'right' },
  scoreBig: { fontSize: 44, fontWeight: 700, lineHeight: 1 },
  scoreLabel: { fontSize: 10, color: 'var(--av-faint, #3A6048)', letterSpacing: 1.5, marginTop: 4 },
  block: { marginTop: 22 },
  blockLabel: { fontSize: 11, color: 'var(--av-green, #00FF41)', letterSpacing: 2, marginBottom: 10 },
  exec: { fontSize: 14, color: 'var(--av-text, #C8E6D0)', lineHeight: 1.7 },
  consequence: { fontSize: 13, color: 'var(--av-text, #C8E6D0)', marginBottom: 10 },
  drivers: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  driverChip: { fontSize: 11, color: 'var(--av-text-dim, #6A9A78)', border: '1px solid var(--av-border, #1A3D2A)', borderRadius: 12, padding: '3px 10px' },
  finRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 },
  finCell: { textAlign: 'center', padding: '14px 8px', background: 'var(--av-bg, #0C0C0C)', border: '1px solid var(--av-border, #1A3D2A)', borderRadius: 8 },
  finVal: { fontSize: 22, fontWeight: 700, color: 'var(--av-text, #C8E6D0)' },
  finKey: { fontSize: 10, color: 'var(--av-faint, #3A6048)', letterSpacing: 1.5, marginTop: 4 },
  finBasis: { fontSize: 11, color: 'var(--av-text-dim, #6A9A78)', lineHeight: 1.6, fontStyle: 'italic' },

  resultsHeader: { background: 'var(--av-panel-2, #0E1A12)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  count: { fontSize: 13, color: 'var(--av-green, #00FF41)' },
  aggregate: { fontSize: 14, color: 'var(--av-amber, #F5A623)', fontWeight: 700 },
  queue: { background: 'var(--av-panel, #0A140D)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none', borderRadius: '0 0 10px 10px' },
  row: { display: 'grid', gridTemplateColumns: '54px 1fr 120px', gap: 16, padding: '16px 20px', borderBottom: '1px solid var(--av-border, #1A3D2A)', alignItems: 'center' },
  rank: { fontSize: 24, fontWeight: 700, textAlign: 'center' },
  rowTitle: { fontSize: 14, color: '#fff', marginBottom: 4 },
  rowConsequence: { fontSize: 12, color: 'var(--av-text-dim, #6A9A78)', marginBottom: 6 },
  meta: { display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11, color: 'var(--av-text-dim, #6A9A78)' },
  k: { color: 'var(--av-faint, #3A6048)' },
  scoreBoxR: { textAlign: 'right' },
  scoreNum: { fontSize: 26, fontWeight: 700, lineHeight: 1 },
  ratingTag: { display: 'inline-block', fontSize: 10, padding: '2px 8px', borderRadius: 3, marginTop: 6, letterSpacing: 1 },

  foot: { marginTop: 28, paddingTop: 18, borderTop: '1px solid var(--av-border, #1A3D2A)', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--av-faint, #3A6048)', flexWrap: 'wrap', gap: 10 },
  disclaimer: { marginTop: 14, fontSize: 11, color: 'var(--av-faint, #3A6048)', lineHeight: 1.7 },
};
