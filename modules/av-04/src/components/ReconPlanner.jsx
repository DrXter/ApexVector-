import React, { useState, useCallback, useMemo } from 'react';
import { buildPlan, SURFACE_TYPES, OBJECTIVES } from '../engine/recon.js';
import { SAMPLE_SCOPE, exportJson, exportCsv } from '../data/sample.js';

/**
 * ApexVector · AV-04 · Red Team Scope & Recon Planner
 * Platform-mountable React module.
 *
 * A planning aid for AUTHORIZED engagements: it prioritizes in-scope
 * surfaces and proposes tactic-level attack-path hypotheses. It does not
 * generate exploits or live attack instructions.
 *
 * Props: onResult?(plan) => void ; embedded?: boolean
 */
export default function ReconPlanner({ onResult, embedded = false }) {
  const [objective, setObjective] = useState('domain-dominance');
  const [timeboxDays, setTimeboxDays] = useState(14);
  const [stealth, setStealth] = useState(true);
  const [surfaces, setSurfaces] = useState(SAMPLE_SCOPE.surfaces);
  const [plan, setPlan] = useState(null);
  const [ack, setAck] = useState(false);

  const ctx = useMemo(() => ({ objective, timeboxDays, stealth }), [objective, timeboxDays, stealth]);

  const setSurface = (i, k, v) => setSurfaces((arr) => arr.map((s, idx) => (idx === i ? { ...s, [k]: v } : s)));
  const addSurface = () => setSurfaces((arr) => [...arr, { surface: 'external-web-app', exposure: 'med', hardening: 'med' }]);
  const removeSurface = (i) => setSurfaces((arr) => arr.filter((_, idx) => idx !== i));

  const run = useCallback(() => {
    const p = buildPlan(surfaces, ctx);
    setPlan(p);
    onResult?.(p);
  }, [surfaces, ctx, onResult]);

  const download = (kind) => {
    if (!plan) return;
    const content = kind === 'json' ? exportJson(plan) : exportCsv(plan);
    const blob = new Blob([content], { type: kind === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `apexvector-av04-recon-plan.${kind}`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={S.root}>
      {!embedded && (
        <>
          <div style={S.termBar}>
            <span style={S.dot} /><span style={S.dot} /><span style={S.dot} />
            <span style={S.termTitle}>apexvector — recon-planner — av-04</span>
          </div>
          <header style={S.header}>
            <div style={S.eyebrow}><span style={{ color: 'var(--av-green)' }}>APEXVECTOR</span> · AV-04 · AI FOR SECURITY</div>
            <h1 style={S.h1}>Red Team Recon Planner<span style={S.cursor}>_</span></h1>
            <p style={S.tagline}>
              Attackers break out in ~29 minutes. Your red team's hours are finite. This ranks your
              in-scope surface by foothold probability, aligns it to your objective, and proposes
              attack-path hypotheses to validate first — so limited time hits the highest-yield paths.
            </p>
            <div style={S.scopeNote}>
              ⚠ For AUTHORIZED, scoped engagements only. This is a planning and prioritization aid mapped
              to MITRE ATT&CK tactics — it produces methodology and sequencing, not exploits or attack code.
            </div>
          </header>
        </>
      )}

      {/* Authorization gate */}
      {!ack ? (
        <div style={S.gate}>
          <div style={S.gateLabel}>▸ SCOPE CONFIRMATION</div>
          <p style={S.gateText}>
            This planner is for red-team engagements you are explicitly authorized to conduct.
            It outputs prioritization and tactic-level hypotheses for lawful, scoped testing.
          </p>
          <label style={S.gateCheck}>
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
            <span>I confirm this is for an authorized engagement within an agreed scope.</span>
          </label>
        </div>
      ) : (
        <>
          {/* Engagement context */}
          <section style={S.io}>
            <div style={S.labelRow}>
              <span style={S.sectionLabel}>▸ ENGAGEMENT CONTEXT</span>
              <span style={S.hint}>objective and constraints shape the prioritization</span>
            </div>
            <div style={S.grid}>
              <Field label="OBJECTIVE">
                <select style={S.select} value={objective} onChange={(e) => setObjective(e.target.value)}>
                  {Object.entries(OBJECTIVES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </Field>
              <Field label={`TIMEBOX · ${timeboxDays} days`}>
                <input type="range" min="1" max="30" step="1" style={S.range}
                  value={timeboxDays} onChange={(e) => setTimeboxDays(Number(e.target.value))} />
              </Field>
              <Field label="STEALTH REQUIRED">
                <label style={S.check}>
                  <input type="checkbox" checked={stealth} onChange={(e) => setStealth(e.target.checked)} />
                  <span>penalize noisy surfaces</span>
                </label>
              </Field>
            </div>
          </section>

          {/* In-scope surfaces */}
          <section style={S.io2}>
            <div style={S.labelRow}>
              <span style={S.sectionLabel}>▸ IN-SCOPE SURFACES</span>
              <span style={S.hint}>only include what your rules of engagement authorize</span>
            </div>
            <div style={S.surfaceList}>
              {surfaces.map((s, i) => (
                <div key={i} style={S.surfaceRow}>
                  <select style={S.selectFlex} value={s.surface} onChange={(e) => setSurface(i, 'surface', e.target.value)}>
                    {SURFACE_TYPES.map((t) => <option key={t} value={t}>{t.replace(/-/g, ' ')}</option>)}
                  </select>
                  <MiniSelect label="exposure" value={s.exposure} onChange={(v) => setSurface(i, 'exposure', v)} />
                  <MiniSelect label="hardening" value={s.hardening} onChange={(v) => setSurface(i, 'hardening', v)} />
                  <button style={S.removeBtn} onClick={() => removeSurface(i)}>×</button>
                </div>
              ))}
            </div>
            <div style={S.controls}>
              <button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={addSurface}>+ add surface</button>
              <button style={{ ...S.btn, ...S.btnPrimary }} onClick={run}>▸ BUILD RECON PLAN</button>
              {plan && <>
                <button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={() => download('json')}>export JSON</button>
                <button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={() => download('csv')}>export CSV</button>
              </>}
            </div>
          </section>
        </>
      )}

      {plan && (
        <>
          <div style={S.resultsHeader}>
            <span style={S.count}>
              {plan.summary.count} surfaces prioritized ·
              <span style={{ color: 'var(--av-red)' }}> {plan.summary.byBand.primary} primary</span>,
              <span style={{ color: 'var(--av-amber)' }}> {plan.summary.byBand.secondary} secondary</span>
            </span>
            <span style={S.lead}>lead vector: {plan.summary.leadVector?.label}</span>
          </div>

          <div style={S.queue}>
            {plan.surfaces.map((s) => <SurfaceRow key={s.rank} s={s} />)}
          </div>

          {plan.attackPathHypotheses.length > 0 && (
            <div style={S.pathsPanel}>
              <div style={S.blockLabel}>▸ ATTACK-PATH HYPOTHESES TO VALIDATE</div>
              <p style={S.pathIntro}>
                Tactic-level chains to confirm or discard during the engagement — mapped to ATT&CK,
                sequenced toward your objective. Not step-by-step exploitation.
              </p>
              {plan.attackPathHypotheses.map((h, i) => (
                <div key={i} style={S.pathCard}>
                  <div style={S.pathEntry}>ENTRY · {h.entryVector}</div>
                  <div style={S.pathChain}>{h.hypothesis}</div>
                  <div style={S.pathValidate}><span style={S.k}>validate first:</span> {h.validateFirst}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!embedded && (
        <footer style={S.foot}>
          <span>apexvector · av-04 · open source · free forever</span>
          <span style={{ color: 'var(--av-green-dim)' }}>github.com/DrXter/ApexVector-</span>
        </footer>
      )}
      {!embedded && (
        <p style={S.disclaimer}>
          This is a planning aid for lawful, authorized, scoped security testing. It prioritizes effort
          and proposes tactic-level hypotheses mapped to MITRE ATT&CK — it does not generate exploits,
          payloads, or attack instructions. Always operate within your signed rules of engagement.
        </p>
      )}
    </div>
  );
}

function Field({ label, children }) { return <div><div style={S.fieldLabel}>{label}</div>{children}</div>; }
function MiniSelect({ label, value, onChange }) {
  return (
    <div style={S.miniWrap}>
      <span style={S.miniLabel}>{label}</span>
      <select style={S.miniSelect} value={value} onChange={(e) => onChange(e.target.value)}>
        {['high', 'med', 'low'].map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

const BAND_COLOR = { primary: '#FF4444', secondary: '#F5A623', tertiary: '#00FF41', informational: '#6A9A78' };

function SurfaceRow({ s }) {
  const c = BAND_COLOR[s.priority];
  return (
    <div style={S.row}>
      <div style={{ ...S.rank, color: s.rank === 1 ? 'var(--av-amber)' : 'var(--av-faint)' }}>{String(s.rank).padStart(2, '0')}</div>
      <div>
        <div style={S.rowTitle}>{s.label}</div>
        <div style={S.meta}>
          <span><span style={S.k}>tactic</span> {s.tactic}</span>
          <span><span style={S.k}>ATT&CK</span> {s.attackRef}</span>
        </div>
        <div style={S.focus}><span style={S.k}>recon focus:</span> {s.reconFocus}</div>
        <div style={S.rationale}>{s.rationale}</div>
      </div>
      <div style={S.scoreBox}>
        <div style={{ ...S.scoreNum, color: c }}>{s.score}</div>
        <span style={{ ...S.bandTag, background: `${c}22`, color: c }}>{s.priorityLabel}</span>
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
  scopeNote: { marginTop: 16, padding: '12px 16px', background: 'rgba(245,166,35,0.08)', borderLeft: '2px solid var(--av-amber, #F5A623)', borderRadius: '0 6px 6px 0', fontSize: 12, color: 'var(--av-amber, #F5A623)', lineHeight: 1.6 },

  gate: { background: 'var(--av-panel, #0A140D)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: 28 },
  gateLabel: { fontSize: 12, color: 'var(--av-green, #00FF41)', letterSpacing: 2, marginBottom: 12 },
  gateText: { fontSize: 13, color: 'var(--av-text-dim, #6A9A78)', lineHeight: 1.7, marginBottom: 16, maxWidth: 640 },
  gateCheck: { display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: 'var(--av-text, #C8E6D0)', cursor: 'pointer', lineHeight: 1.5 },

  io: { background: 'var(--av-panel, #0A140D)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none', padding: 24 },
  io2: { background: 'var(--av-panel, #0A140D)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none', padding: 24 },
  labelRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 },
  sectionLabel: { fontSize: 12, color: 'var(--av-green, #00FF41)', letterSpacing: 2 },
  hint: { fontSize: 11, color: 'var(--av-faint, #3A6048)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 },
  fieldLabel: { fontSize: 10, color: 'var(--av-faint, #3A6048)', letterSpacing: 1.5, marginBottom: 6 },
  select: { width: '100%', background: 'var(--av-bg, #0C0C0C)', border: '1px solid var(--av-border, #1A3D2A)', borderRadius: 6, color: 'var(--av-text, #C8E6D0)', fontFamily: "'Courier New', monospace", fontSize: 13, padding: '9px 10px' },
  range: { width: '100%', accentColor: '#00FF41' },
  check: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--av-text-dim, #6A9A78)', cursor: 'pointer', paddingTop: 6 },

  surfaceList: { display: 'flex', flexDirection: 'column', gap: 10 },
  surfaceRow: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  selectFlex: { flex: 1, minWidth: 180, background: 'var(--av-bg, #0C0C0C)', border: '1px solid var(--av-border, #1A3D2A)', borderRadius: 6, color: 'var(--av-text, #C8E6D0)', fontFamily: "'Courier New', monospace", fontSize: 13, padding: '9px 10px' },
  miniWrap: { display: 'flex', flexDirection: 'column', gap: 3 },
  miniLabel: { fontSize: 9, color: 'var(--av-faint, #3A6048)', letterSpacing: 1 },
  miniSelect: { background: 'var(--av-bg, #0C0C0C)', border: '1px solid var(--av-border, #1A3D2A)', borderRadius: 5, color: 'var(--av-text, #C8E6D0)', fontFamily: "'Courier New', monospace", fontSize: 12, padding: '6px 8px' },
  removeBtn: { background: 'transparent', border: '1px solid var(--av-border, #1A3D2A)', borderRadius: 5, color: 'var(--av-faint, #3A6048)', fontSize: 16, width: 32, height: 32, cursor: 'pointer', lineHeight: 1 },
  controls: { display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap', alignItems: 'center' },
  btn: { fontFamily: "'Courier New', monospace", fontSize: 13, padding: '11px 22px', borderRadius: 6, cursor: 'pointer', letterSpacing: 1, border: '1px solid var(--av-border-bright, #2A6B3E)' },
  btnPrimary: { background: 'var(--av-green, #00FF41)', color: '#041209', borderColor: 'var(--av-green, #00FF41)', fontWeight: 700 },
  btnGhost: { background: 'transparent', color: 'var(--av-text-dim, #6A9A78)' },
  small: { padding: '8px 14px', fontSize: 12 },

  resultsHeader: { background: 'var(--av-panel-2, #0E1A12)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  count: { fontSize: 13, color: 'var(--av-green, #00FF41)' },
  lead: { fontSize: 12, color: 'var(--av-amber, #F5A623)' },
  queue: { background: 'var(--av-panel, #0A140D)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none' },
  row: { display: 'grid', gridTemplateColumns: '54px 1fr 130px', gap: 16, padding: '16px 20px', borderBottom: '1px solid var(--av-border, #1A3D2A)', alignItems: 'start' },
  rank: { fontSize: 24, fontWeight: 700, textAlign: 'center' },
  rowTitle: { fontSize: 14, color: '#fff', marginBottom: 6 },
  meta: { display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11, color: 'var(--av-text-dim, #6A9A78)', marginBottom: 6 },
  k: { color: 'var(--av-faint, #3A6048)' },
  focus: { fontSize: 12, color: 'var(--av-text-dim, #6A9A78)', marginBottom: 6, lineHeight: 1.5 },
  rationale: { fontSize: 12, color: 'var(--av-text-dim, #6A9A78)', fontStyle: 'italic', lineHeight: 1.5 },
  scoreBox: { textAlign: 'right' },
  scoreNum: { fontSize: 26, fontWeight: 700, lineHeight: 1 },
  bandTag: { display: 'inline-block', fontSize: 9, padding: '2px 8px', borderRadius: 3, marginTop: 6, letterSpacing: 1 },

  pathsPanel: { background: 'var(--av-panel, #0A140D)', border: '1px solid var(--av-border, #1A3D2A)', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: 24 },
  blockLabel: { fontSize: 11, color: 'var(--av-green, #00FF41)', letterSpacing: 2, marginBottom: 10 },
  pathIntro: { fontSize: 12, color: 'var(--av-text-dim, #6A9A78)', lineHeight: 1.6, marginBottom: 16 },
  pathCard: { background: 'var(--av-bg, #0C0C0C)', border: '1px solid var(--av-border, #1A3D2A)', borderRadius: 8, padding: 16, marginBottom: 12 },
  pathEntry: { fontSize: 11, color: 'var(--av-amber, #F5A623)', letterSpacing: 1, marginBottom: 8 },
  pathChain: { fontSize: 14, color: '#fff', marginBottom: 8, lineHeight: 1.5 },
  pathValidate: { fontSize: 12, color: 'var(--av-text-dim, #6A9A78)', lineHeight: 1.5 },

  foot: { marginTop: 28, paddingTop: 18, borderTop: '1px solid var(--av-border, #1A3D2A)', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--av-faint, #3A6048)', flexWrap: 'wrap', gap: 10 },
  disclaimer: { marginTop: 14, fontSize: 11, color: 'var(--av-faint, #3A6048)', lineHeight: 1.7 },
};
