import { explainableSecurityScore } from './aiCopilot.js';

export const enterpriseRoles = Object.freeze(['Owner', 'Admin', 'Manager', 'Member', 'Read Only']);

export function createOrganizationRecord({ name, role = 'Owner', ownerId = '', now = new Date() } = {}) {
  const id = `org-${String(name || 'organization').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || Date.now()}`;
  return { id, name: name || 'SecureSwitch Organization', role, ownerId, members: 1, devices: 0, accounts: 0, auditLogs: 0, recoveryPolicies: 7, securityScore: 0, createdAt: now.toISOString(), activity: 'Organization created', permission: role === 'Read Only' ? 'View only' : 'Manage recovery readiness' };
}

export function createInvitation({ email, role = 'Member', organizationId, inviter = 'SecureSwitch', now = new Date() }) {
  const expiresAt = new Date(now.getTime() + 7 * 86400000).toISOString();
  return { id: `invite-${Date.now()}`, email, role, organizationId, inviter, status: 'Pending', createdAt: now.toISOString(), expiresAt };
}

export function enterpriseAuditEvent({ action, actor = 'System', category = 'General', description = '', severity = 'Info', now = new Date() }) {
  return { id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, action, actor, category, description: description || action, severity, timestamp: now.toISOString() };
}

export function defaultSecurityPolicies(overrides = {}) {
  return { minimumMfa: true, requirePasskeys: false, recoveryRequirements: 'Recovery email, phone, backup codes', passwordRotation: '180 days', trustedDevices: true, exportRestrictions: true, sessionTimeout: '30 minutes', ...overrides };
}

export function createApproval({ action, actor = 'System', target = '', category = 'Security', now = new Date() }) {
  return { id: `approval-${Date.now()}`, action, actor, target, category, status: 'Pending', createdAt: now.toISOString(), history: [{ status: 'Pending', actor, at: now.toISOString() }] };
}

export function enterpriseAdminMetrics({ users = 1, accounts = [], devices = [], alerts = [], activity = [] } = {}) {
  const score = explainableSecurityScore(accounts);
  const mfa = accounts.length ? Math.round((accounts.filter((account) => account.authenticator && !/sms only/i.test(account.authenticator)).length / accounts.length) * 100) : 0;
  const recovery = accounts.length ? Math.round((accounts.filter((account) => account.recoveryEmail && account.recoveryPhone && account.backupCodes).length / accounts.length) * 100) : 0;
  return {
    totalUsers: users,
    totalAccounts: accounts.length,
    mfaAdoption: mfa,
    weakAccounts: score.analyses.filter((item) => item.risk === 'High' || item.risk === 'Critical').length,
    criticalAlerts: alerts.filter((alert) => /critical|high/i.test(alert.severity || alert.status || '')).length,
    recoveryCoverage: recovery,
    recentActivity: activity.length,
    securityTrend: score.score >= 85 ? 'Improving' : score.score >= 65 ? 'Stable' : 'At risk'
  };
}

export function reportingMetrics(accounts = [], organizations = [], activity = []) {
  const score = explainableSecurityScore(accounts);
  const riskCounts = score.analyses.reduce((map, item) => ({ ...map, [item.risk]: (map[item.risk] || 0) + 1 }), {});
  return [
    ['Security Score', `${score.score}%`],
    ['MFA Coverage', `${accounts.length ? Math.round((accounts.filter((account) => account.authenticator).length / accounts.length) * 100) : 0}%`],
    ['Recovery Coverage', `${accounts.length ? Math.round((accounts.filter((account) => account.recoveryEmail && account.recoveryPhone).length / accounts.length) * 100) : 0}%`],
    ['Risk Distribution', Object.entries(riskCounts).map(([risk, count]) => `${risk}: ${count}`).join(' · ') || 'No accounts'],
    ['Organization Growth', `${organizations.length} organizations`],
    ['Activity', `${activity.length} recent events`]
  ];
}

export function reorderWidget(order, widget, direction) {
  const items = order.slice();
  const index = items.indexOf(widget);
  if (index === -1) return items;
  const next = direction === 'up' ? Math.max(0, index - 1) : Math.min(items.length - 1, index + 1);
  [items[index], items[next]] = [items[next], items[index]];
  return items;
}
