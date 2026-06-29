import { firebaseConfig } from './firebaseConfig.js';
import { deriveVaultKey, encryptRecord, decryptRecord } from './crypto.js';

const demoAccounts = [
  { name: 'Google', handle: 'keith.harrison@gmail.com', status: 'Secure', color: '#4285f4', category: 'Email', phone: '+1 (415) 555-0184', email: 'keith.harrison@gmail.com', recoveryEmail: 'backup@secureswitch.app', recoveryPhone: '+1 (415) 555-0184', backupCodes: '8 encrypted codes', trustedContacts: 'Alicia Harrison', authenticator: '1Password', ready: true },
  { name: 'Instagram', handle: '@mr3rdward', status: 'Review', color: '#e4405f', category: 'Social', phone: '+1 (415) 555-0184', email: 'social@secureswitch.app', recoveryEmail: 'old-email@example.com', recoveryPhone: '', backupCodes: '', trustedContacts: '', authenticator: 'SMS only', ready: false },
  { name: 'Coinbase', handle: 'keith.harrison.cb.id', status: 'Secure', color: '#0052ff', category: 'Crypto', phone: '+1 (415) 555-0184', email: 'crypto@secureswitch.app', recoveryEmail: 'vault@secureswitch.app', recoveryPhone: '+1 (415) 555-0184', backupCodes: '12 encrypted codes', trustedContacts: 'Alicia Harrison', authenticator: 'YubiKey', ready: true },
  { name: 'Amazon', handle: 'keith.harrison@gmail.com', status: 'Secure', color: '#ff9900', category: 'Shopping', phone: '+1 (212) 555-0110', email: 'keith.harrison@gmail.com', recoveryEmail: 'backup@secureswitch.app', recoveryPhone: '+1 (212) 555-0110', backupCodes: '10 encrypted codes', trustedContacts: 'Priya Shah', authenticator: 'Passkey', ready: true },
  { name: 'Slack', handle: 'keith@picassodesigns.com', status: 'Review', color: '#4a154b', category: 'Business', phone: '+1 (628) 555-0149', email: 'keith@picassodesigns.com', recoveryEmail: 'admin@picassodesigns.com', recoveryPhone: '+1 (628) 555-0149', backupCodes: '', trustedContacts: 'IT admin', authenticator: 'Okta Verify', ready: false }
];
const activity = ['Password changed — Google — 2h ago', 'Recovery email added — Coinbase — 5h ago', 'Account scanned — Instagram — 1d ago', 'Backup code updated — GitHub — 2d ago'];
let React;
let root;

const state = { user: null, auth: null, db: null, firebase: null, vaultKey: null, mode: 'login', accounts: demoAccounts, selectedRecovery: '+1 (415) 555-0184', switchOld: '+1 (415) 555-0184', switchNew: '+1 (628) 555-0149', blackoutArmed: false, toast: 'Ready' };
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
    for (const doc of snapshot.docs) records.push({ id: doc.id, ...(await decryptRecord(state.vaultKey, doc.data())) });
    if (records.length) setState({ accounts: records });
  });
  toast('Encrypted vault unlocked');
}

async function saveAccount(event) {
  event.preventDefault();
  const form = event.currentTarget;
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
function reviewCount() { return state.accounts.filter((account) => account.status === 'Review' || scoreFor(account) < 80).length; }
function linkedAccounts() { return state.accounts.filter((account) => [account.phone, account.email, account.recoveryPhone, account.recoveryEmail].includes(state.selectedRecovery)); }
function switchAccounts() { return state.accounts.filter((account) => account.phone === state.switchOld || account.recoveryPhone === state.switchOld); }

function Sidebar() {
  const links = [['Dashboard', 'dashboard'], ['Accounts', 'accounts'], ['Switch Mode', 'switch'], ['Blackout Mode', 'blackout'], ['Emergency Kit', 'kit'], ['Recovery Lookup', 'lookup'], ['Settings', 'settings']];
  return h('aside', { className: 'sidebar' },
    h('a', { className: 'brand', href: '#dashboard' }, h('span', { className: 'logo' }, 'S'), h('span', null, 'SecureSwitch'), h('b', null, 'PRO')),
    h('nav', null, links.map(([label, id]) => h('a', { key: id, href: `#${id}` }, label))),
    h('article', { className: 'go-pro' }, h('p', { className: 'eyebrow' }, 'Go Pro'), h('h3', null, 'Automate recovery drills.'), h('p', null, 'Family plans, encrypted exports, and AI guidance.'), h('button', { onClick: () => toast('Go Pro coming soon') }, 'Upgrade')),
    h('footer', { className: 'profile' }, h('span', null, 'KH'), h('div', null, h('strong', null, 'Keith Harrison'), h('small', null, 'keith@secureswitch.app')))
  );
}

function AuthCard() {
  return h('section', { className: 'auth-card glass' }, h('h2', null, 'Sign in to sync your encrypted vault'), h('form', { onSubmit: submitAuth }, h('input', { name: 'email', type: 'email', placeholder: 'Email', required: true }), h('input', { name: 'password', type: 'password', placeholder: 'Password', minLength: 6, required: true }), h('button', { className: 'primary full' }, state.mode === 'signup' ? 'Create Account' : 'Login')), h('div', { className: 'auth-actions' }, h('button', { onClick: () => setState({ mode: state.mode === 'signup' ? 'login' : 'signup' }) }, state.mode === 'signup' ? 'Use login' : 'Create account'), h('button', { onClick: () => state.auth ? state.firebase.sendPasswordResetEmail(state.auth, document.querySelector('[name=email]').value) : toast('Configure Firebase first') }, 'Forgot Password')), h('button', { onClick: () => state.auth ? state.firebase.signInWithPopup(state.auth, new state.firebase.GoogleAuthProvider()) : toast('Configure Firebase first') }, 'Continue with Google'), h('button', { onClick: () => state.auth ? state.firebase.signInWithPopup(state.auth, new state.firebase.OAuthProvider('apple.com')) : toast('Configure Firebase first') }, 'Continue with Apple'));
}

function Hero() {
  return h('section', { className: 'hero glass', id: 'dashboard' }, h('div', null, h('p', { className: 'eyebrow' }, 'Premium recovery command center'), h('h1', null, 'Never lose another account again.'), h('p', null, 'SecureSwitch protects your logins, recovery options, and digital identity before disaster strikes.'), h('div', { className: 'hero-actions' }, h('button', { className: 'primary', onClick: () => toast(`Health check complete: ${averageScore()}%`) }, 'Run Health Check'), h('button', { onClick: () => toast('Demo walkthrough coming soon') }, 'Watch Demo'))), h('div', { className: 'safe-visual', 'aria-hidden': true }, h('span', null), h('i', null)));
}

function ProtectionScore() {
  return h('section', { className: 'right-column' }, h('article', { className: 'score-card glass' }, h('div', { className: 'ring', style: { '--score': `${averageScore() * 3.6}deg` } }, h('strong', null, `${averageScore()}%`)), h('h3', null, 'Excellent'), h('div', { className: 'stats' }, h('span', null, `${state.accounts.length} Accounts`), h('span', null, `${reviewCount()} Need Review`), h('span', null, '3m Switch Plan'))), h('article', { className: 'protected glass' }, h('h3', null, 'You’re protected'), h('p', null, 'Great job! Keep your recovery methods up to date.')));
}

function QuickActions() {
  return h('section', { className: 'quick-grid' }, ['Add New Account', 'Run Health Check', 'Generate Backup Codes', 'View Recovery Contacts'].map((label) => h('button', { key: label, className: 'quick-card', onClick: () => toast(label) }, label)));
}

function AccountCard({ account }) {
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

function Activity() { return h('section', { className: 'panel glass' }, h('p', { className: 'eyebrow' }, 'Recent Activity'), activity.map((item) => h('p', { className: 'activity', key: item }, item))); }
function Readiness() { return h('section', { className: 'panel glass' }, h('p', { className: 'eyebrow' }, 'Recovery Readiness'), h('h2', null, `${averageScore()}%`), h('div', { className: 'progress' }, h('span', { style: { width: `${averageScore()}%` } })), h('p', null, 'You’re ready for the unexpected. Keep it up!')); }
function Settings() { return h('section', { className: 'panel glass', id: 'settings' }, h('p', { className: 'eyebrow' }, 'Settings'), h('h2', null, 'Workspace preferences'), ['Dark mode', 'Notifications', 'Privacy', 'Data export'].map((item) => h('label', { key: item }, h('input', { type: 'checkbox', defaultChecked: true }), item))); }

function Dashboard() {
  return h('main', { className: 'dashboard' }, h('div', { className: 'main-column' }, h(Hero), h(QuickActions), h('section', { className: 'shortcut-grid' }, ['Accounts', 'Switch Mode', 'Blackout Mode', 'Emergency Kit'].map((label) => h('a', { key: label, className: 'shortcut glass', href: `#${label.toLowerCase().split(' ')[0]}` }, label))), h(Accounts), h(AccountForm), h(SwitchMode), h(BlackoutMode), h(EmergencyKit), h(RecoveryLookup), h(Settings)), h('aside', { className: 'dashboard-side' }, h(ProtectionScore), h(Activity), h(Readiness)));
}

function App() {
  return h('div', { className: 'app-shell' }, h(Sidebar), h('section', { className: 'content-shell' }, !state.user && h(AuthCard), h('form', { className: 'vault-unlock glass', onSubmit: unlockVault }, h('input', { name: 'passphrase', type: 'password', placeholder: 'Vault passphrase for encrypted sync' }), h('button', { className: 'primary' }, 'Unlock Vault')), h(Dashboard), h('div', { className: 'toast ' + (state.toast ? 'show' : ''), role: 'status', 'aria-live': 'polite' }, state.toast)));
}

async function boot() {
  React = await import('https://esm.sh/react@18.3.1');
  const { createRoot } = await import('https://esm.sh/react-dom@18.3.1/client');
  root = createRoot(document.getElementById('app'));
  await loadFirebase();
  render();
}
function render() { if (root) root.render(h(App)); }

boot();
