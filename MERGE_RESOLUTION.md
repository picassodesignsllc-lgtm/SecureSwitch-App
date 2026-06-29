# Merge Resolution Notes

This branch preserves the latest SecureSwitch application functionality while preparing a clean pull request for `main`.

Preserved functionality:

- Firebase Authentication foundation for email/password, password reset, Google, Apple, logout, and session handling.
- Firestore-backed encrypted vault records scoped to authenticated users.
- Client-side AES-GCM encryption with PBKDF2-derived vault keys.
- Recovery Score, Recoverable Score, and Digital Safety Score generated from decrypted vault metadata.
- AI Recovery Coach recommendations from missing recovery metadata.
- Recovery Mode / Panic Mode generated from saved accounts and trusted contacts.
- Recovery Simulator, Instant Scan, Breach Radar, Digital Will, Device Center, Identity Center, Command Center, and premium dark UI.

Conflict resolution strategy:

- Keep the current SecureSwitch 4.0 implementation for `index.html`, `src/app.js`, and `src/styles.css`.
- Preserve the Firebase and encryption support files.
- Do not revert to older static demo implementations.
