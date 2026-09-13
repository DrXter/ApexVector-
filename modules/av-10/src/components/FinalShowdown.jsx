import React, { useState, useCallback } from 'react';
import { runPipeline } from '../engines/posture.js';
import { SAMPLE_INTAKE, exportJson } from '../data/sample.js';

const LENS_META = {
  av01: { icon: '01', full: 'VulnPriority Engine' },
  av02: { icon: '02', full: 'Alert Triage Simulator' },
  av03: { icon: '03', full: 'Risk Translator' },
  av04: { icon: '04', full: 'Red Team Recon Planner' },
  av05: { icon: '05', full: 'DevSecOps AI Readiness' },
  av06: { icon: '06', full: 'Prompt Injection Test Suite' },
  av07: { icon: '07', full: 'Agentic AI Threat Modeller' },
  av08: { icon: '08', full: 'AI Memory Attack Simulator' },
  av09: { icon: '09', full: 'Shadow AI Risk Scanner' },
};

/**
 * ApexVector · AV-10 · Final Showdown
 * Season 1 capstone. Platform-mountable React module.
 * Props: onResult?(result) ; embedded?: boolean
 */
export default function FinalShowdown({ onResult, embedded = false }) {
  const [intake, setIntake] = useState(SAMPLE_INTAKE);
  const [result, setResult] = useState(null);

  const run = useCallback(() => {
    const r = runPipeline(intake);
    setResult(r);
    onResult?.(r);
  }, [intake, onResult]);

  const download = () => {
    if (!result) return;
    const blob = new Blob([exportJson(result)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'apexvector-av10-posture.json'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={S.root}>
      {!embedded && (
        <>
          <div style={S.termBar}>
            <span style={S.dot} /><span style={S.dot} /><span style={S.dot} />
            <span style={S.termTitle}>apexvector — final-showdown — av-10 — season 1 finale</span>
          </div>
          <header style={S.header}>
            <div style={S.eyebrow}><span style={{ color: 'var(--av-amber, #F5A623)' }}>APEXVECTOR</span> · AV-10 · SEASON 1 FINALE</div>
            <h1 style={S.h1}>The Final Showdown<span style={S.cursor}>_</span></h1>
            <p style={S.tagline}>
              Nine modules. Nine lenses on the same organisation. One shared intake runs through all
              of them — vulnerability priority feeds straight into board risk translation, the one real
              chain in the series — and every lens rolls up into a single composite AI-security posture
              score. Not a fake pipeline. Nine honest measurements, one number.
            </p>
          </header>
        </>
      )}

      <section style={S.io}>
        <div style={S.labelRow}>
          <span style={S.sectionLabel}>▸ ONE SHARED INTAKE</span>
          <span style={S.hint}>the sample below spans all 9 dimensions — edit the JSON or run as-is</span>
        </div>
        <textarea
          style={S.textarea}
          spellCheck={false}
          value={JSON.stringify(intake, null, 2)}
          onChange={(e) => { try { setIntake(JSON.parse(e.target.value)); } catch { /* keep typing */ } }}
        />
        <div style={S.controls}>
          <button style={{ ...S.btn, ...S.btnPrimary }} onClick={run}>▸ RUN THE FULL PIPELINE</button>
          <button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={() => setIntake(SAMPLE_INTAKE)}>reset sample</button>
          {result && <button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={download}>export JSON</button>}
        </div>
      </section>

      {result && <PostureResult r={result} />}

      {!embedded && (
        <footer style={S.foot}>
          <span>apexvector · av-10 · season 1 finale · open source</span>
          <span style={{ color: 'var(--av-green-dim)' }}>github.com/DrXter/ApexVector-</span>
        </footer>
      )}
      {!embedded && (
        <p style={S.disclaimer}>
          A portfolio view across nine independent risk lenses, not a single root-cause diagnosis. Most
          of the nine dimensions do not causally depend on each other — the one genuine chain is AV-01's
          ranked findings feeding AV-03's board translation. Validate against your real environment.
        </p>
      )}
    </div>
  );
}

const BAND_COLOR = { critical: '#FF4444', weak: '#FF8C42', developing: '#F5A623', strong: '#00FF41' };

function PostureResult({ r }) {
  const c = BAND_COLOR[r.band];
  return (
    <div style={S.resultPanel}>
      <div style={S.verdictRow}>
        <div>
          <div style={{ ...S.verdict, color: c }}>{r.bandLabel}</div>
          <div style={S.note}>{r.bandNote}</div>
        </div>
        <div style={S.scoreCol}>
          <div style={{ ...S.scoreBig, color: c }}>{r.composite}<span style={S.pct}>/100</span></div>
          <div style={S.scoreLabel}>COMPOSITE POSTURE</div>
        </div>
      </div>

      <div style={S.block}>
        <div style={S.blockLabel}>▸ THE ONE REAL CHAIN</div>
        <div style={S.chainCard}>
          <span style={S.chainFrom}>AV-01 VulnPriority</span>
          <span style={S.chainArrow}>──▶</span>
          <span style={S.chainTo}>AV-03 Risk Translator</span>
          <p style={S.chainNote}>{r.chain.note}</p>
        </div>
      </div>

      <div style={S.block}>
        <div style={S.blockLabel}>▸ SUMMARY</div>
        <p style={S.summary}>{r.summary}</p>
      </div>

      <div style={S.block}>
        <div style={S.blockLabel}>▸ NINE LENSES, RANKED BY RISK</div>
        {r.lenses.map((l, i) => (
          <LensRow key={l.id} l={l} rank={i + 1} />
        ))}
      </div>
    </div>
  );
}

function LensRow({ l, rank }) {
  const c = l.score >= 65 ? '#FF4444' : l.score >= 45 ? '#FF8C42' : l.score >= 25 ? '#F5A623' : '#00FF41';
  const meta = LENS_META[l.id] || {};
  return (
    <div style={S.row}>
      <div style={{ ...S.rank, color: rank === 1 ? '#FF4444' : 'var(--av-faint)' }}>{meta.icon}</div>
      <div>
        <div style={S.rowTitle}>{meta.full || l.name}</div>
        <div style={S.rowNote}>{l.label}</div>
        {l.dependsOn && <div style={S.depTag}>chained from {l.dependsOn.toUpperCase()}</div>}
      </div>
      <div style={S.scoreBox}>
        <div style={{ ...S.scoreNum, color: c }}>{l.score}</div>
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
  cursor: { color: 'var(--av-amber, #F5A623)' },
  tagline: { fontSize: 14, color: 'var(--av-text-dim, #6A9A78)', maxWidth: 740, marginTop: 8, lineHeight: 1.6 },

  io: { background: 'var(--av-panel, #0A140D)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none', padding: 24 },
  labelRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 },
  sectionLabel: { fontSize: 12, color: 'var(--av-green, #00FF41)', letterSpacing: 2 },
  hint: { fontSize: 11, color: 'var(--av-faint, #3A6048)' },
  textarea: { width: '100%', minHeight: 320, background: 'var(--av-bg, #0C0C0C)', border: '1px solid var(--av-border, #1A3D2A)', borderRadius: 6, color: 'var(--av-text, #C8E6D0)', fontFamily: "'Courier New', monospace", fontSize: 12, padding: 14, resize: 'vertical', lineHeight: 1.6 },
  controls: { display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap', alignItems: 'center' },
  btn: { fontFamily: "'Courier New', monospace", fontSize: 13, padding: '11px 22px', borderRadius: 6, cursor: 'pointer', letterSpacing: 1, border: '1px solid var(--av-border-bright, #2A6B3E)' },
  btnPrimary: { background: 'var(--av-amber, #F5A623)', color: '#251500', borderColor: 'var(--av-amber, #F5A623)', fontWeight: 700 },
  btnGhost: { background: 'transparent', color: 'var(--av-text-dim, #6A9A78)' },
  small: { padding: '8px 14px', fontSize: 12 },

  resultPanel: { background: 'var(--av-panel, #0A140D)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: 24 },
  verdictRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, paddingBottom: 20, borderBottom: '1px solid var(--av-border, #1A3D2A)' },
  verdict: { fontSize: 28, fontWeight: 700, letterSpacing: -0.5 },
  note: { fontSize: 13, color: 'var(--av-text-dim, #6A9A78)', marginTop: 4, fontStyle: 'italic', maxWidth: 520, lineHeight: 1.5 },
  scoreCol: { textAlign: 'right' },
  scoreBig: { fontSize: 44, fontWeight: 700, lineHeight: 1 },
  pct: { fontSize: 18, color: 'var(--av-faint, #3A6048)' },
  scoreLabel: { fontSize: 10, color: 'var(--av-faint, #3A6048)', letterSpacing: 1.5, marginTop: 4 },

  block: { marginTop: 22 },
  blockLabel: { fontSize: 11, color: 'var(--av-green, #00FF41)', letterSpacing: 2, marginBottom: 12 },
  chainCard: { background: 'var(--av-bg, #0C0C0C)', border: '1px solid var(--av-border, #1A3D2A)', borderRadius: 8, padding: 16 },
  chainFrom: { color: '#fff', fontSize: 13 },
  chainArrow: { color: 'var(--av-amber, #F5A623)', margin: '0 10px', fontSize: 13 },
  chainTo: { color: '#fff', fontSize: 13 },
  chainNote: { fontSize: 12, color: 'var(--av-text-dim, #6A9A78)', marginTop: 10, lineHeight: 1.6 },
  summary: { fontSize: 14, color: 'var(--av-text, #C8E6D0)', lineHeight: 1.7 },

  row: { display: 'grid', gridTemplateColumns: '44px 1fr 70px', gap: 14, padding: '14px 4px', borderBottom: '1px solid var(--av-border, #1A3D2A)', alignItems: 'center' },
  rank: { fontSize: 20, fontWeight: 700, textAlign: 'center' },
  rowTitle: { fontSize: 14, color: '#fff', marginBottom: 3 },
  rowNote: { fontSize: 12, color: 'var(--av-text-dim, #6A9A78)', lineHeight: 1.4 },
  depTag: { fontSize: 10, color: 'var(--av-amber, #F5A623)', marginTop: 4, letterSpacing: 0.5 },
  scoreBox: { textAlign: 'right' },
  scoreNum: { fontSize: 24, fontWeight: 700 },

  foot: { marginTop: 28, paddingTop: 18, borderTop: '1px solid var(--av-border, #1A3D2A)', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--av-faint, #3A6048)', flexWrap: 'wrap', gap: 10 },
  disclaimer: { marginTop: 14, fontSize: 11, color: 'var(--av-faint, #3A6048)', lineHeight: 1.7 },
};
