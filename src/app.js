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

const state = { user: null, auth: null, db: null, firebase: null, vaultKey: null, mode: 'login', accounts: demoAccounts, selectedRecovery: '+1 (415) 555-0184', switchOld: '+1 (415) 555-0184', switchNew: '+1 (628) 555-0149', blackoutArmed: false, emergencyActive: false, scanComplete: false, aiStep: 0, timelineFilter: 'All', simulatorScenario: 'My phone was stolen', simulatorRan: false, activeProfile: null, toast: 'Ready' };
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
  return h('section', { className: 'auth-card glass' }, h('h2', null, 'Sign in to sync your encrypted vault'), h('form', { onSubmit: submitAuth }, h('input', { name: 'email', type: 'email', placeholder: 'Email', required: true }), h('input', { name: 'password', type: 'password', placeholder: 'Password', minLength: 6, required: true }), h('button', { className: 'primary full' }, state.mode === 'signup' ? 'Create Account' : 'Login')), h('div', { className: 'auth-actions' }, h('button', { onClick: () => setState({ mode: state.mode === 'signup' ? 'login' : 'signup' }) }, state.mode === 'signup' ? 'Use login' : 'Create account'), h('button', { onClick: () => state.auth ? state.firebase.sendPasswordResetEmail(state.auth, document.querySelector('[name=email]').value) : toast('Configure Firebase first') }, 'Forgot Password')), h('button', { onClick: () => state.auth ? state.firebase.signInWithPopup(state.auth, new state.firebase.GoogleAuthProvider()) : toast('Configure Firebase first') }, 'Continue with Google'), h('button', { onClick: () => state.auth ? state.firebase.signInWithPopup(state.auth, new state.firebase.OAuthProvider('apple.com')) : toast('Configure Firebase first') }, 'Continue with Apple'));
}

function Hero() {
  return h('section', { className: 'hero glass', id: 'dashboard' }, h('div', null, h('p', { className: 'eyebrow' }, '✦ Polished SaaS MVP'), h('h1', null, 'Never lose another account ', h('span', null, 'again.')), h('p', null, 'SecureSwitch protects your logins, recovery options, and digital identity before disaster strikes.'), h('div', { className: 'hero-actions' }, h('button', { className: 'primary', onClick: runHealthScan }, 'Run Health Check'), h('button', { onClick: () => toast('Demo walkthrough coming soon') }, 'Watch Demo'))), h('div', { className: 'safe-visual', 'aria-hidden': true }, h('span', null), h('i', null)));
}

function ProtectionScore() {
  return h('section', { className: 'right-column' },
    h('article', { className: 'score-card glass' },
      h('p', { className: 'eyebrow score-title' }, 'Live Protection Score ⓘ'),
      h('div', { className: 'ring', style: { '--score': `${liveProtectionScore() * 3.6}deg` } }, h('strong', null, `${liveProtectionScore()}%`), h('span', null, '▾ Excellent')),
      h('div', { className: 'stats' }, h('span', null, h('strong', null, '50'), 'Accounts'), h('span', null, h('strong', null, '9'), 'Need Review'), h('span', null, h('strong', null, '3m'), 'Switch Plan'))
    ),
    h('article', { className: 'protected glass' }, h('span', { className: 'check-orb' }, '▣'), h('div', null, h('h3', null, 'You’re protected'), h('p', null, 'Great job! Keep your recovery methods up to date.')), h('b', null, '›'))
  );
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

function ScoreRing({ item }) { return h('article', { className: 'mini-ring-card' }, h('div', { className: 'mini-ring', style: { '--ring': `${item.score * 3.6}deg`, '--ring-color': item.color } }, h('strong', null, item.score)), h('h3', null, item.label), h('p', null, item.explanation), h('small', null, item.recommendation)); }
function IdentityHealthDashboard() { return h('section', { className: 'panel glass identity-health', id: 'identity-health' }, h('p', { className: 'eyebrow' }, 'Identity Health'), h('h2', null, 'If you lost access today, would you recover?'), h('div', { className: 'identity-grid' }, scoreBreakdown().concat([{ label: 'Family Readiness', score: 73, color: '#60a5fa', explanation: 'Family members with trusted recovery plans.', recommendation: 'Share emergency kits with trusted family members.' }]).map((item) => h(ScoreRing, { key: item.label, item })))); }
function HealthScan() {
  const scanned = ['Google ✓', 'Apple ✓', 'Coinbase ⚠', 'Instagram ⚠', 'Banking ✓'];
  const breakdown = scoreBreakdown();
  return h('section', { className: 'panel glass scan-panel', id: 'scan' }, h('div', { className: 'panel-head' }, h('div', null, h('p', { className: 'eyebrow' }, 'Recovery Health Scan 2.0'), h('h2', null, 'Analyze my recovery health')), h('button', { className: 'primary', onClick: runHealthScan }, state.scanComplete ? 'Launch guided repair' : 'Analyze my recovery health')), state.scanComplete ? h('div', { className: 'scan-results' }, h('div', { className: 'scan-services' }, scanned.map((item) => h('span', { key: item }, item))), h('div', { className: 'health-breakdown' }, breakdown.map((item) => h(ScoreRing, { key: item.label, item }))), h('h3', null, `Overall Recovery Health ${averageScore()}% — Excellent`), h('p', null, 'This account can be made 100% recoverable by fixing these three items.'), h('div', { className: 'issue-grid' }, issueList().map((issue) => h('article', { className: `issue-card ${issue.severity.toLowerCase()}`, key: issue.title }, h('b', null, issue.severity), h('h3', null, issue.title), h('p', null, issue.detail), h('small', null, issue.why), h('span', null, `Estimated: ${issue.time}`), h('button', { onClick: () => toast(`${issue.fix} workflow started`) }, issue.fix)))), h('strong', { className: 'risk-score' }, `Risk Score: ${riskScore()} / 10`)) : h('p', { className: 'muted' }, 'One click scans every saved account, calculates recovery, authentication, backup, privacy, and identity scores, then builds a repair checklist.'));
}
function EmergencyButton() {
  const steps = ['Revoke active sessions', 'Open Apple and Google recovery links', 'Notify trusted contacts', 'Export emergency checklist', 'Freeze crypto checklist', 'Call carrier', 'Save police report number'];
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
function Settings() { return h('section', { className: 'panel glass', id: 'settings' }, h('p', { className: 'eyebrow' }, 'Settings'), h('h2', null, 'Workspace preferences'), ['Dark mode', 'Notifications', 'Privacy', 'Data export'].map((item) => h('label', { key: item }, h('input', { type: 'checkbox', defaultChecked: true }), item))); }

function TopActions() { return h('header', { className: 'top-actions' }, h('button', { onClick: () => toast('Theme toggle ready') }, '☾'), h('button', { onClick: () => toast('3 recovery alerts') }, '♧', h('b', null, '3')), h('button', { className: 'primary add-account', onClick: () => location.hash = 'accounts' }, '+ Add Account')); }

function Shortcuts() { const cards = [['♙', 'Accounts', 'Manage and secure all your accounts', 'accounts'], ['⇄', 'Switch Mode', 'Change access in seconds', 'switch'], ['⌾', 'Blackout Mode', 'Lock down and hide your data', 'blackout'], ['▣', 'Emergency Kit', 'Access critical info anywhere', 'kit']]; return h('section', { className: 'shortcut-grid' }, cards.map(([icon, label, copy, id]) => h('a', { key: label, className: 'shortcut glass', href: `#${id}` }, h('span', null, icon), h('div', null, h('strong', null, label), h('small', null, copy)), h('b', null, '›')))); }

function Dashboard() {
  return h('main', { className: 'dashboard' },
    h('div', { className: 'main-column' }, h(TopActions), h(Hero), h(Shortcuts), h('div', { className: 'lower-grid' }, h(Accounts), h(Activity)), h(IdentityHealthDashboard), h(HealthScan), h(EmergencyButton), h(RecoveryCoach), h(EmergencySimulator), h(RecoveryTimeline), h(FamilyMode), h(WeeklyReport), h(RecoveryInsights), h(IdentityDNA), h(RecoveryMap), h(AccountForm), h(SwitchMode), h(BlackoutMode), h(EmergencyKit), h(RecoveryLookup), h(Settings)),
    h('aside', { className: 'dashboard-side' }, h(ProtectionScore), h(QuickActions), h(Readiness))
  );
}

function SyncAndAuthPanel() {
  return h('section', { className: 'sync-auth-grid', id: 'auth-sync' },
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
