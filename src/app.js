import { accounts as initialAccounts, activity, timeline } from '../data/demoData.js';
import { qs, unique } from '../utils/dom.js';
import { calculateRecoveryScore } from '../utils/healthEngine.js';
import { Sidebar } from '../components/Sidebar.js';
import { Navbar } from '../components/Navbar.js';
import { AccountCard } from '../components/AccountCard.js';
import { ModalSystem } from '../components/ModalSystem.js';
import { ToastSystem } from '../components/ToastSystem.js';
import { DashboardPage } from '../pages/DashboardPage.js';
import { AccountsPage } from '../pages/AccountsPage.js';
import { VaultPage } from '../pages/VaultPage.js';
import { TimelinePage } from '../pages/TimelinePage.js';
import { SettingsPage } from '../pages/SettingsPage.js';

const state = {
  accounts: [...initialAccounts],
  draggedCard: null
};

function renderApp() {
  const scoreData = calculateRecoveryScore(state.accounts);
  qs('#app').innerHTML = `
    ${Navbar()}
    ${Sidebar()}
    <main class="main" id="app-main">
      ${DashboardPage({ scoreData, activity })}
      ${AccountsPage()}
      ${VaultPage()}
      ${TimelinePage({ timeline })}
      ${SettingsPage()}
    </main>
    ${ModalSystem()}
    ${ToastSystem()}`;
  renderAccounts();
  renderVault();
  bindEvents();
}

function renderAccounts() {
  const query = qs('#account-search')?.value.toLowerCase() ?? '';
  const matches = state.accounts.filter((account) => Object.values(account).some((value) => String(value).toLowerCase().includes(query)));
  qs('#skeletons').hidden = true;
  qs('#account-list').innerHTML = matches.map(AccountCard).join('') || '<div class="empty-state">No accounts found. Clear your search to see recovery records.</div>';
}

function renderVault() {
  const groups = [
    ['Recovery emails', unique(state.accounts.map((account) => account.email))],
    ['Recovery phones', unique(state.accounts.map((account) => account.phone))],
    ['Backup codes', state.accounts.map((account) => `${account.name}: ${account.codes} codes`)],
    ['Trusted contacts', unique(state.accounts.map((account) => account.contact))],
    ['Devices', unique(state.accounts.map((account) => account.device))]
  ];
  qs('#vault-grid').innerHTML = groups.map(([title, items]) => `<section class="vault-card"><h3>${title}</h3>${items.map((item) => `<p>${item}</p>`).join('')}</section>`).join('');
}

function showToast(message) {
  const toast = qs('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 2200);
}

function openCommandPalette() {
  const modal = qs('#command-modal');
  const input = qs('#command-input');
  modal.showModal();
  input.value = '';
  renderCommands();
  input.focus();
}

function renderCommands() {
  const query = qs('#command-input').value.toLowerCase();
  const commands = [
    ['Dashboard', '#dashboard'],
    ['Accounts', '#accounts'],
    ['Vault', '#vault'],
    ['Timeline', '#timeline'],
    ['Settings', '#settings'],
    ...state.accounts.map((account) => [account.name, '#accounts'])
  ];
  qs('#command-results').innerHTML = commands
    .filter(([label]) => label.toLowerCase().includes(query))
    .map(([label, target]) => `<button type="button" data-command-target="${target}">${label}</button>`)
    .join('');
}

function bindEvents() {
  qs('#account-search').addEventListener('input', renderAccounts);
  qs('#mobile-menu-button').addEventListener('click', () => {
    const button = qs('#mobile-menu-button');
    const expanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!expanded));
    qs('#mobile-menu').classList.toggle('open', !expanded);
  });
  qs('#theme-toggle').addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme !== 'dark';
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    qs('#theme-toggle').textContent = dark ? 'Light mode' : 'Dark mode';
    qs('#theme-toggle').setAttribute('aria-pressed', String(dark));
  });
  qs('#account-list').addEventListener('dragstart', (event) => {
    state.draggedCard = event.target.closest('.account-card');
    state.draggedCard?.classList.add('dragging');
  });
  qs('#account-list').addEventListener('dragend', () => {
    state.draggedCard?.classList.remove('dragging');
    state.draggedCard = null;
    showToast('Account order updated');
  });
  qs('#account-list').addEventListener('dragover', (event) => {
    event.preventDefault();
    const target = event.target.closest('.account-card');
    if (target && state.draggedCard && target !== state.draggedCard) qs('#account-list').insertBefore(state.draggedCard, target);
  });
  qs('#command-open').addEventListener('click', openCommandPalette);
  qs('#command-input').addEventListener('input', renderCommands);
}

document.addEventListener('click', (event) => {
  const jump = event.target.closest('[data-jump]');
  const commandOpen = event.target.closest('[data-command-open]');
  const commandTarget = event.target.closest('[data-command-target]');
  if (jump) qs(jump.dataset.jump)?.scrollIntoView({ behavior: 'smooth' });
  if (commandOpen) openCommandPalette();
  if (commandTarget) {
    qs(commandTarget.dataset.commandTarget)?.scrollIntoView({ behavior: 'smooth' });
    qs('#command-modal')?.close();
    showToast(`Opened ${commandTarget.textContent}`);
  }
});

document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    openCommandPalette();
  }
  if (event.key === '/' && document.activeElement.tagName !== 'INPUT') {
    event.preventDefault();
    qs('#account-search')?.focus();
  }
});

renderApp();
