import React, { useState, useCallback, useMemo } from 'react';
import { assessCadenceGap, DAYS, DECISIONS } from '../engine/cadence.js';
import { SAMPLE_GCC, exportBundleJson, exportBundleMarkdown, exportPrompt } from '../data/sample.js';

const BAND_COLOR = { photograph: '#FF4444', wide: '#FF8C42', narrowing: '#F5A623', tight: '#00FF41' };

const toForm = (g) => ({
  name: g.name,
  releasesPerMonth: String(g.releasesPerMonth),
  surfacePct: String(Math.round(g.surfaceShare * 100)),
  testsPerYear: String(g.testsPerYear),
  parentTestsPerYear: String(g.parentTestsPerYear),
  tolerancePct: String(Math.round(g.tolerance * 100)),
});

const fromForm = (f) => ({
  releasesPerMonth: f.releasesPerMonth,
  testsPerYear: f.testsPerYear,
  surfaceShare: f.surfacePct === '' ? '' : Number(f.surfacePct) / 100,
  parentTestsPerYear: f.parentTestsPerYear,
  tolerance: f.tolerancePct === '' ? '' : Number(f.tolerancePct) / 100,
});

function download(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/**
 * ApexVector · AV-11 · Pentest Cadence Gap Calculator
 * Platform-mountable React module. Props: onResult?(result) ; embedded?
 */
export default function CadenceGapCalculator({ onResult, embedded = false }) {
  const [form, setForm] = useState(toForm(SAMPLE_GCC));
  const [result, setResult] = useState(null);
  const [decision, setDecision] = useState('pending');
  const [copied, setCopied] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const run = useCallback(() => {
    const r = assessCadenceGap(fromForm(form));
    setResult(r); setDecision('pending'); onResult?.(r);
  }, [form, onResult]);

  const loadSample = () => { setForm(toForm(SAMPLE_GCC)); setResult(null); setDecision('pending'); };
  const system = form.name || 'this system';

  return (
    <div style={S.root}>
      {!embedded && (
        <>
          <div style={S.termBar}>
            <span style={S.dot} /><span style={S.dot} /><span style={S.dot} />
            <span style={S.termTitle}>apexvector — cadence-gap-calculator — av-11</span>
          </div>
          <header style={S.header}>
            <div style={S.eyebrow}><span style={{ color: 'var(--av-red)' }}>APEXVECTOR</span> · SEASON 2 · EPISODE 1 · AV-11 · AI-LED PENTEST FOR GCCs</div>
            <h1 style={S.h1}>Pentest Cadence Gap Calculator<span style={S.cursor}>_</span></h1>
            <p style={S.tagline}>
              Your annual pentest is a photograph of a river. It is accurate on the day it is taken and starts
              ageing at the next release that touches the attack surface. Enter how often you ship and how often
              you test. See how many days a year the running system is not the one anyone tested.
            </p>
          </header>
        </>
      )}

      <section style={S.io}>
        <div style={S.labelRow}>
          <span style={S.sectionLabel}>▸ YOUR RELEASE TRAIN AND TEST CADENCE</span>
          <span style={S.hint}>defaults are a synthetic GCC — replace with your numbers</span>
        </div>
        <input style={S.input} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="System name" />
        <div style={S.grid}>
          <Field label="Releases per month" hint="how often you ship to production" value={form.releasesPerMonth} onChange={(v) => set('releasesPerMonth', v)} />
          <Field label="Share that change the attack surface (%)" hint="new endpoints, auth, data flows, integrations" value={form.surfacePct} onChange={(v) => set('surfacePct', v)} />
          <Field label="Pentests per year" hint="how often you actually test" value={form.testsPerYear} onChange={(v) => set('testsPerYear', v)} />
          <Field label="Tests per year the parent requires" hint="0 if there is no requirement" value={form.parentTestsPerYear} onChange={(v) => set('parentTestsPerYear', v)} />
          <Field label="Tolerated untested share of year (%)" hint="used for the suggested cadence" value={form.tolerancePct} onChange={(v) => set('tolerancePct', v)} />
        </div>
        <div style={S.controls}>
          <button style={{ ...S.btn, ...S.btnPrimary }} onClick={run}>▸ CALCULATE THE GAP</button>
          <button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={loadSample}>sample GCC</button>
        </div>
      </section>

      {result && !result.ok && (
        <div style={S.errPanel}>
          {result.errors.map((e) => <div key={e} style={S.errRow}>▲ {e}</div>)}
        </div>
      )}

      {result && result.ok && (
        <Result r={result} system={system} decision={decision} setDecision={setDecision} copied={copied}
          onCopy={async () => {
            try { await navigator.clipboard.writeText(exportPrompt(result, decision, system)); setCopied('copied. paste it into your local model'); }
            catch { setCopied('copy blocked by the browser: use export Markdown instead'); }
          }}
          onJson={() => download(exportBundleJson(result, decision, system), 'apexvector-av11-cadence-gap.json', 'application/json')}
          onMd={() => download(exportBundleMarkdown(result, decision, system), 'apexvector-av11-cadence-gap.md', 'text/markdown')} />
      )}

      {!embedded && (
        <>
          <section style={S.notBox}>
            <div style={S.blockLabel}>▸ WHAT THIS TOOL IS NOT</div>
            <p style={S.notText}>
              It is arithmetic on the assumptions you enter, shown on screen. It does not predict breaches, it is not a
              compliance determination, and the cadence ladder is ApexVector's own rubric, not a standard. Which releases
              change the attack surface is your judgment, and it drives the result. Runs entirely in your browser; nothing is sent anywhere.
            </p>
          </section>
          <footer style={S.foot}>
            <span>apexvector · av-11 · season 2 · open source</span>
            <span style={{ color: 'var(--av-green-dim)' }}>github.com/DrXter/ApexVector-</span>
          </footer>
        </>
      )}
    </div>
  );
}

function Field({ label, hint, value, onChange }) {
  return (
    <label style={S.field}>
      <span style={S.fieldLabel}>{label}</span>
      <input style={S.numInput} inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} />
      <span style={S.fieldHint}>{hint}</span>
    </label>
  );
}

/** Illustrative timeline: tests and surface-changing releases at average phase. */
function RiverStrip({ r }) {
  const W = 1000, H = 86;
  const T = r.inputs.testsPerYear;
  const C = r.steps.surfaceChangingPerYear;
  const tPos = T > 0 && T <= 80 ? Array.from({ length: Math.round(T) }, (_, i) => ((i + 0.5) / Math.round(T)) * W) : [];
  const cN = Math.round(C);
  const cPos = cN > 0 && cN <= 160 ? Array.from({ length: cN }, (_, j) => ((j + 0.5) / cN) * W) : [];
  const spans = tPos.map((t, i) => {
    const nextTest = tPos[i + 1] ?? W;
    const nextChange = cPos.find((c) => c > t) ?? W;
    return { x: t, w: Math.max(2, Math.min(nextTest, nextChange) - t) };
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Year timeline: green where the running system matches a tested state, dark where it does not"
      style={{ width: '100%', height: 'auto', display: 'block' }}>
      <rect x="0" y="22" width={W} height="30" fill="#1b0d0d" stroke="#3a1a1a" />
      {spans.map((s, i) => <rect key={i} x={s.x} y="22" width={s.w} height="30" fill="#00FF41" opacity="0.55" />)}
      {cPos.map((c, i) => <line key={'c' + i} x1={c} x2={c} y1="14" y2="60" stroke="#F5A623" strokeWidth="1.5" />)}
      {tPos.map((t, i) => <path key={'t' + i} d={`M${t - 7} 76 L${t + 7} 76 L${t} 62 Z`} fill="#00FF41" />)}
      <text x="0" y="10" fill="#6A9A78" fontSize="12" fontFamily="'Courier New', monospace">JAN</text>
      <text x={W} y="10" textAnchor="end" fill="#6A9A78" fontSize="12" fontFamily="'Courier New', monospace">DEC</text>
    </svg>
  );
}

function Result({ r, system, decision, setDecision, onJson, onMd, onCopy, copied }) {
  const c = BAND_COLOR[r.band];
  const st = r.steps;
  const needText = Number.isFinite(r.suggested.testsPerYear) ? `${r.suggested.testsPerYear} tests a year` : 'more than 1,000 tests a year';
  const decided = decision !== 'pending';
  const cadenceGapPct = useMemo(() => r.parent.untestedPercentAtParentCadence, [r]);
  return (
    <div style={S.resultPanel}>
      <div style={S.verdictRow}>
        <div>
          <div style={{ ...S.verdict, color: c }}>{r.bandLabel}</div>
          <div style={S.note}>{system} — {r.bandNote}</div>
        </div>
        <div style={S.scoreCol}>
          <div style={{ ...S.scoreBig, color: c }}>{Math.round(r.untestedDays)}<span style={S.pct}> days</span></div>
          <div style={S.scoreLabel}>UNTESTED EXPOSURE PER YEAR</div>
        </div>
      </div>

      <div style={S.block}>
        <div style={S.blockLabel}>▸ THE RIVER VS THE PHOTOGRAPHS</div>
        <RiverStrip r={r} />
        <div style={S.legend}>
          <span><i style={{ ...S.sw, background: '#00FF41' }} /> test taken</span>
          <span><i style={{ ...S.sw, background: '#F5A623' }} /> release that changes the attack surface</span>
          <span><i style={{ ...S.sw, background: '#00FF4188' }} /> running system matches a tested state</span>
          <span style={{ color: 'var(--av-faint)' }}>illustrative, at average phase</span>
        </div>
        <div style={S.bar}>
          <div style={{ ...S.barCovered, width: `${r.coveragePercent}%` }} />
        </div>
        <div style={S.barLabels}><span>{r.coveragePercent}% of the year matches a tested state</span><span style={{ color: c }}>{r.untestedPercent}% does not</span></div>
      </div>

      <div style={S.block}>
        <div style={S.blockLabel}>▸ THE ARITHMETIC, SHOWN</div>
        <Step k="Releases per year" v={`${r.inputs.releasesPerMonth} × 12 = ${st.releasesPerYear}`} />
        <Step k="Releases that change the attack surface" v={`${st.releasesPerYear} × ${Math.round(r.inputs.surfaceShare * 100)}% = ${st.surfaceChangingPerYear} a year${st.spacingDays ? ` (one every ${st.spacingDays} days)` : ''}`} />
        <Step k="Test interval" v={st.testIntervalDays ? `365 ÷ ${r.inputs.testsPerYear} = ${st.testIntervalDays} days` : 'no tests, so none'} />
        <Step k="Average age of the last test on any given day" v={st.averageAgeOfLastTestDays !== null ? `${st.averageAgeOfLastTestDays} days` : 'the whole year'} />
        <Step k="Days a test stays valid, in total" v={`${r.coveredDays} days`} />
        <Step k="Untested exposure" v={`365 − ${r.coveredDays} = ${r.untestedDays} days (${r.untestedPercent}%)`} strong />
      </div>

      <div style={S.block}>
        <div style={S.blockLabel}>▸ GCC LENS: THE PARENT'S CYCLE VS YOUR RELEASE TRAIN</div>
        {r.parent.requiredTestsPerYear > 0 ? (
          <p style={S.para}>
            The parent requires {r.parent.requiredTestsPerYear} test{r.parent.requiredTestsPerYear === 1 ? '' : 's'} a year.
            You run {r.inputs.testsPerYear}: <b style={{ color: r.parent.met ? '#00FF41' : '#FF4444' }}>{r.parent.met ? 'requirement met' : `short by ${r.parent.shortfallTests}`}</b>.
            {' '}Meeting the parent's cadence and nothing more leaves <b style={{ color: c }}>{cadenceGapPct}%</b> of the year untested.
            Compliant on paper, exposed in practice.
          </p>
        ) : <p style={S.para}>No parent requirement entered. Enter one to compare the parent's assurance cycle with your release train.</p>}
      </div>

      <div style={S.block}>
        <div style={S.blockLabel}>▸ SUGGESTED CADENCE</div>
        <div style={S.tierRow}>
          <div style={{ ...S.tier, color: '#00FF41' }}>{r.suggested.tierLabel}</div>
          <div style={S.note}>to keep the untested share at or below {Math.round(r.suggested.toleranceUsed * 100)}%: {needText}. {r.suggested.tierNote}.</div>
        </div>
        <p style={S.para}>For reference, one test after every surface-changing release would be about {st.surfaceChangingPerYear} tests a year.</p>
      </div>

      <div style={{ ...S.block, ...S.gate }}>
        <div style={S.blockLabel}>▸ HUMAN GATE · RISK ACCEPTANCE</div>
        <p style={S.statement}>{r.statement.replace('this system', system)}</p>
        <div style={S.controls}>
          <button style={{ ...S.btn, ...(decision === 'accepted' ? S.btnAccepted : S.btnGhost) }} onClick={() => setDecision('accepted')}>ACCEPT THE RISK</button>
          <button style={{ ...S.btn, ...(decision === 'rejected' ? S.btnRejected : S.btnGhost) }} onClick={() => setDecision('rejected')}>REJECT: RAISE THE CADENCE</button>
          {decided && <button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={() => setDecision('pending')}>undo</button>}
        </div>
        <div style={S.decisionLine}>
          {decision === 'pending' && 'Decision: pending. The tool does not decide; a person does.'}
          {decision === 'accepted' && 'Decision: ACCEPTED. The exposure is owned by whoever accepted it, until the next test.'}
          {decision === 'rejected' && `Decision: REJECTED. Next step: move toward ${r.suggested.tierLabel.toLowerCase()} testing.`}
        </div>
      </div>

      <div style={S.controls}>
        <button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={onJson}>export JSON</button>
        <button style={{ ...S.btn, ...S.btnGhost, ...S.small }} onClick={onMd}>export Markdown for your LLM</button>
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
};
