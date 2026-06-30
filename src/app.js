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
const familyMembers = [
  { name: 'Dad', score: 92, note: 'Recovery plan verified' },
  { name: 'Mom', score: 81, note: 'Needs backup code refresh' },
  { name: 'Brother', score: 68, note: 'Missing trusted contact' },
  { name: 'Grandma', score: 34, note: '⚠ No recovery phone' }
];
let React;
let root;

const state = { user: null, auth: null, db: null, firebase: null, vaultKey: null, mode: 'login', accounts: demoAccounts, selectedRecovery: '+1 (415) 555-0184', switchOld: '+1 (415) 555-0184', switchNew: '+1 (628) 555-0149', blackoutArmed: false, emergencyActive: false, scanComplete: false, aiStep: 0, timelineFilter: 'All', simulatorScenario: 'My phone was stolen', simulatorRan: false, activeProfile: null, vaultUnlocked: false, toast: 'Ready' };
const h = (...args) => React.createElement(...args);

function hasFirebaseConfig() { return Object.values(firebaseConfig).every(Boolean); }
function setState(patch) { Object.assign(state, patch); render(); }
function toast(message) { setState({ toast: message }); window.setTimeout(() => setState({ toast: '' }), 2200); }

async function loadFirebase() {
  if (!hasFirebaseConfig()) return;
  const [{ initializeApp }, authModule, firestore] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js')
  ]);
  const app = initializeApp(firebaseConfig);
  state.auth = authModule.getAuth(app);
  state.db = firestore.getFirestore(app);
  state.firebase = { ...authModule, ...firestore };
  authModule.onAuthStateChanged(state.auth, (user) => setState({ user }));
}

async function submitAuth(event) {
  event.preventDefault();
  if (!state.auth) return toast('Add Firebase config to enable real auth');
  const email = event.currentTarget.email.value;
  const password = event.currentTarget.password.value;
  if (state.mode === 'signup') await state.firebase.createUserWithEmailAndPassword(state.auth, email, password);
  else await state.firebase.signInWithEmailAndPassword(state.auth, email, password);
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
let React;
let root;

const state = { user: null, auth: null, db: null, firebase: null, vaultKey: null, mode: 'login', accounts: demoAccounts.map(normalizeAccount), selectedRecovery: '+1 (415) 555-0184', switchOld: '+1 (415) 555-0184', switchNew: '+1 (628) 555-0149', blackoutArmed: false, emergencyActive: false, scanComplete: false, aiStep: 0, timelineFilter: 'All', simulatorScenario: 'My phone was stolen', simulatorRan: false, activeProfile: null, vaultUnlocked: false, selectedVaultCategory: 'Recovery Emails', assistantPrompt: 'My phone was stolen', assistantStep: 0, emergencyScenario: 'Phone Stolen', recoveryWizardScenario: 'Phone stolen', recoveryWizardStep: 0, onboardingStep: 0, accountSearch: '', accountCategory: 'All', editingAccountId: '', loading: false, authError: '', dataError: '', toast: 'Ready' };
const h = (...args) => React.createElement(...args);

function hasFirebaseConfig() { return Object.values(firebaseConfig).every(Boolean); }
function setState(patch) { Object.assign(state, patch); render(); }
function toast(message) { setState({ toast: message }); window.setTimeout(() => setState({ toast: '' }), 2200); }

async function loadFirebase() {
  if (!hasFirebaseConfig()) return;
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
  authModule.onAuthStateChanged(state.auth, (user) => setState({ user }));
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
    if (state.mode === 'signup' && credential.user) await state.firebase.sendEmailVerification(credential.user);
    toast(state.mode === 'signup' ? 'Account created. Verification email sent.' : 'Signed in securely');
  } catch (error) {
    setState({ authError: error.message || 'Authentication failed' });
    toast('Authentication needs attention');
  } finally {
    setState({ loading: false });
  }
}

async function unlockVault(event) {
  event.preventDefault();
  if (!state.user || !state.db) return toast('Sign in and configure Firebase first');
  const profileRef = state.firebase.doc(state.db, 'users', state.user.uid);
  const profileSnap = await state.firebase.getDoc(profileRef);
  const salt = profileSnap.exists() ? profileSnap.data().vaultSalt : null;
  const derived = await deriveVaultKey(event.currentTarget.passphrase.value, salt);
  if (!salt) await state.firebase.setDoc(profileRef, { vaultSalt: derived.salt, email: state.user.email }, { merge: true });
  state.vaultKey = derived.key;
  state.firebase.onSnapshot(state.firebase.collection(state.db, 'users', state.user.uid, 'accounts'), async (snapshot) => {
    const records = [];
    for (const doc of snapshot.docs) records.push(normalizeAccount({ id: doc.id, ...(await decryptRecord(state.vaultKey, doc.data())) }));
    for (const doc of snapshot.docs) records.push({ id: doc.id, ...(await decryptRecord(state.vaultKey, doc.data())) });
    if (records.length) setState({ accounts: records });
  });
  toast('Encrypted vault unlocked');
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
    if (state.vaultKey && state.user && state.db && state.editingAccountId) {
      await state.firebase.setDoc(state.firebase.doc(state.db, 'users', state.user.uid, 'accounts', record.id), await encryptRecord(state.vaultKey, record));
      toast(`${record.name} updated encrypted`);
    } else if (state.vaultKey && state.user && state.db) {
      await state.firebase.addDoc(state.firebase.collection(state.db, 'users', state.user.uid, 'accounts'), await encryptRecord(state.vaultKey, record));
      toast(`${record.name} saved encrypted`);
    } else {
      const accounts = state.editingAccountId ? state.accounts.map((account) => account.id === state.editingAccountId ? record : account) : [record, ...state.accounts];
      setState({ accounts, editingAccountId: '' });
      toast(`${record.name} ${state.editingAccountId ? 'updated' : 'added locally'}`);
    }
    form.reset();
  } catch (error) {
    setState({ dataError: error.message || 'Account could not be saved' });
    toast('Account save failed');
  } finally {
    setState({ loading: false });
  }
}

function editAccount(account) { setState({ editingAccountId: account.id }); setTimeout(() => document.getElementById('account-form')?.scrollIntoView({ behavior: 'smooth' }), 0); }
async function deleteAccount(accountId) {
  const account = state.accounts.find((item) => item.id === accountId);
  setState({ accounts: state.accounts.filter((item) => item.id !== accountId) });
  if (state.user && state.db && state.vaultKey) {
    try {
      await state.firebase.deleteDoc(state.firebase.doc(state.db, 'users', state.user.uid, 'accounts', accountId));
    } catch (error) {
      setState({ dataError: error.message || 'Account could not be deleted' });
    }
  }
  toast(`${account?.name || 'Account'} deleted`);
}
function filteredAccounts() {
  const query = state.accountSearch.toLowerCase();
  return state.accounts.filter((account) => (state.accountCategory === 'All' || account.category === state.accountCategory) && [account.name, account.handle, account.recoveryEmail, account.category].join(' ').toLowerCase().includes(query));
}

function scoreFor(account) { return scoreAccount(account); }
function averageScore() { return dashboardSummary(state.accounts).recoveryScore; }
function liveProtectionScore() { return averageScore(); }
  const record = { name: form.name.value, handle: form.handle.value, status: 'Review', color: '#2bb8ff', category: form.category.value, phone: form.phone.value, email: form.email.value, recoveryEmail: form.email.value, recoveryPhone: form.phone.value, backupCodes: form.codes.value, trustedContacts: form.contacts.value, authenticator: form.authenticator.value, ready: false };
  if (state.vaultKey && state.user && state.db) {
    await state.firebase.addDoc(state.firebase.collection(state.db, 'users', state.user.uid, 'accounts'), await encryptRecord(state.vaultKey, record));
    toast(`${record.name} saved encrypted`);
  } else {
    setState({ accounts: [record, ...state.accounts] });
    toast(`${record.name} added locally`);
  }
  form.reset();
}

function scoreFor(account) {
  const checks = [account.email || account.recoveryEmail, account.phone || account.recoveryPhone, account.backupCodes, account.trustedContacts, account.authenticator, account.status === 'Secure' || account.ready];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
function averageScore() { return Math.round(state.accounts.reduce((sum, account) => sum + scoreFor(account), 0) / state.accounts.length) || 0; }
function liveProtectionScore() { return 86; }
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
    { severity: 'High', title: 'Missing backup codes', detail: `${state.accounts.filter((account) => !account.backupCodes).length} accounts have no backup code record.`, why: 'Without backup codes, losing an authenticator can block recovery.', time: '2 min', fix: 'Generate backup codes' },
    { severity: 'Medium', title: 'Missing trusted contacts', detail: `${state.accounts.filter((account) => !account.trustedContacts).length} accounts need a trusted recovery contact.`, why: 'Trusted contacts provide a human fallback during emergencies.', time: '5 min', fix: 'Add trusted contact' },
    { severity: 'Low', title: 'Outdated authenticator methods', detail: `${state.accounts.filter((account) => /sms/i.test(account.authenticator || '')).length} account still depends on SMS-only recovery.`, why: 'SMS is vulnerable to SIM swap attacks.', time: '3 min', fix: 'Upgrade authenticator' }
  ];
}
function runHealthScan() { setState({ scanComplete: true }); toast(`Recovery Health Scan complete: ${averageScore()}%`); }

function Sidebar() {
  const links = [
    ['▦', 'Dashboard', 'dashboard'], ['♙', 'Accounts', 'accounts'], ['⇄', 'Switch Mode', 'switch'],
    ['⌾', 'Blackout Mode', 'blackout'], ['▣', 'Emergency Kit', 'kit'], ['⌕', 'Recovery Lookup', 'lookup'], ['⚙', 'Settings', 'settings'],
    ['✦', 'Health Scan', 'scan'], ['◌', 'Identity Health', 'identity-health'], ['↳', 'Timeline', 'timeline'],
    ['◇', 'Recovery Coach', 'recovery-coach'], ['⌁', 'Simulator', 'simulator'], ['♡', 'Family Mode', 'family']
  ];
  return h('aside', { className: 'sidebar', 'aria-label': 'SecureSwitch navigation' },
    h('a', { className: 'brand', href: '#dashboard' }, h('span', { className: 'logo', 'aria-hidden': true }, '0'), h('span', { className: 'brand-wordmark' }, 'SecureSwitch'), h('b', null, 'PRO')),
    h('nav', null, links.map(([icon, label, id]) => h('a', { key: id, href: `#${id}`, className: id === 'dashboard' ? 'active' : '' }, h('span', { className: 'nav-glyph', 'aria-hidden': true }, icon), h('span', null, label)))),
    h('article', { className: 'go-pro' }, h('p', { className: 'eyebrow' }, '✦ Go Pro'), h('p', null, 'Unlock unlimited accounts, advanced monitoring, and priority recovery.'), h('button', { className: 'primary', onClick: () => toast('Go Pro coming soon') }, 'Upgrade Now')),
    h('footer', { className: 'profile' }, h('span', null, 'KH'), h('div', null, h('strong', null, 'Keith Harrison'), h('small', null, 'keith@secureswitch.app')), h('i', null, '⌄'))
  );
}

function AuthCard() {
  return h('section', { className: 'auth-card glass' }, h('p', { className: 'eyebrow' }, state.user ? 'Authenticated' : 'Firebase Authentication'), h('h2', null, state.user ? `Signed in as ${state.user.email || 'SecureSwitch user'}` : 'Sign in to sync your encrypted vault'), state.authError && h('p', { className: 'error-state' }, state.authError), state.user && h('button', { className: 'primary full', onClick: () => state.firebase.signOut(state.auth) }, 'Secure Logout'), !state.user && h('form', { onSubmit: submitAuth }, h('input', { name: 'email', type: 'email', placeholder: 'Email', required: true }), h('input', { name: 'password', type: 'password', placeholder: 'Password', minLength: 6, required: true }), h('button', { className: 'primary full', disabled: state.loading }, state.loading ? 'Working…' : state.mode === 'signup' ? 'Create Account' : 'Login')), !state.user && h('div', { className: 'auth-actions' }, h('button', { onClick: () => setState({ mode: state.mode === 'signup' ? 'login' : 'signup' }) }, state.mode === 'signup' ? 'Use login' : 'Create account'), h('button', { onClick: () => state.auth ? state.firebase.sendPasswordResetEmail(state.auth, document.querySelector('[name=email]').value) : toast('Configure Firebase first') }, 'Forgot Password')), !state.user && h('button', { onClick: () => state.auth ? state.firebase.signInWithPopup(state.auth, new state.firebase.GoogleAuthProvider()) : toast('Configure Firebase first') }, 'Continue with Google'), !state.user && h('button', { onClick: () => state.auth ? state.firebase.signInWithPopup(state.auth, new state.firebase.OAuthProvider('apple.com')) : toast('Configure Firebase first') }, 'Continue with Apple'), h('p', { className: 'muted' }, `Firestore-ready collections: ${firestoreCollections.join(', ')}`));
  return h('section', { className: 'auth-card glass' }, h('h2', null, 'Sign in to sync your encrypted vault'), h('form', { onSubmit: submitAuth }, h('input', { name: 'email', type: 'email', placeholder: 'Email', required: true }), h('input', { name: 'password', type: 'password', placeholder: 'Password', minLength: 6, required: true }), h('button', { className: 'primary full' }, state.mode === 'signup' ? 'Create Account' : 'Login')), h('div', { className: 'auth-actions' }, h('button', { onClick: () => setState({ mode: state.mode === 'signup' ? 'login' : 'signup' }) }, state.mode === 'signup' ? 'Use login' : 'Create account'), h('button', { onClick: () => state.auth ? state.firebase.sendPasswordResetEmail(state.auth, document.querySelector('[name=email]').value) : toast('Configure Firebase first') }, 'Forgot Password')), h('button', { onClick: () => state.auth ? state.firebase.signInWithPopup(state.auth, new state.firebase.GoogleAuthProvider()) : toast('Configure Firebase first') }, 'Continue with Google'), h('button', { onClick: () => state.auth ? state.firebase.signInWithPopup(state.auth, new state.firebase.OAuthProvider('apple.com')) : toast('Configure Firebase first') }, 'Continue with Apple'));
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
    ['Recovery Emails', 'Protected', 'Jun 29'], ['Phone Numbers', 'Verified', 'Jun 28'], ['Authenticator Apps', 'Hardware-ready', 'Jun 27'],
    ['Passkeys', 'Synced', 'Jun 26'], ['Recovery Codes', 'Sealed', 'Jun 25'], ['Crypto Wallets', 'Cold backup', 'Jun 22'],
    ['Trusted Contacts', 'Ready', 'Jun 20'], ['Family Recovery', 'Shared', 'Jun 18'], ['Digital Will', 'Attorney-ready', 'Jun 16'], ['Emergency Documents', 'Locked', 'Jun 12']
  ];
  return h('section', { className: `premium-vault ${state.vaultUnlocked ? 'unlocked' : 'locked'}`, 'aria-label': 'Interactive encrypted digital vault' },
    h('button', { className: 'vault-stage', onClick: () => { setState({ vaultUnlocked: !state.vaultUnlocked }); toast(state.vaultUnlocked ? 'Digital vault locked' : 'Digital vault unlocked'); }, 'aria-pressed': state.vaultUnlocked },
      h('span', { className: 'vault-glow-ring', 'aria-hidden': true }),
      h('span', { className: 'vault-particles', 'aria-hidden': true }, Array.from({ length: 12 }).map((_, index) => h('i', { key: index, style: { '--p': index } }))),
      h('span', { className: 'vault-body', 'aria-hidden': true },
        h('span', { className: 'vault-door' }, h('span', { className: 'vault-reflection' }), h('span', { className: 'vault-wheel' }), h('span', { className: 'vault-keypad' }, Array.from({ length: 9 }).map((_, index) => h('i', { key: index }))), h('span', { className: 'vault-fingerprint' }), h('span', { className: 'vault-shield' }, '⬟'), h('span', { className: 'vault-lock' }, state.vaultUnlocked ? '🔓' : '🔒')),
        h('span', { className: 'vault-interior' }, 'Encrypted assets')
      ),
      h('span', { className: 'vault-caption' }, state.vaultUnlocked ? 'Vault unlocked — recovery assets visible' : 'Click to unlock encrypted vault')
    ),
    h('div', { className: 'vault-assets', 'aria-live': 'polite' }, assets.map(([name, status, date]) => h('article', { key: name, className: 'vault-asset' }, h('span', { className: 'asset-status' }), h('strong', null, name), h('small', null, `Last updated ${date}`), h('ul', null, ['Encrypted', status, 'Backup verified'].map((item) => h('li', { key: item }, '✓ ', item))), h('b', null, 'AES-256'), h('i', null, state.vaultUnlocked ? '🔓' : '🔒'))))
  );
}

function Hero() {
  return h('section', { className: 'hero glass', id: 'dashboard' }, h('div', { className: 'hero-copy-panel' }, h('p', { className: 'eyebrow' }, '✦ Polished SaaS MVP'), h('h1', null, 'Never lose another account ', h('span', null, 'again.')), h('p', null, 'SecureSwitch protects your logins, recovery options, and digital identity before disaster strikes.'), h('div', { className: 'hero-actions' }, h('button', { className: 'primary', onClick: runHealthScan }, 'Run Health Check'), h('button', { onClick: () => toast('Demo walkthrough coming soon') }, 'Watch Demo'))), h(VaultHeroVisual));
  return h('section', { className: 'hero glass', id: 'dashboard' }, h('div', null, h('p', { className: 'eyebrow' }, '✦ Polished SaaS MVP'), h('h1', null, 'Never lose another account ', h('span', null, 'again.')), h('p', null, 'SecureSwitch protects your logins, recovery options, and digital identity before disaster strikes.'), h('div', { className: 'hero-actions' }, h('button', { className: 'primary', onClick: runHealthScan }, 'Run Health Check'), h('button', { onClick: () => toast('Demo walkthrough coming soon') }, 'Watch Demo'))), h(VaultHeroVisual));
}

function ProtectionScore() {
  return h('aside', { className: 'floating-score glass', 'aria-label': 'Live Protection Score' },
    h('div', null, h('p', { className: 'eyebrow score-title' }, 'Live Protection Score'), h('strong', null, `${liveProtectionScore()}%`), h('span', null, 'Excellent')),
    h('div', { className: 'mini-score-ring', style: { '--score': `${liveProtectionScore() * 3.6}deg` } }),
    h('dl', null, h('div', null, h('dt', null, 'Accounts'), h('dd', null, '50')), h('div', null, h('dt', null, 'Review'), h('dd', null, '9')), h('div', null, h('dt', null, 'Plan'), h('dd', null, '3m')))
  );
}

function ProtectedStatus() {
  return h('article', { className: 'protected glass' }, h('span', { className: 'check-orb' }, '▣'), h('div', null, h('h3', null, 'You’re protected'), h('p', null, 'Great job! Keep your recovery methods up to date.')), h('b', null, '›'));
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
  return h('article', { className: 'account-row' }, h('span', { className: 'app-icon', style: { background: account.color } }, account.name[0]), h('div', null, h('strong', null, account.name), h('small', null, `${account.handle || account.recoveryEmail} · ${account.category} · Reviewed ${account.lastReviewed}`)), h('b', { className: score < 80 ? 'review' : 'secure' }, `${score}% · ${riskLevel(account)} risk`), h('div', { className: 'account-actions' }, h('button', { onClick: () => editAccount(account) }, 'Edit'), h('button', { onClick: () => deleteAccount(account.id) }, 'Delete')));
}

function Accounts() {
  const accounts = filteredAccounts();
  return h('section', { className: 'panel glass', id: 'accounts' }, h('div', { className: 'panel-head' }, h('div', null, h('p', { className: 'eyebrow' }, 'Your Accounts'), h('h2', null, 'Production account registry')), h('span', null, `${accounts.length}/${state.accounts.length} shown`)), state.loading && h('div', { className: 'loading-state' }, h('span'), h('span'), h('span')), state.dataError && h('p', { className: 'error-state' }, state.dataError), h('div', { className: 'account-toolbar' }, h('input', { value: state.accountSearch, onChange: (event) => setState({ accountSearch: event.target.value }), placeholder: 'Search accounts, usernames, recovery emails…', 'aria-label': 'Search accounts' }), h('select', { value: state.accountCategory, onChange: (event) => setState({ accountCategory: event.target.value }), 'aria-label': 'Filter accounts by category' }, ['All', ...accountCategories].map((category) => h('option', { key: category }, category)))), accounts.length ? accounts.map((account) => h(AccountCard, { key: account.id, account })) : h('div', { className: 'empty-state' }, h('strong', null, 'No accounts match this view'), h('p', null, 'Clear the search or add your first account to start calculating recovery health.')));
}

function AccountForm() {
  const editing = state.accounts.find((account) => account.id === state.editingAccountId);
  return h('section', { className: 'panel glass', id: 'account-form' }, h('p', { className: 'eyebrow' }, state.editingAccountId ? 'Edit Account' : 'Import / Add Account'), h('h2', null, state.editingAccountId ? `Editing ${editing?.name || 'account'}` : 'Manual account import'), h('form', { className: 'account-form', onSubmit: saveAccount }, h('input', { name: 'name', placeholder: 'Service name', defaultValue: editing?.name || '', required: true }), h('input', { name: 'handle', placeholder: 'Username', defaultValue: editing?.handle || '' }), h('select', { name: 'category', defaultValue: editing?.category || 'Email' }, accountCategories.map((category) => h('option', { key: category }, category))), h('input', { name: 'email', placeholder: 'Recovery email', defaultValue: editing?.recoveryEmail || '' }), h('input', { name: 'phone', placeholder: 'Recovery phone', defaultValue: editing?.recoveryPhone || '' }), h('input', { name: 'authenticator', placeholder: 'Authenticator status', defaultValue: editing?.authenticator || '' }), h('input', { name: 'passkey', placeholder: 'Passkey status', defaultValue: editing?.passkeyStatus || '' }), h('input', { name: 'codes', placeholder: 'Backup code status', defaultValue: editing?.backupCodes || '' }), h('input', { name: 'contacts', placeholder: 'Trusted contacts', defaultValue: editing?.trustedContacts || '' }), h('input', { name: 'device', placeholder: 'Device verification', defaultValue: editing?.deviceVerification || '' }), h('input', { name: 'reviewed', type: 'date', defaultValue: editing?.lastReviewed || new Date().toISOString().slice(0, 10) }), h('button', { className: 'primary full-span' }, state.editingAccountId ? 'Update Account' : 'Save Account'), state.editingAccountId && h('button', { type: 'button', onClick: () => setState({ editingAccountId: '' }) }, 'Cancel edit')), h('p', { className: 'muted' }, 'CSV import is planned next; manual import creates real editable local records today.'));
  return h('article', { className: 'account-row' }, h('span', { className: 'app-icon', style: { background: account.color } }, account.name[0]), h('div', null, h('strong', null, account.name), h('small', null, account.handle || account.email)), h('b', { className: account.status === 'Review' ? 'review' : 'secure' }, account.status || (scoreFor(account) > 79 ? 'Secure' : 'Review')));
}

function Accounts() {
  return h('section', { className: 'panel glass', id: 'accounts' }, h('div', { className: 'panel-head' }, h('div', null, h('p', { className: 'eyebrow' }, 'Your Accounts'), h('h2', null, 'Protected services')), h('span', null, `${state.accounts.length} total`)), state.accounts.map((account) => h(AccountCard, { key: account.name + account.handle, account })));
}

function AccountForm() {
  return h('section', { className: 'panel glass' }, h('p', { className: 'eyebrow' }, 'Add Account'), h('form', { className: 'account-form', onSubmit: saveAccount }, h('input', { name: 'name', placeholder: 'Account name', required: true }), h('input', { name: 'handle', placeholder: 'Username or ID' }), h('input', { name: 'category', placeholder: 'Category' }), h('input', { name: 'email', placeholder: 'Recovery email' }), h('input', { name: 'phone', placeholder: 'Recovery phone' }), h('input', { name: 'codes', placeholder: 'Backup codes' }), h('input', { name: 'contacts', placeholder: 'Trusted contacts' }), h('input', { name: 'authenticator', placeholder: 'Authenticator method' }), h('button', { className: 'primary full-span' }, 'Save Account')));
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
  const fixes = ['Add Chase recovery codes', 'Verify Apple trusted device', 'Rotate Instagram backup email'];
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
  const scanned = ['Google ✓', 'Apple ✓', 'Coinbase ⚠', 'Instagram ⚠', 'Banking ✓'];
  const breakdown = scoreBreakdown();
  return h('section', { className: 'panel glass scan-panel', id: 'scan' }, h('div', { className: 'panel-head' }, h('div', null, h('p', { className: 'eyebrow' }, 'Recovery Health Scan 2.0'), h('h2', null, 'Analyze my recovery health')), h('button', { className: 'primary', onClick: runHealthScan }, state.scanComplete ? 'Launch guided repair' : 'Analyze my recovery health')), state.scanComplete ? h('div', { className: 'scan-results' }, h('div', { className: 'scan-services' }, scanned.map((item) => h('span', { key: item }, item))), h('div', { className: 'health-breakdown' }, breakdown.map((item) => h(ScoreRing, { key: item.label, item }))), h('h3', null, `Overall Recovery Health ${averageScore()}% — Excellent`), h('p', null, 'This account can be made 100% recoverable by fixing these three items.'), h('div', { className: 'issue-grid' }, issueList().map((issue) => h('article', { className: `issue-card ${issue.severity.toLowerCase()}`, key: issue.title }, h('b', null, issue.severity), h('h3', null, issue.title), h('p', null, issue.detail), h('small', null, issue.why), h('span', null, `Estimated: ${issue.time}`), h('button', { onClick: () => toast(`${issue.fix} workflow started`) }, issue.fix)))), h('strong', { className: 'risk-score' }, `Risk Score: ${riskScore()} / 10`)) : h('p', { className: 'muted' }, 'One click scans every saved account, calculates recovery, authentication, backup, privacy, and identity scores, then builds a repair checklist.'));
}
function EmergencyButton() {
  const steps = ['Revoke active sessions', 'Open Apple and Google recovery links', 'Notify trusted contacts', 'Export emergency checklist', 'Freeze crypto checklist', 'Call carrier', 'Save police report number'];
  return h('section', { className: 'panel glass emergency-panel' }, h('p', { className: 'eyebrow' }, 'Emergency Button'), h('h2', null, 'PHONE STOLEN'), h('div', { className: 'emergency-buttons' }, ['Phone Stolen', 'SIM Swap', 'Email Hacked', 'Lost Authenticator', 'Crypto Wallet Lost', 'Social Media Hacked'].map((scenario) => h('button', { key: scenario, className: state.emergencyScenario === scenario ? 'active' : '', onClick: () => setState({ emergencyScenario: scenario, emergencyActive: true }) }, scenario))), h('p', { className: 'muted' }, `Estimated completion: ${state.emergencyScenario.includes('Crypto') ? '18' : '12'} minutes`), state.emergencyActive && h('ol', { className: 'mini-list emergency-list' }, steps.map((step) => h('li', { key: step }, step))));
  return h('section', { className: 'panel glass emergency-panel' }, h('p', { className: 'eyebrow' }, 'Emergency Button'), h('h2', null, 'PHONE STOLEN'), h('button', { className: 'danger full', onClick: () => setState({ emergencyActive: !state.emergencyActive }) }, state.emergencyActive ? 'Emergency checklist active' : 'Start emergency recovery'), state.emergencyActive && h('ol', { className: 'mini-list emergency-list' }, steps.map((step) => h('li', { key: step }, step))));
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
function Readiness() { return h('section', { className: 'panel glass readiness-panel' }, h('div', { className: 'panel-head' }, h('p', { className: 'eyebrow' }, 'Recovery Readiness'), h('strong', null, `${liveProtectionScore()}%`)), h('div', { className: 'progress' }, h('span', { style: { width: `${liveProtectionScore()}%` } })), h('p', null, 'You’re ready for the unexpected. Keep it up!')); }
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
function Settings() { return h('section', { className: 'panel glass', id: 'settings' }, h('p', { className: 'eyebrow' }, 'Settings'), h('h2', null, 'Workspace preferences'), ['Dark mode', 'Notifications', 'Privacy', 'Data export'].map((item) => h('label', { key: item }, h('input', { type: 'checkbox', defaultChecked: true }), item))); }

function TopActions() { return h('header', { className: 'top-actions' }, h('button', { onClick: () => toast('Theme toggle ready') }, '☾'), h('button', { onClick: () => toast('3 recovery alerts') }, '♧', h('b', null, '3')), h('button', { className: 'primary add-account', onClick: () => location.hash = 'accounts' }, '+ Add Account')); }

function Shortcuts() { const cards = [['♙', 'Accounts', 'Manage and secure all your accounts', 'accounts'], ['⇄', 'Switch Mode', 'Change access in seconds', 'switch'], ['⌾', 'Blackout Mode', 'Lock down and hide your data', 'blackout'], ['▣', 'Emergency Kit', 'Access critical info anywhere', 'kit']]; return h('section', { className: 'shortcut-grid' }, cards.map(([icon, label, copy, id]) => h('a', { key: label, className: 'shortcut glass', href: `#${id}` }, h('span', null, icon), h('div', null, h('strong', null, label), h('small', null, copy)), h('b', null, '›')))); }

function HealthScoreGrid() {
  const summary = dashboardSummary(state.accounts);
  const scores = [
    ['Recovery Readiness', summary.recoveryScore, 'Ready for the unexpected'], ['Identity Health', Math.max(0, summary.recoveryScore - 2), 'Identity packet verified'],
    ['Encryption Strength', state.vaultKey ? 98 : 84, 'AES-GCM vault ready'], ['Cloud Sync', state.user ? 88 : 45, 'Encrypted sync status'],
    ['Recovery Coverage', Math.max(0, 100 - (summary.weakRecoveryAccounts * 12)), 'Accounts mapped'], ['Device Trust', Math.max(60, summary.recoveryScore - 4), 'Trusted devices reviewed']
  const scores = [
    ['Recovery Readiness', 86, 'Ready for the unexpected'], ['Identity Health', 91, 'Identity packet verified'],
    ['Encryption Strength', 98, 'AES-GCM vault active'], ['Cloud Sync', 88, 'Firebase-ready encrypted sync'],
    ['Recovery Coverage', 84, 'Five accounts mapped'], ['Device Trust', 92, 'Trusted devices reviewed']
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
  const messages = ['Your Google account is protected.', 'You still need recovery codes for Chase.', 'Your Apple ID is missing a trusted device.', 'Excellent work. Recovery readiness increased.'];
  return h('aside', { className: 'floating-ai-coach glass', 'aria-label': 'AI Recovery Coach' }, h('p', { className: 'eyebrow' }, 'AI Recovery Coach'), h('strong', null, 'Next best actions'), messages.map((message) => h('p', { key: message }, message)), h('button', { className: 'primary', onClick: runHealthScan }, 'Review fixes'));
}

function Dashboard() {
  return h('main', { className: 'dashboard' },
    h('div', { className: 'main-column' }, h(TopActions), h(Hero), h(Shortcuts), h('div', { className: 'lower-grid' }, h(Accounts), h(Activity)), h(DemoModeBanner), h(OnboardingPanel), h(DashboardSummaryCards), h(HealthScoreGrid), h(IdentityHealthDashboard), h(HealthScan), h(EmergencyButton), h(RecoveryWizardMVP), h(RecoveryCoach), h(EmergencySimulator), h(RecoveryTimeline), h(FamilyMode), h(WeeklyReport), h(RecoveryInsights), h(IdentityDNA), h(RecoveryMap), h(AccountForm), h(SwitchMode), h(BlackoutMode), h(EmergencyKit), h(RecoveryLookup), h(Settings)),
    h('aside', { className: 'dashboard-side' }, h(ProtectionScore), h(ProtectedStatus), h(QuickActions), h(Readiness), h(FloatingAICoach), h(LiveThreatFeed), h(SuggestedFixes))
    h('div', { className: 'main-column' }, h(TopActions), h(Hero), h(HealthScoreGrid), h(Shortcuts), h('div', { className: 'lower-grid' }, h(Accounts)), h(IdentityHealthDashboard), h(HealthScan), h(EmergencyButton), h(RecoveryCoach), h(EmergencySimulator), h(RecoveryTimeline), h(FamilyMode), h(WeeklyReport), h(RecoveryInsights), h(IdentityDNA), h(RecoveryMap), h(AccountForm), h(SwitchMode), h(BlackoutMode), h(EmergencyKit), h(RecoveryLookup), h(Settings)),
    h('aside', { className: 'dashboard-side' }, h(Activity), h(FloatingAICoach), h(Readiness), h(QuickActions), h(EmergencyKitSummary), h(SuggestedFixes), h(LiveThreatFeed), h(ProtectedStatus))
  );
}

function SyncAndAuthPanel() {
  return h('section', { className: 'sync-auth-grid', id: 'auth-sync' },
    h(AuthCard),
    !state.user && h(AuthCard),
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
    h(ProtectionScore),
    h('section', { className: 'content-shell' },
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
  await loadFirebase();
  render();
}
function render() { if (root) root.render(h(App)); }

boot();
