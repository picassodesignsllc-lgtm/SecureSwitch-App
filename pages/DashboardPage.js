/** Dashboard page: premium landing/dashboard composition. */
import { RecoveryScoreCard } from '../components/RecoveryScoreCard.js';
import { ActivityFeed } from '../components/ActivityFeed.js';
import { ReadinessChart } from '../components/Charts.js';

export function DashboardPage({ scoreData, activity }) {
  return `
    <section class="hero glass" id="dashboard">
      <div><p class="kicker">SecureSwitch architecture</p><h1>Never lose another account again.</h1><p class="hero-copy">A scalable static app shell with reusable components, clean data boundaries, and premium recovery workflows.</p><div class="actions"><button class="primary" data-jump="#accounts">Manage accounts</button><button class="secondary" data-command-open>Command palette</button></div></div>
      <div class="score-orb"><strong>${scoreData.score}</strong><span>/ 100 recovery health</span></div>
    </section>
    <section class="grid three">${ReadinessChart()}${ActivityFeed(activity)}${RecoveryScoreCard(scoreData)}</section>`;
}
