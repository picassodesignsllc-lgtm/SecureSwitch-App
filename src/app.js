import { firebaseConfig } from './firebaseConfig.js';
import { deriveVaultKey, encryptRecord, decryptRecord } from './crypto.js';
import { accountCategories, firestoreCollections, normalizeAccount, scoreAccount, riskLevel, recommendationsFor, dashboardSummary } from './recoveryEngine.js';
import { serviceRegistry, createApiClient } from './services/api.js';
import { billingPlans, getSubscriptionSnapshot } from './services/billing.js';
import { createAuditEvent } from './services/audit.js';
import { createBackupManifest, backupCapabilities } from './services/backup.js';
import { currentDeviceSnapshot } from './services/devices.js';
import { applyBulkReview, buildActivityEvent, buildNotification, buildSecurityScoreDocument, recoveryProfileFromForm, userScopedPath } from './services/liveData.js';
import { analyzeAccountSecurity, answerSecurityQuestion, buildSecurityTimeline, dailySecurityInsights, executiveSecurityMetrics, explainableSecurityScore, generateSecurityRecommendations } from './services/aiCopilot.js';
import { achievementProgress, executiveInsightCards, quickFixActions, securityStreak } from './services/delight.js';
import { createApproval, createInvitation, createOrganizationRecord, defaultSecurityPolicies, enterpriseAdminMetrics, enterpriseAuditEvent, enterpriseRoles, reportingMetrics, reorderWidget } from './services/enterprise.js';

const demoAccounts = [
  { name: 'Google', handle: 'keith.harrison@gmail.com', status: 'Secure', color: '#4285f4', category: 'Email', phone: '+1 (415) 555-0184', email: 'keith.harrison@gmail.com', recoveryEmail: 'backup@secureswitch.app', recoveryPhone: '+1 (415) 555-0184', backupCodes: '8 encrypted codes', trustedContacts: 'Alicia Harrison', authenticator: '1Password', passkeyStatus: 'Enabled', deviceVerification: 'Trusted', lastReviewed: '2026-06-28', ready: true },
  { name: 'Apple', handle: 'keith@icloud.com', status: 'Secure', color: '#f8fafc', category: 'Email', phone: '+1 (415) 555-0184', email: 'keith@icloud.com', recoveryEmail: 'backup@secureswitch.app', recoveryPhone: '+1 (415) 555-0184', backupCodes: 'Recovery key stored', trustedContacts: 'Alicia Harrison', authenticator: 'Passkey', passkeyStatus: 'Enabled', deviceVerification: 'Trusted', lastReviewed: '2026-06-25', ready: true },
  { name: 'Microsoft', handle: 'keith@outlook.com', status: 'Secure', color: '#00a4ef', category: 'Cloud', phone: '+1 (628) 555-0149', email: 'keith@outlook.com', recoveryEmail: 'vault@secureswitch.app', recoveryPhone: '+1 (628) 555-0149', backupCodes: '10 encrypted codes', trustedContacts: 'IT admin', authenticator: 'Microsoft Authenticator', passkeyStatus: 'Enabled', deviceVerification: 'Trusted', lastReviewed: '2026-06-20', ready: true },
  { name: 'GitHub', handle: 'picassodesigns', status: 'Secure', color: '#8b949e', category: 'Business', phone: '', email: 'dev@picassodesigns.com', recoveryEmail: 'admin@picassodesigns.com', recoveryPhone: '', backupCodes: '16 recovery codes', trustedContacts: 'Security lead', authenticator: 'YubiKey', passkeyStatus: 'Enabled', deviceVerification: 'Trusted', lastReviewed: '2026-06-18', ready: true },
  { name: 'Amazon', handle: 'keith.harrison@gmail.com', status: 'Secure', color: '#ff9900', category: 'Shopping', phone: '+1 (212) 555-0110', email: 'keith.harrison@gmail.com', recoveryEmail: 'backup@secureswitch.app', recoveryPhone: '+1 (212) 555-0110', backupCodes: '10 encrypted codes', trustedContacts: 'Priya Shah', authenticator: 'Passkey', passkeyStatus: 'Enabled', deviceVerification: 'Trusted', lastReviewed: '2026-06-17', ready: true },
  { name: 'Instagram', handle: '@mr3rdward', status: 'Review', color: '#e4405f', category: 'Social', phone: '+1 (415) 555-0184', email: 'social@secureswitch.app', recoveryEmail: 'old-email@example.com', recoveryPhone: '', backupCodes: '', trustedContacts: '', authenticator: 'SMS only', passkeyStatus: '', deviceVerification: 'Needs review', lastReviewed: '2025-09-12', ready: false },
  { name: 'Facebook', handle: 'keith.harrison', status: 'Review', color: '#1877f2', category: 'Social', phone: '+1 (415) 555-0184', email: 'social@secureswitch.app', recoveryEmail: '', recoveryPhone: '+1 (415) 555-0184', backupCodes: '', trustedContacts: '', authenticator: 'SMS only', passkeyStatus: '', deviceVerification: 'Unknown device', lastReviewed: '2025-10-02', ready: false },
  { name: 'Discord', handle: 'keith#2048', status: 'Review', color: '#5865f2', category: 'Gaming', phone: '', email: 'gaming@secureswitch.app', recoveryEmail: 'gaming@secureswitch.app', recoveryPhone: '', backupCodes: '', trustedContacts: '', authenticator: 'Authenticator app', passkeyStatus: '', deviceVerification: 'Trusted', lastReviewed: '2025-11-08', ready: false },
  { name: 'Chase Bank', handle: 'keith.harrison', status: 'Secure', color: '#0b5cab', category: 'Banking', phone: '+1 (628) 555-0149', email: 'finance@secureswitch.app', recoveryEmail: 'finance-backup@secureswitch.app', recoveryPhone: '+1 (628) 555-0149', backupCodes: 'Bank recovery stored', trustedContacts: 'Alicia Harrison', authenticator: 'Authenticator app', passkeyStatus: 'Enabled', deviceVerification: 'Trusted', lastReviewed: '2026-06-22', ready: true },
  { name: 'Coinbase', handle: 'keith.harrison.cb.id', status: 'Secure', color: '#0052ff', category: 'Crypto', phone: '+1 (415) 555-0184', email: 'crypto@secureswitch.app', recoveryEmail: 'vault@secureswitch.app', recoveryPhone: '+1 (415) 555-0184', backupCodes: '12 encrypted codes', trustedContacts: 'Alicia Harrison', authenticator: 'YubiKey', passkeyStatus: 'Enabled', deviceVerification: 'Trusted', lastReviewed: '2026-06-26', ready: true },
  { name: 'Crypto Wallet', handle: 'vault.eth', status: 'Review', color: '#7c3aed', category: 'Crypto', phone: '', email: 'crypto@secureswitch.app', recoveryEmail: 'vault@secureswitch.app', recoveryPhone: '', backupCodes: 'Seed backup verified', trustedContacts: '', authenticator: 'Hardware key', passkeyStatus: '', deviceVerification: 'Cold wallet', lastReviewed: '2026-01-15', ready: false },
  { name: 'Steam', handle: 'thirdward', status: 'Secure', color: '#171a21', category: 'Gaming', phone: '+1 (212) 555-0110', email: 'gaming@secureswitch.app', recoveryEmail: 'gaming@secureswitch.app', recoveryPhone: '+1 (212) 555-0110', backupCodes: 'Steam Guard codes', trustedContacts: 'Marcus Lee', authenticator: 'Steam Guard', passkeyStatus: '', deviceVerification: 'Trusted', lastReviewed: '2026-05-28', ready: true },
  { name: 'Slack', handle: 'keith@picassodesigns.com', status: 'Review', color: '#4a154b', category: 'Business', phone: '+1 (628) 555-0149', email: 'keith@picassodesigns.com', recoveryEmail: 'admin@picassodesigns.com', recoveryPhone: '+1 (628) 555-0149', backupCodes: '', trustedContacts: 'IT admin', authenticator: 'Okta Verify', passkeyStatus: '', deviceVerification: 'Trusted', lastReviewed: '2025-12-14', ready: false },
  { name: 'Dropbox', handle: 'keith@picassodesigns.com', status: 'Secure', color: '#0061ff', category: 'Cloud', phone: '+1 (628) 555-0149', email: 'keith@picassodesigns.com', recoveryEmail: 'admin@picassodesigns.com', recoveryPhone: '+1 (628) 555-0149', backupCodes: 'Backup codes saved', trustedContacts: 'IT admin', authenticator: 'Okta Verify', passkeyStatus: 'Enabled', deviceVerification: 'Trusted', lastReviewed: '2026-06-19', ready: true }
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
const demoOrganizations = [
  { id: 'family', name: 'Harrison Family Vault', role: 'Owner', members: 4, vaults: 3, activity: 'Recovery kit shared', permission: 'Full access' },
  { id: 'studio', name: 'Picasso Designs Studio', role: 'Admin', members: 12, vaults: 6, activity: 'Slack recovery updated', permission: 'Manage accounts' }
];
const orgRoles = enterpriseRoles;
const familyMembers = [
  { name: 'Dad', score: 92, note: 'Recovery plan verified' },
  { name: 'Mom', score: 81, note: 'Needs backup code refresh' },
  { name: 'Brother', score: 68, note: 'Missing trusted contact' },
  { name: 'Grandma', score: 34, note: '⚠ No recovery phone' }
];
const recoveryPlaybooks = {
  'Phone stolen': ['Lock the lost phone remotely', 'Freeze SIM with your carrier', 'Recover Apple ID and Google', 'Restore authenticator from backup', 'Review banking and crypto sessions'],
  'Email hacked': ['Secure recovery email first', 'Reset primary email password', 'Revoke unknown sessions', 'Rotate backup codes', 'Review linked accounts'],
  'SIM swap': ['Call carrier fraud line', 'Freeze financial accounts', 'Move accounts off SMS', 'Verify recovery email', 'Notify trusted contacts'],
  'Authenticator lost': ['Use saved backup codes', 'Recover primary email', 'Restore authenticator app', 'Re-enable passkeys', 'Document new recovery path'],
  'Crypto wallet lost': ['Find cold recovery backup', 'Lock exchange accounts', 'Notify trusted contact', 'Move funds if needed', 'Record emergency notes'],
  'Social media hacked': ['Start platform recovery', 'Secure recovery email', 'Revoke connected apps', 'Update MFA', 'Capture incident timeline']
};
const onboardingSteps = ['Welcome', 'Scan devices', 'Add first account', 'Generate recovery codes', 'Enable MFA', 'Security score animation', 'Completion celebration'];
const productionCollections = ['users', 'accounts', 'securityScores', 'devices', 'activity', 'backupCodes', 'recoveryContacts', 'notifications', 'settings', 'billing'];
const launchChecklist = [
  ['Firebase project required', 'Required before live launch'],
  ['Auth providers required', 'Email, Google, and Apple must be enabled'],
  ['Firestore rules required', 'Deploy user-scoped rules before public traffic'],
  ['GitHub Pages deploy required', 'Build artifact must publish from build/dist'],
  ['Stripe not connected yet', 'Do not accept payments until Phase 6+ billing work'],
  ['AI coach not connected yet', 'Current coach is deterministic and local']
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

function generateProductionReport(format) {
  const lines = [`Report: ${state.reportType}`, `Recovery Score: ${averageScore()}%`, `Password Health: ${passwordHealthScore()}%`, `Organizations: ${state.organizations.length}`, `Accounts: ${state.accounts.length}`, `Active Alerts: ${unreadNotifications().length}`, `Generated: ${new Date().toISOString()}`];
  if (format === 'csv') downloadTextFile(`secureswitch-${state.reportType.toLowerCase().replaceAll(' ', '-')}.csv`, 'text/csv', lines.join('\n'));
  else if (format === 'json') downloadTextFile(`secureswitch-${state.reportType.toLowerCase().replaceAll(' ', '-')}.json`, 'application/json', JSON.stringify({ reportType: state.reportType, recoveryScore: averageScore(), passwordHealth: passwordHealthScore(), organizations: state.organizations.length, accounts: state.accounts.length, alerts: unreadNotifications().length }, null, 2));
  else downloadTextFile(`secureswitch-${state.reportType.toLowerCase().replaceAll(' ', '-')}.pdf`, 'application/pdf', generatePdf(state.reportType, lines));
  logSecurityEvent(`${state.reportType} ${format.toUpperCase()} generated`);
  successToast(`${state.reportType} ${format.toUpperCase()} ready`);
}
function filteredAccounts() {
  const query = state.accountSearch.toLowerCase();
  return state.accounts
    .filter((account) => {
      const analysis = accountRisk(account);
      const status = scoreFor(account) >= 80 ? 'Protected' : 'Review';
      const matchesSearch = [account.name, account.handle, account.recoveryEmail, account.category].join(' ').toLowerCase().includes(query);
      const matchesCategory = state.accountCategory === 'All' || account.category === state.accountCategory;
      const matchesRisk = state.accountRiskFilter === 'All' || analysis.risk === state.accountRiskFilter;
      const matchesStatus = state.accountStatusFilter === 'All' || status === state.accountStatusFilter;
      return matchesSearch && matchesCategory && matchesRisk && matchesStatus;
    })
    .sort((a, b) => state.accountSort === 'Name' ? a.name.localeCompare(b.name) : state.accountSort === 'Last updated' ? String(b.lastReviewed || '').localeCompare(String(a.lastReviewed || '')) : scoreFor(a) - scoreFor(b));
}

function safeArray(value) { return Array.isArray(value) ? value : []; }
function safeAccounts() {
  const accounts = safeArray(state.accounts).filter(Boolean);
  return accounts.length ? accounts : demoAccounts.map(normalizeAccount);
}
function scoreFor(account) { return analyzeAccountSecurity(account || {}).score; }
function accountRisk(account) { return analyzeAccountSecurity(account || {}); }
function averageScore() { return explainableSecurityScore(safeAccounts()).score; }
function liveProtectionScore() { return averageScore(); }
function reviewCount() { return safeAccounts().filter((account) => account.status === 'Review' || scoreFor(account) < 80).length; }
function linkedAccounts() { return safeAccounts().filter((account) => [account.phone, account.email, account.recoveryPhone, account.recoveryEmail].includes(state.selectedRecovery)); }
function switchAccounts() { return safeAccounts().filter((account) => account.phone === state.switchOld || account.recoveryPhone === state.switchOld); }
function weakAccounts() { return safeAccounts().filter((account) => scoreFor(account) < 90 || account.status === 'Review'); }
function duplicatedRecoveryEmails() {
  const counts = safeAccounts().reduce((map, account) => { const email = account.recoveryEmail || account.email; if (email) map[email] = (map[email] || 0) + 1; return map; }, {});
  return Object.values(counts).filter((count) => count > 1).reduce((sum, count) => sum + count, 0);
}
function oldPhoneAccounts() { return safeAccounts().filter((account) => account.phone === state.switchOld || account.recoveryPhone === state.switchOld); }
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
function recoveryScoreFactors() {
  const summary = dashboardSummary(state.accounts);
  const stalePasswords = safeAccounts().filter((account) => Date.parse(account.lastReviewed || '') < Date.now() - 180 * 86400000).length;
  const duplicateMethods = duplicatedRecoveryEmails();
  const noRecoveryKit = state.emergencyKits.length ? 0 : 1;
  const incompleteEmergencyContacts = Math.max(0, summary.missingTrustedContacts - state.trustedContacts.length);
  const unsafeAccounts = summary.highRiskAccounts;
  const factors = [
    ['Missing recovery email', summary.missingRecoveryEmail, 7],
    ['Missing phone', summary.missingRecoveryPhone, 6],
    ['Missing backup codes', summary.missingBackupCodes, 7],
    ['Missing trusted contacts', summary.missingTrustedContacts, 6],
    ['No MFA', summary.missingMfa, 8],
    ['Weak password', state.accounts.filter((account) => /weak|sms only|review/i.test(`${account.authenticator} ${account.status}`)).length, 5],
    ['Old password', stalePasswords, 4],
    ['No recovery kit', noRecoveryKit, 8],
    ['Incomplete emergency contacts', incompleteEmergencyContacts, 5],
    ['Duplicate recovery methods', duplicateMethods, 4],
    ['Unsafe account', unsafeAccounts, 8]
  ];
  const penalty = factors.reduce((sum, [, count, weight]) => sum + (count ? Math.min(18, count * weight) : 0), 0);
  return { factors, score: Math.max(0, Math.min(100, 100 - penalty)), penalty };
}
function premiumRecoveryScore() { return recoveryScoreFactors().score; }
function runHealthScan() { setState({ scanComplete: true }); toast(`Recovery Health Scan complete: ${averageScore()}%`); }
async function bulkReviewFilteredAccounts() {
  const accounts = filteredAccounts();
  const ids = accounts.map((account) => account.id);
  const reviewedDate = new Date().toISOString().slice(0, 10);
  const nextAccounts = applyBulkReview(state.accounts, ids, reviewedDate);
  setState({ accounts: nextAccounts });
  try {
    if (usingLiveAccounts()) {
      if (!state.vaultKey) throw new Error('Unlock your encrypted vault before bulk updating live accounts.');
      await Promise.all(accounts.map(async (account) => {
        const updated = { ...account, status: 'Secure', lastReviewed: reviewedDate };
        const payload = await encryptRecord(state.vaultKey, serializeAccount(updated));
        await state.firebase.setDoc(userDoc('accounts', updated.id), payload, { merge: true });
        await recordLiveActivity('bulk_reviewed', updated);
      }));
      await refreshLiveSecurityScore(nextAccounts);
      await recordAudit('recovery_update', { operation: 'bulk_review', accounts: accounts.length });
    }
    toast(`${accounts.length} account${accounts.length === 1 ? '' : 's'} marked reviewed`);
  } catch (error) {
    setState({ dataError: safeError(error, 'Bulk update could not be saved.') });
    toast('Bulk update needs attention');
  }
}

async function saveRecoveryCenter(event) {
  event.preventDefault();
  const profile = recoveryProfileFromForm(event.currentTarget, state.firebase);
  try {
    setState({ settings: { ...state.settings, recoveryEmail: profile.recoveryEmail, recoveryPhone: profile.recoveryPhone, passkeyStatus: profile.passkeyStatus, authenticatorStatus: profile.authenticatorStatus } });
    if (usingLiveAccounts()) {
      await Promise.all([
        writeUserScopedDoc('settings', 'recovery', profile),
        writeUserScopedDoc('recoveryContacts', 'primary', { name: profile.recoveryContact || 'Primary recovery contact', status: profile.recoveryContact ? 'Ready' : 'Missing', email: profile.recoveryEmail }),
        writeUserScopedDoc('backupCodes', 'inventory', { status: profile.backupCodes || 'Missing', count: profile.backupCodes ? 1 : 0 }),
        writeUserScopedDoc('devices', 'current-browser', { ...currentDeviceSnapshot(), trusted: Boolean(profile.trustedDevice), name: profile.trustedDevice || currentDeviceSnapshot().name }),
        recordLiveActivity('recovery_updated', { id: 'recovery-center', name: 'Recovery Center' }),
        recordLiveNotification('recovery_updated', { id: 'recovery-center', name: 'Recovery Center' })
      ]);
      await refreshLiveSecurityScore();
      await recordAudit('recovery_update', { collection: 'recoveryCenter' });
    } else {
      setState({ recoveryContacts: [{ id: 'local-primary', name: profile.recoveryContact || 'Primary contact', status: profile.recoveryContact ? 'Ready' : 'Missing', email: profile.recoveryEmail }], backupCodes: [{ id: 'local-codes', status: profile.backupCodes || 'Missing', count: profile.backupCodes ? 1 : 0 }], devices: [{ ...currentDeviceSnapshot(), trusted: Boolean(profile.trustedDevice), name: profile.trustedDevice || currentDeviceSnapshot().name }] });
    }
    successToast('Recovery center saved');
  } catch (error) {
    setState({ dataError: safeError(error, 'Recovery center could not be saved.') });
    toast('Recovery save needs attention');
  }
}

async function markNotificationRead(notification) {
  setState({ notificationsRead: Array.from(new Set(state.notificationsRead.concat(notification.id))) });
  if (usingLiveAccounts() && notification.id && !notification.id.startsWith('note-') && !notification.id.startsWith('alert-')) {
    try { await writeUserScopedDoc('notifications', notification.id, { unread: false, readAt: new Date().toISOString() }); } catch (error) { setState({ dataError: safeError(error, 'Notification could not be marked read.') }); }
  }
}
async function deleteNotification(notification) {
  setState({ notifications: state.notifications.filter((item) => item.id !== notification.id), notificationsRead: Array.from(new Set(state.notificationsRead.concat(notification.id))) });
  if (usingLiveAccounts() && notification.id && !notification.id.startsWith('note-') && !notification.id.startsWith('alert-')) {
    try { await state.firebase.deleteDoc(userDoc('notifications', notification.id)); } catch (error) { setState({ dataError: safeError(error, 'Notification could not be deleted.') }); }
  }
  toast('Notification deleted');
}

async function saveUserProfile(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const profile = {
    displayName: sanitizeInput(form.displayName.value),
    photoURL: sanitizeInput(form.photoURL.value),
    timezone: sanitizeInput(form.timezone.value),
    country: sanitizeInput(form.country.value),
    preferredNotifications: sanitizeInput(form.preferredNotifications.value),
    theme: sanitizeInput(form.theme.value),
    language: sanitizeInput(form.language.value)
  };
  setState({ userProfile: { ...state.userProfile, ...profile }, settings: { ...state.settings, theme: profile.theme, language: profile.language, preferredNotifications: profile.preferredNotifications } });
  try {
    if (usingLiveAccounts()) {
      await state.firebase.setDoc(state.firebase.doc(state.db, 'users', state.user.uid), profile, { merge: true });
      await writeUserScopedDoc('settings', 'profile', profile);
      await recordAudit('settings_update', { section: 'profile' });
    }
    successToast('Profile saved');
  } catch (error) {
    setState({ dataError: safeError(error, 'Profile could not be saved.') });
    toast('Profile save needs attention');
  }
}

async function removeDevice(device) {
  const nextDevices = state.devices.filter((item) => item.id !== device.id);
  setState({ devices: nextDevices });
  try {
    if (usingLiveAccounts()) {
      await state.firebase.deleteDoc(userDoc('devices', device.id));
      await recordLiveActivity('device_removed', { id: device.id, name: device.name || device.browser || 'Device' });
      await recordAudit('device_change', { action: 'remove', device: device.id });
    }
    successToast(`${device.browser || device.name || 'Device'} removed`);
  } catch (error) {
    setState({ dataError: safeError(error, 'Device could not be removed.') });
  }
}


function OnboardingWizard() {
  if (!state.onboardingOpen || state.onboardingComplete) return null;
  const step = state.onboardingStep;
  const progress = ((step + 1) / 6) * 100;
  async function finishOnboarding() {
    rememberOnboarding();
    if (usingLiveAccounts()) {
      try {
        await state.firebase.setDoc(state.firebase.doc(state.db, 'users', state.user.uid), { betaOnboardingComplete: true, onboardedAt: state.firebase.serverTimestamp ? state.firebase.serverTimestamp() : new Date().toISOString() }, { merge: true });
      } catch (error) {
        setState({ dataError: safeError(error, 'Onboarding completion will be retried after sync is available.') });
      }
    }
    setState({ onboardingComplete: true, onboardingOpen: false, userProfile: { ...state.userProfile, betaOnboardingComplete: true } });
    toast('Your Digital Recovery System is online');
  }
  function nextStep() {
    if (step === 4) {
      setState({ vaultCreating: true });
      setTimeout(() => setState({ vaultCreating: false, onboardingStep: 5, vaultUnlocked: true }), 950);
      return;
    }
    if (step === 5) { finishOnboarding(); return; }
    setState({ onboardingStep: Math.min(step + 1, 5) });
  }
  const content = [
    h('div', { className: 'onboarding-slide' }, h('p', { className: 'eyebrow' }, 'Step 1'), h('h2', null, 'Welcome'), h('p', null, 'SecureSwitch helps you prepare every account before recovery becomes urgent.')),
    h('div', { className: 'onboarding-slide' }, h('p', { className: 'eyebrow' }, 'Step 2'), h('h2', null, 'Explain SecureSwitch'), h('p', null, 'Your dashboard tracks accounts, recovery methods, devices, alerts, and encrypted exports from one private workspace.')),
    h('div', { className: 'onboarding-slide' }, h('p', { className: 'eyebrow' }, 'Step 3'), h('h2', null, 'Add first account'), h('div', { className: 'choice-grid account-choice-grid' }, accountTemplates.filter((item) => item !== 'Custom Account').map((account) => h('button', { key: account, className: state.onboardingAccounts.includes(account) ? 'selected' : '', onClick: () => { const accounts = state.onboardingAccounts.includes(account) ? state.onboardingAccounts.filter((item) => item !== account) : state.onboardingAccounts.concat(account); setState({ onboardingAccounts: accounts }); } }, providerMeta(account)[1], ' ', account)))) ,
    h('div', { className: 'onboarding-slide' }, h('p', { className: 'eyebrow' }, 'Step 4'), h('h2', null, 'Add recovery email'), h('p', null, 'Start with a recovery email and phone so SecureSwitch can calculate accurate readiness.')),
    h('div', { className: 'onboarding-slide vault-create-step' }, h('p', { className: 'eyebrow' }, 'Step 5'), h('h2', null, 'Enable MFA reminder'), h('div', { className: 'premium-loader' }, h('span'), h('span'), h('span')), h('p', null, state.vaultCreating ? 'Preparing your encrypted recovery checklist…' : 'SecureSwitch will remind you to enable MFA, passkeys, and backup codes.')),
    h('div', { className: 'onboarding-slide success-step' }, h('p', { className: 'eyebrow' }, 'Step 6'), h('h2', null, 'Finish'), h('p', null, 'Your Digital Recovery System is now online.'), h('div', { className: 'success-orb' }, '✓'))
  ];
  return h('section', { className: 'onboarding-wizard glass', role: 'dialog', 'aria-label': 'SecureSwitch onboarding wizard' },
    h('div', { className: 'wizard-progress' }, h('span', { style: { width: `${progress}%` } })),
    content[step],
    h('div', { className: 'wizard-actions' }, h('button', { onClick: finishOnboarding }, 'Skip for now'), h('button', { className: 'primary', onClick: nextStep, disabled: state.vaultCreating }, state.vaultCreating ? 'Generating…' : step === 5 ? 'Open Dashboard' : 'Continue'))
  );
}
function LiveScoreEnginePanel() {
  const { factors, score } = recoveryScoreFactors();
  return h('section', { className: 'panel glass live-score-engine', id: 'live-score' },
    h('div', { className: 'panel-head' }, h('div', null, h('p', { className: 'eyebrow' }, 'Live Recovery Score'), h('h2', null, 'Score engine intelligence')), h('strong', { className: 'animated-counter' }, `${score}%`)),
    h('div', { className: 'score-factor-grid' }, factors.map(([label, count, weight]) => h('article', { key: label, className: count ? 'active-risk' : 'clear-risk' }, h('span', null, label), h('strong', null, count ? `-${Math.min(18, count * weight)}` : 'Clear'), h('small', null, count ? `${count} issue${count === 1 ? '' : 's'} detected` : 'No issue'))))
  );
}
function Sidebar() {
  const links = [
    ['▦', 'Dashboard', 'dashboard'],
    ['♙', 'Accounts', 'accounts'],
    ['▤', 'Recovery Center', 'recovery-center'],
    ['⚑', 'Security Audit', 'security-audit'],
    ['◉', 'Devices', 'devices'],
    ['☷', 'Vault', 'secure-vault'],
    ['▣', 'Emergency Kit', 'kit'],
    ['👪', 'Family', 'family-protection'],
    ['◫', 'Organization', 'organization'],
    ['◍', 'Dark Web', 'dark-web'],
    ['◆', 'Premium', 'premium'],
    ['⚙', 'Settings', 'settings']
  ];
  const route = currentRoute();
  return h('aside', { className: 'sidebar', 'aria-label': 'SecureSwitch navigation' },
    h('a', { className: 'brand', href: '#dashboard' }, h('span', { className: 'logo', 'aria-hidden': true }, '0'), h('span', { className: 'brand-wordmark' }, 'SecureSwitch'), h('b', null, 'PRO')),
    h('nav', null, links.map(([icon, label, id]) => h('a', { key: id, href: `#${id}`, className: route === id ? 'active' : '' }, h('span', { className: 'nav-glyph', 'aria-hidden': true }, icon), h('span', null, label)))),
    h('article', { className: 'go-pro' }, h('p', { className: 'eyebrow' }, '✦ Premium'), h('p', null, 'Advanced monitoring, family protection, and priority recovery.'), h('button', { className: 'primary', onClick: () => location.hash = 'premium' }, 'View Plans')),
    h('footer', { className: 'profile' }, h('span', null, 'KH'), h('div', null, h('strong', null, 'Keith Harrison'), h('small', null, 'Protected workspace')), h('i', null, '⌄'))
  );
}

function AuthCard() {
  return h('section', { className: 'auth-card glass' },
    h('p', { className: 'eyebrow' }, state.user ? 'Session Active' : state.firebaseReady ? 'Firebase Authentication' : 'Demo Authentication'),
    h('h2', null, state.user ? `Hello ${firstName()} 👋` : 'Sign in to sync your recovery platform'),
    !state.firebaseReady && h('p', { className: 'muted' }, 'Firebase is not configured or unavailable, so SecureSwitch is running in demo mode.'),
    state.authError && h('p', { className: 'error-state' }, state.authError),
    state.user && h('div', { className: 'dashboard-summary-grid' }, [['Recovery Score', `${averageScore()}%`], ['Accounts', state.accounts.length], ['Health Check', state.scanComplete ? 'Complete' : 'Ready']].map(([label, value]) => h('article', { className: 'summary-card', key: label }, h('span', null, label), h('strong', null, value)))),
    state.user && !state.user.emailVerified && h('button', { onClick: () => state.firebase.sendEmailVerification(state.user).then(() => toast('Verification email sent')).catch((error) => setState({ authError: safeError(error, 'Verification email failed') })) }, 'Resend verification email'),
    state.user && h('button', { className: 'primary full', onClick: signOut }, 'Sign out'),
    !state.user && h('form', { onSubmit: submitAuth },
      h('input', { name: 'email', type: 'email', placeholder: 'Email', required: true }),
      h('input', { name: 'password', type: 'password', placeholder: 'Password', minLength: 6, required: state.mode !== 'reset' }),
      h('label', { className: 'remember-row' }, h('input', { type: 'checkbox', checked: state.rememberMe, onChange: (event) => setState({ rememberMe: event.target.checked }) }), 'Remember me'),
      h('button', { className: 'primary full', disabled: state.loading }, state.loading ? 'Working…' : state.mode === 'signup' ? 'Create Account' : 'Login')
    ),
    !state.user && h('div', { className: 'auth-actions' },
      h('button', { onClick: () => setState({ mode: state.mode === 'signup' ? 'login' : 'signup' }) }, state.mode === 'signup' ? 'Use login' : 'Create account'),
      h('button', { onClick: () => sendPasswordReset(document.querySelector('.auth-card [name=email]')?.value || '') }, 'Forgot Password')
    ),
    !state.user && h('button', { onClick: () => signInWithProvider('google'), disabled: !state.firebaseReady || state.loading }, '◯ Continue with Google'),
    !state.user && h('button', { onClick: () => signInWithProvider('apple'), disabled: !state.firebaseReady || state.loading }, ' Continue with Apple'),
    !state.user && h('button', { onClick: () => signInWithProvider('microsoft'), disabled: !state.firebaseReady || state.loading }, '⊞ Continue with Microsoft'),
    h('p', { className: 'muted' }, `User-scoped Firestore collections: ${productionCollections.join(', ')}`)
  );
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
  const accounts = safeAccounts();
  const score = averageScore();
  const lastReviewed = accounts.map((account) => account.lastReviewed).filter(Boolean).sort().pop() || 'Today';
  return h('section', { className: 'hero glass v2-hero', id: 'dashboard' },
    h('div', { className: 'hero-copy-panel' },
      h('p', { className: 'eyebrow' }, '✦ SecureSwitch Command Center'),
      h('h1', null, state.user ? `Hello ${firstName()}` : 'Never lose another account ', !state.user && h('span', null, 'again.')),
      h('p', null, 'A compact recovery command center for accounts, devices, vault health, and protection status.'),
      h('div', { className: 'hero-actions' }, h('button', { className: 'primary', onClick: runHealthScan }, 'Run Health Check'), h('button', { onClick: () => toast('Demo walkthrough coming soon') }, 'Watch Demo'))
    ),
    h('div', { className: 'premium-vault v2-vault-hero', 'aria-label': 'Secure vault summary' },
      h('div', { className: 'v2-vault-cube', 'aria-hidden': true }, h('span'), h('i')),
      h('div', { className: 'v2-vault-stats' },
        [['Score', `${score}%`], ['Accounts', accounts.length], ['Last Review', lastReviewed]].map(([label, value]) => h('article', { key: label }, h('strong', null, value), h('span', null, label)))
      )
    )
  );
}


function ProtectionScore() {
  const score = usingLiveAccounts() ? liveProtectionScore() : 86;
  const status = protectionStatus(score);
  return h('aside', { className: 'floating-score glass protection-panel-card', 'aria-label': 'Live Protection Score' },
    h('p', { className: 'eyebrow score-title' }, 'Live Protection Score ⓘ'),
    h('div', { className: 'target-score-ring', style: { '--score': `${score * 3.6}deg` } }, h('strong', null, `${score}%`), h('span', { className: status.toLowerCase().replaceAll(' ', '-') }, `◆ ${status}`)),
    h('div', { className: 'target-score-stats' }, [['Accounts', safeAccounts().length], ['Need Review', reviewCount()], ['Switch Plan', `${Math.max(1, switchAccounts().length)}m`]].map(([label, value]) => h('article', { key: label }, h('strong', null, value), h('span', null, label))))
  );
}
function ProtectedStatus() {
  return h('article', { className: 'protected glass' }, h('span', { className: 'check-orb' }, '▣'), h('div', null, h('h3', null, state.user ? `Hello ${firstName()} 👋` : 'You’re protected'), h('p', null, state.user ? `Recovery Score ${averageScore()}% · Accounts ${safeAccounts().length} · Health Check Ready` : 'Great job! Keep your recovery methods up to date.')), h('b', null, '›'));
}

function QuickActions() {
  const actions = [
    ['＋', 'Add New Account', () => location.hash = 'accounts'],
    ['▣', 'Run Health Check', runHealthScan],
    ['⌁', 'Generate Backup Codes', () => toast('Backup code workflow prepared')],
    ['♟', 'View Recovery Contacts', () => location.hash = 'kit']
  ];
  return h('section', { className: 'quick-panel glass' }, h('p', { className: 'eyebrow' }, 'Quick Actions'), actions.map(([icon, label, action]) => h('button', { key: label, className: 'quick-row', onClick: action }, h('span', null, icon), label, h('b', null, '›'))));
}

function AccountCard({ account }) {
  const analysis = accountRisk(account);
  const score = analysis.score;
  const passwordAge = Date.parse(account.lastReviewed || '') < Date.now() - 180 * 86400000 ? 'Old password' : 'Current';
  const health = score >= 85 ? 'Excellent' : score >= 67 ? 'Watch' : 'At risk';
  const openDetail = () => { setState({ selectedAccountId: account.id, route: 'account-detail' }); location.hash = 'account-detail'; };
  const expanded = state.expandedAccountId === account.id;
  return h('article', { className: `account-row monitored-account ${expanded ? 'expanded' : 'collapsed'}`, tabIndex: 0, role: 'button', onClick: openDetail, onKeyDown: (event) => { if (event.key === 'Enter') openDetail(); } }, h('span', { className: `app-icon brand-icon brand-${brandSlug(account.name)}`, style: { '--brand-color': account.color } }, brandMark(account.name)), h('div', null, h('div', { className: 'account-title-row' }, h('strong', null, account.name), h('span', { className: score >= 80 ? 'status-pill protected' : 'status-pill review-required' }, score >= 80 ? 'Protected' : 'Review Required')), h('small', null, `${account.handle || account.recoveryEmail} · ${account.category} · Last reviewed ${account.lastReviewed}`), h('div', { className: 'monitoring-grid' }, [['Risk', analysis.risk], ['Health', health], ['Recovery Score', `${score}%`], ['Last Updated', account.lastReviewed], ['MFA Status', account.authenticator || account.passkeyStatus || 'Missing'], ['Password Age', passwordAge], ['Backup Status', account.backupCodes ? 'Saved' : 'Missing'], ['Recovery Contact', account.trustedContacts || 'Missing'], ['Timeline', state.recoveryTimeline.length]].map(([label, value]) => h('span', { key: label }, h('b', null, label), value)))), h('b', { className: score < 80 ? 'review' : 'secure' }, `${score}% · ${analysis.risk} risk`), h('small', { className: 'score-reason' }, recommendationsFor(account)[0] || 'Recovery setup complete'), h('div', { className: 'account-actions' }, h('button', { onClick: (event) => { event.stopPropagation(); setState({ expandedAccountId: expanded ? '' : account.id }); } }, expanded ? 'Collapse' : 'Expand'), h('button', { onClick: (event) => { event.stopPropagation(); editAccount(account); location.hash = 'accounts'; } }, 'Edit'), h('button', { onClick: (event) => { event.stopPropagation(); deleteAccount(account.id); } }, 'Delete')));
}

function AccountManagerRow({ account }) {
  const score = scoreFor(account);
  const analysis = accountRisk(account);
  const riskClass = analysis.risk.toLowerCase().replaceAll(' ', '-');
  const status = score >= 80 ? 'Protected' : 'Review';
  const deviceCount = account.deviceVerification === 'Trusted' ? 2 : account.deviceVerification ? 1 : 0;
  return h('a', { href: '#account-detail', className: `account-manager-row ${state.accountDensity}`, onClick: () => setState({ selectedAccountId: account.id }) },
    h('span', { className: `app-icon brand-icon brand-${brandSlug(account.name)}`, style: { '--brand-color': account.color } }, brandMark(account.name)),
    h('div', { className: 'account-manager-identity' }, h('strong', null, account.name), h('small', null, account.handle || account.recoveryEmail || account.email)),
    h('span', { className: 'account-manager-cell category' }, account.category || 'Account'),
    h('b', { className: `risk-badge ${riskClass}` }, analysis.risk),
    h('span', { className: 'account-manager-cell' }, account.authenticator || 'Missing'),
    h('span', { className: 'account-manager-cell' }, account.passkeyStatus || 'Missing'),
    h('span', { className: 'account-manager-cell' }, account.backupCodes ? 'Saved' : 'Missing'),
    h('span', { className: 'account-manager-cell' }, `${deviceCount} devices`),
    h('span', { className: 'account-manager-cell' }, account.lastReviewed || 'Today'),
    h('span', { className: `readiness-pill ${status.toLowerCase()}` }, `${score}%`)
  );
}

function Accounts() {
  const accounts = filteredAccounts();
  return h('section', { className: `panel glass accounts-manager-pro density-${state.accountDensity}`, id: 'accounts' },
    h('div', { className: 'panel-head accounts-manager-head' }, h('div', null, h('p', { className: 'eyebrow' }, 'Accounts Manager Pro'), h('h2', null, 'Production account registry')), h('span', null, `${accounts.length}/${state.accounts.length} shown`)),
    state.loading && h('div', { className: 'loading-state' }, h('span'), h('span'), h('span')),
    state.dataError && h('p', { className: 'error-state' }, state.dataError),
    h('div', { className: 'account-pro-toolbar' },
      h('input', { value: state.accountSearch, onChange: (event) => setState({ accountSearch: event.target.value }), placeholder: 'Search accounts, users, recovery emails…', 'aria-label': 'Search accounts' }),
      h('select', { value: state.accountCategory, onChange: (event) => setState({ accountCategory: event.target.value }), 'aria-label': 'Filter accounts by category' }, ['All', ...appCategories].map((category) => h('option', { key: category }, category))),
      h('select', { value: state.accountRiskFilter, onChange: (event) => setState({ accountRiskFilter: event.target.value }), 'aria-label': 'Filter accounts by risk' }, ['All', 'Critical', 'High', 'Medium', 'Low', 'Safe'].map((risk) => h('option', { key: risk }, risk))),
      h('select', { value: state.accountStatusFilter, onChange: (event) => setState({ accountStatusFilter: event.target.value }), 'aria-label': 'Filter accounts by status' }, ['All', 'Protected', 'Review'].map((status) => h('option', { key: status }, status))),
      h('select', { value: state.accountSort, onChange: (event) => setState({ accountSort: event.target.value }), 'aria-label': 'Sort accounts' }, ['Risk', 'Name', 'Last updated'].map((sort) => h('option', { key: sort }, sort))),
      h('button', { className: state.accountDensity === 'compact' ? 'active-view' : '', onClick: () => setState({ accountDensity: state.accountDensity === 'compact' ? 'comfortable' : 'compact' }) }, state.accountDensity === 'compact' ? 'Compact' : 'Comfortable')
    ),
    h('div', { className: 'account-bulk-toolbar' },
      h('button', { onClick: () => exportReport('json') }, 'Export'),
      h('button', { onClick: () => toast('Encrypted backup workflow ready') }, 'Backup'),
      h('button', { onClick: () => location.hash = 'recovery-center' }, 'Recover'),
      h('button', { className: 'primary', onClick: runHealthScan }, 'Security Check'),
      h('select', { onChange: (event) => event.target.value && toast(`${event.target.value} queued`) }, h('option', { value: '' }, 'More…'), ['Bulk review', 'Archive inactive', 'Refresh metadata'].map((item) => h('option', { key: item }, item)))
    ),
    accounts.length ? h('div', { className: 'account-manager-table', role: 'table', 'aria-label': 'Account security registry' },
      h('div', { className: 'account-manager-header', role: 'row' }, ['Account', 'Category', 'Risk', 'MFA', 'Passkey', 'Backup', 'Devices', 'Updated', 'Ready'].map((label) => h('span', { key: label, role: 'columnheader' }, label))),
      accounts.map((account) => h(AccountManagerRow, { key: account.id, account }))
    ) : h(EmptyState, { icon: '◌', title: 'No accounts match this view', description: 'Adjust filters or connect your first protected account to start improving recovery readiness.', action: 'Reset filters', onAction: () => setState({ accountSearch: '', accountCategory: 'All', accountRiskFilter: 'All', accountStatusFilter: 'All' }) })
  );
}

function AccountForm() {
  const editing = state.accounts.find((account) => account.id === state.editingAccountId);
  return h('section', { className: 'panel glass', id: 'account-form' }, h('p', { className: 'eyebrow' }, state.editingAccountId ? 'Edit Account' : 'Import / Add Account'), h('div', { className: 'account-toolbar' }, accountTemplates.map((template) => h('button', { key: template, type: 'button', onClick: () => { setState({ editingAccountId: '' }); setTimeout(() => { const input = document.querySelector('#account-form [name=name]'); if (input) input.value = template === 'Custom Account' ? '' : template; const category = document.querySelector('#account-form [name=category]'); if (category) category.value = providerMeta(template)[2]; }, 0); } }, `+ Add ${template.replace(' Account', '')}`))), h('h2', null, state.editingAccountId ? `Editing ${editing?.name || 'account'}` : 'Manual account import'), h('form', { className: 'account-form', onSubmit: saveAccount }, h('input', { name: 'name', placeholder: 'Service name', defaultValue: editing?.name || '', required: true }), h('input', { name: 'handle', placeholder: 'Username', defaultValue: editing?.handle || '' }), h('select', { name: 'category', defaultValue: editing?.category || 'Email' }, appCategories.map((category) => h('option', { key: category }, category))), h('input', { name: 'email', placeholder: 'Recovery email', defaultValue: editing?.recoveryEmail || '' }), h('input', { name: 'phone', placeholder: 'Recovery phone', defaultValue: editing?.recoveryPhone || '' }), h('input', { name: 'authenticator', placeholder: 'Authenticator status', defaultValue: editing?.authenticator || '' }), h('input', { name: 'passkey', placeholder: 'Passkey status', defaultValue: editing?.passkeyStatus || '' }), h('input', { name: 'codes', placeholder: 'Backup code status', defaultValue: editing?.backupCodes || '' }), h('input', { name: 'contacts', placeholder: 'Trusted contacts', defaultValue: editing?.trustedContacts || '' }), h('input', { name: 'device', placeholder: 'Device verification', defaultValue: editing?.deviceVerification || '' }), h('input', { name: 'reviewed', type: 'date', defaultValue: editing?.lastReviewed || new Date().toISOString().slice(0, 10) }), h('button', { className: 'primary full-span' }, state.editingAccountId ? 'Update Account' : 'Save Account'), state.editingAccountId && h('button', { type: 'button', onClick: () => setState({ editingAccountId: '' }) }, 'Cancel edit')), h('p', { className: 'muted' }, state.user ? 'Accounts save to your private Firestore account registry.' : 'Sign in to save accounts to Firestore; local entries stay in this browser until authentication is configured.'));
}

function SwitchMode() {
  const affected = switchAccounts();
  return h('section', { className: 'panel glass dedicated-page', id: 'switch' }, h('p', { className: 'eyebrow' }, 'Switch Mode'), h('h2', null, 'Real migration workflow'), h('p', { className: 'muted' }, 'Move selected accounts to a new email, phone, authenticator, and password with visible progress.'), h('div', { className: 'two-inputs' }, h('input', { placeholder: 'New recovery email' }), h('input', { value: state.switchNew, onChange: (event) => setState({ switchNew: event.target.value }), placeholder: 'New recovery phone' }), h('input', { placeholder: 'New authenticator' }), h('input', { type: 'password', placeholder: 'New password stored outside SecureSwitch' })), h('button', { className: 'primary', onClick: () => toast(`${affected.length} account migration checklist generated`) }, 'Generate migration plan'), h('div', { className: 'progress' }, h('span', { style: { width: `${affected.length ? 72 : 24}%` } })), h('ul', { className: 'mini-list' }, (affected.length ? affected : state.accounts.slice(0, 4)).map((account) => h('li', { key: account.name }, `${account.name} → verify email, phone, authenticator, password, backup codes`))));
}

function BlackoutMode() {
  return h('section', { className: 'panel glass dedicated-page', id: 'blackout' }, h('p', { className: 'eyebrow' }, 'Blackout Mode'), h('h2', null, 'Emergency lockdown'), h('button', { className: 'danger full', onClick: () => setState({ blackoutArmed: !state.blackoutArmed }) }, state.blackoutArmed ? 'Disarm Blackout' : 'One-click emergency lockdown'), h('div', { className: 'status-grid' }, [['Checklist', '6 critical steps'], ['Backup verification', state.exportStatus || 'Ready'], ['Emergency contacts', state.trustedContacts.length || state.accounts.filter((account) => account.trustedContacts).length], ['Encrypted package', 'Download ready']].map(([label, value]) => h('article', { key: label }, h('span', null, label), h('strong', null, value)))), h('button', { onClick: exportEncryptedRecoveryData }, 'Download encrypted package'), h('ol', { className: 'mini-list' }, ['Freeze SIM', 'Lock Apple ID', 'Lock Gmail', 'Lock banks', 'Lock crypto', 'Notify trusted contacts'].map((item) => h('li', { key: item }, item))));
}

function RecoveryLookup() {
  const options = [...new Set(state.accounts.flatMap((account) => [account.phone, account.email, account.handle, account.category, account.recoveryPhone, account.recoveryEmail, account.trustedContacts, account.authenticator]).filter(Boolean))];
  const query = state.selectedRecovery.toLowerCase();
  const matches = state.accounts.filter((account) => [account.email, account.phone, account.handle, account.name, account.category, account.recoveryPhone, account.recoveryEmail, account.trustedContacts, account.authenticator].join(' ').toLowerCase().includes(query));
  return h('section', { className: 'panel glass dedicated-page', id: 'lookup' }, h('p', { className: 'eyebrow' }, 'Recovery Lookup'), h('h2', null, 'Search any account instantly'), h('div', { className: 'account-toolbar' }, h('input', { value: state.selectedRecovery, onChange: (event) => setState({ selectedRecovery: event.target.value }), placeholder: 'Search email, phone, username, platform, contact, method…' }), h('select', { value: state.selectedRecovery, onChange: (event) => setState({ selectedRecovery: event.target.value }) }, options.map((value) => h('option', { key: value }, value)))) , h('div', { className: 'filter-pills' }, ['Email', 'Phone', 'Username', 'Platform', 'Recovery Contact', 'Recovery Method'].map((filter) => h('span', { key: filter }, filter))), matches.map((account) => h(AccountCard, { key: account.id, account })));
}

function EmergencyKit() {
  const kit = state.emergencyKits[0];
  const items = kit?.items || ['Recovery codes', 'Passport', 'Driver license', 'Wallet', 'Insurance', 'Medical', 'Birth certificate', 'Social Security'];
  return h('section', { className: 'panel glass dedicated-page', id: 'kit' }, h('p', { className: 'eyebrow' }, 'Emergency Kit'), h('h2', null, 'Encrypted emergency vault'), h('p', { className: 'muted' }, 'Store critical recovery documents in your encrypted vault. Demo mode keeps uploads local-only.'), h('label', { className: 'drop-zone', onDragOver: (event) => event.preventDefault(), onDrop: (event) => { event.preventDefault(); toast(`${event.dataTransfer.files.length} emergency file${event.dataTransfer.files.length === 1 ? '' : 's'} staged`); } }, h('strong', null, 'Drag and drop encrypted documents'), h('span', null, 'or choose files'), h('input', { type: 'file', multiple: true, onChange: (event) => toast(`${event.target.files.length} emergency file${event.target.files.length === 1 ? '' : 's'} staged`) })), h('div', { className: 'kit-grid' }, items.map((item) => h('div', { key: item }, h('strong', null, item), h('small', null, kit?.status || 'Vault slot ready')))));
}

function EmergencyKitSummary() {
  const kit = state.emergencyKits[0];
  return h('section', { className: 'panel glass emergency-summary' }, h('p', { className: 'eyebrow' }, 'Emergency Kit'), h('h2', null, kit?.status || 'Ready to export'), h('p', null, kit ? `${kit.title}: ${(kit.items || []).join(', ')}` : 'Trusted contacts, offline backup codes, recovery letter, and insurance notes are prepared.'), h('a', { className: 'rail-link', href: '#kit' }, 'Open kit →'));
}

function SuggestedFixes() { return h(QuickFixCenter); }

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
function timelineIcon(type) { return type.includes('Device') ? '◉' : type.includes('Backup') ? '▣' : type.includes('Notification') ? '⚠' : type.includes('Audit') ? '✓' : type.includes('Review') ? '⌁' : '✦'; }
function timelineSeverity(type) { return type.includes('removed') || type.includes('Notification') ? 'high' : type.includes('review') || type.includes('Recovery') ? 'medium' : 'low'; }
function RecoveryTimeline() { const filters = ['All', 'Account added', 'Recovery updated', 'Backup generated', 'Security review', 'Device added', 'Device removed', 'Notifications', 'Audit completed']; const events = buildSecurityTimeline({ accounts: state.accounts, activity: state.activityFeed, notifications: notificationItems(), auditEvents: state.auditEvents, devices: state.devices }); const filtered = state.timelineFilter === 'All' ? events : events.filter((event) => event.type === state.timelineFilter); return h('section', { className: 'panel glass timeline-panel', id: 'timeline' }, h('p', { className: 'eyebrow' }, 'Security Timeline'), h('h2', null, 'Chronological security history'), h('div', { className: 'filter-row' }, filters.map((filter) => h('button', { key: filter, className: state.timelineFilter === filter ? 'active-filter' : '', onClick: () => setState({ timelineFilter: filter }) }, filter))), h('div', { className: 'timeline-list polished-security-timeline' }, filtered.length ? filtered.map((event, index) => { const id = `${event.type}-${event.title}-${event.at}`; const expanded = state.expandedTimelineId === id; return h('article', { key: id, className: `timeline-event severity-${timelineSeverity(event.type)}`, style: { '--delay': `${index * 45}ms` } }, h('button', { onClick: () => setState({ expandedTimelineId: expanded ? '' : id }), 'aria-expanded': expanded }, h('span', { className: 'timeline-icon' }, timelineIcon(event.type)), h('div', null, h('strong', null, event.title), h('small', null, `${event.type} · ${new Date(event.at).toLocaleString()}`)), h('b', null, timelineSeverity(event.type))), expanded && h('p', null, event.detail)); }) : h(EmptyState, { icon: '⌁', title: 'No recent security events.', description: 'Account changes, device updates, notifications, backups, and audits will appear here automatically.', action: 'Run audit', onAction: runSecurityAudit }))); }
function EmergencySimulator() {
  const scenarios = ['My phone was stolen', 'SIM Swap', 'Laptop stolen', 'Email hacked', 'Authenticator deleted', 'Lost backup codes', 'Identity theft', 'Ransomware'];
  const result = reviewCount() > 1 ? 'PARTIAL' : 'YES';
  return h('section', { className: 'panel glass simulator-panel', id: 'simulator' }, h('p', { className: 'eyebrow' }, 'Emergency Simulator'), h('h2', null, 'Practice before disaster'), h('select', { value: state.simulatorScenario, onChange: (event) => setState({ simulatorScenario: event.target.value }) }, scenarios.map((scenario) => h('option', { key: scenario }, scenario))), h('button', { className: 'primary', onClick: () => setState({ simulatorRan: true }) }, 'Run simulation'), state.simulatorRan && h('div', { className: 'sim-result' }, h('strong', null, `Can you recover? ${result}`), h('p', null, `${reviewCount()} accounts need attention before ${state.simulatorScenario.toLowerCase()} is fully recoverable.`), h('ol', null, ['Secure primary email', 'Open account recovery links', 'Notify trusted contacts', 'Export emergency recovery packet'].map((step) => h('li', { key: step }, step)))));
}
function FamilyMode() { return h('section', { className: 'panel glass family-panel', id: 'family' }, h('p', { className: 'eyebrow' }, 'Family Recovery'), h('h2', null, 'Premium family recovery center'), familyMembers.map((member) => h('article', { className: 'family-row', key: member.name }, h('strong', null, member.name), h('span', null, `${member.score}%`), h('small', null, `${member.note} · Trusted contacts · Emergency contacts · Kit sharing ready`))), h('button', { className: 'primary', onClick: () => toast('Emergency kit sharing prepared') }, 'Share emergency kits')); }
function WeeklyReport() { const summary = dashboardSummary(state.accounts); const reportItems = [`${summary.recoveryScore}% Recovery score`, `${summary.recentlyUpdated.length} accounts recently updated`, `${reviewCount()} accounts at risk`, `${state.trustedContacts.length || summary.missingTrustedContacts} trusted-contact records`, `${issueList().length * 2 - Math.min(issueList().length, summary.highRiskAccounts)} minutes estimated repair time`]; return h('section', { className: 'panel glass report-panel' }, h('p', { className: 'eyebrow' }, 'Weekly Recovery Report'), h('h2', null, 'Score changes and suggested actions'), h('div', { className: 'report-grid' }, reportItems.map((item) => h('span', { key: item }, item))), h('div', { className: 'trend-bars' }, [45, 58, 72, 82, averageScore()].map((value) => h('i', { key: value, style: { height: `${value}%` } })))); }
function RecoveryInsights() { return h('section', { className: 'panel glass insights-panel' }, h('p', { className: 'eyebrow' }, 'Recovery Insights'), h('h2', null, 'What to fix next'), h('ul', null, [`${oldPhoneAccounts().length} accounts using an old phone number.`, `${state.accounts.filter((account) => !account.trustedContacts).length} accounts missing trusted contacts.`, `${duplicatedRecoveryEmails()} recovery emails are duplicated.`, 'One banking account has no backup codes.', 'Estimated repair time: 7 minutes.'].map((item) => h('li', { key: item }, item))), h('button', { className: 'primary', onClick: runHealthScan }, 'Fix Everything')); }
function IdentityDNA() { const axes = ['Authentication', 'Recovery', 'Privacy', 'Backups', 'Passkeys', 'Emergency', 'Security', 'Family']; return h('section', { className: 'panel glass dna-panel' }, h('p', { className: 'eyebrow' }, 'Identity DNA'), h('h2', null, 'Overall Identity Health'), h('div', { className: 'dna-orbit' }, axes.map((axis, index) => h('span', { key: axis, style: { '--i': index } }, axis)))); }
function RecoveryMap() { return h('section', { className: 'panel glass recovery-map' }, h('p', { className: 'eyebrow' }, 'Recovery Map'), h('h2', null, 'Interactive account recovery profiles'), state.accounts.map((account) => h('button', { className: 'map-row', key: account.name, onClick: () => setState({ activeProfile: account.name }) }, h('strong', null, account.name), h('span', null, `${scoreFor(account)}% health`), h('span', null, account.phone || 'No phone'), h('span', null, account.recoveryEmail || account.email || 'No email'), h('span', null, account.backupCodes ? 'Backup codes' : 'Missing codes'), h('b', null, scoreFor(account) > 79 ? 'Low risk' : 'High risk'))), state.activeProfile && h('p', { className: 'muted' }, `${state.activeProfile} profile opened: phone, recovery email, backup codes, passkeys, authenticator, trusted contacts, and risk level are ready for review.`)); }
function Activity() { const activityFeed = safeArray(state.activityFeed); const recoveryTimeline = safeArray(state.recoveryTimeline); const rows = usingLiveAccounts() && activityFeed.length ? activityFeed.map((event) => `${event.title || event.type || 'Activity'} — ${event.type || 'SecureSwitch'} — ${event.createdAt ? 'just now' : 'Today'}`) : usingLiveAccounts() && recoveryTimeline.length ? recoveryTimeline.map((event) => `${event.title} — ${event.category || 'SecureSwitch'} — ${event.date || 'Today'}`) : activity; return h('section', { className: 'panel glass activity-panel' }, h('div', { className: 'panel-head' }, h('p', { className: 'eyebrow' }, 'Recent Activity'), h('a', { href: '#timeline' }, 'View all')), rows.map((item) => { const [title, service, time] = item.split(' — '); return h('article', { className: 'activity', key: item }, h('span', null, title.includes('Password') ? '▣' : title.includes('email') ? '✉' : title.includes('scanned') ? '⌗' : '⌁'), h('div', null, h('strong', null, title), h('small', null, service)), h('time', null, time)); })); }
function Readiness() { return h('section', { className: 'panel glass readiness-panel' }, h('div', { className: 'panel-head' }, h('p', { className: 'eyebrow' }, 'Recovery Readiness'), h('strong', null, `${liveProtectionScore()}%`)), h('div', { className: 'progress' }, h('span', { style: { width: `${liveProtectionScore()}%` } })), h('p', null, 'You’re ready for the unexpected. Keep it up!')); }
function notificationItems() {
  const live = safeArray(state.notifications).map((note, index) => ({ id: note.id || `live-note-${index}`, title: note.title || 'Security notification', detail: note.detail || note.status || 'Open', unread: note.unread !== false }));
  if (live.length) return live.concat(safeArray(state.securityAlerts).map((alert, index) => ({ id: alert.id || `alert-${index}`, title: alert.title || 'Security alert', detail: alert.severity || alert.status || 'Review' })));
  return [
    ['Recent Security Alerts', `${dashboardSummary(safeAccounts()).securityAlerts.length} alerts from score engine`],
    ['Recovery Reminders', `${reviewCount()} accounts need review`],
    ['Password Expiration', `${safeAccounts().filter((account) => Date.parse(account.lastReviewed || '') < Date.now() - 180 * 86400000).length} passwords aging`],
    ['Weekly Score Reports', `Recovery score is ${averageScore()}%`],
    ['Successful Backups', `${safeAccounts().filter((account) => account.backupCodes).length} accounts have backup codes`],
    ['New Device Logins', state.user ? 'Persistent session active' : 'Demo session only'],
    ['Suspicious Activity', oldPhoneAccounts().length ? 'Old phone number still used' : 'No suspicious changes detected']
  ].map(([title, detail], index) => ({ id: `note-${index}`, title, detail }));
}
function unreadNotifications() { return notificationItems().filter((item) => !safeArray(state.notificationsRead).includes(item.id)); }
function LandingPage() {
  const faqs = ['How is SecureSwitch different?', 'Do you store passwords?', 'Can I export my vault?', 'Is there a mobile app?'];
  return h('section', { className: 'landing-page glass', id: 'landing' },
    h('div', { className: 'landing-hero' }, h('p', { className: 'eyebrow' }, 'Public Homepage'), h('h1', null, 'Never lose another account again.'), h('p', null, 'SecureSwitch helps people prepare before they lose access. Recovery Score, AI coaching, encrypted vault exports, and emergency readiness in one premium dashboard.'), h('div', { className: 'landing-actions' }, h('a', { className: 'primary landing-cta', href: '#waitlist' }, 'Join the beta'), h('a', { className: 'ghost', href: '#dashboard' }, 'Open app'))),
    h('div', { className: 'landing-grid' }, ['Recovery Score', 'AI Recovery Coach', 'Encrypted Vault', 'Emergency Kit', 'Account Monitoring', 'Premium Reports'].map((feature) => h('article', { key: feature }, h('strong', null, feature), h('small', null, 'Launch-ready, demo-safe, and Firebase-aware.')))),
    h('section', { className: 'landing-testimonials' }, ['“This feels like the missing safety layer for my digital life.”', '“The score makes recovery finally understandable.”', '“The emergency kit is exactly what families need.”'].map((quote) => h('blockquote', { key: quote }, quote))),
    h(PricingPage),
    h('div', { className: 'faq-grid' }, faqs.map((faq) => h('details', { key: faq }, h('summary', null, faq), h('p', null, 'SecureSwitch is designed for privacy-first account recovery readiness.')))),
    h('section', { className: 'download-app panel glass', id: 'download-app' }, h('p', { className: 'eyebrow' }, 'Download App'), h('h2', null, 'App Store readiness in progress'), h('p', null, 'Join the waitlist to be notified when iOS and Android beta builds open.')),
    h(WaitlistPage),
    h('footer', { className: 'landing-footer' }, 'SecureSwitch © 2026 · Privacy-first digital recovery')
  );
}
function WaitlistPage() {
  return h('section', { className: 'panel glass waitlist-page', id: 'waitlist' }, h('p', { className: 'eyebrow' }, 'Waitlist'), h('h2', null, 'Reserve public beta access'), h('form', { className: 'waitlist-form', onSubmit: submitWaitlist }, h('input', { name: 'name', placeholder: 'Name', required: true }), h('input', { name: 'email', type: 'email', placeholder: 'Email', required: true }), h('input', { name: 'referral', placeholder: 'Referral Code' }), h('select', { name: 'interest' }, ['AI Recovery Coach', 'Family Recovery', 'Business Readiness', 'Encrypted Vault'].map((item) => h('option', { key: item }, item))), h('select', { name: 'audience' }, ['Personal', 'Business'].map((item) => h('option', { key: item }, item))), h('button', { className: 'primary full-span' }, 'Join Waitlist')), state.waitlistStatus && h('p', { className: 'muted' }, state.waitlistStatus), state.waitlistReferral && h('code', null, state.waitlistReferral));
}
function CompliancePages() {
  const pages = ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Support Page', 'Contact Page', 'Delete Account', 'Export Data'];
  return h('section', { className: 'panel glass compliance-pages', id: 'compliance' }, h('p', { className: 'eyebrow' }, 'App Store Compliance'), h('h2', null, 'Required public beta pages'), h('div', { className: 'compliance-grid' }, pages.map((page) => h('article', { key: page, id: page.toLowerCase().replaceAll(' ', '-') }, h('strong', null, page), h('p', null, `${page} content is prepared for public beta review and can be expanded with legal-approved copy.`)))));
}
function ImportExportCenter() {
  const imports = ['Google Authenticator', 'Microsoft Authenticator', 'Authy', 'CSV', 'JSON', 'Encrypted Backup'];
  const exports = [['Accounts JSON', 'json'], ['Accounts CSV', 'csv'], ['Timeline PDF', 'timeline'], ['Audit PDF', 'security'], ['Recovery PDF', 'recovery'], ['Security Report PDF', 'pdf'], ['Encrypted Backup', 'encrypted'], ['Emergency Recovery Kit', 'emergency-kit']];
  return h('section', { className: 'panel glass import-export-center', id: 'import-export' }, h('p', { className: 'eyebrow' }, 'Import / Export'), h('h2', null, 'Bring recovery data in and take it out safely'), h('form', { className: 'import-form', onSubmit: importAccountsFromSource }, h('select', { name: 'source', value: state.importSource, onChange: (event) => setState({ importSource: event.target.value }) }, imports.map((item) => h('option', { key: item }, item))), h('button', { className: 'primary' }, 'Run local import')), h('div', { className: 'export-grid' }, exports.map(([label, kind]) => h('button', { key: kind, onClick: () => exportFormat(kind) }, label))));
}
function AnalyticsDashboard() {
  const metrics = [['Daily users', state.user ? 1 : 0], ['Recovery Score average', `${averageScore()}%`], ['Accounts protected', state.accounts.length], ['Vault exports', state.exportStatus ? 1 : 0], ['Recovery kits created', state.emergencyKits.length], ['Premium conversions', 'Payments disabled']];
  return h('section', { className: 'panel glass analytics-dashboard', id: 'analytics' }, h('p', { className: 'eyebrow' }, 'Analytics'), h('h2', null, 'Public beta launch metrics'), h('div', { className: 'premium-metric-grid' }, metrics.map(([label, value]) => h('article', { key: label }, h('span', null, label), h('strong', null, value)))));
}
function BetaResiliencePanel() {
  return h('section', { className: 'panel glass resilience-panel', id: 'resilience' }, h('p', { className: 'eyebrow' }, 'Reliability & Security'), h('h2', null, state.isOffline ? 'Offline mode active' : 'Network ready'), h('p', null, state.isOffline ? 'SecureSwitch is preserving the dashboard locally until the network returns.' : 'Network detection, retry hooks, input sanitization, rate-limit hooks, security events, auto-lock planning, and friendly errors are active.'), h('button', { onClick: () => { setState({ dataError: '' }); toast('Retry complete'); } }, 'Retry'), h('ul', { className: 'mini-list' }, ['Session expiration hooks', 'Auto logout planning', 'Brute-force protection hooks', 'Input sanitization', 'Rate limit hooks', 'Security event logging'].map((item) => h('li', { key: item }, item))), state.securityEvents.map((event) => h('small', { key: event.id }, `${event.time} · ${event.title}`)));
}


function ProductionCommandCenter() {
  const summary = dashboardSummary(state.accounts);
  const metrics = [
    ['Daily Security Score', `${averageScore()}%`], ['Weekly Security Trends', '+6%'], ['Recent Activity', activity.length], ['Active Alerts', unreadNotifications().length],
    ['Devices Online', Math.max(2, state.accounts.filter((account) => account.authenticator).length)], ['Last Backup', state.exportStatus || '2d ago'], ['Account Risk Overview', `${summary.highRiskAccounts} high risk`], ['Recovery Readiness', `${liveProtectionScore()}%`], ['Premium Usage', 'Beta Pro ready'], ['Quick Actions', commandPaletteItems().length]
  ];
  return h('section', { className: 'panel glass production-command-center', id: 'production-command-center' }, h('div', { className: 'panel-head' }, h('div', null, h('p', { className: 'eyebrow' }, 'Real App Dashboard'), h('h2', null, 'Production command center')), h('button', { className: 'primary', onClick: () => setState({ commandPaletteOpen: true }) }, 'Open Command Palette')), h('div', { className: 'command-metric-grid' }, metrics.map(([label, value]) => h('article', { key: label }, h('span', null, label), h('strong', null, value)))), h('div', { className: 'live-feed-grid' }, h('article', null, h('strong', null, 'Recent logins'), h('p', null, `${firstName()} · current session · persistent login`)), h('article', null, h('strong', null, 'Recent changes'), h('p', null, state.securityEvents[0]?.title || 'No security changes yet')), h('article', null, h('strong', null, 'Recent backups'), h('p', null, state.exportStatus || 'Encrypted backup ready'))));
}
function AccountDetailPage() {
  const account = selectedAccount();
  const score = scoreFor(account);
  const tabs = ['Overview', 'Security', 'Recovery', 'Timeline', 'Devices', 'Recommendations', 'Settings'];
  const rows = [['Security score', `${score}%`], ['Recovery Email', account.recoveryEmail || 'Missing'], ['Recovery Phone', account.recoveryPhone || account.phone || 'Missing'], ['Backup Codes', account.backupCodes || 'Missing'], ['2FA', account.authenticator || 'Missing'], ['Passkeys', account.passkeyStatus || 'Not configured'], ['Devices', account.deviceVerification || 'Needs review'], ['Recovery Contacts', account.trustedContacts || 'Missing']];
  const tab = state.accountDetailTab;
  return h('section', { className: 'panel glass account-detail-page dedicated-page', id: 'account-detail' },
    h('div', { className: 'panel-head' }, h('div', null, h('p', { className: 'eyebrow' }, 'Account Detail'), h('h2', null, account.name)), h('div', { className: 'portability-actions' }, h('button', { onClick: () => { editAccount(account); location.hash = 'accounts'; } }, 'Edit fields'), h('button', { className: 'primary', onClick: () => { setState({ accountDetailTab: 'Recommendations' }); toast('Fix recommendations opened'); } }, 'Fix Now'), h('button', { onClick: () => exportReport('security') }, 'Export options'))),
    h('div', { className: 'detail-tab-list', role: 'tablist' }, tabs.map((item) => h('button', { key: item, className: tab === item ? 'active-filter' : '', onClick: () => setState({ accountDetailTab: item }) }, item))),
    tab === 'Overview' && h('div', { className: 'detail-grid' }, rows.map(([label, value]) => h('article', { key: label }, h('span', null, label), h('strong', null, value)))),
    tab === 'Security' && h('div', { className: 'security-alert-stack' }, accountTimeline(account).filter((item) => /Password|2FA|Passkey|Unknown|Security/.test(item.title)).map((item) => h('article', { key: item.id }, h('b', null, item.status), h('span', null, item.title), h('small', null, item.detail)))),
    tab === 'Recovery' && h('div', { className: 'detail-grid' }, [['Recovery Email', account.recoveryEmail || 'Missing'], ['Recovery Phone', account.recoveryPhone || 'Missing'], ['Backup Codes', account.backupCodes || 'Missing'], ['Recovery Contacts', account.trustedContacts || 'Missing']].map(([label, value]) => h('article', { key: label }, h('span', null, label), h('strong', null, value)))),
    tab === 'Timeline' && h('div', { className: 'github-timeline' }, accountTimeline(account).map((item) => h('article', { key: item.id }, h('i'), h('div', null, h('strong', null, item.title), h('small', null, item.detail)), h('b', null, item.status)))),
    tab === 'Devices' && h('div', { className: 'device-grid compact' }, (state.devices.length ? state.devices : [currentDeviceSnapshot()]).map((device) => h('article', { key: device.id }, h('strong', null, device.browser || 'Current device'), h('small', null, `${device.os} · ${device.location}`), h('button', { onClick: () => toast('Device review opened') }, 'Review')))),
    tab === 'Recommendations' && h('div', { className: 'recommendation-stack' }, (recommendationsFor(account).length ? recommendationsFor(account) : ['No urgent recommendations.']).map((item) => h('article', { key: item }, h('strong', null, item), h('small', null, 'Why it matters: this reduces account lockout risk during recovery.'), h('button', { onClick: () => toast('Recommendation action opened') }, 'Take action')))),
    tab === 'Settings' && h('div', { className: 'settings-options' }, ['Archive account', 'Require quarterly audit', 'Include in emergency kit', 'Enable alerting'].map((item) => h('label', { key: item }, h('input', { type: 'checkbox', defaultChecked: true }), item)))
  );
}
function CommandPalette() {
  if (!state.commandPaletteOpen) return null;
  const results = commandPaletteResults();
  const activeIndex = Math.min(state.commandIndex, Math.max(0, results.length - 1));
  const active = results[activeIndex];
  const groups = groupedPaletteResults(results);
  const favorites = localJsonList('secureswitch:command-favorites');
  const empty = results.length === 0;
  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setState({ commandIndex: Math.min(activeIndex + 1, results.length - 1) }); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setState({ commandIndex: Math.max(activeIndex - 1, 0) }); }
    if (event.key === 'Enter' && active) { event.preventDefault(); executeCommand(active); }
    if (event.key === 'Escape') { event.preventDefault(); setState({ commandPaletteOpen: false, commandIndex: 0 }); }
  };
  return h('section', { className: 'command-palette-backdrop global-command-backdrop', role: 'dialog', 'aria-label': 'Global search and command palette', onKeyDown },
    h('div', { className: 'command-palette glass global-command-palette' },
      h('header', { className: 'command-palette-header' },
        h('div', { className: 'command-search-shell' }, h('span', null, '⌕'), h('input', { autoFocus: true, value: state.globalSearch, onChange: (event) => setState({ globalSearch: event.target.value, commandIndex: 0 }), placeholder: 'Search accounts, devices, recovery, commands…', 'aria-label': 'Search SecureSwitch' }), h('kbd', null, navigator.platform?.includes('Mac') ? '⌘K' : 'Ctrl K')),
        h('button', { className: 'ghost', onClick: () => setState({ commandPaletteOpen: false, commandIndex: 0 }) }, 'Esc')
      ),
      h('div', { className: 'command-filter-chips', 'aria-label': 'Search categories' }, ['All', 'Accounts', 'Devices', 'Recovery', 'Pages', 'Commands', 'Notifications', 'Settings'].map((chip) => h('button', { key: chip, onClick: () => setState({ globalSearch: chip === 'All' ? '' : chip, commandIndex: 0 }) }, chip))),
      empty ? h('div', { className: 'command-empty-state' }, h('span', null, '⌘'), h('strong', null, 'Search SecureSwitch instantly'), h('p', null, 'Try accounts, devices, recovery, risky accounts, missing MFA, notifications, settings, or AI Copilot.'), h('div', null, ['Go to Accounts', 'Open Recovery Vault', 'Open AI Copilot', 'View Security Score'].map((label) => h('button', { key: label, onClick: () => setState({ globalSearch: label, commandIndex: 0 }) }, label)))) :
        h('div', { className: 'command-results-shell', role: 'listbox', 'aria-label': 'Command palette results' }, Object.entries(groups).map(([group, items]) =>
          h('section', { key: group, className: 'command-result-group' },
            h('div', { className: 'command-group-label' }, h('span', null, group), h('small', null, items.length)),
            items.map((item) => {
              const index = results.indexOf(item);
              const isActive = index === activeIndex;
              const isFavorite = favorites.includes(item.label);
              return h('button', { key: `${group}-${item.label}-${item.detail}`, className: `command-result-row ${isActive ? 'active-command' : ''}`, role: 'option', 'aria-selected': isActive, onMouseEnter: () => setState({ commandIndex: index }), onClick: () => executeCommand(item) },
                h('span', { className: 'command-result-icon' }, item.icon || '⌘'),
                h('span', { className: 'command-result-copy' }, h('strong', null, highlightMatch(item.label)), h('small', null, highlightMatch(item.detail || item.group))),
                h('span', { className: 'command-result-meta' }, item.group),
                h('span', { className: 'command-favorite', role: 'button', tabIndex: 0, onClick: (event) => { event.preventDefault(); event.stopPropagation(); favoritePaletteItem(item.label); }, 'aria-label': isFavorite ? `Remove ${item.label} from favorites` : `Favorite ${item.label}` }, isFavorite ? '★' : '☆')
              );
            })
          )
        )),
      h('footer', { className: 'command-palette-footer' }, h('span', null, '↑↓ Navigate'), h('span', null, 'Enter Open'), h('span', null, 'Esc Close'), h('span', null, '★ Favorite'))
    )
  );
}

function ReportGenerator() {
  const reports = ['Recovery Report', 'Organization Report', 'Security Audit', 'Recovery Readiness', 'Password Health', 'Executive Summary'];
  return h('section', { className: 'panel glass report-generator', id: 'report-generator' }, h('p', { className: 'eyebrow' }, 'Report Generator'), h('h2', null, 'Beautiful production reports'), h('div', { className: 'report-controls' }, h('select', { value: state.reportType, onChange: (event) => setState({ reportType: event.target.value }) }, reports.map((report) => h('option', { key: report }, report))), ['pdf', 'csv', 'json'].map((format) => h('button', { key: format, className: format === 'pdf' ? 'primary' : '', onClick: () => generateProductionReport(format) }, `Export ${format.toUpperCase()}`))), h('div', { className: 'report-preview' }, h('strong', null, state.reportType), h('p', null, `Includes Recovery Score ${averageScore()}%, Password Health ${passwordHealthScore()}%, ${state.organizations.length} organizations, ${safeAccounts().length} accounts, and executive-ready recommendations.`)));
}
function ProductionAdminDashboard() {
  return h('section', { className: 'panel glass production-admin-dashboard', id: 'production-admin' }, h('p', { className: 'eyebrow' }, 'Production Admin Panel'), h('h2', null, 'Operational analytics snapshot'), h('div', { className: 'command-metric-grid' }, [['User count', state.user ? 1 : 0], ['Active devices', safeArray(state.devices).length || 1], ['Recovery success', `${Math.max(0, 100 - reviewCount() * 8)}%`], ['Server health', state.isOffline ? 'Offline' : 'Online'], ['App version', buildVersion()], ['Firebase status', state.firebaseReady ? 'Ready' : 'Demo fallback'], ['Protected routes', 'Enabled'], ['Runtime', runtimeModeLabel()]].map(([label, value]) => h('article', { key: label }, h('span', null, label), h('strong', null, value)))));
}
function TeamFamilyVaults() {
  const selected = state.organizations.find((org) => (org.id || org.name) === state.selectedOrganizationId) || state.organizations[0] || demoOrganizations[0];
  const policyRows = Object.entries(state.enterprisePolicies || defaultSecurityPolicies()).filter(([key]) => key !== 'createdAt').map(([key, value]) => [key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase()), value === true ? 'Required' : value === false ? 'Optional' : value]);
  const auditRows = (state.enterpriseAuditLog.length ? state.enterpriseAuditLog : [enterpriseAuditEvent({ action: 'Workspace Viewed', actor: firstName(), category: 'Audit', description: 'Enterprise audit log is ready', severity: 'Info' })]).slice(0, 5);
  const approvals = state.approvalWorkflows.length ? state.approvalWorkflows : [createApproval({ action: 'Export Vault', actor: firstName(), target: selected.name })];
  return h('section', { className: 'panel glass enterprise-panel team-vaults', id: 'team-vaults' },
    h('div', { className: 'panel-head' }, h('div', null, h('p', { className: 'eyebrow' }, 'Organization Mode'), h('h2', null, 'Enterprise recovery workspaces')), h('span', null, `${state.organizations.length} orgs`)),
    h('div', { className: 'enterprise-switcher' }, state.organizations.map((org) => h('button', { key: org.id || org.name, className: (org.id || org.name) === state.selectedOrganizationId ? 'active' : '', onClick: () => setState({ selectedOrganizationId: org.id || org.name }) }, h('strong', null, org.name), h('small', null, `${org.role || 'Owner'} · ${org.members || 1} members`)))),
    h('div', { className: 'enterprise-grid compact' }, [['Members', selected.members || 1], ['Roles', orgRoles.join(' · ')], ['Devices', selected.devices || safeArray(state.devices).length || 1], ['Accounts', selected.accounts || state.accounts.length], ['Audit Logs', selected.auditLogs || auditRows.length], ['Recovery Policies', selected.recoveryPolicies || 7], ['Security Score', `${selected.securityScore || averageScore()}%`]].map(([label, value]) => h('article', { key: label }, h('span', null, label), h('strong', null, value)))),
    h('form', { className: 'enterprise-form', onSubmit: createOrganization }, h('input', { name: 'organization', placeholder: 'Organization or family name', required: true }), h('select', { value: state.selectedOrgRole, onChange: (event) => setState({ selectedOrgRole: event.target.value }) }, orgRoles.map((role) => h('option', { key: role }, role))), h('button', { className: 'primary' }, 'Create organization')),
    h('form', { className: 'enterprise-form', onSubmit: inviteOrganizationMember }, h('input', { name: 'inviteEmail', type: 'email', placeholder: 'Invite member by email', value: state.inviteEmail, onChange: (event) => setState({ inviteEmail: event.target.value }) }), h('button', null, `Invite as ${state.selectedOrgRole}`)),
    h('div', { className: 'enterprise-split' },
      h('article', { className: 'enterprise-card' }, h('h3', null, 'Pending invitations'), (state.enterpriseInvitations.length ? state.enterpriseInvitations : [createInvitation({ email: 'security.lead@example.com', role: 'Admin', organizationId: selected.id || 'demo', inviter: firstName() })]).slice(0, 4).map((invite) => h('div', { key: invite.id, className: 'invitation-row' }, h('div', null, h('strong', null, invite.email), h('small', null, `${invite.role} · expires ${new Date(invite.expiresAt).toLocaleDateString()}`)), h('span', null, invite.status), h('button', { onClick: () => successToast('Invitation accepted') }, 'Accept'), h('button', { onClick: () => successToast('Invitation declined') }, 'Decline')))),
      h('article', { className: 'enterprise-card' }, h('h3', null, 'Security policies'), policyRows.map(([label, value]) => h('div', { key: label, className: 'policy-row' }, h('span', null, label), h('strong', null, value))))),
    h('div', { className: 'enterprise-split' },
      h('article', { className: 'enterprise-card' }, h('div', { className: 'panel-head compact' }, h('h3', null, 'Approval workflows'), h('button', { onClick: () => createEnterpriseApproval('Export Vault', selected.name) }, 'Request approval')), approvals.slice(0, 4).map((approval) => h('div', { key: approval.id, className: `approval-row ${approval.status.toLowerCase()}` }, h('div', null, h('strong', null, approval.action), h('small', null, `${approval.target || selected.name} · ${approval.category}`)), h('span', null, approval.status), h('button', { onClick: () => resolveEnterpriseApproval(approval.id, 'Approved') }, 'Approve'), h('button', { onClick: () => resolveEnterpriseApproval(approval.id, 'Rejected') }, 'Reject')))),
      h('article', { className: 'enterprise-card' }, h('h3', null, 'Advanced audit log'), auditRows.map((event) => h('div', { key: event.id, className: `audit-row severity-${String(event.severity).toLowerCase()}` }, h('span', null, event.severity), h('div', null, h('strong', null, event.action), h('small', null, `${event.category} · ${event.actor} · ${new Date(event.timestamp).toLocaleString()}`), h('p', null, event.description))))))
  );
}
function PasswordHealthCenter() {
  const checks = [['Weak passwords', weakAccounts().length], ['Reused passwords', duplicatedRecoveryEmails()], ['Old passwords', safeAccounts().filter((account) => Date.parse(account.lastReviewed || '') < Date.now() - 180 * 86400000).length], ['Missing MFA', state.accounts.filter((account) => !account.authenticator || account.authenticator === 'SMS only').length], ['Missing recovery email', state.accounts.filter((account) => !account.recoveryEmail).length], ['Missing phone', state.accounts.filter((account) => !account.recoveryPhone).length], ['Missing backup codes', state.accounts.filter((account) => !account.backupCodes).length]];
  return h('section', { className: 'panel glass enterprise-panel password-health-center', id: 'password-health' }, h('p', { className: 'eyebrow' }, 'Password Health Center'), h('h2', null, `${passwordHealthScore()}% overall password health`), h('div', { className: 'enterprise-meter' }, h('span', { style: { width: `${passwordHealthScore()}%` } })), h('div', { className: 'enterprise-grid' }, checks.map(([label, count]) => h('article', { key: label }, h('strong', null, count), h('span', null, label), h('small', null, count ? 'Action recommended' : 'Clear')))));
}
function DarkWebMonitor() {
  const rows = [['Email exposure', state.accounts.filter((account) => account.status === 'Review').length ? 'Exposure signal found' : 'No exposure in beta scan'], ['Password breach history', `${weakAccounts().length} accounts need rotation review`], ['Security alerts', `${notificationItems().length} monitored alert categories`]];
  return h('section', { className: 'panel glass enterprise-panel dark-web-monitor', id: 'dark-web-monitor' }, h('p', { className: 'eyebrow' }, 'Dark Web Monitor · Demo Safe'), h('h2', null, 'Exposure intelligence without production APIs'), h('div', { className: 'enterprise-grid' }, rows.map(([label, detail]) => h('article', { key: label }, h('strong', null, label), h('p', null, detail), h('small', null, 'Mock data until breach APIs are connected')))), h('button', { className: 'primary', onClick: () => { logSecurityEvent('Dark web beta scan completed'); toast('Exposure scan complete'); } }, 'Run demo scan'));
}
function EnterpriseSecurityTimeline() {
  const rows = ['Password changes', 'MFA enabled', 'Recovery updates', 'New devices', 'Logins', 'Vault exports', 'Security alerts'];
  return h('section', { className: 'panel glass enterprise-panel enterprise-timeline', id: 'enterprise-timeline' }, h('p', { className: 'eyebrow' }, 'Security Timeline'), h('h2', null, 'Every important recovery event in one line'), h('div', { className: 'security-rail' }, rows.map((row, index) => h('article', { key: row, style: { '--delay': `${index * 55}ms` } }, h('span', null, index + 1), h('div', null, h('strong', null, row), h('small', null, `${index + 1} demo events tracked`))))));
}
function ReferralGrowthDashboard() {
  const code = state.waitlistReferral || referralLink('SS-BETA');
  const leaders = ['Alicia · 14 invites', 'Priya · 9 invites', 'Marcus · 7 invites'];
  return h('section', { className: 'panel glass enterprise-panel referral-growth', id: 'referrals' }, h('p', { className: 'eyebrow' }, 'Viral Referral System'), h('h2', null, 'Invite rewards and premium credits'), h('code', null, code), h('div', { className: 'enterprise-grid' }, [['Referral leaderboard', leaders.join(' · ')], ['Invite rewards', '1 month Pro credit at 5 successful invites'], ['Premium credits', '$10 demo credit ready'], ['Referral links', 'Generated from waitlist and beta codes']].map(([label, value]) => h('article', { key: label }, h('strong', null, label), h('p', null, value)))));
}
function AchievementsPanel() {
  const badges = [['Security Champion', averageScore() >= 85], ['100 Recovery Score', averageScore() === 100], ['Vault Exported', Boolean(state.exportStatus)], ['7-day Streak', true], ['Recovery Milestone', state.accounts.length >= 5]];
  return h('section', { className: 'panel glass enterprise-panel achievements-panel', id: 'achievements' }, h('p', { className: 'eyebrow' }, 'Achievements'), h('h2', null, 'Gamified security progress'), h('div', { className: 'badge-grid' }, badges.map(([badge, unlocked]) => h('article', { key: badge, className: unlocked ? 'unlocked' : 'locked' }, h('span', null, unlocked ? '✓' : '○'), h('strong', null, badge), h('small', null, unlocked ? 'Unlocked' : 'Keep improving')))));
}
function LiveStatusPage() {
  const statuses = [['Firebase', state.firebaseReady], ['API', true], ['AI', true], ['Storage', state.vaultUnlocked], ['Authentication', Boolean(state.auth)], ['Backups', state.emergencyKits.length > 0 || !usingLiveAccounts()], ['Notifications', notificationItems().length > 0], ['Demo Mode', !usingLiveAccounts()]];
  return h('section', { className: 'panel glass enterprise-panel live-status-page', id: 'live-status' }, h('p', { className: 'eyebrow' }, 'Live Status Page'), h('h2', null, 'Operational readiness indicators'), h('div', { className: 'status-grid' }, statuses.map(([label, ok]) => h('article', { key: label, className: ok ? 'online' : 'degraded' }, h('i'), h('strong', null, label), h('span', null, ok ? 'Operational' : 'Needs setup')))));
}
function DataVisualizationStudio() {
  const labels = ['Recovery Score', 'Password Health', 'Security Events', 'Vault Activity', 'Weekly Progress', 'Monthly Progress'];
  return h('section', { className: 'panel glass enterprise-panel data-viz-studio', id: 'data-visualization' }, h('p', { className: 'eyebrow' }, 'Beautiful Data Visualization'), h('h2', null, 'Interactive security intelligence charts'), h('div', { className: 'viz-bars' }, chartValues().map((value, index) => h('article', { key: labels[index] }, h('span', { style: { height: `${value}%` } }), h('strong', null, `${value}%`), h('small', null, labels[index])))));
}
function ProductTourPanel() {
  const steps = ['Start with Recovery Score', 'Open AI Coach', 'Create a shared vault', 'Check password health', 'Export an emergency kit'];
  return h('section', { className: 'panel glass enterprise-panel product-tour', id: 'product-tour' }, h('p', { className: 'eyebrow' }, 'Onboarding Improvements'), h('h2', null, 'Interactive tour, tooltips, discovery, and shortcuts'), h('div', { className: 'tour-card' }, h('strong', null, steps[state.productTourStep]), h('p', null, 'Tip: press / to search everything, then jump directly to accounts, settings, reports, and recovery workflows.')), h('button', { className: 'primary', onClick: () => setState({ productTourStep: (state.productTourStep + 1) % steps.length }) }, 'Next tour step'));
}
function copilotWorkspaceContext() {
  const score = explainableSecurityScore(state.accounts);
  const timeline = buildSecurityTimeline({ accounts: state.accounts, activity: state.activityFeed, notifications: notificationItems(), auditEvents: state.auditEvents, devices: state.devices });
  const recommendations = generateSecurityRecommendations(state.accounts, state.devices);
  const metrics = executiveSecurityMetrics(state.accounts, state.devices);
  const insights = dailySecurityInsights(state.accounts, state.devices);
  const riskyAccounts = score.analyses.slice().sort((a, b) => a.score - b.score).slice(0, 5);
  const riskyDevices = state.devices.filter((device) => !device.trusted).slice(0, 5);
  const criticalNotifications = notificationItems().filter((item) => /critical|warning|review|risk/i.test(`${item.severity || ''} ${item.title || ''} ${item.detail || ''}`)).slice(0, 5);
  const promptCandidates = [
    state.accounts.some((account) => scoreFor(account) < 80) && 'Review my weakest accounts',
    state.accounts.some((account) => !account.authenticator || /sms only/i.test(account.authenticator)) && 'Show missing MFA',
    state.devices.some((device) => !device.trusted) && 'Find risky devices',
    state.accounts.some((account) => !account.recoveryEmail || !account.recoveryPhone || !account.backupCodes) && 'Recovery readiness',
    timeline.length > 0 && 'Latest audit activity',
    recommendations.length > 0 && 'Accounts needing attention',
    score.deductions.length > 0 && 'Security score explanation'
  ].filter(Boolean);
  return { score, timeline, recommendations, metrics, insights, riskyAccounts, riskyDevices, criticalNotifications, prompts: promptCandidates.length ? promptCandidates : ['Security score explanation'] };
}

function AIRecoveryCoachPage() {
  const context = copilotWorkspaceContext();
  const answerContext = { accounts: state.accounts, devices: state.devices, activity: state.activityFeed, notifications: notificationItems(), auditEvents: state.auditEvents };
  const activeQuestion = state.aiCopilotQuestion || context.prompts[0];
  const answer = state.aiCopilotAnswer || answerSecurityQuestion(activeQuestion, answerContext);
  const ask = (question = activeQuestion) => setState({ aiCopilotQuestion: question, aiCopilotAnswer: answerSecurityQuestion(question, answerContext) });
  const citations = [
    `${safeAccounts().length} accounts`,
    `${context.recommendations.length} recommendations`,
    `${context.timeline.length} security events`,
    `${notificationItems().length} notifications`
  ];
  return h('section', { className: 'panel glass premium-page ai-recovery-coach-page ai-copilot-workspace', id: 'ai-recovery-coach' },
    h('header', { className: 'copilot-workspace-header' },
      h('div', null, h('p', { className: 'eyebrow' }, 'AI Copilot Workspace'), h('h2', null, 'Security intelligence command center'), h('small', null, 'Deterministic guidance generated from your SecureSwitch accounts, recovery posture, devices, audit events, and notifications.')),
      h('div', { className: 'copilot-header-actions' }, h('input', { value: state.aiCopilotQuestion, onChange: (event) => setState({ aiCopilotQuestion: event.target.value }), placeholder: 'Search or ask SecureSwitch…', 'aria-label': 'Search AI Copilot workspace' }), h('button', { className: 'secondary', onClick: () => ask(activeQuestion) }, 'New Conversation'), h('button', { className: 'ghost' }, state.userProfile?.displayName || state.user?.email || 'Workspace'))
    ),
    h('div', { className: 'copilot-workspace-grid' },
      h('aside', { className: 'copilot-rail copilot-left-rail', 'aria-label': 'AI Copilot navigation' },
        h('section', null, h('strong', null, 'Conversation History'), h('button', { className: 'active', onClick: () => ask(activeQuestion) }, h('span', null, activeQuestion), h('small', null, `${context.score.score}% score · ${context.recommendations.length} actions`))),
        h('section', null, h('strong', null, 'Pinned Conversations'), context.prompts.slice(0, 3).map((prompt) => h('button', { key: prompt, onClick: () => ask(prompt) }, h('span', null, prompt), h('small', null, 'SecureSwitch context')))),
        h('section', null, h('strong', null, 'Suggested Prompts'), context.prompts.map((prompt) => h('button', { key: `suggested-${prompt}`, onClick: () => ask(prompt) }, h('span', null, prompt), h('small', null, 'Generated from current data')))),
        h('section', null, h('strong', null, 'Saved Workflows'), context.recommendations.slice(0, 3).map((item) => h('button', { key: `${item.accountName}-${item.recommendedAction}`, onClick: () => ask(`What should I fix first?`) }, h('span', null, item.recommendedAction), h('small', null, item.accountName)))),
        h('section', null, h('strong', null, 'Recent Actions'), context.timeline.slice(0, 4).map((event) => h('button', { key: `${event.type}-${event.title}-${event.at}` }, h('span', null, event.title), h('small', null, event.type)))),
        h('section', null, h('strong', null, 'Quick Categories'), ['Accounts', 'Recovery', 'Devices', 'Audit', 'Notifications'].map((item) => h('button', { key: item, onClick: () => ask(item === 'Audit' ? 'Latest audit activity' : item === 'Devices' ? 'Find risky devices' : item === 'Recovery' ? 'Recovery readiness' : 'Accounts needing attention') }, h('span', null, item), h('small', null, 'Open context'))))
      ),
      h('main', { className: 'copilot-conversation' },
        h('div', { className: 'copilot-prompt-card' },
          h('label', null, 'Ask SecureSwitch Copilot'),
          h('form', { onSubmit: (event) => { event.preventDefault(); ask(activeQuestion); } }, h('input', { value: state.aiCopilotQuestion, onChange: (event) => setState({ aiCopilotQuestion: event.target.value }), placeholder: 'Ask which account to fix first…', 'aria-label': 'Ask SecureSwitch Copilot' }), h('button', { className: 'primary' }, 'Ask')),
          h('div', { className: 'copilot-action-chips' }, context.prompts.map((prompt) => h('button', { key: prompt, onClick: () => ask(prompt) }, prompt)))
        ),
        h('article', { className: 'copilot-message user-message' }, h('span', null, 'You'), h('p', null, activeQuestion)),
        h('article', { className: 'copilot-message assistant-message' }, h('span', null, 'SecureSwitch Copilot'), h('pre', null, answer), h('div', { className: 'copilot-citations' }, citations.map((item) => h('small', { key: item }, item)))),
        h('section', { className: 'copilot-recommendation-sections' },
          h('details', { open: true }, h('summary', null, 'Expandable Recommendations', h('b', null, context.recommendations.length)), h('div', null, context.recommendations.slice(0, 6).map((item) => h('article', { key: `${item.accountName}-${item.reason}`, className: `priority-${item.severity.toLowerCase()}` }, h('b', null, item.severity), h('strong', null, item.accountName), h('p', null, item.reason), h('small', null, `${item.recommendedAction} · +${item.estimatedImprovement} estimated improvement`))))),
          h('details', null, h('summary', null, 'Conversation Timeline', h('b', null, context.timeline.length)), h('div', null, context.timeline.slice(0, 8).map((event) => h('article', { key: `${event.type}-${event.title}-${event.at}` }, h('b', null, event.type), h('strong', null, event.title), h('small', null, `${event.detail} · ${formatDate(event.at)}`)))))
        )
      ),
      h('aside', { className: 'copilot-rail copilot-right-panel', 'aria-label': 'AI Copilot SecureSwitch context' },
        h('section', null, h('strong', null, 'Security Summary'), h('div', { className: 'copilot-score-mini' }, h('b', null, `${context.score.score}%`), h('span', null, context.metrics.securityTrend)), h('small', null, `${context.metrics.accountsProtected}/${context.metrics.totalAccounts} accounts protected`)),
        h('section', null, h('strong', null, 'Highest Risk Accounts'), context.riskyAccounts.map((item) => h('article', { key: item.accountName }, h('span', null, item.accountName), h('b', null, item.risk), h('small', null, `${item.score}% · ${item.recommendedAction}`)))),
        h('section', null, h('strong', null, 'Recovery Readiness'), h('small', null, `${context.metrics.recoveryCoverage}% recovery coverage · ${context.metrics.passkeyAdoption}% passkey adoption`), h('div', { className: 'copilot-progress' }, h('span', { style: { width: `${context.metrics.recoveryCoverage}%` } }))),
        h('section', null, h('strong', null, 'Recent Audit Events'), context.timeline.slice(0, 4).map((event) => h('article', { key: `${event.at}-${event.title}` }, h('span', null, event.title), h('small', null, event.type)))),
        h('section', null, h('strong', null, 'Devices Requiring Review'), context.riskyDevices.length ? context.riskyDevices.map((device) => h('article', { key: device.id || device.name || device.browser }, h('span', null, device.name || device.browser), h('small', null, `${device.os || 'Unknown OS'} · ${device.location || 'Unknown location'}`))) : h('small', null, 'No risky devices are currently flagged.')),
        h('section', null, h('strong', null, 'Critical Notifications'), context.criticalNotifications.length ? context.criticalNotifications.map((item) => h('article', { key: item.id || item.title }, h('span', null, item.title), h('small', null, item.detail || item.category || 'Notification'))) : h('small', null, 'No critical notifications are currently flagged.')),
        h('section', null, h('strong', null, 'AI Suggested Next Steps'), context.insights.slice(0, 3).map((insight) => h('small', { key: insight }, insight)))
      )
    )
  );
}
function PricingPage() {
  const plans = [['FREE', '$0', ['10 accounts', 'Basic monitoring', 'Security Score']], ['PRO', '$9.99/month', ['Unlimited accounts', 'AI Assistant', 'Recovery Center']], ['FAMILY', '$19.99/month', ['Up to 6 users', 'Shared dashboard', 'Recovery alerts']], ['ENTERPRISE', 'Contact sales', ['Admin dashboard', 'Compliance reports', 'Advanced analytics']]];
  return h('section', { className: 'panel glass premium-page pricing-page', id: 'pricing' }, h('p', { className: 'eyebrow' }, 'Premium Subscriptions'), h('h2', null, 'Plans built for recovery readiness'), h('div', { className: 'pricing-grid' }, plans.map(([name, price, features]) => h('article', { key: name, className: name === 'PRO' ? 'featured-plan' : '' }, h('h3', null, name), h('strong', null, price), h('ul', null, features.map((feature) => h('li', { key: feature }, feature))), h('button', { className: 'primary', onClick: () => toast('Stripe is isolated and not connected yet') }, name === 'FREE' ? 'Current demo' : 'Upgrade')))));
}
function notificationSeverity(item) {
  const text = `${item.severity || ''} ${item.title || ''} ${item.detail || ''}`;
  if (/critical|breach|unknown|suspicious|high/i.test(text)) return 'Critical';
  if (/old|missing|alert|review|warning|risk/i.test(text)) return 'Warning';
  return 'Info';
}
function notificationCategory(item) {
  const text = `${item.title || ''} ${item.detail || ''}`.toLowerCase();
  if (/recover|backup|vault|code/.test(text)) return 'Recovery';
  if (/device|login|session/.test(text)) return 'Devices';
  if (/account|password|mfa|passkey/.test(text)) return 'Accounts';
  if (/ai|copilot|recommendation/.test(text)) return 'AI Copilot';
  if (/audit|scan|score|security/.test(text)) return 'Audit';
  return 'Information';
}
function notificationTimestamp(item, index) { return item.createdAt || item.updatedAt || item.timestamp || item.date || ''; }
function notificationSource(item) { return item.source || item.category || notificationCategory(item); }
function notificationRelatedAccount(item) {
  const text = `${item.title || ''} ${item.detail || ''}`.toLowerCase();
  return state.accounts.find((account) => text.includes(account.name.toLowerCase()) || (account.handle && text.includes(String(account.handle).toLowerCase())));
}
function notificationRelatedDevice(item) {
  const text = `${item.title || ''} ${item.detail || ''}`.toLowerCase();
  return state.devices.find((device) => text.includes(String(device.name || '').toLowerCase()) || text.includes(String(device.browser || '').toLowerCase()));
}
function enrichedNotifications() {
  return notificationItems().map((item, index) => {
    const severity = notificationSeverity(item);
    const category = notificationCategory(item);
    const account = notificationRelatedAccount(item);
    const device = notificationRelatedDevice(item);
    const timestamp = notificationTimestamp(item, index);
    const status = safeArray(state.notificationsRead).includes(item.id) ? 'Resolved' : 'Unread';
    const recommendation = generateSecurityRecommendations(state.accounts, state.devices).find((rec) => account && rec.accountName === account.name);
    return { ...item, severity, category, account, device, timestamp, source: notificationSource(item), status, pinned: state.pinnedNotifications.includes(item.id), archived: state.archivedNotifications.includes(item.id), recommendedAction: recommendation?.recommendedAction || (category === 'Recovery' ? 'Open Recovery Vault' : category === 'Devices' ? 'Review Devices' : category === 'Accounts' ? 'Open Account' : 'Review Signal'), icon: severity === 'Critical' ? '!' : severity === 'Warning' ? '⚠' : '✓' };
  });
}
function notificationGroup(timestamp) {
  if (!timestamp) return 'Earlier';
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return 'Earlier';
  const now = new Date();
  const age = Math.floor((now - date) / 86400000);
  if (age <= 0) return 'Today';
  if (age === 1) return 'Yesterday';
  if (age <= 7) return 'Last 7 Days';
  return 'Earlier';
}
function groupedNotifications(items) { return items.reduce((groups, item) => { (groups[notificationGroup(item.timestamp)] ||= []).push(item); return groups; }, {}); }
function notificationMatchesCategory(item, category) {
  if (category === 'All Activity') return true;
  if (category === 'Critical') return item.severity === 'Critical';
  if (category === 'Warnings') return item.severity === 'Warning';
  if (category === 'Unread') return item.status === 'Unread';
  if (category === 'Pinned') return item.pinned;
  if (category === 'Archived') return item.archived;
  return item.category === category;
}
function toggleNotificationPinned(item) {
  const pinned = state.pinnedNotifications.includes(item.id) ? state.pinnedNotifications.filter((id) => id !== item.id) : [item.id].concat(state.pinnedNotifications);
  setState({ pinnedNotifications: pinned });
}
function archiveNotificationLocal(item) {
  setState({ archivedNotifications: Array.from(new Set(state.archivedNotifications.concat(item.id))), notificationsRead: Array.from(new Set(state.notificationsRead.concat(item.id))) });
}
function dismissNotificationLocal(item) { setState({ archivedNotifications: Array.from(new Set(state.archivedNotifications.concat(item.id))) }); }
function NotificationCenterPage() {
  const query = state.notificationSearch.toLowerCase();
  const categories = ['All Activity', 'Critical', 'Warnings', 'Information', 'Recovery', 'Devices', 'Accounts', 'AI Copilot', 'Audit', 'Archived', 'Unread', 'Pinned'];
  const allItems = enrichedNotifications();
  const filtered = allItems
    .filter((item) => notificationMatchesCategory(item, state.notificationCategory || 'All Activity'))
    .filter((item) => state.notificationFilter === 'All' || item.severity === state.notificationFilter || item.status === state.notificationFilter)
    .filter((item) => state.notificationDateFilter === 'All' || notificationGroup(item.timestamp) === state.notificationDateFilter)
    .filter((item) => !state.notificationUnreadOnly || item.status === 'Unread')
    .filter((item) => !state.notificationPinnedOnly || item.pinned)
    .filter((item) => `${item.title} ${item.detail} ${item.category} ${item.source} ${item.account?.name || ''} ${item.device?.name || ''}`.toLowerCase().includes(query))
    .sort((a, b) => state.notificationSort === 'Oldest' ? String(a.timestamp || '').localeCompare(String(b.timestamp || '')) : String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
  const visible = filtered.slice(0, 80);
  const selected = allItems.find((item) => item.id === state.selectedNotificationId) || visible[0] || allItems[0];
  const selectedIndex = Math.max(0, visible.findIndex((item) => item.id === selected?.id));
  const inboxKeyDown = (event) => {
    if (event.key === 'ArrowDown' && visible.length) { event.preventDefault(); setState({ selectedNotificationId: visible[Math.min(selectedIndex + 1, visible.length - 1)].id }); }
    if (event.key === 'ArrowUp' && visible.length) { event.preventDefault(); setState({ selectedNotificationId: visible[Math.max(selectedIndex - 1, 0)].id }); }
    if (event.key === 'Enter' && selected) { event.preventDefault(); markNotificationRead(selected); }
    if (event.key === 'Escape') { event.preventDefault(); setState({ notificationSearch: '', notificationCategory: 'All Activity', notificationUnreadOnly: false, notificationPinnedOnly: false }); }
  };
  const relatedRecommendations = selected ? generateSecurityRecommendations(state.accounts, state.devices).filter((item) => !selected.account || item.accountName === selected.account.name).slice(0, 4) : [];
  const relatedTimeline = selected ? buildSecurityTimeline({ accounts: selected.account ? [selected.account] : state.accounts, activity: state.activityFeed, notifications: [selected], auditEvents: state.auditEvents, devices: selected.device ? [selected.device] : state.devices }).slice(0, 5) : [];
  return h('section', { className: 'panel glass premium-page notification-center-page intelligence-inbox', id: 'notifications' },
    h('header', { className: 'notification-intel-head' }, h('div', null, h('p', { className: 'eyebrow' }, 'Security Intelligence Inbox'), h('h2', null, 'Notifications that explain what changed'), h('small', null, `${allItems.length} signals · ${unreadNotifications().length} unread · ${state.pinnedNotifications.length} pinned`)), h('button', { className: 'primary', onClick: () => allItems.forEach(markNotificationRead) }, 'Mark all read')),
    h('div', { className: 'notification-intel-layout' },
      h('aside', { className: 'notification-category-rail', 'aria-label': 'Notification categories' }, categories.map((category) => h('button', { key: category, className: (state.notificationCategory || 'All Activity') === category ? 'active' : '', onClick: () => setState({ notificationCategory: category }) }, h('span', null, category), h('small', null, allItems.filter((item) => notificationMatchesCategory(item, category)).length)))),
      h('main', { className: 'notification-inbox-panel', onKeyDown: inboxKeyDown, tabIndex: 0 },
        h('div', { className: 'notification-toolbar' },
          h('input', { value: state.notificationSearch, onChange: (event) => setState({ notificationSearch: event.target.value }), placeholder: 'Search notifications, accounts, devices…', 'aria-label': 'Search notifications' }),
          h('select', { value: state.notificationFilter, onChange: (event) => setState({ notificationFilter: event.target.value }) }, ['All', 'Critical', 'Warning', 'Info', 'Resolved', 'Unread'].map((filter) => h('option', { key: filter }, filter))),
          h('select', { value: state.notificationCategory || 'All Activity', onChange: (event) => setState({ notificationCategory: event.target.value }) }, categories.map((category) => h('option', { key: category }, category))),
          h('select', { value: state.notificationDateFilter || 'All', onChange: (event) => setState({ notificationDateFilter: event.target.value }) }, ['All', 'Today', 'Yesterday', 'Last 7 Days', 'Earlier'].map((filter) => h('option', { key: filter }, filter))),
          h('button', { className: state.notificationUnreadOnly ? 'active-filter' : '', onClick: () => setState({ notificationUnreadOnly: !state.notificationUnreadOnly }) }, 'Unread'),
          h('button', { className: state.notificationPinnedOnly ? 'active-filter' : '', onClick: () => setState({ notificationPinnedOnly: !state.notificationPinnedOnly }) }, 'Pinned'),
          h('select', { value: state.notificationSort || 'Newest', onChange: (event) => setState({ notificationSort: event.target.value }) }, ['Newest', 'Oldest'].map((item) => h('option', { key: item }, item))),
          h('button', { onClick: () => setState({ notificationDensity: state.notificationDensity === 'compact' ? 'comfortable' : 'compact' }) }, state.notificationDensity === 'compact' ? 'Compact' : 'Comfortable')
        ),
        visible.length ? h('div', { className: `notification-feed density-${state.notificationDensity || 'compact'}` }, Object.entries(groupedNotifications(visible)).map(([group, items]) => h('section', { key: group }, h('div', { className: 'notification-group-title' }, h('span', null, group), h('small', null, items.length)), items.map((item) => h('article', { key: item.id, className: `notification-intel-row severity-${item.severity.toLowerCase()} ${selected?.id === item.id ? 'selected' : ''}`, onClick: () => setState({ selectedNotificationId: item.id }), tabIndex: 0 }, h('span', { className: 'notification-intel-icon' }, item.icon), h('div', { className: 'notification-intel-copy' }, h('div', null, h('b', null, item.severity), h('strong', null, highlightMatch(item.title, query)), h('small', null, item.timestamp ? formatDate(item.timestamp) : 'No timestamp')), h('p', null, highlightMatch(item.detail, query)), h('footer', null, h('span', null, item.source), item.account && h('span', null, item.account.name), item.device && h('span', null, item.device.name), h('span', null, item.status), h('span', null, item.recommendedAction))), h('div', { className: 'notification-quick-actions' }, h('button', { onClick: (event) => { event.stopPropagation(); markNotificationRead(item); } }, 'Mark Read'), h('button', { onClick: (event) => { event.stopPropagation(); toggleNotificationPinned(item); } }, item.pinned ? 'Unpin' : 'Pin'), h('button', { onClick: (event) => { event.stopPropagation(); archiveNotificationLocal(item); } }, 'Archive'))))))) : h(EmptyState, { icon: '✓', title: 'No notifications found', description: 'Your filters are clear. SecureSwitch will surface existing account recovery and security signals here.', action: 'Clear filters', onAction: () => setState({ notificationSearch: '', notificationFilter: 'All', notificationCategory: 'All Activity', notificationDateFilter: 'All', notificationUnreadOnly: false, notificationPinnedOnly: false }) })
      ),
      h('aside', { className: 'notification-context-panel' }, selected ? [
        h('section', { key: 'details' }, h('p', { className: 'eyebrow' }, selected.severity), h('h3', null, selected.title), h('p', null, selected.detail), h('div', { className: 'context-action-row' }, h('button', { onClick: () => markNotificationRead(selected) }, 'Mark Read'), h('button', { onClick: () => toggleNotificationPinned(selected) }, selected.pinned ? 'Unpin' : 'Pin'), h('button', { onClick: () => archiveNotificationLocal(selected) }, 'Archive'), h('button', { onClick: () => navigator.clipboard?.writeText(`${selected.title}: ${selected.detail}`) }, 'Copy Details'))),
        h('section', { key: 'related' }, h('strong', null, 'Related Context'), h('article', null, h('span', null, 'Account'), h('small', null, selected.account?.name || 'No related account')), h('article', null, h('span', null, 'Device'), h('small', null, selected.device?.name || selected.device?.browser || 'No related device')), h('article', null, h('span', null, 'Recovery'), h('small', null, selected.account ? `${scoreFor(selected.account)}% ready` : `${averageScore()}% workspace readiness`))),
        h('section', { key: 'timeline' }, h('strong', null, 'Timeline'), relatedTimeline.map((event) => h('article', { key: `${event.type}-${event.title}-${event.at}` }, h('span', null, event.title), h('small', null, `${event.type} · ${event.at ? formatDate(event.at) : 'No timestamp'}`)))),
        h('section', { key: 'recommendations' }, h('strong', null, 'Security Recommendations'), (relatedRecommendations.length ? relatedRecommendations : generateSecurityRecommendations(state.accounts, state.devices).slice(0, 3)).map((item) => h('article', { key: `${item.accountName}-${item.reason}` }, h('span', null, item.accountName), h('small', null, `${item.reason} · ${item.recommendedAction}`)))),
        h('section', { key: 'ai' }, h('strong', null, 'AI Explanation'), h('p', null, answerSecurityQuestion('Explain why my score is low.', { accounts: selected.account ? [selected.account] : state.accounts, devices: selected.device ? [selected.device] : state.devices })), h('button', { onClick: () => { setState({ aiCopilotQuestion: selected.title }); location.hash = 'ai-recovery-coach'; } }, 'Open AI Copilot'))
      ] : h(EmptyState, { icon: '✓', title: 'No signal selected', description: 'Select an existing notification to inspect its related account, device, recovery, audit, and recommendation context.' }))
    )
  );
}
function SmartRecommendationsPanel() {
  const recs = prioritizedRecommendations();
  return h('section', { className: 'panel glass premium-page smart-recommendations-panel', id: 'smart-recommendations' }, h('p', { className: 'eyebrow' }, 'Smart Recommendations'), h('h2', null, 'Highest-impact fixes first'), h('div', { className: 'recommendation-stack' }, (recs.length ? recs : [{ title: 'Export Recovery Kit', impact: 8, detail: 'Export your recovery kit for offline readiness.' }]).map((item) => h('article', { key: item.title }, h('b', null, `Impact ${item.impact}`), h('strong', null, item.title), h('small', null, item.detail)))));
}
function ExportCenterPage() {
  const exports = [['Recovery Report PDF', 'recovery'], ['Security Report PDF', 'security'], ['Emergency Contact Sheet', 'contacts'], ['Recovery Checklist', 'checklist'], ['Encrypted Backup Export', 'encrypted']];
  return h('section', { className: 'panel glass premium-page export-center-page', id: 'exports' }, h('p', { className: 'eyebrow' }, 'Exports'), h('h2', null, 'Generate recovery artifacts'), h('div', { className: 'export-grid' }, exports.map(([label, kind]) => h('button', { key: kind, onClick: () => exportReport(kind) }, label))));
}
function AdminPanel() {
  return h('section', { className: 'panel glass premium-page hidden-admin-panel', id: 'admin-panel' }, h('div', { className: 'panel-head' }, h('div', null, h('p', { className: 'eyebrow' }, 'Hidden Admin'), h('h2', null, 'Demo analytics and feature flags')), h('button', { onClick: () => setState({ adminVisible: !state.adminVisible }) }, state.adminVisible ? 'Hide' : 'Reveal')), state.adminVisible && h('div', { className: 'premium-metric-grid' }, [['Beta analytics', `${safeAccounts().length} accounts`], ['User counts', state.user ? '1 active user' : '0 live users'], ['Subscription counts', 'Payments disabled'], ['Recovery statistics', `${averageScore()}% avg score`], ['Feature flags', 'AI coach, exports, pricing'], ['Application version', buildVersion()]].map(([label, value]) => h('article', { key: label }, h('span', null, label), h('strong', null, value)))));
}
function AccountHealthPage() {
  const summary = dashboardSummary(state.accounts);
  const primary = summary.scored[0] || normalizeAccount({ name: 'No account selected', category: 'Custom' });
  const grade = averageScore() >= 90 ? 'A' : averageScore() >= 80 ? 'B' : averageScore() >= 67 ? 'C' : 'D';
  const metrics = [
    ['Password Strength', primary.passkeyStatus ? 'Strong' : 'Needs review'],
    ['Recovery Strength', `${scoreFor(primary)}%`],
    ['Authentication Status', primary.authenticator || primary.passkeyStatus || 'Missing MFA'],
    ['Last Backup', primary.backupCodes ? 'Backup codes saved' : 'No backup codes'],
    ['Recovery Kit', state.emergencyKits.length ? 'Ready' : 'Not built'],
    ['Risk Level', riskLevel(primary)],
    ['Overall Grade', grade]
  ];
  return h('section', { className: 'panel glass premium-page account-health-page', id: 'account-health' }, h('p', { className: 'eyebrow' }, 'Account Health'), h('h2', null, 'Account protection command center'), h('div', { className: 'premium-metric-grid' }, metrics.map(([label, value]) => h('article', { key: label }, h('span', null, label), h('strong', null, value)))));
}
function SecurityCenterPage() {
  const alerts = state.securityAlerts.length ? state.securityAlerts : issueList().map((issue) => ({ title: issue.title, severity: issue.severity, status: issue.fix }));
  const rows = [
    ['Recent Alerts', alerts.length],
    ['Suspicious Changes', oldPhoneAccounts().length],
    ['Weak Accounts', weakAccounts().length],
    ['Password Age', `${safeAccounts().filter((account) => Date.parse(account.lastReviewed || '') < Date.now() - 180 * 86400000).length} old`],
    ['Recovery Issues', issueList().length],
    ['Recommended Actions', dashboardSummary(state.accounts).suggestedNextFixes.length || 1],
    ['Security Timeline', state.recoveryTimeline.length]
  ];
  return h('section', { className: 'panel glass premium-page security-center-page', id: 'security-center' }, h('p', { className: 'eyebrow' }, 'Security Center'), h('h2', null, 'Threats, changes, and recommended actions'), h('div', { className: 'premium-metric-grid' }, rows.map(([label, value]) => h('article', { key: label }, h('span', null, label), h('strong', null, value)))), h('div', { className: 'security-alert-stack' }, alerts.slice(0, 4).map((alert) => h('article', { key: alert.title }, h('b', null, alert.severity || 'Info'), h('span', null, alert.title), h('small', null, alert.status || 'Review')))));
}
function RecoveryCenterPage() {
  const summary = dashboardSummary(state.accounts);
  const readiness = averageScore();
  const query = state.recoverySearch.toLowerCase();
  const recoveryStatus = (account) => scoreFor(account) >= 80 ? 'Ready' : 'Attention';
  const recoveryRisk = (account) => accountRisk(account).risk;
  const accounts = state.accounts
    .filter((account) => [account.name, account.handle, account.recoveryEmail, account.recoveryPhone, account.category].join(' ').toLowerCase().includes(query))
    .filter((account) => state.recoveryStatusFilter === 'All' || recoveryStatus(account) === state.recoveryStatusFilter)
    .filter((account) => state.recoveryRiskFilter === 'All' || recoveryRisk(account) === state.recoveryRiskFilter)
    .filter((account) => state.recoveryPasskeyFilter === 'All' || (account.passkeyStatus ? 'Enabled' : 'Missing') === state.recoveryPasskeyFilter)
    .filter((account) => state.recoveryMfaFilter === 'All' || (account.authenticator || account.passkeyStatus ? 'Enabled' : 'Missing') === state.recoveryMfaFilter)
    .filter((account) => state.recoveryCategoryFilter === 'All' || account.category === state.recoveryCategoryFilter)
    .sort((a, b) => state.recoverySort === 'Last reviewed' ? String(b.lastReviewed || '').localeCompare(String(a.lastReviewed || '')) : state.recoverySort === 'Name' ? a.name.localeCompare(b.name) : scoreFor(a) - scoreFor(b));
  const metrics = [
    ['Recovery Score', `${readiness}%`],
    ['Recovery Ready Accounts', state.accounts.filter((account) => scoreFor(account) >= 80).length],
    ['Accounts At Risk', state.accounts.filter((account) => scoreFor(account) < 80).length],
    ['Passkeys Enabled', state.accounts.filter((account) => account.passkeyStatus).length],
    ['Last Recovery Review', state.accounts.map((account) => account.lastReviewed).filter(Boolean).sort().pop() || 'No review']
  ];
  return h('section', { className: `panel glass premium-page recovery-vault-page density-${state.recoveryDensity}`, id: 'recovery-center' },
    h('div', { className: 'recovery-vault-head' }, h('div', null, h('p', { className: 'eyebrow' }, 'Recovery Vault'), h('h2', null, 'Recovery dashboard')), h('span', null, `${accounts.length}/${state.accounts.length} shown`)),
    h('div', { className: 'recovery-vault-metrics' }, metrics.map(([label, value]) => h('article', { key: label }, h('span', null, label), h('strong', null, value)))),
    h('div', { className: 'recovery-vault-toolbar' },
      h('input', { value: state.recoverySearch, onChange: (event) => setState({ recoverySearch: event.target.value }), placeholder: 'Search recovery methods, accounts, emails…', 'aria-label': 'Search recovery vault' }),
      h('select', { value: state.recoveryStatusFilter, onChange: (event) => setState({ recoveryStatusFilter: event.target.value }) }, ['All', 'Ready', 'Attention'].map((item) => h('option', { key: item }, item))),
      h('select', { value: state.recoveryRiskFilter, onChange: (event) => setState({ recoveryRiskFilter: event.target.value }) }, ['All', 'Critical', 'High', 'Medium', 'Low', 'Safe'].map((item) => h('option', { key: item }, item))),
      h('select', { value: state.recoveryPasskeyFilter, onChange: (event) => setState({ recoveryPasskeyFilter: event.target.value }) }, ['All', 'Enabled', 'Missing'].map((item) => h('option', { key: item }, item))),
      h('select', { value: state.recoveryMfaFilter, onChange: (event) => setState({ recoveryMfaFilter: event.target.value }) }, ['All', 'Enabled', 'Missing'].map((item) => h('option', { key: item }, item))),
      h('select', { value: state.recoveryCategoryFilter, onChange: (event) => setState({ recoveryCategoryFilter: event.target.value }) }, ['All', ...appCategories].map((item) => h('option', { key: item }, item))),
      h('select', { value: state.recoverySort, onChange: (event) => setState({ recoverySort: event.target.value }) }, ['Readiness', 'Last reviewed', 'Name'].map((item) => h('option', { key: item }, item))),
      h('button', { onClick: () => setState({ recoveryDensity: state.recoveryDensity === 'compact' ? 'comfortable' : 'compact' }) }, state.recoveryDensity === 'compact' ? 'Compact' : 'Comfortable')
    ),
    h('div', { className: 'recovery-vault-table', role: 'table', 'aria-label': 'Recovery vault account table' },
      h('div', { className: 'recovery-vault-header', role: 'row' }, ['Account', 'Recovery Email', 'Recovery Phone', 'Backup', 'Passkey', 'MFA', 'Status', 'Risk', 'Reviewed', 'Score'].map((label) => h('span', { key: label, role: 'columnheader' }, label))),
      accounts.map((account) => h('article', { key: account.id, className: `recovery-vault-row ${recoveryStatus(account).toLowerCase()}` },
        h('span', { className: `app-icon brand-icon brand-${brandSlug(account.name)}`, style: { '--brand-color': account.color } }, brandMark(account.name)),
        h('div', { className: 'recovery-account-identity' }, h('strong', null, account.name), h('small', null, account.handle || account.email || account.category)),
        h('span', { className: 'recovery-cell' }, account.recoveryEmail || 'Missing'),
        h('span', { className: 'recovery-cell' }, account.recoveryPhone || 'Missing'),
        h('span', { className: 'recovery-cell' }, account.backupCodes ? 'Saved' : 'Missing'),
        h('span', { className: 'recovery-cell' }, account.passkeyStatus || 'Missing'),
        h('span', { className: 'recovery-cell' }, account.authenticator || account.passkeyStatus || 'Missing'),
        h('b', { className: `readiness-pill ${recoveryStatus(account).toLowerCase() === 'ready' ? 'protected' : 'review'}` }, recoveryStatus(account)),
        h('b', { className: `risk-badge ${recoveryRisk(account).toLowerCase()}` }, recoveryRisk(account)),
        h('span', { className: 'recovery-cell' }, account.lastReviewed || 'No review'),
        h('strong', { className: 'recovery-score-cell' }, `${scoreFor(account)}%`),
        h('details', { className: 'recovery-expanded-detail' }, h('summary', null, 'Details'), h('div', null, [['Recovery Contacts', account.trustedContacts || state.recoveryContacts[0]?.name || 'Missing'], ['Backup Codes', account.backupCodes || 'Missing'], ['Trusted Devices', account.deviceVerification || 'Missing'], ['Security Questions', state.recoveryMethods[0]?.status || state.recoveryMethods[0]?.name || 'Not required'], ['Recent Recovery Activity', state.recoveryTimeline[0]?.title || state.activityFeed[0]?.title || 'No recent activity'], ['Last Password Change', account.lastReviewed || 'No review'], ['Audit History', state.auditEvents[0]?.action || 'No audit event']].map(([label, value]) => h('span', { key: label }, h('b', null, label), value))))
      ))
    ),
    h('div', { className: 'recovery-vault-sidecar' },
      h('article', null, h('span', null, 'Recovery Readiness'), h('strong', null, `${readiness}%`), h('div', { className: 'readiness-line' }, h('span', { style: { width: `${readiness}%` } }))),
      h('article', null, h('span', null, 'Critical Alerts'), h('strong', null, unreadNotifications().length)),
      h('article', null, h('span', null, 'Recommended Fixes'), h('strong', null, summary.suggestedNextFixes.length || prioritizedRecommendations().length)),
      h('article', null, h('span', null, 'AI Copilot Summary'), h('p', null, dailySecurityInsights(state.accounts, state.devices)[0] || 'Recovery coverage is being monitored.'))
    ),
    h('form', { className: 'account-form recovery-center-form compact-recovery-form', onSubmit: saveRecoveryCenter },
      h('input', { name: 'recoveryEmail', type: 'email', placeholder: 'Recovery email', defaultValue: state.settings.recoveryEmail || state.accounts.find((account) => account.recoveryEmail)?.recoveryEmail || '' }),
      h('input', { name: 'recoveryPhone', placeholder: 'Recovery phone', defaultValue: state.settings.recoveryPhone || state.accounts.find((account) => account.recoveryPhone)?.recoveryPhone || '' }),
      h('input', { name: 'backupCodes', placeholder: 'Backup code status', defaultValue: state.backupCodes[0]?.status || '' }),
      h('input', { name: 'trustedDevice', placeholder: 'Trusted device', defaultValue: state.devices[0]?.name || state.devices[0]?.browser || '' }),
      h('input', { name: 'passkeyStatus', placeholder: 'Passkey status', defaultValue: state.settings.passkeyStatus || '' }),
      h('input', { name: 'authenticatorStatus', placeholder: 'Authenticator status', defaultValue: state.settings.authenticatorStatus || '' }),
      h('input', { name: 'recoveryContact', placeholder: 'Recovery contact', defaultValue: state.recoveryContacts[0]?.name || '' }),
      h('button', { className: 'primary full-span' }, 'Save Recovery Center')
    ),
    h('div', { className: 'portability-actions recovery-vault-actions' }, h('button', { className: 'primary', onClick: exportEncryptedRecoveryData }, 'Export Encrypted Backup'), h('button', { onClick: () => exportReport('recovery') }, 'Recovery Report'))
  );
}
function DeviceCenterPage() {
  const query = state.deviceSearch.toLowerCase();
  const deviceRisk = (device) => device.trusted ? 'Low' : 'High';
  const deviceStatus = (device) => /year|month|week/i.test(device.lastActive || '') ? 'Inactive' : 'Active';
  const platforms = ['All', ...Array.from(new Set(state.devices.map((device) => device.os || 'Unknown')))].filter(Boolean);
  const devices = state.devices
    .filter((device) => [device.name, device.browser, device.os, device.location, device.ip].join(' ').toLowerCase().includes(query))
    .filter((device) => state.devicePlatformFilter === 'All' || (device.os || 'Unknown') === state.devicePlatformFilter)
    .filter((device) => state.deviceRiskFilter === 'All' || deviceRisk(device) === state.deviceRiskFilter)
    .filter((device) => state.deviceTrustFilter === 'All' || (device.trusted ? 'Trusted' : 'Untrusted') === state.deviceTrustFilter)
    .filter((device) => state.deviceStatusFilter === 'All' || deviceStatus(device) === state.deviceStatusFilter)
    .sort((a, b) => state.deviceSort === 'Platform' ? String(a.os || '').localeCompare(String(b.os || '')) : state.deviceSort === 'Risk' ? deviceRisk(b).localeCompare(deviceRisk(a)) : String(b.lastActive || '').localeCompare(String(a.lastActive || '')));
  const trusted = state.devices.filter((device) => device.trusted).length;
  const active = state.devices.filter((device) => deviceStatus(device) === 'Active').length;
  const inactive = state.devices.length - active;
  const health = state.devices.length ? Math.round((trusted / state.devices.length) * 100) : 0;
  const lastActivity = state.devices.map((device) => device.lastActive).filter(Boolean).sort().pop() || 'No device activity';
  const metrics = [['Trusted Devices', trusted], ['Active Devices', active], ['Inactive Devices', inactive], ['Last Device Activity', lastActivity], ['Overall Device Health', `${health}%`]];
  return h('section', { className: `panel glass dedicated-page device-intelligence-center density-${state.deviceDensity}`, id: 'devices' },
    h('div', { className: 'device-intel-head' }, h('div', null, h('p', { className: 'eyebrow' }, 'Device Intelligence Center'), h('h2', null, 'Trusted devices')), h('span', null, `${devices.length}/${state.devices.length} shown`)),
    h('div', { className: 'device-intel-metrics' }, metrics.map(([label, value]) => h('article', { key: label }, h('span', null, label), h('strong', null, value)))),
    h('div', { className: 'device-filter-toolbar' },
      h('input', { value: state.deviceSearch, onChange: (event) => setState({ deviceSearch: event.target.value }), placeholder: 'Search devices, browsers, locations…', 'aria-label': 'Search devices' }),
      h('select', { value: state.devicePlatformFilter, onChange: (event) => setState({ devicePlatformFilter: event.target.value }) }, platforms.map((platform) => h('option', { key: platform }, platform))),
      h('select', { value: state.deviceRiskFilter, onChange: (event) => setState({ deviceRiskFilter: event.target.value }) }, ['All', 'High', 'Low'].map((risk) => h('option', { key: risk }, risk))),
      h('select', { value: state.deviceTrustFilter, onChange: (event) => setState({ deviceTrustFilter: event.target.value }) }, ['All', 'Trusted', 'Untrusted'].map((trust) => h('option', { key: trust }, trust))),
      h('select', { value: state.deviceStatusFilter, onChange: (event) => setState({ deviceStatusFilter: event.target.value }) }, ['All', 'Active', 'Inactive'].map((status) => h('option', { key: status }, status))),
      h('select', { value: state.deviceSort, onChange: (event) => setState({ deviceSort: event.target.value }) }, ['Last seen', 'Platform', 'Risk'].map((sort) => h('option', { key: sort }, sort))),
      h('button', { onClick: () => setState({ deviceDensity: state.deviceDensity === 'compact' ? 'comfortable' : 'compact' }) }, state.deviceDensity === 'compact' ? 'Compact' : 'Comfortable')
    ),
    devices.length ? h('div', { className: 'device-intel-table', role: 'table', 'aria-label': 'Device intelligence table' },
      h('div', { className: 'device-intel-header', role: 'row' }, ['Device', 'Platform', 'Browser', 'Location', 'Last Seen', 'Trust', 'Risk', 'Recovery', 'MFA'].map((label) => h('span', { key: label, role: 'columnheader' }, label))),
      devices.map((device) => h('article', { key: device.id, className: `device-intel-row ${device.trusted ? 'trusted-device' : 'unknown-device'}` },
        h('span', { className: 'device-icon' }, /mac|ios|iphone|ipad/i.test(device.os || '') ? '⌘' : /windows/i.test(device.os || '') ? '⊞' : /android/i.test(device.os || '') ? '◖' : '◉'),
        h('div', { className: 'device-identity' }, h('strong', null, device.name || device.browser || 'Device'), h('small', null, device.ip || 'IP unavailable')),
        h('span', { className: 'device-cell' }, device.os || 'Unknown'),
        h('span', { className: 'device-cell' }, device.browser || 'Browser'),
        h('span', { className: 'device-cell' }, device.location || 'Unknown'),
        h('span', { className: 'device-cell' }, device.lastActive || 'Now'),
        h('b', { className: device.trusted ? 'trust-pill trusted' : 'trust-pill review' }, device.trusted ? 'Trusted' : 'Review'),
        h('b', { className: `risk-badge ${deviceRisk(device).toLowerCase()}` }, deviceRisk(device)),
        h('span', { className: 'device-cell' }, device.trusted ? 'Ready' : 'Review'),
        h('span', { className: 'device-cell' }, state.accounts.some((account) => account.authenticator || account.passkeyStatus) ? 'Enabled' : 'Missing'),
        h('details', { className: 'device-expanded-detail' }, h('summary', null, 'Details'), h('div', null, ['Security Events', 'Recovery Status', 'Trusted Sessions', 'Recent Activity', 'Connected Accounts', 'Backup Status'].map((label) => h('span', { key: label }, h('b', null, label), label === 'Connected Accounts' ? state.accounts.filter((account) => account.deviceVerification).length : label === 'Backup Status' ? state.backupStatus : device.trusted ? 'Ready' : 'Review')))),
        h('button', { className: 'danger', onClick: () => removeDevice(device) }, 'Remove')
      ))
    ) : h(EmptyState, { icon: '◉', title: 'No devices connected.', description: 'Device records will appear here after SecureSwitch receives device sync data.', action: 'Open Settings', onAction: () => location.hash = 'settings' })
  );
}
function SecurityAuditPage() {
  const risk = liveRiskScore();
  const checks = ['Weak passwords', 'Duplicate passwords', 'Missing recovery methods', 'Old recovery email', 'No backup codes', 'No passkey', 'Old authenticator', 'Inactive trusted devices'];
  return h('section', { className: 'panel glass dedicated-page security-audit-page', id: 'security-audit' }, h('div', { className: 'panel-head' }, h('div', null, h('p', { className: 'eyebrow' }, 'Security Audit'), h('h2', null, 'One-click account recovery audit')), h('button', { className: 'primary', onClick: runSecurityAudit }, 'Run audit')), h('div', { className: 'command-metric-grid' }, [['Risk Score', risk.label], ['Findings', risk.findings.length], ['Critical Accounts', state.accounts.filter((account) => scoreFor(account) < 60).length], ['Protected Accounts', state.accounts.filter((account) => scoreFor(account) >= 85).length]].map(([label, value]) => h('article', { key: label }, h('span', null, label), h('strong', null, value)))), h('div', { className: 'security-alert-stack' }, risk.findings.slice(0, 10).map((item) => h('article', { key: item.detail }, h('b', null, item.severity), h('span', null, item.detail), h('small', null, `${item.account} · Why: this can block emergency recovery.`)))), h('div', { className: 'filter-pills' }, checks.map((check) => h('span', { key: check }, check))), h('button', { onClick: exportSecurityAudit }, 'Download report'));
}
function PremiumFeaturesPage() {
  const features = ['Advanced Monitoring', 'Dark Web Monitoring', 'Identity Monitoring', 'Priority Recovery', 'Family Plan', 'Business Plan'];
  const plans = [['FREE', '10 Accounts · Basic Monitoring · Security Score'], ['PRO', 'Unlimited Accounts · AI Assistant · Recovery Center · Device Monitoring · Audit Reports · Dark Web Monitoring'], ['FAMILY', 'Up to 6 Users · Shared Dashboard · Recovery Alerts'], ['BUSINESS', 'Employee Monitoring · Admin Dashboard · Compliance Reports · Advanced Analytics']];
  return h('section', { className: 'panel glass dedicated-page premium-locks-page', id: 'premium' }, h('p', { className: 'eyebrow' }, 'Premium Subscriptions'), h('h2', null, 'Plans built for account recovery'), h('div', { className: 'pricing-grid compact' }, plans.map(([plan, detail]) => h('article', { key: plan, className: plan === 'PRO' ? 'featured-plan' : '' }, h('h3', null, plan), h('p', null, detail), h('button', { className: 'primary', onClick: () => plan === 'FREE' ? toast('Free plan selected') : openUpgrade(`${plan} Plan`) }, plan === 'FREE' ? 'Current' : 'Upgrade')))), h('h3', null, 'Premium locks throughout SecureSwitch'), h('div', { className: 'pricing-grid compact' }, features.map((feature) => h('article', { key: feature, className: 'locked-feature' }, h('strong', null, feature), h('small', null, 'Upgrade to unlock production-grade recovery protection.'), h('button', { className: 'primary', onClick: () => openUpgrade(feature) }, 'Upgrade')))));
}
function UpgradeModal() {
  if (!state.upgradeModal) return null;
  return h('section', { className: 'command-palette-backdrop', role: 'dialog', 'aria-label': 'Upgrade modal' }, h('div', { className: 'command-palette glass upgrade-modal' }, h('p', { className: 'eyebrow' }, 'SecureSwitch Premium'), h('h2', null, state.upgradeModal), h('p', null, 'This feature is available on Pro, Family, Business, and Enterprise plans. Stripe checkout remains isolated until production billing is connected.'), h('div', { className: 'portability-actions' }, h('button', { className: 'primary', onClick: () => { setState({ upgradeModal: '' }); location.hash = 'billing'; } }, 'View plans'), h('button', { onClick: () => setState({ upgradeModal: '' }) }, 'Not now'))));
}
function ProductionSetupChecklist() {
  return h('section', { className: 'panel glass production-checklist', id: 'production-checklist' },
    h('div', { className: 'panel-head' }, h('div', null, h('p', { className: 'eyebrow' }, 'Production Launch Checklist'), h('h2', null, 'Phase 5 setup requirements')), h('span', null, deployMode())),
    h('div', { className: 'launch-checklist-grid' }, launchChecklist.map(([title, detail]) => h('article', { key: title }, h('strong', null, title), h('small', null, detail))))
  );
}
function ProductionStatusPanel() {
  const rows = [
    ['Firebase configured', hasFirebaseConfig() ? 'Yes' : 'No'],
    ['Auth available', state.auth ? 'Yes' : 'No'],
    ['Firestore available', state.db ? 'Yes' : 'No'],
    ['Runtime mode', runtimeModeLabel()],
    ['Demo mode active', usingLiveAccounts() ? 'No' : 'Yes'],
    ['Build version', buildVersion()],
    ['Deploy mode', deployMode()]
  ];
  return h('section', { className: 'panel glass production-status-panel' }, h('p', { className: 'eyebrow' }, 'Production Status'), h('h2', null, 'Runtime readiness'), h('div', { className: 'runtime-toggle', role: 'group', 'aria-label': 'Runtime mode' }, ['auto', 'demo', 'production'].map((mode) => h('button', { key: mode, className: selectedRuntimeMode() === mode ? 'active' : '', onClick: () => setRuntimeMode(mode) }, mode === 'auto' ? 'Auto' : mode === 'demo' ? 'Demo Mode' : 'Production Mode'))), h('div', { className: 'status-grid' }, rows.map(([label, value]) => h('article', { key: label }, h('span', null, label), h('strong', null, value)))));
}
function RecoveryDataPortability() {
  return h('section', { className: 'panel glass portability-panel' },
    h('p', { className: 'eyebrow' }, 'Encrypted Data Portability'),
    h('h2', null, 'Export / Import recovery data'),
    h('p', { className: 'muted' }, 'Exports contain encrypted recovery records only. Only import files you trust.'),
    h('div', { className: 'portability-actions' },
      h('button', { className: 'primary', onClick: exportEncryptedRecoveryData }, 'Export encrypted JSON'),
      h('label', { className: 'import-button' }, 'Import encrypted JSON', h('input', { type: 'file', accept: 'application/json,.json', onChange: importEncryptedRecoveryData }))
    ),
    state.exportStatus && h('p', { className: 'muted' }, state.exportStatus),
    state.importStatus && h('p', { className: 'muted' }, state.importStatus)
  );
}
function BillingSubscriptionsPanel() {
  const subscription = getSubscriptionSnapshot({ plan: state.subscriptionPlan });
  return h('section', { className: 'panel glass phase10-panel', id: 'billing' },
    h('div', { className: 'panel-head' }, h('div', null, h('p', { className: 'eyebrow' }, 'Stripe Subscriptions'), h('h2', null, 'Billing is ready for server-side Stripe')), h('strong', null, subscription.status)),
    h('p', { className: 'muted' }, 'No Stripe secret keys are exposed in the browser. Upgrade actions are isolated until a backend checkout endpoint is connected.'),
    h('div', { className: 'pricing-grid compact' }, billingPlans.map((plan) => h('article', { key: plan.id, className: state.subscriptionPlan === plan.id ? 'selected' : '' }, h('span', null, plan.name), h('strong', null, plan.price), h('small', null, plan.interval), h('button', { onClick: () => { setState({ subscriptionPlan: plan.id }); toast(`${plan.name} selected for demo billing`); } }, plan.id === state.subscriptionPlan ? 'Current' : 'Select')))),
    h('div', { className: 'status-grid' }, [['Subscription status', subscription.status], ['Trial support', 'Ready'], ['Billing history', `${subscription.billingHistory.length} demo invoice`], ['Invoices', 'Portal endpoint pending'], ['Secret keys exposed', subscription.secretKeysExposed ? 'Yes' : 'No']].map(([label, value]) => h('article', { key: label }, h('span', null, label), h('strong', null, value)))),
    h('div', { className: 'portability-actions' }, subscription.availableActions.map((action) => h('button', { key: action, onClick: () => toast(`${action} will route through the backend billing service`) }, action)))
  );
}
function ApiArchitecturePanel() {
  return h('section', { className: 'panel glass phase10-panel', id: 'api-architecture' },
    h('p', { className: 'eyebrow' }, 'Backend API Layer'),
    h('h2', null, 'Clean production service boundaries'),
    h('p', { className: 'muted' }, `Current runtime: ${apiClient().mode}. Firebase credentials automatically switch the app into production; missing credentials keep demo mode active.`),
    h('div', { className: 'service-grid' }, Object.entries(serviceRegistry).map(([name, actions]) => h('article', { key: name }, h('strong', null, name), h('small', null, actions.join(' · ')))))
  );
}
function AuditLoggingPanel() {
  const fallback = state.auditEvents.length ? state.auditEvents : ['login', 'logout', 'vault_unlock', 'recovery_update', 'device_change', 'organization_invite', 'export', 'backup'].map((action) => createAuditEvent(action, { demo: true }));
  return h('section', { className: 'panel glass phase10-panel', id: 'audit-logs' },
    h('p', { className: 'eyebrow' }, 'Audit Logging'),
    h('h2', null, 'Important actions are tracked'),
    h('div', { className: 'security-alert-stack' }, fallback.slice(0, 8).map((event) => h('article', { key: event.id }, h('b', null, event.action.replaceAll('_', ' ')), h('span', null, event.details?.demo ? 'Seeded audit event' : 'User action recorded'), h('small', null, event.createdAt))))
  );
}
function BackupSystemPanel() {
  return h('section', { className: 'panel glass phase10-panel', id: 'backup-system' },
    h('p', { className: 'eyebrow' }, 'Encrypted Backup Engine'),
    h('h2', null, state.backupStatus),
    h('div', { className: 'launch-checklist-grid' }, backupCapabilities.map((capability) => h('article', { key: capability }, h('strong', null, capability), h('small', null, capability.includes('Export') || capability.includes('Import') ? 'Connected to encrypted vault portability' : 'Production service hook ready')))),
    h('div', { className: 'portability-actions' },
      h('button', { className: 'primary', onClick: () => { setState({ backupStatus: 'Manual encrypted backup completed' }); recordAudit('backup', { type: 'manual' }); toast('Manual encrypted backup simulated'); } }, 'Run Manual Backup'),
      h('button', { onClick: exportEncryptedRecoveryData }, 'Export encrypted vault'),
      h('label', { className: 'import-button' }, 'Restore backup', h('input', { type: 'file', accept: 'application/json,.json', onChange: importEncryptedRecoveryData }))
    )
  );
}
function DeviceManagementPanel() {
  const devices = state.devices.length ? state.devices : [currentDeviceSnapshot(), { id: 'mobile-demo', browser: 'Mobile Safari', os: 'iOS beta', location: 'San Francisco, CA', lastActive: 'Beta session', trusted: false }];
  return h('section', { className: 'panel glass phase10-panel', id: 'devices' },
    h('p', { className: 'eyebrow' }, 'Device Management'),
    h('h2', null, 'Logged-in devices and remote controls'),
    h('div', { className: 'device-grid' }, devices.map((device) =>
      h('article', { key: device.id },
        h('strong', null, device.browser),
        h('span', null, device.os),
        h('small', null, `${device.location} · ${device.lastActive}`),
        h('div', { className: 'portability-actions' }, ['Trust Device', 'Remove Device', 'Remote Logout'].map((action) =>
          h('button', { key: action, onClick: () => { recordAudit('device_change', { action, device: device.id }); toast(`${action} queued for ${device.browser}`); } }, action)
        ))
      )
    ))
  );
}
function ProductionSecurityCenter() {
  const score = averageScore();
  const timeline = buildSecurityTimeline({ accounts: state.accounts, activity: state.activityFeed, notifications: notificationItems(), auditEvents: state.auditEvents, devices: state.devices }).slice(0, 6);
  const threatRows = [
    ['Missing MFA', state.accounts.filter((account) => !account.authenticator && !account.passkeyStatus).length],
    ['Weak Passwords', weakAccounts().length],
    ['No Recovery Method', state.accounts.filter((account) => !account.recoveryEmail && !account.recoveryPhone).length],
    ['Old Passwords', safeAccounts().filter((account) => Date.parse(account.lastReviewed || '') < Date.now() - 180 * 86400000).length],
    ['Compromised Accounts', state.securityAlerts.filter((alert) => /critical|comprom/i.test(`${alert.severity} ${alert.title}`)).length],
    ['Inactive Accounts', state.accounts.filter((account) => Date.parse(account.lastReviewed || '') < Date.now() - 365 * 86400000).length],
    ['High Risk Accounts', state.accounts.filter((account) => scoreFor(account) < 60).length]
  ];
  const topMetrics = [
    ['Overall Protection Score', `${score}%`],
    ['Risk Level', protectionStatus(score)],
    ['Last Scan', state.scanComplete ? 'Complete' : (state.auditRan ? 'Audit ready' : 'Ready')],
    ['Last Backup', state.backupStatus?.includes('ready') ? 'Ready' : (state.exportStatus || 'Ready')],
    ['Accounts Protected', state.accounts.filter((account) => scoreFor(account) >= 80).length]
  ];
  const recoveryRows = [['Recovery Readiness', `${score}%`], ['Emergency Readiness', state.emergencyKits.length ? 'Ready' : 'Prepared'], ['Recent Alerts', unreadNotifications().length]];
  return h('section', { className: 'panel glass security-command-center', id: 'production-security-center' },
    h('div', { className: 'security-command-head' },
      h('div', null, h('p', { className: 'eyebrow' }, 'Security Command Center'), h('h2', null, score >= 75 ? 'You are protected.' : 'Review required.')),
      h('button', { className: 'primary', onClick: runHealthScan }, 'Run Scan')
    ),
    h('div', { className: 'security-command-top' }, topMetrics.map(([label, value]) =>
      h('article', { key: label, className: label.includes('Score') ? 'dominant-score' : '' }, h('span', null, label), h('strong', null, value))
    )),
    h('div', { className: 'security-command-grid' },
      h('section', { className: 'security-command-card security-timeline-card' },
        h('div', { className: 'compact-card-head' }, h('span', null, 'Security Timeline'), h('a', { href: '#timeline' }, 'View all')),
        h('div', { className: 'command-timeline' }, timeline.map((event) =>
          h('article', { key: `${event.type}-${event.title}-${event.at}` }, h('i'), h('div', null, h('strong', null, event.title), h('small', null, `${event.type} · ${new Date(event.at).toLocaleDateString()}`)))
        ))
      ),
      h('section', { className: 'security-command-card threat-summary-card' },
        h('div', { className: 'compact-card-head' }, h('span', null, 'Threat Summary'), h('b', null, `${threatRows.reduce((sum, [, value]) => sum + Number(value || 0), 0)} issues`)),
        threatRows.map(([label, value]) => h('article', { key: label, className: Number(value) ? 'needs-review' : 'clear' }, h('span', null, label), h('strong', null, value)))
      ),
      h('section', { className: 'security-command-card recovery-status-card' },
        h('div', { className: 'compact-card-head' }, h('span', null, 'Recovery Status'), h('b', null, `${score}%`)),
        recoveryRows.map(([label, value]) => h('article', { key: label }, h('span', null, label), h('strong', null, value))),
        h('div', { className: 'readiness-line' }, h('span', { style: { width: `${score}%` } }))
      )
    ),
    h('div', { className: 'security-command-grid bottom' },
      h('section', { className: 'security-command-card command-actions-card' },
        h('div', { className: 'compact-card-head' }, h('span', null, 'Quick Actions'), h('select', { onChange: (event) => event.target.value && toast(`${event.target.value} queued`) }, h('option', { value: '' }, 'More…'), ['Export report', 'Open recovery center', 'Review devices'].map((item) => h('option', { key: item }, item)))),
        h('div', { className: 'compact-action-row' }, h('button', { className: 'primary', onClick: runHealthScan }, 'Scan'), h('button', { onClick: () => location.hash = 'accounts' }, 'Accounts'), h('button', { onClick: () => location.hash = 'devices' }, 'Devices'))
      ),
      h('section', { className: 'security-command-card ai-summary-card' },
        h('div', { className: 'compact-card-head' }, h('span', null, 'AI Copilot'), h('button', { onClick: () => setState({ aiCopilotOpen: true }) }, 'Ask')),
        dailySecurityInsights(state.accounts, state.devices).slice(0, 3).map((insight) => h('p', { key: insight }, insight))
      ),
      h('section', { className: 'security-command-card recommendations-card' },
        h('div', { className: 'compact-card-head' }, h('span', null, 'Security Recommendations'), h('b', null, prioritizedRecommendations().length)),
        prioritizedRecommendations().slice(0, 4).map((item) => h('article', { key: item.title }, h('b', null, `+${item.impact}`), h('span', null, item.title), h('small', null, item.detail)))
      )
    )
  );
}
function PwaReadinessPanel() {
  return h('section', { className: 'panel glass phase10-panel', id: 'pwa-readiness' },
    h('p', { className: 'eyebrow' }, 'App Store Preparation'),
    h('h2', null, 'PWA, Android, and iPhone readiness'),
    h('div', { className: 'launch-checklist-grid' }, ['PWA manifest', 'Responsive safe areas', 'Offline mode banner', 'Install prompt ready', 'App icons placeholders', 'Splash screen metadata', 'Android/iPhone layout', 'Caching hooks'].map((item) => h('article', { key: item }, h('strong', null, item), h('small', null, 'Prepared without changing the current UI'))))
  );
}
function settingsWorkspaceSections() {
  const profileName = state.userProfile?.displayName || state.user?.displayName || firstName();
  const language = state.userProfile?.language || state.settings.language || 'English';
  const timezone = state.userProfile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const country = state.userProfile?.country || 'Not set';
  const notifications = notificationItems();
  const riskyDevices = state.devices.filter((device) => !device.trusted).length;
  const passkeyCount = state.accounts.filter((account) => account.passkeyStatus).length;
  const mfaCount = state.accounts.filter((account) => account.authenticator && !/sms only/i.test(account.authenticator)).length;
  const recoveryReady = state.accounts.filter((account) => account.recoveryEmail && account.recoveryPhone && account.backupCodes).length;
  const aiActions = generateSecurityRecommendations(state.accounts, state.devices).length;
  return [
    { id: 'general', title: 'General', description: 'Profile and workspace basics.', rows: [['Profile', profileName], ['Workspace name', state.organizations[0]?.name || 'SecureSwitch Workspace'], ['Language', language], ['Region', country], ['Timezone', timezone], ['Time format', state.settings.timeFormat || 'System default']] },
    { id: 'appearance', title: 'Appearance', description: 'Existing interface preferences.', rows: [['Theme', state.userProfile?.theme || state.settings.theme || 'Dark'], ['Accent', state.settings.accent || 'Blue / Purple'], ['Density', state.accountDensity || 'Compact'], ['Animations', state.settings.reducedMotion ? 'Reduced' : 'Enabled'], ['Compact mode', state.accountDensity === 'compact' ? 'On' : 'Off'], ['Glass mode', state.settings.glassMode === false ? 'Off' : 'On']] },
    { id: 'accounts', title: 'Accounts', description: 'Current account workspace.', rows: [['Total accounts', state.accounts.length], ['Protected accounts', state.accounts.filter((account) => scoreFor(account) >= 80).length], ['Accounts at risk', reviewCount()], ['Categories', new Set(state.accounts.map((account) => account.category).filter(Boolean)).size], ['Selected account', selectedAccount().name]] },
    { id: 'security', title: 'Security', description: 'Session, device, MFA, and audit posture.', rows: [['Session timeout', state.settings.sessionTimeout ? 'Enabled' : 'System default'], ['Passkey status', `${passkeyCount}/${safeAccounts().length} accounts`], ['MFA status', `${mfaCount}/${safeAccounts().length} accounts`], ['Recovery readiness', `${averageScore()}%`], ['Trusted devices', `${Math.max(0, state.devices.length - riskyDevices)}/${safeArray(state.devices).length || 1}`], ['Audit events', buildSecurityTimeline({ accounts: state.accounts, activity: state.activityFeed, notifications, auditEvents: state.auditEvents, devices: state.devices }).length]] },
    { id: 'recovery', title: 'Recovery', description: 'Recovery Vault information.', rows: [['Recovery score', `${averageScore()}%`], ['Recovery contacts', state.recoveryContacts.length || state.accounts.filter((account) => account.trustedContacts).length], ['Backup codes', safeAccounts().filter((account) => account.backupCodes).length], ['Recovery reminders', state.settings.recoveryReminders === false ? 'Off' : 'On'], ['Recovery-ready accounts', `${recoveryReady}/${state.accounts.length}`], ['Last review', state.accounts.map((account) => account.lastReviewed).filter(Boolean).sort().at(-1) || 'Not recorded']] },
    { id: 'notifications', title: 'Notifications', description: 'Current notification preferences.', rows: [['Security alerts', state.settings.notifications === false ? 'Off' : 'On'], ['Weekly reports', state.settings.weeklyReports === false ? 'Off' : 'On'], ['Critical alerts', unreadNotifications().length], ['Push', state.settings.pushNotifications ? 'On' : 'Browser default'], ['Email', state.userProfile?.preferredNotifications || state.settings.preferredNotifications || 'Security only'], ['Unread notifications', unreadNotifications().length]] },
    { id: 'privacy', title: 'Privacy', description: 'Local privacy and data controls.', rows: [['Runtime mode', runtimeModeLabel()], ['Vault unlocked', state.vaultUnlocked ? 'Yes' : 'No'], ['Export data', state.settings.exportVault === false ? 'Disabled' : 'Available'], ['Cloud sync', usingLiveAccounts() ? 'Live Firestore' : 'Local demo state'], ['Encrypted backups', state.backupStatus || 'Ready']] },
    { id: 'ai', title: 'AI Copilot', description: 'Existing local copilot behavior.', rows: [['Suggestion level', aiActions ? 'Prioritized' : 'Quiet'], ['Explanation detail', state.aiCopilotAnswer ? 'Expanded' : 'Summary'], ['Workspace summaries', dailySecurityInsights(state.accounts, state.devices).length], ['Recommendations', aiActions], ['Current prompt', state.aiCopilotQuestion || 'Not set']] },
    { id: 'workspace', title: 'Workspace', description: 'Organization and app context.', rows: [['Mode', runtimeModeLabel()], ['Organization', state.organizations[0]?.name || 'Personal workspace'], ['Role', state.organizations[0]?.role || 'Owner'], ['Plan', state.subscriptionPlan || 'free'], ['Version', buildVersion()], ['Firebase', state.firebaseReady ? 'Ready' : 'Fallback']] },
    { id: 'about', title: 'About', description: 'Application metadata.', rows: [['App', 'SecureSwitch'], ['Build', buildVersion()], ['Deploy mode', deployMode()], ['PWA', 'Manifest available'], ['Service worker', 'Registered when hosted'], ['Privacy', 'No raw passwords stored']]} 
  ];
}
function Settings() {
  const query = state.settingsSearch.trim().toLowerCase();
  const sections = settingsWorkspaceSections().map((section) => ({ ...section, rows: section.rows.filter(([label, value]) => !query || `${section.title} ${section.description} ${label} ${value}`.toLowerCase().includes(query)) })).filter((section) => !query || section.rows.length);
  const activeSection = sections[0] || settingsWorkspaceSections()[0];
  const toggle = async (key, checked) => { const settings = { ...state.settings, [key]: checked }; setState({ settings }); if (usingLiveAccounts()) { try { await writeUserScopedDoc('settings', 'preferences', settings); } catch (error) { setState({ dataError: safeError(error, 'Settings could not be saved. Please try again.') }); } } };
  const preferenceToggles = [['notifications', 'Security alerts'], ['weeklyReports', 'Weekly reports'], ['recoveryReminders', 'Recovery reminders'], ['exportVault', 'Export data'], ['glassMode', 'Glass mode'], ['reducedMotion', 'Reduced motion']];
  return h('section', { className: 'panel glass settings-panel professional-settings workspace-settings-page', id: 'settings' },
    h('header', { className: 'workspace-settings-hero' },
      h('div', null, h('p', { className: 'eyebrow' }, 'Workspace Settings'), h('h2', null, 'Control center for SecureSwitch'), h('small', null, 'Preferences, security posture, recovery readiness, notifications, AI Copilot, and workspace metadata in one compact settings workspace.')),
      h('label', { className: 'settings-search' }, h('span', null, '⌕'), h('input', { value: state.settingsSearch, onChange: (event) => setState({ settingsSearch: event.target.value }), placeholder: 'Search settings…', 'aria-label': 'Search settings' }), h('kbd', null, '/'))
    ),
    h('div', { className: 'workspace-settings-layout' },
      h('nav', { className: 'settings-workspace-sidebar', 'aria-label': 'Settings sections' }, settingsWorkspaceSections().map((section) => h('a', { key: section.id, href: `#settings-${section.id}` }, h('span', null, section.title), h('small', null, section.rows.length)))),
      h('main', { className: 'settings-workspace-main' },
        h('form', { className: 'settings-profile-card', onSubmit: saveUserProfile, 'aria-label': 'User profile settings' },
          h('div', null, h('strong', null, 'Profile'), h('small', null, 'Existing account profile fields.')),
          h('input', { name: 'displayName', placeholder: 'Name', defaultValue: state.userProfile?.displayName || state.user?.displayName || '' }),
          h('input', { name: 'photoURL', placeholder: 'Profile photo URL', defaultValue: state.userProfile?.photoURL || state.user?.photoURL || '' }),
          h('input', { name: 'timezone', placeholder: 'Timezone', defaultValue: state.userProfile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' }),
          h('input', { name: 'country', placeholder: 'Country', defaultValue: state.userProfile?.country || '' }),
          h('select', { name: 'preferredNotifications', defaultValue: state.userProfile?.preferredNotifications || state.settings.preferredNotifications || 'Security only' }, ['Security only', 'Security and recovery', 'All product updates'].map((item) => h('option', { key: item }, item))),
          h('select', { name: 'theme', defaultValue: state.userProfile?.theme || state.settings.theme || 'Dark' }, ['Dark', 'System'].map((item) => h('option', { key: item }, item))),
          h('select', { name: 'language', defaultValue: state.userProfile?.language || state.settings.language || 'English' }, ['English', 'Spanish', 'French'].map((item) => h('option', { key: item }, item))),
          h('button', { className: 'primary' }, 'Save Profile')
        ),
        h('div', { className: 'settings-preference-strip' }, preferenceToggles.map(([key, label]) => h('label', { key }, h('span', null, label), h('input', { type: 'checkbox', checked: state.settings[key] ?? key !== 'reducedMotion', onChange: (event) => toggle(key, event.target.checked) })))),
        sections.length ? sections.map((section) => h('section', { key: section.id, id: `settings-${section.id}`, className: 'settings-workspace-section' }, h('div', { className: 'settings-section-title' }, h('div', null, h('h3', null, highlightMatch(section.title, query)), h('p', null, highlightMatch(section.description, query))), h('span', null, section.rows.length)), h('div', { className: 'settings-row-list' }, section.rows.map(([label, value]) => h('article', { key: `${section.id}-${label}` }, h('span', null, highlightMatch(label, query)), h('strong', null, highlightMatch(value, query))))))) : h(EmptyState, { icon: '⌕', title: 'No settings found', description: 'Try searching profile, recovery, notifications, AI Copilot, devices, or security.', action: 'Clear search', onAction: () => setState({ settingsSearch: '' }) })
      ),
      h('aside', { className: 'settings-context-panel' },
        h('section', null, h('strong', null, 'Contextual Help'), h('p', null, activeSection.description), h('small', null, `${activeSection.rows.length} related settings`)),
        h('section', null, h('strong', null, 'Related Settings'), activeSection.rows.slice(0, 5).map(([label, value]) => h('article', { key: label }, h('span', null, label), h('small', null, String(value))))),
        h('section', null, h('strong', null, 'Workspace Health'), h('div', { className: 'settings-health-meter' }, h('span', { style: { width: `${averageScore()}%` } })), h('small', null, `${averageScore()}% recovery readiness · ${unreadNotifications().length} unread alerts`))
      )
    ),
    h('div', { className: 'settings-support-grid' }, h(ProductionStatusPanel), h(RecoveryDataPortability), h(SyncAndAuthPanel))
  );
}



function DemoModeBanner() {
  return h('section', { className: 'demo-banner glass', 'aria-label': state.user ? 'Live Firestore data mode' : 'Demo mode' }, h('strong', null, state.user ? 'Live Digital Recovery Platform' : 'Demo Mode'), h('span', null, state.user ? 'SecureSwitch is reading and writing your private Firestore recovery records.' : 'You are viewing polished sample data. Sign in to switch to your own encrypted records.'), h('small', null, 'Privacy-first: SecureSwitch stores recovery planning data. Never store raw passwords.'));
}

function OnboardingPanel() {
  const progress = Math.round(((state.onboardingStep + 1) / onboardingSteps.length) * 100);
  return h('section', { className: 'panel glass onboarding-panel premium-onboarding-flow', id: 'onboarding' }, h('div', { className: 'panel-head' }, h('div', null, h('p', { className: 'eyebrow' }, 'First-time onboarding'), h('h2', null, 'Launch your recovery command center')), h('span', null, `${state.onboardingStep + 1}/${onboardingSteps.length}`)), h('div', { className: 'onboarding-progress', 'aria-label': `Onboarding ${progress}% complete` }, h('span', { style: { width: `${progress}%` } })), h('ol', { className: 'onboarding-steps' }, onboardingSteps.map((step, index) => h('li', { key: step, className: index <= state.onboardingStep ? 'done' : '' }, h('span', null, index < state.onboardingStep ? '✓' : index + 1), h('div', null, h('strong', null, step), h('small', null, index === state.onboardingStep ? 'Current step' : index < state.onboardingStep ? 'Complete' : 'Upcoming'))))), h('button', { className: 'primary', onClick: () => setState({ onboardingStep: Math.min(state.onboardingStep + 1, onboardingSteps.length - 1) }) }, state.onboardingStep === onboardingSteps.length - 1 ? `Celebrate ${averageScore()}% score` : 'Continue setup'));
}

function RecoveryWizardMVP() {
  const scenarios = Object.keys(recoveryPlaybooks);
  const steps = recoveryPlaybooks[state.recoveryWizardScenario];
  return h('section', { className: 'panel glass recovery-wizard-panel', id: 'recovery-wizard' }, h('div', { className: 'panel-head' }, h('div', null, h('p', { className: 'eyebrow' }, 'Recovery Wizard MVP'), h('h2', null, 'Emergency checklist with progress')), h('strong', null, `${state.recoveryWizardStep + 1}/${steps.length}`)), h('div', { className: 'wizard-scenarios' }, scenarios.map((scenario) => h('button', { key: scenario, className: state.recoveryWizardScenario === scenario ? 'active' : '', onClick: () => setState({ recoveryWizardScenario: scenario, recoveryWizardStep: 0 }) }, scenario))), h('ol', { className: 'wizard-checklist' }, steps.map((step, index) => h('li', { key: step, className: index <= state.recoveryWizardStep ? 'done' : '' }, h('span', null, index < state.recoveryWizardStep ? '✓' : index + 1), h('div', null, h('strong', null, step), h('small', null, index === state.recoveryWizardStep ? 'Current step' : index < state.recoveryWizardStep ? 'Completed' : 'Pending'))))), h('button', { className: 'primary', onClick: () => setState({ recoveryWizardStep: Math.min(state.recoveryWizardStep + 1, steps.length - 1) }) }, 'Mark step complete'));
}

function TopActions() {
  const results = globalSearchResults();
  return h('header', { className: 'top-actions' },
    h('div', { className: 'global-search' },
      h('input', { value: state.globalSearch, onChange: (event) => setState({ globalSearch: event.target.value }), placeholder: 'Search everything…', 'aria-label': 'Global search' }),
      results.length > 0 && h('div', { className: 'search-results glass' }, results.map((result) =>
        h('a', { key: `${result.type}-${result.title || result.label}`, href: result.href || (result.type === 'Account' ? '#accounts' : '#settings') }, h('b', null, result.type), h('span', null, highlightMatch(result.title || result.label)), h('small', null, highlightMatch(result.detail)))
      ))
    ),
    h('button', { onClick: () => setState({ commandPaletteOpen: true }) }, '⌘K'),
    h('button', { onClick: () => toast('Theme toggle ready') }, '☾'),
    h('button', { onClick: () => location.hash = 'notifications' }, '♧', h('b', null, unreadNotifications().length)),
    h('button', { className: 'primary add-account', onClick: () => location.hash = 'accounts' }, '+ Add Account')
  );
}

function Shortcuts() { const cards = [['♙', 'Accounts', 'Manage and secure all your accounts', 'accounts'], ['⇄', 'Switch Mode', 'Change access in seconds', 'switch'], ['⌾', 'Blackout Mode', 'Lock down and hide your data', 'blackout'], ['▣', 'Emergency Kit', 'Access critical info anywhere', 'kit']]; return h('section', { className: 'shortcut-grid' }, cards.map(([icon, label, copy, id]) => h('a', { key: label, className: 'shortcut glass', href: `#${id}` }, h('span', null, icon), h('div', null, h('strong', null, label), h('small', null, copy)), h('b', null, '›')))); }

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

function ExecutiveInsightCards() {
  return h('div', { className: 'executive-insight-grid' }, executiveInsightCards(state.accounts, state.devices, state.activityFeed).map((card, index) => h('article', { key: card.title, className: 'delight-card', style: { '--delay': `${index * 55}ms` } }, h('span', null, card.title), h('strong', { className: 'animated-stat' }, card.value), h('small', null, card.detail))));
}
function AchievementStrip() {
  const streak = securityStreak(state.activityFeed.length ? state.activityFeed : state.auditEvents);
  return h('div', { className: 'achievement-strip' }, h('article', { className: 'streak-card' }, h('span', null, streak.label), h('strong', null, `${streak.current} days`), h('small', null, `Best ${streak.best} · Last activity ${new Date(streak.lastActivity).toLocaleDateString()}`)), achievementProgress(state.accounts, state.devices, state.activityFeed).map((item) => h('article', { key: item.name, className: `achievement-card ${item.unlocked ? 'unlocked' : ''}`, style: { '--progress': item.percent / 100 } }, h('i', null, item.icon), h('strong', null, item.name), h('span', null, `${item.percent}%`), h('small', null, item.detail))));
}
function QuickFixCenter() {
  const fixes = quickFixActions(state.accounts, state.devices).filter((item) => !state.dismissedFixes.includes(item.id));
  return h('section', { className: 'panel glass suggested-fixes quick-fix-center' }, h('p', { className: 'eyebrow' }, 'Quick Fix Center'), h('h2', null, fixes.length ? 'Highest-impact actions' : 'Everything looks protected.'), fixes.length ? fixes.map((fix) => h('article', { key: fix.id, className: `quick-fix-row priority-${fix.severity.toLowerCase()}` }, h('div', { className: 'quick-fix-main' }, h('b', { className: 'severity-badge' }, fix.severity), h('div', { className: 'quick-fix-copy' }, h('strong', null, fix.title), h('small', null, `${fix.accountName}: ${fix.reason}`), h('span', null, `Estimated improvement +${fix.improvement} points · ${fix.time || '2 minutes'}`))), h('div', { className: 'quick-fix-actions' }, h('button', { className: 'primary', onClick: () => { location.hash = fix.primaryRoute; toast(`✓ ${fix.title} opened`); } }, 'Fix Now'), h('button', { onClick: () => { location.hash = 'security-audit'; toast(`${fix.accountName} queued for review`); } }, 'Review'), h('button', { onClick: () => setState({ dismissedFixes: state.dismissedFixes.concat(fix.id) }) }, 'Dismiss')))) : h(EmptyState, { icon: '✓', title: 'No risks detected.', description: "You're ahead of schedule. SecureSwitch will surface new issues when account data changes.", action: 'Run audit', onAction: runSecurityAudit, secondaryAction: 'Open accounts', onSecondaryAction: () => location.hash = 'accounts' }));
}
function ExecutiveSecurityScoreCard() {
  const metrics = executiveSecurityMetrics(state.accounts, state.devices);
  const score = metrics.averageHealthScore;
  const recommendation = topSecurityRecommendation();
  const dashboardMetrics = [['Total Accounts', metrics.totalAccounts], ['Accounts Protected', metrics.accountsProtected], ['Critical Issues', metrics.criticalIssues], ['Recovery Coverage', `${metrics.recoveryCoverage}%`], ['Passkey Adoption', `${metrics.passkeyAdoption}%`], ['Average Health Score', `${metrics.averageHealthScore}%`], ['Weekly Progress', `${metrics.weeklyProgress}%`], ['Security Trend', metrics.securityTrend]];
  return h('section', { className: 'panel glass executive-score-card' },
    h('div', { className: 'executive-score-hero' }, h('div', { className: 'executive-ring', style: { '--score': `${score * 3.6}deg` } }, h('strong', null, score), h('span', null, securityGrade(score))), h('div', null, h('p', { className: 'eyebrow' }, 'Overall Security Score'), h('h2', null, 'Never Lose Another Account Again.'), h('p', null, 'A live command center for identity recovery, device trust, and account resilience.'))),
    h('div', { className: 'command-metric-grid' }, dashboardMetrics.map(([label, value]) => h('article', { key: label }, h('span', null, label), h('strong', null, value)))),
    h(MiniTrendCharts),
    h(ExecutiveInsightCards),
    h(AchievementStrip),
    h('div', { className: 'ai-insight-strip' }, dailySecurityInsights(state.accounts, state.devices).slice(0, 3).map((insight) => h('span', { key: insight }, insight))),
    h('article', { className: `priority-recommendation ${recommendation.severity.toLowerCase()}` }, h('b', null, recommendation.severity), h('span', null, recommendation.text), h('small', null, `Estimated fix time: ${recommendation.time}`), h('button', { className: 'primary', onClick: () => { location.hash = 'security-audit'; toast('Fix workflow opened'); } }, 'Fix Now'))
  );
}
function MiniTrendCharts() {
  const values = [averageScore(), passwordHealthScore(), Math.max(35, 100 - riskFindings().length * 6), Math.min(98, 62 + safeAccounts().filter((account) => account.backupCodes).length * 8), Math.max(44, averageScore() - reviewCount() * 2)];
  const labels = ['Security Trend', 'Recovery Progress', 'Risk History', 'Weekly Health', 'Protection Timeline'];
  return h('div', { className: 'svg-chart-grid', 'aria-label': 'Animated security charts' }, values.map((value, index) => {
    const points = [22, 38, 34, 56, value].map((point, i) => `${i * 42 + 8},${100 - point}`).join(' ');
    return h('article', { key: labels[index], className: 'svg-chart-card', style: { '--delay': `${index * 80}ms` } }, h('span', null, labels[index]), h('strong', null, `${value}%`), h('svg', { viewBox: '0 0 180 110', role: 'img', 'aria-label': labels[index] }, h('polyline', { points, fill: 'none', stroke: 'url(#chartGlow)', strokeWidth: '5', strokeLinecap: 'round', strokeLinejoin: 'round' }), h('defs', null, h('linearGradient', { id: 'chartGlow', x1: '0', x2: '1' }, h('stop', { offset: '0%', stopColor: '#38bdf8' }), h('stop', { offset: '100%', stopColor: '#a78bfa' })))));
  }));
}
function AISecurityAssistantPanel() {
  return h('section', { className: 'panel glass ai-security-assistant-panel' }, h('div', { className: 'panel-head' }, h('div', null, h('p', { className: 'eyebrow' }, 'AI Security Assistant'), h('h2', null, 'Prioritized recovery guidance')), h('span', null, `${aiSecurityRecommendations().length} actions`)), h('div', { className: 'recommendation-stack' }, aiSecurityRecommendations().map((item) => h('article', { key: item.text, className: `priority-${item.severity.toLowerCase()}` }, h('b', null, item.severity), h('strong', null, item.text), h('small', null, `Why it matters: this can prevent lockout during an emergency. Estimated fix: ${item.time}.`), h('button', { onClick: () => { location.hash = 'account-detail'; toast(`${item.action} opened`); } }, item.action)))));
}
function WeeklyHealthCheckWidget() {
  const rows = state.accounts.slice(0, 5).map((account) => [account.name, scoreFor(account) >= 85 ? 'Healthy' : !account.backupCodes ? 'Backup Codes Missing' : !account.recoveryEmail ? 'Needs Recovery Update' : 'Recovery Phone Outdated']);
  return h('section', { className: 'panel glass weekly-health-check' }, h('div', { className: 'panel-head' }, h('div', null, h('p', { className: 'eyebrow' }, 'Weekly Security Health Check'), h('h2', null, 'What changed this week')), h('button', { className: 'primary', onClick: () => { location.hash = 'security-audit'; runSecurityAudit(); } }, 'Fix Everything')), rows.map(([name, status]) => h('article', { key: name, className: /Healthy/.test(status) ? 'healthy' : 'needs-work' }, h('strong', null, name), h('span', null, status))));
}
function DarkWebMonitoringPage() {
  const monitors = [['Email', 'No Exposure'], ['Phone Numbers', oldPhoneAccounts().length ? 'Possible Exposure' : 'No Exposure'], ['Usernames', 'No Exposure'], ['Passwords', weakAccounts().length ? 'Critical Exposure' : 'No Exposure'], ['Identity Exposure', 'Possible Exposure'], ['Credit Monitoring', 'Premium prepared']];
  return h('section', { className: 'panel glass dedicated-page dark-web-premium-page' }, h('p', { className: 'eyebrow' }, 'Premium Dark Web Monitoring'), h('h2', null, 'Exposure monitoring'), h('div', { className: 'premium-metric-grid' }, monitors.map(([label, status]) => h('article', { key: label, className: status.toLowerCase().replaceAll(' ', '-') }, h('span', null, label), h('strong', null, status), h('button', { onClick: () => openUpgrade('Dark Web Monitoring') }, status === 'No Exposure' ? 'Monitor' : 'Upgrade')))));
}
function FamilyProtectionPage() {
  const members = [['Keith', 95, 4, 0], ['Mom', 62, 2, 3], ['Brother', 81, 3, 1], ['Grandma', 34, 1, 5]];
  return h('section', { className: 'panel glass dedicated-page family-protection-page' }, h('p', { className: 'eyebrow' }, 'Premium Family Protection'), h('h2', null, 'Shared recovery readiness'), h('div', { className: 'premium-metric-grid' }, members.map(([name, score, devices, alerts]) => h('article', { key: name, className: score < 60 ? 'critical-family' : '' }, h('span', null, name), h('strong', null, `${score}/100`), h('small', null, `Recovery Readiness ${score}% · Devices ${devices} · Critical Alerts ${alerts}`), h('button', { onClick: () => openUpgrade('Family Plan') }, 'Manage')))));
}
function EmergencyRecoveryModePage() {
  const items = ['Recovery Emails', 'Recovery Phones', 'Backup Codes', 'Trusted Devices', 'Identity Documents', 'Recovery Contacts', 'Emergency Checklist'];
  return h('section', { className: `panel glass dedicated-page emergency-recovery-mode ${state.emergencyRecoveryActive ? 'active' : ''}` }, h('p', { className: 'eyebrow' }, 'Emergency Recovery Mode'), h('h2', null, 'High-stress recovery workspace'), h('button', { className: 'danger emergency-launch', onClick: () => setState({ emergencyRecoveryActive: !state.emergencyRecoveryActive }) }, state.emergencyRecoveryActive ? 'Emergency Mode Active' : 'Activate Emergency Recovery'), state.emergencyRecoveryActive && h('div', { className: 'premium-metric-grid' }, items.map((item) => h('article', { key: item }, h('strong', null, item), h('small', null, item === 'Backup Codes' ? `${safeAccounts().filter((account) => account.backupCodes).length} accounts ready` : 'Open verified recovery records'), h('button', { onClick: () => toast(`${item} opened`) }, 'Open')))));
}
function SecureVaultPage() {
  const capacity = Math.min(100, vaultItems().length * 8 + state.accounts.length * 3);
  return h('section', { className: 'panel glass dedicated-page secure-vault-page' }, h('p', { className: 'eyebrow' }, 'SecureVault'), h('h2', null, 'Encrypted recovery storage'), h('div', { className: 'status-grid' }, [['Encryption Status', state.vaultUnlocked ? 'Unlocked' : 'Locked'], ['Vault Capacity', `${capacity}%`], ['Records', vaultItems().length], ['Backup', state.exportStatus || 'Ready']].map(([label, value]) => h('article', { key: label }, h('span', null, label), h('strong', null, value)))), h('div', { className: 'kit-grid' }, vaultItems().map((item) => h('article', { key: item }, h('strong', null, item), h('small', null, 'Encrypted card ready')))), h('div', { className: 'progress' }, h('span', { style: { width: `${capacity}%` } })));
}
function BusinessDashboardPage() {
  const metrics = enterpriseAdminMetrics({ users: Math.max(1, state.organizations.reduce((sum, org) => sum + (Number(org.members) || 1), 0)), accounts: state.accounts, devices: state.devices, alerts: notificationItems(), activity: state.activityFeed });
  const reports = reportingMetrics(state.accounts, state.organizations, state.activityFeed);
  const rows = [['Total Users', metrics.totalUsers], ['Total Accounts', metrics.totalAccounts], ['MFA Adoption', `${metrics.mfaAdoption}%`], ['Weak Accounts', metrics.weakAccounts], ['Critical Alerts', metrics.criticalAlerts], ['Recovery Coverage', `${metrics.recoveryCoverage}%`], ['Recent Activity', metrics.recentActivity], ['Security Trend', metrics.securityTrend]];
  return h('section', { className: 'panel glass dedicated-page business-dashboard-page' }, h('p', { className: 'eyebrow' }, 'Enterprise Admin Dashboard'), h('h2', null, 'Organization security command center'), h('div', { className: 'premium-metric-grid enterprise-admin-grid' }, rows.map(([label, value]) => h('article', { key: label }, h('span', null, label), h('strong', null, value)))), h('section', { className: 'enterprise-card reporting-dashboard' }, h('div', { className: 'panel-head compact' }, h('h3', null, 'Reporting'), h('button', { onClick: () => exportReport('security') }, 'Export report')), h('div', { className: 'enterprise-grid compact' }, reports.map(([label, value]) => h('article', { key: label }, h('span', null, label), h('strong', null, value))))), h(TeamFamilyVaults));
}
function DashboardWidgetControls() {
  return h('section', { className: 'panel glass widget-order-panel' }, h('div', { className: 'panel-head compact' }, h('div', null, h('p', { className: 'eyebrow' }, 'Dashboard widgets'), h('h3', null, 'Remembered layout order')), h('small', null, 'Drag-free controls')), h('div', { className: 'widget-order-list' }, state.dashboardWidgetOrder.map((widget) => h('article', { key: widget }, h('strong', null, widget), h('div', null, h('button', { onClick: () => updateDashboardWidget(widget, 'up') }, '↑'), h('button', { onClick: () => updateDashboardWidget(widget, 'down') }, '↓'))))));
}
function FeatureShortcuts() {
  const cards = [
    ['Accounts', 'Manage and secure all your accounts', '#accounts', '👤'],
    ['Switch Mode', 'Change access in seconds', '#switch', '↔'],
    ['Blackout Mode', 'Lock down and hide your data', '#blackout', '🛡'],
    ['Emergency Kit', 'Access critical info anywhere', '#kit', '▣']
  ];
  return h('section', { className: 'target-shortcuts' }, cards.map(([title, detail, href, icon]) => h('a', { key: title, href, className: 'target-shortcut-card glass' }, h('span', null, icon), h('div', null, h('strong', null, title), h('small', null, detail)), h('b', null, '›'))));
}
function DashboardAccountsPreview() {
  const names = ['Google', 'Instagram', 'Coinbase', 'Amazon', 'Slack'];
  const accounts = names.map((name) => safeAccounts().find((account) => account.name === name)).filter(Boolean);
  return h('section', { className: 'panel glass target-accounts-card', id: 'accounts' }, h('div', { className: 'panel-head target-card-head' }, h('p', { className: 'eyebrow' }, 'Your Accounts'), h('a', { href: '#accounts' }, 'View all')), accounts.map((account) => {
    const review = scoreFor(account) < 80;
    const deviceCount = account.deviceVerification === 'Trusted' ? 2 : account.deviceVerification ? 1 : 0;
    const mfa = account.passkeyStatus || account.authenticator || 'Missing';
    return h('a', { key: account.id || account.name, href: '#account-detail', className: 'target-account-row', onClick: () => setState({ selectedAccountId: account.id }) },
      h('span', { className: `app-icon brand-icon brand-${brandSlug(account.name)}`, style: { '--brand-color': account.color } }, brandMark(account.name)),
      h('div', { className: 'account-primary' }, h('strong', null, account.name), h('small', null, account.handle || account.recoveryEmail)),
      h('b', { className: review ? 'review' : 'secure' }, review ? 'Review' : 'Secure'),
      h('span', { className: 'account-meta-chip' }, `Updated ${account.lastReviewed || 'Today'}`),
      h('span', { className: 'account-meta-chip' }, `${deviceCount} devices`),
      h('span', { className: 'account-meta-chip' }, mfa),
      h('i', null, '›')
    );
  }));
}
function CompanyLogoGrid() {
  const accounts = safeAccounts().slice(0, 14);
  return h('section', { className: 'company-logo-grid glass', 'aria-label': 'Protected companies' },
    accounts.map((account) => h('span', { key: account.id || account.name, className: `app-icon brand-icon brand-${brandSlug(account.name)}`, style: { '--brand-color': account.color }, title: account.name }, brandMark(account.name)))
  );
}
function SecurityAlertsPanel() {
  const alerts = notificationItems().slice(0, 3);
  return h('article', { className: 'security-alerts-card glass' },
    h('span', null, 'Security Alerts'),
    h('strong', { className: 'animated-counter' }, alerts.length),
    h('small', null, alerts[0]?.title || 'No urgent alerts'),
    h('div', { className: 'mini-alert-list' }, alerts.map((alert) => h('i', { key: alert.id || alert.title }, alert.title)))
  );
}
function DashboardUtilities() {
  const accounts = safeAccounts();
  const deviceCount = safeArray(state.devices).length || accounts.filter((account) => account.deviceVerification).length || 1;
  const vaultStats = [
    ['Vault Summary', vaultItems().length || accounts.length],
    ['Backup Codes', accounts.filter((account) => account.backupCodes).length],
    ['Passkeys', accounts.filter((account) => account.passkeyStatus).length]
  ];
  return h('section', { className: 'desktop-utility-grid' },
    h('article', { className: 'device-card glass' }, h('span', null, 'Devices'), h('strong', null, deviceCount), h('small', null, state.isOffline ? 'Offline review' : 'Trusted workspace')),
    vaultStats.map(([label, value]) => h('article', { key: label, className: 'vault-stat-card glass' }, h('span', null, label), h('strong', { className: 'animated-counter' }, value), h('small', null, 'Live workspace metric'))),
    h(SecurityAlertsPanel)
  );
}

function DashboardFallback() {
  return [h('div', { className: 'desktop-top-grid' }, h(Hero)), h(FeatureShortcuts), h('div', { className: 'lower-grid dashboard-home-grid target-lower-grid' }, h(DashboardAccountsPreview), h(Activity)), h(DashboardUtilities)];
}
function DashboardHome() {
  try {
    return [h('div', { className: 'desktop-top-grid' }, h(Hero)), h(FeatureShortcuts), h(CompanyLogoGrid), h('div', { className: 'lower-grid dashboard-home-grid target-lower-grid' }, h(DashboardAccountsPreview), h(Activity)), h(DashboardUtilities)];
  } catch (error) {
    console.error('Dashboard render recovered with demo fallback', error);
    return h(DashboardFallback);
  }
}

function AppHealthPage() {
  const memory = performance?.memory ? `${Math.round(performance.memory.usedJSHeapSize / 1048576)} MB` : 'Unavailable';
  const rows = [
    ['App Version', buildVersion()], ['Firebase Status', state.firebaseReady ? 'Ready' : 'Fallback mode'], ['Storage Usage', `${safeAccounts().length} accounts · ${state.backupCodes.length} backup records`], ['IndexedDB', 'Browser managed'], ['Live Sync', usingLiveAccounts() ? 'Connected' : 'Not connected'], ['User ID', state.user?.uid || 'Signed out'], ['Browser', navigator.userAgent.split(' ').slice(0, 3).join(' ')], ['OS', navigator.platform || 'Unknown'], ['Memory estimate', memory], ['Build timestamp', buildInfo().buildVersion || 'local']
  ];
  return h('section', { className: 'panel glass dedicated-page app-health-page', id: 'app-health' }, h('p', { className: 'eyebrow' }, 'Diagnostics'), h('h2', null, 'App health'), h('div', { className: 'status-grid' }, rows.map(([label, value]) => h('article', { key: label }, h('span', null, label), h('strong', null, value)))));
}
function GlobalLoading() { return state.pageLoading ? h('div', { className: 'global-loading glass', role: 'status', 'aria-live': 'polite' }, h('span'), h('strong', null, 'Loading SecureSwitch')) : null; }
function SuccessMoment() { return state.successPulse ? h('div', { className: 'success-moment', role: 'status', 'aria-live': 'polite' }, h('span', null, '✓'), h('strong', null, state.successPulse)) : null; }

function routeRequiresAuth(route) { return state.firebaseReady && !state.user && !['dashboard', 'settings', 'notifications'].includes(route); }
function ProtectedRouteNotice() { return h('section', { className: 'panel glass protected-route', role: 'status' }, h('p', { className: 'eyebrow' }, 'Protected route'), h('h2', null, 'Sign in to open live workspace data'), h('p', null, 'Closed beta routes use Firebase Authentication before reading or writing private account recovery records.'), h(AuthCard)); }
function PageContent() {
  const route = currentRoute();
  const pages = {
    dashboard: () => h(DashboardHome),
    landing: () => h(LandingPage),
    accounts: () => [h(Accounts), h(AccountForm)],
    'account-detail': () => h(AccountDetailPage),
    switch: () => h(SwitchMode),
    blackout: () => h(BlackoutMode),
    kit: () => h(EmergencyKit),
    lookup: () => h(RecoveryLookup),
    devices: () => h(DeviceCenterPage),
    'recovery-center': () => h(RecoveryCenterPage),
    'security-audit': () => h(SecurityAuditPage),
    premium: () => h(PremiumFeaturesPage),
    'dark-web': () => h(DarkWebMonitoringPage),
    'family-protection': () => h(FamilyProtectionPage),
    'emergency-mode': () => h(EmergencyRecoveryModePage),
    'secure-vault': () => h(SecureVaultPage),
    organization: () => h(BusinessDashboardPage),
    'ai-recovery-coach': () => h(AIRecoveryCoachPage),
    'security-center': () => h(ProductionSecurityCenter),
    billing: () => h(BillingSubscriptionsPanel),
    settings: () => h(Settings),
    notifications: () => h(NotificationCenterPage),
    'import-export': () => h(ImportExportCenter),
    'app-health': () => h(AppHealthPage),
    admin: () => h(ProductionAdminDashboard)
  };
  if (routeRequiresAuth(route)) return h(ProtectedRouteNotice);
  return (pages[route] || pages.dashboard)();
}

function Dashboard() {
  return h('main', { className: 'dashboard page-transition', 'data-route': currentRoute() },
    h('div', { className: 'main-column app-page-shell' }, h(TopActions), h(PageContent), currentRoute() !== 'dashboard' && h(DemoModeBanner)),
    h('aside', { className: 'dashboard-side' }, h('section', { className: 'right-protection-panel glass' }, h(ProtectionScore), h(ProtectedStatus), h(QuickActions), h('section', { className: 'readiness-card glass' }, h('p', { className: 'eyebrow' }, 'Recovery Readiness'), h('div', { className: 'readiness-line' }, h('span', { style: { width: `${averageScore()}%` } })), h('strong', null, `${averageScore()}%`), h('small', null, averageScore() >= 80 ? 'You’re ready for the unexpected. Keep it up!' : 'Review required before your next emergency.'))))
  );
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

function AISecurityCopilot() {
  const context = { accounts: state.accounts, devices: state.devices, activity: state.activityFeed, notifications: notificationItems(), auditEvents: state.auditEvents };
  const recs = generateSecurityRecommendations(state.accounts, state.devices).slice(0, 3);
  const ask = (question = state.aiCopilotQuestion) => setState({ aiCopilotQuestion: question, aiCopilotAnswer: answerSecurityQuestion(question, context) });
  return h('aside', { className: `ai-copilot ${state.aiCopilotOpen ? 'open' : ''}`, 'aria-label': 'AI Security Copilot' },
    h('button', { className: 'ai-copilot-trigger primary', onClick: () => setState({ aiCopilotOpen: !state.aiCopilotOpen }), 'aria-expanded': state.aiCopilotOpen }, state.aiCopilotOpen ? 'Close Copilot' : 'AI Copilot'),
    state.aiCopilotOpen && h('section', { className: 'ai-copilot-panel glass', role: 'dialog', 'aria-label': 'Ask AI Security Copilot' },
      h('div', { className: 'panel-head' }, h('div', null, h('p', { className: 'eyebrow' }, 'AI Security Copilot'), h('h2', null, 'Ask about your recovery risk')), h('span', null, `${explainableSecurityScore(state.accounts).score}%`)),
      h('form', { onSubmit: (event) => { event.preventDefault(); ask(); } }, h('input', { value: state.aiCopilotQuestion, onChange: (event) => setState({ aiCopilotQuestion: event.target.value }), placeholder: 'Ask which account to fix first…', 'aria-label': 'Ask AI Security Copilot' }), h('button', { className: 'primary' }, 'Ask')),
      h('div', { className: 'copilot-prompts' }, ['Which accounts are weakest?', 'Show accounts missing recovery methods.', 'What should I fix first?', 'Which devices are risky?', 'Generate a recovery checklist.', 'Explain why my score is low.'].map((prompt) => h('button', { key: prompt, onClick: () => ask(prompt) }, prompt))),
      h('pre', { className: 'copilot-answer' }, state.aiCopilotAnswer || answerSecurityQuestion('What should I fix first?', context)),
      h('div', { className: 'recommendation-stack compact' }, recs.map((item) => h('article', { key: `${item.accountName}-${item.reason}`, className: `priority-${item.severity.toLowerCase()}` }, h('b', null, item.severity), h('strong', null, item.accountName), h('small', null, `${item.reason} · ${item.recommendedAction} · +${item.estimatedImprovement}`), h('button', { onClick: () => { location.hash = 'account-detail'; toast(`${item.recommendedAction} opened`); } }, 'Fix Now'))))
    )
  );
}

function App() {
  return h('div', { className: 'app-shell' },
    h(Sidebar),
    h('section', { className: 'content-shell' },
      h(OnboardingWizard),
      h(CommandPalette),
      h(UpgradeModal),
      h(GlobalLoading),
      h(Dashboard),
      h(AISecurityCopilot),
      h(SuccessMoment),
      h('div', { className: 'toast ' + (state.toast ? 'show' : ''), role: 'status', 'aria-live': 'polite' }, state.toast)
    )
  );
}

async function boot() {
  React = await import('https://esm.sh/react@18.3.1');
  const { createRoot } = await import('https://esm.sh/react-dom@18.3.1/client');
  root = createRoot(document.getElementById('root'));
  window.addEventListener('online', () => { setState({ isOffline: false }); toast('SecureSwitch is back online'); });
  window.addEventListener('offline', () => { setState({ isOffline: true }); toast('Offline mode active'); });
  window.addEventListener('hashchange', () => { setState({ pageLoading: true, route: (location.hash || '#dashboard').replace('#', '') || 'dashboard' }); window.setTimeout(() => setState({ pageLoading: false }), 180); });
  window.addEventListener('keydown', (event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setState({ commandPaletteOpen: !state.commandPaletteOpen }); } if (event.key === 'Escape') setState({ commandPaletteOpen: false }); });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  await loadFirebase();
  render();
}
function render() { if (root) root.render(h(App)); }

boot();
