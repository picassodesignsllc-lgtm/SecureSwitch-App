/** Recovery Health Engine: scores accounts from stable recovery readiness signals. */
const signals = [
  ['Recovery email', (account) => Boolean(account.email), 18],
  ['Recovery phone', (account) => Boolean(account.phone), 16],
  ['Backup codes', (account) => account.codes >= 6, 18],
  ['Trusted contacts', (account) => Boolean(account.contact), 16],
  ['Devices', (account) => Boolean(account.device), 14],
  ['Strong 2FA', (account) => account.method !== 'SMS', 18]
];

export function calculateRecoveryScore(accounts) {
  const rows = signals.map(([label, predicate, weight]) => {
    const percent = Math.round((accounts.filter(predicate).length / accounts.length) * 100);
    return { label, percent, points: Math.round((percent / 100) * weight) };
  });
  return { score: Math.round(rows.reduce((sum, row) => sum + row.points, 0) * 0.9), rows };
}
