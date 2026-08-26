import React, { useState, useCallback, useMemo } from 'react';
import {
  analyzeBlastRadius, buildThreatModel,
  TOOL_CATALOG, TOOL_KEYS, AUTONOMY_KEYS, EXPOSURE_KEYS,
} from '../engine/agentic.js';
import { SAMPLE_AGENT, exportJson } from '../data/sample.js';

// human-readable labels for autonomy / exposure keys (kept in engine too)
const AUTONOMY_LABELS = {
  'human-approval': 'Human approves every action',
  'human-on-loop': 'Human monitors, can interrupt',
  'notify-only': 'Acts autonomously, notifies after',
  'full-auto': 'Fully autonomous, no oversight',
};
const EXPOSURE_LABELS = {
  'trusted-only': 'Trusted internal input only',
  'authenticated': 'Authenticated users',
  'public': 'Public / untrusted input',
  'retrieval': 'Ingests external / retrieved content',
};

/**
 * ApexVector · AV-07 · Agentic AI Threat Modeller
 * Platform-mountable React module. Props: onResult?(result, mode) ; embedded?
 */
export default function AgenticThreatModeller({ onResult, embedded = false }) {
  const [mode, setMode] = useState('blast');
  const [agent, setAgent] = useState(SAMPLE_AGENT);
  const [blast, setBlast] = useState(null);
  const [threatModel, setThreatModel] = useState(null);

  const set = (k, v) => setAgent((a) => ({ ...a, [k]: v }));
  const toggleTool = (t) => setAgent((a) => ({ ...a, tools: a.tools.includes(t) ? a.tools.filter((x) => x !== t) : [...a.tools, t] }));

  const run = useCallback(() => {
    const b = analyzeBlastRadius(agent);
    const tm = buildThreatModel(agent);
    setBlast(b); setThreatModel(tm);
    onResult?.({ blast: b, threatModel: tm }, mode);
  }, [agent, mode, onResult]);

  const download = () => {
    if (!blast) return;
    const blob = new Blob([exportJson(blast, threatModel, agent.name)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'apexvector-av07-threat-model.json'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={S.root}>
      {!embedded && (
        <>
          <div style={S.termBar}>
            <span style={S.dot} /><span style={S.dot} /><span style={S.dot} />
            <span style={S.termTitle}>apexvector — agentic-threat-modeller — av-07</span>
          </div>
          <header style={S.header}>
            <div style={S.eyebrow}><span style={{ color: 'var(--av-red)' }}>APEXVECTOR</span> · AV-07 · SECURITY FOR AI</div>
            <h1 style={S.h1}>Agentic AI Threat Modeller<span style={S.cursor}>_</span></h1>
            <p style={S.tagline}>
              A prompt injection is a content problem — until the model has tools. Then it's an actions
              problem. Describe your agent's capabilities, autonomy, and exposure, and see its blast
              radius: how much damage a single hijack could do, where the guardrails are missing, and
              which agentic threats apply.
            </p>
          </header>
        </>
      )}

      <section style={S.io}>
        <div style={S.labelRow}>
          <span style={S.sectionLabel}>▸ DESCRIBE YOUR AGENT</span>
          <span style={S.hint}>configuration stays in your browser</span>
        </div>

        <input style={S.input} value={agent.name} onChange={(e) => set('name', e.target.value)} placeholder="Agent name" />

        <div style={S.fieldLabel}>TOOLS / CAPABILITIES IT HOLDS</div>
        <div style={S.toolGrid}>
          {TOOL_KEYS.map((t) => {
            const on = agent.tools.includes(t);
            const dmg = Math.round(TOOL_CATALOG[t].damage * 100);
            return (
              <button key={t} style={{ ...S.toolCard, ...(on ? S.toolOn : {}) }} onClick={() => toggleTool(t)}>
                <span style={S.toolCheck}>{on ? '◉' : '○'}</span>
                <span style={S.toolLabel}>{TOOL_CATALOG[t].label}</span>
                <span style={{ ...S.toolDmg, color: dmg >= 80 ? '#FF4444' : dmg >= 60 ? '#F5A623' : '#6A9A78' }}>{dmg}</span>
              </button>
            );
          })}
        </div>

        <div style={S.selectRow}>
          <div style={S.selectCol}>
            <div style={S.fieldLabel}>AUTONOMY</div>
            <select style={S.select} value={agent.autonomy} onChange={(e) => set('autonomy', e.target.value)}>
              {AUTONOMY_KEYS.map((k) => <option key={k} value={k}>{AUTONOMY_LABELS[k]}</option>)}
            </select>
          </div>
          <div style={S.selectCol}>
            <div style={S.fieldLabel}>INPUT EXPOSURE</div>
            <select style={S.select} value={agent.exposure} onChange={(e) => set('exposure', e.target.value)}>
              {EXPOSURE_KEYS.map((k) => <option key={k} value={k}>{EXPOSURE_LABELS[k]}</option>)}
            </select>
          </div>
        </div>

        <div style={S.checkRow}>
          <label style={S.check}><input type="checkbox" checked={agent.hasMemory} onChange={(e) => set('hasMemory', e.target.checked)} /><span>has persistent memory</span></label>
          <label style={S.check}><input type="checkbox" checked={agent.leastPrivilege} onChange={(e) => set('leastPrivilege', e.target.checked)} /><span>tools scoped to least privilege</span></label>
          <label style={S.check}><input type="checkbox" checked={agent.actionValidation} onChange={(e) => set('actionValidation', e.target.checked)} /><span>tool args validated outside the model</span></label>
        </div>

        <div style={S.controls}>
          <button style={{ ...S.btn, ...S.btnPrimary }} onClick={run}>▸ MODEL THREATS</button>
          <button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={() => setAgent(SAMPLE_AGENT)}>sample</button>
          {blast && <button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={download}>export JSON</button>}
        </div>
      </section>

      {blast && (
        <>
          <div style={S.modeBar}>
            <button style={{ ...S.tab, ...(mode === 'blast' ? S.tabOn : {}) }} onClick={() => setMode('blast')}>▸ BLAST RADIUS</button>
            <button style={{ ...S.tab, ...(mode === 'threats' ? S.tabOn : {}) }} onClick={() => setMode('threats')}>▸ THREAT MODEL</button>
          </div>

          {mode === 'blast' ? <BlastResult r={blast} /> : <ThreatResult tm={threatModel} />}
        </>
      )}

      {!embedded && (
        <footer style={S.foot}>
          <span>apexvector · av-07 · security for ai · open source</span>
          <span style={{ color: 'var(--av-green-dim)' }}>github.com/DrXter/ApexVector-</span>
        </footer>
      )}
      {!embedded && (
        <p style={S.disclaimer}>
          A defensive threat-modelling aid. It reasons about the blast radius your agent's configuration
          implies and maps applicable agentic threat categories — it does not attack anything. Validate
          against your real architecture and red-team before production.
        </p>
      )}
    </div>
  );
}

const BAND_COLOR = { catastrophic: '#FF4444', severe: '#FF8C42', moderate: '#F5A623', contained: '#00FF41' };

function BlastResult({ r }) {
  const c = BAND_COLOR[r.band];
  return (
    <div style={S.resultPanel}>
      <div style={S.verdictRow}>
        <div>
          <div style={{ ...S.verdict, color: c }}>{r.bandLabel}</div>
          <div style={S.note}>{r.bandNote}</div>
        </div>
        <div style={S.scoreCol}>
          <div style={{ ...S.scoreBig, color: c }}>{r.score}</div>
          <div style={S.scoreLabel}>BLAST RADIUS</div>
        </div>
      </div>

      <div style={S.block}>
        <div style={S.blockLabel}>▸ SUMMARY</div>
        <p style={S.summary}>{r.summary}</p>
      </div>

      <div style={S.metaGrid}>
        <div style={S.metaCell}><div style={S.metaK}>CAPABILITY</div><div style={S.metaV}>{r.capability}/100</div></div>
        <div style={S.metaCell}><div style={S.metaK}>AUTONOMY</div><div style={S.metaVsm}>{r.autonomy.label}</div></div>
        <div style={S.metaCell}><div style={S.metaK}>EXPOSURE</div><div style={S.metaVsm}>{r.exposure.label}</div></div>
      </div>

      {r.irreversibleTools.length > 0 && (
        <div style={S.block}>
          <div style={S.blockLabel}>▸ IRREVERSIBLE ACTIONS</div>
          <div style={S.chipRow}>
            {r.irreversibleTools.map((t) => <span key={t} style={S.irrevChip}>⚠ {t}</span>)}
          </div>
        </div>
      )}

      {r.guardrailGaps.length > 0 && (
        <div style={S.block}>
          <div style={S.blockLabel}>▸ GUARDRAIL GAPS</div>
          {r.guardrailGaps.map((g) => (
            <div key={g.id} style={S.gapRow}>
              <span style={S.gapMark}>✗</span>
              <span style={S.gapText}>{g.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ThreatResult({ tm }) {
  return (
    <div style={S.resultPanel}>
      <div style={S.block} data-first>
        <div style={S.blockLabel}>▸ APPLICABLE AGENTIC THREATS · {tm.count}</div>
        {tm.threats.map((t) => (
          <div key={t.id} style={S.threatCard}>
            <div style={S.threatName}>{t.name}</div>
            <div style={S.threatDesc}>{t.desc}</div>
            <div style={S.mitLabel}>mitigations:</div>
            <ul style={S.mitList}>
              {t.mitigations.map((m, i) => <li key={i} style={S.mitItem}>{m}</li>)}
            </ul>
          </div>
        ))}
      </div>
      {tm.notApplicable.length > 0 && (
        <div style={S.block}>
          <div style={S.blockLabel}>▸ NOT APPLICABLE TO THIS CONFIG</div>
          <div style={S.chipRow}>
            {tm.notApplicable.map((n) => <span key={n} style={S.naChip}>{n}</span>)}
          </div>
        </div>
      )}
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
  tagline: { fontSize: 14, color: 'var(--av-text-dim, #6A9A78)', maxWidth: 720, marginTop: 8, lineHeight: 1.6 },

  io: { background: 'var(--av-panel, #0A140D)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none', padding: 24 },
  labelRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 },
  sectionLabel: { fontSize: 12, color: 'var(--av-green, #00FF41)', letterSpacing: 2 },
  hint: { fontSize: 11, color: 'var(--av-faint, #3A6048)' },
  input: { width: '100%', background: 'var(--av-bg, #0C0C0C)', border: '1px solid var(--av-border, #1A3D2A)', borderRadius: 6, color: 'var(--av-text, #C8E6D0)', fontFamily: "'Courier New', monospace", fontSize: 13, padding: '12px 14px', marginBottom: 18 },
  fieldLabel: { fontSize: 10, color: 'var(--av-faint, #3A6048)', letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' },
  toolGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 8, marginBottom: 18 },
  toolCard: { display: 'flex', gap: 10, alignItems: 'center', textAlign: 'left', padding: '11px 14px', background: 'var(--av-bg, #0C0C0C)', border: '1px solid var(--av-border, #1A3D2A)', borderRadius: 6, cursor: 'pointer', fontFamily: "'Courier New', monospace" },
  toolOn: { borderColor: 'var(--av-red, #FF4444)', background: '#FF44440A' },
  toolCheck: { color: 'var(--av-red, #FF4444)', fontSize: 15 },
  toolLabel: { fontSize: 12, color: 'var(--av-text, #C8E6D0)', flex: 1 },
  toolDmg: { fontSize: 12, fontWeight: 700 },
  selectRow: { display: 'flex', gap: 16, marginBottom: 18, flexWrap: 'wrap' },
  selectCol: { flex: 1, minWidth: 220 },
  select: { width: '100%', background: 'var(--av-bg, #0C0C0C)', border: '1px solid var(--av-border, #1A3D2A)', borderRadius: 6, color: 'var(--av-text, #C8E6D0)', fontFamily: "'Courier New', monospace", fontSize: 13, padding: '9px 10px' },
  checkRow: { display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 4 },
  check: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--av-text-dim, #6A9A78)', cursor: 'pointer' },
  controls: { display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap', alignItems: 'center' },
  btn: { fontFamily: "'Courier New', monospace", fontSize: 13, padding: '11px 22px', borderRadius: 6, cursor: 'pointer', letterSpacing: 1, border: '1px solid var(--av-border-bright, #2A6B3E)' },
  btnPrimary: { background: 'var(--av-green, #00FF41)', color: '#041209', borderColor: 'var(--av-green, #00FF41)', fontWeight: 700 },
  btnGhost: { background: 'transparent', color: 'var(--av-text-dim, #6A9A78)' },
  small: { padding: '8px 14px', fontSize: 12 },

  modeBar: { display: 'flex', background: 'var(--av-panel, #0A140D)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none' },
  tab: { flex: 1, background: 'transparent', border: 'none', borderBottom: '2px solid transparent', color: 'var(--av-text-dim, #6A9A78)', fontFamily: "'Courier New', monospace", fontSize: 12, padding: '14px 12px', cursor: 'pointer', letterSpacing: 1 },
  tabOn: { color: 'var(--av-green, #00FF41)', borderBottom: '2px solid var(--av-green, #00FF41)', background: 'var(--av-panel-2, #0E1A12)' },

  resultPanel: { background: 'var(--av-panel, #0A140D)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: 24 },
  verdictRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, paddingBottom: 20, borderBottom: '1px solid var(--av-border, #1A3D2A)' },
  verdict: { fontSize: 28, fontWeight: 700, letterSpacing: -0.5 },
  note: { fontSize: 13, color: 'var(--av-text-dim, #6A9A78)', marginTop: 4, fontStyle: 'italic', maxWidth: 520, lineHeight: 1.5 },
  scoreCol: { textAlign: 'right' },
  scoreBig: { fontSize: 40, fontWeight: 700, lineHeight: 1 },
  scoreLabel: { fontSize: 10, color: 'var(--av-faint, #3A6048)', letterSpacing: 1.5, marginTop: 4 },
  block: { marginTop: 22 },
  blockLabel: { fontSize: 11, color: 'var(--av-green, #00FF41)', letterSpacing: 2, marginBottom: 12 },
  summary: { fontSize: 14, color: 'var(--av-text, #C8E6D0)', lineHeight: 1.7 },
  metaGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 18 },
  metaCell: { background: 'var(--av-bg, #0C0C0C)', border: '1px solid var(--av-border, #1A3D2A)', borderRadius: 8, padding: '12px 14px' },
  metaK: { fontSize: 10, color: 'var(--av-faint, #3A6048)', letterSpacing: 1, marginBottom: 5 },
  metaV: { fontSize: 18, fontWeight: 700, color: '#fff' },
  metaVsm: { fontSize: 12, color: 'var(--av-text, #C8E6D0)', lineHeight: 1.4 },
  chipRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  irrevChip: { fontSize: 12, color: '#FF8C42', border: '1px solid #FF8C4233', borderRadius: 12, padding: '3px 12px' },
  gapRow: { display: 'flex', gap: 10, alignItems: 'flex-start', padding: '9px 0', borderBottom: '1px solid var(--av-border, #1A3D2A)' },
  gapMark: { color: '#FF4444', fontSize: 14, marginTop: 1 },
  gapText: { fontSize: 13, color: 'var(--av-text, #C8E6D0)', lineHeight: 1.5 },

  threatCard: { background: 'var(--av-bg, #0C0C0C)', border: '1px solid var(--av-border, #1A3D2A)', borderRadius: 8, padding: 16, marginBottom: 10 },
  threatName: { fontSize: 14, color: '#fff', fontWeight: 700, marginBottom: 6 },
  threatDesc: { fontSize: 13, color: 'var(--av-text-dim, #6A9A78)', marginBottom: 10, lineHeight: 1.6 },
  mitLabel: { fontSize: 10, color: 'var(--av-green-dim, #2E8B4E)', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
  mitList: { margin: 0, paddingLeft: 18 },
  mitItem: { fontSize: 12, color: 'var(--av-text, #C8E6D0)', lineHeight: 1.7 },
  naChip: { fontSize: 11, color: 'var(--av-faint, #3A6048)', border: '1px solid var(--av-border, #1A3D2A)', borderRadius: 12, padding: '3px 10px' },

  foot: { marginTop: 28, paddingTop: 18, borderTop: '1px solid var(--av-border, #1A3D2A)', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--av-faint, #3A6048)', flexWrap: 'wrap', gap: 10 },
  disclaimer: { marginTop: 14, fontSize: 11, color: 'var(--av-faint, #3A6048)', lineHeight: 1.7 },
};
