const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function fromBase64(value) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

export async function deriveVaultKey(passphrase, saltBase64) {
  const salt = saltBase64 ? fromBase64(saltBase64) : crypto.getRandomValues(new Uint8Array(16));
  const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 210000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  return { key, salt: toBase64(salt) };
}

export async function encryptRecord(key, record) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify(record)));
  return { iv: toBase64(iv), ciphertext: toBase64(ciphertext) };
}

export async function decryptRecord(key, encrypted) {
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(encrypted.iv) }, key, fromBase64(encrypted.ciphertext));
  return JSON.parse(decoder.decode(plaintext));
}
