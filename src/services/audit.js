export const auditActions = Object.freeze(['login', 'logout', 'password_change', 'vault_unlock', 'recovery_update', 'device_change', 'organization_invite', 'export', 'backup']);

export function createAuditEvent(action, details = {}) {
  return {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action,
    details,
    createdAt: new Date().toISOString(),
    severity: details.severity || 'info'
  };
}
