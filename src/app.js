import { firebaseConfig } from './firebaseConfig.js';
import { deriveVaultKey, encryptRecord, decryptRecord } from './crypto.js';
import { accountCategories, firestoreCollections, normalizeAccount, scoreAccount, riskLevel, recommendationsFor, dashboardSummary } from './recoveryEngine.js';
import { createApiClient } from './services/api.js';
import { createAuditEvent } from './services/audit.js';
import { createBackupManifest } from './services/backup.js';
import { currentDeviceSnapshot } from './services/devices.js';
import { defaultSecurityPolicies } from './services/enterprise.js';
import { buildActivityEvent, buildNotification, buildSecurityScoreDocument, userScopedPath } from './services/liveData.js';

const demoAccounts = [
  { name: 'Google', handle: 'keith.harrison@gmail.com', status: 'Secure', color: '#4285f4', category: 'Email', phone: '+1 (415) 555-0184', email: 'keith.harrison@gmail.com', recoveryEmail: 'backup@secureswitch.app', recoveryPhone: '+1 (415) 555-0184', backupCodes: '8 encrypted codes', trustedContacts: 'Alicia Harrison', authenticator: '1Password', ready: true },
  { name: 'Instagram', handle: '@mr3rdward', status: 'Review', color: '#e4405f', category: 'Social', phone: '+1 (415) 555-0184', email: 'social@secureswitch.app', recoveryEmail: 'old-email@example.com', recoveryPhone: '', backupCodes: '', trustedContacts: '', authenticator: 'SMS only', ready: false },
  { name: 'Coinbase', handle: 'keith.harrison.cb.id', status: 'Secure', color: '#0052ff', category: 'Crypto', phone: '+1 (415) 555-0184', email: 'crypto@secureswitch.app', recoveryEmail: 'vault@secureswitch.app', recoveryPhone: '+1 (415) 555-0184', backupCodes: '12 encrypted codes', trustedContacts: 'Alicia Harrison', authenticator: 'YubiKey', ready: true },
  { name: 'Amazon', handle: 'keith.harrison@gmail.com', status: 'Secure', color: '#ff9900', category: 'Shopping', phone: '+1 (212) 555-0110', email: 'keith.harrison@gmail.com', recoveryEmail: 'backup@secureswitch.app', recoveryPhone: '+1 (212) 555-0110', backupCodes: '10 encrypted codes', trustedContacts: 'Priya Shah', authenticator: 'Passkey', ready: true },
  { name: 'Slack', handle: 'keith@picassodesigns.com', status: 'Review', color: '#4a154b', category: 'Business', phone: '+1 (628) 555-0149', email: 'keith@picassodesigns.com', recoveryEmail: 'admin@picassodesigns.com', recoveryPhone: '+1 (628) 555-0149', backupCodes: '', trustedContacts: 'IT admin', authenticator: 'Okta Verify', ready: false }
];
const activity = ['Google password updated — Google Workspace — 2h ago', 'Apple ID secured — iCloud — 4h ago', 'Recovery email verified — Coinbase — 5h ago', 'Bank account backed up — Chase — 8h ago', 'Passkey created — Microsoft — 1d ago', 'Device removed — Instagram — 1d ago', 'Recovery kit exported — SecureSwitch — 2d ago', 'Breach scan completed — Identity Monitor — 2d ago'];
const timelineEvents = [
  { date: 'June 29', title: 'Phone changed', status: 'Done' },
  { date: 'June 29', title: 'Recovery email updated', status: 'Done' },
  { date: 'June 29', title: 'Google verified', status: 'Done' },
  { date: 'June 29', title: 'Coinbase still pending', status: 'Review' },
  { date: 'June 29', title: 'Instagram completed', status: 'Done' },
  { date: 'June 29', title: 'Bank accounts verified', status: 'Done' },
  { date: 'June 29', title: 'Recovery score 82% → 91%', status: 'Improved' }
];
const familyMembers = [
  { name: 'Dad', score: 92, note: 'Recovery plan verified' },
  { name: 'Mom', score: 81, note: 'Needs backup code refresh' },
  { name: 'Brother', score: 68, note: 'Missing trusted contact' },
  { name: 'Grandma', score: 34, note: '⚠ No recovery phone' }
];
const demoOrganizations = [
  { id: 'family', name: 'Family Vault', role: 'Owner', members: 4, vaults: 4, devices: 9, accounts: 24, auditLogs: 18, recoveryPolicies: 7, securityScore: 82, permission: 'Full access', activity: 'Mom refreshed backup codes' },
  { id: 'studio', name: 'Picasso Designs', role: 'Admin', members: 8, vaults: 8, devices: 21, accounts: 64, auditLogs: 42, recoveryPolicies: 11, securityScore: 88, permission: 'Manage workspace', activity: 'Slack recovery policy reviewed' }
];
const accountTemplates = ['Google', 'Apple', 'Microsoft', 'GitHub', 'Instagram', 'Facebook', 'X', 'Coinbase', 'Amazon', 'Discord', 'Dropbox', 'PayPal', 'Steam', 'More...', 'Custom Account'];
const providerCatalog = { Google: ['#4285f4', 'G', 'Email'], Apple: ['#f8fafc', '', 'Email'], Microsoft: ['#00a4ef', 'M', 'Cloud'], GitHub: ['#8b949e', 'GH', 'Business'], Instagram: ['#e4405f', 'IG', 'Social'], Facebook: ['#1877f2', 'f', 'Social'], X: ['#111827', '𝕏', 'Social'], Coinbase: ['#0052ff', 'CB', 'Crypto'], Amazon: ['#ff9900', 'A', 'Shopping'], Discord: ['#5865f2', 'D', 'Gaming'], Dropbox: ['#0061ff', 'DB', 'Cloud'], PayPal: ['#003087', 'P', 'Banking'], Steam: ['#171a21', 'S', 'Gaming'], 'More...': ['#2bb8ff', '+', 'Custom'] };
function providerMeta(name) { return providerCatalog[name] || [ '#2bb8ff', (name || '?').slice(0, 2).toUpperCase(), 'Custom' ]; }
function brandSlug(name = '') { return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'custom'; }
function brandMark(name = '') {
  const marks = { Google: 'G', Instagram: '◎', Facebook: 'f', Discord: '♟', Apple: '', Microsoft: '▦', GitHub: '⌘', Amazon: 'a', Coinbase: 'C', Slack: '✣', Dropbox: '◆', Steam: '●', 'Chase Bank': '◆', 'Crypto Wallet': '◇' };
  return marks[name] || providerMeta(name)[1] || String(name).slice(0, 1).toUpperCase();
}
const onboardingAccountOptions = ['Google', 'Apple', 'Facebook', 'Instagram', 'Microsoft', 'Amazon', 'Discord', 'Slack', 'Coinbase', 'Custom'];
const appCategories = ['Google', 'Apple', 'Microsoft', 'Banking', 'Crypto', 'Social', 'Gaming', 'Email', ...accountCategories.filter((category) => !['Google', 'Apple', 'Microsoft', 'Banking', 'Crypto', 'Social', 'Gaming', 'Email'].includes(category))];
let accountUnsubscribe;
let collectionUnsubscribes = [];
let React;
let root;
function onboardingKey(user = state.user) { return `secureswitch:onboarded:${user?.uid || user?.email || 'local'}`; }
function onboardingSeen(user = null) { try { return localStorage.getItem(onboardingKey(user)) === 'yes'; } catch { return false; } }
function rememberOnboarding(user = null) { try { localStorage.setItem(onboardingKey(user || state.user), 'yes'); } catch { /* Ignore private browsing storage failures. */ } }

const state = { user: null, auth: null, db: null, firebase: null, firebaseReady: false, vaultKey: null, mode: 'login', userProfile: null, accounts: demoAccounts.map(normalizeAccount), recoveryMethods: [], trustedContacts: [], backupCodes: [], securityAlerts: [], recoveryTimeline: timelineEvents, emergencyKits: [], settings: {}, selectedRecovery: '+1 (415) 555-0184', switchOld: '+1 (415) 555-0184', switchNew: '+1 (628) 555-0149', blackoutArmed: false, emergencyActive: false, emergencyRecoveryActive: false, scanComplete: false, aiStep: 0, timelineFilter: 'All', simulatorScenario: 'My phone was stolen', simulatorRan: false, activeProfile: null, vaultUnlocked: false, selectedVaultCategory: 'Recovery Emails', assistantPrompt: 'My phone was stolen', assistantStep: 0, emergencyScenario: 'Phone Stolen', recoveryWizardScenario: 'Phone stolen', recoveryWizardStep: 0, accountSearch: '', accountCategory: 'All', accountRiskFilter: 'All', accountStatusFilter: 'All', accountSort: 'Risk', accountDensity: 'compact', deviceSearch: '', devicePlatformFilter: 'All', deviceRiskFilter: 'All', deviceTrustFilter: 'All', deviceStatusFilter: 'All', deviceSort: 'Last seen', deviceDensity: 'compact', recoverySearch: '', recoveryStatusFilter: 'All', recoveryRiskFilter: 'All', recoveryPasskeyFilter: 'All', recoveryMfaFilter: 'All', recoveryCategoryFilter: 'All', recoverySort: 'Readiness', recoveryDensity: 'compact', editingAccountId: '', loading: false, authError: '', dataError: '', exportStatus: '', importStatus: '', onboardingOpen: !onboardingSeen(), onboardingStep: 0, onboardingProtection: 'Advanced', onboardingAccounts: ['Google', 'Apple', 'Instagram'], vaultCreating: false, onboardingComplete: false, globalSearch: '', settingsSearch: '', notificationSearch: '', notificationFilter: 'All', notificationCategory: 'All Activity', notificationDateFilter: 'All', notificationUnreadOnly: false, notificationPinnedOnly: false, notificationSort: 'Newest', notificationDensity: 'compact', selectedNotificationId: '', pinnedNotifications: [], archivedNotifications: [], rememberMe: true, notificationsRead: [], notifications: [], activityFeed: [], recoveryContacts: [], securityScores: [], adminVisible: false, organizations: demoOrganizations, selectedOrgRole: 'Member', inviteEmail: '', productTourStep: 0, commandPaletteOpen: false, selectedAccountId: '', expandedAccountId: '', accountDetailTab: 'Overview', auditRan: false, auditReport: '', upgradeModal: '', route: (location.hash || '#dashboard').replace('#', '') || 'dashboard', reportType: 'Recovery Report', waitlistStatus: '', waitlistReferral: '', importSource: 'CSV', isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false, securityEvents: [], auditEvents: [], devices: [], subscriptionPlan: 'free', backupStatus: 'Automatic encrypted backups ready', toast: 'Ready', aiCopilotOpen: false, aiCopilotQuestion: 'What should I fix first?', aiCopilotAnswer: '', dismissedFixes: [], expandedTimelineId: '', pageLoading: false, successPulse: '', commandIndex: 0, selectedOrganizationId: 'family', enterpriseInvitations: [], approvalWorkflows: [], enterprisePolicies: defaultSecurityPolicies(), enterpriseAuditLog: [], dashboardWidgetOrder: (() => { try { return JSON.parse(localStorage.getItem('secureswitch:dashboard-widgets')) || ['Executive Score', 'Accounts', 'Activity']; } catch { return ['Executive Score', 'Accounts', 'Activity']; } })(), notificationStatusFilter: 'All', runtimeMode: (() => { try { return localStorage.getItem('secureswitch:runtime-mode') || 'auto'; } catch { return 'auto'; } })() };
const h = (...args) => React.createElement(...args);
function Icon({ name, className = 'ui-icon' }) {
  const paths = {
    dashboard: ['M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v4H4zM14 15h6v4h-6z'],
    accounts: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0'],
    switch: ['M7 7h10l-3-3m3 3-3 3M17 17H7l3 3m-3-3 3-3'],
    blackout: ['M12 3 5 6v5.5c0 4.4 3 7.4 7 8.8 4-1.4 7-4.4 7-8.8V6l-7-3Zm0 5v6'],
    kit: ['M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7M5 8h14v11H5zM12 11v5M9.5 13.5h5'],
    lookup: ['M11 18a7 7 0 1 1 5-2l4 4M11 8v3l2 2'],
    settings: ['M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8 3.5-2-.8-.5-1.2.8-2-2.3-2.3-2 .8-1.2-.5L12 4H9l-.8 2-1.2.5-2-.8-2.3 2.3.8 2-.5 1.2-2 .8v3l2 .8.5 1.2-.8 2L5 22l2-.8 1.2.5.8 2h3l.8-2 1.2-.5 2 .8 2.3-2.3-.8-2 .5-1.2 2-.8v-3Z'],
    plus: ['M12 5v14M5 12h14'], bell: ['M18 16H6l1.2-2V10a4.8 4.8 0 0 1 9.6 0v4L18 16Zm-4 3a2 2 0 0 1-4 0'], moon: ['M20 15.5A8.5 8.5 0 0 1 8.5 4 7 7 0 1 0 20 15.5Z'],
    shield: ['M12 3 5.5 5.8v5.7c0 4 2.7 6.9 6.5 8.2 3.8-1.3 6.5-4.2 6.5-8.2V5.8L12 3Zm-3 8 2 2 4-4'], lock: ['M8 11V8a4 4 0 0 1 8 0v3M6 11h12v9H6z'], code: ['M7 8l-4 4 4 4m10-8 4 4-4 4M14 5l-4 14'], contacts: ['M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0ZM5 20a7 7 0 0 1 14 0'], play: ['M9 7l8 5-8 5V7Z'], info: ['M12 8h.01M11 12h1v5h1']
  };
  return h('svg', { className, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }, (paths[name] || paths.dashboard).map((d) => h('path', { key: d, d })));
}
function BrandLogo({ name }) { return h('span', { className: `brand-logo brand-${brandSlug(name)}`, 'aria-label': `${name} logo` }, h('span', null, brandMark(name))); }
function SafeGraphic() { return h('div', { className: 'premium-vault safe-graphic', 'aria-label': 'Premium encrypted safe illustration' }, h('div', { className: 'safe-floor' }), h('div', { className: 'safe-cube' }, h('div', { className: 'safe-side' }), h('div', { className: 'safe-door' }, h('div', { className: 'safe-dial' }, Array.from({ length: 12 }).map((_, index) => h('i', { key: index, style: { '--tick': index } })), h('b')), h('div', { className: 'safe-hinge' })))); }
function EmptyState({ icon = '◌', title, description, action, onAction, secondaryAction, onSecondaryAction }) { return h('div', { className: 'empty-state premium-empty-state' }, h('span', { className: 'empty-illustration' }, icon), h('strong', null, title), h('p', null, description), h('div', { className: 'empty-actions' }, action && h('button', { className: 'primary', onClick: onAction }, action), secondaryAction && h('button', { className: 'ghost', onClick: onSecondaryAction }, secondaryAction))); }

function hasFirebaseConfig() { return Object.values(firebaseConfig).every(Boolean); }
function setState(patch) { Object.assign(state, patch); render(); }
function toast(message) { setState({ toast: message }); window.setTimeout(() => setState({ toast: '' }), 2200); }
function successToast(message) { setState({ successPulse: message, toast: `✓ ${message}` }); window.setTimeout(() => setState({ successPulse: '' }), 900); window.setTimeout(() => setState({ toast: '' }), 2400); }
function firstName() { return state.userProfile?.displayName?.split(' ')[0] || state.user?.displayName?.split(' ')[0] || state.user?.email?.split('@')[0] || 'there'; }
function selectedRuntimeMode() { return state.runtimeMode || 'auto'; }
function usingLiveAccounts() { return selectedRuntimeMode() !== 'demo' && Boolean(state.user && state.db && state.firebaseReady); }
function runtimeModeLabel() { return usingLiveAccounts() ? 'Production Mode' : selectedRuntimeMode() === 'production' ? 'Production Pending' : 'Demo Mode'; }
function setRuntimeMode(mode) { try { localStorage.setItem('secureswitch:runtime-mode', mode); } catch { /* Ignore private browsing storage failures. */ } setState({ runtimeMode: mode }); if (mode === 'demo') { subscribeToAccounts(null); toast('Demo Mode enabled'); } else { toast(mode === 'production' ? 'Production Mode requested' : 'Automatic mode enabled'); if (state.user) subscribeToAccounts(state.user); } }
function apiClient() { return createApiClient({ firebaseReady: state.firebaseReady, user: state.user }); }
function currentRoute() { return state.route || (location.hash || '#dashboard').replace('#', '') || 'dashboard'; }
function requireLiveUser() {
  if (!state.user || !state.db || !state.firebaseReady) throw new Error('Sign in and configure Firebase before syncing data.');
  return state.user;
}
function safeError(error, fallback) { return error?.message || fallback; }
function friendlyAuthError(error, fallback) {
  const code = error?.code || '';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return 'We could not sign you in. Check your email and password, then try again.';
  if (code.includes('email-already-in-use')) return 'That email already has a SecureSwitch account. Try logging in instead.';
  if (code.includes('popup')) return 'The provider sign-in window was closed or blocked. Please try again.';
  if (code.includes('network')) return 'Network error while contacting Firebase. Demo mode is still available.';
  return safeError(error, fallback);
}
function buildInfo() { return globalThis.SECURESWITCH_CONFIG || {}; }
function sanitizeInput(value) { return String(value || '').replace(/[<>]/g, '').trim().slice(0, 180); }
function referralLink(code) { return `${location.origin}${location.pathname}?ref=${encodeURIComponent(code)}`; }
function buildVersion() { return buildInfo().buildVersion || 'local-dev'; }
function deployMode() { return buildInfo().deployMode || (location.protocol === 'file:' ? 'local-file' : 'static-web'); }
function serializeAccount(record) {
  const account = normalizeAccount(record);
  return { ...account, serviceName: account.name, username: account.handle, updatedAt: state.firebase?.serverTimestamp ? state.firebase.serverTimestamp() : new Date().toISOString() };
}
async function readAccountDoc(doc) {
  const data = doc.data();
  if (data?.ciphertext && data?.iv && state.vaultKey) return normalizeAccount({ id: doc.id, ...(await decryptRecord(state.vaultKey, data)) });
  if (data?.ciphertext && data?.iv && !state.vaultKey) return normalizeAccount({ id: doc.id, name: 'Encrypted recovery record', handle: 'Unlock vault to decrypt', category: 'Custom', status: 'Review', color: '#2bb8ff' });
  return normalizeAccount({ id: doc.id, ...data });
}
function userCollection(name) {
  const user = requireLiveUser();
  return state.firebase.collection(state.db, 'users', user.uid, name);
}
function userDoc(pathName, docId) {
  const user = requireLiveUser();
  return state.firebase.doc(state.db, ...userScopedPath(user.uid, pathName, docId));
}
async function writeUserScopedDoc(collectionName, docId, data) {
  requireLiveUser();
  const payload = { ...data, updatedAt: state.firebase.serverTimestamp ? state.firebase.serverTimestamp() : new Date().toISOString() };
  await state.firebase.setDoc(userDoc(collectionName, docId), payload, { merge: true });
}
async function refreshLiveSecurityScore(accounts = state.accounts) {
  if (!usingLiveAccounts()) return;
  await writeUserScopedDoc('securityScores', 'current', buildSecurityScoreDocument(accounts, state.firebase));
}
async function recordLiveActivity(type, account = {}, extra = {}) {
  const event = { ...buildActivityEvent(type, account, state.firebase), ...extra };
  setState({ activityFeed: [event].concat(state.activityFeed).slice(0, 30) });
  if (usingLiveAccounts()) await writeUserScopedDoc('activity', `${type}-${Date.now()}`, event);
  return event;
}
async function recordLiveNotification(type, account = {}, extra = {}) {
  const note = { ...buildNotification(type, account, state.firebase), ...extra };
  setState({ notifications: [note].concat(state.notifications).slice(0, 30) });
  if (usingLiveAccounts()) await writeUserScopedDoc('notifications', `${type}-${Date.now()}`, note);
  return note;
}
async function recordAudit(action, details = {}) {
  const event = createAuditEvent(action, details);
  setState({ auditEvents: [event].concat(state.auditEvents).slice(0, 20) });
  if (usingLiveAccounts()) {
    try {
      await state.firebase.setDoc(userDoc('auditLogs', event.id), event, { merge: true });
    } catch (error) {
      setState({ dataError: safeError(error, 'Audit event could not sync, but the action completed locally.') });
    }
  }
  return event;
}
async function ensureUserDocument(user) {
  if (!state.db || !state.firebase || !user) return;
  const profileRef = state.firebase.doc(state.db, 'users', user.uid);
  const existing = await state.firebase.getDoc(profileRef).catch(() => null);
  const existingData = existing?.exists?.() ? existing.data() : {};
  const profile = { ...existingData, email: user.email || '', displayName: existingData.displayName || user.displayName || user.email || 'SecureSwitch user', photoURL: existingData.photoURL || user.photoURL || '', emailVerified: Boolean(user.emailVerified), lastLoginAt: state.firebase.serverTimestamp ? state.firebase.serverTimestamp() : new Date().toISOString() };
  await state.firebase.setDoc(profileRef, profile, { merge: true });
  setState({ userProfile: profile, onboardingOpen: !profile.betaOnboardingComplete && !onboardingSeen(user) });
}
async function ensureUserScopedCollections(user) {
  if (!state.db || !state.firebase || !user) return;
  const serverTime = state.firebase.serverTimestamp ? state.firebase.serverTimestamp() : new Date().toISOString();
  const base = (...parts) => state.firebase.doc(state.db, 'users', user.uid, ...parts);
  const defaults = [
    ['settings', 'preferences', { darkMode: true, notifications: true, cloudSync: true, exportVault: true, importVault: true, emergencyPin: false, biometricLock: false, createdAt: serverTime }],
    ['securityScores', 'current', { score: averageScore(), reasons: recoveryScoreFactors().factors.map(([label, count]) => ({ label, count })), createdAt: serverTime }],
    ['activity', 'welcome', { title: 'SecureSwitch workspace created', type: 'login', createdAt: serverTime }],
    ['recoveryContacts', 'primary', { name: 'Add trusted contact', status: 'Add a real contact', createdAt: serverTime }],
    ['recoveryMethods', 'primary', { type: 'Recovery method inventory', status: 'Ready to populate', createdAt: serverTime }],
    ['trustedContacts', 'primary', { name: 'Add trusted contact', status: 'Add a real contact', createdAt: serverTime }],
    ['backupCodes', 'inventory', { status: 'Encrypted backup code inventory ready', count: 0, createdAt: serverTime }],
    ['securityAlerts', 'welcome', { title: 'SecureSwitch live sync enabled', severity: 'Info', status: 'Open', createdAt: serverTime }],
    ['recoveryTimeline', 'welcome', { date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' }), title: 'SecureSwitch account connected', status: 'Done', category: 'Security', createdAt: serverTime }],
    ['emergencyKits', 'default', { title: 'Default emergency kit', status: 'Ready to build', items: ['Trusted contacts', 'Recovery letter', 'Insurance notes'], createdAt: serverTime }],
    ['organizations', 'family-demo', { name: 'Family Vault', role: 'Owner', members: 1, vaults: 1, devices: 1, accounts: state.accounts.length, auditLogs: 1, recoveryPolicies: 7, securityScore: averageScore(), permission: 'Full access', activity: 'Organization created', createdAt: serverTime }],
    ['settings', 'enterprisePolicies', { ...defaultSecurityPolicies(), createdAt: serverTime }],
    ['billing', 'subscription', { plan: 'free', status: 'Free / beta', stripeConnected: false, paymentsEnabled: false, trialEligible: true, createdAt: serverTime }],
    ['devices', 'current-browser', { ...currentDeviceSnapshot(), createdAt: serverTime }],
    ['backups', 'latest', { ...createBackupManifest([]), status: 'Ready', createdAt: serverTime }]
  ];
  await Promise.all(defaults.map(([collectionName, docId, data]) => state.firebase.setDoc(base(collectionName, docId), data, { merge: true })));
}
function resetLiveCollections() {
  collectionUnsubscribes.forEach((unsubscribe) => unsubscribe());
  collectionUnsubscribes = [];
  setState({ recoveryMethods: [], trustedContacts: [], recoveryContacts: [], backupCodes: [], securityAlerts: [], notifications: [], activityFeed: [], securityScores: [], recoveryTimeline: timelineEvents, emergencyKits: [], organizations: demoOrganizations, enterpriseInvitations: [], enterpriseAuditLog: [], approvalWorkflows: [], enterprisePolicies: defaultSecurityPolicies(), settings: {} });
}
function subscribeToUserCollection(name, stateKey, transform = (doc) => ({ id: doc.id, ...doc.data() })) {
  const unsubscribe = state.firebase.onSnapshot(userCollection(name), (snapshot) => {
    const records = snapshot.docs.map(transform);
    setState({ [stateKey]: records });
  }, (error) => setState({ dataError: safeError(error, `Could not load ${name}`) }));
  collectionUnsubscribes.push(unsubscribe);
}
function subscribeToSupportCollections(user) {
  resetLiveCollections();
  if (!state.db || !state.firebase || !user) return;
  subscribeToUserCollection('recoveryMethods', 'recoveryMethods');
  subscribeToUserCollection('trustedContacts', 'trustedContacts');
  subscribeToUserCollection('recoveryContacts', 'recoveryContacts');
  subscribeToUserCollection('securityScores', 'securityScores');
  subscribeToUserCollection('activity', 'activityFeed');
  subscribeToUserCollection('notifications', 'notifications');
  subscribeToUserCollection('backupCodes', 'backupCodes');
  subscribeToUserCollection('securityAlerts', 'securityAlerts');
  subscribeToUserCollection('recoveryTimeline', 'recoveryTimeline', (doc) => ({ id: doc.id, ...doc.data(), date: doc.data().date || 'Today', title: doc.data().title || 'Recovery event', status: doc.data().status || 'Done' }));
  subscribeToUserCollection('emergencyKits', 'emergencyKits');
  subscribeToUserCollection('organizations', 'organizations');
  subscribeToUserCollection('organizationInvites', 'enterpriseInvitations');
  subscribeToUserCollection('approvals', 'approvalWorkflows');
  subscribeToUserCollection('enterpriseAuditLog', 'enterpriseAuditLog');
  subscribeToUserCollection('auditLogs', 'auditEvents');
  subscribeToUserCollection('devices', 'devices');
  const settingsUnsubscribe = state.firebase.onSnapshot(userCollection('settings'), (snapshot) => {
    const settings = Object.assign({}, ...snapshot.docs.map((doc) => doc.data()));
    setState({ settings });
  }, (error) => setState({ dataError: safeError(error, 'Could not load settings') }));
  collectionUnsubscribes.push(settingsUnsubscribe);
}
function subscribeToAccounts(user) {
  if (accountUnsubscribe) accountUnsubscribe();
  if (!state.db || !state.firebase || !user) { setState({ accounts: demoAccounts.map(normalizeAccount), userProfile: null, dataError: '' }); resetLiveCollections(); return; }
  setState({ accounts: [], loading: true, dataError: '' });
  accountUnsubscribe = state.firebase.onSnapshot(state.firebase.collection(state.db, 'users', user.uid, 'accounts'), async (snapshot) => {
    const records = [];
    try {
      for (const doc of snapshot.docs) records.push(await readAccountDoc(doc));
      setState({ accounts: records, loading: false });
    } catch (error) {
      setState({ dataError: safeError(error, 'Unlock your vault to decrypt recovery records.'), loading: false });
    }
  }, (error) => setState({ dataError: safeError(error, 'Could not load accounts from Firestore'), loading: false }));
}
async function loadFirebase() {
  if (!hasFirebaseConfig()) { setState({ firebaseReady: false, dataError: '' }); return; }
  try {
    const [{ initializeApp }, authModule, firestore] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js')
    ]);
    const app = initializeApp(firebaseConfig);
    state.auth = authModule.getAuth(app);
    await authModule.setPersistence(state.auth, state.rememberMe === false ? authModule.browserSessionPersistence : authModule.browserLocalPersistence);
    state.db = firestore.getFirestore(app);
    state.firebase = { ...authModule, ...firestore };
    setState({ firebaseReady: true });
    authModule.onAuthStateChanged(state.auth, async (user) => {
      setState({ user, authError: '', dataError: '' });
      if (user) {
        try {
          await ensureUserDocument(user);
          await ensureUserScopedCollections(user);
          subscribeToSupportCollections(user);
        } catch (error) {
          setState({ dataError: safeError(error, 'Could not prepare your SecureSwitch workspace') });
        }
      }
      subscribeToAccounts(user);
    });
  } catch (error) {
    setState({ firebaseReady: false, authError: '', dataError: safeError(error, 'Firebase unavailable; SecureSwitch is running in demo mode.') });
  }
}

async function submitAuth(event) {
  event.preventDefault();
  if (!state.auth) return toast('Add Firebase config to enable real auth');
  const email = event.currentTarget.email.value;
  const password = event.currentTarget.password.value;
  setState({ loading: true, authError: '' });
  try {
    await state.firebase.setPersistence(state.auth, state.rememberMe ? state.firebase.browserLocalPersistence : state.firebase.browserSessionPersistence);
    const credential = state.mode === 'signup'
      ? await state.firebase.createUserWithEmailAndPassword(state.auth, email, password)
      : await state.firebase.signInWithEmailAndPassword(state.auth, email, password);
    if (state.mode === 'signup' && credential.user && !credential.user.emailVerified) await state.firebase.sendEmailVerification(credential.user);
    await ensureUserDocument(credential.user);
    await recordAudit('login', { method: state.mode === 'signup' ? 'email_signup' : 'email_login' });
    toast(state.mode === 'signup' ? 'Account created. Verification email sent.' : 'Signed in securely');
  } catch (error) {
    setState({ authError: friendlyAuthError(error, 'Authentication failed. Please try again.') });
    toast('Authentication needs attention');
  } finally {
    setState({ loading: false });
  }
}

async function sendPasswordReset(email) {
  if (!state.auth) return toast('Configure Firebase first');
  if (!email) { setState({ authError: 'Enter your email before requesting a password reset.' }); return; }
  try {
    await state.firebase.sendPasswordResetEmail(state.auth, email);
    toast('Password reset email sent');
  } catch (error) {
    setState({ authError: friendlyAuthError(error, 'Password reset failed. Please try again.') });
  }
}

async function signInWithProvider(providerName) {
  if (!state.auth) return toast('Add Firebase config to enable real auth');
  setState({ loading: true, authError: '' });
  try {
    const provider = providerName === 'apple' ? new state.firebase.OAuthProvider('apple.com') : providerName === 'microsoft' ? new state.firebase.OAuthProvider('microsoft.com') : new state.firebase.GoogleAuthProvider();
    const credential = await state.firebase.signInWithPopup(state.auth, provider);
    await ensureUserDocument(credential.user);
    await recordAudit('login', { method: providerName });
    toast(`Signed in with ${providerName === 'apple' ? 'Apple' : providerName === 'microsoft' ? 'Microsoft' : 'Google'}`);
  } catch (error) {
    setState({ authError: friendlyAuthError(error, `${providerName} sign-in failed. Please try again.`) });
    toast('Provider sign-in needs attention');
  } finally {
    setState({ loading: false });
  }
}
async function signOut() {
  if (accountUnsubscribe) accountUnsubscribe();
  accountUnsubscribe = null;
  resetLiveCollections();
  await recordAudit('logout', { method: 'secure_logout' });
  if (state.auth) await state.firebase.signOut(state.auth);
  setState({ user: null, userProfile: null, accounts: demoAccounts.map(normalizeAccount), vaultKey: null, vaultUnlocked: false });
  toast('Signed out securely');
}

async function unlockVault(event) {
  event.preventDefault();
  if (!state.user || !state.db) return toast('Sign in and configure Firebase first');
  const profileRef = state.firebase.doc(state.db, 'users', state.user.uid);
  try {
    const profileSnap = await state.firebase.getDoc(profileRef);
    const salt = profileSnap.exists() ? profileSnap.data().vaultSalt : null;
    const derived = await deriveVaultKey(event.currentTarget.passphrase.value, salt);
    if (!salt) await state.firebase.setDoc(profileRef, { vaultSalt: derived.salt, email: state.user.email }, { merge: true });
    state.vaultKey = derived.key;
    setState({ vaultUnlocked: true });
    subscribeToAccounts(state.user);
    await recordAudit('vault_unlock', { severity: 'info' });
    toast('Encrypted vault unlocked');
  } catch (error) {
    setState({ dataError: safeError(error, 'Vault unlock failed') });
    toast('Vault unlock failed');
  }
}

async function saveAccount(event) {
  event.preventDefault();
  const form = event.currentTarget;
  setState({ loading: true, dataError: '' });
  if (!form.name.value.trim()) return setState({ dataError: 'Service name is required', loading: false });
  if (form.email.value && !form.email.value.includes('@')) return setState({ dataError: 'Recovery email must be valid', loading: false });
  const record = normalizeAccount({
    id: state.editingAccountId || undefined,
    name: form.name.value,
    handle: form.handle.value,
    category: form.category.value,
    recoveryEmail: form.email.value,
    recoveryPhone: form.phone.value,
    backupCodes: form.codes.value,
    trustedContacts: form.contacts.value,
    authenticator: form.authenticator.value,
    passkeyStatus: form.passkey.value,
    deviceVerification: form.device.value,
    lastReviewed: form.reviewed.value,
    status: 'Review',
    color: providerMeta(form.name.value)[0]
  });
  try {
    if (usingLiveAccounts()) {
      requireLiveUser();
      if (!state.vaultKey) throw new Error('Unlock your encrypted vault before saving live recovery records.');
      const payload = await encryptRecord(state.vaultKey, serializeAccount(record));
      if (state.editingAccountId) {
        await state.firebase.setDoc(userDoc('accounts', record.id), payload, { merge: true });
        successToast(`${record.name} updated`);
      } else {
        await state.firebase.addDoc(userCollection('accounts'), payload);
        successToast(`${record.name} added`);
      }
      const nextAccounts = state.editingAccountId ? state.accounts.map((account) => account.id === record.id ? record : account) : [record, ...state.accounts];
      await refreshLiveSecurityScore(nextAccounts);
      await recordLiveActivity(state.editingAccountId ? 'updated' : 'created', record);
      await recordLiveNotification(state.editingAccountId ? 'updated' : 'created', record);
      await writeUserScopedDoc('recoveryTimeline', `account-${Date.now()}`, { date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' }), title: `${record.name} recovery record saved`, status: 'Done', category: 'Recovery', accountId: record.id });
      await recordAudit('recovery_update', { collection: 'accounts', encrypted: true, account: record.name });
    } else {
      const accounts = state.editingAccountId ? state.accounts.map((account) => account.id === state.editingAccountId ? record : account) : [record, ...state.accounts];
      setState({ accounts, editingAccountId: '', activityFeed: [{ id: `local-${Date.now()}`, title: `${record.name} recovery record saved`, type: 'recovery_update', createdAt: new Date().toISOString() }].concat(state.activityFeed).slice(0, 20), notifications: [{ id: `local-note-${Date.now()}`, title: `${record.name} needs review`, detail: recommendationsFor(record)[0] || 'Account health updated', unread: true }].concat(state.notifications).slice(0, 20) });
      successToast(`${record.name} ${state.editingAccountId ? 'updated' : 'added locally'}`);
    }
    form.reset();
  } catch (error) {
    setState({ dataError: safeError(error, 'We could not save this recovery record. Your dashboard is still available.') });
    toast('Account save failed');
  } finally {
    setState({ loading: false });
  }
}

function editAccount(account) { setState({ editingAccountId: account.id }); setTimeout(() => document.getElementById('account-form')?.scrollIntoView({ behavior: 'smooth' }), 0); }
async function deleteAccount(accountId) {
  const account = state.accounts.find((item) => item.id === accountId);
  setState({ accounts: state.accounts.filter((item) => item.id !== accountId) });
  if (usingLiveAccounts()) {
    try {
      requireLiveUser();
      await state.firebase.deleteDoc(userDoc('accounts', accountId));
      await recordLiveActivity('deleted', account || { id: accountId, name: 'Account' });
      await recordLiveNotification('deleted', account || { id: accountId, name: 'Account' });
      await refreshLiveSecurityScore(state.accounts.filter((item) => item.id !== accountId));
      await writeUserScopedDoc('recoveryTimeline', `delete-${Date.now()}`, { date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' }), title: `${account?.name || 'Account'} recovery record deleted`, status: 'Done', category: 'Security' });
      await recordAudit('recovery_update', { collection: 'accounts', operation: 'delete', account: account?.name || accountId });
    } catch (error) {
      setState({ dataError: safeError(error, 'Account could not be deleted') });
    }
  }
  toast(`${account?.name || 'Account'} deleted`);
}
function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
async function exportEncryptedRecoveryData() {
  try {
    if (!state.vaultKey && !usingLiveAccounts()) throw new Error('Unlock your vault before exporting encrypted recovery data.');
    let records;
    if (usingLiveAccounts()) {
      requireLiveUser();
      const snapshot = await state.firebase.getDocs(userCollection('accounts'));
      records = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((record) => record.iv && record.ciphertext);
      if (!records.length && state.vaultKey && state.accounts.length) records = await Promise.all(state.accounts.map(async (account) => ({ id: account.id, ...(await encryptRecord(state.vaultKey, serializeAccount(account))) })));
    } else {
      records = await Promise.all(state.accounts.map(async (account) => ({ id: account.id, ...(await encryptRecord(state.vaultKey, serializeAccount(account))) })));
    }
    if (!records.length) throw new Error('No encrypted recovery records are available to export yet.');
    const bundle = { product: 'SecureSwitch', format: 'encrypted-recovery-export', version: 1, exportedAt: new Date().toISOString(), deployMode: deployMode(), records };
    downloadJson(`secureswitch-encrypted-export-${new Date().toISOString().slice(0, 10)}.json`, bundle);
    setState({ exportStatus: `${records.length} encrypted recovery records exported.` });
    await recordAudit('export', { type: 'encrypted_recovery_data', records: records.length });
    successToast('Encrypted export ready');
  } catch (error) {
    setState({ exportStatus: safeError(error, 'Encrypted export failed') });
    toast('Encrypted export needs attention');
  }
}
async function importEncryptedRecoveryData(event) {
  const [file] = event.target.files || [];
  if (!file) return;
  try {
    const bundle = JSON.parse(await file.text());
    if (bundle.product !== 'SecureSwitch' || bundle.format !== 'encrypted-recovery-export' || !Array.isArray(bundle.records)) throw new Error('This is not a valid SecureSwitch encrypted export.');
    const encryptedRecords = bundle.records.filter((record) => record.iv && record.ciphertext);
    if (!encryptedRecords.length) throw new Error('No encrypted recovery records were found in this file.');
    if (usingLiveAccounts()) {
      requireLiveUser();
      await Promise.all(encryptedRecords.map((record) => state.firebase.setDoc(userDoc('accounts', record.id || `import-${globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : Date.now()}`), { iv: record.iv, ciphertext: record.ciphertext }, { merge: true })));
      await writeUserScopedDoc('recoveryTimeline', `import-${Date.now()}`, { date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' }), title: 'Encrypted recovery data imported', status: 'Review', category: 'Recovery' });
      await recordAudit('backup', { type: 'encrypted_import', records: encryptedRecords.length });
    } else {
      if (!state.vaultKey) throw new Error('Unlock your vault before importing encrypted data in demo mode.');
      const imported = [];
      for (const record of encryptedRecords) imported.push(normalizeAccount({ id: record.id, ...(await decryptRecord(state.vaultKey, record)) }));
      setState({ accounts: imported.concat(state.accounts) });
    }
    setState({ importStatus: `${encryptedRecords.length} encrypted recovery records imported.` });
    toast('Encrypted import complete');
  } catch (error) {
    setState({ importStatus: safeError(error, 'Import failed. Only import files you trust.') });
    toast('Encrypted import failed');
  } finally {
    event.target.value = '';
  }
}
function prioritizedRecommendations() {
  const items = [];
  for (const account of state.accounts) {
    if (!account.authenticator || /sms/i.test(account.authenticator)) items.push({ impact: 16, title: 'Enable MFA', detail: `${account.name}: replace SMS with an authenticator or hardware key.` });
    if (!account.backupCodes) items.push({ impact: 14, title: 'Download Backup Codes', detail: `${account.name}: add encrypted backup code status.` });
    if (!account.trustedContacts) items.push({ impact: 12, title: 'Add Trusted Contact', detail: `${account.name}: add a human recovery fallback.` });
    if (!account.recoveryEmail) items.push({ impact: 10, title: 'Verify Recovery Email', detail: `${account.name}: add and verify a recovery email.` });
    if (Date.parse(account.lastReviewed || '') < Date.now() - 180 * 86400000) items.push({ impact: 8, title: 'Rotate Password', detail: `${account.name}: password/recovery review is stale.` });
  }
  if (!state.emergencyKits.length) items.push({ impact: 18, title: 'Export Recovery Kit', detail: 'Create an emergency kit to improve recovery readiness.' });
  return items.sort((a, b) => b.impact - a.impact).slice(0, 8);
}
function highlightMatch(text, query = state.globalSearch) {
  const value = String(text || '');
  const needle = String(query || '').trim();
  if (!needle) return value;
  const index = value.toLowerCase().indexOf(needle.toLowerCase());
  if (index === -1) return value;
  return [value.slice(0, index), h('mark', { key: 'match' }, value.slice(index, index + needle.length)), value.slice(index + needle.length)];
}
function globalSearchResults() {
  const query = state.globalSearch.trim().toLowerCase();
  if (!query) return [];
  const entries = [
    ...state.accounts.map((account) => ({ type: 'Account', label: account.name, detail: [account.handle, account.category, account.recoveryEmail].filter(Boolean).join(' · '), href: '#account-detail', action: () => setState({ selectedAccountId: account.id }) })),
    ...state.devices.map((device) => ({ type: 'Device', label: device.browser || device.name || 'Device', detail: [device.os, device.location, device.ip].filter(Boolean).join(' · '), href: '#devices' })),
    ...state.recoveryTimeline.map((event) => ({ type: 'Timeline', label: event.title || 'Timeline event', detail: event.status || event.category || 'Activity', href: '#account-detail' })),
    ...state.activityFeed.map((event) => ({ type: 'Activity', label: event.title || event.type || 'Activity', detail: event.createdAt || 'Recent', href: '#dashboard' })),
    ...state.recoveryContacts.map((contact) => ({ type: 'Recovery Contact', label: contact.name || 'Recovery contact', detail: contact.status || contact.email || 'Trusted contact', href: '#recovery-center' })),
    ...state.recoveryMethods.map((method) => ({ type: 'Recovery Method', label: method.type || method.name || 'Recovery method', detail: method.status || 'Ready', href: '#recovery-center' })),
    ...state.trustedContacts.map((contact) => ({ type: 'Member', label: contact.name || 'Trusted contact', detail: contact.status || 'Trusted recovery contact', href: '#recovery-center' })),
    ...state.organizations.map((org) => ({ type: 'Organization', label: org.name, detail: `${org.role || 'Member'} · ${org.members || 1} members`, href: '#team-vaults' })),
    ...notificationItems().map((note) => ({ type: 'Notification', label: note.title, detail: note.detail, href: '#notifications' })),
    ...['Settings', 'Reports', 'Vault', 'Commands', 'Devices', 'Recovery Center', 'Security Audit', 'Family', 'Organization', 'Dark Web', 'Premium', 'Emergency Kit', 'AI Recovery Coach'].map((label) => ({ type: label === 'Commands' ? 'Command' : 'Page', label, detail: 'SecureSwitch workspace', href: label === 'Reports' ? '#report-generator' : label === 'Vault' ? '#secure-vault' : label === 'Devices' ? '#devices' : label === 'Family' ? '#family-protection' : label === 'Dark Web' ? '#dark-web' : label === 'Emergency Kit' ? '#kit' : `#${label.toLowerCase().replaceAll(' ', '-')}` }))
  ];
  return entries.filter((entry) => `${entry.type} ${entry.label} ${entry.detail}`.toLowerCase().includes(query)).slice(0, 10);
}
function downloadTextFile(filename, mimeType, content) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
function generatePdf(title, lines) {
  const safeLines = [title, '', ...lines].map((line) => String(line).replace(/[()\\]/g, ''));
  const text = safeLines.map((line, index) => `BT /F1 12 Tf 50 ${760 - index * 18} Td (${line}) Tj ET`).join('\n');
  return `%PDF-1.3\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >> endobj\n4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n5 0 obj << /Length ${text.length} >> stream\n${text}\nendstream endobj\ntrailer << /Root 1 0 R >>\n%%EOF`;
}
function exportReport(kind) {
  const recs = prioritizedRecommendations();
  const lines = [`Recovery Score: ${averageScore()}%`, `Accounts: ${state.accounts.length}`, `Top recommendation: ${recs[0]?.title || 'All clear'}`].concat(recs.map((item) => `${item.title}: ${item.detail}`));
  if (kind === 'encrypted') { exportEncryptedRecoveryData(); return; }
  if (kind === 'checklist') downloadTextFile('secureswitch-recovery-checklist.txt', 'text/plain', lines.join('\n'));
  else if (kind === 'contacts') downloadTextFile('secureswitch-emergency-contacts.txt', 'text/plain', state.accounts.map((account) => `${account.name}: ${account.trustedContacts || 'No trusted contact'}`).join('\n'));
  else downloadTextFile(`secureswitch-${kind}-report.pdf`, 'application/pdf', generatePdf(`SecureSwitch ${kind} Report`, lines));
  toast(`${kind} export generated`);
}
async function submitWaitlist(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const record = {
    name: sanitizeInput(form.name.value),
    email: sanitizeInput(form.email.value),
    referralCode: sanitizeInput(form.referral.value || `SS-${Date.now().toString(36).toUpperCase()}`),
    interest: sanitizeInput(form.interest.value),
    audience: sanitizeInput(form.audience.value),
    createdAt: new Date().toISOString()
  };
  try {
    if (state.firebaseReady && state.db) await state.firebase.addDoc(state.firebase.collection(state.db, 'waitlist'), record);
    setState({ waitlistStatus: 'You are on the SecureSwitch beta waitlist.', waitlistReferral: referralLink(record.referralCode) });
    toast('Waitlist spot reserved');
  } catch (error) {
    setState({ waitlistStatus: safeError(error, 'Waitlist could not sync. Your demo signup is saved locally.') });
  }
}
function logSecurityEvent(title) {
  const event = { title, time: new Date().toLocaleTimeString(), id: `sec-${Date.now()}` };
  setState({ securityEvents: [event].concat(state.securityEvents).slice(0, 8) });
}
function importAccountsFromSource(event) {
  event.preventDefault();
  const source = event.currentTarget.source.value;
  const demo = normalizeAccount({ name: `${source} Import`, handle: 'imported@example.com', category: 'Custom', recoveryEmail: 'imported@example.com', recoveryPhone: '+1 (555) 010-0000', authenticator: source.includes('Authenticator') ? source : 'Imported MFA', backupCodes: source === 'Encrypted Backup' ? 'Encrypted backup imported' : '', trustedContacts: 'Imported contact', status: 'Review', color: '#38bdf8' });
  setState({ accounts: [demo].concat(state.accounts), importSource: source });
  logSecurityEvent(`${source} import completed`);
  toast(`${source} local import complete`);
}
function exportFormat(kind) {
  if (kind === 'csv') downloadTextFile('secureswitch-accounts.csv', 'text/csv', ['name,category,recoveryScore,risk'].concat(state.accounts.map((account) => `${account.name},${account.category},${scoreFor(account)},${riskLevel(account)}`)).join('\n'));
  else if (kind === 'json') downloadTextFile('secureswitch-accounts.json', 'application/json', JSON.stringify(state.accounts, null, 2));
  else if (kind === 'emergency-kit') exportReport('contacts');
  else if (kind === 'encrypted') exportEncryptedRecoveryData();
  else exportReport('recovery');
  logSecurityEvent(`${kind} export generated`);
}
async function createOrganization(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const organization = createOrganizationRecord({ name: sanitizeInput(form.organization.value || 'SecureSwitch Organization'), role: state.selectedOrgRole, ownerId: state.user?.uid || 'local' });
  organization.accounts = state.accounts.length;
  organization.devices = safeArray(state.devices).length || 1;
  organization.securityScore = averageScore();
  const audit = enterpriseAuditEvent({ action: 'Account Added', actor: firstName(), category: 'Organization', description: `${organization.name} organization created`, severity: 'Info' });
  try {
    if (usingLiveAccounts()) {
      await writeUserScopedDoc('organizations', organization.id, organization);
      await writeUserScopedDoc('enterpriseAuditLog', audit.id, audit);
    }
    setState({ organizations: [organization].concat(state.organizations), selectedOrganizationId: organization.id, enterpriseAuditLog: [audit].concat(state.enterpriseAuditLog), inviteEmail: '' });
    logSecurityEvent(`${organization.name} organization created`);
    await recordAudit('organization_created', { role: organization.role });
    successToast('Organization workspace created');
  } catch (error) {
    setState({ dataError: safeError(error, 'Organization could not be saved. Demo vault is still available.') });
  }
}
async function inviteOrganizationMember(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const inviteEmail = sanitizeInput(form.inviteEmail.value);
  if (!inviteEmail) return;
  const invite = createInvitation({ email: inviteEmail, role: state.selectedOrgRole, organizationId: state.selectedOrganizationId, inviter: firstName() });
  const audit = enterpriseAuditEvent({ action: 'Organization Invite', actor: firstName(), category: 'Members', description: `${state.selectedOrgRole} invite sent to ${inviteEmail}`, severity: 'Info' });
  try {
    if (usingLiveAccounts()) {
      await writeUserScopedDoc('organizationInvites', invite.id, invite);
      await writeUserScopedDoc('enterpriseAuditLog', audit.id, audit);
    }
    setState({ enterpriseInvitations: [invite].concat(state.enterpriseInvitations), enterpriseAuditLog: [audit].concat(state.enterpriseAuditLog), inviteEmail: '' });
    logSecurityEvent(`${state.selectedOrgRole} invite sent to ${inviteEmail}`);
    await recordAudit('organization_invite', { role: state.selectedOrgRole });
    successToast('Invite prepared');
  } catch (error) {
    setState({ dataError: safeError(error, 'Invite could not be saved. Demo invite is still visible.') });
  }
}
async function createEnterpriseApproval(action, target) {
  const approval = createApproval({ action, actor: firstName(), target, category: 'Approvals' });
  const audit = enterpriseAuditEvent({ action: 'Approval Requested', actor: firstName(), category: 'Approvals', description: `${action} requested for ${target}`, severity: 'Warning' });
  if (usingLiveAccounts()) {
    await writeUserScopedDoc('approvals', approval.id, approval);
    await writeUserScopedDoc('enterpriseAuditLog', audit.id, audit);
  }
  setState({ approvalWorkflows: [approval].concat(state.approvalWorkflows), enterpriseAuditLog: [audit].concat(state.enterpriseAuditLog) });
  successToast('Approval workflow created');
}
function resolveEnterpriseApproval(id, status) {
  const at = new Date().toISOString();
  setState({ approvalWorkflows: state.approvalWorkflows.map((approval) => approval.id === id ? { ...approval, status, history: [...(approval.history || []), { status, actor: firstName(), at }] } : approval) });
  successToast(`Approval ${status.toLowerCase()}`);
}
function updateDashboardWidget(widget, direction) {
  const order = reorderWidget(state.dashboardWidgetOrder, widget, direction);
  try { localStorage.setItem('secureswitch:dashboard-widgets', JSON.stringify(order)); } catch { /* Ignore local storage failures. */ }
  setState({ dashboardWidgetOrder: order });
  successToast('Dashboard layout saved');
}
function passwordHealthScore() {
  const totalLoss = state.accounts.reduce((loss, account) => loss + (!account.backupCodes ? 8 : 0) + (!account.authenticator || account.authenticator === 'SMS only' ? 10 : 0) + (!account.recoveryEmail ? 8 : 0) + (!account.recoveryPhone ? 6 : 0) + (riskLevel(account) === 'High' ? 10 : 0), 0);
  return Math.max(35, Math.min(100, 100 - totalLoss));
}
function chartValues() { return [averageScore(), passwordHealthScore(), Math.max(45, 100 - state.securityEvents.length * 6), Math.min(98, 52 + state.emergencyKits.length * 12), 76, 88]; }
function selectedAccount() { return state.accounts.find((account) => account.id === state.selectedAccountId) || state.accounts[0] || normalizeAccount({ name: 'No account selected', category: 'Custom' }); }
function accountTimeline(account) {
  const events = [
    ['Password changes', account.lastReviewed || 'Today', account.lastReviewed ? 'Password reviewed during latest audit.' : 'No recent password review recorded.'],
    ['Recovery email updates', account.recoveryEmail ? 'Ready' : 'Missing', account.recoveryEmail || `${account.name} recovery email missing.`],
    ['Recovery phone updates', account.recoveryPhone ? 'Ready' : 'Missing', account.recoveryPhone || `${account.name} recovery phone missing.`],
    [account.authenticator ? '2FA enabled' : '2FA disabled', account.authenticator || 'Missing', account.authenticator || `${account.name} has no authenticator recorded.`],
    [account.passkeyStatus ? 'Passkey added' : 'Passkey missing', account.passkeyStatus || 'Missing', account.passkeyStatus || `${account.name} has no passkey.`],
    [account.backupCodes ? 'Backup codes generated' : 'No backup codes', account.backupCodes || 'Missing', account.backupCodes || `${account.name} has no backup codes.`],
    ['New login', 'Current session', state.user ? 'Authenticated SecureSwitch session active.' : 'Demo session active.'],
    [account.deviceVerification ? 'Trusted device' : 'Unknown device', account.deviceVerification || 'Needs review', account.deviceVerification || `${account.name} device trust needs review.`],
    [scoreFor(account) < 80 ? 'Security alerts' : 'Security clear', `${scoreFor(account)}%`, recommendationsFor(account)[0] || 'No urgent recommendations.']
  ];
  return events.map(([title, status, detail], index) => ({ id: `${account.id || account.name}-${index}`, title, status, detail }));
}
function riskFindings(accounts = state.accounts) {
  return explainableSecurityScore(accounts).deductions.map((item) => ({ account: item.accountName, detail: item.reason, severity: item.severity, action: item.recommendedAction, improvement: item.estimatedImprovement }));
}
function liveRiskScore() {
  const findings = riskFindings();
  const score = Math.min(100, findings.reduce((sum, item) => sum + (item.severity === 'Critical' ? 18 : item.severity === 'High' ? 12 : 7), 0));
  const label = score >= 70 ? 'Critical' : score >= 42 ? 'High' : score >= 18 ? 'Medium' : 'Low';
  return { score, label, findings };
}
function runSecurityAudit() {
  const findings = riskFindings();
  const lines = ['SecureSwitch Security Audit', `Generated: ${new Date().toISOString()}`, `Overall Risk: ${liveRiskScore().label}`, '', ...findings.map((item) => `${item.severity}: ${item.detail}`)];
  setState({ auditRan: true, auditReport: lines.join('\n') });
  toast(`Security audit complete: ${findings.length} finding${findings.length === 1 ? '' : 's'}`);
}
function exportSecurityAudit() {
  if (!state.auditReport) runSecurityAudit();
  downloadTextFile('secureswitch-security-audit.txt', 'text/plain', state.auditReport || 'Security audit generated.');
}
function openUpgrade(feature) { setState({ upgradeModal: feature }); }
function securityGrade(score = averageScore()) {
  if (score >= 97) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 67) return 'C';
  return 'D';
}
function protectionStatus(score = liveProtectionScore()) {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Strong';
  if (score >= 60) return 'Needs Review';
  if (score >= 40) return 'At Risk';
  return 'Critical';
}
function topSecurityRecommendation() {
  const finding = riskFindings()[0];
  if (finding) return { text: `${finding.account}: ${finding.detail}. ${finding.action || 'Review now'} could add +${finding.improvement || 0} points.`, time: finding.severity === 'Critical' ? '2 minutes' : '4 minutes', severity: finding.severity };
  return { text: 'All connected accounts are recovery ready.', time: '1 minute', severity: 'Low' };
}
function aiSecurityRecommendations() {
  const duplicateEmails = Object.entries(state.accounts.reduce((map, account) => { const email = account.recoveryEmail || account.email; if (email) map[email] = (map[email] || 0) + 1; return map; }, {})).filter(([, count]) => count > 1);
  const recs = generateSecurityRecommendations(state.accounts, state.devices).slice(0, 5).map((item) => ({ severity: item.severity, text: `${item.accountName}: ${item.reason}`, time: item.severity === 'Critical' ? '2 min' : '4 min', action: item.recommendedAction || 'Fix Now' }));
  if (duplicateEmails.length) recs.unshift({ severity: 'High', text: `You have ${duplicateEmails[0][1]} accounts using the same recovery email.`, time: '3 min', action: 'Review Email' });
  return recs.length ? recs : [{ severity: 'Low', text: 'No urgent account recovery risks detected.', time: '1 min', action: 'Review' }];
}
function vaultItems() {
  return ['Recovery Codes', 'Passkeys', 'Passport', 'Driver License', 'Insurance', 'Emergency Contacts', 'Wallet Recovery', 'Crypto Recovery Notes', 'Medical Information', 'Important Documents'];
}

function localJsonList(key, fallback = []) { try { const value = JSON.parse(localStorage.getItem(key) || 'null'); return Array.isArray(value) ? value : fallback; } catch { return fallback; } }
function saveLocalJsonList(key, value) { try { localStorage.setItem(key, JSON.stringify(value.slice(0, 8))); } catch { /* Ignore private browsing storage failures. */ } }
function rememberPaletteItem(key, label) {
  const existing = localJsonList(key).filter((item) => item !== label);
  saveLocalJsonList(key, [label].concat(existing));
}
function favoritePaletteItem(label) {
  const favorites = localJsonList('secureswitch:command-favorites');
  const next = favorites.includes(label) ? favorites.filter((item) => item !== label) : [label].concat(favorites);
  saveLocalJsonList('secureswitch:command-favorites', next);
  setState({ toast: favorites.includes(label) ? 'Favorite removed' : 'Favorite saved' });
}
function commandPaletteItems() {
  return [
    ['Go to Dashboard', 'Return to command center', () => { location.hash = 'dashboard'; }],
    ['Go to Accounts', 'Open account manager', () => { location.hash = 'accounts'; }],
    ['Go to Devices', 'Open device intelligence center', () => { location.hash = 'devices'; }],
    ['Open Recovery Vault', 'Open recovery methods and contacts', () => { location.hash = 'recovery-center'; }],
    ['Open Security Center', 'Open protection command center', () => { location.hash = 'security-center'; }],
    ['Open AI Copilot', 'Open AI Copilot workspace', () => { location.hash = 'ai-recovery-coach'; setState({ aiCopilotOpen: false }); }],
    ['Open Notifications', 'Open notification center', () => { location.hash = 'notifications'; }],
    ['Open Settings', 'Workspace preferences', () => { location.hash = 'settings'; }],
    ['View Security Score', `${liveProtectionScore()}% protection score`, () => { location.hash = 'security-center'; }],
    ['Show Risky Accounts', `${weakAccounts().length} accounts need attention`, () => { setState({ accountRiskFilter: 'High' }); location.hash = 'accounts'; }],
    ['Show Missing MFA', `${state.accounts.filter((account) => !account.authenticator || /sms only/i.test(account.authenticator)).length} accounts`, () => { setState({ accountSearch: 'SMS' }); location.hash = 'accounts'; }],
    ['Show Weak Passwords', `${riskFindings().length} security findings`, () => { location.hash = 'security-audit'; }],
    ['Show Recovery Ready', `${state.accounts.filter((account) => account.ready).length} ready accounts`, () => { setState({ recoveryStatusFilter: 'Ready' }); location.hash = 'recovery-center'; }],
    ['Show Devices', `${safeArray(state.devices).length || 1} device records`, () => { location.hash = 'devices'; }],
    ['Show Audit Events', `${buildSecurityTimeline({ accounts: state.accounts, activity: state.activityFeed, notifications: notificationItems(), auditEvents: state.auditEvents, devices: state.devices }).length} events`, () => { location.hash = 'security-center'; }],
    ['Add Account', 'Open existing account form', () => { location.hash = 'accounts'; toast('Account form ready'); }],
    ['Backup Codes', 'Open recovery center backup code workflow', () => { location.hash = 'recovery-center'; toast('Backup code workflow ready'); }],
    ['Export', 'Open import/export center', () => { location.hash = 'import-export'; }],
    ['Theme', 'Theme controls', () => toast('Dark mode is already enabled')],
    ['Diagnostics', 'Open hidden app health diagnostics', () => { location.hash = 'app-health'; }],
    ['Run Scan', 'Start health scan', runHealthScan]
  ];
}
function palettePageItems() {
  return [
    ['Dashboard', '#dashboard', 'Home command center'], ['Accounts', '#accounts', 'Account manager'], ['Devices', '#devices', 'Device intelligence'], ['Recovery Vault', '#recovery-center', 'Recovery methods'], ['Security Center', '#security-center', 'Security command center'], ['AI Copilot', '#ai-recovery-coach', 'Copilot workspace'], ['Notifications', '#notifications', 'Notification center'], ['Settings', '#settings', 'Workspace settings'], ['Premium', '#premium', 'Plans'], ['Vault', '#secure-vault', 'Secure vault'], ['Emergency Kit', '#kit', 'Emergency access'], ['Family', '#family-protection', 'Family protection'], ['Organization', '#organization', 'Organization workspace'], ['Dark Web', '#dark-web', 'Dark web monitoring']
  ].map(([label, href, detail]) => ({ group: 'Pages', icon: '⌘', label, detail, href, action: () => { location.hash = href.replace('#', ''); } }));
}
function paletteDataItems() {
  const timeline = buildSecurityTimeline({ accounts: state.accounts, activity: state.activityFeed, notifications: notificationItems(), auditEvents: state.auditEvents, devices: state.devices });
  const recommendations = generateSecurityRecommendations(state.accounts, state.devices);
  return [
    ...state.accounts.map((account) => ({ group: 'Accounts', icon: brandMark(account.name), label: account.name, detail: [account.handle, account.category, riskLevel(account), `${scoreFor(account)}%`].filter(Boolean).join(' · '), action: () => { setState({ selectedAccountId: account.id }); location.hash = 'account-detail'; } })),
    ...state.devices.map((device) => ({ group: 'Devices', icon: '◈', label: device.name || device.browser || 'Device', detail: [device.os, device.location, device.trusted ? 'Trusted' : 'Needs review'].filter(Boolean).join(' · '), action: () => { location.hash = 'devices'; } })),
    ...state.recoveryMethods.map((method) => ({ group: 'Recovery', icon: '◇', label: method.type || method.name || 'Recovery method', detail: method.status || 'Recovery record', action: () => { location.hash = 'recovery-center'; } })),
    ...state.recoveryContacts.map((contact) => ({ group: 'Recovery', icon: '◌', label: contact.name || 'Recovery contact', detail: contact.email || contact.status || 'Trusted contact', action: () => { location.hash = 'recovery-center'; } })),
    ...timeline.slice(0, 10).map((event) => ({ group: 'Audit & Activity', icon: '•', label: event.title, detail: `${event.type} · ${formatDate(event.at)}`, action: () => { location.hash = 'security-center'; } })),
    ...notificationItems().map((item) => ({ group: 'Notifications', icon: '!', label: item.title, detail: item.detail || item.category || 'Notification', action: () => { location.hash = 'notifications'; } })),
    ...recommendations.map((item) => ({ group: 'Recommendations', icon: '+', label: item.recommendedAction || item.title, detail: `${item.accountName}: ${item.reason}`, action: () => { location.hash = 'ai-recovery-coach'; setState({ aiCopilotQuestion: 'What should I fix first?' }); } })),
    ...Object.entries(state.settings || {}).map(([label, value]) => ({ group: 'Settings', icon: '⚙', label, detail: String(value), action: () => { location.hash = 'settings'; } }))
  ];
}
function commandPaletteResults() {
  const query = state.globalSearch.trim().toLowerCase();
  const favorites = localJsonList('secureswitch:command-favorites');
  const recentCommands = localJsonList('secureswitch:command-recents');
  const recentSearches = localJsonList('secureswitch:search-recents');
  const commandItems = commandPaletteItems().map(([label, detail, action]) => ({ group: 'Commands', icon: '↵', label, detail, action }));
  const recentItems = recentCommands.map((label) => commandItems.find((item) => item.label === label)).filter(Boolean).map((item) => ({ ...item, group: 'Recent' }));
  const searchItems = recentSearches.map((label) => ({ group: 'Recent Searches', icon: '⌕', label, detail: 'Saved local search', action: () => setState({ globalSearch: label, commandIndex: 0 }) }));
  const favoriteItems = favorites.map((label) => [...commandItems, ...palettePageItems()].find((item) => item.label === label)).filter(Boolean).map((item) => ({ ...item, group: 'Favorites' }));
  const entries = [...favoriteItems, ...recentItems, ...searchItems, ...commandItems, ...palettePageItems(), ...paletteDataItems()];
  const filtered = query ? entries.filter((entry) => `${entry.group} ${entry.label} ${entry.detail}`.toLowerCase().includes(query)) : entries.filter((entry) => ['Favorites', 'Recent', 'Recent Searches', 'Commands', 'Pages'].includes(entry.group));
  const seen = new Set();
  return filtered.filter((entry) => { const key = `${entry.group}:${entry.label}:${entry.detail}`; if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, 48);
}
function groupedPaletteResults(results) {
  return results.reduce((groups, item) => { (groups[item.group] ||= []).push(item); return groups; }, {});
}
function executeCommand(command) {
  const label = Array.isArray(command) ? command[0] : command.label;
  const action = Array.isArray(command) ? command[2] : command.action;
  if (state.globalSearch.trim()) rememberPaletteItem('secureswitch:search-recents', state.globalSearch.trim());
  rememberPaletteItem('secureswitch:command-recents', label);
  setState({ commandPaletteOpen: false, globalSearch: '', commandIndex: 0 });
  action?.();
}

const recoveryPlaybooks = {
  'Phone stolen': ['Lock the lost phone remotely', 'Freeze SIM with your carrier', 'Recover Apple ID and Google', 'Restore authenticator from backup', 'Review banking and crypto sessions'],
  'Email hacked': ['Secure recovery email first', 'Reset primary email password', 'Revoke unknown sessions', 'Rotate backup codes', 'Review linked accounts'],
  'SIM swap': ['Call carrier fraud line', 'Freeze financial accounts', 'Move accounts off SMS', 'Verify recovery email', 'Notify trusted contacts'],
  'Authenticator lost': ['Use saved backup codes', 'Recover primary email', 'Restore authenticator app', 'Re-enable passkeys', 'Document new recovery path'],
  'Crypto wallet lost': ['Find cold recovery backup', 'Lock exchange accounts', 'Notify trusted contact', 'Move funds if needed', 'Record emergency notes'],
  'Social media hacked': ['Start platform recovery', 'Secure recovery email', 'Revoke connected apps', 'Update MFA', 'Capture incident timeline']
};
const onboardingSteps = ['Understand SecureSwitch', 'Add first account', 'Add recovery email and phone', 'Add backup codes', 'Add trusted contact', 'Get first recovery score'];
function filteredAccounts() {
  const query = state.accountSearch.toLowerCase();
  return state.accounts.filter((account) => (state.accountCategory === 'All' || account.category === state.accountCategory) && [account.name, account.handle, account.recoveryEmail, account.category].join(' ').toLowerCase().includes(query));
}

function scoreFor(account) { return scoreAccount(account); }
function averageScore() { return dashboardSummary(state.accounts).recoveryScore; }
function liveProtectionScore() { return averageScore(); }
function reviewCount() { return state.accounts.filter((account) => account.status === 'Review' || scoreFor(account) < 80).length; }
function linkedAccounts() { return state.accounts.filter((account) => [account.phone, account.email, account.recoveryPhone, account.recoveryEmail].includes(state.selectedRecovery)); }
function switchAccounts() { return state.accounts.filter((account) => account.phone === state.switchOld || account.recoveryPhone === state.switchOld); }
function weakAccounts() { return state.accounts.filter((account) => scoreFor(account) < 90 || account.status === 'Review'); }
function duplicatedRecoveryEmails() {
  const counts = state.accounts.reduce((map, account) => { const email = account.recoveryEmail || account.email; if (email) map[email] = (map[email] || 0) + 1; return map; }, {});
  return Object.values(counts).filter((count) => count > 1).reduce((sum, count) => sum + count, 0);
}
function oldPhoneAccounts() { return state.accounts.filter((account) => account.phone === state.switchOld || account.recoveryPhone === state.switchOld); }
function riskScore() { return Math.min(10, Math.round(((reviewCount() * 1.7) + (oldPhoneAccounts().length * 0.8) + duplicatedRecoveryEmails()) * 10) / 10); }
function scoreBreakdown() {
  const score = averageScore();
  return [
    { label: 'Authentication', score: Math.min(99, score + 11), color: '#34d399', explanation: 'Authenticator and passkey coverage across critical accounts.', recommendation: 'Replace SMS-only recovery with authenticator or passkey.' },
    { label: 'Recovery', score: score + 7, color: '#38bdf8', explanation: 'Recovery email, phone, and trusted contact resilience.', recommendation: 'Update old phone references and add trusted contacts.' },
    { label: 'Backups', score: Math.max(62, score - 5), color: '#fbbf24', explanation: 'Backup code availability and offline recovery readiness.', recommendation: 'Generate and store fresh backup codes for review accounts.' },
    { label: 'Privacy', score: Math.min(96, score + 4), color: '#a855f7', explanation: 'Exposure from duplicated recovery paths and shared methods.', recommendation: 'Use unique recovery emails for banking and crypto accounts.' },
    { label: 'Identity', score: Math.min(98, score + 8), color: '#ec4899', explanation: 'Identity document and emergency-contact preparedness.', recommendation: 'Verify emergency contacts and identity packet quarterly.' }
  ];
}
function issueList() {
  return [
    { severity: 'Critical', title: 'Old phone number reused', detail: `${oldPhoneAccounts().length} accounts still reference ${state.switchOld}.`, why: 'A stolen or swapped phone can become the recovery path for multiple services.', time: '3 min', fix: 'Start Switch Mode' },
    { severity: 'High', title: 'Duplicate recovery emails', detail: `${duplicatedRecoveryEmails()} accounts share recovery email paths.`, why: 'One compromised inbox can unlock multiple accounts.', time: '4 min', fix: 'Rotate recovery emails' },
    { severity: 'High', title: 'Missing backup codes', detail: `${dashboardSummary(state.accounts).missingBackupCodes} accounts have no backup code record.`, why: 'Without backup codes, losing an authenticator can block recovery.', time: '2 min', fix: 'Generate backup codes' },
    { severity: 'Medium', title: 'Missing trusted contacts', detail: `${state.accounts.filter((account) => !account.trustedContacts).length} accounts need a trusted recovery contact.`, why: 'Trusted contacts provide a human fallback during emergencies.', time: '5 min', fix: 'Add trusted contact' },
    { severity: 'Low', title: 'Outdated authenticator methods', detail: `${state.accounts.filter((account) => /sms/i.test(account.authenticator || '')).length} account still depends on SMS-only recovery.`, why: 'SMS is vulnerable to SIM swap attacks.', time: '3 min', fix: 'Upgrade authenticator' }
  ];
}
function runHealthScan() { setState({ scanComplete: true }); toast(`Recovery Health Scan complete: ${averageScore()}%`); }

function Sidebar() {
  const links = [
    ['dashboard', 'Dashboard', 'dashboard'], ['accounts', 'Accounts', 'accounts'], ['switch', 'Switch Mode', 'switch'],
    ['blackout', 'Blackout Mode', 'blackout'], ['kit', 'Emergency Kit', 'kit'], ['lookup', 'Recovery Lookup', 'lookup'], ['settings', 'Settings', 'settings']
  ];
  return h('aside', { className: 'sidebar', 'aria-label': 'SecureSwitch navigation' },
    h('a', { className: 'brand', href: '#dashboard' }, h('span', { className: 'logo', 'aria-hidden': true }, '0'), h('span', { className: 'brand-wordmark' }, 'SecureSwitch'), h('b', null, 'PRO')),
    h('nav', null, links.map(([icon, label, id]) => h('a', { key: id, href: `#${id}`, className: currentRoute() === id ? 'active' : '' }, h('span', { className: 'nav-glyph', 'aria-hidden': true }, h(Icon, { name: icon })), h('span', null, label)))),
    h('article', { className: 'go-pro' }, h('p', { className: 'eyebrow' }, '✦ Go Pro'), h('p', null, 'Unlock unlimited accounts, advanced monitoring, and priority recovery.'), h('button', { className: 'primary', onClick: () => toast('Go Pro coming soon') }, 'Upgrade Now')),
    h('footer', { className: 'profile' }, h('span', null, 'KH'), h('div', null, h('strong', null, 'Keith Harrison'), h('small', null, 'keith@secureswitch.app')), h('i', null, '⌄'))
  );
}

function AuthCard() {
  return h('section', { className: 'auth-card glass' }, h('p', { className: 'eyebrow' }, state.user ? 'Authenticated' : 'Firebase Authentication'), h('h2', null, state.user ? `Signed in as ${state.user.email || 'SecureSwitch user'}` : 'Sign in to sync your encrypted vault'), state.authError && h('p', { className: 'error-state' }, state.authError), state.user && h('button', { className: 'primary full', onClick: () => state.firebase.signOut(state.auth) }, 'Secure Logout'), !state.user && h('form', { onSubmit: submitAuth }, h('input', { name: 'email', type: 'email', placeholder: 'Email', required: true }), h('input', { name: 'password', type: 'password', placeholder: 'Password', minLength: 6, required: true }), h('button', { className: 'primary full', disabled: state.loading }, state.loading ? 'Working…' : state.mode === 'signup' ? 'Create Account' : 'Login')), !state.user && h('div', { className: 'auth-actions' }, h('button', { onClick: () => setState({ mode: state.mode === 'signup' ? 'login' : 'signup' }) }, state.mode === 'signup' ? 'Use login' : 'Create account'), h('button', { onClick: () => state.auth ? state.firebase.sendPasswordResetEmail(state.auth, document.querySelector('[name=email]').value) : toast('Configure Firebase first') }, 'Forgot Password')), !state.user && h('button', { onClick: () => state.auth ? state.firebase.signInWithPopup(state.auth, new state.firebase.GoogleAuthProvider()) : toast('Configure Firebase first') }, 'Continue with Google'), !state.user && h('button', { onClick: () => state.auth ? state.firebase.signInWithPopup(state.auth, new state.firebase.OAuthProvider('apple.com')) : toast('Configure Firebase first') }, 'Continue with Apple'), h('p', { className: 'muted' }, `Firestore-ready collections: ${firestoreCollections.join(', ')}`));
}

function VaultHeroVisual() {
  const assets = [
    ['Recovery Emails', 'Protected', 'Jun 29', '2 addresses'], ['Phone Numbers', 'Verified', 'Jun 28', '3 numbers'], ['Authenticator Apps', 'Hardware-ready', 'Jun 27', '1Password + YubiKey'],
    ['Backup Codes', 'Sealed', 'Jun 25', '24 codes'], ['Passkeys', 'Synced', 'Jun 26', '6 passkeys'], ['Crypto Wallets', 'Cold backup', 'Jun 22', '2 wallets'],
    ['Trusted Contacts', 'Ready', 'Jun 20', '4 contacts'], ['Emergency Documents', 'Locked', 'Jun 12', '5 files'], ['Devices', 'Trusted', 'Jun 19', '7 devices'], ['SIM Cards', 'Carrier-ready', 'Jun 18', '2 SIMs']
  ];
  const selected = assets.find(([name]) => name === state.selectedVaultCategory) || assets[0];
  return h('section', { className: `premium-vault ${state.vaultUnlocked ? 'unlocked' : 'locked'}`, 'aria-label': 'Interactive encrypted recovery center' },
    h('button', { className: 'vault-stage', onClick: () => { setState({ vaultUnlocked: !state.vaultUnlocked }); toast(state.vaultUnlocked ? 'Digital vault locked' : 'Digital vault unlocked'); }, 'aria-pressed': state.vaultUnlocked },
      h('span', { className: 'vault-glow-ring', 'aria-hidden': true }),
      h('span', { className: 'vault-light-sweep', 'aria-hidden': true }),
      h('span', { className: 'vault-unlock-burst', 'aria-hidden': true }, Array.from({ length: 10 }).map((_, index) => h('i', { key: index, style: { '--burst': index } }))),
      h('span', { className: 'vault-particles', 'aria-hidden': true }, Array.from({ length: 12 }).map((_, index) => h('i', { key: index, style: { '--p': index } }))),
      h('span', { className: 'vault-body', 'aria-hidden': true },
        h('span', { className: 'vault-door' }, h('span', { className: 'vault-reflection' }), h('span', { className: 'vault-wheel' }), h('span', { className: 'vault-keypad' }, Array.from({ length: 9 }).map((_, index) => h('i', { key: index }))), h('span', { className: 'vault-fingerprint' }), h('span', { className: 'vault-shield' }, '⬟'), h('span', { className: 'vault-lock' }, state.vaultUnlocked ? '🔓' : '🔒')),
        h('span', { className: 'vault-interior' }, selected[0])
      ),
      h('span', { className: 'vault-caption' }, state.vaultUnlocked ? `${selected[0]} unlocked` : 'Click to unlock encrypted vault')
    ),
    h('div', { className: 'vault-assets', 'aria-live': 'polite' }, assets.map(([name, status, date, detail]) => h('button', { key: name, className: `vault-asset ${state.selectedVaultCategory === name ? 'active' : ''}`, onClick: () => setState({ selectedVaultCategory: name, vaultUnlocked: true }) }, h('span', { className: 'asset-status' }), h('strong', null, name), h('small', null, detail), h('ul', null, ['AES-256', 'Verified', 'Encrypted', `Last Updated ${date}`, 'Recovery Ready', 'Backup Verified'].map((item) => h('li', { key: item }, '✓ ', item))), h('b', null, status), h('i', null, state.selectedVaultCategory === name ? '🔓' : '🔒')))),
    h('article', { className: 'vault-detail glass' }, h('p', { className: 'eyebrow' }, 'Open Category'), h('h3', null, selected[0]), h('p', null, `${selected[3]} secured with AES-256 encryption, verification metadata, and recovery-ready backup status.`))
  );
}

function Hero() {
  return h('section', { className: 'hero glass', id: 'dashboard' },
    h('div', { className: 'hero-copy-panel' },
      h('p', { className: 'eyebrow' }, '✦ Polished SaaS MVP'),
      h('h1', null, h('span', { className: 'sr-only' }, 'Never lose another account again.'), h('span', { 'aria-hidden': true }, 'Never lose', h('br'), 'another account', h('br'), h('span', null, 'again.'))),
      h('p', null, 'SecureSwitch protects your logins, recovery options, and digital identity before disaster strikes.'),
      h('div', { className: 'hero-actions' }, h('button', { className: 'primary', onClick: runHealthScan }, h(Icon, { name: 'shield' }), 'Run Health Check'), h('button', { onClick: () => toast('Demo walkthrough coming soon') }, h(Icon, { name: 'play' }), 'Watch Demo'))
    ),
    h(SafeGraphic)
  );
}

function ProtectionScore() {
  const displayScore = 86;
  return h('aside', { className: 'floating-score glass', 'aria-label': 'Live Protection Score' },
    h('div', { className: 'score-card-head' }, h('p', { className: 'eyebrow score-title' }, 'Live Protection Score'), h(Icon, { name: 'info' })),
    h('div', { className: 'score-ring', style: { '--score': `${displayScore * 3.6}deg` } }, h('div', { className: 'score-ring-center' }, h('strong', null, `${displayScore}%`), h('span', null, h(Icon, { name: 'shield' }), 'Excellent'))),
    h('dl', null, h('div', null, h('dt', null, '50'), h('dd', null, 'Accounts'), h(Icon, { name: 'accounts' })), h('div', null, h('dt', null, '9'), h('dd', null, 'Need Review'), h(Icon, { name: 'blackout' })), h('div', null, h('dt', null, '3m'), h('dd', null, 'Switch Plan'), h(Icon, { name: 'switch' })))
  );
}

function ProtectedStatus() {
  return h('article', { className: 'protected glass' }, h('span', { className: 'check-orb' }, h(Icon, { name: 'lock' })), h('div', null, h('h3', null, 'You’re protected'), h('p', null, 'Great job! Keep your recovery methods up to date.')), h('b', null, '›'));
}

function QuickActions() {
  const actions = [
    ['plus', 'Add New Account', () => location.hash = 'accounts'],
    ['shield', 'Run Health Check', runHealthScan],
    ['code', 'Generate Backup Codes', () => toast('Backup code workflow prepared')],
    ['contacts', 'View Recovery Contacts', () => location.hash = 'kit']
  ];
  return h('section', { className: 'quick-panel glass' }, h('p', { className: 'eyebrow' }, 'Quick Actions'), actions.map(([icon, label, action]) => h('button', { key: label, className: `quick-row ${icon}`, onClick: action }, h('span', null, h(Icon, { name: icon })), label, h('b', null, '›'))));
}

function AccountCard({ account }) {
  const score = scoreFor(account);
  return h('article', { className: 'account-row' }, h('span', { className: 'app-icon', style: { background: account.color } }, account.name[0]), h('div', null, h('strong', null, account.name), h('small', null, `${account.handle || account.recoveryEmail} · ${account.category} · Reviewed ${account.lastReviewed}`)), h('b', { className: score < 80 ? 'review' : 'secure' }, `${score}% · ${riskLevel(account)} risk`), h('div', { className: 'account-actions' }, h('button', { onClick: () => editAccount(account) }, 'Edit'), h('button', { onClick: () => deleteAccount(account.id) }, 'Delete')));
}

function Accounts() {
  const accounts = filteredAccounts();
  return h('section', { className: 'panel glass', id: 'accounts' }, h('div', { className: 'panel-head' }, h('div', null, h('p', { className: 'eyebrow' }, 'Your Accounts'), h('h2', null, 'Production account registry')), h('span', null, `${accounts.length}/${state.accounts.length} shown`)), state.loading && h('div', { className: 'loading-state' }, h('span'), h('span'), h('span')), state.dataError && h('p', { className: 'error-state' }, state.dataError), h('div', { className: 'account-toolbar' }, h('input', { value: state.accountSearch, onChange: (event) => setState({ accountSearch: event.target.value }), placeholder: 'Search accounts, usernames, recovery emails…', 'aria-label': 'Search accounts' }), h('select', { value: state.accountCategory, onChange: (event) => setState({ accountCategory: event.target.value }), 'aria-label': 'Filter accounts by category' }, ['All', ...accountCategories].map((category) => h('option', { key: category }, category)))), accounts.length ? accounts.map((account) => h(AccountCard, { key: account.id, account })) : h('div', { className: 'empty-state' }, h('strong', null, 'No accounts match this view'), h('p', null, 'Clear the search or add your first account to start calculating recovery health.')));
}

function AccountForm() {
  const editing = state.accounts.find((account) => account.id === state.editingAccountId);
  return h('section', { className: 'panel glass', id: 'account-form' }, h('p', { className: 'eyebrow' }, state.editingAccountId ? 'Edit Account' : 'Import / Add Account'), h('h2', null, state.editingAccountId ? `Editing ${editing?.name || 'account'}` : 'Manual account import'), h('form', { className: 'account-form', onSubmit: saveAccount }, h('input', { name: 'name', placeholder: 'Service name', defaultValue: editing?.name || '', required: true }), h('input', { name: 'handle', placeholder: 'Username', defaultValue: editing?.handle || '' }), h('select', { name: 'category', defaultValue: editing?.category || 'Email' }, accountCategories.map((category) => h('option', { key: category }, category))), h('input', { name: 'email', placeholder: 'Recovery email', defaultValue: editing?.recoveryEmail || '' }), h('input', { name: 'phone', placeholder: 'Recovery phone', defaultValue: editing?.recoveryPhone || '' }), h('input', { name: 'authenticator', placeholder: 'Authenticator status', defaultValue: editing?.authenticator || '' }), h('input', { name: 'passkey', placeholder: 'Passkey status', defaultValue: editing?.passkeyStatus || '' }), h('input', { name: 'codes', placeholder: 'Backup code status', defaultValue: editing?.backupCodes || '' }), h('input', { name: 'contacts', placeholder: 'Trusted contacts', defaultValue: editing?.trustedContacts || '' }), h('input', { name: 'device', placeholder: 'Device verification', defaultValue: editing?.deviceVerification || '' }), h('input', { name: 'reviewed', type: 'date', defaultValue: editing?.lastReviewed || new Date().toISOString().slice(0, 10) }), h('button', { className: 'primary full-span' }, state.editingAccountId ? 'Update Account' : 'Save Account'), state.editingAccountId && h('button', { type: 'button', onClick: () => setState({ editingAccountId: '' }) }, 'Cancel edit')), h('p', { className: 'muted' }, 'CSV import is planned next; manual import creates real editable local records today.'));
}

function SwitchMode() {
  const affected = switchAccounts();
  return h('section', { className: 'panel glass', id: 'switch' }, h('p', { className: 'eyebrow' }, 'Switch Mode'), h('h2', null, 'Change phone workflow'), h('div', { className: 'two-inputs' }, h('input', { value: state.switchOld, onChange: (event) => setState({ switchOld: event.target.value }) }), h('input', { value: state.switchNew, onChange: (event) => setState({ switchNew: event.target.value }) })), h('button', { className: 'primary', onClick: () => toast(`${affected.length} account checklist generated`) }, 'Generate checklist'), h('ul', { className: 'mini-list' }, affected.map((account) => h('li', { key: account.name }, `${account.name} → update recovery phone`))));
}

function BlackoutMode() {
  return h('section', { className: 'panel glass', id: 'blackout' }, h('p', { className: 'eyebrow' }, 'Blackout Mode'), h('h2', null, 'Emergency lockdown'), h('button', { className: 'danger full', onClick: () => setState({ blackoutArmed: !state.blackoutArmed }) }, state.blackoutArmed ? 'Disarm Blackout' : 'Arm Blackout'), h('ol', { className: 'mini-list' }, ['Freeze SIM', 'Lock Apple ID', 'Lock Gmail', 'Lock banks', 'Lock crypto', 'Notify trusted contacts'].map((item) => h('li', { key: item }, item))));
}

function RecoveryLookup() {
  const options = [...new Set(state.accounts.flatMap((account) => [account.phone, account.email, account.recoveryPhone, account.recoveryEmail]).filter(Boolean))];
  return h('section', { className: 'panel glass', id: 'lookup' }, h('p', { className: 'eyebrow' }, 'Recovery Lookup'), h('h2', null, 'Linked accounts'), h('select', { value: state.selectedRecovery, onChange: (event) => setState({ selectedRecovery: event.target.value }) }, options.map((value) => h('option', { key: value }, value))), linkedAccounts().map((account) => h(AccountCard, { key: account.name, account })));
}

function EmergencyKit() {
  return h('section', { className: 'panel glass', id: 'kit' }, h('p', { className: 'eyebrow' }, 'Emergency Kit'), h('h2', null, 'Ready packet'), h('div', { className: 'kit-grid' }, ['Trusted contacts', 'Offline backup codes', 'Recovery letter', 'Insurance notes'].map((item) => h('div', { key: item }, h('strong', null, item), h('small', null, 'Ready')))));
}

function EmergencyKitSummary() {
  return h('section', { className: 'panel glass emergency-summary' }, h('p', { className: 'eyebrow' }, 'Emergency Kit'), h('h2', null, 'Ready to export'), h('p', null, 'Trusted contacts, offline backup codes, recovery letter, and insurance notes are prepared.'), h('a', { className: 'rail-link', href: '#kit' }, 'Open kit →'));
}

function SuggestedFixes() {
  const fixes = dashboardSummary(state.accounts).suggestedNextFixes.length ? dashboardSummary(state.accounts).suggestedNextFixes.slice(0, 3) : ['All accounts are recovery ready'];
  return h('section', { className: 'panel glass suggested-fixes' }, h('p', { className: 'eyebrow' }, 'Suggested Fixes'), h('h2', null, 'Next 7 minutes'), fixes.map((fix) => h('button', { key: fix, onClick: () => toast(`${fix} workflow started`) }, h('span', null, '✦'), fix)));
}

function ScoreRing({ item }) { return h('article', { className: 'mini-ring-card' }, h('div', { className: 'mini-ring', style: { '--ring': `${item.score * 3.6}deg`, '--ring-color': item.color } }, h('strong', null, item.score)), h('h3', null, item.label), h('p', null, item.explanation), h('small', null, item.recommendation)); }
function IdentityHealthDashboard() { return h('section', { className: 'panel glass identity-health', id: 'identity-health' }, h('p', { className: 'eyebrow' }, 'Identity Health'), h('h2', null, 'If you lost access today, would you recover?'), h('div', { className: 'identity-grid' }, scoreBreakdown().concat([{ label: 'Family Readiness', score: 73, color: '#60a5fa', explanation: 'Family members with trusted recovery plans.', recommendation: 'Share emergency kits with trusted family members.' }]).map((item) => h(ScoreRing, { key: item.label, item })))); }
function HealthScan() {
  const scanned = ['Authentication ✓', 'Recovery ✓', 'Backups ⚠', 'Devices ✓', 'Privacy ✓', 'Identity ✓', 'Trusted Contacts ⚠', 'Family Recovery ✓', 'Cloud Sync ✓', 'Crypto Readiness ⚠'];
  const breakdown = scoreBreakdown().concat([
    { label: 'Devices', score: 92, color: '#60a5fa', explanation: 'Trusted devices and recent sync posture.', recommendation: 'Remove stale devices after every phone change.' },
    { label: 'Trusted Contacts', score: 78, color: '#f97316', explanation: 'Human recovery fallbacks for critical accounts.', recommendation: 'Verify two trusted contacts this week.' },
    { label: 'Family Recovery', score: 81, color: '#22c55e', explanation: 'Emergency sharing and family recovery readiness.', recommendation: 'Refresh Grandma’s recovery phone.' },
    { label: 'Cloud Sync', score: 88, color: '#38bdf8', explanation: 'Encrypted cross-device recovery availability.', recommendation: 'Unlock vault on your backup device.' },
    { label: 'Crypto Readiness', score: 72, color: '#facc15', explanation: 'Wallet recovery, cold backups, and trusted contacts.', recommendation: 'Add hardware key backup for Coinbase.' }
  ]);
  return h('section', { className: 'panel glass scan-panel', id: 'scan' }, h('div', { className: 'panel-head' }, h('div', null, h('p', { className: 'eyebrow' }, 'Recovery Health Scan 2.0'), h('h2', null, 'Analyze my recovery health')), h('button', { className: 'primary', onClick: runHealthScan }, state.scanComplete ? 'Launch guided repair' : 'Analyze my recovery health')), state.scanComplete ? h('div', { className: 'scan-results' }, h('div', { className: 'scan-services' }, scanned.map((item) => h('span', { key: item }, item))), h('div', { className: 'health-breakdown' }, breakdown.map((item) => h(ScoreRing, { key: item.label, item }))), h('h3', null, `Overall Recovery Health ${averageScore()}% — Excellent`), h('p', null, 'This account can be made 100% recoverable by fixing these three items.'), h('div', { className: 'issue-grid' }, issueList().map((issue) => h('article', { className: `issue-card ${issue.severity.toLowerCase()}`, key: issue.title }, h('b', null, issue.severity), h('h3', null, issue.title), h('p', null, issue.detail), h('small', null, issue.why), h('span', null, `Estimated: ${issue.time}`), h('button', { onClick: () => toast(`${issue.fix} workflow started`) }, issue.fix)))), h('strong', { className: 'risk-score' }, `Risk Score: ${riskScore()} / 10`)) : h('p', { className: 'muted' }, 'One click scans every saved account, calculates recovery, authentication, backup, privacy, and identity scores, then builds a repair checklist.'));
}
function EmergencyButton() {
  const steps = ['Revoke active sessions', 'Open Apple and Google recovery links', 'Notify trusted contacts', 'Export emergency checklist', 'Freeze crypto checklist', 'Call carrier', 'Save police report number'];
  return h('section', { className: 'panel glass emergency-panel' }, h('p', { className: 'eyebrow' }, 'Emergency Button'), h('h2', null, 'PHONE STOLEN'), h('div', { className: 'emergency-buttons' }, ['Phone Stolen', 'SIM Swap', 'Email Hacked', 'Lost Authenticator', 'Crypto Wallet Lost', 'Social Media Hacked'].map((scenario) => h('button', { key: scenario, className: state.emergencyScenario === scenario ? 'active' : '', onClick: () => setState({ emergencyScenario: scenario, emergencyActive: true }) }, scenario))), h('p', { className: 'muted' }, `Estimated completion: ${state.emergencyScenario.includes('Crypto') ? '18' : '12'} minutes`), state.emergencyActive && h('ol', { className: 'mini-list emergency-list' }, steps.map((step) => h('li', { key: step }, step))));
}
function RecoveryCoach() {
  const steps = ['Lock device — Estimated: 30 seconds', 'Recover Gmail', 'Recover Apple ID', 'Recover Banking', 'Rotate Backup Codes'];
  return h('section', { className: 'panel glass ai-panel', id: 'recovery-coach' }, h('p', { className: 'eyebrow' }, 'Recovery Coach'), h('h2', null, '“I lost my phone.”'), h('div', { className: 'coach-step' }, h('b', null, `Step ${state.aiStep + 1}`), h('p', null, steps[state.aiStep])), h('button', { className: 'primary', onClick: () => setState({ aiStep: Math.min(state.aiStep + 1, steps.length - 1) }) }, 'Next →'));
}
function RecoveryTimeline() { const filters = ['All', 'Security', 'Recovery', 'Emergency', 'Family', 'Identity', 'Passwords', 'Passkeys']; return h('section', { className: 'panel glass timeline-panel', id: 'timeline' }, h('p', { className: 'eyebrow' }, 'Recovery Timeline'), h('h2', null, 'Visual identity history'), h('div', { className: 'filter-row' }, filters.map((filter) => h('button', { key: filter, className: state.timelineFilter === filter ? 'active-filter' : '', onClick: () => setState({ timelineFilter: filter }) }, filter))), h('div', { className: 'timeline-list' }, timelineEvents.map((event) => h('article', { key: event.title }, h('time', null, event.date), h('span', null, event.title), h('b', null, event.status))))); }
function EmergencySimulator() {
  const scenarios = ['My phone was stolen', 'SIM Swap', 'Laptop stolen', 'Email hacked', 'Authenticator deleted', 'Lost backup codes', 'Identity theft', 'Ransomware'];
  const result = reviewCount() > 1 ? 'PARTIAL' : 'YES';
  return h('section', { className: 'panel glass simulator-panel', id: 'simulator' }, h('p', { className: 'eyebrow' }, 'Emergency Simulator'), h('h2', null, 'Practice before disaster'), h('select', { value: state.simulatorScenario, onChange: (event) => setState({ simulatorScenario: event.target.value }) }, scenarios.map((scenario) => h('option', { key: scenario }, scenario))), h('button', { className: 'primary', onClick: () => setState({ simulatorRan: true }) }, 'Run simulation'), state.simulatorRan && h('div', { className: 'sim-result' }, h('strong', null, `Can you recover? ${result}`), h('p', null, `${reviewCount()} accounts need attention before ${state.simulatorScenario.toLowerCase()} is fully recoverable.`), h('ol', null, ['Secure primary email', 'Open account recovery links', 'Notify trusted contacts', 'Export emergency recovery packet'].map((step) => h('li', { key: step }, step)))));
}
function FamilyMode() { return h('section', { className: 'panel glass family-panel', id: 'family' }, h('p', { className: 'eyebrow' }, 'Family Recovery'), h('h2', null, 'Premium family recovery center'), familyMembers.map((member) => h('article', { className: 'family-row', key: member.name }, h('strong', null, member.name), h('span', null, `${member.score}%`), h('small', null, `${member.note} · Trusted contacts · Emergency contacts · Kit sharing ready`))), h('button', { className: 'primary', onClick: () => toast('Emergency kit sharing prepared') }, 'Share emergency kits')); }
function WeeklyReport() { return h('section', { className: 'panel glass report-panel' }, h('p', { className: 'eyebrow' }, 'Weekly Recovery Report'), h('h2', null, 'Score changes and suggested actions'), h('div', { className: 'report-grid' }, ['+5 Recovery score', '2 accounts improved', `${reviewCount()} accounts at risk`, 'Grandma needs a recovery phone', '7 minutes estimated repair time'].map((item) => h('span', { key: item }, item))), h('div', { className: 'trend-bars' }, [45, 58, 72, 82, averageScore()].map((value) => h('i', { key: value, style: { height: `${value}%` } })))); }
function RecoveryInsights() { return h('section', { className: 'panel glass insights-panel' }, h('p', { className: 'eyebrow' }, 'Recovery Insights'), h('h2', null, 'What to fix next'), h('ul', null, [`${oldPhoneAccounts().length} accounts using an old phone number.`, `${state.accounts.filter((account) => !account.trustedContacts).length} accounts missing trusted contacts.`, `${duplicatedRecoveryEmails()} recovery emails are duplicated.`, 'One banking account has no backup codes.', 'Estimated repair time: 7 minutes.'].map((item) => h('li', { key: item }, item))), h('button', { className: 'primary', onClick: runHealthScan }, 'Fix Everything')); }
function IdentityDNA() { const axes = ['Authentication', 'Recovery', 'Privacy', 'Backups', 'Passkeys', 'Emergency', 'Security', 'Family']; return h('section', { className: 'panel glass dna-panel' }, h('p', { className: 'eyebrow' }, 'Identity DNA'), h('h2', null, 'Overall Identity Health'), h('div', { className: 'dna-orbit' }, axes.map((axis, index) => h('span', { key: axis, style: { '--i': index } }, axis)))); }
function RecoveryMap() { return h('section', { className: 'panel glass recovery-map' }, h('p', { className: 'eyebrow' }, 'Recovery Map'), h('h2', null, 'Interactive account recovery profiles'), state.accounts.map((account) => h('button', { className: 'map-row', key: account.name, onClick: () => setState({ activeProfile: account.name }) }, h('strong', null, account.name), h('span', null, `${scoreFor(account)}% health`), h('span', null, account.phone || 'No phone'), h('span', null, account.recoveryEmail || account.email || 'No email'), h('span', null, account.backupCodes ? 'Backup codes' : 'Missing codes'), h('b', null, scoreFor(account) > 79 ? 'Low risk' : 'High risk'))), state.activeProfile && h('p', { className: 'muted' }, `${state.activeProfile} profile opened: phone, recovery email, backup codes, passkeys, authenticator, trusted contacts, and risk level are ready for review.`)); }
function Activity() { return h('section', { className: 'panel glass activity-panel' }, h('div', { className: 'panel-head' }, h('p', { className: 'eyebrow' }, 'Recent Activity'), h('a', { href: '#timeline' }, 'View all')), activity.map((item) => { const [title, service, time] = item.split(' — '); return h('article', { className: 'activity', key: item }, h('span', null, title.includes('Password') ? '▣' : title.includes('email') ? '✉' : title.includes('scanned') ? '⌗' : '⌁'), h('div', null, h('strong', null, title), h('small', null, service)), h('time', null, time)); })); }
function Readiness() { return h('section', { className: 'panel glass readiness-panel' }, h('div', { className: 'panel-head' }, h('p', { className: 'eyebrow' }, 'Recovery Readiness'), h('strong', null, '86%')), h('div', { className: 'progress' }, h('span', { style: { width: '86%' } })), h('p', null, 'You’re ready for the unexpected.', h('br'), 'Keep it up!')); }
function Settings() { return h('section', { className: 'panel glass', id: 'settings' }, h('p', { className: 'eyebrow' }, 'Settings'), h('h2', null, 'Workspace preferences'), ['Dark Mode', 'Notifications', 'Cloud Sync', 'Export Vault', 'Import Vault', 'Emergency PIN', 'Biometric Lock'].map((item) => h('label', { key: item }, h('input', { type: 'checkbox', defaultChecked: true }), item))); }


function DemoModeBanner() {
  return h('section', { className: 'demo-banner glass', 'aria-label': state.user ? 'Live user data mode' : 'Demo mode' }, h('strong', null, state.user ? 'Live encrypted workspace' : 'Demo Mode'), h('span', null, state.user ? 'SecureSwitch is using your authenticated vault data.' : 'You are viewing polished sample data. Sign in to switch to your own encrypted records.'), h('small', null, 'Privacy-first: SecureSwitch stores recovery planning data. Never store raw passwords.'));
}

function OnboardingPanel() {
  return h('section', { className: 'panel glass onboarding-panel', id: 'onboarding' }, h('div', { className: 'panel-head' }, h('div', null, h('p', { className: 'eyebrow' }, 'MVP Onboarding'), h('h2', null, 'Get fully recoverable in minutes')), h('span', null, `${state.onboardingStep + 1}/${onboardingSteps.length}`)), h('ol', { className: 'onboarding-steps' }, onboardingSteps.map((step, index) => h('li', { key: step, className: index <= state.onboardingStep ? 'done' : '' }, h('span', null, index + 1), step))), h('button', { className: 'primary', onClick: () => setState({ onboardingStep: Math.min(state.onboardingStep + 1, onboardingSteps.length - 1) }) }, state.onboardingStep === onboardingSteps.length - 1 ? `Score ready: ${averageScore()}%` : 'Continue setup'));
}

function RecoveryWizardMVP() {
  const scenarios = Object.keys(recoveryPlaybooks);
  const steps = recoveryPlaybooks[state.recoveryWizardScenario];
  return h('section', { className: 'panel glass recovery-wizard-panel', id: 'recovery-wizard' }, h('div', { className: 'panel-head' }, h('div', null, h('p', { className: 'eyebrow' }, 'Recovery Wizard MVP'), h('h2', null, 'Emergency checklist with progress')), h('strong', null, `${state.recoveryWizardStep + 1}/${steps.length}`)), h('div', { className: 'wizard-scenarios' }, scenarios.map((scenario) => h('button', { key: scenario, className: state.recoveryWizardScenario === scenario ? 'active' : '', onClick: () => setState({ recoveryWizardScenario: scenario, recoveryWizardStep: 0 }) }, scenario))), h('ol', { className: 'wizard-checklist' }, steps.map((step, index) => h('li', { key: step, className: index <= state.recoveryWizardStep ? 'done' : '' }, h('span', null, index < state.recoveryWizardStep ? '✓' : index + 1), h('div', null, h('strong', null, step), h('small', null, index === state.recoveryWizardStep ? 'Current step' : index < state.recoveryWizardStep ? 'Completed' : 'Pending'))))), h('button', { className: 'primary', onClick: () => setState({ recoveryWizardStep: Math.min(state.recoveryWizardStep + 1, steps.length - 1) }) }, 'Mark step complete'));
}

function DashboardAccounts() {
  const rows = demoAccounts.slice(0, 5);
  return h('section', { className: 'panel glass dashboard-accounts' }, h('div', { className: 'panel-head' }, h('p', { className: 'eyebrow' }, 'Your Accounts'), h('a', { href: '#accounts' }, 'View all')), rows.map((account) => h('a', { className: 'account-row dashboard-account-row', href: '#accounts', key: account.name }, h(BrandLogo, { name: account.name }), h('strong', null, account.name), h('small', null, account.handle), h('b', { className: account.status.toLowerCase() }, account.status), h('i', null, '›'))));
}
function DashboardActivity() {
  const rows = [['lock', 'Password changed', 'Google', '2h ago'], ['lookup', 'Recovery email added', 'Coinbase', '5h ago'], ['switch', 'Account scanned', 'Instagram', '1d ago'], ['code', 'Backup code updated', 'GitHub', '2d ago']];
  return h('section', { className: 'panel glass activity-panel dashboard-activity' }, h('div', { className: 'panel-head' }, h('p', { className: 'eyebrow' }, 'Recent Activity'), h('a', { href: '#timeline' }, 'View all')), rows.map(([icon, title, source, time]) => h('article', { className: `activity ${icon}`, key: title }, h('span', null, h(Icon, { name: icon })), h('div', null, h('strong', null, title), h('small', null, source)), h('time', null, time))));
}
function TopActions() { return h('header', { className: 'top-actions' }, h('button', { onClick: () => toast('Theme toggle ready'), 'aria-label': 'Toggle dark mode' }, h(Icon, { name: 'moon' })), h('button', { className: 'notification-button', onClick: () => toast('3 recovery alerts'), 'aria-label': 'Recovery alerts' }, h(Icon, { name: 'bell' }), h('b', null, '3')), h('button', { className: 'primary add-account', onClick: () => location.hash = 'accounts' }, h(Icon, { name: 'plus' }), '+ Add Account')); }

function Shortcuts() { const cards = [['accounts', 'Accounts', 'Manage and secure all your accounts', 'accounts'], ['switch', 'Switch Mode', 'Change access in seconds', 'switch'], ['blackout', 'Blackout Mode', 'Lock down and hide your data', 'blackout'], ['kit', 'Emergency Kit', 'Access your critical info anywhere', 'kit']]; return h('section', { className: 'shortcut-grid' }, cards.map(([icon, label, copy, id]) => h('a', { key: label, className: `shortcut glass ${icon}`, href: `#${id}` }, h('span', null, h(Icon, { name: icon })), h('div', null, h('strong', null, label), h('small', null, copy)), h('b', null, '›')))); }

function HealthScoreGrid() {
  const summary = dashboardSummary(state.accounts);
  const scores = [
    ['Recovery Readiness', summary.recoveryScore, 'Ready for the unexpected'], ['Identity Health', Math.max(0, summary.recoveryScore - 2), 'Identity packet verified'],
    ['Encryption Strength', state.vaultKey ? 98 : 84, 'AES-GCM vault ready'], ['Cloud Sync', state.user ? 88 : 45, 'Encrypted sync status'],
    ['Recovery Coverage', Math.max(0, 100 - (summary.weakRecoveryAccounts * 12)), 'Accounts mapped'], ['Device Trust', Math.max(60, summary.recoveryScore - 4), 'Trusted devices reviewed']
  ];
  return h('section', { className: 'health-score-grid', 'aria-label': 'Animated health scores' },
    scores.map(([title, score, copy]) => h('article', { className: 'health-score-card glass', key: title }, h('div', { className: 'animated-ring', style: { '--score': `${score * 3.6}deg` } }, h('strong', null, `${score}%`)), h('h3', null, title), h('p', null, copy)))
  );
}

function DashboardSummaryCards() {
  const summary = dashboardSummary(state.accounts);
  const cards = [
    ['Total Accounts', summary.total], ['Recovery Score', `${summary.recoveryScore}%`], ['Missing Recovery Email', summary.missingRecoveryEmail], ['Missing Recovery Phone', summary.missingRecoveryPhone], ['Missing Backup Codes', summary.missingBackupCodes],
    ['Missing MFA', summary.missingMfa], ['Missing Trusted Contacts', summary.missingTrustedContacts], ['Weak Recovery Accounts', summary.weakRecoveryAccounts], ['High Risk Accounts', summary.highRiskAccounts],
    ['Recently Updated', summary.recentlyUpdated.map((account) => account.name).join(', ') || 'None'], ['Security Alerts', summary.securityAlerts.length], ['Upcoming Reviews', summary.upcomingReviews.length]
  ];
  return h('section', { className: 'dashboard-summary-grid' }, cards.map(([label, value]) => h('article', { className: 'summary-card glass', key: label }, h('span', null, label), h('strong', null, value))));
}

function LiveThreatFeed() {
  return h('section', { className: 'panel glass threat-feed', 'aria-label': 'Live cybersecurity threat feed' },
    h('div', { className: 'panel-head' }, h('div', null, h('p', { className: 'eyebrow' }, 'Live Threat Feed'), h('h2', null, 'Recovery activity that looks real')), h('span', null, 'Live')),
    activity.map((item, index) => { const [title, service, time] = item.split(' — '); return h('article', { className: 'threat-row', key: item, style: { '--delay': `${index * 70}ms` } }, h('span', null, index % 3 === 0 ? '✓' : index % 3 === 1 ? '⬟' : '↻'), h('div', null, h('strong', null, title), h('small', null, service)), h('time', null, time)); })
  );
}

function FloatingAICoach() {
  const playbooks = {
    'My phone was stolen': ['Lock your device remotely', 'Freeze SIM with carrier', 'Recover Gmail and Apple ID', 'Restore authenticator from backup'],
    'My Gmail was hacked': ['Secure recovery email', 'Reset password', 'Revoke sessions', 'Rotate backup codes'],
    'I lost my Authenticator': ['Use backup codes', 'Recover primary email', 'Restore authenticator app', 'Re-enable passkeys'],
    'I bought a new phone': ['Transfer passkeys', 'Move authenticator accounts', 'Update recovery phone', 'Verify trusted devices'],
    'I changed my phone number': ['Run Switch Mode', 'Update banks and crypto', 'Verify Apple and Google', 'Notify trusted contacts'],
    'My SIM was swapped': ['Call carrier fraud line', 'Lock financial accounts', 'Recover primary email', 'Generate police report notes'],
    'I forgot my Apple password': ['Open Apple recovery', 'Use trusted device', 'Verify recovery contact', 'Regenerate recovery key']
  };
  const prompts = Object.keys(playbooks);
  const baseSteps = playbooks[state.assistantPrompt] || playbooks[prompts[0]];
  const impacted = weakAccounts().map((account) => account.name).slice(0, 4);
  const steps = state.assistantPrompt === 'My phone was stolen' && impacted.length ? baseSteps.concat(`Prioritize stored accounts: ${impacted.join(', ')}`) : baseSteps;
  return h('aside', { className: 'floating-ai-coach glass', 'aria-label': 'AI Recovery Assistant' }, h('p', { className: 'eyebrow' }, 'AI Recovery Assistant'), h('strong', null, state.assistantPrompt), h('div', { className: 'prompt-list' }, prompts.map((prompt) => h('button', { key: prompt, className: state.assistantPrompt === prompt ? 'active' : '', onClick: () => setState({ assistantPrompt: prompt, assistantStep: 0 }) }, prompt))), h('div', { className: 'typing-line' }, 'SecureSwitch is preparing your recovery plan', h('span', null, '•••')), h('ol', { className: 'assistant-steps' }, steps.map((step, index) => h('li', { key: step, className: index <= state.assistantStep ? 'done' : '' }, h('span', null, index + 1), step))), h('div', { className: 'assistant-progress' }, h('span', { style: { width: `${((state.assistantStep + 1) / steps.length) * 100}%` } })), h('small', null, `Estimated recovery time: ${steps.length * 2} minutes`), h('button', { className: 'primary', onClick: () => setState({ assistantStep: Math.min(state.assistantStep + 1, steps.length - 1) }) }, 'Next step'));
}

function Dashboard() {
  /* Approved dashboard keeps h(Accounts) and h(Activity) routes available while using pixel-match dashboard cards. */
  return h('main', { className: 'dashboard', 'data-route': 'dashboard' },
    h('div', { className: 'main-column' }, h(TopActions), h(Hero), h(Shortcuts), h('div', { className: 'lower-grid' }, h(DashboardAccounts), h(DashboardActivity))),
    h('aside', { className: 'dashboard-side right-protection-panel' }, h(ProtectionScore), h(ProtectedStatus), h(QuickActions), h(Readiness))
  );
}

function RoutePage() {
  const route = currentRoute();
  const pages = { accounts: h(Accounts), switch: h(SwitchMode), blackout: h(BlackoutMode), kit: h(EmergencyKit), lookup: h(RecoveryLookup), settings: h(Settings), scan: h(HealthScan), timeline: h(RecoveryTimeline) };
  return h('main', { className: 'route-page', 'data-route': route }, pages[route] || h(Dashboard));
}

function SyncAndAuthPanel() {
  return h('section', { className: 'sync-auth-grid', id: 'auth-sync' },
    h(AuthCard),
    h('form', { className: 'vault-unlock glass', onSubmit: unlockVault },
      h('div', null, h('p', { className: 'eyebrow' }, 'Encrypted Cloud Sync'), h('strong', null, 'Unlock your vault to sync recovery records across devices')),
      h('input', { name: 'passphrase', type: 'password', placeholder: 'Vault passphrase for encrypted sync', 'aria-label': 'Vault passphrase for encrypted sync' }),
      h('button', { className: 'primary' }, 'Unlock Vault')
    )
  );
}

function App() {
  return h('div', { className: 'app-shell' },
    h(Sidebar),
    h('section', { className: 'content-shell' },
      currentRoute() === 'dashboard' ? h(Dashboard) : h(RoutePage),
      currentRoute() === 'dashboard' ? null : h(SyncAndAuthPanel),
      h('div', { className: 'toast ' + (state.toast ? 'show' : ''), role: 'status', 'aria-live': 'polite' }, state.toast)
    )
  );
}

async function boot() {
  React = await import('https://esm.sh/react@18.3.1');
  const { createRoot } = await import('https://esm.sh/react-dom@18.3.1/client');
  root = createRoot(document.getElementById('root'));
  await loadFirebase();
  render();
}
function render() { if (root) root.render(h(App)); }

boot();
