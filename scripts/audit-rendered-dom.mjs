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
  serviceRegistry: {
    authentication: ['signIn'],
    billing: ['plans'],
    recovery: ['score'],
    organizations: ['invite'],
    notifications: ['alerts'],
    vault: ['backup'],
    reports: ['export'],
    settings: ['profile']
  },
  createApiClient: ({ firebaseReady = false, user = null } = {}) => ({ mode: firebaseReady && user ? 'production' : 'demo' }),
  billingPlans: [{ id: 'free', name: 'Free', price: '$0', interval: 'forever' }],
  getSubscriptionSnapshot: () => ({ status: 'Demo / Free', billingHistory: [{ id: 'demo' }], secretKeysExposed: false, availableActions: ['Upgrade'] }),
  createAuditEvent: (action, details = {}) => ({ id: `audit-${action}`, action, details, createdAt: 'Demo' }),
  createBackupManifest: () => ({ encryptedRecordCount: 0 }),
  backupCapabilities: ['Automatic backups', 'Manual backups', 'Restore backup', 'Export encrypted vault', 'Import encrypted vault'],
  currentDeviceSnapshot: () => ({ id: 'current-browser', browser: 'Current browser', os: 'Demo OS', location: 'Demo', lastActive: 'Now', trusted: true }),
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

const dashboardSide = findByClass('dashboard-side');
if (dashboardSide.length !== 1) throw new Error(`Expected one dashboard-side rail, found ${dashboardSide.length}`);

const rightRailChildren = (dashboardSide[0].children ?? []).filter((child) => child && typeof child === 'object');
const rightProtectionPanels = findByClass('right-protection-panel');
if (rightProtectionPanels.length !== 1) throw new Error(`Expected one focused right protection panel, found ${rightProtectionPanels.length}`);
for (const cls of ['floating-score', 'quick-panel', 'suggested-fixes']) {
  const count = findByClass(cls).length;
  if (count !== 1) throw new Error(`Expected ${cls} to render once, found ${count}`);
}
if (findByClass('premium-vault').length !== 1) throw new Error('Vault hero must render exactly once.');
if (findByClass('hero').length !== 1) throw new Error('Hero must render exactly once.');
if (findByClass('floating-score').length !== 1) throw new Error('Live Protection Score must render exactly once.');
if (findByClass('activity-panel').length !== 1) throw new Error('Recent Activity must render once in the main content area.');

const accountRows = findByClass('account-row');
if (accountRows.length < 5) throw new Error(`Expected at least five account rows, found ${accountRows.length}`);
for (const expectedName of ['Google', 'Instagram', 'Coinbase', 'Amazon', 'Slack']) {
  if (!accountRows.some((row) => textOf(row).includes(expectedName))) throw new Error(`Missing readable account name: ${expectedName}`);
}

const summaryText = textOf(tree);
for (const expectedMetric of ['Overall Security Score', 'Accounts Protected', 'Accounts At Risk', 'Recovery Readiness', 'Pending Actions']) {
  if (!summaryText.includes(expectedMetric)) throw new Error(`Missing production dashboard metric: ${expectedMetric}`);
}

for (const expectedText of ['Demo Mode', 'Never store raw passwords', 'Quick Actions', 'Protection Score', 'Recovery Score', 'Add New Account']) {
  if (!summaryText.includes(expectedText)) throw new Error(`Missing production app text: ${expectedText}`);
}

console.log('Rendered DOM audit passed: readable account rows, demo mode, production dashboard, one vault hero, one fixed-score widget, and one focused right protection panel.');
