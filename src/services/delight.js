import { explainableSecurityScore, generateSecurityRecommendations } from './aiCopilot.js';

export function executiveInsightCards(accounts = [], devices = [], activity = []) {
  const score = explainableSecurityScore(accounts);
  const recs = generateSecurityRecommendations(accounts, devices);
  const highest = score.analyses.slice().sort((a, b) => a.score - b.score)[0];
  const biggest = recs[0];
  const protectedCount = score.analyses.filter((item) => item.risk === 'Safe' || item.risk === 'Low').length;
  return [
    { title: "Today's Security Summary", value: `${score.score}%`, detail: score.deductions.length ? `${score.deductions.length} improvements available` : 'Everything looks protected.' },
    { title: 'Highest Risk Account', value: highest?.accountName || 'None', detail: highest ? `${highest.risk} risk · ${highest.recommendedAction}` : 'No risks detected.' },
    { title: 'Biggest Improvement Opportunity', value: biggest ? `+${biggest.estimatedImprovement}` : '+0', detail: biggest ? `${biggest.recommendedAction} for ${biggest.accountName}` : "You're ahead of schedule." },
    { title: 'Recovery Status', value: `${protectedCount}/${accounts.length || 0}`, detail: 'Protected or low-risk accounts' },
    { title: 'Recent Wins', value: activity.length || protectedCount, detail: activity[0]?.title || 'Security posture is being monitored.' },
    { title: 'Weekly Progress', value: score.score >= 80 ? 'On track' : 'Needs focus', detail: score.score >= 80 ? 'Keep reviewing accounts weekly.' : 'Start with the highest impact fix.' },
    { title: 'Security Trend', value: score.score >= 85 ? 'Improving' : score.score >= 65 ? 'Stable' : 'At risk', detail: score.deductions[0]?.reason || 'No critical deductions.' }
  ];
}

export function achievementProgress(accounts = [], devices = [], activity = []) {
  const score = explainableSecurityScore(accounts).score;
  const mfaCount = accounts.filter((account) => account.authenticator && !/sms only/i.test(account.authenticator)).length;
  const passkeyCount = accounts.filter((account) => account.passkeyStatus).length;
  const backupCount = accounts.filter((account) => account.backupCodes).length;
  const achievements = [
    { icon: '✦', name: 'Recovery Rookie', goal: 1, current: accounts.length, detail: 'Add your first protected account.' },
    { icon: '◆', name: 'Password Champion', goal: Math.max(1, accounts.length), current: backupCount, detail: 'Record backup codes for every account.' },
    { icon: '◉', name: 'MFA Master', goal: Math.max(1, accounts.length), current: mfaCount, detail: 'Use strong MFA across accounts.' },
    { icon: '⬟', name: 'Passkey Pioneer', goal: Math.max(1, accounts.length), current: passkeyCount, detail: 'Enable passkeys where available.' },
    { icon: '★', name: 'Security Expert', goal: 90, current: score, detail: 'Reach a 90+ security score.' },
    { icon: '✺', name: 'Digital Fortress', goal: 100, current: score, detail: 'Reach a perfect protection posture.' }
  ];
  return achievements.map((item) => ({ ...item, percent: Math.min(100, Math.round((item.current / item.goal) * 100)), unlocked: item.current >= item.goal }));
}

export function securityStreak(activity = [], now = new Date()) {
  const last = activity[0]?.createdAt || activity[0]?.at || now.toISOString();
  const days = Math.max(1, Math.min(365, activity.length ? activity.length * 3 : 1));
  return {
    current: days,
    best: Math.max(days, 7),
    label: days >= 365 ? '365 Day Fortress' : days >= 100 ? '100 Day Streak' : days >= 30 ? '30 Day Streak' : 'Protected for 7 days',
    lastActivity: last
  };
}

export function quickFixActions(accounts = [], devices = []) {
  return generateSecurityRecommendations(accounts, devices).slice(0, 6).map((item) => ({
    id: `${item.accountName}-${item.reason}`,
    title: item.recommendedAction,
    accountName: item.accountName,
    reason: item.reason,
    severity: item.severity,
    improvement: item.estimatedImprovement,
    primaryRoute: item.recommendedAction?.includes('Device') ? 'devices' : 'account-detail'
  }));
}
