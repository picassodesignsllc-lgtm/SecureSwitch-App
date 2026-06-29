# SecureSwitch

SecureSwitch is a mobile-first prototype for a secure digital identity control panel. It helps people track two-factor authentication, account recovery details, backup codes, recovery emails, phone numbers, and authenticator information in one premium dashboard.

## Product promise

**Never get locked out again.** SecureSwitch uses a light-switch and breaker-box metaphor to make account recovery understandable: one switch for each major identity circuit, one control panel for every account.

## Prototype features

- User authentication entry point with biometric login affordance.
- Encrypted vault overview for phone numbers, recovery emails, backup codes, and authenticator information.
- Account categories for Banking, Social Media, Email, Crypto, Shopping, and Business.
- Dashboard lookup for all accounts tied to a selected phone number or recovery email.
- Switch Mode workflow that generates a phone-number-change checklist with direct security-page links and completion status.
- Blackout Mode emergency recovery checklist for lost-device and lockout scenarios.
- Security architecture messaging for end-to-end encryption, multi-device sync, and zero-knowledge design.

## Run locally

Open `index.html` directly in a browser, or run a local static server:

```bash
npm start
```

Then visit `http://127.0.0.1:4173`.

## Validate

```bash
npm test
```

## Firebase setup for real authentication and cloud sync

SecureSwitch can run as a static GitHub Pages app while using Firebase for real authentication and Firestore cloud sync.

1. Create a Firebase project.
2. Enable Authentication providers:
   - Email/password
   - Google
   - Apple when ready
3. Enable Cloud Firestore.
4. Copy your Firebase web app config into `src/firebaseConfig.js`.
5. Deploy the static files or run locally with `npm start`.

Vault records are encrypted in the browser with Web Crypto AES-GCM before they are saved to Firestore. The vault passphrase is not sent to Firebase.

### End-to-end recovery foundation

The current product foundation focuses on five testable flows:

1. A user can create an account or log in with Firebase Authentication.
2. A signed-in user can unlock a local AES-GCM vault key from a passphrase.
3. Recovery records are encrypted in the browser before being saved to Firestore.
4. Signing in on another device and entering the same vault passphrase decrypts the same synced records.
5. Recovery Score, AI Advisor, and Recovery Mode are generated from actual decrypted vault data.

### SecureSwitch 3.0 recovery workflow focus

SecureSwitch 3.0 should prioritize a complete recovery loop before adding broad new product areas:

- Authenticated users save encrypted recovery records.
- Recovery Score and Digital Safety Score are calculated from actual vault fields.
- AI Advisor recommendations come from missing encrypted account metadata.
- Recovery Mode asks what happened and generates instructions from saved accounts and trusted contacts.
- Recovery Simulator checks whether a disaster scenario would succeed before it happens.

### SecureSwitch 4.0 digital recovery platform direction

The 4.0 work keeps the product focused on digital recovery outcomes:

- Instant Scan summarizes how recoverable the user is across critical services.
- AI Recovery Coach prioritizes fixes from real vault metadata.
- Panic Mode generates emergency instructions for a selected incident.
- Recovery Simulator lets users practice before a disaster happens.
- Identity Timeline, Breach Radar, Digital Will, Device Center, and Identity Center are connected to encrypted vault metadata rather than standalone pages.
