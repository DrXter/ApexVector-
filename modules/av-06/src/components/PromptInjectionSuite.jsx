import React, { useState, useCallback } from 'react';
import { assessRobustness, getInjectionClasses } from '../engine/injection.js';
import { SAMPLE_PROMPT, HARDENED_EXAMPLE, exportJson } from '../data/sample.js';

/**
 * ApexVector · AV-06 · Prompt Injection Test Suite
 * Platform-mountable React module. Props: onResult?(result, mode) ; embedded?
 *
 * Defensive tool: tests YOUR OWN system prompt for hardening controls, and
 * catalogues the known injection classes with defenses. No payload generation.
 */
export default function PromptInjectionSuite({ onResult, embedded = false }) {
  const [mode, setMode] = useState('test');

  const [prompt, setPrompt] = useState(SAMPLE_PROMPT);
  const [hasTools, setHasTools] = useState(true);
  const [usesRetrieval, setUsesRetrieval] = useState(false);
  const [result, setResult] = useState(null);

  const classes = getInjectionClasses();

  const run = useCallback(() => {
    const r = assessRobustness(prompt, { hasTools, usesRetrieval });
    setResult(r); onResult?.(r, 'test');
  }, [prompt, hasTools, usesRetrieval, onResult]);

  const download = () => {
    if (!result) return;
    const blob = new Blob([exportJson(result)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'apexvector-av06-robustness.json'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={S.root}>
      {!embedded && (
        <>
          <div style={S.termBar}>
            <span style={S.dot} /><span style={S.dot} /><span style={S.dot} />
            <span style={S.termTitle}>apexvector — prompt-injection-suite — av-06</span>
          </div>
          <header style={S.header}>
            <div style={S.eyebrow}><span style={{ color: 'var(--av-red)' }}>APEXVECTOR</span> · AV-06 · SECURITY FOR AI</div>
            <h1 style={S.h1}>Prompt Injection Test Suite<span style={S.cursor}>_</span></h1>
            <p style={S.tagline}>
              Your LLM cannot tell the difference between your instructions and an attacker's — they
              arrive in the same context window. Robustness comes from the controls around the model,
              not from hoping it notices. Test your own system prompt, and learn the attack classes.
            </p>
            <div style={S.scopeNote}>
              ⚠ Defensive tool. It inspects a prompt <b>you own</b> for missing hardening controls and
              explains the threat model. It does not generate attacks against third-party systems.
            </div>
          </header>
        </>
      )}

      <div style={S.modeBar}>
        <button style={{ ...S.tab, ...(mode === 'test' ? S.tabOn : {}) }} onClick={() => setMode('test')}>▸ TEST MY PROMPT</button>
        <button style={{ ...S.tab, ...(mode === 'learn' ? S.tabOn : {}) }} onClick={() => setMode('learn')}>▸ INJECTION CLASSES</button>
      </div>

      {mode === 'test' ? (
        <>
          <section style={S.io}>
            <div style={S.labelRow}>
              <span style={S.sectionLabel}>▸ YOUR SYSTEM PROMPT</span>
              <span style={S.hint}>paste a prompt you own — checked locally, nothing leaves your browser</span>
            </div>
            <textarea style={S.textarea} spellCheck={false} value={prompt} onChange={(e) => setPrompt(e.target.value)}
              placeholder="Paste your system / instruction prompt here" />
            <div style={S.ctxRow}>
              <label style={S.check}>
                <input type="checkbox" checked={hasTools} onChange={(e) => setHasTools(e.target.checked)} />
                <span>drives an agent with tools / actions</span>
              </label>
              <label style={S.check}>
                <input type="checkbox" checked={usesRetrieval} onChange={(e) => setUsesRetrieval(e.target.checked)} />
                <span>summarises or retrieves external content</span>
              </label>
            </div>
            <div style={S.controls}>
              <button style={{ ...S.btn, ...S.btnPrimary }} onClick={run}>▸ TEST ROBUSTNESS</button>
              <button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={() => setPrompt(SAMPLE_PROMPT)}>sample</button>
              <button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={() => setPrompt(HARDENED_EXAMPLE)}>load hardened example</button>
              {result && <button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={download}>export JSON</button>}
            </div>
          </section>

          {result && <RobustnessResult r={result} />}
        </>
      ) : (
        <section style={S.io}>
          <div style={S.labelRow}>
            <span style={S.sectionLabel}>▸ KNOWN INJECTION CLASSES</span>
            <span style={S.hint}>OWASP LLM01 & public research — how each works, how to defend</span>
          </div>
          <div style={S.classList}>
            {classes.map((c) => <ClassCard key={c.id} c={c} />)}
          </div>
        </section>
      )}

      {!embedded && (
        <footer style={S.foot}>
          <span>apexvector · av-06 · security for ai · open source</span>
          <span style={{ color: 'var(--av-green-dim)' }}>github.com/DrXter/ApexVector-</span>
        </footer>
      )}
      {!embedded && (
        <p style={S.disclaimer}>
          A defensive heuristic, not a guarantee. It checks whether your prompt contains the *shape* of
          known hardening controls — real resilience requires live red-teaming, output-side validation,
          and controls outside the prompt. Prompt-level defenses are necessary but never sufficient.
        </p>
      )}
    </div>
  );
}

const LEVEL_COLOR = { hardened: '#00FF41', moderate: '#F5A623', weak: '#FF8C42', exposed: '#FF4444' };

function RobustnessResult({ r }) {
  const c = LEVEL_COLOR[r.level];
  if (r.empty) return <div style={S.resultPanel}><p style={S.emptyMsg}>Paste a system prompt above to test its robustness.</p></div>;
  return (
    <div style={S.resultPanel}>
      <div style={S.verdictRow}>
        <div>
          <div style={{ ...S.verdict, color: c }}>{r.levelLabel}</div>
          <div style={S.note}>{r.levelNote}</div>
        </div>
        <div style={S.scoreCol}>
          <div style={{ ...S.scoreBig, color: c }}>{r.score}<span style={S.pct}>/100</span></div>
          <div style={S.scoreLabel}>ROBUSTNESS</div>
        </div>
      </div>

      {r.present.length > 0 && (
        <div style={S.block}>
          <div style={S.blockLabel}>▸ CONTROLS DETECTED</div>
          <div style={S.chipRow}>
            {r.present.map((p) => <span key={p.id} style={S.okChip}>✓ {p.label}</span>)}
          </div>
        </div>
      )}

      {r.missing.length > 0 && (
        <div style={S.block}>
          <div style={S.blockLabel}>▸ MISSING CONTROLS</div>
          {r.missing.map((m) => (
            <div key={m.id} style={S.gapRow}>
              <span style={S.gapMark}>✗</span>
              <div>
                <div style={S.gapLabel}>{m.label}</div>
                <div style={S.gapNote}>{m.note}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {r.exposedClasses.length > 0 && (
        <div style={S.block}>
          <div style={S.blockLabel}>▸ EXPOSED TO THESE INJECTION CLASSES</div>
          {r.exposedClasses.map((cls) => (
            <div key={cls.id} style={S.exposedCard}>
              <div style={S.exposedHead}>
                <span style={S.exposedName}>{cls.name}</span>
                <span style={{ ...S.sevTag, color: cls.severity >= 80 ? '#FF4444' : cls.severity >= 60 ? '#F5A623' : '#6A9A78' }}>
                  severity {cls.severity}
                </span>
              </div>
              <div style={S.exposedIdea}>{cls.idea}</div>
              <div style={S.defenseLabel}>defend with:</div>
              <ul style={S.defenseList}>
                {cls.defenses.map((d, i) => <li key={i} style={S.defenseItem}>{d}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ClassCard({ c }) {
  const sevColor = c.severityPct >= 80 ? '#FF4444' : c.severityPct >= 60 ? '#F5A623' : '#6A9A78';
  return (
    <div style={S.classCard}>
      <div style={S.classHead}>
        <span style={S.className}>{c.name}</span>
        <span style={{ ...S.sevTag, color: sevColor }}>severity {c.severityPct}</span>
      </div>
      <div style={S.classIdea}>{c.idea}</div>
      <div style={S.classWhy}><span style={S.k}>why it works:</span> {c.why}</div>
      <div style={S.defenseLabel}>defenses:</div>
      <ul style={S.defenseList}>
        {c.defenses.map((d, i) => <li key={i} style={S.defenseItem}>{d}</li>)}
      </ul>
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
  scopeNote: { marginTop: 16, padding: '12px 16px', background: 'rgba(255,68,68,0.07)', borderLeft: '2px solid var(--av-red, #FF4444)', borderRadius: '0 6px 6px 0', fontSize: 12, color: '#FF8C8C', lineHeight: 1.6 },

  modeBar: { display: 'flex', background: 'var(--av-panel, #0A140D)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none' },
  tab: { flex: 1, background: 'transparent', border: 'none', borderBottom: '2px solid transparent', color: 'var(--av-text-dim, #6A9A78)', fontFamily: "'Courier New', monospace", fontSize: 12, padding: '14px 12px', cursor: 'pointer', letterSpacing: 1 },
  tabOn: { color: 'var(--av-green, #00FF41)', borderBottom: '2px solid var(--av-green, #00FF41)', background: 'var(--av-panel-2, #0E1A12)' },

  io: { background: 'var(--av-panel, #0A140D)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none', padding: 24 },
  labelRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 },
  sectionLabel: { fontSize: 12, color: 'var(--av-green, #00FF41)', letterSpacing: 2 },
  hint: { fontSize: 11, color: 'var(--av-faint, #3A6048)' },
  textarea: { width: '100%', minHeight: 150, background: 'var(--av-bg, #0C0C0C)', border: '1px solid var(--av-border, #1A3D2A)', borderRadius: 6, color: 'var(--av-text, #C8E6D0)', fontFamily: "'Courier New', monospace", fontSize: 13, padding: 14, resize: 'vertical', lineHeight: 1.6 },
  ctxRow: { display: 'flex', gap: 24, marginTop: 14, flexWrap: 'wrap' },
  check: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--av-text-dim, #6A9A78)', cursor: 'pointer' },
  controls: { display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap', alignItems: 'center' },
  btn: { fontFamily: "'Courier New', monospace", fontSize: 13, padding: '11px 22px', borderRadius: 6, cursor: 'pointer', letterSpacing: 1, border: '1px solid var(--av-border-bright, #2A6B3E)' },
  btnPrimary: { background: 'var(--av-green, #00FF41)', color: '#041209', borderColor: 'var(--av-green, #00FF41)', fontWeight: 700 },
  btnGhost: { background: 'transparent', color: 'var(--av-text-dim, #6A9A78)' },
  small: { padding: '8px 14px', fontSize: 12 },

  resultPanel: { background: 'var(--av-panel, #0A140D)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: 24 },
  emptyMsg: { color: 'var(--av-text-dim, #6A9A78)', fontSize: 13, textAlign: 'center', padding: 20 },
  verdictRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, paddingBottom: 20, borderBottom: '1px solid var(--av-border, #1A3D2A)' },
  verdict: { fontSize: 30, fontWeight: 700, letterSpacing: -0.5 },
  note: { fontSize: 13, color: 'var(--av-text-dim, #6A9A78)', marginTop: 4, fontStyle: 'italic', maxWidth: 520, lineHeight: 1.5 },
  scoreCol: { textAlign: 'right' },
  scoreBig: { fontSize: 40, fontWeight: 700, lineHeight: 1 },
  pct: { fontSize: 18, color: 'var(--av-faint, #3A6048)' },
  scoreLabel: { fontSize: 10, color: 'var(--av-faint, #3A6048)', letterSpacing: 1.5, marginTop: 4 },

  block: { marginTop: 22 },
  blockLabel: { fontSize: 11, color: 'var(--av-green, #00FF41)', letterSpacing: 2, marginBottom: 12 },
  chipRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  okChip: { fontSize: 12, color: '#00FF41', border: '1px solid #00FF4133', borderRadius: 12, padding: '3px 12px' },
  gapRow: { display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--av-border, #1A3D2A)' },
  gapMark: { color: '#FF4444', fontSize: 14, marginTop: 1 },
  gapLabel: { fontSize: 13, color: '#fff', marginBottom: 3 },
  gapNote: { fontSize: 12, color: 'var(--av-text-dim, #6A9A78)', lineHeight: 1.5 },

  exposedCard: { background: 'var(--av-bg, #0C0C0C)', border: '1px solid var(--av-border, #1A3D2A)', borderRadius: 8, padding: 16, marginBottom: 10 },
  exposedHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 8 },
  exposedName: { fontSize: 14, color: '#fff' },
  sevTag: { fontSize: 11, letterSpacing: 1 },
  exposedIdea: { fontSize: 12, color: 'var(--av-text-dim, #6A9A78)', marginBottom: 10, lineHeight: 1.5 },
  defenseLabel: { fontSize: 10, color: 'var(--av-green-dim, #2E8B4E)', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
  defenseList: { margin: 0, paddingLeft: 18 },
  defenseItem: { fontSize: 12, color: 'var(--av-text, #C8E6D0)', lineHeight: 1.7 },

  classList: { display: 'flex', flexDirection: 'column', gap: 12 },
  classCard: { background: 'var(--av-bg, #0C0C0C)', border: '1px solid var(--av-border, #1A3D2A)', borderRadius: 8, padding: 18 },
  classHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 },
  className: { fontSize: 15, color: '#fff', fontWeight: 700 },
  classIdea: { fontSize: 13, color: 'var(--av-text, #C8E6D0)', marginBottom: 8, lineHeight: 1.6 },
  classWhy: { fontSize: 12, color: 'var(--av-text-dim, #6A9A78)', marginBottom: 12, lineHeight: 1.6 },
  k: { color: 'var(--av-faint, #3A6048)' },

  foot: { marginTop: 28, paddingTop: 18, borderTop: '1px solid var(--av-border, #1A3D2A)', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--av-faint, #3A6048)', flexWrap: 'wrap', gap: 10 },
  disclaimer: { marginTop: 14, fontSize: 11, color: 'var(--av-faint, #3A6048)', lineHeight: 1.7 },
};
