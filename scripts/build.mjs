import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || ''
};

await exec(process.execPath, ['--check', 'src/app.js'], { stdio: 'inherit' });
await exec(process.execPath, ['--check', 'src/firebaseConfig.js'], { stdio: 'inherit' });
await exec(process.execPath, ['--check', 'src/services/api.js'], { stdio: 'inherit' });
await exec(process.execPath, ['--check', 'src/services/billing.js'], { stdio: 'inherit' });
await exec(process.execPath, ['--check', 'src/services/audit.js'], { stdio: 'inherit' });
await exec(process.execPath, ['--check', 'src/services/backup.js'], { stdio: 'inherit' });
await exec(process.execPath, ['--check', 'src/services/devices.js'], { stdio: 'inherit' });
await rm('build', { recursive: true, force: true });
await mkdir('build/dist', { recursive: true });
await cp('index.html', 'build/dist/index.html');
await cp('manifest.webmanifest', 'build/dist/manifest.webmanifest');
await cp('src', 'build/dist/src', { recursive: true });
const runtimeConfig = {
  firebase: firebaseConfig,
  buildVersion: process.env.GITHUB_SHA || process.env.BUILD_VERSION || new Date().toISOString(),
  deployMode: process.env.GITHUB_PAGES === 'true' ? 'github-pages' : process.env.DEPLOY_MODE || 'static-build'
};
await writeFile('build/dist/src/runtimeConfig.js', `window.SECURESWITCH_CONFIG = ${JSON.stringify(runtimeConfig, null, 2)};\n`);
