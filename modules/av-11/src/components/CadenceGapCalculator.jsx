import React, { useState, useMemo, useCallback } from 'react';
import {
  assessCadence, recordDecision, CADENCE_OPTIONS, LIMITS, ASSUMPTIONS,
} from '../engine/cadence.js';
import {
  SAMPLE_INPUTS, SAMPLE_PRESETS, exportCadenceJson, exportCadenceMarkdown,
} from '../data/sample.js';

/**
 * ApexVector · AV-11 · Pentest Cadence Gap Calculator
 * Platform-mountable React module. Props: onResult?(result) ; onDecision?(decision) ; embedded?
 */

const LEVEL_COLOR = {
  covered: 'var(--av-green)',
  drifting: 'var(--av-amber)',
  exposed: 'var(--av-red)',
  blind: 'var(--av-red)',
};

const font = "'JetBrains Mono','SF Mono',Menlo,Consolas,monospace";
const panel = { background: 'var(--av-panel)', border: '1px solid var(--av-border)', borderRadius: 6, padding: 16, marginBottom: 14 };
const label = { display: 'block', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--av-text-dim)', marginBottom: 6 };
const input = { width: '100%', background: 'var(--av-panel-2)', color: 'var(--av-text)', border: '1px solid var(--av-border)', borderRadius: 4, padding: '8px 10px', fontFamily: font, fontSize: 14 };
const btn = (primary, color) => ({
  background: primary ? (color || 'var(--av-green)') : 'transparent',
  color: primary ? '#0C0C0C' : (color || 'var(--av-green)'),
  border: `1px solid ${color || 'var(--av-green)'}`,
  borderRadius: 4, padding: '9px 14px', fontFamily: font, fontSize: 13, fontWeight: 700, cursor: 'pointer',
});

const FIELDS = [
  { key: 'releasesPerMonth', text: 'Releases per month', hint: 'All production releases.', step: 1, min: 0 },
  { key: 'attackSurfaceChangeShare', text: '% of releases that change the attack surface', hint: 'New endpoints, auth, data flows, integrations, infra.', step: 1, min: 0, max: 100 },
  { key: 'testsPerYear', text: 'Full-scope tests per year', hint: 'Pentests that cover the whole system.', step: 1, min: 0, max: 365 },
  { key: 'parentTestsPerYear', text: "Tests per year the parent requires (optional)", hint: "Your parent company's audit cycle. Leave blank if none.", step: 1, min: 0, max: 365 },
];

function download(content, name, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Collapse the 365 daily flags into runs so the strip stays light. */
function runs(flags) {
  const out = [];
  let start = 0;
  for (let i = 1; i <= flags.length; i++) {
    if (i === flags.length || flags[i] !== flags[start]) {
      out.push({ start, len: i - start, exposed: flags[start] });
      start = i;
    }
  }
  return out;
}

function Timeline({ result }) {
  const segs = useMemo(() => runs(result.timeline.exposed), [result]);
  return (
    <div role="img" aria-label={`Year strip: ${result.exposedDays} of 365 days exposed`}>
      <svg viewBox="0 0 365 34" preserveAspectRatio="none" style={{ width: '100%', height: 46, display: 'block' }}>
        {segs.map((s) => (
          <rect key={s.start} x={s.start} y={6} width={s.len} height={22} fill={s.exposed ? 'var(--av-red)' : 'var(--av-green-dim)'} fillOpacity={s.exposed ? 0.55 : 0.9} />
        ))}
        {result.timeline.testDays.map((d) => (
          <rect key={`t${d}`} x={d} y={0} width={1.4} height={34} fill="var(--av-green)" />
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--av-text-dim)', marginTop: 4 }}>
        <span>Day 1</span>
        <span><span style={{ color: 'var(--av-red)' }}>■</span> exposed · <span style={{ color: 'var(--av-green-dim)' }}>■</span> covered · <span style={{ color: 'var(--av-green)' }}>|</span> a test</span>
        <span>Day 365</span>
      </div>
    </div>
  );
}

function Ladder({ inputs, current }) {
  const rows = useMemo(() => CADENCE_OPTIONS.map((c) => {
    const r = assessCadence({ ...inputs, testsPerYear: c.testsPerYear });
    return { ...c, days: r.exposedDays };
  }), [inputs]);
  return (
    <div>
      {rows.map((r) => (
        <div key={r.testsPerYear} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 56px', gap: 8, alignItems: 'center', marginBottom: 5, fontSize: 12, color: r.testsPerYear === current ? 'var(--av-green)' : 'var(--av-text)' }}>
          <span>{r.label}{r.testsPerYear === current ? ' ◀ you' : ''}</span>
          <div style={{ background: 'var(--av-panel-2)', height: 10, borderRadius: 2 }}>
            <div style={{ width: `${(r.days / 365) * 100}%`, height: 10, borderRadius: 2, background: 'var(--av-red)', opacity: 0.6 }} />
          </div>
          <span style={{ textAlign: 'right' }}>{r.days} d</span>
        </div>
      ))}
    </div>
  );
}

export default function CadenceGapCalculator({ onResult, onDecision, embedded = false }) {
  const [inputs, setInputs] = useState(SAMPLE_INPUTS);
  const [gate, setGate] = useState({ owner: '', expiry: '', note: '' });
  const [decision, setDecision] = useState(null);
  const [gateErrors, setGateErrors] = useState([]);
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    const r = assessCadence(inputs);
    if (r.ok) onResult?.(r);
    return r;
  }, [inputs, onResult]);

  const setField = (key, value) => {
    setInputs((i) => ({ ...i, [key]: value }));
    setDecision(null); setGateErrors([]); // a decision belongs to the numbers it was made on
  };

  const choosePreset = (id) => {
    const p = SAMPLE_PRESETS.find((x) => x.id === id);
    if (p) { setInputs(p.inputs); setDecision(null); setGateErrors([]); }
  };

  const decide = useCallback((choice) => {
    if (!result.ok) return;
    const rec = recordDecision(result, { decision: choice, ...gate });
    if (!rec.ok) { setGateErrors(rec.errors); return; }
    setGateErrors([]); setDecision(rec.decision); onDecision?.(rec.decision);
  }, [result, gate, onDecision]);

  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(exportCadenceMarkdown(result, decision));
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    } catch { setCopied(false); }
  };

  return (
    <div style={{ fontFamily: font, color: 'var(--av-text)', maxWidth: 860, margin: '0 auto' }}>
      {!embedded && (
        <header style={{ marginBottom: 18 }}>
          <div style={{ color: 'var(--av-green)', fontSize: 12, letterSpacing: '0.12em' }}>APEXVECTOR · AV-11 · SEASON 2 · EPISODE 1</div>
          <h1 style={{ fontSize: 24, margin: '6px 0', color: 'var(--av-text)' }}>Pentest Cadence Gap Calculator</h1>
          <p style={{ color: 'var(--av-text-dim)', fontSize: 14, lineHeight: 1.5 }}>
            Your annual pentest is a photograph of a river. This puts a number on how many days a year the live system is not the one you tested.
          </p>
        </header>
      )}

      <section style={panel} aria-label="Inputs">
        <label style={label} htmlFor="av11-preset">Start from a synthetic GCC</label>
        <select id="av11-preset" style={{ ...input, marginBottom: 14 }} onChange={(e) => choosePreset(e.target.value)} defaultValue="gcc-captive">
          {SAMPLE_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 14 }}>
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label style={label} htmlFor={`av11-${f.key}`}>{f.text}</label>
              <input id={`av11-${f.key}`} style={input} type="number" inputMode="decimal" step={f.step} min={f.min} max={f.max}
                value={inputs[f.key] ?? ''} onChange={(e) => setField(f.key, e.target.value)} />
              <div style={{ fontSize: 11, color: 'var(--av-faint)', marginTop: 4 }}>{f.hint}</div>
            </div>
          ))}
        </div>
      </section>

      {!result.ok && (
        <section style={{ ...panel, borderColor: 'var(--av-red)' }} role="alert">
          {result.errors.map((e) => <div key={e} style={{ color: 'var(--av-red)', fontSize: 13 }}>{e}</div>)}
        </section>
      )}

      {result.ok && (
        <>
          <section style={panel} aria-label="Result">
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 46, fontWeight: 800, color: LEVEL_COLOR[result.level.key], lineHeight: 1 }}>
                {result.exposedDays}<span style={{ fontSize: 18, color: 'var(--av-text-dim)' }}> / 365 days</span>
              </div>
              <div>
                <div style={{ color: LEVEL_COLOR[result.level.key], fontWeight: 700, letterSpacing: '0.1em' }}>{result.level.label}</div>
                <div style={{ color: 'var(--av-text-dim)', fontSize: 12 }}>{result.exposedShare}% of the year the live system differs from the last tested one</div>
              </div>
            </div>
            <Timeline result={result} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 10, marginTop: 14, fontSize: 13 }}>
              <div><span style={{ color: 'var(--av-text-dim)' }}>Surface changes / year</span><br />{result.changesPerYear}</div>
              <div><span style={{ color: 'var(--av-text-dim)' }}>Days between tests</span><br />{result.testIntervalDays ?? 'no testing'}</div>
              <div><span style={{ color: 'var(--av-text-dim)' }}>Changes per test</span><br />{result.changesPerTest ?? 'n/a'}</div>
            </div>
            {result.parent && (
              <div style={{ marginTop: 14, fontSize: 13, padding: 10, border: `1px solid ${result.parent.compliantButExposed || !result.parent.meets ? 'var(--av-amber)' : 'var(--av-border)'}`, borderRadius: 4 }}>
                {result.parent.meets
                  ? `Parent requirement met (${result.parent.requiredTestsPerYear} a year).${result.parent.compliantButExposed ? ' Compliant, and still exposed most of the year.' : ''}`
                  : `Below the parent requirement of ${result.parent.requiredTestsPerYear} a year (short by ${result.parent.shortfallTestsPerYear}).`}
              </div>
            )}
          </section>

          <section style={panel} aria-label="Cadence comparison">
            <div style={label}>Exposed days at each cadence, same release rate</div>
            <Ladder inputs={result.inputs} current={result.inputs.testsPerYear} />
            <div style={{ fontSize: 12, color: 'var(--av-text-dim)', marginTop: 10 }}>
              Suggested: <span style={{ color: 'var(--av-green)' }}>{result.suggested.label} ({result.suggested.testsPerYear} a year)</span> → {result.suggested.exposedDays} exposed days. {result.suggested.note}
            </div>
          </section>

          <section style={{ ...panel, borderColor: 'var(--av-amber)' }} aria-label="Decision gate">
            <div style={{ ...label, color: 'var(--av-amber)' }}>Decision gate · a person has to decide</div>
            <blockquote style={{ margin: '0 0 14px', paddingLeft: 12, borderLeft: '3px solid var(--av-amber)', fontSize: 14, lineHeight: 1.55 }}>
              {result.acceptanceStatement}
            </blockquote>
            {decision ? (
              <div role="status" style={{ border: '1px solid var(--av-border-bright)', borderRadius: 4, padding: 12, fontSize: 13 }}>
                <div style={{ color: decision.decision === 'accept' ? 'var(--av-amber)' : 'var(--av-green)', fontWeight: 700 }}>
                  {decision.decision === 'accept' ? 'GAP ACCEPTED' : 'GAP REJECTED'}
                </div>
                {decision.owner && <div>Owner: {decision.owner}</div>}
                {decision.expiry && <div>Review by: {decision.expiry}</div>}
                {decision.note && <div>Note: {decision.note}</div>}
                <div style={{ color: 'var(--av-text-dim)', marginTop: 6 }}>Included in the downloads below. Changing any number clears this decision.</div>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={label} htmlFor="av11-owner">Owner (to accept)</label>
                    <input id="av11-owner" style={input} value={gate.owner} onChange={(e) => setGate({ ...gate, owner: e.target.value })} placeholder="Name and role" />
                  </div>
                  <div>
                    <label style={label} htmlFor="av11-expiry">Review by (to accept)</label>
                    <input id="av11-expiry" style={input} type="date" value={gate.expiry} onChange={(e) => setGate({ ...gate, expiry: e.target.value })} />
                  </div>
                  <div>
                    <label style={label} htmlFor="av11-note">Note (optional)</label>
                    <input id="av11-note" style={input} value={gate.note} onChange={(e) => setGate({ ...gate, note: e.target.value })} />
                  </div>
                </div>
                {gateErrors.length > 0 && (
                  <div role="alert" style={{ marginBottom: 10 }}>
                    {gateErrors.map((e) => <div key={e} style={{ color: 'var(--av-red)', fontSize: 12 }}>{e}</div>)}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button type="button" style={btn(true, 'var(--av-amber)')} onClick={() => decide('accept')}>Accept the gap</button>
                  <button type="button" style={btn(false)} onClick={() => decide('reject')}>Reject it</button>
                </div>
              </>
            )}
          </section>

          <section style={panel} aria-label="Export for an LLM">
            <div style={label}>Take it with you · feed it to your own LLM</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" style={btn(true)} onClick={() => download(exportCadenceJson(result, decision), 'apexvector-av11-cadence-gap.json', 'application/json')}>Download JSON</button>
              <button type="button" style={btn(false)} onClick={() => download(exportCadenceMarkdown(result, decision), 'apexvector-av11-cadence-gap.md', 'text/markdown')}>Download Markdown</button>
              <button type="button" style={btn(false)} onClick={copyMarkdown}>{copied ? 'Copied' : 'Copy as prompt text'}</button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--av-faint)', marginTop: 8 }}>Generated in your browser. Nothing is sent anywhere.</div>
          </section>
        </>
      )}

      <section style={{ ...panel, background: 'transparent' }} aria-label="What this is not">
        <div style={label}>What this is not</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--av-text-dim)', lineHeight: 1.6 }}>
          {LIMITS.map((l) => <li key={l}>{l}</li>)}
        </ul>
        <details style={{ marginTop: 10, fontSize: 12, color: 'var(--av-text-dim)' }}>
          <summary style={{ cursor: 'pointer' }}>How the number is calculated</summary>
          <ul style={{ paddingLeft: 18, lineHeight: 1.6 }}>{ASSUMPTIONS.map((a) => <li key={a}>{a}</li>)}</ul>
        </details>
        <div style={{ fontSize: 11, color: 'var(--av-faint)', marginTop: 8 }}>The sample GCC is synthetic. Enter your own numbers to see yours.</div>
      </section>
    </div>
  );
}
