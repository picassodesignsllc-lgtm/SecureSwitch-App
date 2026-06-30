# SecureSwitch

**SecureSwitch helps people prepare for losing access to their digital lives.** It is a recovery-focused security product for tracking recovery emails, recovery phones, backup codes, trusted contacts, authenticator apps, devices, and emergency notes before disaster strikes.

> **Product promise:** Never lose another account again.

SecureSwitch is not trying to be another password manager. The long-term vision is to become the place people go to understand, strengthen, and use their account recovery options across the services that matter most: email, banking, crypto, identity, social media, work tools, and family accounts.

## Vision

Most people only think about account recovery after something goes wrong: a lost phone, a SIM swap, a locked email account, a missing authenticator app, or a forgotten backup code. SecureSwitch turns recovery into a proactive, guided workflow.

The product is designed around a few core ideas:

- **Recovery readiness:** Users should know how prepared they are before an emergency.
- **Recovery vault:** Recovery data deserves a dedicated, secure place instead of being scattered across notes, screenshots, and memory.
- **Guided action:** When something goes wrong, users need calm step-by-step recovery plans.
- **Emergency mode:** Blackout Mode should help users freeze risky paths and notify trusted people quickly.
- **Human-centered security:** The interface should feel clear, premium, and reassuring rather than intimidating.

## Current prototype

This repository currently contains a static GitHub Pages-compatible prototype. It demonstrates the SecureSwitch product direction without requiring a backend.

Current capabilities include:

- Premium dashboard UI.
- Account recovery records.
- Recovery score surfaces.
- Recovery vault previews.
- Account search and organization.
- Activity and timeline concepts.
- Settings and theme controls.
- Static demo data for product exploration.

See [`ROADMAP.md`](ROADMAP.md) for the milestone plan from UI foundation through public release.

## Project structure

The app is moving toward a scalable front-end architecture:

```text
/components  Reusable UI components
/pages       Page-level composition
/assets      Static assets and future design exports
/data        Demo data and later API adapters
/utils       Shared helpers and product logic
/src         App entrypoint and styles
```

## Run locally

Open `index.html` directly in a browser, or run a local static server:

```bash
npm start
```

Then visit:

```text
http://127.0.0.1:4173
```

## Validate

Run the JavaScript syntax check:

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
