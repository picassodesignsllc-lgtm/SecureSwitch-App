import { readFile } from 'node:fs/promises';

const source = await readFile('src/app.js', 'utf8');
const styles = await readFile('src/styles.css', 'utf8');
const guardedDeclarations = ['ensureUserScopedCollections', 'safeAccounts', 'saveRecoveryCenter', 'DashboardUtilities'];
const guardedDesktopSelectors = ['.app-shell', '.content-shell', '.dashboard', '.desktop-utility-grid'];

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

function topLevelSelectorCount(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...styles.matchAll(new RegExp(`^${escaped}\\s*\\{`, 'gm'))].length;
}

for (const name of guardedDeclarations) {
  const count = declarationCount(name);
  if (count !== 1) {
    throw new Error(`Expected exactly one ${name} declaration, found ${count}.`);
  }
}

for (const selector of guardedDesktopSelectors) {
  const count = topLevelSelectorCount(selector);
  if (count !== 1) {
    throw new Error(`Expected exactly one top-level ${selector} desktop layout rule, found ${count}.`);
  }
}

console.log(`Duplicate guard passed: ${guardedDeclarations.join(', ')} and desktop layout rules are declared once.`);
