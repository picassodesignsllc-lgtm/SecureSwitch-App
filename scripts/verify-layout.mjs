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

for (const component of ['h(Activity)', 'h(FloatingAICoach)', 'h(Readiness)', 'h(QuickActions)', 'h(EmergencyKitSummary)', 'h(SuggestedFixes)', 'h(LiveThreatFeed)', 'h(ProtectedStatus)']) {
  if (!app.includes(component)) throw new Error(`Missing dashboard-side component: ${component}`);
}

if (!app.includes("h('aside', { className: 'dashboard-side' }, h(Activity), h(FloatingAICoach), h(Readiness), h(QuickActions), h(EmergencyKitSummary), h(SuggestedFixes), h(LiveThreatFeed), h(ProtectedStatus))")) {
  throw new Error('Right intelligence widgets must stay inside dashboard-side grid.');
}

for (const required of ['grid-template-columns: minmax(520px, 1fr) 360px', 'repeat(auto-fit, minmax(160px, 1fr))', 'min-width: 120px']) {
  if (!css.includes(required)) throw new Error(`Missing responsive command-center layout rule: ${required}`);
}

console.log('Layout verification passed: right rail widgets are in normal grid flow with responsive command-center rules.');
