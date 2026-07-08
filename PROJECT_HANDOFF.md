# SecureSwitch Project Handoff

Last updated: 2026-06-30  
Current branch: `phase-3-production-saas`  
Current milestone: complete through Phase 3 — Production SaaS Foundation

## 1. Executive summary

SecureSwitch is a recovery-first digital security SaaS. Its product promise is: **Never lose another account again.** The application helps users inventory account recovery paths before an emergency, save encrypted recovery metadata, evaluate recovery readiness, and follow guided recovery playbooks when something goes wrong.

The codebase is currently a static, GitHub Pages-compatible front-end application with optional Firebase Authentication and Cloud Firestore integration. When Firebase configuration is absent, it runs as a polished demo with sample accounts. When Firebase configuration is present, authenticated users can create, read, update, and delete recovery records under their own Firestore user document. If the user unlocks the vault with a passphrase, account records are encrypted in the browser before storage.

This handoff intentionally documents the current architecture and the recommended path forward. It does **not** introduce new implementation work.

## 2. Repository and folder structure

```text
SecureSwitch-App/
├── .github/
│   └── workflows/
│       └── static.yml              # GitHub Pages deployment workflow
├── build/
│   └── dist/                       # Generated static artifact from npm run build
├── scripts/
│   ├── audit-rendered-dom.mjs      # DOM smoke/audit guard for dashboard structure
│   ├── build.mjs                   # Static build script; copies index.html and src/ into build/dist
│   └── verify-layout.mjs           # Layout guard for right rail, widgets, and readable cards
├── src/
│   ├── app.js                      # Main React app, Firebase wiring, UI modules, account CRUD
│   ├── crypto.js                   # Browser Web Crypto vault key derivation and AES-GCM helpers
│   ├── firebaseConfig.js           # Placeholder Firebase web app configuration
│   ├── recoveryEngine.js           # Account normalization, scoring, risk, recommendations, summary engine
│   └── styles.css                  # Global product styling, responsive layout, dashboard components
├── .gitignore
├── index.html                      # Static HTML shell; loads src/app.js as an ES module
├── MERGE_RESOLUTION.md             # Historical merge/build resolution notes
├── package.json                    # NPM scripts and module metadata
├── PROJECT_HANDOFF.md              # This handoff document
├── README.md                       # Product overview and setup notes
└── ROADMAP.md                      # Existing product roadmap notes
```

### Important architectural note

The current app imports React, ReactDOM, and Firebase modules directly from public CDNs at runtime. There is no bundler or package-lock-managed dependency graph yet. This keeps GitHub Pages deployment simple, but future production phases should migrate to a conventional front-end toolchain such as Vite, Next.js, or Remix before scaling the codebase.

## 3. Current architecture

### 3.1 Runtime model

SecureSwitch is currently a single-page static web app:

1. `index.html` mounts the root container and loads `src/app.js` as an ES module.
2. `src/app.js` dynamically imports React and ReactDOM from `https://esm.sh`.
3. If `src/firebaseConfig.js` contains complete Firebase values, `src/app.js` dynamically imports Firebase app, auth, and Firestore modules from Google CDN.
4. If Firebase config values are blank, the app remains in demo mode with local in-memory sample account data.
5. The app renders a dashboard, auth/sync panel, vault unlock form, account management surfaces, scoring surfaces, recovery flows, and roadmap-oriented modules.

### 3.2 State model

Application state is held in a single module-level `state` object in `src/app.js`. Key groups:

- Firebase/auth state: `user`, `auth`, `db`, `firebase`, `userProfile`.
- Vault state: `vaultKey`, `vaultUnlocked`.
- Account state: `accounts`, `editingAccountId`, `accountSearch`, `accountCategory`.
- Recovery workflow state: `selectedRecovery`, `switchOld`, `switchNew`, `blackoutArmed`, `emergencyActive`, `assistantPrompt`, `assistantStep`, `recoveryWizardScenario`, `recoveryWizardStep`, `simulatorScenario`, `simulatorRan`.
- UI state: `mode`, `loading`, `authError`, `dataError`, `toast`, route/hash-oriented section state.

Rendering is manually triggered through `setState(patch)`, which merges the patch into the state object and calls `render()`.

### 3.3 Data modes

The app has two modes:

#### Demo mode

- Active when Firebase config is incomplete.
- Uses `demoAccounts` in `src/app.js`.
- Account creates/updates are local only in memory for the current session.
- Dashboard modules, scoring, advisor, simulator, and recovery workflows operate from sample data.

#### Live Firebase mode

- Active when all Firebase config values are populated.
- Authenticated users are persisted via Firebase Auth with browser-local persistence.
- User profile metadata is stored at `users/{uid}`.
- Account records are stored at `users/{uid}/accounts/{accountId}`.
- Account records may be plaintext normalized objects if the vault was not unlocked, or `{ iv, ciphertext }` payloads if the vault was unlocked.

## 4. Completed features through Phase 3

### 4.1 Product foundation

- Static dashboard prototype with premium SaaS positioning.
- Mobile-first and desktop responsive dashboard layout.
- Right-side dashboard rail with protection score, readiness, quick actions, AI assistant, live threat feed, and suggested fixes.
- Account recovery inventory with sample services such as Google, Instagram, Coinbase, Amazon, and Slack.
- Search and category filtering for accounts.
- Account add/edit/delete flow.
- Recovery status and scoring indicators.
- Demo-mode banner that clearly distinguishes sample data from live Firestore records.

### 4.2 Authentication and cloud sync foundation

- Firebase configuration placeholder in `src/firebaseConfig.js`.
- Firebase dynamic loading only when config values are present.
- Email/password signup and login.
- Email verification send on signup.
- Google provider sign-in.
- Apple provider path scaffolded through Firebase `OAuthProvider('apple.com')`.
- Browser-local Firebase Auth persistence.
- User profile document merge on sign-in.
- Realtime Firestore account subscription per authenticated user.
- Live fallback back to demo records on sign-out.

### 4.3 Encrypted vault foundation

- Passphrase-based vault unlock.
- Per-user vault salt stored on the user document.
- PBKDF2 key derivation with SHA-256 and 210,000 iterations.
- AES-GCM 256-bit encryption for account records before Firestore writes when the vault key is present.
- AES-GCM decryption of encrypted Firestore records after vault unlock.
- Passphrase is never sent to Firebase.

### 4.4 Recovery engine

- Account normalization.
- Account categories.
- Account schema fields for production planning.
- Recovery score calculation based on six signals:
  - Recovery email.
  - Recovery phone.
  - Backup codes.
  - Passkey or authenticator coverage.
  - Trusted contacts.
  - Recent review date within 120 days.
- Risk levels: Low, Medium, High.
- Per-account recommendations for missing recovery fields.
- Dashboard summary aggregation:
  - Total accounts.
  - Average recovery score.
  - Missing recovery email count.
  - Missing recovery phone count.
  - Missing backup codes count.
  - Missing MFA count.
  - Missing trusted contacts count.
  - Weak recovery accounts.
  - High-risk accounts.
  - Recently updated accounts.
  - Security alerts.
  - Suggested next fixes.
  - Upcoming reviews.

### 4.5 Dashboard and workflow modules

The current `src/app.js` contains many UI modules. The major modules are:

- `Sidebar` — section navigation.
- `TopActions` — theme/alerts/add account controls.
- `Hero` — primary product positioning and high-level score surface.
- `Shortcuts` — quick navigation to Accounts, Switch Mode, Blackout Mode, Emergency Kit.
- `Accounts` — account list, scores, risk, edit/delete actions.
- `AccountForm` — add/update recovery record form.
- `Activity` — recent recovery/security activity.
- `ProtectionScore` — dashboard rail score summary.
- `ProtectedStatus` — current protection posture.
- `QuickActions` — action shortcuts.
- `Readiness` — recovery readiness bar.
- `DemoModeBanner` — live/demo mode disclosure.
- `OnboardingPanel` — MVP onboarding progress.
- `DashboardSummaryCards` — recovery data summary cards.
- `HealthScoreGrid` — animated category scores.
- `HealthScan` — recovery scan action.
- `IdentityHealthDashboard` — identity readiness concept module.
- `EmergencyButton` — emergency state control.
- `RecoveryWizardMVP` — scenario-based checklist.
- `RecoveryCoach` — guided recovery recommendations.
- `FloatingAICoach` — right-rail assistant with playbook prompts.
- `EmergencySimulator` — disaster-readiness simulation.
- `RecoveryTimeline` — recovery timeline concepts.
- `FamilyMode` — family readiness concept module.
- `WeeklyReport` — reporting concept module.
- `RecoveryInsights` — insights and recommendations concept module.
- `IdentityDNA` — identity profile concept module.
- `RecoveryMap` — recovery method mapping concept module.
- `SwitchMode` — old phone/recovery method replacement workflow concept.
- `BlackoutMode` — emergency lockdown concept.
- `EmergencyKit` — emergency recovery packet concept.
- `RecoveryLookup` — recovery lookup concept.
- `Settings` — workspace preference controls.
- `SyncAndAuthPanel` — authentication card and vault unlock form.

Some of these modules are production-connected to current account state and scoring; others are intentionally high-fidelity product scaffolds to guide future development.

## 5. Firebase collections

### 5.1 Implemented collection paths

The current implementation writes and reads the following paths:

```text
users/{uid}
users/{uid}/accounts/{accountId}
```

#### `users/{uid}`

Current fields:

```ts
type UserProfile = {
  email: string;
  displayName: string;
  photoURL: string;
  emailVerified: boolean;
  lastLoginAt: Timestamp | string;
  vaultSalt?: string;
};
```

Notes:

- `vaultSalt` is stored after first vault unlock.
- The vault passphrase and derived key are never stored.
- `lastLoginAt` uses `serverTimestamp()` when available.

#### `users/{uid}/accounts/{accountId}`

The account subcollection may contain either plaintext normalized account documents or encrypted payload documents depending on whether the vault was unlocked at save time.

Plaintext shape:

```ts
type AccountRecord = {
  id?: string;
  name: string;
  serviceName: string;
  handle: string;
  username: string;
  category: 'Email' | 'Banking' | 'Crypto' | 'Social' | 'Cloud' | 'Government' | 'Healthcare' | 'Business' | 'Utilities' | 'Custom';
  recoveryEmail: string;
  recoveryPhone: string;
  authenticator: string;
  passkeyStatus: string;
  backupCodes: string;
  trustedContacts: string;
  deviceVerification: string;
  lastReviewed: string;
  color: string;
  status: 'Secure' | 'Review' | string;
  ready: boolean;
  updatedAt: Timestamp | string;
};
```

Encrypted shape:

```ts
type EncryptedAccountRecord = {
  iv: string;          // Base64 AES-GCM IV
  ciphertext: string;  // Base64 encrypted JSON AccountRecord
};
```

### 5.2 Planned collection names already referenced in code

`src/recoveryEngine.js` exports this planning list:

```text
users
accounts
vault
recoveryHistory
notifications
emergencyContacts
devices
```

`src/app.js` also contains a broader production planning list:

```text
users
accounts
recoveryMethods
backupCodes
trustedContacts
alerts
timeline
simulations
reports
```

These are not all implemented yet. Treat them as product/schema intent for Phases 4+.

### 5.3 Recommended production Firestore model

For Phase 4, consolidate around a user-owned subcollection model:

```text
users/{uid}
users/{uid}/accounts/{accountId}
users/{uid}/recoveryMethods/{methodId}
users/{uid}/trustedContacts/{contactId}
users/{uid}/devices/{deviceId}
users/{uid}/timeline/{eventId}
users/{uid}/alerts/{alertId}
users/{uid}/simulations/{simulationId}
users/{uid}/reports/{reportId}
users/{uid}/billing/{billingDocId}
```

Recommended principles:

- Keep sensitive recovery data encrypted client-side.
- Store derived non-sensitive aggregates only when needed for indexing or dashboard speed.
- Never store raw passwords.
- Avoid storing raw backup codes unless encrypted client-side.
- Prefer user-scoped subcollections to top-level multi-tenant collections unless Cloud Functions require top-level indexing.

## 6. Firestore rules

There is currently no checked-in `firestore.rules` file. Before production launch, add Firebase Security Rules and deploy them through Firebase CLI or CI.

Recommended baseline rules for current implementation:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    function ownsUserDoc(userId) {
      return signedIn() && request.auth.uid == userId;
    }

    match /users/{userId} {
      allow create: if ownsUserDoc(userId)
        && request.resource.data.keys().hasOnly([
          'email',
          'displayName',
          'photoURL',
          'emailVerified',
          'lastLoginAt',
          'vaultSalt'
        ]);

      allow read, update, delete: if ownsUserDoc(userId);

      match /accounts/{accountId} {
        allow read, create, update, delete: if ownsUserDoc(userId);
      }

      match /recoveryMethods/{methodId} {
        allow read, create, update, delete: if ownsUserDoc(userId);
      }

      match /backupCodes/{backupCodeId} {
        allow read, create, update, delete: if ownsUserDoc(userId);
      }

      match /trustedContacts/{contactId} {
        allow read, create, update, delete: if ownsUserDoc(userId);
      }

      match /alerts/{alertId} {
        allow read, create, update, delete: if ownsUserDoc(userId);
      }

      match /timeline/{eventId} {
        allow read, create, update, delete: if ownsUserDoc(userId);
      }

      match /simulations/{simulationId} {
        allow read, create, update, delete: if ownsUserDoc(userId);
      }

      match /reports/{reportId} {
        allow read, create, update, delete: if ownsUserDoc(userId);
      }
    }
  }
}
```

Production hardening recommendations:

- Validate field types and maximum string lengths.
- Separate plaintext profile fields from encrypted vault payloads.
- Add server-side rules for billing/status fields so users cannot self-upgrade plans.
- Restrict admin-only top-level operational collections to custom claims.
- Consider App Check for abuse reduction.
- Add indexes only after query patterns are stable.

## 7. Authentication flow

### 7.1 Firebase initialization

1. `hasFirebaseConfig()` checks that every value in `firebaseConfig` is truthy.
2. If config is incomplete, Firebase is not loaded and the app stays in demo mode.
3. If config is complete:
   - Firebase app module is imported.
   - Firebase Auth module is imported.
   - Firestore module is imported.
   - `initializeApp(firebaseConfig)` creates the Firebase app.
   - `getAuth(app)` initializes Auth.
   - `setPersistence(auth, browserLocalPersistence)` enables local persistence.
   - `getFirestore(app)` initializes Firestore.
   - `onAuthStateChanged()` wires auth state to app state and account subscriptions.

### 7.2 Email/password signup and login

1. User submits the auth form.
2. If `state.mode === 'signup'`, the app calls `createUserWithEmailAndPassword()`.
3. If `state.mode !== 'signup'`, the app calls `signInWithEmailAndPassword()`.
4. On signup, if the user's email is not verified, the app calls `sendEmailVerification()`.
5. The app upserts the user profile document at `users/{uid}`.
6. The app subscribes to `users/{uid}/accounts`.

### 7.3 Provider sign-in

Current provider paths:

- Google: `new GoogleAuthProvider()` and `signInWithPopup()`.
- Apple: `new OAuthProvider('apple.com')` and `signInWithPopup()`.

Before production, confirm provider configuration in Firebase Console and Apple Developer settings.

### 7.4 Sign-out

1. Existing account snapshot listener is unsubscribed.
2. Firebase `signOut()` is called if Auth is initialized.
3. App state resets user/profile/vault key.
4. Demo accounts are restored.

## 8. Encryption flow

### 8.1 Current design

SecureSwitch uses client-side encryption for account records when a user unlocks their vault.

1. User signs in.
2. User enters a vault passphrase in the encrypted cloud sync form.
3. App reads `users/{uid}` to find an existing `vaultSalt`.
4. If no salt exists, `deriveVaultKey()` generates a new random 16-byte salt.
5. `deriveVaultKey()` imports the passphrase as raw key material.
6. PBKDF2 derives a 256-bit AES-GCM key using:
   - Salt: stored as Base64 in `vaultSalt`.
   - Iterations: 210,000.
   - Hash: SHA-256.
7. If a new salt was generated, it is written back to `users/{uid}`.
8. The derived `CryptoKey` stays in browser memory as `state.vaultKey`.
9. On account save, if `state.vaultKey` exists:
   - Account is normalized and serialized.
   - A random 12-byte IV is generated.
   - JSON account payload is encrypted with AES-GCM.
   - Firestore receives `{ iv, ciphertext }`.
10. On account read, if the document has `iv` and `ciphertext` and `state.vaultKey` exists:
    - The app decrypts it.
    - The plaintext is normalized into the account model.

### 8.2 Current limitations

- There is no explicit wrong-passphrase UX beyond decryption failure handling through snapshot/read flow.
- Mixed plaintext and encrypted records can exist if users save before unlocking the vault.
- There is no key rotation flow.
- There is no account-level metadata outside ciphertext for efficient querying.
- There is no recovery mechanism for forgotten vault passphrases.
- Vault key remains in memory until sign-out or page refresh.

### 8.3 Production recommendations

- Require vault unlock before allowing live Firestore account writes.
- Migrate any plaintext records into encrypted form after unlock.
- Add a `schemaVersion`, `encryptionVersion`, and `createdAt`/`updatedAt` metadata envelope.
- Add key derivation metadata, for example `{ kdf: 'PBKDF2', iterations: 210000, hash: 'SHA-256' }`.
- Consider Argon2id through audited WASM if performance and platform support are acceptable.
- Add key rotation.
- Add trusted-device or recovery-key strategy if product requirements permit passphrase recovery.
- Add explicit vault lock timeout.
- Add E2E tests for decrypting records across devices with the same passphrase.

## 9. Recovery engine details

The recovery engine is isolated in `src/recoveryEngine.js` and should remain the source of truth for scoring logic until migrated into a dedicated domain package.

### 9.1 Account categories

Supported categories:

- Email
- Banking
- Crypto
- Social
- Cloud
- Government
- Healthcare
- Business
- Utilities
- Custom

### 9.2 Normalization

`normalizeAccount(record)` maps multiple field names into the current UI model. This lets the app accept future production API names such as `serviceName`, `username`, `authenticatorStatus`, and `backupCodeStatus` while preserving current UI fields like `name`, `handle`, `authenticator`, and `backupCodes`.

### 9.3 Scoring

`scoreAccount(account)` calculates a percentage from six recovery-readiness signals:

1. Recovery email exists.
2. Recovery phone exists.
3. Backup codes exist.
4. Passkey or authenticator exists.
5. Trusted contacts exist.
6. Last reviewed date is within 120 days.

### 9.4 Risk levels

`riskLevel(account)` maps score to:

- Low: score >= 85.
- Medium: score >= 67 and < 85.
- High: score < 67.

### 9.5 Recommendations

`recommendationsFor(account)` emits plain-language fixes for:

- Missing recovery email.
- Missing recovery phone.
- Missing backup codes.
- Missing passkey.
- Missing authenticator or SMS-only authenticator.
- Missing trusted contact.
- Missing or stale security review.

### 9.6 Dashboard aggregation

`dashboardSummary(accounts)` returns a scored list plus aggregate counts used by dashboard cards, suggested fixes, upcoming reviews, and alert counts.

## 10. Dashboard module map

### Primary shell

- `App()` renders `Sidebar`, `Dashboard`, `SyncAndAuthPanel`, and toast region.
- `Dashboard()` lays out the main dashboard column and right rail.
- `SyncAndAuthPanel()` renders the auth form and vault unlock form below the dashboard.

### Data-connected modules

These modules derive meaningful state from actual accounts:

- Accounts list.
- Account form.
- Dashboard summary cards.
- Health score grid.
- Recovery readiness.
- Protection score.
- Suggested fixes.
- Recovery coach/advisor steps.
- Recovery wizard and simulator concepts where account weakness is referenced.

### Product-concept modules

These modules are high-fidelity scaffolds for future phases and need deeper backend/product implementation before launch:

- Identity Health Dashboard.
- Family Mode.
- Weekly Report.
- Recovery Insights.
- Identity DNA.
- Recovery Map.
- Blackout Mode.
- Emergency Kit.
- Recovery Lookup.
- Live Threat Feed.
- Settings controls.

## 11. Deployment instructions

### 11.1 Local run

```bash
npm start
```

Then open:

```text
http://127.0.0.1:4173
```

### 11.2 Local validation

```bash
npm test
npm run build
npm run verify:layout
npm run audit:dom
```

What these commands do:

- `npm test` runs `node --check` over application and script files.
- `npm run build` validates `src/app.js`, removes `build`, creates `build/dist`, copies `index.html`, and copies `src`.
- `npm run verify:layout` guards key layout expectations.
- `npm run audit:dom` guards rendered DOM expectations for important dashboard elements.

### 11.3 GitHub Pages deployment

The current workflow is `.github/workflows/static.yml`.

Trigger:

- Push to `main`.
- Manual `workflow_dispatch`.

Workflow steps:

1. Checkout repository.
2. Configure GitHub Pages.
3. Run `npm run build`.
4. Upload `build/dist` as the Pages artifact.
5. Deploy to GitHub Pages.

### 11.4 Firebase setup

1. Create a Firebase project.
2. Register a web app.
3. Enable Firebase Authentication providers:
   - Email/password.
   - Google.
   - Apple when ready and configured.
4. Enable Cloud Firestore.
5. Add Firestore rules before production launch.
6. Copy Firebase web config values into `src/firebaseConfig.js` or migrate to environment-based injection in Phase 4.
7. Deploy to GitHub Pages.
8. Test signup, sign-in, vault unlock, account save, account reload, sign-out, sign-in on another browser, vault decrypt.

## 12. Environment variables and configuration

### 12.1 Current state

There are no environment variables used by the current static app. Firebase config is committed as blank placeholders in `src/firebaseConfig.js`:

```js
export const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: ''
};
```

Because the app has no bundler, there is no `.env` processing yet.

### 12.2 Recommended Phase 4 configuration approach

If the app remains static without a bundler, use a generated runtime config file during deployment:

```text
src/runtimeConfig.js
```

Generated from CI secrets:

```js
window.SECURESWITCH_CONFIG = {
  firebase: {
    apiKey: '...',
    authDomain: '...',
    projectId: '...',
    storageBucket: '...',
    messagingSenderId: '...',
    appId: '...'
  },
  stripe: {
    publishableKey: '...'
  }
};
```

If the app migrates to Vite, use:

```text
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_STRIPE_PUBLISHABLE_KEY=
```

Server-only secrets for Cloud Functions or a backend API:

```text
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
OPENAI_API_KEY=
FIREBASE_SERVICE_ACCOUNT_JSON=
```

Never expose server-only secrets in client-side code or GitHub Pages artifacts.

## 13. Stripe integration plan

Stripe is not implemented yet. The recommended integration should be server-mediated, not client-only.

### 13.1 Product packaging

Suggested plans:

- Free: demo/local or limited account count, basic score, manual recovery checklists.
- Individual Pro: encrypted cloud sync, unlimited accounts, recovery simulator, reports, AI coach limits.
- Family: family dashboard, trusted contacts, household emergency kits.
- Business/Teams: team recovery readiness, admin reporting, employee offboarding recovery paths.

### 13.2 Architecture

Use Stripe Checkout and Customer Portal through Firebase Cloud Functions or another backend.

Recommended Firestore billing shape:

```text
users/{uid}/billing/status
```

Example billing document:

```ts
type BillingStatus = {
  stripeCustomerId: string;
  subscriptionId?: string;
  plan: 'free' | 'pro' | 'family' | 'business';
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete';
  currentPeriodEnd?: Timestamp;
  updatedAt: Timestamp;
};
```

### 13.3 Required backend endpoints/functions

- `createCheckoutSession`:
  - Requires Firebase Auth.
  - Creates or reuses Stripe customer.
  - Creates Checkout Session for selected price.
  - Returns redirect URL.
- `createCustomerPortalSession`:
  - Requires Firebase Auth.
  - Creates Stripe Billing Portal session.
  - Returns redirect URL.
- `stripeWebhook`:
  - Verifies Stripe signature.
  - Handles subscription lifecycle events.
  - Updates Firestore billing documents.

### 13.4 Client gating

The client should read billing status from Firestore and gate features such as:

- Max account records.
- Encrypted cloud sync.
- Family members.
- AI Recovery Coach usage.
- Reports export.
- Advanced simulator scenarios.

Do not trust client-side gating for billing-critical enforcement. Server-side functions and Firestore rules must enforce privileged writes and plan-derived limits where applicable.

## 14. AI Recovery Coach roadmap

The current AI Recovery Coach is deterministic and local. It uses predefined scenarios and account-derived weakness signals. No LLM API is currently called.

### Phase 4 AI foundation

- Keep deterministic recommendations as the baseline.
- Add typed incident intake:
  - Lost phone.
  - SIM swap.
  - Hacked email.
  - Lost authenticator.
  - Stolen laptop.
  - Crypto wallet loss.
  - Deceased/incapacitated family member workflow.
- Generate recovery plans from `dashboardSummary`, weak accounts, trusted contacts, and recovery method coverage.
- Store generated recovery sessions under `users/{uid}/timeline` or `users/{uid}/recoverySessions`.

### Phase 5 LLM integration

- Add backend endpoint for AI plan generation.
- Send only minimized, redacted account metadata.
- Never send passwords, backup codes, raw secrets, full recovery notes, or decrypted sensitive payloads unless the product explicitly gains user consent and a privacy review approves it.
- Include deterministic policy constraints in prompts.
- Return structured JSON, not free-form text only.
- Log safety metadata, not sensitive prompt contents.

### Recommended AI response schema

```ts
type RecoveryCoachPlan = {
  incidentType: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  impactedAccounts: Array<{
    accountId: string;
    serviceName: string;
    risk: 'low' | 'medium' | 'high';
    reason: string;
  }>;
  steps: Array<{
    order: number;
    title: string;
    instructions: string;
    estimatedMinutes: number;
    requiresTrustedContact: boolean;
  }>;
  warnings: string[];
  followUps: string[];
};
```

### Phase 6+ AI improvements

- Personalized readiness coaching.
- Weekly recovery readiness digest.
- Incident timeline summarization.
- Family-safe emergency instructions.
- Business/team recovery playbooks.
- Human escalation or professional recovery services marketplace.

## 15. Mobile app roadmap

No native mobile app exists yet. Current app is responsive web only.

### Phase 4 mobile web hardening

- Improve responsive breakpoints and touch targets.
- Add PWA manifest and service worker.
- Add offline demo mode and cached emergency kit shell.
- Add install prompt and mobile safe-area handling.
- Ensure vault lock/unlock UX is usable on mobile.

### Phase 5 PWA emergency mode

- Offline emergency checklist.
- Cached encrypted emergency kit metadata.
- Biometric re-unlock where supported through WebAuthn/passkeys or platform credential flows.
- Push notifications for recovery reviews and alerts.

### Phase 6 native mobile feasibility

Recommended stack options:

- React Native with Expo for fastest iteration.
- Native Swift/Kotlin only if deep platform keychain and OS integrations become central.

Native capabilities to evaluate:

- iOS Keychain / Android Keystore for wrapped vault keys.
- Biometric unlock.
- Secure local encrypted storage.
- Push notifications.
- Contacts integration for trusted contacts.
- Camera/document scanning for identity packet workflows.
- Deep links into provider recovery pages.

### Phase 7+ native app launch

- Shared domain logic package for recovery scoring.
- Shared API/backend across web and mobile.
- Mobile-specific emergency mode.
- Family account switching.
- App Store and Play Store compliance review.
- Privacy labels and data safety disclosures.

## 16. Future roadmap: Phase 4 through Phase 10

### Phase 4 — Production hardening and schema stabilization

Goals:

- Migrate to Vite or another production front-end toolchain.
- Split `src/app.js` into components, hooks/services, and domain modules.
- Add environment-based config injection.
- Add checked-in Firestore rules and Firebase deploy configuration.
- Require encrypted vault unlock for live account writes.
- Add plaintext-to-encrypted migration flow.
- Add integration tests for auth, vault, and account CRUD.
- Add formal TypeScript models or JSDoc type contracts.

Deliverables:

- Componentized app architecture.
- Stable Firestore schema.
- Security rules deployed.
- CI quality gates.
- Production Firebase project configured.

### Phase 5 — Billing, subscriptions, and launch readiness

Goals:

- Add Stripe Checkout and Billing Portal through Cloud Functions/backend.
- Add plan gates and subscription status in Firestore.
- Add onboarding funnel.
- Add analytics events with privacy review.
- Add production error monitoring.
- Add privacy policy and terms.

Deliverables:

- Paid Pro/Family subscription capability.
- Billing lifecycle sync.
- Launch-ready marketing/pricing pages.

### Phase 6 — AI Recovery Coach MVP

Goals:

- Add backend-mediated AI plan generation.
- Redact sensitive vault metadata before AI calls.
- Store recovery coach sessions.
- Add deterministic fallback if AI is unavailable.
- Add abuse, prompt-injection, and privacy safeguards.

Deliverables:

- Structured AI recovery plans.
- Incident-specific guided recovery flows.
- Auditable AI safety boundaries.

### Phase 7 — PWA and mobile-first emergency workflows

Goals:

- Add PWA install support.
- Add offline emergency shell.
- Add push notifications.
- Add mobile vault lock timeout and unlock UX.
- Add recovery reminders and review schedules.

Deliverables:

- Installable web app.
- Offline-first emergency mode.
- Mobile-grade recovery workflow.

### Phase 8 — Family and delegated recovery

Goals:

- Add household/family workspaces.
- Add trusted contact invitations.
- Add delegated emergency access policies.
- Add family recovery reports.
- Add guardian/elder-care workflows.

Deliverables:

- Family plan product.
- Invite and permission model.
- Trusted-contact workflows.

### Phase 9 — Business/team recovery platform

Goals:

- Add organizations and role-based access control.
- Add employee account recovery readiness checks.
- Add offboarding recovery checklist.
- Add team reports and compliance exports.
- Add SSO/SAML if business demand validates it.

Deliverables:

- Team dashboards.
- Admin reporting.
- Business billing tier.

### Phase 10 — Recovery ecosystem and integrations

Goals:

- Add provider-specific recovery integrations where APIs allow.
- Add breach/risk intelligence feeds.
- Add professional recovery partner marketplace.
- Add secure document vault expansion.
- Add native mobile apps if PWA metrics justify it.

Deliverables:

- Integrated digital recovery platform.
- Advanced partner/integration ecosystem.
- Mature multi-platform product.

## 17. Engineering recommendations for the next senior engineer

### 17.1 First technical priorities

1. Do not add broad features until architecture is modularized.
2. Move from CDN imports to a managed build system.
3. Split `src/app.js` into:
   - `components/`
   - `features/auth/`
   - `features/vault/`
   - `features/accounts/`
   - `features/dashboard/`
   - `features/recovery/`
   - `services/firebase/`
   - `domain/recoveryEngine/`
4. Add TypeScript or strong JSDoc types.
5. Add Firebase emulator tests for security rules.
6. Enforce encrypted writes in live mode.

### 17.2 Security priorities

- Add Firestore rules before any public production use.
- Prevent client-side billing privilege escalation.
- Avoid plaintext Firestore records for sensitive recovery metadata.
- Add vault lock timeout.
- Add App Check.
- Add content security policy suitable for selected CDN/build architecture.
- Review the privacy model before AI or analytics integrations.

### 17.3 Product priorities

- Keep SecureSwitch focused on digital recovery, not password management.
- Complete one end-to-end recovery loop before adding additional surfaces.
- Make the Recovery Score actionable and explainable.
- Make AI assistant recommendations deterministic-first, AI-enhanced second.
- Build trust through clear privacy and encryption messaging.

## 18. Known limitations and open questions

- No checked-in `PHASE3_HANDOFF.md` exists in the current workspace.
- No checked-in `firestore.rules` exists yet.
- No Firebase project values are committed.
- No Stripe integration exists yet.
- No server/backend exists yet.
- No package lock exists because runtime dependencies are CDN imports.
- No native mobile app exists.
- Account records can be plaintext if saved in live mode before unlocking the vault.
- Provider recovery integrations are conceptual only.
- Several dashboard modules are product scaffolds and are not fully backed by persisted data yet.

## 19. Completion status

SecureSwitch is complete through Phase 3 as a production SaaS foundation prototype:

- Static deployment path is in place.
- Firebase auth and Firestore sync foundation are in place.
- Browser-side vault encryption foundation is in place.
- Recovery engine and dashboard scoring are in place.
- Major product surfaces are represented in the dashboard.
- The next phase should focus on hardening, modularization, security rules, CI, billing backend, and production configuration rather than adding unrelated features.
