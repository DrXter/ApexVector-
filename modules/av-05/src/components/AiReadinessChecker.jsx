import React, { useState, useCallback, useMemo } from 'react';
import {
  assessReadiness, profileAiCodeRisk,
  READINESS_CONTROLS, AI_USAGE_VECTORS, USAGE_KEYS,
} from '../engine/readiness.js';
import {
  SAMPLE_ANSWERS, SAMPLE_USAGES,
  exportReadinessJson, exportRiskJson, exportReadinessCsv,
} from '../data/sample.js';

/**
 * ApexVector · AV-05 · DevSecOps AI Readiness Checker
 * Platform-mountable React module. Props: onResult?(result, mode) ; embedded?
 */
export default function AiReadinessChecker({ onResult, embedded = false }) {
  const [mode, setMode] = useState('readiness');

  // Mode 1 state
  const [answers, setAnswers] = useState(SAMPLE_ANSWERS);
  const [readiness, setReadiness] = useState(null);

  // Mode 2 state
  const [usages, setUsages] = useState(SAMPLE_USAGES);
  const [governance, setGovernance] = useState('low');
  const [risk, setRisk] = useState(null);

  const setAnswer = (id, v) => setAnswers((a) => ({ ...a, [id]: v }));
  const toggleUsage = (k) => setUsages((u) => (u.includes(k) ? u.filter((x) => x !== k) : [...u, k]));

  const runReadiness = useCallback(() => {
    const r = assessReadiness(answers);
    setReadiness(r); onResult?.(r, 'readiness');
  }, [answers, onResult]);

  const runRisk = useCallback(() => {
    const r = profileAiCodeRisk(usages, { governance });
    setRisk(r); onResult?.(r, 'risk');
  }, [usages, governance, onResult]);

  const download = (kind) => {
    let content, name;
    if (mode === 'readiness' && readiness) {
      content = kind === 'json' ? exportReadinessJson(readiness) : exportReadinessCsv(readiness);
      name = `apexvector-av05-readiness.${kind}`;
    } else if (mode === 'risk' && risk && kind === 'json') {
      content = exportRiskJson(risk); name = 'apexvector-av05-risk.json';
    } else return;
    const blob = new Blob([content], { type: kind === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={S.root}>
      {!embedded && (
        <>
          <div style={S.termBar}>
            <span style={S.dot} /><span style={S.dot} /><span style={S.dot} />
            <span style={S.termTitle}>apexvector — ai-readiness-checker — av-05</span>
          </div>
          <header style={S.header}>
            <div style={S.eyebrow}><span style={{ color: 'var(--av-green)' }}>APEXVECTOR</span> · AV-05 · AI FOR SECURITY</div>
            <h1 style={S.h1}>DevSecOps AI Readiness Checker<span style={S.cursor}>_</span></h1>
            <p style={S.tagline}>
              Your CI/CD pipeline scans human code. Your developers are shipping AI code. Those aren't
              the same threat model. Score how ready your pipeline is to ship AI-generated code safely —
              and map the new attack surface AI introduces.
            </p>
          </header>
        </>
      )}

      <div style={S.modeBar}>
        <button style={{ ...S.tab, ...(mode === 'readiness' ? S.tabOn : {}) }} onClick={() => setMode('readiness')}>▸ PIPELINE READINESS</button>
        <button style={{ ...S.tab, ...(mode === 'risk' ? S.tabOn : {}) }} onClick={() => setMode('risk')}>▸ AI-CODE RISK PROFILE</button>
      </div>

      {mode === 'readiness' ? (
        <>
          <section style={S.io}>
            <div style={S.labelRow}>
              <span style={S.sectionLabel}>▸ PIPELINE CONTROLS</span>
              <span style={S.hint}>answer for your current pipeline — yes / partial / no</span>
            </div>
            <div style={S.controlList}>
              {READINESS_CONTROLS.map((c) => (
                <div key={c.id} style={S.controlRow}>
                  <div style={S.controlQ}>
                    <span style={S.controlGroup}>{c.group}</span>
                    {c.q}
                  </div>
                  <div style={S.answerBtns}>
                    {['yes', 'partial', 'no'].map((v) => (
                      <button key={v}
                        style={{ ...S.answerBtn, ...(answers[c.id] === v ? S.answerOn[v] : {}) }}
                        onClick={() => setAnswer(c.id, v)}>{v}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={S.controls}>
              <button style={{ ...S.btn, ...S.btnPrimary }} onClick={runReadiness}>▸ SCORE READINESS</button>
              {readiness && <>
                <button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={() => download('json')}>export JSON</button>
                <button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={() => download('csv')}>export CSV</button>
              </>}
            </div>
          </section>

          {readiness && <ReadinessResult r={readiness} />}
        </>
      ) : (
        <>
          <section style={S.io}>
            <div style={S.labelRow}>
              <span style={S.sectionLabel}>▸ HOW YOUR TEAM USES AI IN THE SDLC</span>
              <span style={S.hint}>select all that apply</span>
            </div>
            <div style={S.usageGrid}>
              {USAGE_KEYS.map((k) => {
                const v = AI_USAGE_VECTORS[k];
                const on = usages.includes(k);
                return (
                  <button key={k} style={{ ...S.usageCard, ...(on ? S.usageOn : {}) }} onClick={() => toggleUsage(k)}>
                    <div style={S.usageCheck}>{on ? '◉' : '○'}</div>
                    <div>
                      <div style={S.usageLabel}>{v.label}</div>
                      <div style={S.usageSurface}>{v.surface}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div style={S.govRow}>
              <span style={S.fieldLabel}>EXISTING AI GOVERNANCE MATURITY</span>
              <div style={S.answerBtns}>
                {['high', 'med', 'low'].map((g) => (
                  <button key={g} style={{ ...S.answerBtn, ...(governance === g ? S.govOn : {}) }} onClick={() => setGovernance(g)}>{g}</button>
                ))}
              </div>
            </div>
            <div style={S.controls}>
              <button style={{ ...S.btn, ...S.btnPrimary }} onClick={runRisk}>▸ PROFILE RISK</button>
              {risk && <button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={() => download('json')}>export JSON</button>}
            </div>
          </section>

          {risk && <RiskResult r={risk} />}
        </>
      )}

      {!embedded && (
        <footer style={S.foot}>
          <span>apexvector · av-05 · open source · free forever</span>
          <span style={{ color: 'var(--av-green-dim)' }}>github.com/DrXter/ApexVector-</span>
        </footer>
      )}
      {!embedded && (
        <p style={S.disclaimer}>
          A structured self-assessment, not a substitute for a full pipeline audit. It surfaces the
          AI-specific control gaps that generic DevSecOps tooling was never designed to catch — use it
          to prioritise where to look harder.
        </p>
      )}
    </div>
  );
}

const LEVEL_COLOR = { ready: '#00FF41', partial: '#F5A623', exposed: '#FF8C42', blind: '#FF4444' };
const TIER_COLOR = { limited: '#00FF41', moderate: '#F5A623', elevated: '#FF8C42', critical: '#FF4444' };

function ReadinessResult({ r }) {
  const c = LEVEL_COLOR[r.level];
  return (
    <div style={S.resultPanel}>
      <div style={S.verdictRow}>
        <div>
          <div style={{ ...S.verdict, color: c }}>{r.levelLabel}</div>
          <div style={S.note}>{r.levelNote}</div>
        </div>
        <div style={S.scoreCol}>
          <div style={{ ...S.scoreBig, color: c }}>{r.score}<span style={S.pct}>/100</span></div>
          <div style={S.scoreLabel}>AI READINESS</div>
        </div>
      </div>
      {r.topGaps.length > 0 && (
        <div style={S.block}>
          <div style={S.blockLabel}>▸ TOP GAPS TO CLOSE</div>
          {r.topGaps.map((g) => (
            <div key={g.id} style={S.gapRow}>
              <span style={{ ...S.gapSev, background: g.severity === 'open' ? '#FF444422' : '#F5A62322', color: g.severity === 'open' ? '#FF4444' : '#F5A623' }}>
                {g.severity}
              </span>
              <div>
                <span style={S.gapGroup}>{g.group}</span>
                <span style={S.gapText}>{g.gap}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RiskResult({ r }) {
  const c = TIER_COLOR[r.tier];
  return (
    <div style={S.resultPanel}>
      <div style={S.verdictRow}>
        <div>
          <div style={{ ...S.verdict, color: c }}>{r.tierLabel}</div>
          <div style={S.note}>governance: {r.governance}</div>
        </div>
        <div style={S.scoreCol}>
          <div style={{ ...S.scoreBig, color: c }}>{r.score}</div>
          <div style={S.scoreLabel}>AI ATTACK SURFACE</div>
        </div>
      </div>
      <div style={S.block}>
        <div style={S.blockLabel}>▸ SUMMARY</div>
        <p style={S.summary}>{r.summary}</p>
      </div>
      {r.surfaces.length > 0 && (
        <div style={S.block}>
          <div style={S.blockLabel}>▸ ATTACK SURFACE BY USAGE</div>
          {r.surfaces.map((s) => (
            <div key={s.id} style={S.surfaceCard}>
              <div style={S.surfaceHead}>{s.label}</div>
              <div style={S.surfaceDesc}>{s.surface}</div>
              <div style={S.riskChips}>
                {s.risks.map((rk) => <span key={rk} style={S.riskChip}>{rk}</span>)}
              </div>
              <div style={S.surfaceControl}><span style={S.k}>control:</span> {s.control}</div>
            </div>
          ))}
        </div>
      )}
      {r.priorityControls.length > 0 && (
        <div style={S.block}>
          <div style={S.blockLabel}>▸ PRIORITY CONTROLS (ORDERED BY SURFACE CLOSED)</div>
          <ol style={S.controlOl}>
            {r.priorityControls.map((ctrl, i) => <li key={i} style={S.controlLi}>{ctrl}</li>)}
          </ol>
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
  cursor: { color: 'var(--av-green, #00FF41)' },
  tagline: { fontSize: 14, color: 'var(--av-text-dim, #6A9A78)', maxWidth: 720, marginTop: 8, lineHeight: 1.6 },

  modeBar: { display: 'flex', background: 'var(--av-panel, #0A140D)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none' },
  tab: { flex: 1, background: 'transparent', border: 'none', borderBottom: '2px solid transparent', color: 'var(--av-text-dim, #6A9A78)', fontFamily: "'Courier New', monospace", fontSize: 12, padding: '14px 12px', cursor: 'pointer', letterSpacing: 1 },
  tabOn: { color: 'var(--av-green, #00FF41)', borderBottom: '2px solid var(--av-green, #00FF41)', background: 'var(--av-panel-2, #0E1A12)' },

  io: { background: 'var(--av-panel, #0A140D)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none', padding: 24 },
  labelRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 },
  sectionLabel: { fontSize: 12, color: 'var(--av-green, #00FF41)', letterSpacing: 2 },
  hint: { fontSize: 11, color: 'var(--av-faint, #3A6048)' },

  controlList: { display: 'flex', flexDirection: 'column', gap: 8 },
  controlRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '12px 14px', background: 'var(--av-bg, #0C0C0C)', border: '1px solid var(--av-border, #1A3D2A)', borderRadius: 6, flexWrap: 'wrap' },
  controlQ: { fontSize: 13, color: 'var(--av-text, #C8E6D0)', flex: 1, minWidth: 240, lineHeight: 1.5 },
  controlGroup: { display: 'inline-block', fontSize: 10, color: 'var(--av-green-dim, #2E8B4E)', letterSpacing: 1, marginRight: 10, textTransform: 'uppercase' },
  answerBtns: { display: 'flex', gap: 6 },
  answerBtn: { fontFamily: "'Courier New', monospace", fontSize: 11, padding: '6px 12px', borderRadius: 5, cursor: 'pointer', border: '1px solid var(--av-border, #1A3D2A)', background: 'transparent', color: 'var(--av-text-dim, #6A9A78)', letterSpacing: 1 },
  answerOn: {
    yes: { background: '#00FF4122', color: '#00FF41', borderColor: '#00FF41' },
    partial: { background: '#F5A62322', color: '#F5A623', borderColor: '#F5A623' },
    no: { background: '#FF444422', color: '#FF4444', borderColor: '#FF4444' },
  },
  govOn: { background: '#00FF4122', color: '#00FF41', borderColor: '#00FF41' },

  usageGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 },
  usageCard: { display: 'flex', gap: 12, alignItems: 'flex-start', textAlign: 'left', padding: '14px 16px', background: 'var(--av-bg, #0C0C0C)', border: '1px solid var(--av-border, #1A3D2A)', borderRadius: 8, cursor: 'pointer', fontFamily: "'Courier New', monospace" },
  usageOn: { borderColor: 'var(--av-green, #00FF41)', background: '#00FF410A' },
  usageCheck: { color: 'var(--av-green, #00FF41)', fontSize: 16, marginTop: 1 },
  usageLabel: { fontSize: 13, color: '#fff', marginBottom: 4 },
  usageSurface: { fontSize: 11, color: 'var(--av-text-dim, #6A9A78)', lineHeight: 1.4 },
  govRow: { marginTop: 18, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' },
  fieldLabel: { fontSize: 10, color: 'var(--av-faint, #3A6048)', letterSpacing: 1.5 },

  controls: { display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap', alignItems: 'center' },
  btn: { fontFamily: "'Courier New', monospace", fontSize: 13, padding: '11px 22px', borderRadius: 6, cursor: 'pointer', letterSpacing: 1, border: '1px solid var(--av-border-bright, #2A6B3E)' },
  btnPrimary: { background: 'var(--av-green, #00FF41)', color: '#041209', borderColor: 'var(--av-green, #00FF41)', fontWeight: 700 },
  btnGhost: { background: 'transparent', color: 'var(--av-text-dim, #6A9A78)' },
  small: { padding: '8px 14px', fontSize: 12 },

  resultPanel: { background: 'var(--av-panel, #0A140D)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: 24 },
  verdictRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, paddingBottom: 20, borderBottom: '1px solid var(--av-border, #1A3D2A)' },
  verdict: { fontSize: 28, fontWeight: 700, letterSpacing: -0.5 },
  note: { fontSize: 13, color: 'var(--av-text-dim, #6A9A78)', marginTop: 4, fontStyle: 'italic' },
  scoreCol: { textAlign: 'right' },
  scoreBig: { fontSize: 40, fontWeight: 700, lineHeight: 1 },
  pct: { fontSize: 18, color: 'var(--av-faint, #3A6048)' },
  scoreLabel: { fontSize: 10, color: 'var(--av-faint, #3A6048)', letterSpacing: 1.5, marginTop: 4 },

  block: { marginTop: 22 },
  blockLabel: { fontSize: 11, color: 'var(--av-green, #00FF41)', letterSpacing: 2, marginBottom: 12 },
  gapRow: { display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--av-border, #1A3D2A)' },
  gapSev: { fontSize: 10, padding: '2px 8px', borderRadius: 3, letterSpacing: 1, whiteSpace: 'nowrap', marginTop: 2 },
  gapGroup: { display: 'block', fontSize: 10, color: 'var(--av-green-dim, #2E8B4E)', letterSpacing: 1, marginBottom: 3, textTransform: 'uppercase' },
  gapText: { fontSize: 13, color: 'var(--av-text, #C8E6D0)', lineHeight: 1.5 },
  summary: { fontSize: 14, color: 'var(--av-text, #C8E6D0)', lineHeight: 1.7 },
  surfaceCard: { background: 'var(--av-bg, #0C0C0C)', border: '1px solid var(--av-border, #1A3D2A)', borderRadius: 8, padding: 16, marginBottom: 10 },
  surfaceHead: { fontSize: 14, color: '#fff', marginBottom: 4 },
  surfaceDesc: { fontSize: 12, color: 'var(--av-text-dim, #6A9A78)', marginBottom: 10, lineHeight: 1.5 },
  riskChips: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
  riskChip: { fontSize: 11, color: '#FF8C42', border: '1px solid #FF8C4233', borderRadius: 12, padding: '2px 10px' },
  surfaceControl: { fontSize: 12, color: 'var(--av-text-dim, #6A9A78)', lineHeight: 1.5 },
  k: { color: 'var(--av-faint, #3A6048)' },
  controlOl: { margin: 0, paddingLeft: 20 },
  controlLi: { fontSize: 13, color: 'var(--av-text, #C8E6D0)', lineHeight: 1.8 },

  foot: { marginTop: 28, paddingTop: 18, borderTop: '1px solid var(--av-border, #1A3D2A)', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--av-faint, #3A6048)', flexWrap: 'wrap', gap: 10 },
  disclaimer: { marginTop: 14, fontSize: 11, color: 'var(--av-faint, #3A6048)', lineHeight: 1.7 },
};
