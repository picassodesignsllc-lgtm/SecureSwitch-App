export const billingPlans = Object.freeze([
  { id: 'free', name: 'Free', price: '$0', interval: 'forever', features: ['10 accounts', 'Basic monitoring', 'Security score'] },
  { id: 'pro_monthly', name: 'Pro Monthly', price: '$9.99', interval: 'month', features: ['Unlimited accounts', 'AI assistant', 'Recovery Center', 'Device monitoring'] },
  { id: 'pro_yearly', name: 'Pro Yearly', price: '$99.99', interval: 'year', features: ['Two months included', 'Encrypted backups', 'Audit reports', 'Dark web readiness'] },
  { id: 'enterprise', name: 'Enterprise', price: 'Contact sales', interval: 'annual prepared', features: ['SSO-ready architecture', 'Compliance exports', 'Admin controls', 'Priority support'] }
]);

export function getSubscriptionSnapshot({ plan = 'free', trialEndsAt = null } = {}) {
  const selected = billingPlans.find((item) => item.id === plan) || billingPlans[0];
  return {
    plan: selected,
    status: plan === 'free' ? 'Free / beta' : 'Prepared — payments disabled',
    trialEndsAt,
    stripeConnected: false,
    secretKeysExposed: false,
    billingHistory: [
      { id: 'beta-invoice-001', date: 'Closed beta', amount: '$0.00', status: 'Payments disabled' }
    ],
    availableActions: ['Upgrade', 'Downgrade', 'Cancel', 'Restore', 'Start Trial']
  };
}
