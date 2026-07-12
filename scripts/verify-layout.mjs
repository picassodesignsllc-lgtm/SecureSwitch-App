import { readFile } from 'node:fs/promises';

const css = await readFile('src/dashboard-reference.css', 'utf8');
const app = await readFile('src/app.js', 'utf8');

const requiredCss = [
  'grid-template-columns: 260px minmax(0, 1fr)',
  'grid-template-columns: minmax(0, 1fr) 370px',
  'height: calc(100vh - 28px)',
  'grid-template-rows: 42px 360px 88px minmax(0, 1fr)',
  'height: 360px',
  'min-height: 88px',
  'width: 370px',
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
if (!app.includes("className: 'dashboard', 'data-route': 'dashboard'")) throw new Error('Dashboard must expose the data-route layout hook.');
if (!app.includes("className: 'dashboard-side right-protection-panel'")) throw new Error('Right rail must stay beside the center dashboard.');

const dashboardBody = app.match(/function Dashboard\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
for (const forbidden of ['DashboardSummaryCards', 'HealthScoreGrid', 'IdentityHealthDashboard', 'FloatingAICoach', 'LiveThreatFeed', 'SuggestedFixes']) {
  if (dashboardBody.includes(forbidden)) throw new Error(`Dashboard home includes obsolete command-center widget: ${forbidden}`);
}
for (const required of ['h(TopActions)', 'h(Hero)', 'h(Shortcuts)', 'h(Accounts)', 'h(Activity)', 'h(ProtectionScore)', 'h(ProtectedStatus)', 'h(QuickActions)', 'h(Readiness)']) {
  if (!dashboardBody.includes(required)) throw new Error(`Dashboard missing approved widget: ${required}`);
}


for (const declaration of ['demoAccounts', 'activity', 'timelineEvents', 'familyMembers']) {
  const matches = app.match(new RegExp(String.raw`^const ${declaration}\b`, 'gm')) ?? [];
  if (matches.length !== 1) throw new Error(`Expected one top-level ${declaration} declaration, found ${matches.length}`);
}


for (const route of ["'dashboard'", "'accounts'", "'switch'", "'blackout'", "'kit'", "'lookup'", "'settings'"]) {
  if (!app.includes(route)) throw new Error(`Required routed link is missing: ${route}`);
}
for (const text of ['Run Health Check', 'Watch Demo', 'Add Account', 'View all']) {
  if (!app.includes(text)) throw new Error(`Required clickable control missing: ${text}`);
}

for (const forbidden of ['translateX(', 'translateY(', 'word-break: break-all', '<'.repeat(7), '='.repeat(7), '>'.repeat(7), '☾', '♧', '▦', '♙', '⇄', '⌾', '▣', '⌕', '⚙', '✦', '＋', '⌁', '♟', '✉', '⌗', '›', '⌄']) {
  if (css.includes(forbidden) || dashboardBody.includes(forbidden)) throw new Error(`Forbidden dashboard marker remains: ${forbidden}`);
}

console.log('Layout verification passed: desktop rail, viewport height, no dashboard duplicates, required routes, and compact rows are guarded.');
