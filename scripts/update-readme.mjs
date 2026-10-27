#!/usr/bin/env node
/**
 * ApexVector · README generator
 *
 * Rebuilds the generated sections of the root README from the modules on disk,
 * so adding a module never needs a hand edit to the README.
 *
 * What it reads, per modules/av-NN/:
 *   - src/module.js      name, pillar, summary, season (plain string fields)
 *   - README.md          the "# AV-NN · Name" title (preferred over the manifest name)
 *   - src/**\/*.test.mjs  the engine test file, for the "Running locally" list
 *
 * What it writes: only the text between these marker pairs in README.md
 *   <!-- av:modules-table:start --> ... <!-- av:modules-table:end -->
 *   <!-- av:season2:start -->       ... <!-- av:season2:end -->
 *   <!-- av:structure:start -->     ... <!-- av:structure:end -->
 *   <!-- av:running:start -->       ... <!-- av:running:end -->
 * Everything outside the markers is hand-written and left alone.
 *
 * Usage:
 *   node scripts/update-readme.mjs           rewrite README.md if it is out of date
 *   node scripts/update-readme.mjs --check   exit 1 if README.md is out of date, change nothing
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modulesDir = path.join(root, 'modules');
const readmePath = path.join(root, 'README.md');
const PAGES = 'https://drxter.github.io/ApexVector-/modules';

const PILLARS = {
  'ai-for-security': 'AI for Security',
  'security-for-ai': '🔴 Security for AI',
  'season-1-finale': '🟡 Season 1 Finale',
  'ai-led-pentest': '🔵 AI-Led Pentest',
};

const titleCase = (s) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** Read a quoted string field (single or double quotes, with escapes) from a manifest source. */
function stringField(src, key) {
  const re = new RegExp(`^\\s*${key}:\\s*(?:'((?:[^'\\\\]|\\\\.)*)'|"((?:[^"\\\\]|\\\\.)*)")`, 'm');
  const m = src.match(re);
  if (!m) return null;
  return (m[1] ?? m[2]).replace(/\\(['"\\])/g, '$1');
}

function findTestFile(modDir) {
  const srcDir = path.join(modDir, 'src');
  if (!existsSync(srcDir)) return null;
  for (const sub of readdirSync(srcDir, { withFileTypes: true })) {
    if (!sub.isDirectory() || !/^engines?$/.test(sub.name)) continue;
    const hit = readdirSync(path.join(srcDir, sub.name)).find((f) => f.endsWith('.test.mjs'));
    if (hit) return `src/${sub.name}/${hit}`;
  }
  return null;
}

function loadModules() {
  const out = [];
  for (const entry of readdirSync(modulesDir, { withFileTypes: true })) {
    const m = entry.name.match(/^av-(\d+)$/);
    if (!entry.isDirectory() || !m) continue;
    const dir = path.join(modulesDir, entry.name);
    const manifestPath = path.join(dir, 'src', 'module.js');
    if (!existsSync(manifestPath)) {
      console.warn(`skip ${entry.name}: no src/module.js`);
      continue;
    }
    const manifest = readFileSync(manifestPath, 'utf8');
    const readme = existsSync(path.join(dir, 'README.md')) ? readFileSync(path.join(dir, 'README.md'), 'utf8') : '';
    const h1 = readme.match(/^#\s+AV-\d+\s*·\s*(.+)$/m);
    const nameFromReadme = h1 ? h1[1].split(' — ')[0].trim() : null;
    const season = manifest.match(/^\s*season:\s*(\d+)/m);
    const pillar = stringField(manifest, 'pillar') || 'unknown';
    out.push({
      num: Number(m[1]),
      id: `AV-${m[1].padStart(2, '0')}`,
      folder: entry.name,
      name: nameFromReadme || stringField(manifest, 'name') || entry.name,
      pillar,
      pillarLabel: PILLARS[pillar] || titleCase(pillar),
      summary: stringField(manifest, 'summary') || '',
      season: season ? Number(season[1]) : 1,
      testFile: findTestFile(dir),
    });
  }
  return out.sort((a, b) => a.num - b.num);
}

// ---------------------------------------------------------------------------
// Generated sections
// ---------------------------------------------------------------------------

function modulesTable(mods) {
  const rows = mods.map((x) => `| **${x.id}** | [${x.name}](./modules/${x.folder}/) | ${x.pillarLabel} | ✅ Live | [Open tool ↗](${PAGES}/${x.folder}/) |`);
  return ['| ID | Module | Pillar | Status | Open |', '|----|--------|--------|--------|------|', ...rows].join('\n');
}

function season2Section(mods) {
  const s2 = mods.filter((x) => x.season >= 2);
  if (!s2.length) return '*Season 2 modules land here as they ship.*';
  return s2.map((x) => `**${x.id} · ${x.name}**\n${x.summary}`).join('\n\n');
}

function structureSection(mods) {
  const lines = [
    'ApexVector-/',
    '├── README.md                          Module lists below are generated',
    '├── scripts/',
    '│   └── update-readme.mjs              Rebuilds the generated README sections',
    '└── modules/',
    ...mods.map((x, i) => {
      const branch = i === mods.length - 1 ? '└──' : '├──';
      return `    ${branch} ${`${x.folder}/`.padEnd(30)}${x.name}`;
    }),
  ];
  return ['```', ...lines, '```'].join('\n');
}

function runningSection(mods) {
  const first = mods[0];
  const tests = mods
    .filter((x) => x.testFile)
    .map((x) => `${`node ${x.testFile}`.padEnd(38)}# ${x.folder}`);
  return [
    '```bash',
    'git clone https://github.com/DrXter/ApexVector-.git',
    `cd ApexVector-/modules/${first.folder}`,
    '',
    '# open index.html directly, or serve it',
    'npx serve .',
    '',
    '# run an engine test (from inside a module folder)',
    ...tests,
    '```',
  ].join('\n');
}

function replaceRegion(text, name, body) {
  const re = new RegExp(`(<!-- av:${name}:start -->)[\\s\\S]*?(<!-- av:${name}:end -->)`);
  if (!re.test(text)) throw new Error(`README.md is missing the <!-- av:${name}:start --> / <!-- av:${name}:end --> markers`);
  return text.replace(re, (_, a, b) => `${a}\n${body}\n${b}`);
}

function build() {
  const mods = loadModules();
  if (!mods.length) throw new Error('No modules found under modules/');
  let text = readFileSync(readmePath, 'utf8');
  text = replaceRegion(text, 'modules-table', modulesTable(mods));
  text = replaceRegion(text, 'season2', season2Section(mods));
  text = replaceRegion(text, 'structure', structureSection(mods));
  text = replaceRegion(text, 'running', runningSection(mods));
  return { mods, text, current: readFileSync(readmePath, 'utf8') };
}

const check = process.argv.includes('--check');
try {
  const { mods, text, current } = build();
  if (text === current) {
    console.log(`README.md is up to date (${mods.length} modules).`);
  } else if (check) {
    console.error('README.md is out of date. Run: node scripts/update-readme.mjs');
    process.exit(1);
  } else {
    writeFileSync(readmePath, text);
    console.log(`README.md updated (${mods.length} modules).`);
  }
} catch (err) {
  console.error(err.message);
  process.exit(2);
}
