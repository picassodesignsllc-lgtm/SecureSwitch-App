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
