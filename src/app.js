const navItems = [
  ['landing', 'Home', '⌁'], ['login', 'Login', '◐'], ['dashboard', 'Dashboard', '◆'], ['vault', 'Vault', '▣'], ['accounts', 'Accounts', '◎'], ['switch-mode', 'Switch', '⇄'], ['blackout-mode', 'Blackout', '◒'], ['emergency-kit', 'Kit', '✚'], ['settings', 'Settings', '⚙']
];

const phones = ['+1 (415) 555-0184', '+1 (628) 555-0149', '+1 (212) 555-0110', '+1 (305) 555-0172'];
const emails = ['recovery@secureswitch.test', 'finance@secureswitch.test', 'family@secureswitch.test', 'work@secureswitch.test', 'crypto@secureswitch.test'];
const authenticators = ['1Password', 'Authy', 'Google Authenticator', 'Microsoft Authenticator', 'iCloud Keychain'];
const seedServices = [
  ['Google','Email','https://myaccount.google.com/security'], ['Apple','Shopping','https://appleid.apple.com/account/manage'], ['Microsoft','Email','https://account.microsoft.com/security'], ['Amazon','Shopping','https://www.amazon.com/a/settings/approval'], ['Facebook','Social','https://www.facebook.com/settings?tab=security'], ['Instagram','Social','https://www.instagram.com/accounts/privacy_and_security/'], ['X','Social','https://x.com/settings/security'], ['TikTok','Social','https://www.tiktok.com/setting'], ['Discord','Social','https://discord.com/channels/@me'], ['PayPal','Business','https://www.paypal.com/myaccount/security'], ['Cash App','Banking','https://cash.app/account/settings'], ['Coinbase','Crypto','https://www.coinbase.com/settings/security'], ['Robinhood','Banking','https://robinhood.com/account/settings'], ['Bank of America','Banking','https://www.bankofamerica.com/security-center/'], ['Chase','Banking','https://www.chase.com/digital/resources/privacy-security/security-center'], ['Capital One','Banking','https://www.capitalone.com/digital/security/'], ['Venmo','Banking','https://venmo.com/account/settings/security/'], ['Shopify','Business','https://accounts.shopify.com/'], ['OpenAI','Developer','https://platform.openai.com/account/security'], ['Netflix','Entertainment','https://www.netflix.com/account'], ['Disney+','Entertainment','https://www.disneyplus.com/account'], ['Hulu','Entertainment','https://www.hulu.com/account'], ['Spotify','Entertainment','https://www.spotify.com/account/overview/'], ['Dropbox','Business','https://www.dropbox.com/account/security'], ['Slack','Business','https://slack.com/account/settings'], ['Notion','Business','https://www.notion.so/my-account'], ['GitHub','Developer','https://github.com/settings/security'], ['GitLab','Developer','https://gitlab.com/-/profile/two_factor_auth'], ['Cloudflare','Developer','https://dash.cloudflare.com/profile/security'], ['Stripe','Business','https://dashboard.stripe.com/settings/user'], ['Square','Business','https://squareup.com/dashboard/account/security'], ['Etsy','Shopping','https://www.etsy.com/your/account/security'], ['eBay','Shopping','https://accountsettings.ebay.com/'], ['Walmart','Shopping','https://www.walmart.com/account/login'], ['Target','Shopping','https://www.target.com/account'], ['LinkedIn','Social','https://www.linkedin.com/psettings/'], ['Reddit','Social','https://www.reddit.com/settings/privacy'], ['Snapchat','Social','https://accounts.snapchat.com/'], ['Telegram','Social','https://web.telegram.org/'], ['WhatsApp','Social','https://web.whatsapp.com/'], ['Uber','Shopping','https://auth.uber.com/'], ['Airbnb','Shopping','https://www.airbnb.com/account-settings/security'], ['TurboTax','Business','https://accounts.intuit.com/app/account-manager/security'], ['Fidelity','Banking','https://digital.fidelity.com/ftgw/digital/security/dashboard'], ['Kraken','Crypto','https://www.kraken.com/u/security'], ['Gemini','Crypto','https://exchange.gemini.com/settings/security']
];

let accounts = seedServices.map(([name, category, url], index) => ({
  id: crypto.randomUUID ? crypto.randomUUID() : String(index), name, category, url,
  phone: phones[index % phones.length], email: emails[index % emails.length], authenticator: authenticators[index % authenticators.length],
  backupCodes: index % 3 === 0 ? 8 : index % 4 === 0 ? 3 : 0,
  updated: index % 5 !== 0,
  risk: index % 7 === 0 ? 'High' : index % 3 === 0 ? 'Medium' : 'Low'
}));

const state = { route: 'landing', query: '', filter: 'All', editId: null };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const page = (id) => document.getElementById(id);

function score() {
  const protectedCount = accounts.filter((account) => account.updated && account.backupCodes > 0 && account.authenticator).length;
  return Math.round((protectedCount / accounts.length) * 100);
}

function stat(label, value, detail = '') { return `<article class="stat-card"><strong>${value}</strong><span>${label}</span>${detail ? `<small>${detail}</small>` : ''}</article>`; }
function accountCard(account) { return `<article class="account-card ${account.risk.toLowerCase()}"><div><strong>${account.name}</strong><span>${account.category} · ${account.risk} risk</span><small>${account.phone} · ${account.email}</small></div><div class="card-actions"><a href="${account.url}" target="_blank" rel="noreferrer">Security</a><button data-edit="${account.id}">Edit</button><button data-delete="${account.id}">Delete</button></div></article>`; }
function progress(label, value) { return `<div class="progress-block"><div><span>${label}</span><strong>${value}%</strong></div><i><b style="width:${value}%"></b></i></div>`; }

function renderNav() {
  const links = navItems.map(([id, label, icon]) => `<a href="#${id}" data-route="${id}" class="${state.route === id ? 'active' : ''}"><span>${icon}</span>${label}</a>`).join('');
  $('#desktop-nav').innerHTML = links;
  $('#mobile-nav').innerHTML = navItems.slice(2).map(([id, label, icon]) => `<a href="#${id}" data-route="${id}" class="${state.route === id ? 'active' : ''}"><span>${icon}</span><small>${label}</small></a>`).join('');
  $('#rail-score').textContent = `${score()}%`;
}

function renderLanding() {
  page('landing').innerHTML = `<section class="hero"><div class="hero-copy"><p class="eyebrow">Secure recovery infrastructure</p><h1>Never lose access to your digital life again.</h1><p>SecureSwitch is a premium control panel for phone numbers, recovery emails, backup codes, authenticators, and account-security checklists.</p><div class="hero-actions"><button class="primary-button" data-route="login">Join Beta</button><button class="ghost-button" data-route="dashboard">View Demo</button></div></div><div class="phone-preview"><div class="device"><div class="device-top"></div>${progress('Recovery score', score())}<div class="mini-list">${accounts.slice(0,5).map((a) => `<span>${a.updated ? '✓' : '•'} ${a.name}</span>`).join('')}</div></div></div></section><section class="section-grid"><article class="glass-card"><p class="eyebrow">Problem</p><h2>Changing a phone number can lock users out of banks, email, crypto, and social accounts.</h2><p>People rarely know which services still depend on an old number or recovery email.</p></article><article class="glass-card"><p class="eyebrow">Solution</p><h2>One dashboard for every identity recovery path.</h2><p>Search linked accounts, generate update checklists, and keep emergency access ready.</p></article></section><section class="feature-grid">${['Encrypted vault','Switch Mode','Blackout Mode','Emergency Kit','Authenticator manager','Backup-code viewer'].map((feature) => `<article><h3>${feature}</h3><p>Built for high-trust recovery workflows with smooth mobile-first interactions.</p></article>`).join('')}</section><section class="pricing"><div><p class="eyebrow">Pricing</p><h2>Start free. Upgrade when your recovery map matters.</h2></div>${[['Free','$0','5 accounts, basic checklist'],['Pro','$8/mo','Unlimited accounts, vault sync, Switch Mode'],['Family','$14/mo','5 members, emergency kit, trusted recovery']].map((plan) => `<article class="price-card"><h3>${plan[0]}</h3><strong>${plan[1]}</strong><p>${plan[2]}</p><button class="primary-button" data-route="login">Join Beta</button></article>`).join('')}</section>`;
}

function renderLogin() { page('login').innerHTML = `<section class="auth-page"><form class="auth-card"><p class="eyebrow">Beta access</p><h1>Welcome back.</h1><label>Email<input type="email" value="founder@secureswitch.test"></label><label>Password<input type="password" value="secureswitch"></label><button class="primary-button full" type="button" data-route="dashboard">Login to demo</button><button class="ghost-button full" type="button" data-route="dashboard">Join Beta</button></form></section>`; }

function renderDashboard() {
  const highRisk = accounts.filter((account) => account.risk === 'High').length;
  const updated = accounts.filter((account) => account.updated).length;
  page('dashboard').innerHTML = `<section class="page-hero"><p class="eyebrow">Command center</p><h1>Digital identity dashboard.</h1><p>Track security readiness across ${accounts.length} services.</p></section><section class="stats-grid">${stat('Security score', `${score()}%`, 'Live demo calculation')}${stat('Monitored services', accounts.length)}${stat('Updated accounts', updated)}${stat('High risk', highRisk)}</section><section class="dashboard-columns"><article class="glass-card"><h2>Recovery score</h2>${progress('Phone updated', Math.round((updated / accounts.length) * 100))}${progress('Backup codes stored', Math.round((accounts.filter((a) => a.backupCodes > 0).length / accounts.length) * 100))}${progress('Authenticator connected', 100)}</article><article class="glass-card"><h2>Needs attention</h2><div class="account-list">${accounts.filter((a) => !a.updated || a.risk === 'High').slice(0,6).map(accountCard).join('')}</div></article></section>`;
}

function renderVault() {
  const phoneRows = phones.map((phone) => `<li><span>${phone}</span><strong>${accounts.filter((a) => a.phone === phone).length} linked</strong></li>`).join('');
  const emailRows = emails.map((email) => `<li><span>${email}</span><strong>${accounts.filter((a) => a.email === email).length} linked</strong></li>`).join('');
  page('vault').innerHTML = `<section class="page-hero"><p class="eyebrow">Identity Vault</p><h1>Recovery assets in one encrypted-feeling workspace.</h1></section><section class="vault-grid"><article class="glass-card"><h2>Recovery phones</h2><ul class="asset-list">${phoneRows}</ul></article><article class="glass-card"><h2>Recovery emails</h2><ul class="asset-list">${emailRows}</ul></article><article class="glass-card"><h2>Backup codes</h2><div class="code-grid">${accounts.filter((a) => a.backupCodes).slice(0,12).map((a) => `<button>${a.name}<span>${a.backupCodes} codes</span></button>`).join('')}</div></article><article class="glass-card"><h2>Authenticators</h2><ul class="asset-list">${authenticators.map((auth) => `<li><span>${auth}</span><strong>${accounts.filter((a) => a.authenticator === auth).length} apps</strong></li>`).join('')}</ul></article></section>`;
}

function filteredAccounts() {
  return accounts.filter((account) => (state.filter === 'All' || account.category === state.filter) && [account.name, account.category, account.email, account.phone, account.authenticator].join(' ').toLowerCase().includes(state.query.toLowerCase()));
}

function renderAccounts() {
  const categories = ['All', ...new Set(accounts.map((a) => a.category))];
  page('accounts').innerHTML = `<section class="page-hero"><p class="eyebrow">Accounts</p><h1>Search and manage every service.</h1></section><section class="toolbar"><input id="search" placeholder="Search accounts, email, phone, authenticator..." value="${state.query}"><select id="category-filter">${categories.map((cat) => `<option ${cat === state.filter ? 'selected' : ''}>${cat}</option>`).join('')}</select><button class="primary-button" id="add-account">Add account</button></section><section class="account-list">${filteredAccounts().map(accountCard).join('')}</section>`;
}

function renderSwitchMode() {
  const oldPhone = phones[0];
  const impacted = accounts.filter((account) => account.phone === oldPhone);
  const complete = impacted.filter((account) => account.updated).length;
  page('switch-mode').innerHTML = `<section class="page-hero"><p class="eyebrow">Switch Mode</p><h1>Change your phone without losing access.</h1><p>Old phone: ${oldPhone}. New phone: ${phones[1]}.</p></section><section class="glass-card">${progress('Update progress', Math.round((complete / impacted.length) * 100))}<div class="checklist">${impacted.map((account) => `<label class="check-row"><input type="checkbox" data-toggle-update="${account.id}" ${account.updated ? 'checked' : ''}><span>${account.name}<small>${account.category}</small></span><a href="${account.url}" target="_blank" rel="noreferrer">Open security</a></label>`).join('')}</div></section>`;
}

function renderBlackoutMode() { page('blackout-mode').innerHTML = `<section class="page-hero blackout"><p class="eyebrow">Blackout Mode</p><h1>Lost-phone emergency workflow.</h1></section><section class="timeline">${['Lock lost device and revoke sessions','Secure primary email first','Restore authenticator access','Rotate backup codes','Update phones on banks, crypto, and social accounts','Export incident notes'].map((step, index) => `<article><span>${index + 1}</span><div><h3>${step}</h3><p>Follow this action before moving to the next recovery circuit.</p></div></article>`).join('')}</section>`; }

function renderEmergencyKit() { page('emergency-kit').innerHTML = `<section class="page-hero"><p class="eyebrow">Emergency Kit</p><h1>Printable recovery plan for trusted access.</h1></section><section class="kit-grid"><article class="glass-card"><h2>Trusted contacts</h2><p>Mom · spouse@family.test · attorney@firm.test</p></article><article class="glass-card"><h2>Critical accounts</h2><p>${accounts.filter((a) => ['Banking','Crypto','Email'].includes(a.category)).slice(0,10).map((a) => a.name).join(', ')}</p></article><article class="glass-card"><h2>Offline instructions</h2><p>Store this kit with estate documents. Never print backup codes without sealing them.</p></article></section>`; }

function renderSettings() { page('settings').innerHTML = `<section class="page-hero"><p class="eyebrow">Settings</p><h1>Workspace controls.</h1></section><section class="settings-grid"><article class="glass-card"><h2>Profile</h2><label>Name<input value="SecureSwitch Founder"></label><label>Email<input value="founder@secureswitch.test"></label></article><article class="glass-card"><h2>Security</h2><label><input type="checkbox" checked> Biometric unlock</label><label><input type="checkbox" checked> Dark mode</label><label><input type="checkbox"> Emergency contact approval</label></article><article class="glass-card"><h2>Subscription</h2><p>Pro beta · $8/month after launch</p><button class="primary-button">Manage billing</button></article></section>`; }

function render() {
  renderNav(); renderLanding(); renderLogin(); renderDashboard(); renderVault(); renderAccounts(); renderSwitchMode(); renderBlackoutMode(); renderEmergencyKit(); renderSettings();
  $$('.page').forEach((section) => section.classList.toggle('active', section.id === state.route));
  document.body.dataset.route = state.route;
}

function routeTo(id) { state.route = id; history.replaceState(null, '', `#${id}`); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function openModal(id = null) { state.editId = id; const account = accounts.find((item) => item.id === id) || {}; $('#modal-title').textContent = id ? 'Edit account' : 'Add account'; $('#account-id').value = id || ''; $('#account-name').value = account.name || ''; $('#account-category').value = account.category || 'Email'; $('#account-phone').value = account.phone || phones[0]; $('#account-email').value = account.email || emails[0]; $('#account-auth').value = account.authenticator || authenticators[0]; $('#account-url').value = account.url || 'https://example.com/security'; $('#account-modal').showModal(); }

window.addEventListener('click', (event) => {
  const route = event.target.closest('[data-route]')?.dataset.route;
  if (route) { event.preventDefault(); routeTo(route); }
  const editId = event.target.closest('[data-edit]')?.dataset.edit;
  if (editId) openModal(editId);
  const deleteId = event.target.closest('[data-delete]')?.dataset.delete;
  if (deleteId) { accounts = accounts.filter((account) => account.id !== deleteId); render(); }
  const toggleId = event.target.dataset.toggleUpdate;
  if (toggleId) { const account = accounts.find((item) => item.id === toggleId); if (account) account.updated = event.target.checked; render(); }
});

window.addEventListener('input', (event) => { if (event.target.id === 'search') { state.query = event.target.value; renderAccounts(); } });
window.addEventListener('change', (event) => { if (event.target.id === 'category-filter') { state.filter = event.target.value; renderAccounts(); } });
$('#fab').addEventListener('click', () => openModal());
$('#close-modal').addEventListener('click', () => $('#account-modal').close());
$('#theme-toggle').addEventListener('click', () => document.body.classList.toggle('light-mode'));
$('#account-form').addEventListener('submit', (event) => { event.preventDefault(); const payload = { id: $('#account-id').value || (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()), name: $('#account-name').value, category: $('#account-category').value, phone: $('#account-phone').value, email: $('#account-email').value, authenticator: $('#account-auth').value, url: $('#account-url').value, backupCodes: 6, updated: false, risk: 'Medium' }; accounts = accounts.some((account) => account.id === payload.id) ? accounts.map((account) => account.id === payload.id ? payload : account) : [payload, ...accounts]; $('#account-modal').close(); routeTo('accounts'); });

state.route = location.hash.replace('#', '') || 'landing';
render();
