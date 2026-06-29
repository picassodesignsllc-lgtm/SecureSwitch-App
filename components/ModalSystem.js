/** ModalSystem component: app-wide command palette shell. */
export function ModalSystem() {
  return `<dialog class="command-modal glass" id="command-modal"><input id="command-input" aria-label="Command search" placeholder="Search accounts or jump anywhere…" /><div id="command-results"></div></dialog>`;
}
