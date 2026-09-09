import React, { useState, useCallback } from 'react';
import { assessOrgExposure, scoreTool, EXPOSURE_CONTROL_LIST, TOOL_CRITERIA } from '../engine/shadow.js';
import { SAMPLE_ORG, SAMPLE_TOOL, exportOrgJson, exportToolJson } from '../data/sample.js';

// option label sets for tool criteria
const TOOL_OPTIONS = {
  'data-sensitivity': [['high', 'high'], ['medium', 'medium'], ['low', 'low']],
  'trains-on-data': [['yes', 'yes'], ['unclear', 'unclear'], ['no', 'no']],
  'data-residency': [['unknown', 'unknown'], ['offshore', 'offshore'], ['compliant', 'compliant']],
  'access-scope': [['broad', 'broad'], ['moderate', 'moderate'], ['minimal', 'minimal']],
  'certifications': [['none', 'none'], ['claimed', 'claimed'], ['verified', 'verified']],
  'sanctioned': [['no', 'no'], ['pending', 'pending'], ['yes', 'yes']],
};

/**
 * ApexVector · AV-09 · Shadow AI Risk Scanner
 * Platform-mountable React module. Props: onResult?(result, mode) ; embedded?
 */
export default function ShadowAiScanner({ onResult, embedded = false }) {
  const [mode, setMode] = useState('org');

  const [orgAnswers, setOrgAnswers] = useState(SAMPLE_ORG);
  const [orgResult, setOrgResult] = useState(null);

  const [toolName, setToolName] = useState(SAMPLE_TOOL.name);
  const [toolAnswers, setToolAnswers] = useState(SAMPLE_TOOL.answers);
  const [toolResult, setToolResult] = useState(null);

  const setOrg = (id, v) => setOrgAnswers((a) => ({ ...a, [id]: v }));
  const setTool = (id, v) => setToolAnswers((a) => ({ ...a, [id]: v }));

  const runOrg = useCallback(() => {
    const r = assessOrgExposure(orgAnswers);
    setOrgResult(r); onResult?.(r, 'org');
  }, [orgAnswers, onResult]);

  const runTool = useCallback(() => {
    const r = scoreTool(toolAnswers, toolName);
    setToolResult(r); onResult?.(r, 'tool');
  }, [toolAnswers, toolName, onResult]);

  const download = () => {
    let content, name;
    if (mode === 'org' && orgResult) { content = exportOrgJson(orgResult); name = 'apexvector-av09-org-exposure.json'; }
    else if (mode === 'tool' && toolResult) { content = exportToolJson(toolResult); name = 'apexvector-av09-tool-risk.json'; }
    else return;
    const blob = new Blob([content], { type: 'application/json' });
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
            <span style={S.termTitle}>apexvector — shadow-ai-scanner — av-09</span>
          </div>
          <header style={S.header}>
            <div style={S.eyebrow}><span style={{ color: 'var(--av-red)' }}>APEXVECTOR</span> · AV-09 · SECURITY FOR AI</div>
            <h1 style={S.h1}>Shadow AI Risk Scanner<span style={S.cursor}>_</span></h1>
            <p style={S.tagline}>
              Your employees are already using AI tools you've never heard of — pasting data into models
              you've never vetted. Shadow AI is shadow IT's faster, hungrier cousin. The risk isn't the
              tools; it's the invisibility. Assess your org's exposure, or score a specific tool.
            </p>
          </header>
        </>
      )}

      <div style={S.modeBar}>
        <button style={{ ...S.tab, ...(mode === 'org' ? S.tabOn : {}) }} onClick={() => setMode('org')}>▸ ORG EXPOSURE</button>
        <button style={{ ...S.tab, ...(mode === 'tool' ? S.tabOn : {}) }} onClick={() => setMode('tool')}>▸ SCORE A TOOL</button>
      </div>

      {mode === 'org' ? (
        <>
          <section style={S.io}>
            <div style={S.labelRow}>
              <span style={S.sectionLabel}>▸ YOUR SHADOW-AI POSTURE</span>
              <span style={S.hint}>answer for your org — yes / partial / no</span>
            </div>
            <div style={S.controlList}>
              {EXPOSURE_CONTROL_LIST.map((c) => (
                <div key={c.id} style={S.controlRow}>
                  <div style={S.controlQ}><span style={S.cgroup}>{c.group}</span>{c.q}</div>
                  <div style={S.answerBtns}>
                    {['yes', 'partial', 'no'].map((v) => (
                      <button key={v} style={{ ...S.answerBtn, ...(orgAnswers[c.id] === v ? S.answerOn[v] : {}) }} onClick={() => setOrg(c.id, v)}>{v}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={S.controls}>
              <button style={{ ...S.btn, ...S.btnPrimary }} onClick={runOrg}>▸ ASSESS EXPOSURE</button>
              <button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={() => setOrgAnswers(SAMPLE_ORG)}>sample</button>
              {orgResult && <button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={download}>export JSON</button>}
            </div>
          </section>
          {orgResult && <OrgResult r={orgResult} />}
        </>
      ) : (
        <>
          <section style={S.io}>
            <div style={S.labelRow}>
              <span style={S.sectionLabel}>▸ SCORE A SPECIFIC AI TOOL</span>
              <span style={S.hint}>evaluate one tool / vendor</span>
            </div>
            <input style={S.input} value={toolName} onChange={(e) => setToolName(e.target.value)} placeholder="Tool / vendor name" />
            <div style={S.criteriaList}>
              {TOOL_CRITERIA.map((c) => (
                <div key={c.id} style={S.controlRow}>
                  <div style={S.controlQ}>{c.label}</div>
                  <div style={S.answerBtns}>
                    {TOOL_OPTIONS[c.id].map(([val, lbl]) => (
                      <button key={val} style={{ ...S.optBtn, ...(toolAnswers[c.id] === val ? S.optOn : {}) }} onClick={() => setTool(c.id, val)}>{lbl}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={S.controls}>
              <button style={{ ...S.btn, ...S.btnPrimary }} onClick={runTool}>▸ SCORE TOOL</button>
              <button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={() => { setToolName(SAMPLE_TOOL.name); setToolAnswers(SAMPLE_TOOL.answers); }}>sample</button>
              {toolResult && <button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={download}>export JSON</button>}
            </div>
          </section>
          {toolResult && <ToolResult r={toolResult} />}
        </>
      )}

      {!embedded && (
        <footer style={S.foot}>
          <span>apexvector · av-09 · security for ai · open source</span>
          <span style={{ color: 'var(--av-green-dim)' }}>github.com/DrXter/ApexVector-</span>
        </footer>
      )}
      {!embedded && (
        <p style={S.disclaimer}>
          A structured self-assessment, not a substitute for a full AI governance program. Shadow AI risk
          starts with discovery — you cannot govern what you cannot see — then policy, a sanctioned path,
          and data controls. Use this to prioritise where to start.
        </p>
      )}
    </div>
  );
}

const LEVEL_COLOR = { critical: '#FF4444', elevated: '#FF8C42', moderate: '#F5A623', managed: '#00FF41' };
const RATING_COLOR = { block: '#FF4444', review: '#FF8C42', caution: '#F5A623', low: '#00FF41' };

function OrgResult({ r }) {
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
          <div style={S.scoreLabel}>EXPOSURE</div>
        </div>
      </div>
      {r.actionPlan.length > 0 && (
        <div style={S.block}>
          <div style={S.blockLabel}>▸ PRIORITISED ACTION PLAN</div>
          {r.actionPlan.map((a) => (
            <div key={a.priority} style={S.actionRow}>
              <div style={{ ...S.actionNum, color: a.priority <= 3 ? '#FF4444' : 'var(--av-faint)' }}>{String(a.priority).padStart(2, '0')}</div>
              <div>
                <div style={S.actionGroup}><span style={S.cgroupInline}>{a.group}</span><span style={{ ...S.sevDot, color: a.severity === 'open' ? '#FF4444' : '#F5A623' }}>{a.severity}</span></div>
                <div style={S.actionText}>{a.action}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ToolResult({ r }) {
  const c = RATING_COLOR[r.rating];
  return (
    <div style={S.resultPanel}>
      <div style={S.verdictRow}>
        <div>
          <div style={{ ...S.verdict, color: c }}>{r.ratingLabel}</div>
          <div style={S.note}>{r.toolName} — {r.ratingNote}</div>
        </div>
        <div style={S.scoreCol}>
          <div style={{ ...S.scoreBig, color: c }}>{r.score}<span style={S.pct}>/100</span></div>
          <div style={S.scoreLabel}>TOOL RISK</div>
        </div>
      </div>
      {r.concerns.length > 0 && (
        <div style={S.block}>
          <div style={S.blockLabel}>▸ KEY CONCERNS TO RAISE</div>
          {r.concerns.map((con) => (
            <div key={con.id} style={S.concernRow}>
              <span style={S.concernMark}>▲</span>
              <span style={S.concernText}>{con.concern}</span>
            </div>
          ))}
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

  modeBar: { display: 'flex', background: 'var(--av-panel, #0A140D)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none' },
  tab: { flex: 1, background: 'transparent', border: 'none', borderBottom: '2px solid transparent', color: 'var(--av-text-dim, #6A9A78)', fontFamily: "'Courier New', monospace", fontSize: 12, padding: '14px 12px', cursor: 'pointer', letterSpacing: 1 },
  tabOn: { color: 'var(--av-green, #00FF41)', borderBottom: '2px solid var(--av-green, #00FF41)', background: 'var(--av-panel-2, #0E1A12)' },

  io: { background: 'var(--av-panel, #0A140D)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none', padding: 24 },
  labelRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 },
  sectionLabel: { fontSize: 12, color: 'var(--av-green, #00FF41)', letterSpacing: 2 },
  hint: { fontSize: 11, color: 'var(--av-faint, #3A6048)' },
  input: { width: '100%', background: 'var(--av-bg, #0C0C0C)', border: '1px solid var(--av-border, #1A3D2A)', borderRadius: 6, color: 'var(--av-text, #C8E6D0)', fontFamily: "'Courier New', monospace", fontSize: 13, padding: '12px 14px', marginBottom: 16 },
  controlList: { display: 'flex', flexDirection: 'column', gap: 8 },
  criteriaList: { display: 'flex', flexDirection: 'column', gap: 8 },
  controlRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '12px 14px', background: 'var(--av-bg, #0C0C0C)', border: '1px solid var(--av-border, #1A3D2A)', borderRadius: 6, flexWrap: 'wrap' },
  controlQ: { fontSize: 13, color: 'var(--av-text, #C8E6D0)', flex: 1, minWidth: 260, lineHeight: 1.5 },
  cgroup: { display: 'inline-block', fontSize: 10, color: 'var(--av-green-dim, #2E8B4E)', letterSpacing: 1, marginRight: 10, textTransform: 'uppercase' },
  answerBtns: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  answerBtn: { fontFamily: "'Courier New', monospace", fontSize: 11, padding: '6px 12px', borderRadius: 5, cursor: 'pointer', border: '1px solid var(--av-border, #1A3D2A)', background: 'transparent', color: 'var(--av-text-dim, #6A9A78)', letterSpacing: 1 },
  answerOn: {
    yes: { background: '#00FF4122', color: '#00FF41', borderColor: '#00FF41' },
    partial: { background: '#F5A62322', color: '#F5A623', borderColor: '#F5A623' },
    no: { background: '#FF444422', color: '#FF4444', borderColor: '#FF4444' },
  },
  optBtn: { fontFamily: "'Courier New', monospace", fontSize: 11, padding: '6px 12px', borderRadius: 5, cursor: 'pointer', border: '1px solid var(--av-border, #1A3D2A)', background: 'transparent', color: 'var(--av-text-dim, #6A9A78)' },
  optOn: { background: '#00FF4118', color: '#00FF41', borderColor: 'var(--av-border-bright, #2A6B3E)' },
  controls: { display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap', alignItems: 'center' },
  btn: { fontFamily: "'Courier New', monospace", fontSize: 13, padding: '11px 22px', borderRadius: 6, cursor: 'pointer', letterSpacing: 1, border: '1px solid var(--av-border-bright, #2A6B3E)' },
  btnPrimary: { background: 'var(--av-green, #00FF41)', color: '#041209', borderColor: 'var(--av-green, #00FF41)', fontWeight: 700 },
  btnGhost: { background: 'transparent', color: 'var(--av-text-dim, #6A9A78)' },
  small: { padding: '8px 14px', fontSize: 12 },

  resultPanel: { background: 'var(--av-panel, #0A140D)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: 24 },
  verdictRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, paddingBottom: 20, borderBottom: '1px solid var(--av-border, #1A3D2A)' },
  verdict: { fontSize: 26, fontWeight: 700, letterSpacing: -0.5 },
  note: { fontSize: 13, color: 'var(--av-text-dim, #6A9A78)', marginTop: 4, fontStyle: 'italic', maxWidth: 520, lineHeight: 1.5 },
  scoreCol: { textAlign: 'right' },
  scoreBig: { fontSize: 40, fontWeight: 700, lineHeight: 1 },
  pct: { fontSize: 18, color: 'var(--av-faint, #3A6048)' },
  scoreLabel: { fontSize: 10, color: 'var(--av-faint, #3A6048)', letterSpacing: 1.5, marginTop: 4 },
  block: { marginTop: 22 },
  blockLabel: { fontSize: 11, color: 'var(--av-green, #00FF41)', letterSpacing: 2, marginBottom: 12 },
  actionRow: { display: 'flex', gap: 14, alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid var(--av-border, #1A3D2A)' },
  actionNum: { fontSize: 20, fontWeight: 700, minWidth: 30 },
  actionGroup: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 },
  cgroupInline: { fontSize: 10, color: 'var(--av-green-dim, #2E8B4E)', letterSpacing: 1, textTransform: 'uppercase' },
  sevDot: { fontSize: 10, letterSpacing: 1 },
  actionText: { fontSize: 13, color: 'var(--av-text, #C8E6D0)', lineHeight: 1.5 },
  concernRow: { display: 'flex', gap: 10, alignItems: 'flex-start', padding: '9px 0', borderBottom: '1px solid var(--av-border, #1A3D2A)' },
  concernMark: { color: '#FF8C42', fontSize: 12, marginTop: 2 },
  concernText: { fontSize: 13, color: 'var(--av-text, #C8E6D0)', lineHeight: 1.5 },

  foot: { marginTop: 28, paddingTop: 18, borderTop: '1px solid var(--av-border, #1A3D2A)', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--av-faint, #3A6048)', flexWrap: 'wrap', gap: 10 },
  disclaimer: { marginTop: 14, fontSize: 11, color: 'var(--av-faint, #3A6048)', lineHeight: 1.7 },
};
