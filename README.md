# SecureSwitch

SecureSwitch is a static, GitHub Pages-ready SaaS MVP for managing account recovery and two-factor authentication readiness. It turns phone numbers, recovery emails, backup codes, authenticator apps, and security-page links into one premium digital identity control panel.

## What is included

- Polished landing page with hero, problem, solution, features, pricing, and Join Beta CTA.
- Clickable demo flow: Login → Dashboard → Vault → Accounts → Switch Mode → Blackout Mode → Emergency Kit → Settings.
- Mobile-first Apple + Stripe inspired interface with dark mode, glassmorphism cards, smooth page transitions, floating action button, and bottom mobile navigation.
- Statistics dashboard with security score, high-risk accounts, update progress, backup-code coverage, and authenticator coverage.
- Accounts page with search, category filtering, and Add/Edit/Delete demo account management.
- Vault page with recovery phone manager, recovery email manager, backup codes viewer, and authenticator manager.
- Switch Mode phone-number-change checklist with direct security links and completion toggles.
- Blackout Mode lost-phone recovery workflow and Emergency Kit planning page.
- Realistic demo data for 40+ services including Google, Apple, Microsoft, Amazon, Facebook, Instagram, X, TikTok, Discord, PayPal, Cash App, Coinbase, Robinhood, Bank of America, Chase, Capital One, Venmo, Shopify, OpenAI, Netflix, Disney+, GitHub, Stripe, Cloudflare, Fidelity, Kraken, Gemini, and more.

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

```bash
npm test
```

The test script runs a JavaScript syntax check against `src/app.js`.

## Deploy to GitHub Pages

SecureSwitch is intentionally static HTML/CSS/JavaScript. No build step is required.

1. Push this repository to GitHub.
2. Open repository **Settings → Pages**.
3. Set source to the `main` branch and root folder.
4. Save and open the generated GitHub Pages URL.

## Product roadmap

### MVP

- Static SaaS demo and product positioning.
- Account search and demo CRUD.
- Recovery vault views for phones, emails, backup codes, and authenticators.
- Switch Mode and Blackout Mode workflows.
- Pricing and beta signup CTA.

### Beta

- Supabase authentication and encrypted vault persistence.
- Client-side encryption before syncing sensitive recovery data.
- Secure account import templates for common services.
- Stripe subscriptions for Pro and Family plans.
- Exportable Emergency Kit PDF.

### Public launch

- Mobile apps or PWA install flow.
- Trusted-contact emergency recovery.
- Security audit and public security whitepaper.
- Browser extension for detecting recovery settings pages.
- Team and business recovery workflows.
