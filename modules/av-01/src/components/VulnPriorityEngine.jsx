import React, { useState, useCallback, useMemo } from 'react';
import { scoreFindings, summarize, DEFAULT_WEIGHTS } from '../engine/scoring.js';
import { parseInput, exportJson, exportCsv } from '../data/parsers.js';
import { enrich } from '../data/epss-feed.js';
import { SAMPLE_PIPE_TEXT } from '../data/sample.js';

/**
 * ApexVector · AV-01 · VulnPriority Engine
 * Platform-mountable React module.
 *
 * Props:
 *   onResult?  (scored, summary) => void   — emits to platform data bus
 *   embedded?  boolean                     — hides standalone chrome when true
 *   initialInput? string
 */
export default function VulnPriorityEngine({ onResult, embedded = false, initialInput = SAMPLE_PIPE_TEXT }) {
  const [input, setInput] = useState(initialInput);
  const [scored, setScored] = useState([]);
  const [useLiveEpss, setUseLiveEpss] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const summary = useMemo(() => (scored.length ? summarize(scored) : null), [scored]);

  const run = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      let findings = parseInput(input);
      if (!findings.length) throw new Error('No findings parsed. Check your input format.');
      if (useLiveEpss) findings = await enrich(findings);
      const result = scoreFindings(findings, { weights: DEFAULT_WEIGHTS });
      setScored(result);
      onResult?.(result, summarize(result));
    } catch (e) {
      setError(e.message || 'Failed to score findings.');
      setScored([]);
    } finally {
      setBusy(false);
    }
  }, [input, useLiveEpss, onResult]);

  const download = useCallback((kind) => {
    if (!scored.length) return;
    const content = kind === 'json' ? exportJson(scored) : exportCsv(scored);
    const blob = new Blob([content], { type: kind === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apexvector-av01-ranked.${kind}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [scored]);

  return (
    <div style={S.root}>
      {!embedded && (
        <>
          <div style={S.termBar}>
            <span style={S.dot} /><span style={S.dot} /><span style={S.dot} />
            <span style={S.termTitle}>apexvector — vulnpriority-engine — av-01</span>
          </div>
          <header style={S.header}>
            <div style={S.eyebrow}><span style={{ color: 'var(--av-green)' }}>APEXVECTOR</span> · AV-01 · AI FOR SECURITY</div>
            <h1 style={S.h1}>VulnPriority Engine<span style={S.cursor}>_</span></h1>
            <p style={S.tagline}>
              Rank findings by what to fix first — not by CVSS alone. Composite scoring weighs
              severity, real-world exploitability, and business context.
            </p>
            <div style={S.formula}>
              composite = (<b style={sb}>CVSS</b> × {DEFAULT_WEIGHTS.cvss}) + (<b style={sb}>EPSS</b> × {DEFAULT_WEIGHTS.epss}) + (<b style={{ color: 'var(--av-amber)' }}>SSVC</b> × {DEFAULT_WEIGHTS.ssvc})
            </div>
          </header>
        </>
      )}

      <section style={S.io}>
        <div style={S.labelRow}>
          <span style={S.sectionLabel}>▸ INPUT · FINDINGS</span>
          <span style={S.hint}>pipe · CSV · JSON — auto-detected · title | cvss | criticality | internet-facing</span>
        </div>
        <textarea
          style={S.textarea}
          spellCheck={false}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Remote code execution via npm lifecycle hook | 9.8 | high | y"
        />
        <div style={S.controls}>
          <button style={{ ...S.btn, ...S.btnPrimary }} onClick={run} disabled={busy}>
            {busy ? '▸ SCORING…' : '▸ PRIORITIZE'}
          </button>
          <label style={S.toggle}>
            <input type="checkbox" checked={useLiveEpss} onChange={(e) => setUseLiveEpss(e.target.checked)} />
            <span>live EPSS feed (CVE-tagged findings)</span>
          </label>
          <button style={{ ...S.btn, ...S.btnGhost }} onClick={() => setInput(SAMPLE_PIPE_TEXT)}>sample</button>
          <button style={{ ...S.btn, ...S.btnGhost }} onClick={() => { setInput(''); setScored([]); }}>clear</button>
        </div>
        {error && <div style={S.error}>⚠ {error}</div>}
      </section>

      {scored.length > 0 && (
        <>
          <div style={S.resultsHeader}>
            <span style={S.count}>
              {scored.length} findings ranked · mean {summary.meanScore} ·
              <span style={{ color: 'var(--av-red)' }}> {summary.byBand.critical} critical</span>,
              <span style={{ color: 'var(--av-amber)' }}> {summary.byBand.high} high</span>
            </span>
            <div style={S.exportRow}>
              <button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={() => download('json')}>export JSON</button>
              <button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={() => download('csv')}>export CSV</button>
            </div>
          </div>
          <div style={S.queue}>
            {scored.map((f) => (
              <FindingRow key={`${f.rank}-${f.title}`} f={f} />
            ))}
          </div>
        </>
      )}

      {!embedded && (
        <footer style={S.foot}>
          <span>apexvector · av-01 · open source · free forever</span>
          <span style={{ color: 'var(--av-green-dim)' }}>github.com/apexvector</span>
        </footer>
      )}
    </div>
  );
}

function FindingRow({ f }) {
  const c = BAND_COLOR[f.priority];
  return (
    <div style={S.row}>
      <div style={{ ...S.rank, color: f.rank === 1 ? 'var(--av-amber)' : 'var(--av-faint)' }}>
        {String(f.rank).padStart(2, '0')}
      </div>
      <div>
        <div style={S.findingTitle}>{f.title}</div>
        <div style={S.meta}>
          <span><span style={S.k}>CVSS</span> {f.cvss.toFixed(1)}</span>
          <span><span style={S.k}>EPSS</span> {(f.epss * 100).toFixed(0)}%{f.estimated.epss ? '~' : ''}</span>
          <span><span style={S.k}>SSVC</span> {(f.ssvc * 100).toFixed(0)}%{f.estimated.ssvc ? '~' : ''}</span>
          <span><span style={S.k}>asset</span> {f.assetCriticality}</span>
          <span><span style={S.k}>exposure</span> {f.internetFacing ? 'internet-facing' : 'internal'}</span>
        </div>
        <div style={S.rationale}>{f.rationale}</div>
      </div>
      <div style={S.scoreBox}>
        <div style={{ ...S.scoreNum, color: c }}>{f.score}</div>
        <div style={S.scoreLabel}>COMPOSITE</div>
        <span style={{ ...S.prioTag, background: `${c}22`, color: c }}>{f.priorityLabel}</span>
      </div>
    </div>
  );
}

const BAND_COLOR = {
  critical: '#FF4444',
  high: '#F5A623',
  medium: '#00FF41',
  low: '#6A9A78',
};

const sb = { color: 'var(--av-green)' };

// Inline style objects keep the module self-contained (no external CSS import
// required to mount). The platform theme provides the --av-* CSS variables;
// fallbacks are baked in below.
const S = {
  root: { fontFamily: "'Courier New', monospace", color: 'var(--av-text, #C8E6D0)', maxWidth: 1000, margin: '0 auto' },
  termBar: { background: 'var(--av-panel, #0A140D)', border: '1px solid var(--av-border, #1A3D2A)', borderRadius: '10px 10px 0 0', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 },
  dot: { width: 11, height: 11, borderRadius: '50%', background: 'var(--av-border-bright, #2A6B3E)', opacity: 0.5 },
  termTitle: { marginLeft: 12, fontSize: 12, color: 'var(--av-text-dim, #6A9A78)', letterSpacing: 1 },
  header: { background: 'var(--av-panel, #0A140D)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none', padding: '28px 24px' },
  eyebrow: { fontSize: 11, color: 'var(--av-green-dim, #2E8B4E)', letterSpacing: 3, marginBottom: 12 },
  h1: { fontSize: 30, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', margin: 0 },
  cursor: { color: 'var(--av-green, #00FF41)' },
  tagline: { fontSize: 14, color: 'var(--av-text-dim, #6A9A78)', maxWidth: 640, marginTop: 8 },
  formula: { marginTop: 18, padding: '12px 16px', background: 'var(--av-panel-2, #0E1A12)', borderLeft: '2px solid var(--av-green, #00FF41)', borderRadius: '0 6px 6px 0', fontSize: 13, color: 'var(--av-text-dim, #6A9A78)' },
  io: { background: 'var(--av-panel, #0A140D)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none', padding: 24 },
  labelRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 },
  sectionLabel: { fontSize: 12, color: 'var(--av-green, #00FF41)', letterSpacing: 2 },
  hint: { fontSize: 11, color: 'var(--av-faint, #3A6048)' },
  textarea: { width: '100%', minHeight: 160, background: 'var(--av-bg, #0C0C0C)', border: '1px solid var(--av-border, #1A3D2A)', borderRadius: 6, color: 'var(--av-text, #C8E6D0)', fontFamily: "'Courier New', monospace", fontSize: 13, padding: 14, resize: 'vertical', lineHeight: 1.6 },
  controls: { display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' },
  btn: { fontFamily: "'Courier New', monospace", fontSize: 13, padding: '11px 22px', borderRadius: 6, cursor: 'pointer', letterSpacing: 1, border: '1px solid var(--av-border-bright, #2A6B3E)' },
  btnPrimary: { background: 'var(--av-green, #00FF41)', color: '#041209', borderColor: 'var(--av-green, #00FF41)', fontWeight: 700 },
  btnGhost: { background: 'transparent', color: 'var(--av-text-dim, #6A9A78)' },
  small: { padding: '7px 14px', fontSize: 12 },
  toggle: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--av-text-dim, #6A9A78)', cursor: 'pointer' },
  error: { marginTop: 12, color: '#FF4444', fontSize: 13 },
  resultsHeader: { background: 'var(--av-panel-2, #0E1A12)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  count: { fontSize: 13, color: 'var(--av-green, #00FF41)', letterSpacing: 0.5 },
  exportRow: { display: 'flex', gap: 8 },
  queue: { background: 'var(--av-panel, #0A140D)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden' },
  row: { display: 'grid', gridTemplateColumns: '54px 1fr 130px', gap: 16, padding: '16px 20px', borderBottom: '1px solid var(--av-border, #1A3D2A)', alignItems: 'center' },
  rank: { fontSize: 24, fontWeight: 700, textAlign: 'center' },
  findingTitle: { fontSize: 14, color: '#fff', marginBottom: 6 },
  meta: { display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11, color: 'var(--av-text-dim, #6A9A78)' },
  k: { color: 'var(--av-faint, #3A6048)' },
  rationale: { fontSize: 12, color: 'var(--av-text-dim, #6A9A78)', marginTop: 7, fontStyle: 'italic' },
  scoreBox: { textAlign: 'right' },
  scoreNum: { fontSize: 26, fontWeight: 700, lineHeight: 1 },
  scoreLabel: { fontSize: 10, color: 'var(--av-faint, #3A6048)', letterSpacing: 1, marginTop: 3 },
  prioTag: { display: 'inline-block', fontSize: 10, padding: '2px 8px', borderRadius: 3, marginTop: 6, letterSpacing: 1 },
  foot: { marginTop: 28, paddingTop: 18, borderTop: '1px solid var(--av-border, #1A3D2A)', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--av-faint, #3A6048)', flexWrap: 'wrap', gap: 10 },
};
