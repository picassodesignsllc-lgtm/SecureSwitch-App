// Runtime configuration placeholder for static hosting.
// CI/CD can replace this file with environment-specific public config.
window.SECURESWITCH_CONFIG = window.SECURESWITCH_CONFIG || {
  firebase: {},
  buildVersion: 'local-dev',
  deployMode: 'demo-static'
};
