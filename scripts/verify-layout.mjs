import { readFile } from 'node:fs/promises';

const dashboardCss = await readFile('src/dashboard-reference.css', 'utf8');
const baseCss = await readFile('src/styles.css', 'utf8');
const css = `${dashboardCss}
${baseCss}`;
const app = await readFile('src/app.js', 'utf8');

const requiredCss = [
  'grid-template-columns: 260px minmax(0, 1fr)',
  'grid-template-columns: minmax(0, 1fr) 370px',
  'grid-template-rows: 44px 430px 96px minmax(330px, auto)',
  'height: 430px',
  'min-height: 96px',
  'width: 370px',
  'position: static !important',
  'transform: none !important',
  'overflow: visible !important',
  '@media (min-width: 769px) and (max-width: 1279px)',
  '@media (max-width: 768px)',
  'width: min(100%, 390px)',
  'min-height: 844px',
  '.mobile-bottom-nav',
  '--ss-space-4',
  '--ss-radius-card',
  '--ss-shadow-card',
  '--ss-gradient-primary',
  '--ss-duration-base'
];
for (const token of requiredCss) {
  if (!css.includes(token)) throw new Error(`Missing authoritative dashboard layout token: ${token}`);
}

if ((app.match(/function Dashboard\(/g) ?? []).length !== 1) throw new Error('Duplicate Dashboard renderer exists.');
if ((app.match(/function Accounts\(/g) ?? []).length !== 1) throw new Error('Duplicate account dashboard renderer exists.');
if ((app.match(/function Activity\(/g) ?? []).length !== 1) throw new Error('Duplicate activity dashboard renderer exists.');
if (!app.includes('hollow-score-ring')) throw new Error('Hollow score ring class is missing.');
if (!app.includes('function MobileDashboard()')) throw new Error('Mobile dashboard renderer is missing.');
if (!app.includes('function liveProtectionScore() { return 86; }')) throw new Error('Dashboard score must remain 86%.');
if ((app.match(/h\(AccountCard/g) ?? []).length !== 2) throw new Error('Expected account cards only in dashboard and recovery lookup renderers.');
if (!app.includes("className: 'dashboard', 'data-route': 'dashboard'")) throw new Error('Dashboard must expose the data-route layout hook.');
if (!app.includes("className: 'dashboard-side right-protection-panel'")) throw new Error('Right rail must stay beside the center dashboard.');

const dashboardBody = app.match(/function Dashboard\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
for (const forbidden of ['DashboardSummaryCards', 'HealthScoreGrid', 'IdentityHealthDashboard', 'FloatingAICoach', 'LiveThreatFeed', 'SuggestedFixes', 'DashboardUtilityGrid']) {
  if (dashboardBody.includes(forbidden)) throw new Error(`Dashboard home includes obsolete command-center widget: ${forbidden}`);
}
for (const required of ['h(TopActions)', 'h(Hero)', 'h(Shortcuts)', 'h(Accounts)', 'h(Activity)', 'h(ProtectionScore)', 'h(ProtectedStatus)', 'h(QuickActions)', 'h(Readiness)']) {
  if (!dashboardBody.includes(required)) throw new Error(`Dashboard missing approved widget: ${required}`);
}

for (const route of ["'dashboard'", "'accounts'", "'switch'", "'blackout'", "'kit'", "'lookup'", "'settings'"]) {
  if (!app.includes(route)) throw new Error(`Required routed link is missing: ${route}`);
}

for (const title of ['Accounts', 'Switch Mode', 'Blackout Mode', 'Emergency Kit']) {
  if (!app.includes(title)) throw new Error(`Missing shortcut title: ${title}`);
}
if ((app.match(/h\('article', null, h\('strong', null/g) ?? []).length < 3) throw new Error('Expected score statistic cards under protection ring.');

for (const text of ['Run Health Check', 'Watch Demo', '+ Add Account', 'View all', 'Password changed — Google — 2h ago']) {
  if (!app.includes(text)) throw new Error(`Required clickable control missing: ${text}`);
}

for (const forbidden of ['solid-pie-score', 'pie-score', 'word-break: break-all', 'overflow-wrap: anywhere', '-webkit-line-clamp', 'dashboard[data-route=\"dashboard\"] { transform: scale', 'dashboard[data-route="dashboard"] { transform: scale', '<'.repeat(7), '='.repeat(7), '>'.repeat(7)]) {
  if (css.includes(forbidden) || app.includes(forbidden)) throw new Error(`Forbidden regression marker remains: ${forbidden}`);
}

for (const required of ['.target-shortcuts', 'grid-template-columns: 44px minmax(0, 1fr) 16px', '.shortcut strong', 'white-space: normal', 'word-break: normal', 'overflow-wrap: normal', 'hyphens: none', '.activity time { width: 72px', '.account-row {', 'min-height: 54px', '.target-score-stats']) {
  if (!css.includes(required)) throw new Error(`Missing desktop defect-repair guard: ${required}`);
}

console.log('Layout verification passed: desktop rail, shortcut typography, account/activity rows, mobile tokens, required routes, and compact rows are guarded.');
