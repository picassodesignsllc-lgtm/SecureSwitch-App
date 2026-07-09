export const serviceRegistry = Object.freeze({
  authentication: ['signIn', 'signOut', 'verifyEmail', 'resetPassword', 'providerSignIn'],
  billing: ['plans', 'subscriptionStatus', 'checkoutSession', 'portalSession', 'invoices'],
  recovery: ['score', 'recommendations', 'timeline', 'readiness'],
  organizations: ['createOrganization', 'inviteMember', 'roles', 'permissions'],
  notifications: ['alerts', 'reminders', 'markRead', 'preferences'],
  vault: ['unlock', 'encrypt', 'backup', 'restore', 'export', 'import'],
  reports: ['recoveryReport', 'securityAudit', 'executiveSummary', 'exports'],
  settings: ['profile', 'privacy', 'accessibility', 'developerMode']
});

export function createApiClient({ firebaseReady = false, user = null } = {}) {
  return {
    mode: firebaseReady && user ? 'production' : 'demo',
    isProductionReady() { return firebaseReady && Boolean(user); },
    requireUser() {
      if (!firebaseReady || !user) throw new Error('Production API requires an authenticated Firebase user.');
      return user;
    }
  };
}
