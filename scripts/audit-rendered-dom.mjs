import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { accountCategories, firestoreCollections, normalizeAccount, scoreAccount, riskLevel, recommendationsFor, dashboardSummary } from '../src/recoveryEngine.js';

let source = await readFile('src/app.js', 'utf8');
source = source
  .replace(/^import .*?;\n/gm, '')
  .replace(/boot\(\);\s*$/m, '');

const createElement = (type, props, ...children) => {
  const normalized = children.flat().filter((child) => child !== null && child !== undefined && child !== false);
  if (typeof type === 'function') return type({ ...(props ?? {}), children: normalized });
  return { type, props: props ?? {}, children: normalized };
};

const context = {
  console,
  firebaseConfig: {},
  deriveVaultKey: async () => ({}),
  encryptRecord: async () => ({}),
  decryptRecord: async () => ({}),
  ReactMock: { createElement },
  window: { setTimeout: () => {} },
  location: { hash: '' },
  accountCategories,
  firestoreCollections,
  normalizeAccount,
  scoreAccount,
  riskLevel,
  recommendationsFor,
  dashboardSummary,
};
vm.createContext(context);
vm.runInContext(`${source}\nReact = ReactMock; globalThis.__tree = App();`, context, { filename: 'src/app.js' });

const tree = context.__tree;
const classList = (node) => String(node?.props?.className ?? '').split(/\s+/).filter(Boolean);
const hasClass = (node, cls) => classList(node).includes(cls);
const walk = (node, visitor, parent = null) => {
  if (!node || typeof node !== 'object') return;
  visitor(node, parent);
  for (const child of node.children ?? []) walk(child, visitor, node);
};
const findByClass = (cls) => {
  const found = [];
  walk(tree, (node) => { if (hasClass(node, cls)) found.push(node); });
  return found;
};
const textOf = (node) => {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (!node || typeof node !== 'object') return '';
  return (node.children ?? []).map(textOf).join(' ');
};

if (findByClass('app-shell').length !== 1) throw new Error('Expected one app shell.');
if (findByClass('sidebar').length !== 1) throw new Error('Expected one sidebar.');
if (findByClass('dashboard').length !== 1) throw new Error('Expected one dashboard.');
if (findByClass('main-column').length !== 1) throw new Error('Expected one center workspace.');
if (findByClass('dashboard-side').length !== 1) throw new Error('Expected one right protection rail.');
if (findByClass('hero').length !== 1) throw new Error('Hero must render exactly once.');
if (findByClass('premium-vault').length !== 1) throw new Error('Vault hero must render exactly once.');

const rail = findByClass('dashboard-side')[0];
const railChildren = (rail.children ?? []).filter((child) => child && typeof child === 'object');
const railNames = railChildren.map((child) => classList(child).filter((cls) => ['floating-score', 'protected', 'quick-panel', 'readiness-panel'].includes(cls))[0]).filter(Boolean);
const expectedRail = ['floating-score', 'protected', 'quick-panel', 'readiness-panel'];
if (JSON.stringify(railNames) !== JSON.stringify(expectedRail)) {
  throw new Error(`Right rail mismatch. Expected ${expectedRail.join(', ')}, got ${railNames.join(', ')}`);
}
for (const cls of expectedRail) {
  if (findByClass(cls).length !== 1) throw new Error(`Expected ${cls} to render once.`);
}

const shortcutRows = findByClass('shortcut');
if (shortcutRows.length !== 4) throw new Error(`Expected four shortcut cards, found ${shortcutRows.length}.`);
const accountRows = findByClass('account-row');
if (accountRows.length < 5) throw new Error(`Expected at least five readable account rows, found ${accountRows.length}.`);
for (const expectedName of ['Google', 'Instagram', 'Coinbase', 'Amazon', 'Slack']) {
  if (!accountRows.some((row) => textOf(row).includes(expectedName))) throw new Error(`Missing readable account name: ${expectedName}`);
}
if (findByClass('activity-panel').length !== 1) throw new Error('Recent Activity must render once in the lower center grid.');
if (findByClass('activity').length !== 5) throw new Error(`Expected five compact activity rows, found ${findByClass('activity').length}.`);

const summaryText = textOf(tree);
const normalizedText = summaryText.replace(/\s+/g, ' ').trim();
for (const expectedText of ['Never lose another account again.', 'Run Health Check', 'Watch Demo', 'Add New Account', 'Generate Backup Codes', 'View Recovery Contacts']) {
  if (!normalizedText.includes(expectedText)) throw new Error(`Missing required dashboard text/action: ${expectedText}`);
}
for (const nav of ['Dashboard', 'Accounts', 'Switch Mode', 'Blackout Mode', 'Emergency Kit', 'Recovery Lookup', 'Settings']) {
  if (!summaryText.includes(nav)) throw new Error(`Missing approved navigation item: ${nav}`);
}
for (const removedNav of ['Health Scan', 'Identity Health', 'Timeline', 'Simulator', 'Family Mode']) {
  const sidebarText = textOf(findByClass('sidebar')[0]);
  if (sidebarText.includes(removedNav)) throw new Error(`Sidebar includes unapproved duplicate item: ${removedNav}`);
}

console.log('Rendered DOM audit passed: sidebar, center hero, lower cards, and right rail render once with readable rows and approved navigation.');
