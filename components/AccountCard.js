/** AccountCard component: reusable, draggable recovery account summary. */
export function AccountCard(account, index) {
  return `
    <article class="account-card" draggable="true" tabindex="0" data-index="${index}">
      <span class="drag-handle" aria-hidden="true">⋮⋮</span>
      <div class="avatar" aria-hidden="true">${account.name.charAt(0)}</div>
      <div><strong>${account.name}</strong><span>${account.email} · ${account.method}</span><small>${account.note}</small></div>
      <span class="risk ${account.risk.toLowerCase()}">${account.risk}</span>
    </article>`;
}
