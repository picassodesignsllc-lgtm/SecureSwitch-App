export const billingPlans = Object.freeze([
  { id: 'free', name: 'Free', price: '$0', interval: 'forever', features: ['Demo vault', 'Local exports', 'Recovery score'] },
  { id: 'pro', name: 'Pro', price: '$9.99', interval: 'month', features: ['Unlimited accounts', 'Encrypted backups', 'AI recovery coach'] },
  { id: 'family', name: 'Family', price: '$19.99', interval: 'month', features: ['Family vaults', 'Shared contacts', 'Invite management'] },
  { id: 'business', name: 'Business', price: '$49.99', interval: 'month', features: ['Organizations', 'Admin analytics', 'Security reports'] },
  { id: 'enterprise', name: 'Enterprise', price: 'Custom', interval: 'annual', features: ['SSO-ready architecture', 'Audit exports', 'Priority support'] }
]);

export function getSubscriptionSnapshot({ plan = 'free', trialEndsAt = null } = {}) {
  const selected = billingPlans.find((item) => item.id === plan) || billingPlans[0];
  return {
    plan: selected,
    status: plan === 'free' ? 'Demo / Free' : 'Active',
    trialEndsAt,
    stripeConnected: false,
    secretKeysExposed: false,
    billingHistory: [
      { id: 'demo-invoice-001', date: 'Demo', amount: '$0.00', status: 'No Stripe charge' }
    ],
    availableActions: ['Upgrade', 'Downgrade', 'Cancel', 'Restore', 'Start Trial']
  };
}
