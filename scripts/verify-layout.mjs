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
for (const desktopComponent of ['h(DashboardUtilities)', 'desktop-utility-grid']) {
  if (!app.includes(desktopComponent) && !css.includes(desktopComponent)) throw new Error(`Missing Phase 36 desktop component: ${desktopComponent}`);
}

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
