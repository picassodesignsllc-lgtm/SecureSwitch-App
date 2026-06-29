/** SettingsPanels component: accessible preferences and placeholders. */
export function SettingsPanels() {
  return `<article class="panel glass" id="settings"><div class="panel-head"><div><p class="kicker">Settings</p><h2>Preferences</h2></div><button class="secondary" id="theme-toggle" aria-pressed="true">Light mode</button></div><div class="settings-grid"><label><input type="checkbox" checked /> Keyboard shortcuts</label><label><input type="checkbox" checked /> Reduced motion support</label><label><input type="checkbox" checked /> Toast notifications</label><label><input type="checkbox" /> Family approvals</label></div></article>`;
}
