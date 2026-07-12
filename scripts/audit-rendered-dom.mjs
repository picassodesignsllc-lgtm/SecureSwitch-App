import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { accountCategories, firestoreCollections, normalizeAccount, scoreAccount, riskLevel, recommendationsFor, dashboardSummary } from '../src/recoveryEngine.js';
import { createApiClient } from '../src/services/api.js';
import { createAuditEvent } from '../src/services/audit.js';
import { createBackupManifest } from '../src/services/backup.js';
import { currentDeviceSnapshot } from '../src/services/devices.js';
import { defaultSecurityPolicies } from '../src/services/enterprise.js';
import { buildActivityEvent, buildNotification, buildSecurityScoreDocument, userScopedPath } from '../src/services/liveData.js';

let source = await readFile('src/app.js', 'utf8');
source = source.replace(/^import .*?;\n/gm, '').replace(/boot\(\);\s*$/m, '');

const createElement = (type, props, ...children) => {
  const normalized = children.flat().filter((child) => child !== null && child !== undefined && child !== false);
  if (typeof type === 'function') return type({ ...(props ?? {}), children: normalized });
  return { type, props: props ?? {}, children: normalized };
};
const context = { console, firebaseConfig: {}, deriveVaultKey: async () => ({}), encryptRecord: async () => ({}), decryptRecord: async () => ({}), ReactMock: { createElement }, window: { setTimeout: () => {} }, location: { hash: '#dashboard' }, localStorage: { getItem: () => null, setItem: () => {} }, navigator: { onLine: true }, accountCategories, firestoreCollections, normalizeAccount, scoreAccount, riskLevel, recommendationsFor, dashboardSummary, createApiClient, createAuditEvent, createBackupManifest, currentDeviceSnapshot, defaultSecurityPolicies, buildActivityEvent, buildNotification, buildSecurityScoreDocument, userScopedPath };
vm.createContext(context);
vm.runInContext(`${source}\nReact = ReactMock; globalThis.__tree = App();`, context, { filename: 'src/app.js' });

const tree = context.__tree;
const classList = (node) => String(node?.props?.className ?? '').split(/\s+/).filter(Boolean);
const hasClass = (node, cls) => classList(node).includes(cls);
const walk = (node, visitor, parent = null) => { if (!node || typeof node !== 'object') return; visitor(node, parent); for (const child of node.children ?? []) walk(child, visitor, node); };
const findByClass = (cls) => { const found = []; walk(tree, (node) => { if (hasClass(node, cls)) found.push(node); }); return found; };
const textOf = (node) => typeof node === 'string' || typeof node === 'number' ? String(node) : (!node || typeof node !== 'object') ? '' : (node.children ?? []).map(textOf).join(' ');
const anchors = []; walk(tree, (node) => { if (node.type === 'a' && node.props?.href) anchors.push(node.props.href); });

if (findByClass('dashboard').length !== 1) throw new Error('Dashboard must render exactly once.');
if (findByClass('main-column').length !== 1) throw new Error('Center workspace must render exactly once.');
if (findByClass('right-protection-panel').length !== 1) throw new Error('Right protection rail must render exactly once.');
if (findByClass('hero').length !== 1) throw new Error('Hero must render exactly once.');
if (findByClass('premium-vault').length !== 1) throw new Error('Vault hero graphic must render exactly once.');
if (findByClass('mobile-dashboard').length !== 1) throw new Error('Mobile dashboard prototype must render exactly once.');

const rightRail = findByClass('right-protection-panel')[0];
const rightRailNames = (rightRail.children ?? []).filter((child) => child && typeof child === 'object').map((child) => classList(child).find((cls) => ['floating-score', 'protected', 'quick-panel', 'readiness-panel'].includes(cls))).filter(Boolean);
const expectedRail = ['floating-score', 'protected', 'quick-panel', 'readiness-panel'];
if (JSON.stringify(rightRailNames) !== JSON.stringify(expectedRail)) throw new Error(`Right rail mismatch. Expected ${expectedRail.join(', ')}, got ${rightRailNames.join(', ')}`);

if (findByClass('shortcut').length !== 4) throw new Error(`Expected four shortcut cards, found ${findByClass('shortcut').length}`);
if (findByClass('account-row').length !== 5) throw new Error(`Expected exactly five account rows, found ${findByClass('account-row').length}.`);
if (findByClass('activity').length !== 4) throw new Error(`Expected exactly four activity rows, found ${findByClass('activity').length}.`);
if (findByClass('hollow-score-ring').length !== 1) throw new Error('Desktop hollow score ring must render exactly once.');
if (findByClass('mobile-score-ring').length !== 1) throw new Error('Mobile 86% score ring must render exactly once.');
if (findByClass('mobile-quick-card').length !== 4) throw new Error(`Expected four mobile quick actions, found ${findByClass('mobile-quick-card').length}.`);
if (findByClass('mobile-account-card').length !== 5) throw new Error(`Expected five mobile account cards, found ${findByClass('mobile-account-card').length}.`);
if (findByClass('mobile-activity-card').length !== 4) throw new Error(`Expected four mobile activity cards, found ${findByClass('mobile-activity-card').length}.`);

for (const href of ['#dashboard', '#accounts', '#switch', '#blackout', '#kit', '#lookup', '#settings', '#timeline']) {
  if (!anchors.includes(href)) throw new Error(`Missing routed link: ${href}`);
}
const summaryText = textOf(tree);
for (const expectedText of ['Never lose another account', 'Run Health Check', 'Watch Demo', '+ Add Account', 'Accounts', 'Switch Mode', 'Blackout Mode', 'Emergency Kit', 'Live Protection Score', '86%', 'Excellent', 'You’re protected', 'Recovery Readiness', 'View all']) {
  if (!summaryText.includes(expectedText)) throw new Error(`Missing approved dashboard text/control: ${expectedText}`);
}

for (const forbiddenText of ['Production account registry', 'Vault assets', '5/5 shown']) {
  if (summaryText.includes(forbiddenText)) throw new Error(`Forbidden dashboard text remains: ${forbiddenText}`);
}

console.log('Rendered DOM audit passed: desktop remains locked, mobile dashboard renders required score/actions/accounts/activity/nav, required routed links, and forbidden legacy dashboard text is absent.');
