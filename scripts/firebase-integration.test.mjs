import test from 'node:test';
import assert from 'node:assert/strict';
import { applyBulkReview, buildActivityEvent, buildNotification, buildSecurityScoreDocument, recoveryProfileFromForm, userScopedPath } from '../src/services/liveData.js';
import { analyzeAccountSecurity, answerSecurityQuestion, buildSecurityTimeline, executiveSecurityMetrics, explainableSecurityScore, generateSecurityRecommendations } from '../src/services/aiCopilot.js';
import { achievementProgress, executiveInsightCards, quickFixActions, securityStreak } from '../src/services/delight.js';

const firebase = { serverTimestamp: () => 'SERVER_TIME' };

test('live data paths are always scoped under the signed-in user', () => {
  assert.deepEqual(userScopedPath('user-123', 'accounts', 'google'), ['users', 'user-123', 'accounts', 'google']);
  assert.throws(() => userScopedPath('', 'accounts'), /Firebase user id/);
  assert.throws(() => userScopedPath('user-123', 'publicAccounts'), /Unsupported/);
});

test('security score document is calculated from stored account data', () => {
  const accounts = [
    { id: 'google', name: 'Google', recoveryEmail: 'safe@example.com', recoveryPhone: '+15550100', backupCodes: 'Saved', authenticator: 'Passkey', trustedContacts: 'Alicia', passkeyStatus: 'Enabled', lastReviewed: '2026-06-01' },
    { id: 'instagram', name: 'Instagram', recoveryEmail: '', recoveryPhone: '', backupCodes: '', authenticator: 'SMS only', trustedContacts: '', lastReviewed: '2025-01-01' }
  ];
  const doc = buildSecurityScoreDocument(accounts, firebase);
  assert.equal(doc.totalAccounts, 2);
  assert.equal(doc.missingBackupCodes, 1);
  assert.equal(doc.missingRecoveryEmail, 1);
  assert.equal(doc.updatedAt, 'SERVER_TIME');
  assert.ok(doc.score < 100);
  assert.ok(doc.reasons.some((item) => item.accountName === 'Instagram'));
});

test('account activity and notifications include live account context', () => {
  const account = { id: 'coinbase', name: 'Coinbase', backupCodes: '', recoveryEmail: '', recoveryPhone: '', authenticator: '' };
  const activity = buildActivityEvent('updated', account, firebase);
  const notification = buildNotification('updated', account, firebase);
  assert.equal(activity.accountId, 'coinbase');
  assert.match(activity.title, /Coinbase/);
  assert.equal(notification.unread, true);
  assert.match(notification.title, /Coinbase/);
});

test('bulk review updates only selected accounts', () => {
  const result = applyBulkReview([{ id: 'a', status: 'Review' }, { id: 'b', status: 'Review' }], ['b'], '2026-07-01');
  assert.equal(result[0].status, 'Review');
  assert.equal(result[1].status, 'Secure');
  assert.equal(result[1].lastReviewed, '2026-07-01');
});

test('recovery profile normalizes editable recovery center form values', () => {
  const form = {
    recoveryEmail: { value: ' recovery@example.com ' },
    recoveryPhone: { value: ' +1 555 0100 ' },
    backupCodes: { value: ' Generated ' },
    trustedDevice: { value: ' iPhone 15 ' },
    passkeyStatus: { value: ' Enabled ' },
    authenticatorStatus: { value: ' 1Password ' },
    recoveryContact: { value: ' Alicia ' }
  };
  const profile = recoveryProfileFromForm(form, firebase);
  assert.equal(profile.recoveryEmail, 'recovery@example.com');
  assert.equal(profile.trustedDevice, 'iPhone 15');
  assert.equal(profile.updatedAt, 'SERVER_TIME');
});


test('AI copilot creates explainable account risk and recommendations', () => {
  const accounts = [
    { id: 'instagram', name: 'Instagram', recoveryEmail: '', recoveryPhone: '', backupCodes: '', authenticator: 'SMS only', trustedContacts: '', lastReviewed: '2024-01-01' },
    { id: 'google', name: 'Google', recoveryEmail: 'safe@example.com', recoveryPhone: '+15550100', backupCodes: 'Saved', authenticator: 'Passkey', trustedContacts: 'Alicia', passkeyStatus: 'Enabled', deviceVerification: 'Trusted', lastReviewed: '2026-06-01' }
  ];
  const analysis = analyzeAccountSecurity(accounts[0], new Date('2026-07-01'));
  const score = explainableSecurityScore(accounts, new Date('2026-07-01'));
  const recommendations = generateSecurityRecommendations(accounts, [], new Date('2026-07-01'));
  assert.equal(analysis.accountName, 'Instagram');
  assert.ok(analysis.deductions.some((item) => item.reason === 'No recovery email'));
  assert.ok(score.deductions.length >= analysis.deductions.length);
  assert.equal(recommendations[0].accountName, 'Instagram');
});

test('AI copilot answers natural language questions and builds chronological timeline', () => {
  const accounts = [{ id: 'coinbase', name: 'Coinbase', recoveryEmail: '', recoveryPhone: '', backupCodes: '', authenticator: '', lastReviewed: '2023-01-01' }];
  const answer = answerSecurityQuestion('What should I fix first?', { accounts, devices: [] });
  const timeline = buildSecurityTimeline({ accounts, activity: [{ title: 'Recovery updated', createdAt: '2026-07-01T10:00:00.000Z' }], devices: [] });
  const metrics = executiveSecurityMetrics(accounts, [], new Date('2026-07-01'));
  assert.match(answer, /Coinbase/);
  assert.equal(timeline[0].title, 'Recovery updated');
  assert.equal(metrics.totalAccounts, 1);
  assert.ok(metrics.criticalIssues > 0);
});


test('delight layer derives executive insights, achievements, streaks, and quick fixes', () => {
  const accounts = [
    { id: 'apple', name: 'Apple', recoveryEmail: 'safe@example.com', recoveryPhone: '+15550100', backupCodes: 'Saved', authenticator: 'Passkey', trustedContacts: 'Alicia', passkeyStatus: 'Enabled', deviceVerification: 'Trusted', lastReviewed: '2026-06-01' },
    { id: 'paypal', name: 'PayPal', recoveryEmail: '', recoveryPhone: '', backupCodes: '', authenticator: 'SMS only', trustedContacts: '', lastReviewed: '2024-01-01' }
  ];
  const insights = executiveInsightCards(accounts, [], [{ title: 'Backup Complete', createdAt: '2026-07-01T12:00:00.000Z' }]);
  const achievements = achievementProgress(accounts, [], []);
  const fixes = quickFixActions(accounts, []);
  const streak = securityStreak([{ createdAt: '2026-07-01T12:00:00.000Z' }]);
  assert.ok(insights.some((item) => item.title === 'Highest Risk Account'));
  assert.ok(achievements.some((item) => item.name === 'Recovery Rookie' && item.unlocked));
  assert.equal(fixes[0].accountName, 'PayPal');
  assert.ok(streak.current >= 1);
});
