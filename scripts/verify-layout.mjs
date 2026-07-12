import { readFile } from 'node:fs/promises';

const css = await readFile('src/styles.css', 'utf8');
const app = await readFile('src/app.js', 'utf8');

const fail = (message) => { throw new Error(message); };
const count = (source, pattern) => (source.match(pattern) ?? []).length;

for (const marker of ['<'.repeat(7), '='.repeat(7), '>'.repeat(7)]) {
  if (app.includes(marker) || css.includes(marker)) fail(`Conflict marker remains: ${marker}`);
}

for (const declaration of ['demoAccounts', 'activity', 'timelineEvents', 'familyMembers']) {
  const matches = app.match(new RegExp(`^const ${declaration}\\b`, 'gm')) ?? [];
  if (matches.length !== 1) fail(`Expected one top-level ${declaration} declaration, found ${matches.length}`);
}

if (count(app, /^function Dashboard\(/gm) !== 1) fail('Expected exactly one active Dashboard renderer.');
if (app.includes('CompanyLogoGrid') || app.includes('DashboardUtilities')) fail('Obsolete dashboard renderer remains in app.js.');

const dashboardBody = app.match(/function Dashboard\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
for (const required of ["h(TopActions)", "h(Hero)", "h(Shortcuts)", "h('div', { className: 'lower-grid' }, h(Accounts), h(Activity))", "h('aside', { className: 'dashboard-side' }, h(ProtectionScore), h(ProtectedStatus), h(QuickActions), h(Readiness))"]) {
  if (!dashboardBody.includes(required)) fail(`Clean dashboard renderer missing ${required}`);
}
for (const removed of ['h(FloatingAICoach)', 'h(LiveThreatFeed)', 'h(SuggestedFixes)', 'h(HealthScan)', 'h(IdentityDNA)']) {
  if (dashboardBody.includes(removed)) fail(`Default dashboard should not render extra stacked feature panel: ${removed}`);
}

for (const required of [
  '--sidebar-width: 260px',
  '--rail-width: 360px',
  'grid-template-columns: var(--sidebar-width) minmax(0, 1fr)',
  'grid-template-columns: minmax(0, 1fr) var(--rail-width)',
  'gap: var(--space-4)',
  'height: 100vh',
  'grid-template-rows: 44px 360px 96px minmax(0, 1fr)',
  'grid-template-columns: repeat(4, minmax(0, 1fr))',
  'grid-template-columns: minmax(0, 1.12fr) minmax(300px, .88fr)',
  'position: sticky',
  'overflow-x: hidden',
  '@media (max-width: 767px)',
  '@media (max-width: 480px)'
]) {
  if (!css.includes(required)) fail(`Missing clean dashboard layout rule: ${required}`);
}

const desktopGridSystems = count(css, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+var\(--rail-width\)/g);
if (desktopGridSystems !== 1) fail(`Expected one authoritative desktop dashboard grid system, found ${desktopGridSystems}.`);

for (const forbidden of [
  /translateX\s*\(/,
  /transform:\s*scale\s*\(/,
  /margin-left:\s*-/,
  /margin-right:\s*-/,
  /left:\s*calc\(/,
  /width:\s*[2-9][0-9]{3}px/,
  /word-break:\s*break-all/,
  /writing-mode/
]) {
  if (forbidden.test(css)) fail(`Forbidden layout anti-pattern remains: ${forbidden}`);
}

const heroHeight = css.match(/\.hero \{[\s\S]*?height:\s*(\d+)px/);
if (!heroHeight) fail('Desktop hero height must be explicit and auditable.');
if (Number(heroHeight[1]) > 390) fail(`Desktop hero height is too tall: ${heroHeight[1]}px.`);

for (const rowSelector of ['.account-row', '.activity']) {
  const block = css.match(new RegExp(rowSelector.replace('.', '\\.') + ' \\{[\\s\\S]*?\\}'))?.[0] ?? '';
  if (!block.includes('min-height: 48px')) fail(`${rowSelector} must use compact fixed row rhythm.`);
  if (/height:\s*(?:[8-9]\d|\d{3,})px/.test(block)) fail(`${rowSelector} uses an oversized fixed height.`);
}

console.log('Layout verification passed: one clean desktop grid, compact rows, no negative offsets/translateX, mobile overflow guards, and unique dashboard/data declarations.');
