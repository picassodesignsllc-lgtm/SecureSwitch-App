/** Sidebar component: desktop navigation and workspace metadata. */
export function Sidebar() {
  const links = ['Dashboard', 'Accounts', 'Vault', 'Timeline', 'Settings'];
  return `
    <aside class="sidebar glass" aria-label="Primary navigation">
      <a class="brand" href="#dashboard"><span class="logo" aria-hidden="true"><span></span></span>SecureSwitch</a>
      <nav class="nav-stack">${links.map((label) => `<a href="#${label.toLowerCase()}">${label}</a>`).join('')}</nav>
      <article class="workspace-card"><p class="kicker">Workspace</p><strong>Alex Morgan</strong><span>Personal recovery OS</span></article>
    </aside>`;
}
