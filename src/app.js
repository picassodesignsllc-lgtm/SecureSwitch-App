const accounts = [
  { name: 'Google', email: 'alex.recovery@secureswitch.test', phone: '+1 (415) 555-0184', codes: 8, device: 'MacBook Pro', contact: 'Jordan Lee', method: 'Authenticator', ready: true, note: 'Recovery key printed.' },
  { name: 'Chase', email: 'finance@secureswitch.test', phone: '+1 (415) 555-0184', codes: 0, device: 'iPhone 15', contact: 'Priya Shah', method: 'SMS', ready: false, note: 'Old phone still linked.' },
  { name: 'Coinbase', email: 'crypto@secureswitch.test', phone: '+1 (415) 555-0184', codes: 2, device: 'YubiKey 5C', contact: 'Jordan Lee', method: 'Hardware key', ready: false, note: 'Rotate backup codes.' },
  { name: 'Apple ID', email: 'alex.recovery@secureswitch.test', phone: '+1 (628) 555-0149', codes: 10, device: 'iPad Air', contact: 'Priya Shah', method: 'Passkey', ready: true, note: 'Recovery key stored.' }
];
const notifications = ['Google recovery key verified', 'Coinbase backup codes need rotation', 'Priya accepted trusted contact invite'];
const timeline = [['Just now', 'Health score recalculated'], ['Today', 'Apple ID passkey verified'], ['Yesterday', 'Coinbase marked high priority'], ['Jun 24', 'Trusted contact added']];
const emergencySteps = [
  ['Did you lose a phone or suspect SIM swap?', 'Freeze SIM carrier and revoke mobile sessions.', 'Prepare preventive emergency sheet.'],
  ['Freeze banks and crypto?', 'Add Chase freeze and Coinbase lock tasks.', 'Skip financial freeze.'],
  ['Notify trusted contacts?', 'Notify trusted contacts and export recovery sheet.', 'Keep contacts on standby.']
];
const recoverySteps = [
  ['Do you still have recovery email?', 'Use recovery email first.', 'Route through backup codes and trusted device.'],
  ['Do you have backup codes?', 'Use backup codes before resetting 2FA.', 'Flag backup codes as missing.'],
  ['Do you have another trusted device?', 'Approve sign-in from trusted device.', 'Escalate to trusted contact and support.']
];
let emergencyIndex = 0;
let recoveryIndex = 0;
let emergencyPlan = [];
let recoveryPlan = [];
let draggedCard = null;
const $ = (selector) => document.querySelector(selector);

function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('show');
  setTimeout(() => $('#toast').classList.remove('show'), 2200);
}
function score() {
  const email = accounts.filter((a) => a.email).length / accounts.length;
  const phone = accounts.filter((a) => a.phone).length / accounts.length;
  const codes = accounts.filter((a) => a.codes >= 6).length / accounts.length;
  const contacts = accounts.filter((a) => a.contact).length / accounts.length;
  const devices = accounts.filter((a) => a.device).length / accounts.length;
  return Math.round((email * 18) + (phone * 16) + (codes * 18) + (contacts * 16) + (devices * 14) + 10);
}
function renderHealth() {
  const rows = [
    ['Recovery email', accounts.filter((a) => a.email).length / accounts.length],
    ['Recovery phone', accounts.filter((a) => a.phone).length / accounts.length],
    ['Backup codes', accounts.filter((a) => a.codes >= 6).length / accounts.length],
    ['Trusted contacts', accounts.filter((a) => a.contact).length / accounts.length],
    ['Devices', accounts.filter((a) => a.device).length / accounts.length]
  ];
  $('#score-value').textContent = score();
  $('#health-list').innerHTML = rows.map(([label, value]) => `<div class="health-row"><span>${label}</span><div><i style="width:${Math.round(value * 100)}%"></i></div><strong>${Math.round(value * 100)}%</strong></div>`).join('');
}
function renderAccounts() {
  const query = $('#account-search').value.toLowerCase();
  const filtered = accounts.filter((account) => Object.values(account).some((value) => String(value).toLowerCase().includes(query)));
  $('#skeletons').hidden = true;
  $('#account-list').innerHTML = filtered.map((account, index) => `<article class="account-card" draggable="true" tabindex="0" data-index="${index}"><span class="grab">⋮⋮</span><div class="avatar small">${account.name[0]}</div><div><strong>${account.name}</strong><span>${account.email} · ${account.method}</span><small>${account.note}</small></div><span class="badge">${account.codes} codes</span></article>`).join('') || '<div class="empty">No accounts found. Add your first account above.</div>';
}
function renderVault() {
  const groups = [
    ['Recovery emails', [...new Set(accounts.map((a) => a.email))]],
    ['Recovery phones', [...new Set(accounts.map((a) => a.phone))]],
    ['Backup codes', accounts.map((a) => `${a.name}: ${a.codes}`)],
    ['Trusted contacts', [...new Set(accounts.map((a) => a.contact))]]
  ];
  $('#vault-grid').innerHTML = groups.map(([title, items]) => `<section class="vault-card"><h3>${title}</h3>${items.map((item) => `<p>${item}</p>`).join('')}</section>`).join('');
}
function renderDevices() {
  $('#device-list').innerHTML = [...new Set(accounts.map((a) => a.device))].map((device) => `<article class="item"><strong>${device}</strong><span>Trusted device · last seen today</span></article>`).join('');
}
function renderContacts() {
  $('#contact-list').innerHTML = [...new Set(accounts.map((a) => a.contact))].map((contact) => `<article class="item"><strong>${contact}</strong><span>Trusted contact · can receive emergency packet</span></article>`).join('');
}
function renderTimeline() {
  $('#timeline-list').innerHTML = timeline.map(([when, what]) => `<li><time>${when}</time><span>${what}</span></li>`).join('');
}
function renderChecklist() {
  $('#checklist-list').innerHTML = accounts.filter((a) => a.phone === '+1 (415) 555-0184').map((account) => `<li class="${account.ready ? 'done' : ''}"><label><input type="checkbox" data-name="${account.name}" ${account.ready ? 'checked' : ''} />${account.name}</label><span>${account.note}</span></li>`).join('');
}
function renderNotifications() {
  $('#notification-list').innerHTML = notifications.map((item) => `<li><span></span>${item}</li>`).join('');
}
function renderWizard(kind) {
  const emergency = kind === 'emergency';
  const steps = emergency ? emergencySteps : recoverySteps;
  const index = emergency ? emergencyIndex : recoveryIndex;
  const plan = emergency ? emergencyPlan : recoveryPlan;
  $(`#${kind}-question`).textContent = steps[index]?.[0] || 'Plan generated.';
  $(`#${kind}-actions`).innerHTML = steps[index] ? `<button data-wizard="${kind}" data-answer="yes">Yes</button><button data-wizard="${kind}" data-answer="no">No</button>` : '<button data-reset="' + kind + '">Start over</button>';
  $(`#${kind}-plan`).innerHTML = plan.map((item) => `<li>${item}</li>`).join('');
}
function answerWizard(kind, answer) {
  const emergency = kind === 'emergency';
  const steps = emergency ? emergencySteps : recoverySteps;
  const index = emergency ? emergencyIndex : recoveryIndex;
  if (!steps[index]) return;
  if (emergency) { emergencyPlan.push(steps[index][answer === 'yes' ? 1 : 2]); emergencyIndex += 1; } else { recoveryPlan.push(steps[index][answer === 'yes' ? 1 : 2]); recoveryIndex += 1; }
  renderWizard(kind);
  toast('Wizard step saved');
}
function resetWizard(kind) {
  if (kind === 'emergency') { emergencyIndex = 0; emergencyPlan = []; } else { recoveryIndex = 0; recoveryPlan = []; }
  renderWizard(kind);
}
function renderCommands() {
  const commands = ['Add account', 'Open vault', 'Blackout Mode', 'AI assistant', ...accounts.map((a) => a.name)];
  const q = $('#command-input').value.toLowerCase();
  $('#command-results').innerHTML = commands.filter((c) => c.toLowerCase().includes(q)).map((c) => `<button data-command-result="${c}">${c}</button>`).join('');
}
function openCommand() {
  $('#command-palette').showModal();
  $('#command-input').value = '';
  renderCommands();
  $('#command-input').focus();
}
function renderAll() { renderHealth(); renderAccounts(); renderVault(); renderDevices(); renderContacts(); renderTimeline(); renderChecklist(); renderNotifications(); renderWizard('emergency'); renderWizard('recovery'); }

setTimeout(renderAccounts, 450);
renderAll();
$('#login-form').addEventListener('submit', (event) => { event.preventDefault(); toast(`Signed in as ${$('#login-email').value} (demo)`); });
$('#onboarding-form').addEventListener('submit', (event) => {
  event.preventDefault();
  accounts.unshift({ name: $('#new-name').value, email: $('#new-email').value, phone: $('#new-phone').value, codes: Number($('#new-codes').value), device: $('#new-device').value, contact: $('#new-contact').value, method: 'Authenticator', ready: false, note: 'Added during onboarding.' });
  timeline.unshift(['Just now', `${$('#new-name').value} added during onboarding`]);
  renderAll();
  toast('Account added');
});
$('#account-search').addEventListener('input', renderAccounts);
$('#account-list').addEventListener('dragstart', (event) => { draggedCard = event.target.closest('.account-card'); draggedCard?.classList.add('dragging'); });
$('#account-list').addEventListener('dragend', () => { draggedCard?.classList.remove('dragging'); draggedCard = null; toast('Account order updated'); });
$('#account-list').addEventListener('dragover', (event) => { event.preventDefault(); const target = event.target.closest('.account-card'); if (target && draggedCard && target !== draggedCard) $('#account-list').insertBefore(draggedCard, target); });
$('#checklist-list').addEventListener('change', (event) => { const account = accounts.find((a) => a.name === event.target.dataset.name); if (account) account.ready = event.target.checked; renderChecklist(); toast('Checklist updated'); });
$('#command-open').addEventListener('click', openCommand);
$('#command-input').addEventListener('input', renderCommands);
$('#mobile-menu-button').addEventListener('click', () => { const open = $('#mobile-menu-button').getAttribute('aria-expanded') !== 'true'; $('#mobile-menu-button').setAttribute('aria-expanded', String(open)); $('#mobile-menu').classList.toggle('open', open); });
$('#theme-toggle').addEventListener('click', () => { const dark = document.documentElement.dataset.theme !== 'dark'; document.documentElement.dataset.theme = dark ? 'dark' : 'light'; $('#theme-toggle').textContent = dark ? 'Light mode' : 'Dark mode'; });
$('#emergency-reset').addEventListener('click', () => resetWizard('emergency'));
document.addEventListener('click', (event) => { const t = event.target.closest('[data-toast]'); const j = event.target.closest('[data-jump]'); const w = event.target.closest('[data-wizard]'); const r = event.target.closest('[data-reset]'); const cr = event.target.closest('[data-command-result]'); if (t) toast(t.dataset.toast); if (j) document.querySelector(j.dataset.jump)?.scrollIntoView({ behavior: 'smooth' }); if (w) answerWizard(w.dataset.wizard, w.dataset.answer); if (r) resetWizard(r.dataset.reset); if (cr) { toast(cr.dataset.commandResult); $('#command-palette').close(); } });
document.addEventListener('keydown', (event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openCommand(); } if (event.key === '/' && document.activeElement.tagName !== 'INPUT') { event.preventDefault(); $('#account-search').focus(); } });
