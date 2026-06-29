/** Navbar component: compact mobile navigation with ARIA expanded state. */
export function Navbar() {
  return `
    <header class="mobile-topbar glass">
      <a class="brand" href="#dashboard"><span class="logo" aria-hidden="true"><span></span></span>SecureSwitch</a>
      <button class="ghost" id="mobile-menu-button" type="button" aria-expanded="false" aria-controls="mobile-menu">Menu</button>
    </header>
    <nav class="mobile-menu glass" id="mobile-menu" aria-label="Mobile navigation">
      <a href="#dashboard">Dashboard</a><a href="#accounts">Accounts</a><a href="#vault">Vault</a><a href="#timeline">Timeline</a><a href="#settings">Settings</a>
    </nav>`;
}
