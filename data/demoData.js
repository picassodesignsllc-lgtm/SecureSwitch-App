/** Demo data for the static GitHub Pages prototype. Replace with API data later. */
export const accounts = [
  { id: 'google', name: 'Google', category: 'Identity', email: 'alex.recovery@secureswitch.test', phone: '+1 (415) 555-0184', codes: 8, device: 'MacBook Pro', contact: 'Jordan Lee', method: 'Authenticator', ready: true, risk: 'Medium', note: 'Recovery key printed.' },
  { id: 'chase', name: 'Chase', category: 'Banking', email: 'finance@secureswitch.test', phone: '+1 (415) 555-0184', codes: 0, device: 'iPhone 15', contact: 'Priya Shah', method: 'SMS', ready: false, risk: 'High', note: 'Old phone still linked.' },
  { id: 'coinbase', name: 'Coinbase', category: 'Crypto', email: 'crypto@secureswitch.test', phone: '+1 (415) 555-0184', codes: 2, device: 'YubiKey 5C', contact: 'Jordan Lee', method: 'Hardware key', ready: false, risk: 'High', note: 'Rotate backup codes.' },
  { id: 'apple', name: 'Apple ID', category: 'Identity', email: 'alex.recovery@secureswitch.test', phone: '+1 (628) 555-0149', codes: 10, device: 'iPad Air', contact: 'Priya Shah', method: 'Passkey', ready: true, risk: 'Low', note: 'Recovery key stored.' }
];

export const activity = [
  'Google recovery key verified',
  'Coinbase backup codes need rotation',
  'Priya accepted trusted contact invite'
];

export const timeline = [
  ['Just now', 'Recovery score recalculated'],
  ['Today', 'Apple ID passkey verified'],
  ['Yesterday', 'Coinbase marked high priority'],
  ['Jun 24', 'Trusted contact added']
];
