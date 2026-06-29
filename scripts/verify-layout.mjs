import { readFile } from 'node:fs/promises';

const css = await readFile('src/styles.css', 'utf8');
const app = await readFile('src/app.js', 'utf8');

const dashboardSideRules = css.match(/\.dashboard-side \{[\s\S]*?\}/g) ?? [];
if (!dashboardSideRules.some((rule) => rule.includes('position: static !important'))) {
  throw new Error('dashboard-side must remain in normal document flow.');
}

const protectedBlock = css.match(/\.dashboard-side > \.protected,[\s\S]*?\.dashboard-side > \.readiness-panel \{[\s\S]*?\}/)?.[0] ?? '';
for (const required of ['position: static !important', 'transform: none', 'z-index: auto', 'margin: 0', 'width: 100%']) {
  if (!protectedBlock.includes(required)) throw new Error(`Right-rail cards missing layout guard: ${required}`);
}

for (const width of ['1260px', '1024px', '390px']) {
  if (!css.includes(`max-width: ${width}`)) throw new Error(`Missing responsive overlap check breakpoint: ${width}`);
}

for (const component of ['h(ProtectedStatus)', 'h(QuickActions)', 'h(Readiness)']) {
  if (!app.includes(component)) throw new Error(`Missing dashboard-side component: ${component}`);
}

if (!app.includes("h('aside', { className: 'dashboard-side' }, h(ProtectedStatus), h(QuickActions), h(Readiness))")) {
  throw new Error('Protected, Quick Actions, and Readiness must stay inside dashboard-side grid.');
}

console.log('Layout verification passed: right-rail cards are in normal grid flow with responsive breakpoints.');
