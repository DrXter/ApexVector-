/**
 * ApexVector · AV-04 · Red Team Scope & Recon Planner
 * Framework-agnostic planning engine — no UI, no DOM.
 *
 * Produces a PRIORITIZED RECON & ATTACK-PATH PLAN for an AUTHORIZED,
 * scoped red-team engagement. This is a planning and methodology aid:
 * it decides *where to focus effort first* and *what path hypotheses to
 * validate*, mapped to MITRE ATT&CK tactics — it does NOT generate exploits,
 * payloads, or live attack instructions.
 *
 * The value is sequencing: attackers break out in ~29 minutes; a red team's
 * time is finite. This ranks the surface so limited hours hit the highest-
 * probability paths first.
 */

export const ENGINE_VERSION = '1.0.0';
export const MODULE_ID = 'av-04';

/** Priority bands for recon targets, 0–100. */
export const PRIORITY_BANDS = Object.freeze([
  { id: 'primary',   label: 'PRIMARY VECTOR',   min: 68, guidance: 'lead here — highest probability path' },
  { id: 'secondary', label: 'SECONDARY',        min: 45, guidance: 'pursue in parallel if time allows' },
  { id: 'tertiary',  label: 'TERTIARY',         min: 25, guidance: 'note and revisit — lower yield' },
  { id: 'informational', label: 'INFORMATIONAL', min: 0, guidance: 'context only — document, don’t chase' },
]);

/**
 * Surface catalog. Each entry is a class of external-facing or internal
 * surface a scoped engagement might include, with its typical yield,
 * effort, and the ATT&CK tactic it tends to serve. Weights reflect how
 * often the surface produces an initial foothold in real engagements.
 */
const SURFACE_CATALOG = {
  'external-web-app': {
    label: 'External web application', yield: 0.8, effort: 0.5, noise: 0.4,
    tactic: 'Initial Access (TA0001)', attack: 'T1190 Exploit Public-Facing App',
    focus: 'auth flows, session handling, input trust boundaries, exposed admin paths',
  },
  'exposed-api': {
    label: 'Exposed API / microservice', yield: 0.78, effort: 0.5, noise: 0.35,
    tactic: 'Initial Access (TA0001)', attack: 'T1190 / T1133',
    focus: 'authz gaps, object-level access, undocumented endpoints, token handling',
  },
  'vpn-remote-access': {
    label: 'VPN / remote access', yield: 0.72, effort: 0.55, noise: 0.5,
    tactic: 'Initial Access (TA0001)', attack: 'T1133 External Remote Services',
    focus: 'known-CVE appliances, credential spray exposure, MFA coverage gaps',
  },
  'email-phishing': {
    label: 'Email / phishing surface', yield: 0.75, effort: 0.4, noise: 0.6,
    tactic: 'Initial Access (TA0001)', attack: 'T1566 Phishing',
    focus: 'inbound filtering, user-report rates, pretext viability (authorized sim only)',
  },
  'cloud-console': {
    label: 'Cloud control plane', yield: 0.7, effort: 0.65, noise: 0.4,
    tactic: 'Privilege Escalation (TA0004)', attack: 'T1078 Valid Accounts',
    focus: 'over-permissioned roles, exposed metadata, public storage, key hygiene',
  },
  'identity-provider': {
    label: 'Identity provider / SSO', yield: 0.74, effort: 0.6, noise: 0.35,
    tactic: 'Credential Access (TA0006)', attack: 'T1556 Modify Auth Process',
    focus: 'federation trust, token lifetimes, conditional-access gaps, legacy auth',
  },
  'ad-internal': {
    label: 'Active Directory (internal)', yield: 0.82, effort: 0.6, noise: 0.45,
    tactic: 'Lateral Movement (TA0008)', attack: 'T1550 / T1210',
    focus: 'kerberoastable accounts, delegation, cred reuse, tiering violations',
  },
  'endpoint-fleet': {
    label: 'Endpoint fleet', yield: 0.6, effort: 0.55, noise: 0.55,
    tactic: 'Execution (TA0002)', attack: 'T1204 / T1059',
    focus: 'EDR coverage gaps, local admin sprawl, unmanaged devices',
  },
  'supply-chain-vendor': {
    label: 'Third-party / vendor access', yield: 0.68, effort: 0.7, noise: 0.3,
    tactic: 'Initial Access (TA0001)', attack: 'T1195 Supply Chain',
    focus: 'vendor VPN tunnels, shared credentials, trust relationships',
  },
  'wireless-physical': {
    label: 'Wireless / physical', yield: 0.5, effort: 0.75, noise: 0.5,
    tactic: 'Initial Access (TA0001)', attack: 'T1200 Hardware / T1078',
    focus: 'rogue AP viability, badge cloning, tailgating (authorized scope only)',
  },
};

export const SURFACE_TYPES = Object.keys(SURFACE_CATALOG);

/** Engagement objective shifts which tactics get weighted up. */
export const OBJECTIVES = {
  'initial-access':    { label: 'Establish initial foothold', boosts: ['Initial Access (TA0001)'] },
  'domain-dominance':  { label: 'Domain / privilege dominance', boosts: ['Lateral Movement (TA0008)', 'Privilege Escalation (TA0004)', 'Credential Access (TA0006)'] },
  'data-objective':    { label: 'Reach a specific data asset', boosts: ['Initial Access (TA0001)', 'Lateral Movement (TA0008)'] },
  'assumed-breach':    { label: 'Assumed-breach / post-exploitation', boosts: ['Lateral Movement (TA0008)', 'Execution (TA0002)', 'Privilege Escalation (TA0004)'] },
};

const clamp = (n, lo = 0, hi = 1) => Math.min(Math.max(n, lo), hi);
const level = (v) => ({ high: 0.9, med: 0.55, low: 0.2 }[v] ?? 0.55);

/**
 * Score one in-scope surface for recon priority.
 * @param {Object} s
 * @param {string} s.surface       key in SURFACE_CATALOG
 * @param {string} s.exposure      high|med|low  (how reachable in this engagement)
 * @param {string} s.hardening     high|med|low  (defensive maturity — inverse weight)
 * @param {Object} ctx
 * @param {string} ctx.objective   key in OBJECTIVES
 * @param {number} ctx.timeboxDays engagement length — compresses effort tolerance
 * @param {boolean} ctx.stealth    stealth required — penalizes noisy surfaces
 */
export function scoreSurface(s, ctx) {
  const cat = SURFACE_CATALOG[s.surface] ? s.surface : 'external-web-app';
  const c = SURFACE_CATALOG[cat];
  const obj = OBJECTIVES[ctx.objective] || OBJECTIVES['initial-access'];

  const exposure = level(s.exposure);
  const hardening = level(s.hardening);

  // base yield adjusted by how reachable it is and how well defended
  let score = c.yield * 0.45 + exposure * 0.30 - hardening * 0.20;

  // objective alignment boost
  if (obj.boosts.includes(c.tactic)) score += 0.15;

  // short timebox rewards low-effort surfaces
  const timebox = clamp((Number(ctx.timeboxDays) || 10) / 20);
  score += (1 - c.effort) * (1 - timebox) * 0.12;

  // stealth requirement penalizes noisy surfaces
  if (ctx.stealth) score -= c.noise * 0.18;

  score = clamp(score);
  const val = Math.round(score * 100);
  const band = PRIORITY_BANDS.find((b) => val >= b.min) ?? PRIORITY_BANDS.at(-1);

  return {
    surface: cat,
    label: c.label,
    score: val,
    priority: band.id,
    priorityLabel: band.label,
    guidance: band.guidance,
    tactic: c.tactic,
    attackRef: c.attack,
    reconFocus: c.focus,
    exposure: s.exposure,
    hardening: s.hardening,
    rationale: buildRationale(c, s, obj, ctx, band),
  };
}

function buildRationale(c, s, obj, ctx, band) {
  const parts = [];
  if (c.yield >= 0.75) parts.push('historically high foothold yield');
  if (s.exposure === 'high') parts.push('highly reachable in scope');
  if (s.hardening === 'low') parts.push('limited defensive maturity');
  if (s.hardening === 'high') parts.push('well-defended — expect friction');
  if (obj.boosts.includes(c.tactic)) parts.push(`aligns with objective: ${obj.label.toLowerCase()}`);
  if (ctx.stealth && c.noise >= 0.5) parts.push('noisy — risks detection under stealth constraint');
  return `${parts.join(', ')} \u2192 ${band.guidance}.`;
}

/**
 * Build a full prioritized recon plan across in-scope surfaces.
 * Returns ranked surfaces plus a suggested attack-path hypothesis chain.
 */
export function buildPlan(surfaces, ctx) {
  const scored = surfaces
    .map((s) => scoreSurface(s, ctx))
    .sort((a, b) => b.score - a.score)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  return {
    ctx,
    surfaces: scored,
    attackPathHypotheses: buildPaths(scored, ctx),
    summary: summarize(scored),
  };
}

/**
 * Generate attack-path HYPOTHESES — sequences of tactics to validate,
 * expressed at the ATT&CK-tactic level (not step-by-step exploitation).
 * These are hypotheses a red team confirms or discards during the engagement.
 */
function buildPaths(scored, ctx) {
  const primary = scored.filter((s) => s.priority === 'primary').slice(0, 3);
  const obj = OBJECTIVES[ctx.objective] || OBJECTIVES['initial-access'];

  if (primary.length === 0) return [];

  return primary.map((entry) => {
    const chain = [`${entry.label} → ${entry.tactic}`];
    // append plausible follow-on tactics toward the objective
    if (ctx.objective === 'domain-dominance' || ctx.objective === 'assumed-breach') {
      chain.push('Credential Access (TA0006)');
      chain.push('Lateral Movement (TA0008)');
      chain.push('Privilege Escalation (TA0004)');
    } else if (ctx.objective === 'data-objective') {
      chain.push('Lateral Movement (TA0008)');
      chain.push('Collection (TA0009)');
    } else {
      chain.push('Execution (TA0002)');
    }
    return {
      entryVector: entry.label,
      hypothesis: chain.join('  →  '),
      validateFirst: entry.reconFocus,
      confidence: entry.score,
    };
  });
}

/** Roll-up for the plan header. */
export function summarize(scored) {
  const byBand = { primary: 0, secondary: 0, tertiary: 0, informational: 0 };
  for (const s of scored) byBand[s.priority] = (byBand[s.priority] || 0) + 1;
  return {
    count: scored.length,
    byBand,
    leadVector: scored[0] || null,
  };
}
