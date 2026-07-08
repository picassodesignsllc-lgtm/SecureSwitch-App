import { readFile } from 'node:fs/promises';

const source = await readFile('src/app.js', 'utf8');
const declarations = [
  /\basync\s+function\s+ensureUserScopedCollections\b/g,
  /(?<!async\s)\bfunction\s+ensureUserScopedCollections\b/g,
  /\bconst\s+ensureUserScopedCollections\b/g,
  /\blet\s+ensureUserScopedCollections\b/g
];
const count = declarations.reduce((sum, pattern) => sum + [...source.matchAll(pattern)].length, 0);
if (count !== 1) {
  throw new Error(`Expected exactly one ensureUserScopedCollections declaration, found ${count}.`);
}
console.log('Duplicate function guard passed: ensureUserScopedCollections is declared once.');
