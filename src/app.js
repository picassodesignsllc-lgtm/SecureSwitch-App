const accounts = [
  { name: 'Google', password: true, recoveryEmail: 'alex.recovery@secureswitch.test', recoveryPhone: '+1 (415) 555-0184', backupCodes: 8, trustedContact: 'Jordan Lee', authenticator: '1Password', passkey: true, recentVerification: true, notes: 'Recovery key printed and stored offline.' },
  { name: 'Chase', password: true, recoveryEmail: 'finance@secureswitch.test', recoveryPhone: '+1 (415) 555-0184', backupCodes: 0, trustedContact: 'Priya Shah', authenticator: 'SMS fallback', passkey: false, recentVerification: false, notes: 'Old phone still linked.' },
  { name: 'Coinbase', password: true, recoveryEmail: 'crypto@secureswitch.test', recoveryPhone: '+1 (415) 555-0184', backupCodes: 2, trustedContact: 'Jordan Lee', authenticator: 'YubiKey', passkey: true, recentVerification: false, notes: 'Rotate backup codes this week.' },
  { name: 'Apple ID', password: true, recoveryEmail: 'alex.recovery@secureswitch.test', recoveryPhone: '+1 (628) 555-0149', backupCodes: 10, trustedContact: 'Priya Shah', authenticator: 'Apple Passwords', passkey: true, recentVerification: true, notes: 'Recovery key stored in vault.' }
];

const timeline = [
  ['Today', 'Recovery Health Engine calculated a 72 / 100 score.'],
  ['Today', 'Apple ID passkey verification completed.'],
  ['Yesterday', 'Coinbase backup code warning added.'],
  ['Jun 24', 'Priya Shah accepted trusted contact invite.']
];

const healthSignals = [
  ['Password', 'password', 12],
  ['Recovery email', 'recoveryEmail', 14],
  ['Recovery phone', 'recoveryPhone', 14],
  ['Backup codes', 'backupCodes', 14],
  ['Trusted contacts', 'trustedContact', 12],
  ['Authenticator', 'authenticator', 12],
  ['Passkeys', 'passkey', 12],
  ['Recent verification', 'recentVerification', 10]
];

const blackoutSteps = [
  { question: 'Are you dealing with a lost phone or SIM swap right now?', yes: 'Prioritize SIM carrier lockdown.', no: 'Prepare a preventive emergency checklist.' },
  { question: 'Do you need to freeze banks and crypto accounts?', yes: 'Add bank freeze and Coinbase lock tasks.', no: 'Skip financial freeze for now.' },
  { question: 'Should trusted contacts be notified?', yes: 'Notify trusted contacts and export recovery sheet.', no: 'Keep contacts on standby.' }
];
const recoverySteps = [
  { question: 'Do you still have access to your recovery email?', yes: 'Use recovery email as the primary route.', no: 'Route around missing recovery email.' },
  { question: 'Do you have backup codes?', yes: 'Use backup codes before resetting 2FA.', no: 'Flag backup codes as a missing control.' },
  { question: 'Do you have another trusted device?', yes: 'Use trusted device to approve sign-ins.', no: 'Escalate to trusted contact and account support.' }
];

const $ = (selector) => document.querySelector(selector);
const toast = $('#toast');
let blackoutIndex = 0;
let recoveryIndex = 0;
let blackoutPlan = [];
let recoveryPlan = [];

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 2200);
}

function hasSignal(account, key) {
  if (key === 'backupCodes') return account.backupCodes >= 6;
  return Boolean(account[key]);
}

function calculateHealth() {
  let score = 0;
  const rows = healthSignals.map(([label, key, weight]) => {
    const readyCount = accounts.filter((account) => hasSignal(account, key)).length;
    const percent = Math.round((readyCount / accounts.length) * 100);
    const points = Math.round((percent / 100) * weight);
    score += points;
    return { label, key, weight, percent, points };
  });
  score = Math.round(score * 0.85);
  return { score, rows };
}

function recommendationsFrom(rows) {
  return rows
    .filter((row) => row.percent < 80)
    .map((row) => `Improve ${row.label.toLowerCase()} coverage across saved accounts.`)
    .slice(0, 4);
}

function renderHealth() {
  const { score, rows } = calculateHealth();
  $('#hero-score').textContent = `${score} / 100`;
  $('#health-score').textContent = `${score} / 100`;
  $('#hero-score-bar').style.width = `${score}%`;
  $('#hero-score-summary').textContent = `${recommendationsFrom(rows).length} recommendations ready`;
  $('#health-list').innerHTML = rows.map((row) => `<div class="health-row"><span>${row.label}</span><div><i style="width:${row.percent}%"></i></div><strong>${row.percent}%</strong></div>`).join('');
  $('#recommendations').innerHTML = `<h3>Recommendations</h3>${recommendationsFrom(rows).map((item) => `<p>• ${item}</p>`).join('')}`;
}

function renderVault() {
  const vaultGroups = [
    ['Recovery emails', [...new Set(accounts.map((account) => account.recoveryEmail))]],
    ['Recovery phones', [...new Set(accounts.map((account) => account.recoveryPhone))]],
    ['Backup codes', accounts.map((account) => `${account.name}: ${account.backupCodes} codes`)],
    ['Trusted contacts', [...new Set(accounts.map((account) => account.trustedContact))]],
    ['Authenticator apps', [...new Set(accounts.map((account) => account.authenticator))]],
    ['Emergency notes', accounts.map((account) => `${account.name}: ${account.notes}`)]
  ];
  $('#vault-grid').innerHTML = vaultGroups.map(([title, items]) => `<article class="vault-card"><h3>${title}</h3><ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul></article>`).join('');
}

function renderAccounts() {
  const query = $('#account-search').value.trim().toLowerCase();
  const matches = accounts.filter((account) => Object.values(account).some((value) => String(value).toLowerCase().includes(query)));
  $('#account-list').innerHTML = matches.map((account) => `<article class="account-card" tabindex="0"><div class="account-icon">${account.name.charAt(0)}</div><div><strong>${account.name}</strong><span>${account.recoveryEmail} · ${account.recoveryPhone}</span><small>${account.notes}</small></div><span class="pill">${account.passkey ? 'Passkey' : 'No passkey'}</span></article>`).join('') || '<div class="empty-state">No matching recovery records.</div>';
}

function renderTimeline() {
  $('#timeline-list').innerHTML = timeline.map(([date, detail]) => `<li><time>${date}</time><span>${detail}</span></li>`).join('');
}

function renderWizard(kind) {
  const isBlackout = kind === 'blackout';
  const steps = isBlackout ? blackoutSteps : recoverySteps;
  const index = isBlackout ? blackoutIndex : recoveryIndex;
  const question = isBlackout ? $('#blackout-question') : $('#recovery-question');
  const actions = isBlackout ? $('#blackout-actions') : $('#recovery-actions');
  const plan = isBlackout ? $('#blackout-plan') : $('#recovery-plan');
  const currentPlan = isBlackout ? blackoutPlan : recoveryPlan;
  question.textContent = steps[index]?.question || 'Personalized recovery plan generated.';
  actions.innerHTML = steps[index] ? `<button type="button" data-wizard="${kind}" data-answer="yes">Yes</button><button type="button" data-wizard="${kind}" data-answer="no">No</button>` : `<button type="button" data-reset="${kind}">Start over</button>`;
  plan.innerHTML = currentPlan.map((item) => `<li>${item}</li>`).join('');
}

function answerWizard(kind, answer) {
  const isBlackout = kind === 'blackout';
  const steps = isBlackout ? blackoutSteps : recoverySteps;
  const index = isBlackout ? blackoutIndex : recoveryIndex;
  if (!steps[index]) return;
  const response = steps[index][answer];
  if (isBlackout) {
    blackoutPlan.push(response);
    blackoutIndex += 1;
  } else {
    recoveryPlan.push(response);
    recoveryIndex += 1;
  }
  renderWizard(kind);
  showToast('Wizard step saved');
}

function resetWizard(kind) {
  if (kind === 'blackout') {
    blackoutIndex = 0;
    blackoutPlan = [];
  } else {
    recoveryIndex = 0;
    recoveryPlan = [];
  }
  renderWizard(kind);
}

function addAccount(event) {
  event.preventDefault();
  accounts.unshift({
    name: $('#account-name').value,
    password: true,
    recoveryEmail: $('#account-email').value,
    recoveryPhone: $('#account-phone').value,
    backupCodes: $('#account-2fa').value === 'Backup codes' ? 8 : 0,
    trustedContact: $('#account-contact').value,
    authenticator: $('#account-2fa').value,
    passkey: $('#account-2fa').value === 'Passkey',
    recentVerification: true,
    notes: $('#account-note').value
  });
  timeline.unshift(['Just now', `${$('#account-name').value} added to Recovery Vault.`]);
  renderAll();
  showToast('Account saved to demo vault');
}

function setTheme(isDark) {
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  $('#theme-toggle').textContent = isDark ? 'Light mode' : 'Dark mode';
  $('#theme-toggle').setAttribute('aria-pressed', String(isDark));
}

function renderAll() {
  renderHealth();
  renderVault();
  renderAccounts();
  renderTimeline();
}

renderAll();
renderWizard('blackout');
renderWizard('recovery');
setTheme(true);

$('#auth-form').addEventListener('submit', (event) => {
  event.preventDefault();
  showToast(`Magic link placeholder sent to ${$('#auth-email').value}`);
});
$('#onboarding-form').addEventListener('submit', addAccount);
$('#account-search').addEventListener('input', renderAccounts);
$('#start-onboarding').addEventListener('click', () => $('#onboarding').scrollIntoView({ behavior: 'smooth' }));
$('#theme-toggle').addEventListener('click', () => setTheme(document.documentElement.dataset.theme !== 'dark'));
$('#mobile-menu-button').addEventListener('click', () => {
  const expanded = $('#mobile-menu-button').getAttribute('aria-expanded') === 'true';
  $('#mobile-menu-button').setAttribute('aria-expanded', String(!expanded));
  $('#mobile-menu').classList.toggle('open', !expanded);
});
$('#blackout-reset').addEventListener('click', () => resetWizard('blackout'));
$('#recovery-reset').addEventListener('click', () => resetWizard('recovery'));
document.addEventListener('click', (event) => {
  const toastButton = event.target.closest('[data-toast]');
  const wizardButton = event.target.closest('[data-wizard]');
  const resetButton = event.target.closest('[data-reset]');
  if (toastButton) showToast(toastButton.dataset.toast);
  if (wizardButton) answerWizard(wizardButton.dataset.wizard, wizardButton.dataset.answer);
  if (resetButton) resetWizard(resetButton.dataset.reset);
});
document.addEventListener('keydown', (event) => {
  if (event.key === '/' && document.activeElement.tagName !== 'INPUT') {
    event.preventDefault();
    $('#account-search').focus();
  }
});
