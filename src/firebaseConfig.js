// Firebase configuration is intentionally environment-driven for production.
// In static deployments, provide values through window.SECURESWITCH_CONFIG.firebase
// or replace these placeholders during CI. Demo mode remains active when config is incomplete.
const runtimeConfig = globalThis.SECURESWITCH_CONFIG?.firebase || {};
const viteConfig = import.meta.env || {};
const nodeConfig = typeof process !== 'undefined' ? process.env || {} : {};

function readConfig(key, viteKey, nodeKey) {
  return runtimeConfig[key] || viteConfig[viteKey] || nodeConfig[nodeKey] || '';
}

export const firebaseConfig = {
  apiKey: readConfig('apiKey', 'VITE_FIREBASE_API_KEY', 'FIREBASE_API_KEY'),
  authDomain: readConfig('authDomain', 'VITE_FIREBASE_AUTH_DOMAIN', 'FIREBASE_AUTH_DOMAIN'),
  projectId: readConfig('projectId', 'VITE_FIREBASE_PROJECT_ID', 'FIREBASE_PROJECT_ID'),
  storageBucket: readConfig('storageBucket', 'VITE_FIREBASE_STORAGE_BUCKET', 'FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: readConfig('messagingSenderId', 'VITE_FIREBASE_MESSAGING_SENDER_ID', 'FIREBASE_MESSAGING_SENDER_ID'),
  appId: readConfig('appId', 'VITE_FIREBASE_APP_ID', 'FIREBASE_APP_ID')
};
