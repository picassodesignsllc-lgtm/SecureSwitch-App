import { readFile } from 'node:fs/promises';

const source = await readFile('src/app.js', 'utf8');
const guardedDeclarations = ['ensureUserScopedCollections', 'safeAccounts'];

function declarationCount(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const declarations = [
    new RegExp(`\\basync\\s+function\\s+${escaped}\\b`, 'g'),
    new RegExp(`(?<!async\\s)\\bfunction\\s+${escaped}\\b`, 'g'),
    new RegExp(`\\bconst\\s+${escaped}\\b`, 'g'),
    new RegExp(`\\blet\\s+${escaped}\\b`, 'g'),
    new RegExp(`\\bvar\\s+${escaped}\\b`, 'g')
  ];
  return declarations.reduce((sum, pattern) => sum + [...source.matchAll(pattern)].length, 0);
}

for (const name of guardedDeclarations) {
  const count = declarationCount(name);
  if (count !== 1) {
    throw new Error(`Expected exactly one ${name} declaration, found ${count}.`);
  }
}

console.log(`Duplicate function guard passed: ${guardedDeclarations.join(', ')} are declared once.`);
