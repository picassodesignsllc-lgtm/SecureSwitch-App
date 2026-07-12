export const accountCategories = ['Email', 'Banking', 'Crypto', 'Social', 'Cloud', 'Government', 'Healthcare', 'Business', 'Utilities', 'Custom'];
export const firestoreCollections = ['users', 'accounts', 'vault', 'recoveryHistory', 'notifications', 'emergencyContacts', 'devices'];
export const accountSchemaFields = ['serviceName', 'username', 'category', 'recoveryEmail', 'recoveryPhone', 'authenticatorStatus', 'passkeyStatus', 'backupCodeStatus', 'trustedContacts', 'deviceVerification', 'lastReviewed', 'recoveryScore'];

export function normalizeAccount(record = {}) {
  const id = record.id || (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `acct-${Date.now()}`);
  return {
    id,
    name: record.name || record.serviceName || 'Untitled Account',
    handle: record.handle || record.username || '',
    category: accountCategories.includes(record.category) ? record.category : 'Custom',
    recoveryEmail: record.recoveryEmail || record.email || '',
    recoveryPhone: record.recoveryPhone || record.phone || '',
    authenticator: record.authenticator || record.authenticatorStatus || '',
    passkeyStatus: record.passkeyStatus || (/passkey/i.test(record.authenticator || '') ? 'Enabled' : ''),
    backupCodes: record.backupCodes || record.backupCodeStatus || '',
    trustedContacts: record.trustedContacts || '',
    deviceVerification: record.deviceVerification || record.deviceStatus || (record.ready ? 'Verified device' : ''),
    lastReviewed: record.lastReviewed || new Date().toISOString().slice(0, 10),
    color: record.color || '#2bb8ff',
    status: record.status || 'Review',
    ready: Boolean(record.ready)
  };
}

export function scoreAccount(account = {}) {
  const reviewedAt = Date.parse(account.lastReviewed || '');
  const daysSinceReview = Number.isFinite(reviewedAt) ? (Date.now() - reviewedAt) / 86400000 : Infinity;
  const signals = [
    account.recoveryEmail,
    account.recoveryPhone,
    account.backupCodes,
    account.passkeyStatus || account.authenticator,
    account.trustedContacts,
    daysSinceReview <= 120 ? account.lastReviewed : ''
  ];
  return Math.round((signals.filter(Boolean).length / signals.length) * 100);
}

export function riskLevel(account = {}) {
  const score = scoreAccount(account);
  if (score >= 85) return 'Low';
  if (score >= 67) return 'Medium';
  return 'High';
}

export function recommendationsFor(account = {}) {
  const recommendations = [];
  if (!account.recoveryEmail) recommendations.push(`${account.name} needs a recovery email.`);
  if (!account.recoveryPhone) recommendations.push(`${account.name} needs a recovery phone.`);
  if (!account.backupCodes) recommendations.push(`${account.name} is missing backup codes.`);
  if (!account.passkeyStatus) recommendations.push(`${account.name} should add a passkey.`);
  if (!account.authenticator || /sms/i.test(account.authenticator)) recommendations.push(`${account.name} should move from SMS to an authenticator or hardware key.`);
  if (!account.trustedContacts) recommendations.push(`${account.name} needs a trusted contact.`);
  const reviewedAt = Date.parse(account.lastReviewed || '');
  if (!Number.isFinite(reviewedAt) || (Date.now() - reviewedAt) / 86400000 > 120) recommendations.push(`${account.name} needs a fresh security review.`);
  return recommendations;
}

export function dashboardSummary(accounts = []) {
  const scored = accounts.map((account) => ({ ...account, recoveryScore: scoreAccount(account) }));
  const total = scored.length;
  const recoveryScore = total ? Math.round(scored.reduce((sum, account) => sum + account.recoveryScore, 0) / total) : 0;
  const missingRecoveryEmail = scored.filter((account) => !account.recoveryEmail).length;
  const missingBackupCodes = scored.filter((account) => !account.backupCodes).length;
  const missingRecoveryPhone = scored.filter((account) => !account.recoveryPhone).length;
  const missingMfa = scored.filter((account) => (!account.authenticator && !account.passkeyStatus) || /sms/i.test(account.authenticator)).length;
  const missingTrustedContacts = scored.filter((account) => !account.trustedContacts).length;
  const weakRecoveryAccounts = scored.filter((account) => account.recoveryScore < 80).length;
  const highRiskAccounts = scored.filter((account) => riskLevel(account) === 'High').length;
  const recentlyUpdated = [...scored].sort((a, b) => String(b.lastReviewed).localeCompare(String(a.lastReviewed))).slice(0, 3);
  const securityAlerts = scored.flatMap(recommendationsFor).slice(0, 6);
  const upcomingReviews = scored.filter((account) => account.recoveryScore < 90).slice(0, 4);
  const suggestedNextFixes = securityAlerts.slice(0, 4);
  return { total, recoveryScore, missingRecoveryEmail, missingRecoveryPhone, missingBackupCodes, missingMfa, missingTrustedContacts, weakRecoveryAccounts, highRiskAccounts, recentlyUpdated, securityAlerts, suggestedNextFixes, upcomingReviews, scored };
}
