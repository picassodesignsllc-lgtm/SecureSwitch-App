import { firebaseConfig } from './firebaseConfig.js';
import { deriveVaultKey, encryptRecord, decryptRecord } from './crypto.js';
import { accountCategories, firestoreCollections, normalizeAccount, scoreAccount, riskLevel, recommendationsFor, dashboardSummary } from './recoveryEngine.js';

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
const demoOrganizations = [
  { id: 'family', name: 'Harrison Family Vault', role: 'Owner', members: 4, vaults: 3, activity: 'Recovery kit shared', permission: 'Full access' },
  { id: 'studio', name: 'Picasso Designs Studio', role: 'Admin', members: 12, vaults: 6, activity: 'Slack recovery updated', permission: 'Manage accounts' }
];
const orgRoles = ['Owner', 'Admin', 'Manager', 'Member', 'Read Only'];
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
const onboardingSteps = ['Understand SecureSwitch', 'Add first account', 'Add recovery email and phone', 'Add backup codes', 'Add trusted contact', 'Get first recovery score'];
const productionCollections = ['accounts', 'recoveryMethods', 'trustedContacts', 'backupCodes', 'securityAlerts', 'recoveryTimeline', 'emergencyKits', 'settings'];
const launchChecklist = [
  ['Firebase project required', 'Required before live launch'],
  ['Auth providers required', 'Email, Google, and Apple must be enabled'],
  ['Firestore rules required', 'Deploy user-scoped rules before public traffic'],
  ['GitHub Pages deploy required', 'Build artifact must publish from build/dist'],
  ['Stripe not connected yet', 'Do not accept payments until Phase 6+ billing work'],
  ['AI coach not connected yet', 'Current coach is deterministic and local']
];
const accountTemplates = ['Google', 'Apple', 'Instagram', 'Facebook', 'Coinbase', 'Amazon', 'Discord', 'Slack', 'Microsoft', 'Custom Account'];
const onboardingAccountOptions = ['Google', 'Apple', 'Facebook', 'Instagram', 'Microsoft', 'Amazon', 'Discord', 'Slack', 'Coinbase', 'Custom'];
let accountUnsubscribe;
let collectionUnsubscribes = [];
let React;
let root;
function onboardingSeen() { try { return localStorage.getItem('secureswitch:onboarded') === 'yes'; } catch { return false; } }
function rememberOnboarding() { try { localStorage.setItem('secureswitch:onboarded', 'yes'); } catch { /* Ignore private browsing storage failures. */ } }

const state = { user: null, auth: null, db: null, firebase: null, firebaseReady: false, vaultKey: null, mode: 'login', userProfile: null, accounts: demoAccounts.map(normalizeAccount), recoveryMethods: [], trustedContacts: [], backupCodes: [], securityAlerts: [], recoveryTimeline: timelineEvents, emergencyKits: [], settings: {}, selectedRecovery: '+1 (415) 555-0184', switchOld: '+1 (415) 555-0184', switchNew: '+1 (628) 555-0149', blackoutArmed: false, emergencyActive: false, scanComplete: false, aiStep: 0, timelineFilter: 'All', simulatorScenario: 'My phone was stolen', simulatorRan: false, activeProfile: null, vaultUnlocked: false, selectedVaultCategory: 'Recovery Emails', assistantPrompt: 'My phone was stolen', assistantStep: 0, emergencyScenario: 'Phone Stolen', recoveryWizardScenario: 'Phone stolen', recoveryWizardStep: 0, accountSearch: '', accountCategory: 'All', editingAccountId: '', loading: false, authError: '', dataError: '', exportStatus: '', importStatus: '', onboardingOpen: !onboardingSeen(), onboardingStep: 0, onboardingProtection: 'Advanced', onboardingAccounts: ['Google', 'Apple', 'Instagram'], vaultCreating: false, onboardingComplete: false, globalSearch: '', notificationsRead: [], adminVisible: false, organizations: demoOrganizations, selectedOrgRole: 'Member', inviteEmail: '', productTourStep: 0, commandPaletteOpen: false, selectedAccountId: '', reportType: 'Recovery Report', waitlistStatus: '', waitlistReferral: '', importSource: 'CSV', isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false, securityEvents: [], toast: 'Ready' };
const h = (...args) => React.createElement(...args);

function hasFirebaseConfig() { return Object.values(firebaseConfig).every(Boolean); }
function setState(patch) { Object.assign(state, patch); render(); }
function toast(message) { setState({ toast: message }); window.setTimeout(() => setState({ toast: '' }), 2200); }
function firstName() { return state.userProfile?.displayName?.split(' ')[0] || state.user?.displayName?.split(' ')[0] || state.user?.email?.split('@')[0] || 'there'; }
function usingLiveAccounts() { return Boolean(state.user && state.db && state.firebaseReady); }
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
  return state.firebase.doc(state.db, 'users', user.uid, pathName, docId);
}
async function writeUserScopedDoc(collectionName, docId, data) {
  requireLiveUser();
  const payload = { ...data, updatedAt: state.firebase.serverTimestamp ? state.firebase.serverTimestamp() : new Date().toISOString() };
  await state.firebase.setDoc(userDoc(collectionName, docId), payload, { merge: true });
}
async function ensureUserDocument(user) {
  if (!state.db || !state.firebase || !user) return;
  const profile = { email: user.email || '', displayName: user.displayName || user.email || 'SecureSwitch user', photoURL: user.photoURL || '', emailVerified: Boolean(user.emailVerified), lastLoginAt: state.firebase.serverTimestamp ? state.firebase.serverTimestamp() : new Date().toISOString() };
  await state.firebase.setDoc(state.firebase.doc(state.db, 'users', user.uid), profile, { merge: true });
  setState({ userProfile: profile });
}
async function ensureUserScopedCollections(user) {
  if (!state.db || !state.firebase || !user) return;
  const serverTime = state.firebase.serverTimestamp ? state.firebase.serverTimestamp() : new Date().toISOString();
  const base = (...parts) => state.firebase.doc(state.db, 'users', user.uid, ...parts);
  const defaults = [
    ['settings', 'preferences', { darkMode: true, notifications: true, cloudSync: true, exportVault: true, importVault: true, emergencyPin: false, biometricLock: false, createdAt: serverTime }],
    ['recoveryMethods', 'primary', { type: 'Recovery method inventory', status: 'Ready to populate', createdAt: serverTime }],
    ['trustedContacts', 'primary', { name: 'Trusted contact placeholder', status: 'Add a real contact', createdAt: serverTime }],
    ['backupCodes', 'inventory', { status: 'Encrypted backup code inventory ready', count: 0, createdAt: serverTime }],
    ['securityAlerts', 'welcome', { title: 'SecureSwitch live sync enabled', severity: 'Info', status: 'Open', createdAt: serverTime }],
    ['recoveryTimeline', 'welcome', { date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' }), title: 'SecureSwitch account connected', status: 'Done', category: 'Security', createdAt: serverTime }],
    ['emergencyKits', 'default', { title: 'Default emergency kit', status: 'Ready to build', items: ['Trusted contacts', 'Recovery letter', 'Insurance notes'], createdAt: serverTime }],
    ['organizations', 'family-demo', { name: 'Family Vault', role: 'Owner', members: 1, vaults: 1, permission: 'Full access', activity: 'Organization created', createdAt: serverTime }]
  ];
  await Promise.all(defaults.map(([collectionName, docId, data]) => state.firebase.setDoc(base(collectionName, docId), data, { merge: true })));
}
function resetLiveCollections() {
  collectionUnsubscribes.forEach((unsubscribe) => unsubscribe());
  collectionUnsubscribes = [];
  setState({ recoveryMethods: [], trustedContacts: [], backupCodes: [], securityAlerts: [], recoveryTimeline: timelineEvents, emergencyKits: [], organizations: demoOrganizations, settings: {} });
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
  subscribeToUserCollection('backupCodes', 'backupCodes');
  subscribeToUserCollection('securityAlerts', 'securityAlerts');
  subscribeToUserCollection('recoveryTimeline', 'recoveryTimeline', (doc) => ({ id: doc.id, ...doc.data(), date: doc.data().date || 'Today', title: doc.data().title || 'Recovery event', status: doc.data().status || 'Done' }));
  subscribeToUserCollection('emergencyKits', 'emergencyKits');
  subscribeToUserCollection('organizations', 'organizations');
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
    await authModule.setPersistence(state.auth, authModule.browserLocalPersistence);
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
    const credential = state.mode === 'signup'
      ? await state.firebase.createUserWithEmailAndPassword(state.auth, email, password)
      : await state.firebase.signInWithEmailAndPassword(state.auth, email, password);
    if (state.mode === 'signup' && credential.user && !credential.user.emailVerified) await state.firebase.sendEmailVerification(credential.user);
    await ensureUserDocument(credential.user);
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
    const provider = providerName === 'apple' ? new state.firebase.OAuthProvider('apple.com') : new state.firebase.GoogleAuthProvider();
    const credential = await state.firebase.signInWithPopup(state.auth, provider);
    await ensureUserDocument(credential.user);
    toast(`Signed in with ${providerName === 'apple' ? 'Apple' : 'Google'}`);
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
    color: '#2bb8ff'
  });
  try {
    if (usingLiveAccounts()) {
      requireLiveUser();
      if (!state.vaultKey) throw new Error('Unlock your encrypted vault before saving live recovery records.');
      const payload = await encryptRecord(state.vaultKey, serializeAccount(record));
      if (state.editingAccountId) {
        await state.firebase.setDoc(userDoc('accounts', record.id), payload, { merge: true });
        toast(`${record.name} updated in encrypted Firestore`);
      } else {
        await state.firebase.addDoc(userCollection('accounts'), payload);
        toast(`${record.name} saved encrypted to Firestore`);
      }
      await writeUserScopedDoc('recoveryTimeline', `account-${Date.now()}`, { date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' }), title: 'Encrypted recovery record saved', status: 'Done', category: 'Recovery' });
    } else {
      const accounts = state.editingAccountId ? state.accounts.map((account) => account.id === state.editingAccountId ? record : account) : [record, ...state.accounts];
      setState({ accounts, editingAccountId: '' });
      toast(`${record.name} ${state.editingAccountId ? 'updated' : 'added locally'}`);
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
      await writeUserScopedDoc('recoveryTimeline', `delete-${Date.now()}`, { date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' }), title: 'Encrypted recovery record deleted', status: 'Done', category: 'Security' });
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
    toast('Encrypted export ready');
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
function globalSearchResults() {
  const query = state.globalSearch.trim().toLowerCase();
  if (!query) return [];
  const entries = [
    ...state.accounts.map((account) => ({ type: 'Account', label: account.name, detail: [account.handle, account.category, account.recoveryEmail].filter(Boolean).join(' · '), href: '#account-detail', action: () => setState({ selectedAccountId: account.id }) })),
    ...state.recoveryMethods.map((method) => ({ type: 'Recovery Method', label: method.type || method.name || 'Recovery method', detail: method.status || 'Ready', href: '#recovery-center' })),
    ...state.trustedContacts.map((contact) => ({ type: 'Member', label: contact.name || 'Trusted contact', detail: contact.status || 'Trusted recovery contact', href: '#recovery-center' })),
    ...state.organizations.map((org) => ({ type: 'Organization', label: org.name, detail: `${org.role || 'Member'} · ${org.members || 1} members`, href: '#team-vaults' })),
    ...notificationItems().map((note) => ({ type: 'Notification', label: note.title, detail: note.detail, href: '#notifications' })),
    ...['Settings', 'Reports', 'Vault', 'Commands', 'Weekly Report', 'Security Center', 'Recovery Center', 'AI Recovery Coach'].map((label) => ({ type: label === 'Commands' ? 'Command' : 'Page', label, detail: 'SecureSwitch workspace', href: label === 'Reports' ? '#report-generator' : `#${label.toLowerCase().replaceAll(' ', '-')}` }))
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
  toast(`${source} demo import complete`);
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
  const organization = {
    id: `org-${Date.now()}`,
    name: sanitizeInput(form.organization.value || 'SecureSwitch Organization'),
    role: state.selectedOrgRole,
    members: 1,
    vaults: 1,
    activity: 'Shared encrypted vault created',
    permission: state.selectedOrgRole === 'Read Only' ? 'View only' : 'Manage recovery readiness'
  };
  try {
    if (usingLiveAccounts()) await writeUserScopedDoc('organizations', organization.id, organization);
    setState({ organizations: [organization].concat(state.organizations), inviteEmail: '' });
    logSecurityEvent(`${organization.name} organization created`);
    toast('Organization vault created');
  } catch (error) {
    setState({ dataError: safeError(error, 'Organization could not be saved. Demo vault is still available.') });
  }
}
async function inviteOrganizationMember(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const invite = sanitizeInput(form.inviteEmail.value);
  if (!invite) return;
  try {
    if (usingLiveAccounts()) await writeUserScopedDoc('organizationInvites', `invite-${Date.now()}`, { email: invite, role: state.selectedOrgRole, status: 'Pending', createdAt: new Date().toISOString() });
    setState({ inviteEmail: '' });
    logSecurityEvent(`${state.selectedOrgRole} invite sent to ${invite}`);
    toast('Invite prepared');
  } catch (error) {
    setState({ dataError: safeError(error, 'Invite could not be saved. Demo invite is still visible.') });
  }
}
function passwordHealthScore() {
  const totalLoss = state.accounts.reduce((loss, account) => loss + (!account.backupCodes ? 8 : 0) + (!account.authenticator || account.authenticator === 'SMS only' ? 10 : 0) + (!account.recoveryEmail ? 8 : 0) + (!account.recoveryPhone ? 6 : 0) + (riskLevel(account) === 'High' ? 10 : 0), 0);
  return Math.max(35, Math.min(100, 100 - totalLoss));
}
function chartValues() { return [averageScore(), passwordHealthScore(), Math.max(45, 100 - state.securityEvents.length * 6), Math.min(98, 52 + state.emergencyKits.length * 12), 76, 88]; }
function selectedAccount() { return state.accounts.find((account) => account.id === state.selectedAccountId) || state.accounts[0] || normalizeAccount({ name: 'No account selected', category: 'Custom' }); }
function commandPaletteItems() {
  return [
    ['Create Account', 'Add a protected account', () => { location.hash = 'accounts'; toast('Account form ready'); }],
    ['Run Scan', 'Start health scan', runHealthScan],
    ['Export Vault', 'Download encrypted vault export', exportEncryptedRecoveryData],
    ['Invite Member', 'Open team vault invites', () => { location.hash = 'team-vaults'; toast('Invite panel ready'); }],
    ['Generate Report', 'Open production report generator', () => { location.hash = 'report-generator'; toast('Report generator ready'); }],
    ['Dark Mode', 'Theme controls', () => toast('Dark mode is already enabled')],
    ['Notifications', 'Open notification center', () => { location.hash = 'notifications'; }],
    ['Open Settings', 'Workspace preferences', () => { location.hash = 'settings'; }]
  ];
}
function executeCommand(command) { setState({ commandPaletteOpen: false, globalSearch: '' }); command[2](); }
function generateProductionReport(format) {
  const lines = [`Report: ${state.reportType}`, `Recovery Score: ${averageScore()}%`, `Password Health: ${passwordHealthScore()}%`, `Organizations: ${state.organizations.length}`, `Accounts: ${state.accounts.length}`, `Active Alerts: ${unreadNotifications().length}`, `Generated: ${new Date().toISOString()}`];
  if (format === 'csv') downloadTextFile(`secureswitch-${state.reportType.toLowerCase().replaceAll(' ', '-')}.csv`, 'text/csv', lines.join('\n'));
  else if (format === 'json') downloadTextFile(`secureswitch-${state.reportType.toLowerCase().replaceAll(' ', '-')}.json`, 'application/json', JSON.stringify({ reportType: state.reportType, recoveryScore: averageScore(), passwordHealth: passwordHealthScore(), organizations: state.organizations.length, accounts: state.accounts.length, alerts: unreadNotifications().length }, null, 2));
  else downloadTextFile(`secureswitch-${state.reportType.toLowerCase().replaceAll(' ', '-')}.pdf`, 'application/pdf', generatePdf(state.reportType, lines));
  logSecurityEvent(`${state.reportType} ${format.toUpperCase()} generated`);
  toast(`${state.reportType} ${format.toUpperCase()} ready`);
}
function filteredAccounts() {
  const query = state.accountSearch.toLowerCase();
  return state.accounts.filter((account) => (state.accountCategory === 'All' || account.category === state.accountCategory) && [account.name, account.handle, account.recoveryEmail, account.category].join(' ').toLowerCase().includes(query));
}

function scoreFor(account) { return scoreAccount(account); }
function averageScore() { return premiumRecoveryScore(); }
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
function recoveryScoreFactors() {
  const summary = dashboardSummary(state.accounts);
  const stalePasswords = state.accounts.filter((account) => Date.parse(account.lastReviewed || '') < Date.now() - 180 * 86400000).length;
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

function OnboardingWizard() {
  if (!state.onboardingOpen || state.onboardingComplete) return null;
  const step = state.onboardingStep;
  const progress = ((step + 1) / 5) * 100;
  function nextStep() {
    if (step === 3) {
      setState({ vaultCreating: true });
      setTimeout(() => setState({ vaultCreating: false, onboardingStep: 4, vaultUnlocked: true }), 950);
      return;
    }
    if (step === 4) { rememberOnboarding(); setState({ onboardingComplete: true, onboardingOpen: false }); toast('Your Digital Recovery System is online'); return; }
    setState({ onboardingStep: Math.min(step + 1, 4) });
  }
  const content = [
    h('div', { className: 'onboarding-slide' }, h('p', { className: 'eyebrow' }, 'Step 1'), h('h2', null, 'Welcome to SecureSwitch'), h('p', null, 'The intelligence behind every account.')),
    h('div', { className: 'onboarding-slide' }, h('p', { className: 'eyebrow' }, 'Step 2'), h('h2', null, 'Choose your protection level'), h('div', { className: 'choice-grid' }, ['Essential', 'Advanced', 'Maximum'].map((level) => h('button', { key: level, className: state.onboardingProtection === level ? 'selected' : '', onClick: () => setState({ onboardingProtection: level }) }, level)))) ,
    h('div', { className: 'onboarding-slide' }, h('p', { className: 'eyebrow' }, 'Step 3'), h('h2', null, 'Select the accounts you want protected.'), h('div', { className: 'choice-grid account-choice-grid' }, onboardingAccountOptions.map((account) => h('button', { key: account, className: state.onboardingAccounts.includes(account) ? 'selected' : '', onClick: () => { const accounts = state.onboardingAccounts.includes(account) ? state.onboardingAccounts.filter((item) => item !== account) : state.onboardingAccounts.concat(account); setState({ onboardingAccounts: accounts }); } }, account)))) ,
    h('div', { className: 'onboarding-slide vault-create-step' }, h('p', { className: 'eyebrow' }, 'Step 4'), h('h2', null, 'Create your encrypted vault.'), h('div', { className: 'premium-loader' }, h('span'), h('span'), h('span')), h('p', null, state.vaultCreating ? 'Encrypting your recovery system…' : 'AES-GCM vault shell ready.')),
    h('div', { className: 'onboarding-slide success-step' }, h('p', { className: 'eyebrow' }, 'Step 5'), h('h2', null, 'Congratulations.'), h('p', null, 'Your Digital Recovery System is now online.'), h('div', { className: 'success-orb' }, '✓'))
  ];
  return h('section', { className: 'onboarding-wizard glass', role: 'dialog', 'aria-label': 'SecureSwitch onboarding wizard' },
    h('div', { className: 'wizard-progress' }, h('span', { style: { width: `${progress}%` } })),
    content[step],
    h('div', { className: 'wizard-actions' }, h('button', { onClick: () => { rememberOnboarding(); setState({ onboardingOpen: false }); } }, 'Skip for now'), h('button', { className: 'primary', onClick: nextStep, disabled: state.vaultCreating }, state.vaultCreating ? 'Creating…' : step === 4 ? 'Open Dashboard' : 'Continue'))
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
    ['▦', 'Dashboard', 'dashboard'], ['✦', 'Landing', 'landing'], ['✉', 'Waitlist', 'waitlist'], ['◫', 'Vaults', 'team-vaults'], ['♥', 'Referrals', 'referrals'], ['♙', 'Accounts', 'accounts'], ['⇄', 'Switch Mode', 'switch'],
    ['⌾', 'Blackout Mode', 'blackout'], ['▣', 'Emergency Kit', 'kit'], ['⌕', 'Recovery Lookup', 'lookup'], ['⚙', 'Settings', 'settings'],
    ['✦', 'Health Scan', 'scan'], ['◌', 'Identity Health', 'identity-health'], ['↳', 'Timeline', 'timeline'],
    ['▣', 'Account Health', 'account-health'], ['⬟', 'Security Center', 'security-center'], ['◇', 'Recovery Center', 'recovery-center'],
    ['◇', 'AI Coach', 'ai-recovery-coach'], ['●', 'Dark Web', 'dark-web-monitor'], ['🏅', 'Achievements', 'achievements'], ['💳', 'Pricing', 'pricing'], ['🔔', 'Notifications', 'notifications'], ['📊', 'Analytics', 'analytics'], ['⇅', 'Import/Export', 'import-export'], ['§', 'Compliance', 'compliance'], ['◇', 'Recovery Coach', 'recovery-coach'], ['⌁', 'Simulator', 'simulator'], ['♡', 'Family Mode', 'family']
  ];
  return h('aside', { className: 'sidebar', 'aria-label': 'SecureSwitch navigation' },
    h('a', { className: 'brand', href: '#dashboard' }, h('span', { className: 'logo', 'aria-hidden': true }, '0'), h('span', { className: 'brand-wordmark' }, 'SecureSwitch'), h('b', null, 'PRO')),
    h('nav', null, links.map(([icon, label, id]) => h('a', { key: id, href: `#${id}`, className: id === 'dashboard' ? 'active' : '' }, h('span', { className: 'nav-glyph', 'aria-hidden': true }, icon), h('span', null, label)))),
    h('article', { className: 'go-pro' }, h('p', { className: 'eyebrow' }, '✦ Go Pro'), h('p', null, 'Unlock unlimited accounts, advanced monitoring, and priority recovery.'), h('button', { className: 'primary', onClick: () => toast('Go Pro coming soon') }, 'Upgrade Now')),
    h('footer', { className: 'profile' }, h('span', null, 'KH'), h('div', null, h('strong', null, 'Keith Harrison'), h('small', null, 'keith@secureswitch.app')), h('i', null, '⌄'))
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
      h('button', { className: 'primary full', disabled: state.loading }, state.loading ? 'Working…' : state.mode === 'signup' ? 'Create Account' : 'Login')
    ),
    !state.user && h('div', { className: 'auth-actions' },
      h('button', { onClick: () => setState({ mode: state.mode === 'signup' ? 'login' : 'signup' }) }, state.mode === 'signup' ? 'Use login' : 'Create account'),
      h('button', { onClick: () => sendPasswordReset(document.querySelector('.auth-card [name=email]')?.value || '') }, 'Forgot Password')
    ),
    !state.user && h('button', { onClick: () => signInWithProvider('google'), disabled: !state.firebaseReady || state.loading }, 'Sign in with Google'),
    !state.user && h('button', { onClick: () => signInWithProvider('apple'), disabled: !state.firebaseReady || state.loading }, 'Sign in with Apple'),
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
  return h('section', { className: 'hero glass', id: 'dashboard' }, h('div', { className: 'hero-copy-panel' }, h('p', { className: 'eyebrow' }, '✦ Digital Recovery Platform'), h('h1', null, state.user ? `Hello ${firstName()} 👋` : 'Never lose another account ', !state.user && h('span', null, 'again.')), h('p', null, 'SecureSwitch protects your logins, recovery options, and digital identity before disaster strikes.'), h('div', { className: 'hero-actions' }, h('button', { className: 'primary', onClick: runHealthScan }, 'Run Health Check'), h('button', { onClick: () => toast('Demo walkthrough coming soon') }, 'Watch Demo'))), h(VaultHeroVisual));
}

function ProtectionScore() {
  return h('aside', { className: 'floating-score glass', 'aria-label': 'Live Protection Score' },
    h('div', null, h('p', { className: 'eyebrow score-title' }, 'Live Protection Score'), h('strong', null, `${liveProtectionScore()}%`), h('span', null, 'Excellent')),
    h('div', { className: 'mini-score-ring', style: { '--score': `${liveProtectionScore() * 3.6}deg` } }),
    h('dl', null, h('div', null, h('dt', null, 'Accounts'), h('dd', null, state.accounts.length)), h('div', null, h('dt', null, 'Review'), h('dd', null, reviewCount())), h('div', null, h('dt', null, 'Health Check'), h('dd', null, state.scanComplete ? 'Ready' : 'Ready')))
  );
}

function ProtectedStatus() {
  return h('article', { className: 'protected glass' }, h('span', { className: 'check-orb' }, '▣'), h('div', null, h('h3', null, state.user ? `Hello ${firstName()} 👋` : 'You’re protected'), h('p', null, state.user ? `Recovery Score ${averageScore()}% · Accounts ${state.accounts.length} · Health Check Ready` : 'Great job! Keep your recovery methods up to date.')), h('b', null, '›'));
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
  const score = scoreFor(account);
  const passwordAge = Date.parse(account.lastReviewed || '') < Date.now() - 180 * 86400000 ? 'Old password' : 'Current';
  const health = score >= 85 ? 'Excellent' : score >= 67 ? 'Watch' : 'At risk';
  return h('article', { className: 'account-row monitored-account', tabIndex: 0, role: 'button', onClick: () => setState({ selectedAccountId: account.id }), onKeyDown: (event) => { if (event.key === 'Enter') setState({ selectedAccountId: account.id }); } }, h('span', { className: 'app-icon', style: { background: account.color } }, account.name[0]), h('div', null, h('strong', null, account.name), h('small', null, `${account.handle || account.recoveryEmail} · ${account.category} · Reviewed ${account.lastReviewed}`), h('div', { className: 'monitoring-grid' }, [['Risk', riskLevel(account)], ['Health', health], ['Recovery Score', `${score}%`], ['Last Updated', account.lastReviewed], ['MFA Status', account.authenticator || account.passkeyStatus || 'Missing'], ['Password Age', passwordAge], ['Backup Status', account.backupCodes ? 'Saved' : 'Missing'], ['Recovery Contact', account.trustedContacts || 'Missing'], ['Timeline', state.recoveryTimeline.length]].map(([label, value]) => h('span', { key: label }, h('b', null, label), value)))), h('b', { className: score < 80 ? 'review' : 'secure' }, `${score}% · ${riskLevel(account)} risk`), h('div', { className: 'account-actions' }, h('button', { onClick: (event) => { event.stopPropagation(); editAccount(account); } }, 'Edit'), h('button', { onClick: (event) => { event.stopPropagation(); deleteAccount(account.id); } }, 'Delete')));
}

function Accounts() {
  const accounts = filteredAccounts();
  return h('section', { className: 'panel glass', id: 'accounts' }, h('div', { className: 'panel-head' }, h('div', null, h('p', { className: 'eyebrow' }, 'Your Accounts'), h('h2', null, 'Production account registry')), h('span', null, `${accounts.length}/${state.accounts.length} shown`)), state.loading && h('div', { className: 'loading-state' }, h('span'), h('span'), h('span')), state.dataError && h('p', { className: 'error-state' }, state.dataError), h('div', { className: 'account-toolbar' }, h('input', { value: state.accountSearch, onChange: (event) => setState({ accountSearch: event.target.value }), placeholder: 'Search accounts, usernames, recovery emails…', 'aria-label': 'Search accounts' }), h('select', { value: state.accountCategory, onChange: (event) => setState({ accountCategory: event.target.value }), 'aria-label': 'Filter accounts by category' }, ['All', ...accountCategories].map((category) => h('option', { key: category }, category)))), accounts.length ? accounts.map((account) => h(AccountCard, { key: account.id, account })) : h('div', { className: 'empty-state' }, h('strong', null, 'No accounts match this view'), h('p', null, 'Clear the search or add your first account to start calculating recovery health.')));
}

function AccountForm() {
  const editing = state.accounts.find((account) => account.id === state.editingAccountId);
  return h('section', { className: 'panel glass', id: 'account-form' }, h('p', { className: 'eyebrow' }, state.editingAccountId ? 'Edit Account' : 'Import / Add Account'), h('div', { className: 'account-toolbar' }, accountTemplates.map((template) => h('button', { key: template, type: 'button', onClick: () => { setState({ editingAccountId: '' }); setTimeout(() => { const input = document.querySelector('#account-form [name=name]'); if (input) input.value = template === 'Custom Account' ? '' : template; }, 0); } }, `+ Add ${template.replace(' Account', '')}`))), h('h2', null, state.editingAccountId ? `Editing ${editing?.name || 'account'}` : 'Manual account import'), h('form', { className: 'account-form', onSubmit: saveAccount }, h('input', { name: 'name', placeholder: 'Service name', defaultValue: editing?.name || '', required: true }), h('input', { name: 'handle', placeholder: 'Username', defaultValue: editing?.handle || '' }), h('select', { name: 'category', defaultValue: editing?.category || 'Email' }, accountCategories.map((category) => h('option', { key: category }, category))), h('input', { name: 'email', placeholder: 'Recovery email', defaultValue: editing?.recoveryEmail || '' }), h('input', { name: 'phone', placeholder: 'Recovery phone', defaultValue: editing?.recoveryPhone || '' }), h('input', { name: 'authenticator', placeholder: 'Authenticator status', defaultValue: editing?.authenticator || '' }), h('input', { name: 'passkey', placeholder: 'Passkey status', defaultValue: editing?.passkeyStatus || '' }), h('input', { name: 'codes', placeholder: 'Backup code status', defaultValue: editing?.backupCodes || '' }), h('input', { name: 'contacts', placeholder: 'Trusted contacts', defaultValue: editing?.trustedContacts || '' }), h('input', { name: 'device', placeholder: 'Device verification', defaultValue: editing?.deviceVerification || '' }), h('input', { name: 'reviewed', type: 'date', defaultValue: editing?.lastReviewed || new Date().toISOString().slice(0, 10) }), h('button', { className: 'primary full-span' }, state.editingAccountId ? 'Update Account' : 'Save Account'), state.editingAccountId && h('button', { type: 'button', onClick: () => setState({ editingAccountId: '' }) }, 'Cancel edit')), h('p', { className: 'muted' }, state.user ? 'Accounts save to your private Firestore account registry.' : 'Sign in to save accounts to Firestore; local entries stay in this browser until authentication is configured.'));
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
  const kit = state.emergencyKits[0];
  const items = kit?.items || ['Trusted contacts', 'Offline backup codes', 'Recovery letter', 'Insurance notes'];
  return h('section', { className: 'panel glass', id: 'kit' }, h('p', { className: 'eyebrow' }, 'Emergency Kit'), h('h2', null, kit?.title || 'Ready packet'), h('div', { className: 'kit-grid' }, items.map((item) => h('div', { key: item }, h('strong', null, item), h('small', null, kit?.status || 'Ready')))));
}

function EmergencyKitSummary() {
  const kit = state.emergencyKits[0];
  return h('section', { className: 'panel glass emergency-summary' }, h('p', { className: 'eyebrow' }, 'Emergency Kit'), h('h2', null, kit?.status || 'Ready to export'), h('p', null, kit ? `${kit.title}: ${(kit.items || []).join(', ')}` : 'Trusted contacts, offline backup codes, recovery letter, and insurance notes are prepared.'), h('a', { className: 'rail-link', href: '#kit' }, 'Open kit →'));
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
function RecoveryTimeline() { const filters = ['All', 'Security', 'Recovery', 'Emergency', 'Family', 'Identity', 'Passwords', 'Passkeys']; const events = usingLiveAccounts() && state.recoveryTimeline.length ? state.recoveryTimeline : timelineEvents; const filtered = state.timelineFilter === 'All' ? events : events.filter((event) => (event.category || '').toLowerCase() === state.timelineFilter.toLowerCase()); return h('section', { className: 'panel glass timeline-panel', id: 'timeline' }, h('p', { className: 'eyebrow' }, 'Recovery Timeline'), h('h2', null, 'Visual identity history'), h('div', { className: 'filter-row' }, filters.map((filter) => h('button', { key: filter, className: state.timelineFilter === filter ? 'active-filter' : '', onClick: () => setState({ timelineFilter: filter }) }, filter))), h('div', { className: 'timeline-list' }, filtered.map((event) => h('article', { key: event.id || event.title }, h('time', null, event.date || 'Today'), h('span', null, event.title), h('b', null, event.status || 'Done'))))); }
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
function Activity() { const rows = usingLiveAccounts() && state.recoveryTimeline.length ? state.recoveryTimeline.map((event) => `${event.title} — ${event.category || 'SecureSwitch'} — ${event.date || 'Today'}`) : activity; return h('section', { className: 'panel glass activity-panel' }, h('div', { className: 'panel-head' }, h('p', { className: 'eyebrow' }, 'Recent Activity'), h('a', { href: '#timeline' }, 'View all')), rows.map((item) => { const [title, service, time] = item.split(' — '); return h('article', { className: 'activity', key: item }, h('span', null, title.includes('Password') ? '▣' : title.includes('email') ? '✉' : title.includes('scanned') ? '⌗' : '⌁'), h('div', null, h('strong', null, title), h('small', null, service)), h('time', null, time)); })); }
function Readiness() { return h('section', { className: 'panel glass readiness-panel' }, h('div', { className: 'panel-head' }, h('p', { className: 'eyebrow' }, 'Recovery Readiness'), h('strong', null, `${liveProtectionScore()}%`)), h('div', { className: 'progress' }, h('span', { style: { width: `${liveProtectionScore()}%` } })), h('p', null, 'You’re ready for the unexpected. Keep it up!')); }
function notificationItems() {
  return [
    ['Recent Security Alerts', `${dashboardSummary(state.accounts).securityAlerts.length} alerts from score engine`],
    ['Recovery Reminders', `${reviewCount()} accounts need review`],
    ['Password Expiration', `${state.accounts.filter((account) => Date.parse(account.lastReviewed || '') < Date.now() - 180 * 86400000).length} passwords aging`],
    ['Weekly Score Reports', `Recovery score is ${averageScore()}%`],
    ['Successful Backups', `${state.accounts.filter((account) => account.backupCodes).length} accounts have backup codes`],
    ['New Device Logins', state.user ? 'Persistent session active' : 'Demo session only'],
    ['Suspicious Activity', oldPhoneAccounts().length ? 'Old phone number still used' : 'No suspicious changes detected']
  ].map(([title, detail], index) => ({ id: `note-${index}`, title, detail }));
}
function unreadNotifications() { return notificationItems().filter((item) => !state.notificationsRead.includes(item.id)); }
function LandingPage() {
  const faqs = ['How is SecureSwitch different?', 'Do you store passwords?', 'Can I export my vault?', 'Is there a mobile app?'];
  return h('section', { className: 'landing-page glass', id: 'landing' },
    h('div', { className: 'landing-hero' }, h('p', { className: 'eyebrow' }, 'Public Beta'), h('h1', null, 'Digital recovery intelligence for every account.'), h('p', null, 'SecureSwitch helps people prepare before they lose access. Recovery Score, AI coaching, encrypted vault exports, and emergency readiness in one premium dashboard.'), h('a', { className: 'primary landing-cta', href: '#waitlist' }, 'Join the beta')),
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
  const exports = [['Encrypted Backup', 'encrypted'], ['CSV', 'csv'], ['JSON', 'json'], ['PDF', 'pdf'], ['Emergency Recovery Kit', 'emergency-kit']];
  return h('section', { className: 'panel glass import-export-center', id: 'import-export' }, h('p', { className: 'eyebrow' }, 'Import / Export'), h('h2', null, 'Bring recovery data in and take it out safely'), h('form', { className: 'import-form', onSubmit: importAccountsFromSource }, h('select', { name: 'source', value: state.importSource, onChange: (event) => setState({ importSource: event.target.value }) }, imports.map((item) => h('option', { key: item }, item))), h('button', { className: 'primary' }, 'Run demo import')), h('div', { className: 'export-grid' }, exports.map(([label, kind]) => h('button', { key: kind, onClick: () => exportFormat(kind) }, label))));
}
function AnalyticsDashboard() {
  const metrics = [['Daily users', state.user ? 1 : 0], ['Recovery Score average', `${averageScore()}%`], ['Accounts protected', state.accounts.length], ['Vault exports', state.exportStatus ? 1 : 0], ['Recovery kits created', state.emergencyKits.length], ['Premium conversions', 'Demo only']];
  return h('section', { className: 'panel glass analytics-dashboard', id: 'analytics' }, h('p', { className: 'eyebrow' }, 'Analytics'), h('h2', null, 'Public beta launch metrics'), h('div', { className: 'premium-metric-grid' }, metrics.map(([label, value]) => h('article', { key: label }, h('span', null, label), h('strong', null, value)))));
}
function BetaResiliencePanel() {
  return h('section', { className: 'panel glass resilience-panel', id: 'resilience' }, h('p', { className: 'eyebrow' }, 'Reliability & Security'), h('h2', null, state.isOffline ? 'Offline mode active' : 'Network ready'), h('p', null, state.isOffline ? 'SecureSwitch is preserving the dashboard locally until the network returns.' : 'Network detection, retry hooks, input sanitization, rate-limit hooks, security events, auto-lock planning, and friendly errors are active.'), h('button', { onClick: () => { setState({ dataError: '' }); toast('Retry complete'); } }, 'Retry'), h('ul', { className: 'mini-list' }, ['Session expiration hooks', 'Auto logout planning', 'Brute-force protection hooks', 'Input sanitization', 'Rate limit hooks', 'Security event logging'].map((item) => h('li', { key: item }, item))), state.securityEvents.map((event) => h('small', { key: event.id }, `${event.time} · ${event.title}`)));
}


function ProductionCommandCenter() {
  const summary = dashboardSummary(state.accounts);
  const metrics = [
    ['Daily Security Score', `${averageScore()}%`], ['Weekly Security Trends', '+6%'], ['Recent Activity', activity.length], ['Active Alerts', unreadNotifications().length],
    ['Devices Online', Math.max(2, state.accounts.filter((account) => account.authenticator).length)], ['Last Backup', state.exportStatus || '2d ago'], ['Account Risk Overview', `${summary.highRiskAccounts} high risk`], ['Recovery Readiness', `${liveProtectionScore()}%`], ['Premium Usage', 'Pro demo active'], ['Quick Actions', commandPaletteItems().length]
  ];
  return h('section', { className: 'panel glass production-command-center', id: 'production-command-center' }, h('div', { className: 'panel-head' }, h('div', null, h('p', { className: 'eyebrow' }, 'Real App Dashboard'), h('h2', null, 'Production command center')), h('button', { className: 'primary', onClick: () => setState({ commandPaletteOpen: true }) }, 'Open Command Palette')), h('div', { className: 'command-metric-grid' }, metrics.map(([label, value]) => h('article', { key: label }, h('span', null, label), h('strong', null, value)))), h('div', { className: 'live-feed-grid' }, h('article', null, h('strong', null, 'Recent logins'), h('p', null, `${firstName()} · current session · persistent login`)), h('article', null, h('strong', null, 'Recent changes'), h('p', null, state.securityEvents[0]?.title || 'No security changes yet')), h('article', null, h('strong', null, 'Recent backups'), h('p', null, state.exportStatus || 'Encrypted backup ready'))));
}
function AccountDetailPage() {
  const account = selectedAccount();
  const score = scoreFor(account);
  const rows = [['Security score', `${score}%`], ['Password age', Date.parse(account.lastReviewed || '') < Date.now() - 180 * 86400000 ? 'Old password' : 'Current'], ['MFA status', account.authenticator || account.passkeyStatus || 'Missing'], ['Recovery email', account.recoveryEmail || 'Missing'], ['Phone', account.recoveryPhone || account.phone || 'Missing'], ['Backup codes', account.backupCodes || 'Missing'], ['Trusted contacts', account.trustedContacts || 'Missing']];
  return h('section', { className: 'panel glass account-detail-page', id: 'account-detail' }, h('div', { className: 'panel-head' }, h('div', null, h('p', { className: 'eyebrow' }, 'Account Detail Page'), h('h2', null, account.name)), h('button', { onClick: () => exportReport('security') }, 'Export options')), h('div', { className: 'detail-grid' }, rows.map(([label, value]) => h('article', { key: label }, h('span', null, label), h('strong', null, value)))), h('div', { className: 'detail-columns' }, h('article', null, h('h3', null, 'Login history'), h('ul', null, ['Current device login', 'Recovery email verified', 'MFA challenge completed'].map((item) => h('li', { key: item }, item)))), h('article', null, h('h3', null, 'Security timeline'), h('ul', null, ['Password review', 'Backup code audit', 'Trusted contact check'].map((item) => h('li', { key: item }, item)))), h('article', null, h('h3', null, 'AI recommendations'), h('ul', null, recommendationsFor(account).slice(0, 4).map((item) => h('li', { key: item }, item))))));
}
function CommandPalette() {
  if (!state.commandPaletteOpen) return null;
  const commands = commandPaletteItems().filter(([label, detail]) => `${label} ${detail}`.toLowerCase().includes(state.globalSearch.toLowerCase()));
  return h('section', { className: 'command-palette-backdrop', role: 'dialog', 'aria-label': 'Command palette' }, h('div', { className: 'command-palette glass' }, h('div', { className: 'panel-head' }, h('div', null, h('p', { className: 'eyebrow' }, 'CMD + K'), h('h2', null, 'Command Palette')), h('button', { onClick: () => setState({ commandPaletteOpen: false }) }, 'Close')), h('input', { autoFocus: true, value: state.globalSearch, onChange: (event) => setState({ globalSearch: event.target.value }), placeholder: 'Search commands, accounts, settings, reports…' }), h('div', { className: 'command-list' }, commands.map((command) => h('button', { key: command[0], onClick: () => executeCommand(command) }, h('strong', null, command[0]), h('small', null, command[1]))))));
}
function ReportGenerator() {
  const reports = ['Recovery Report', 'Organization Report', 'Security Audit', 'Recovery Readiness', 'Password Health', 'Executive Summary'];
  return h('section', { className: 'panel glass report-generator', id: 'report-generator' }, h('p', { className: 'eyebrow' }, 'Report Generator'), h('h2', null, 'Beautiful production reports'), h('div', { className: 'report-controls' }, h('select', { value: state.reportType, onChange: (event) => setState({ reportType: event.target.value }) }, reports.map((report) => h('option', { key: report }, report))), ['pdf', 'csv', 'json'].map((format) => h('button', { key: format, className: format === 'pdf' ? 'primary' : '', onClick: () => generateProductionReport(format) }, `Export ${format.toUpperCase()}`))), h('div', { className: 'report-preview' }, h('strong', null, state.reportType), h('p', null, `Includes Recovery Score ${averageScore()}%, Password Health ${passwordHealthScore()}%, ${state.organizations.length} organizations, ${state.accounts.length} accounts, and executive-ready recommendations.`)));
}
function ProductionAdminDashboard() {
  return h('section', { className: 'panel glass production-admin-dashboard', id: 'production-admin' }, h('p', { className: 'eyebrow' }, 'Production Admin Panel'), h('h2', null, 'Operational analytics snapshot'), h('div', { className: 'command-metric-grid' }, [['Demo analytics', `${state.accounts.length} accounts`], ['Daily users', state.user ? 1 : 0], ['Organizations', state.organizations.length], ['Recovery score averages', `${averageScore()}%`], ['Premium subscriptions', 'Demo Pro'], ['Active sessions', state.user ? 1 : 0], ['Recent activity', activity.length], ['System status', state.firebaseReady ? 'Firebase ready' : 'Demo mode']].map(([label, value]) => h('article', { key: label }, h('span', null, label), h('strong', null, value)))));
}
function TeamFamilyVaults() {
  return h('section', { className: 'panel glass enterprise-panel team-vaults', id: 'team-vaults' },
    h('div', { className: 'panel-head' }, h('div', null, h('p', { className: 'eyebrow' }, 'Team & Family Vaults'), h('h2', null, 'Shared encrypted recovery workspaces')), h('span', null, `${state.organizations.length} orgs`)),
    h('form', { className: 'enterprise-form', onSubmit: createOrganization }, h('input', { name: 'organization', placeholder: 'Organization or family name', required: true }), h('select', { value: state.selectedOrgRole, onChange: (event) => setState({ selectedOrgRole: event.target.value }) }, orgRoles.map((role) => h('option', { key: role }, role))), h('button', { className: 'primary' }, 'Create organization')),
    h('form', { className: 'enterprise-form', onSubmit: inviteOrganizationMember }, h('input', { name: 'inviteEmail', type: 'email', placeholder: 'Invite member by email', value: state.inviteEmail, onChange: (event) => setState({ inviteEmail: event.target.value }) }), h('button', null, `Invite as ${state.selectedOrgRole}`)),
    h('div', { className: 'enterprise-grid' }, state.organizations.map((org) => h('article', { key: org.id || org.name }, h('strong', null, org.name), h('span', null, org.role || 'Owner'), h('small', null, `${org.members || 1} members · ${org.vaults || 1} shared vaults`), h('p', null, `${org.permission || 'Managed access'} · ${org.activity || 'Activity history ready'}`))))
  );
}
function PasswordHealthCenter() {
  const checks = [['Weak passwords', weakAccounts().length], ['Reused passwords', duplicatedRecoveryEmails()], ['Old passwords', state.accounts.filter((account) => Date.parse(account.lastReviewed || '') < Date.now() - 180 * 86400000).length], ['Missing MFA', state.accounts.filter((account) => !account.authenticator || account.authenticator === 'SMS only').length], ['Missing recovery email', state.accounts.filter((account) => !account.recoveryEmail).length], ['Missing phone', state.accounts.filter((account) => !account.recoveryPhone).length], ['Missing backup codes', state.accounts.filter((account) => !account.backupCodes).length]];
  return h('section', { className: 'panel glass enterprise-panel password-health-center', id: 'password-health' }, h('p', { className: 'eyebrow' }, 'Password Health Center'), h('h2', null, `${passwordHealthScore()}% overall password health`), h('div', { className: 'enterprise-meter' }, h('span', { style: { width: `${passwordHealthScore()}%` } })), h('div', { className: 'enterprise-grid' }, checks.map(([label, count]) => h('article', { key: label }, h('strong', null, count), h('span', null, label), h('small', null, count ? 'Action recommended' : 'Clear')))));
}
function DarkWebMonitor() {
  const rows = [['Email exposure', state.accounts.filter((account) => account.status === 'Review').length ? 'Demo exposure found' : 'No exposure in demo scan'], ['Password breach history', `${weakAccounts().length} accounts need rotation review`], ['Security alerts', `${notificationItems().length} monitored alert categories`]];
  return h('section', { className: 'panel glass enterprise-panel dark-web-monitor', id: 'dark-web-monitor' }, h('p', { className: 'eyebrow' }, 'Dark Web Monitor · Demo Safe'), h('h2', null, 'Exposure intelligence without production APIs'), h('div', { className: 'enterprise-grid' }, rows.map(([label, detail]) => h('article', { key: label }, h('strong', null, label), h('p', null, detail), h('small', null, 'Mock data until breach APIs are connected')))), h('button', { className: 'primary', onClick: () => { logSecurityEvent('Dark web demo scan completed'); toast('Demo exposure scan complete'); } }, 'Run demo scan'));
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
function AIRecoveryCoachPage() {
  const { factors, score } = recoveryScoreFactors();
  const topLosses = factors.filter(([, count]) => count > 0).sort((a, b) => (b[1] * b[2]) - (a[1] * a[2])).slice(0, 3);
  const gain = topLosses.slice(0, 2).reduce((sum, [, count, weight]) => sum + Math.min(18, count * weight), 0);
  const readiness = score >= 85 ? 'High readiness' : score >= 67 ? 'Recoverable with gaps' : 'At-risk recovery posture';
  const cards = [
    ['Analysis', `Your Recovery Score is ${score}%. ${topLosses.length ? `${topLosses[0][0]} is the largest drag on readiness.` : 'No major score losses detected.'}`],
    ['Fastest improvement', `You could gain ${gain || 8} Recovery Score points by ${topLosses.length ? topLosses.map(([label]) => label.toLowerCase()).join(' and ') : 'exporting a fresh recovery kit'}.`],
    ['Readiness estimate', `${readiness}. ${reviewCount()} accounts should be reviewed before an emergency.`],
    ['Missing methods', prioritizedRecommendations().slice(0, 3).map((item) => item.title).join(' · ') || 'No urgent recovery methods missing.'],
    ['Weak setup warning', weakAccounts().length ? `${weakAccounts().length} accounts are weak or marked for review.` : 'No weak account setup detected.']
  ];
  return h('section', { className: 'panel glass premium-page ai-recovery-coach-page', id: 'ai-recovery-coach' }, h('p', { className: 'eyebrow' }, 'AI Recovery Coach'), h('h2', null, 'Conversational recovery intelligence'), h('div', { className: 'ai-card-stack' }, cards.map(([title, copy]) => h('article', { key: title, className: 'ai-chat-card' }, h('b', null, title), h('p', null, copy)))));
}
function PricingPage() {
  const plans = [['FREE', '$0', ['Demo dashboard', 'Basic score', 'Manual exports']], ['PRO', '$9.99/month', ['Encrypted cloud sync', 'AI Recovery Coach', 'Advanced reports']], ['FAMILY', '$19.99/month', ['Family recovery center', 'Trusted contacts', 'Emergency kits']], ['BUSINESS', '$49.99/month', ['Admin analytics', 'Team recovery stats', 'Priority workflows']]];
  return h('section', { className: 'panel glass premium-page pricing-page', id: 'pricing' }, h('p', { className: 'eyebrow' }, 'Premium Subscriptions'), h('h2', null, 'Plans built for recovery readiness'), h('div', { className: 'pricing-grid' }, plans.map(([name, price, features]) => h('article', { key: name, className: name === 'PRO' ? 'featured-plan' : '' }, h('h3', null, name), h('strong', null, price), h('ul', null, features.map((feature) => h('li', { key: feature }, feature))), h('button', { className: 'primary', onClick: () => toast('Stripe is isolated and not connected yet') }, name === 'FREE' ? 'Current demo' : 'Upgrade')))));
}
function NotificationCenterPage() {
  const items = notificationItems();
  return h('section', { className: 'panel glass premium-page notification-center-page', id: 'notifications' }, h('div', { className: 'panel-head' }, h('div', null, h('p', { className: 'eyebrow' }, 'Notification Center'), h('h2', null, 'Signals that keep recovery moving')), h('button', { onClick: () => setState({ notificationsRead: items.map((item) => item.id) }) }, 'Mark all read')), h('div', { className: 'notification-list' }, items.map((item) => h('article', { key: item.id, className: state.notificationsRead.includes(item.id) ? 'read' : '' }, h('div', null, h('strong', null, item.title), h('small', null, item.detail)), h('button', { onClick: () => setState({ notificationsRead: Array.from(new Set(state.notificationsRead.concat(item.id))) }) }, state.notificationsRead.includes(item.id) ? 'Read' : 'Mark read')))));
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
  return h('section', { className: 'panel glass premium-page hidden-admin-panel', id: 'admin-panel' }, h('div', { className: 'panel-head' }, h('div', null, h('p', { className: 'eyebrow' }, 'Hidden Admin'), h('h2', null, 'Demo analytics and feature flags')), h('button', { onClick: () => setState({ adminVisible: !state.adminVisible }) }, state.adminVisible ? 'Hide' : 'Reveal')), state.adminVisible && h('div', { className: 'premium-metric-grid' }, [['Demo analytics', `${state.accounts.length} demo accounts`], ['User counts', state.user ? '1 active user' : '0 live users'], ['Subscription counts', 'Demo only'], ['Recovery statistics', `${averageScore()}% avg score`], ['Feature flags', 'AI coach, exports, pricing'], ['Application version', buildVersion()]].map(([label, value]) => h('article', { key: label }, h('span', null, label), h('strong', null, value)))));
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
    ['Password Age', `${state.accounts.filter((account) => Date.parse(account.lastReviewed || '') < Date.now() - 180 * 86400000).length} old`],
    ['Recovery Issues', issueList().length],
    ['Recommended Actions', dashboardSummary(state.accounts).suggestedNextFixes.length || 1],
    ['Security Timeline', state.recoveryTimeline.length]
  ];
  return h('section', { className: 'panel glass premium-page security-center-page', id: 'security-center' }, h('p', { className: 'eyebrow' }, 'Security Center'), h('h2', null, 'Threats, changes, and recommended actions'), h('div', { className: 'premium-metric-grid' }, rows.map(([label, value]) => h('article', { key: label }, h('span', null, label), h('strong', null, value)))), h('div', { className: 'security-alert-stack' }, alerts.slice(0, 4).map((alert) => h('article', { key: alert.title }, h('b', null, alert.severity || 'Info'), h('span', null, alert.title), h('small', null, alert.status || 'Review')))));
}
function RecoveryCenterPage() {
  const rows = [
    ['Recovery Contacts', state.trustedContacts.length || state.accounts.filter((account) => account.trustedContacts).length],
    ['Recovery Codes', state.backupCodes.length || state.accounts.filter((account) => account.backupCodes).length],
    ['Recovery Email', state.accounts.filter((account) => account.recoveryEmail).length],
    ['Recovery Phone', state.accounts.filter((account) => account.recoveryPhone).length],
    ['Recovery Timeline', state.recoveryTimeline.length],
    ['Encrypted Vault Status', state.vaultKey ? 'Unlocked' : 'Locked']
  ];
  return h('section', { className: 'panel glass premium-page recovery-center-page', id: 'recovery-center' }, h('p', { className: 'eyebrow' }, 'Recovery Center'), h('h2', null, 'Your encrypted recovery operations hub'), h('div', { className: 'premium-metric-grid' }, rows.map(([label, value]) => h('article', { key: label }, h('span', null, label), h('strong', null, value)))), h('div', { className: 'portability-actions' }, h('button', { className: 'primary', onClick: exportEncryptedRecoveryData }, 'Export Vault'), h('label', { className: 'import-button' }, 'Import Vault', h('input', { type: 'file', accept: 'application/json,.json', onChange: importEncryptedRecoveryData }))));
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
    ['Demo mode active', usingLiveAccounts() ? 'No' : 'Yes'],
    ['Build version', buildVersion()],
    ['Deploy mode', deployMode()]
  ];
  return h('section', { className: 'panel glass production-status-panel' }, h('p', { className: 'eyebrow' }, 'Production Status'), h('h2', null, 'Runtime readiness'), h('div', { className: 'status-grid' }, rows.map(([label, value]) => h('article', { key: label }, h('span', null, label), h('strong', null, value)))));
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
function Settings() {
  const options = [['language', 'Language'], ['theme', 'Theme'], ['darkMode', 'Dark Mode'], ['notifications', 'Notifications'], ['accessibility', 'Accessibility'], ['biometricLogin', 'Biometric Login'], ['faceId', 'Face ID'], ['touchId', 'Touch ID'], ['autoLock', 'Auto Lock'], ['sessionTimeout', 'Session Timeout'], ['trustedDevices', 'Trusted Devices'], ['privacy', 'Privacy'], ['security', 'Security'], ['vault', 'Vault'], ['exportVault', 'Export Data'], ['deleteAccount', 'Delete Account'], ['connectedDevices', 'Connected Devices'], ['about', 'About'], ['version', `Version ${buildVersion()}`]];
  return h('section', { className: 'panel glass settings-panel', id: 'settings' },
    h('p', { className: 'eyebrow' }, 'Settings'),
    h('h2', null, 'Workspace preferences'),
    h('div', { className: 'settings-options' }, options.map(([key, label]) => h('label', { key }, h('input', { type: 'checkbox', checked: state.settings[key] ?? true, onChange: async (event) => { const settings = { ...state.settings, [key]: event.target.checked }; setState({ settings }); if (usingLiveAccounts()) { try { await writeUserScopedDoc('settings', 'preferences', settings); } catch (error) { setState({ dataError: safeError(error, 'Settings could not be saved. Please try again.') }); } } } }), label))),
    h(ProductionStatusPanel),
    h(RecoveryDataPortability)
  );
}


function DemoModeBanner() {
  return h('section', { className: 'demo-banner glass', 'aria-label': state.user ? 'Live Firestore data mode' : 'Demo mode' }, h('strong', null, state.user ? 'Live Digital Recovery Platform' : 'Demo Mode'), h('span', null, state.user ? 'SecureSwitch is reading and writing your private Firestore recovery records.' : 'You are viewing polished sample data. Sign in to switch to your own encrypted records.'), h('small', null, 'Privacy-first: SecureSwitch stores recovery planning data. Never store raw passwords.'));
}

function OnboardingPanel() {
  return h('section', { className: 'panel glass onboarding-panel', id: 'onboarding' }, h('div', { className: 'panel-head' }, h('div', null, h('p', { className: 'eyebrow' }, 'MVP Onboarding'), h('h2', null, 'Get fully recoverable in minutes')), h('span', null, `${state.onboardingStep + 1}/${onboardingSteps.length}`)), h('ol', { className: 'onboarding-steps' }, onboardingSteps.map((step, index) => h('li', { key: step, className: index <= state.onboardingStep ? 'done' : '' }, h('span', null, index + 1), step))), h('button', { className: 'primary', onClick: () => setState({ onboardingStep: Math.min(state.onboardingStep + 1, onboardingSteps.length - 1) }) }, state.onboardingStep === onboardingSteps.length - 1 ? `Score ready: ${averageScore()}%` : 'Continue setup'));
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
        h('a', { key: `${result.type}-${result.title || result.label}`, href: result.href || (result.type === 'Account' ? '#accounts' : '#settings') }, h('b', null, result.type), h('span', null, result.title || result.label), h('small', null, result.detail))
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

function Dashboard() {
  return h('main', { className: 'dashboard' },
    h('div', { className: 'main-column' }, h(TopActions), h(Hero), h(ProductionCommandCenter), h(AccountDetailPage), h(ReportGenerator), h(ProductionAdminDashboard), h(LandingPage), h(TeamFamilyVaults), h(PasswordHealthCenter), h(DarkWebMonitor), h(EnterpriseSecurityTimeline), h(ReferralGrowthDashboard), h(AchievementsPanel), h(LiveStatusPage), h(DataVisualizationStudio), h(ProductTourPanel), h(ProductionSetupChecklist), h(BetaResiliencePanel), h(LiveScoreEnginePanel), h(AIRecoveryCoachPage), h(PricingPage), h(WaitlistPage), h(NotificationCenterPage), h(SmartRecommendationsPanel), h(AnalyticsDashboard), h(ExportCenterPage), h(ImportExportCenter), h(CompliancePages), h(Shortcuts), h('div', { className: 'lower-grid' }, h(Accounts), h(Activity)), h(DemoModeBanner), h(OnboardingPanel), h(DashboardSummaryCards), h(HealthScoreGrid), h(IdentityHealthDashboard), h(HealthScan), h(EmergencyButton), h(RecoveryWizardMVP), h(RecoveryCoach), h(EmergencySimulator), h(RecoveryTimeline), h(AccountHealthPage), h(SecurityCenterPage), h(RecoveryCenterPage), h(AdminPanel), h(FamilyMode), h(WeeklyReport), h(RecoveryInsights), h(IdentityDNA), h(RecoveryMap), h(AccountForm), h(SwitchMode), h(BlackoutMode), h(EmergencyKit), h(RecoveryLookup), h(Settings)),
    h('aside', { className: 'dashboard-side' }, h(ProtectionScore), h(ProtectedStatus), h(QuickActions), h(Readiness), h(FloatingAICoach), h(LiveThreatFeed), h(SuggestedFixes))
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

function App() {
  return h('div', { className: 'app-shell' },
    h(Sidebar),
    h('section', { className: 'content-shell' },
      h(OnboardingWizard),
      h(CommandPalette),
      h(Dashboard),
      h(SyncAndAuthPanel),
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
  window.addEventListener('keydown', (event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setState({ commandPaletteOpen: !state.commandPaletteOpen }); } if (event.key === 'Escape') setState({ commandPaletteOpen: false }); });
  await loadFirebase();
  render();
}
function render() { if (root) root.render(h(App)); }

boot();
