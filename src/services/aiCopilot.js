const DAY = 86400000;

function daysSince(date, now = new Date()) {
  const parsed = Date.parse(date || '');
  if (!Number.isFinite(parsed)) return Infinity;
  return Math.max(0, Math.floor((now.getTime() - parsed) / DAY));
}

function severityFor(points) {
  if (points >= 18) return 'Critical';
  if (points >= 12) return 'High';
  if (points >= 7) return 'Medium';
  if (points > 0) return 'Low';
  return 'Safe';
}

export function analyzeAccountSecurity(account, now = new Date()) {
  const deductions = [];
  const add = (reason, points, action) => deductions.push({ accountId: account.id || account.name, accountName: account.name, reason, severity: severityFor(points), recommendedAction: action, estimatedImprovement: points });
  if (!account.recoveryEmail) add('No recovery email', 15, 'Verify Recovery Email');
  if (!account.recoveryPhone) add('No recovery phone', 10, 'Add Recovery Phone');
  if (!account.backupCodes) add('No backup codes', 15, 'Add Backup Codes');
  if (!account.trustedContacts) add('No trusted recovery contact', 8, 'Add Recovery Contact');
  if (!account.authenticator || /sms only|sms/i.test(account.authenticator)) add(account.authenticator ? 'SMS-based MFA is still risky' : 'MFA not recorded', 14, 'Update MFA');
  if (!account.passkeyStatus) add('No passkey recorded', 8, 'Enable Passkeys');
  if (!account.deviceVerification) add('Trusted devices not verified', 6, 'Review Trusted Devices');
  const staleDays = daysSince(account.lastReviewed, now);
  if (staleDays > 365) add(`Security has not been reviewed in ${staleDays === Infinity ? 'over a year' : `${staleDays} days`}`, 12, 'Run Security Review');
  else if (staleDays > 180) add(`Security review is ${staleDays} days old`, 6, 'Schedule Review');
  const totalDeduction = deductions.reduce((sum, item) => sum + item.estimatedImprovement, 0);
  const score = Math.max(0, Math.min(100, 100 - totalDeduction));
  const risk = score >= 95 ? 'Safe' : score >= 82 ? 'Low' : score >= 68 ? 'Medium' : score >= 45 ? 'High' : 'Critical';
  return { accountId: account.id, accountName: account.name, score, risk, priority: risk === 'Critical' ? 1 : risk === 'High' ? 2 : risk === 'Medium' ? 3 : risk === 'Low' ? 4 : 5, recommendedAction: deductions[0]?.recommendedAction || 'Maintain Protection', deductions };
}

export function explainableSecurityScore(accounts, now = new Date()) {
  const analyses = accounts.map((account) => analyzeAccountSecurity(account, now));
  const score = analyses.length ? Math.round(analyses.reduce((sum, item) => sum + item.score, 0) / analyses.length) : 0;
  return { score, analyses, deductions: analyses.flatMap((item) => item.deductions).sort((a, b) => b.estimatedImprovement - a.estimatedImprovement) };
}

export function generateSecurityRecommendations(accounts, devices = [], now = new Date()) {
  const { deductions } = explainableSecurityScore(accounts, now);
  const deviceRecommendations = devices.filter((device) => !device.trusted).map((device) => ({ title: 'Remove Old Devices', accountName: device.name || device.browser || 'Device', severity: 'Medium', recommendedAction: 'Review Device', estimatedImprovement: 6, reason: `${device.browser || 'Device'} is not trusted.` }));
  return deductions.map((item) => ({ title: item.recommendedAction, ...item })).concat(deviceRecommendations).sort((a, b) => b.estimatedImprovement - a.estimatedImprovement).slice(0, 10);
}

export function buildSecurityTimeline({ accounts = [], activity = [], notifications = [], auditEvents = [], devices = [] } = {}) {
  const events = [];
  accounts.forEach((account) => {
    events.push({ type: 'Account added', title: `${account.name} protected`, detail: account.handle || account.category || 'Account registry', at: account.createdAt || account.updatedAt || account.lastReviewed || new Date().toISOString() });
    if (account.lastReviewed) events.push({ type: 'Security review', title: `${account.name} reviewed`, detail: `${analyzeAccountSecurity(account).score}% health score`, at: account.lastReviewed });
    if (account.backupCodes) events.push({ type: 'Backup generated', title: `${account.name} backup codes recorded`, detail: account.backupCodes, at: account.updatedAt || account.lastReviewed || new Date().toISOString() });
  });
  activity.forEach((item) => events.push({ type: item.type || 'Recovery updated', title: item.title || 'Activity', detail: item.accountName || item.category || 'SecureSwitch', at: item.createdAt || item.updatedAt || new Date().toISOString() }));
  notifications.forEach((item) => events.push({ type: 'Notifications', title: item.title || 'Notification', detail: item.detail || item.category || 'Unread signal', at: item.createdAt || item.updatedAt || new Date().toISOString() }));
  auditEvents.forEach((item) => events.push({ type: item.action === 'device_change' ? 'Device removed' : item.action === 'recovery_update' ? 'Recovery updated' : item.action === 'backup' ? 'Backup generated' : 'Audit completed', title: String(item.action || 'audit').replaceAll('_', ' '), detail: item.details?.account || item.details?.type || 'Audit event', at: item.createdAt || new Date().toISOString() }));
  devices.forEach((device) => events.push({ type: device.trusted ? 'Device added' : 'Device review', title: device.browser || device.name || 'Device', detail: `${device.os || 'Unknown OS'} · ${device.location || 'Unknown location'}`, at: device.lastActive || device.createdAt || new Date().toISOString() }));
  return events.sort((a, b) => Date.parse(b.at || 0) - Date.parse(a.at || 0)).slice(0, 40);
}

export function executiveSecurityMetrics(accounts, devices = [], now = new Date()) {
  const score = explainableSecurityScore(accounts, now);
  const analyses = score.analyses;
  const protectedAccounts = analyses.filter((item) => item.risk === 'Safe' || item.risk === 'Low').length;
  const critical = analyses.filter((item) => item.risk === 'Critical' || item.risk === 'High').length;
  const passkeys = accounts.filter((account) => account.passkeyStatus).length;
  const recoveryCovered = accounts.filter((account) => account.recoveryEmail && account.recoveryPhone && account.backupCodes).length;
  return {
    totalAccounts: accounts.length,
    accountsProtected: protectedAccounts,
    criticalIssues: score.deductions.filter((item) => item.severity === 'Critical' || item.severity === 'High').length,
    recoveryCoverage: accounts.length ? Math.round((recoveryCovered / accounts.length) * 100) : 0,
    passkeyAdoption: accounts.length ? Math.round((passkeys / accounts.length) * 100) : 0,
    averageHealthScore: score.score,
    weeklyProgress: Math.max(0, Math.min(100, 100 - critical * 8 + protectedAccounts * 3)),
    securityTrend: score.score >= 85 ? 'Improving' : score.score >= 65 ? 'Needs review' : 'Urgent',
    trustedDevices: devices.filter((device) => device.trusted).length
  };
}

export function dailySecurityInsights(accounts, devices = [], now = new Date()) {
  const score = explainableSecurityScore(accounts, now);
  const missingRecovery = accounts.filter((account) => !account.recoveryEmail || !account.recoveryPhone).length;
  const missingBackups = accounts.filter((account) => !account.backupCodes).length;
  const oldestReview = accounts.reduce((max, account) => Math.max(max, daysSince(account.lastReviewed, now) === Infinity ? 0 : daysSince(account.lastReviewed, now)), 0);
  const riskyDevices = devices.filter((device) => !device.trusted).length;
  return [
    score.score >= 80 ? `You improved security readiness to ${score.score}%.` : `Your security score is ${score.score}% because ${score.deductions[0]?.reason || 'accounts need review'}.`,
    missingRecovery ? `${missingRecovery} accounts still need recovery email or phone coverage.` : 'All reviewed accounts have recovery contact paths.',
    missingBackups ? `No backups exist for ${missingBackups} important account${missingBackups === 1 ? '' : 's'}.` : 'Backup code coverage is recorded for every reviewed account.',
    oldestReview ? `You have not reviewed security on at least one account in ${oldestReview} days.` : 'Recent review history is up to date.',
    riskyDevices ? `${riskyDevices} device${riskyDevices === 1 ? '' : 's'} should be reviewed.` : 'No risky devices are currently flagged.'
  ];
}

export function answerSecurityQuestion(question, context) {
  const query = String(question || '').toLowerCase();
  const accounts = context.accounts || [];
  const devices = context.devices || [];
  const recommendations = generateSecurityRecommendations(accounts, devices);
  const score = explainableSecurityScore(accounts);
  const weakest = score.analyses.slice().sort((a, b) => a.score - b.score).slice(0, 5);
  if (/weakest|weak/i.test(query)) return weakest.map((item) => `${item.accountName}: ${item.score}% · ${item.risk} · ${item.recommendedAction}`).join('\n') || 'No accounts are available yet.';
  if (/missing recovery|recovery methods/i.test(query)) return accounts.filter((account) => !account.recoveryEmail || !account.recoveryPhone || !account.backupCodes).map((account) => `${account.name}: ${[!account.recoveryEmail && 'recovery email', !account.recoveryPhone && 'recovery phone', !account.backupCodes && 'backup codes'].filter(Boolean).join(', ')}`).join('\n') || 'Every account has core recovery methods recorded.';
  if (/fix first|priority|first/i.test(query)) return recommendations[0] ? `${recommendations[0].accountName}: ${recommendations[0].reason}. Action: ${recommendations[0].recommendedAction}. Estimated improvement: +${recommendations[0].estimatedImprovement}.` : 'No urgent fixes are currently detected.';
  if (/year|reviewed/i.test(query)) return accounts.filter((account) => daysSince(account.lastReviewed) > 365).map((account) => `${account.name}: last reviewed ${account.lastReviewed || 'not recorded'}`).join('\n') || 'No accounts are overdue by more than a year.';
  if (/device/i.test(query)) return devices.filter((device) => !device.trusted).map((device) => `${device.browser || device.name}: ${device.os || 'Unknown OS'} · ${device.location || 'Unknown location'} · review trust`).join('\n') || 'No risky devices are currently flagged.';
  if (/checklist|generate/i.test(query)) return recommendations.slice(0, 6).map((item, index) => `${index + 1}. ${item.recommendedAction} for ${item.accountName} (+${item.estimatedImprovement})`).join('\n') || 'Checklist: add your first account, recovery email, phone, MFA, backup codes, and trusted device.';
  if (/score|low|why/i.test(query)) return score.deductions.slice(0, 5).map((item) => `${item.accountName}: ${item.reason} (${item.severity}, +${item.estimatedImprovement} if fixed)`).join('\n') || `Your score is ${score.score}% with no major deductions.`;
  return `I found ${accounts.length} accounts, ${score.deductions.length} score deductions, and ${recommendations.length} recommended actions. Ask “What should I fix first?” to prioritize.`;
}
