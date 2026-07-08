export function createBackupManifest(records = []) {
  return {
    product: 'SecureSwitch',
    format: 'encrypted-backup-manifest',
    version: 1,
    createdAt: new Date().toISOString(),
    encryptedRecordCount: records.length,
    restoreSupported: true
  };
}

export const backupCapabilities = Object.freeze(['Automatic backups', 'Manual backups', 'Restore backup', 'Export encrypted vault', 'Import encrypted vault']);
