const accounts = [
  { name: 'Gmail', category: 'Email', phone: '+1 (415) 555-0184', email: 'recovery@secureswitch.test', url: 'https://myaccount.google.com/security', done: true },
  { name: 'Chase', category: 'Banking', phone: '+1 (415) 555-0184', email: 'finance@secureswitch.test', url: 'https://www.chase.com/digital/resources/privacy-security/security-center', done: false },
  { name: 'Coinbase', category: 'Crypto', phone: '+1 (415) 555-0184', email: 'crypto@secureswitch.test', url: 'https://www.coinbase.com/settings/security', done: false },
  { name: 'Instagram', category: 'Social Media', phone: '+1 (415) 555-0184', email: 'social@secureswitch.test', url: 'https://www.instagram.com/accounts/privacy_and_security/', done: true },
  { name: 'Amazon', category: 'Shopping', phone: '+1 (212) 555-0110', email: 'shopping@secureswitch.test', url: 'https://www.amazon.com/a/settings/approval', done: true },
  { name: 'Slack', category: 'Business', phone: '+1 (628) 555-0149', email: 'work@secureswitch.test', url: 'https://slack.com/account/settings', done: false }
];

const categories = ['Banking', 'Social Media', 'Email', 'Crypto', 'Shopping', 'Business'];
const categoryGrid = document.querySelector('#category-grid');
const recoveryFilter = document.querySelector('#recovery-filter');
const linkedResults = document.querySelector('#linked-results');
const checklist = document.querySelector('#checklist');
const checklistCount = document.querySelector('#checklist-count');
const checklistBar = document.querySelector('#checklist-bar');
const switchToggle = document.querySelector('#switch-toggle');
const phoneForm = document.querySelector('#phone-form');
const oldPhone = document.querySelector('#old-phone');

function renderCategories() {
  categoryGrid.innerHTML = categories.map((category) => {
    const total = accounts.filter((account) => account.category === category).length;
    return `<div class="category-card"><strong>${category}</strong><span>${total} account${total === 1 ? '' : 's'}</span></div>`;
  }).join('');
}

function populateRecoveryFilter() {
  const values = [...new Set(accounts.flatMap((account) => [account.phone, account.email]))];
  recoveryFilter.innerHTML = values.map((value) => `<option value="${value}">${value}</option>`).join('');
}

function renderLinkedAccounts() {
  const value = recoveryFilter.value;
  const matches = accounts.filter((account) => account.phone === value || account.email === value);
  linkedResults.innerHTML = matches.map((account) => `
    <article class="linked-card">
      <div><strong>${account.name}</strong><br><span>${account.category}</span></div>
      <a href="${account.url}" target="_blank" rel="noreferrer">Security page</a>
    </article>
  `).join('') || '<p class="muted">No accounts found for this recovery path.</p>';
}

function renderChecklist() {
  const affected = accounts.filter((account) => account.phone === oldPhone.value.trim());
  const completed = affected.filter((account) => account.done).length;
  checklistCount.textContent = `${completed} of ${affected.length} complete`;
  checklistBar.style.width = affected.length ? `${(completed / affected.length) * 100}%` : '0%';
  checklist.innerHTML = affected.map((account, index) => `
    <li class="${account.done ? 'completed' : ''}">
      <label>
        <input type="checkbox" data-name="${account.name}" ${account.done ? 'checked' : ''} />
        ${account.name} <span class="muted">${account.category}</span>
      </label>
      <a href="${account.url}" target="_blank" rel="noreferrer">Update</a>
    </li>
  `).join('') || '<li>No accounts currently use that phone number.</li>';
}

recoveryFilter.addEventListener('change', renderLinkedAccounts);
switchToggle.addEventListener('click', () => {
  const isPressed = switchToggle.getAttribute('aria-pressed') === 'true';
  switchToggle.setAttribute('aria-pressed', String(!isPressed));
});
phoneForm.addEventListener('submit', (event) => {
  event.preventDefault();
  switchToggle.setAttribute('aria-pressed', 'true');
  renderChecklist();
});
checklist.addEventListener('change', (event) => {
  const accountName = event.target.dataset.name;
  const account = accounts.find((item) => item.name === accountName);
  if (account) account.done = event.target.checked;
  renderChecklist();
});

renderCategories();
populateRecoveryFilter();
renderLinkedAccounts();
renderChecklist();
