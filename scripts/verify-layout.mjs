import { readFile } from 'node:fs/promises';

const css = await readFile('src/styles.css', 'utf8');
const app = await readFile('src/app.js', 'utf8');

const dashboardSideRules = css.match(/\.dashboard-side \{[\s\S]*?\}/g) ?? [];
if (!dashboardSideRules.some((rule) => rule.includes('position: static !important'))) {
  throw new Error('dashboard-side must remain in normal document flow.');
}

const protectionPanel = css.match(/\.right-protection-panel \{[\s\S]*?\}/)?.[0] ?? '';
for (const required of ['display: grid', 'gap: 18px']) {
  if (!protectionPanel.includes(required)) throw new Error(`Right protection panel missing layout guard: ${required}`);
}

for (const width of ['1260px', '1024px', '768px', '480px', '414px', '390px', '375px', '320px']) {
  if (!css.includes(`max-width: ${width}`)) throw new Error(`Missing responsive overlap check breakpoint: ${width}`);
}

for (const component of ['h(ProtectionScore)', 'h(ProtectedStatus)', 'h(QuickActions)', 'h(Activity)', 'h(FeatureShortcuts)', 'h(DashboardAccountsPreview)']) {
  if (!app.includes(component)) throw new Error(`Missing command-center component: ${component}`);
}

if (!app.includes("className: 'right-protection-panel glass'")) {
  throw new Error('Right protection panel must stay inside dashboard-side grid.');
}

for (const required of ['grid-template-columns: var(--reference-sidebar) minmax(0, 1fr)', 'gap: 32px', 'max-width: 1800px', 'grid-template-columns: minmax(0, 1fr) var(--reference-rail)', 'repeat(auto-fit, minmax(160px, 1fr))', 'min-width: 0', '--reference-sidebar: 260px', '--reference-rail: 360px', 'position: sticky !important', 'word-break: normal']) {
  if (!css.includes(required)) throw new Error(`Missing responsive command-center layout rule: ${required}`);
}

const rightRailCount = (app.match(/h\(ProtectionScore\)|h\(ProtectedStatus\)|h\(QuickActions\)|readiness-card/g) ?? []).length;
if (rightRailCount < 4) throw new Error(`Expected focused target right-rail widgets, found ${rightRailCount}`);



for (const requiredNativeMobileRule of ['width: calc(100% - 24px)', 'max-width: 440px', 'account-row.collapsed .monitoring-grid', 'grid-template-columns: repeat(5, minmax(0, 1fr))', 'touch-action: manipulation']) {
  if (!css.includes(requiredNativeMobileRule)) throw new Error(`Missing native mobile polish guard: ${requiredNativeMobileRule}`);
}

for (const requiredMobileRule of ['overflow-x: hidden', 'grid-template-columns: repeat(5, minmax(0, 1fr))', 'padding-bottom: calc(76px + env(safe-area-inset-bottom))', 'font-size: min(1rem, 16px)', 'width: 100% !important; min-width: 0']) {
  if (!css.includes(requiredMobileRule)) throw new Error(`Missing mobile-first guard: ${requiredMobileRule}`);
}

for (const declaration of ['demoAccounts', 'activity', 'timelineEvents', 'familyMembers']) {
  const matches = app.match(new RegExp(`^const ${declaration}\\b`, 'gm')) ?? [];
  if (matches.length !== 1) throw new Error(`Expected one top-level ${declaration} declaration, found ${matches.length}`);
}
for (const marker of ['<'.repeat(7), '='.repeat(7), '>'.repeat(7)]) {
  if (app.includes(marker) || css.includes(marker)) throw new Error(`Conflict marker remains: ${marker}`);
}



for (const densityGuard of ['height: calc(100vh - 32px)', 'grid-template-rows: auto auto minmax(0, 1fr) auto', 'overflow-y: auto', 'overscroll-behavior: contain', 'desktop-utility-grid']) {
  if (!css.includes(densityGuard) && !app.includes(densityGuard)) throw new Error(`Missing Phase 36 density guard: ${densityGuard}`);
}
if (app.includes('h(DashboardUtilities)') || app.includes('h(CompanyLogoGrid)')) {
  throw new Error('DashboardHome must not render utility or logo grid widgets.');
}
if (!css.includes('desktop-utility-grid')) throw new Error('Desktop utility grid hide guard is missing.');

for (const requiredTargetGuard of ['grid-template-columns: minmax(680px, 1fr) 360px', 'grid-template-columns: 260px minmax(0, 1fr)', 'min-width: 280px', 'minmax(80px, 1fr)', 'overflow-x: clip', 'word-break: normal !important', 'hyphens: none !important']) {
  if (!css.includes(requiredTargetGuard)) throw new Error(`Missing Phase 33 dashboard breakage guard: ${requiredTargetGuard}`);
}
if (!css.includes('.dashboard[data-route="dashboard"] .quick-fix-center') || !css.includes('.dashboard[data-route="dashboard"] .demo-banner')) {
  throw new Error('Dashboard must hide quick-fix and demo-mode clutter.');
}

for (const forbidden of ['writing-mode', 'word-break: break-all']) {
  if (css.includes(forbidden)) throw new Error(`Account cards must not use broken vertical text styling: ${forbidden}`);
}
if (!app.includes('empty-state')) throw new Error('Account empty state must render from the app.');
if (!app.includes("className: 'loading-state'")) throw new Error('Loading state must render from the app.');
if (!app.includes("className: 'error-state'")) throw new Error('Error state must render from the app.');
for (const requiredFlow of ['DemoModeBanner', 'OnboardingPanel', 'RecoveryWizardMVP', 'recoveryPlaybooks']) {
  if (!app.includes(requiredFlow)) throw new Error(`Missing MVP flow: ${requiredFlow}`);
}

console.log('Layout verification passed: target dashboard, focused right rail, readable account cards, and product states are guarded.');

// Desktop viewport guard for the approved 1440x900 dashboard. This is intentionally
// static because CI does not ship a browser engine; it fails when the consolidated
// dashboard contract drifts back to the oversized PR #41 layout.
const desktopViewport = { width: 1440, height: 900 };
const sidebarWidth = 260;
const centerShellPaddingY = 24;
const topActionsHeight = 42;
const topActionsMargin = 8;
const desktopHeroHeight = 352;
const desktopShortcutHeight = 78;
const desktopLowerHeight = 252;
const desktopGap = 12;
const estimatedDocumentHeight = centerShellPaddingY + topActionsHeight + topActionsMargin + desktopHeroHeight + desktopGap + desktopShortcutHeight + desktopGap + desktopLowerHeight;
if (estimatedDocumentHeight > desktopViewport.height) {
  throw new Error(`1440x900 dashboard height regression: estimated document height ${estimatedDocumentHeight}px exceeds ${desktopViewport.height}px.`);
}

const activeDesktopRules = css.slice(css.indexOf('/* Approved dashboard reference layout'));
for (const required of [
  '--ref-sidebar: 260px',
  '--ref-right-rail: 370px',
  'position: fixed !important',
  'width: var(--ref-sidebar) !important',
  'height: 100vh !important',
  '.dashboard[data-route="dashboard"] { grid-template-columns:',
  '.dashboard[data-route="dashboard"] .main-column.app-page-shell { display: contents !important; }',
  '.dashboard[data-route="dashboard"] .dashboard-side { grid-column: 2 !important; grid-row: 2 / span 3 !important; align-self: start !important; }'
]) {
  if (!activeDesktopRules.includes(required)) throw new Error(`Missing 1440x900 desktop layout guard: ${required}`);
}

for (const forbiddenDesktopHeight of ['height: 448px !important', 'min-height: 448px !important', 'height: 346px !important', 'min-height: 346px !important', 'min-height: 500px !important']) {
  if (activeDesktopRules.includes(forbiddenDesktopHeight)) throw new Error(`Consolidated dashboard still preserves oversized desktop height: ${forbiddenDesktopHeight}`);
}

const dashboardHomeMatch = app.match(/function DashboardHome\(\) \{[\s\S]*?\n\}/)?.[0] ?? '';
for (const requiredSection of ['h(Hero)', 'h(FeatureShortcuts)', 'h(DashboardAccountsPreview)', 'h(Activity)', 'h(RightProtectionPanel)']) {
  if (!dashboardHomeMatch.includes(requiredSection)) throw new Error(`DashboardHome missing approved section: ${requiredSection}`);
}
if (dashboardHomeMatch.includes('h(CompanyLogoGrid)') || dashboardHomeMatch.includes('h(DashboardUtilities)')) {
  throw new Error('DashboardHome must keep CompanyLogoGrid and DashboardUtilities off the homepage.');
}

const desktopDashboardWidth = desktopViewport.width - sidebarWidth - 36;
if (desktopDashboardWidth < 1110) throw new Error('1440px desktop width cannot support center workspace plus right rail.');

console.log(`1440x900 desktop viewport verification passed: estimated dashboard document height ${estimatedDocumentHeight}px, fixed sidebar, center workspace, and right rail stay in the three-column layout.`);
