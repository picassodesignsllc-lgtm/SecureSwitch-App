import { readFile } from 'node:fs/promises';

const css = await readFile('src/styles.css', 'utf8');
const app = await readFile('src/app.js', 'utf8');

const dashboardSideRules = css.match(/\.dashboard-side \{[\s\S]*?\}/g) ?? [];
if (!dashboardSideRules.some((rule) => rule.includes('position: static !important'))) {
  throw new Error('dashboard-side must remain in normal document flow.');
}

const protectedBlock = css.match(/\.dashboard-side > \.protected,[\s\S]*?\.dashboard-side > \.floating-ai-coach \{[\s\S]*?\}/)?.[0] ?? '';
for (const required of ['position: static !important', 'transform: none', 'z-index: auto', 'margin: 0', 'width: 100%']) {
  if (!protectedBlock.includes(required)) throw new Error(`Right-rail cards missing layout guard: ${required}`);
}

for (const width of ['1260px', '1024px', '390px']) {
  if (!css.includes(`max-width: ${width}`)) throw new Error(`Missing responsive overlap check breakpoint: ${width}`);
}

for (const component of ['h(ProtectionScore)', 'h(ProtectedStatus)', 'h(QuickActions)', 'h(Readiness)', 'h(Activity)', 'h(FloatingAICoach)', 'h(LiveThreatFeed)', 'h(SuggestedFixes)']) {
  if (!app.includes(component)) throw new Error(`Missing dashboard-side component: ${component}`);
}

if (!app.includes("h('aside', { className: 'dashboard-side' }, h(ProtectionScore), h(ProtectedStatus), h(QuickActions), h(Readiness), h(FloatingAICoach), h(LiveThreatFeed), h(SuggestedFixes))")) {
  throw new Error('Reference right rail widgets must stay inside dashboard-side grid.');
}

for (const required of ['grid-template-columns: var(--reference-sidebar) minmax(0, 1fr)', 'gap: 32px', 'max-width: 1800px', 'grid-template-columns: minmax(0, 1fr) var(--reference-rail)', 'repeat(auto-fit, minmax(160px, 1fr))', 'min-width: 0', '--reference-sidebar: 260px', '--reference-rail: 360px', 'position: sticky !important', 'word-break: normal']) {
  if (!css.includes(required)) throw new Error(`Missing responsive command-center layout rule: ${required}`);
}

const rightRailCount = (app.match(/h\(ProtectionScore\)|h\(ProtectedStatus\)|h\(QuickActions\)|h\(Readiness\)|h\(FloatingAICoach\)|h\(LiveThreatFeed\)|h\(SuggestedFixes\)/g) ?? []).length;
if (rightRailCount !== 7) throw new Error(`Expected 7 right-rail widgets, found ${rightRailCount}`);

for (const declaration of ['demoAccounts', 'activity', 'timelineEvents', 'familyMembers']) {
  const matches = app.match(new RegExp(`^const ${declaration}\\b`, 'gm')) ?? [];
  if (matches.length !== 1) throw new Error(`Expected one top-level ${declaration} declaration, found ${matches.length}`);
}
for (const marker of ['<'.repeat(7), '='.repeat(7), '>'.repeat(7)]) {
  if (app.includes(marker) || css.includes(marker)) throw new Error(`Conflict marker remains: ${marker}`);
}

for (const forbidden of ['writing-mode', 'word-break: break-all']) {
  if (css.includes(forbidden)) throw new Error(`Account cards must not use broken vertical text styling: ${forbidden}`);
}
if (!app.includes("className: 'empty-state'")) throw new Error('Account empty state must render from the app.');
if (!app.includes("className: 'loading-state'")) throw new Error('Loading state must render from the app.');
if (!app.includes("className: 'error-state'")) throw new Error('Error state must render from the app.');
for (const requiredFlow of ['DemoModeBanner', 'OnboardingPanel', 'RecoveryWizardMVP', 'recoveryPlaybooks']) {
  if (!app.includes(requiredFlow)) throw new Error(`Missing MVP flow: ${requiredFlow}`);
}

console.log('Layout verification passed: right rail, fixed score widget, readable account cards, duplicate data declarations, conflict markers, and product states are guarded.');
