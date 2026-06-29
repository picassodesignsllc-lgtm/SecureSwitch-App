const accounts = [
  { name: 'Google Workspace', category: 'Password', phone: '+1 (415) 555-0184', email: 'alex.recovery@secureswitch.test', twoFactor: 'Authenticator app', contact: 'Jordan Lee', device: 'MacBook Pro', score: 82, done: true, risk: 'Medium', notes: 'Recovery key printed and stored.' },
  { name: 'Chase Sapphire', category: 'Recovery Phone', phone: '+1 (415) 555-0184', email: 'finance@secureswitch.test', twoFactor: 'SMS fallback', contact: 'Priya Shah', device: 'iPhone 15', score: 58, done: false, risk: 'High', notes: 'Old phone still linked.' },
  { name: 'Coinbase', category: 'Backup Codes', phone: '+1 (415) 555-0184', email: 'crypto@secureswitch.test', twoFactor: 'Hardware key', contact: 'Jordan Lee', device: 'YubiKey 5C', score: 64, done: false, risk: 'High', notes: 'Rotate backup codes this week.' },
  { name: 'Apple ID', category: 'Trusted Contacts', phone: '+1 (628) 555-0149', email: 'alex.recovery@secureswitch.test', twoFactor: 'Passkey', contact: 'Priya Shah', device: 'iPad Air', score: 94, done: true, risk: 'Low', notes: 'Recovery key stored in vault.' },
  { name: 'Instagram', category: 'Authenticator', phone: '+1 (415) 555-0184', email: 'social@secureswitch.test', twoFactor: 'Authenticator app', contact: 'Jordan Lee', device: 'Pixel 8', score: 76, done: true, risk: 'Medium', notes: 'Trusted devices reviewed.' },
  { name: 'Amazon', category: 'Recovery Email', phone: '+1 (212) 555-0110', email: 'shopping@secureswitch.test', twoFactor: 'Passkey', contact: 'Priya Shah', device: 'MacBook Pro', score: 88, done: true, risk: 'Low', notes: 'Passkey and backup email confirmed.' }
];

const healthSignals = [
  ['Password', 84], ['Recovery Email', 78], ['Recovery Phone', 62], ['Backup Codes', 51], ['Trusted Contacts', 74], ['Authenticator', 79]
];
const activities = ['Recovery Health Score recalculated', 'Coinbase backup code warning added', 'Priya Shah accepted trusted contact invite', 'Switch Mode checklist generated'];
const wizardSteps = ['Do you still have your recovery email?', 'Do you have backup codes?', 'Do you have another trusted device?', 'Do you want to notify trusted contacts?'];
let wizardIndex = 0;
let draggedAccount = null;

const $ = (selector) => document.querySelector(selector);
const categoryGrid = $('#category-grid');
const recoveryFilter = $('#recovery-filter');
const linkedResults = $('#linked-results');
const checklist = $('#checklist');
const checklistCount = $('#checklist-count');
const checklistBar = $('#checklist-bar');
const switchToggle = $('#switch-toggle');
const phoneForm = $('#phone-form');
const oldPhone = $('#old-phone');
const themeToggle = $('#theme-toggle');
const globalSearch = $('#global-search');
const accountList = $('#account-list');
const blackoutButton = $('#blackout-button');
const blackoutStatus = $('#blackout-status');
const activityList = $('#activity-list');
const mobileMenu = $('#mobile-menu');
const mobileMenuButton = $('#mobile-menu-button');
const toast = $('#toast');
const onboardingModal = $('#onboarding-modal');
const commandPalette = $('#command-palette');
const commandInput = $('#command-input');
const commandResults = $('#command-results');

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 2400);
}

function allSearchItems() {
  return [
    ...accounts.map((account) => ({ label: account.name, detail: `${account.email} · ${account.phone}`, action: () => { globalSearch.value = account.name; renderAccounts(); jumpTo('#accounts'); } })),
    { label: 'Run Free Recovery Check', detail: 'Open Recovery Health Score', action: () => jumpTo('#health-score') },
    { label: 'Add your first account', detail: 'Start onboarding', action: openOnboarding },
    { label: 'Switch Mode', detail: 'Change phone workflow', action: () => jumpTo('#switch-mode') },
    { label: 'Blackout Mode', detail: 'Emergency lockdown', action: () => jumpTo('#blackout-mode') },
    { label: 'Recovery Wizard', detail: 'Lost phone guided plan', action: () => jumpTo('#recovery-wizard') }
  ];
}

function jumpTo(selector) {
  document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderCategories() {
  const categories = [...new Set(accounts.map((account) => account.category))];
  categoryGrid.innerHTML = categories.map((category) => `<button class="category-card" type="button" data-category="${category}"><strong>${category}</strong><span>${accounts.filter((account) => account.category === category).length} signal(s)</span></button>`).join('');
}

function populateRecoveryFilter() {
  const values = [...new Set(accounts.flatMap((account) => [account.phone, account.email, account.contact, account.device]))];
  recoveryFilter.innerHTML = values.map((value) => `<option value="${value}">${value}</option>`).join('');
}

function renderLinkedAccounts() {
  const value = recoveryFilter.value;
  const matches = accounts.filter((account) => [account.phone, account.email, account.contact, account.device].includes(value));
  linkedResults.innerHTML = matches.map((account) => `<article class="linked-card"><div><strong>${account.name}</strong><span>${account.twoFactor} · ${account.notes}</span></div><button type="button" data-toast="Opened ${account.name} recovery details">Open</button></article>`).join('') || '<p class="muted">No accounts found for this recovery path.</p>';
}

function renderAccounts() {
  const query = globalSearch.value.trim().toLowerCase();
  const matches = accounts.filter((account) => Object.values(account).some((value) => String(value).toLowerCase().includes(query)));
  accountList.classList.remove('loading');
  accountList.innerHTML = matches.map((account, index) => `
    <article class="account-card" draggable="true" data-index="${index}">
      <div class="drag-handle" aria-hidden="true">⋮⋮</div>
      <div class="account-icon">${account.name.charAt(0)}</div>
      <div class="account-main"><strong>${account.name}</strong><span>${account.category} · ${account.twoFactor}</span><small>${account.notes}</small></div>
      <div class="mini-score"><strong>${account.score}%</strong><span>ready</span></div>
      <span class="risk-pill ${account.risk.toLowerCase()}">${account.risk}</span>
    </article>`).join('') || '<div class="empty-state"><div>⌕</div><strong>No recovery records found.</strong><span>Try another search or add your first account.</span></div>';
}

function renderChecklist() {
  const affected = accounts.filter((account) => account.phone === oldPhone.value.trim());
  const completed = affected.filter((account) => account.done).length;
  checklistCount.textContent = `${completed} of ${affected.length} complete`;
  checklistBar.style.width = affected.length ? `${(completed / affected.length) * 100}%` : '0%';
  checklist.innerHTML = affected.map((account) => `<li class="${account.done ? 'completed' : ''}"><label><input type="checkbox" data-name="${account.name}" ${account.done ? 'checked' : ''} /><span>${account.name}</span><small>${account.notes}</small></label><button type="button" data-toast="Opened ${account.name} update flow">Update</button></li>`).join('') || '<li>No accounts currently use that phone number.</li>';
}

function renderHealth() {
  $('#health-list').innerHTML = healthSignals.map(([label, score]) => `<div class="health-row"><span>${label}</span><div><i style="width:${score}%"></i></div><strong>${score}%</strong></div>`).join('');
}

function renderActivity() {
  activityList.innerHTML = activities.map((item, index) => `<li><span>${index + 1}</span>${item}</li>`).join('');
}

function renderCommands() {
  const query = commandInput.value.trim().toLowerCase();
  const results = allSearchItems().filter((item) => `${item.label} ${item.detail}`.toLowerCase().includes(query));
  commandResults.innerHTML = results.map((item, index) => `<button type="button" data-command-index="${index}"><strong>${item.label}</strong><span>${item.detail}</span></button>`).join('');
  commandResults.querySelectorAll('button').forEach((button, index) => button.addEventListener('click', () => {
    results[index].action();
    commandPalette.close();
    showToast(results[index].label);
  }));
}

function openPalette() {
  commandPalette.showModal();
  commandInput.value = '';
  renderCommands();
  commandInput.focus();
}

function openOnboarding() {
  onboardingModal.showModal();
  $('#new-account-name').focus();
}

function setTheme(isDark) {
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  themeToggle.textContent = isDark ? 'Light mode' : 'Dark mode';
  themeToggle.setAttribute('aria-pressed', String(isDark));
}

function updateWizard(answer) {
  wizardIndex += 1;
  const plan = answer === 'yes' ? 'Great — we will use that in your recovery plan.' : 'No problem — we will route around that gap.';
  $('#wizard-question').textContent = wizardSteps[wizardIndex] ? `Step ${wizardIndex + 1} — ${plan} ${wizardSteps[wizardIndex]}` : 'Recovery plan generated: freeze SIM, recover email, use backup codes, verify trusted device, then rotate credentials.';
}

setTimeout(renderAccounts, 450);
renderCategories();
populateRecoveryFilter();
renderLinkedAccounts();
renderChecklist();
renderHealth();
renderActivity();
setTheme(true);

recoveryFilter.addEventListener('change', renderLinkedAccounts);
globalSearch.addEventListener('input', renderAccounts);
categoryGrid.addEventListener('click', (event) => {
  const card = event.target.closest('[data-category]');
  if (!card) return;
  globalSearch.value = card.dataset.category;
  renderAccounts();
  showToast(`${card.dataset.category} filtered`);
});
accountList.addEventListener('dragstart', (event) => {
  draggedAccount = event.target.closest('.account-card');
  if (draggedAccount) draggedAccount.classList.add('dragging');
});
accountList.addEventListener('dragend', () => {
  draggedAccount?.classList.remove('dragging');
  draggedAccount = null;
  showToast('Account priority updated');
});
accountList.addEventListener('dragover', (event) => {
  event.preventDefault();
  const target = event.target.closest('.account-card');
  if (target && draggedAccount && target !== draggedAccount) accountList.insertBefore(draggedAccount, target);
});
phoneForm.addEventListener('submit', (event) => {
  event.preventDefault();
  switchToggle.setAttribute('aria-pressed', 'true');
  renderChecklist();
  showToast('Switch Mode checklist generated');
});
checklist.addEventListener('change', (event) => {
  const account = accounts.find((item) => item.name === event.target.dataset.name);
  if (account) account.done = event.target.checked;
  renderChecklist();
});
blackoutButton.addEventListener('click', () => {
  const armed = blackoutButton.getAttribute('aria-pressed') !== 'true';
  blackoutButton.setAttribute('aria-pressed', String(armed));
  blackoutStatus.textContent = armed ? 'Blackout armed. Trusted contacts notified, recovery sheet queued, and critical account checklist prioritized.' : 'One button for SIM swap checklists, bank freezes, crypto lockdown, trusted contact alerts, and emergency exports.';
  showToast(armed ? 'Blackout Mode armed' : 'Blackout Mode disarmed');
});
switchToggle.addEventListener('click', () => switchToggle.setAttribute('aria-pressed', String(switchToggle.getAttribute('aria-pressed') !== 'true')));
themeToggle.addEventListener('click', () => setTheme(document.documentElement.dataset.theme !== 'dark'));
mobileMenuButton.addEventListener('click', () => {
  const expanded = mobileMenuButton.getAttribute('aria-expanded') === 'true';
  mobileMenuButton.setAttribute('aria-expanded', String(!expanded));
  mobileMenu.classList.toggle('open', !expanded);
});
document.addEventListener('click', (event) => {
  const toastButton = event.target.closest('[data-toast]');
  const jumpButton = event.target.closest('[data-jump]');
  const commandButton = event.target.closest('[data-command]');
  const wizardButton = event.target.closest('[data-wizard]');
  if (toastButton) showToast(toastButton.dataset.toast);
  if (jumpButton) jumpTo(jumpButton.dataset.jump);
  if (commandButton?.dataset.command === 'onboarding') openOnboarding();
  if (commandButton?.dataset.command === 'palette') openPalette();
  if (wizardButton) updateWizard(wizardButton.dataset.wizard);
});
document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    openPalette();
  }
  if (event.key >= '1' && event.key <= '4') {
    const targets = ['#dashboard', '#accounts', '#switch-mode', '#blackout-mode'];
    jumpTo(targets[Number(event.key) - 1]);
  }
});
commandInput.addEventListener('input', renderCommands);
$('#command-open').addEventListener('click', openPalette);
$('#mobile-search').addEventListener('click', openPalette);
$('#run-check-button').addEventListener('click', () => jumpTo('#health-score'));
$('#improve-score-button').addEventListener('click', () => jumpTo('#recovery-wizard'));
$('#health-improve-button').addEventListener('click', () => jumpTo('#recovery-wizard'));
$('#onboarding-button').addEventListener('click', openOnboarding);
$('#onboarding-form').addEventListener('submit', (event) => {
  if (event.submitter?.value === 'cancel') return;
  event.preventDefault();
  accounts.unshift({ name: $('#new-account-name').value, category: 'Recovery Email', phone: $('#new-account-phone').value, email: $('#new-account-email').value, twoFactor: $('#new-account-2fa').value, contact: 'New trusted contact', device: 'New device', score: 67, done: false, risk: 'Medium', notes: 'Added during onboarding.' });
  onboardingModal.close();
  renderCategories();
  populateRecoveryFilter();
  renderAccounts();
  showToast('Demo account added');
});
