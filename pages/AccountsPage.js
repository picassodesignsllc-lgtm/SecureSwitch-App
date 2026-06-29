/** Accounts page: searchable and draggable account organization. */
export function AccountsPage() {
  return `<section class="panel glass" id="accounts"><div class="panel-head"><div><p class="kicker">Accounts</p><h2>Search instantly. Drag to organize.</h2></div><input id="account-search" type="search" placeholder="Search every account, device, contact, note…" aria-label="Search accounts" /></div><div class="skeletons" id="skeletons"><span></span><span></span><span></span></div><div class="account-list" id="account-list"></div></section>`;
}
