import { readFile } from 'node:fs/promises';

const css = await readFile('src/dashboard-reference.css', 'utf8');
const app = await readFile('src/app.js', 'utf8');

const requiredCss = [
  'grid-template-columns: 260px minmax(0, 1fr)',
  'grid-template-columns: minmax(0, 1fr) 388px',
  'height: calc(100vh - 24px)',
  'grid-template-rows: 42px 366px 94px minmax(0, 1fr)',
  'height: 366px',
  'min-height: 94px',
  'width: 388px',
  'position: static !important',
  'transform: none !important',
  'overflow: hidden !important',
  '@media (min-width: 769px) and (max-width: 1279px)',
  '@media (max-width: 768px)'
];
for (const token of requiredCss) {
  if (!css.includes(token)) throw new Error(`Missing authoritative dashboard layout token: ${token}`);
}

if ((app.match(/function Dashboard\(/g) ?? []).length !== 1) throw new Error('Duplicate Dashboard renderer exists.');
if ((app.match(/function Accounts\(/g) ?? []).length !== 1) throw new Error('Duplicate account dashboard renderer exists.');
if ((app.match(/function Activity\(/g) ?? []).length !== 1) throw new Error('Duplicate activity dashboard renderer exists.');
if (!app.includes('hollow-score-ring')) throw new Error('Hollow score ring class is missing.');
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
for (const text of ['Run Health Check', 'Watch Demo', '+ Add Account', 'View all', 'Password changed — Google — 2h ago']) {
  if (!app.includes(text)) throw new Error(`Required clickable control missing: ${text}`);
}

for (const forbidden of ['solid-pie-score', 'pie-score', 'word-break: break-all', '<'.repeat(7), '='.repeat(7), '>'.repeat(7)]) {
  if (css.includes(forbidden) || app.includes(forbidden)) throw new Error(`Forbidden regression marker remains: ${forbidden}`);
}

console.log('Layout verification passed: desktop rail, viewport height, no dashboard duplicates, required routes, and compact rows are guarded.');
