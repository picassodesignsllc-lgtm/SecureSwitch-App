/** RecoveryTimeline component: chronological account recovery changes. */
export function RecoveryTimeline(items) {
  return `<article class="panel glass" id="timeline"><p class="kicker">Recovery timeline</p><h2>Recent changes</h2><ol class="timeline">${items.map(([when, what]) => `<li><time>${when}</time><span>${what}</span></li>`).join('')}</ol></article>`;
}
