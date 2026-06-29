/** RecoveryScoreCard component: displays score and signal breakdown. */
export function RecoveryScoreCard({ score, rows }) {
  return `
    <article class="panel glass score-panel" id="health" aria-label="Recovery score ${score} out of 100">
      <div class="score-orb"><strong>${score}</strong><span>/ 100 recovery health</span></div>
      <div class="health-list">${rows.map((row) => `<div class="health-row"><span>${row.label}</span><div><i style="width:${row.percent}%"></i></div><strong>${row.percent}%</strong></div>`).join('')}</div>
    </article>`;
}
