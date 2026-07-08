import { dashboardSummary, recommendationsFor, scoreAccount } from '../recoveryEngine.js';

export const liveCollections = Object.freeze([
  'accounts',
  'securityScores',
  'devices',
  'activity',
  'backupCodes',
  'recoveryContacts',
  'notifications',
  'settings',
  'billing'
]);

export function userScopedPath(uid, collectionName, docId = '') {
  if (!uid) throw new Error('A Firebase user id is required.');
  if (!liveCollections.includes(collectionName) && !['recoveryTimeline', 'recoveryMethods', 'trustedContacts', 'securityAlerts', 'emergencyKits', 'auditLogs', 'backups', 'organizations', 'organizationInvites'].includes(collectionName)) {
    throw new Error(`Unsupported SecureSwitch collection: ${collectionName}`);
  }
  return ['users', uid, collectionName, docId].filter(Boolean);
}

export function timestampValue(firebase) {
  return firebase?.serverTimestamp ? firebase.serverTimestamp() : new Date().toISOString();
}

export function buildActivityEvent(type, account, firebase) {
  const titleMap = {
    created: `${account.name} account connected`,
    updated: `${account.name} recovery details updated`,
    deleted: `${account.name} account removed`,
    bulk_reviewed: `${account.name} marked reviewed`,
    recovery_updated: 'Recovery center updated',
    device_removed: 'Device removed',
    backup_generated: 'Backup codes generated',
    passkey_enabled: 'Passkey enabled'
  };
  return {
    title: titleMap[type] || `${account.name || 'SecureSwitch'} activity updated`,
    type,
    accountId: account.id || '',
    accountName: account.name || '',
    createdAt: timestampValue(firebase)
  };
}

export function buildNotification(type, account, firebase) {
  const score = account?.name ? scoreAccount(account) : 100;
  return {
    title: type === 'deleted' ? `${account.name} removed` : type === 'recovery_updated' ? 'Recovery profile saved' : `${account.name} security score is ${score}%`,
    detail: account?.name ? (recommendationsFor(account)[0] || 'Account recovery data is up to date.') : 'Recovery data synced to Firestore.',
    category: score < 75 ? 'Security' : 'Recovery',
    unread: true,
    createdAt: timestampValue(firebase)
  };
}

export function buildSecurityScoreDocument(accounts, firebase) {
  const summary = dashboardSummary(accounts);
  return {
    score: summary.recoveryScore,
    totalAccounts: summary.total,
    missingBackupCodes: summary.missingBackupCodes,
    missingRecoveryEmail: summary.missingRecoveryEmail,
    missingRecoveryPhone: summary.missingRecoveryPhone,
    missingMfa: summary.missingMfa,
    highRiskAccounts: summary.highRiskAccounts,
    reasons: accounts.flatMap((account) => recommendationsFor(account).map((reason) => ({ accountId: account.id, accountName: account.name, reason, score: scoreAccount(account) }))).slice(0, 20),
    updatedAt: timestampValue(firebase)
  };
}

export function recoveryProfileFromForm(form, firebase) {
  return {
    recoveryEmail: String(form.recoveryEmail.value || '').trim(),
    recoveryPhone: String(form.recoveryPhone.value || '').trim(),
    backupCodes: String(form.backupCodes.value || '').trim(),
    trustedDevice: String(form.trustedDevice.value || '').trim(),
    passkeyStatus: String(form.passkeyStatus.value || '').trim(),
    authenticatorStatus: String(form.authenticatorStatus.value || '').trim(),
    recoveryContact: String(form.recoveryContact.value || '').trim(),
    updatedAt: timestampValue(firebase)
  };
}

export function applyBulkReview(accounts, ids, reviewedDate) {
  const selected = new Set(ids);
  return accounts.map((account) => selected.has(account.id) ? { ...account, status: 'Secure', lastReviewed: reviewedDate } : account);
}
