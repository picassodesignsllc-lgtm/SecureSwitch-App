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

For architecture work, also check module files directly:

```bash
for f in components/*.js data/*.js pages/*.js utils/*.js src/app.js; do node --check "$f"; done
```

## How to contribute

SecureSwitch should grow in controlled, reviewable milestones. Contributions should be small enough to review and should preserve the premium product experience.

Good contribution areas:

- Improve reusable components.
- Add tests for utilities and product logic.
- Improve accessibility and keyboard navigation.
- Strengthen mobile responsiveness.
- Expand recovery-health scoring logic.
- Improve onboarding and emergency workflows.
- Document product decisions and security assumptions.

Before opening a PR:

1. Create a focused branch.
2. Keep static GitHub Pages compatibility unless a milestone explicitly introduces backend tooling.
3. Run `npm test`.
4. Include screenshots or notes for visible UI changes.
5. Update `ROADMAP.md` or this README when product direction changes.

## Product principles

- **Clarity over complexity.** Recovery workflows must be understandable under stress.
- **Trust over growth hacks.** Sensitive recovery data requires careful product decisions.
- **Guidance over dashboards.** Metrics should lead users to useful action.
- **Security by design.** Authentication, vault storage, and AI features must be built deliberately.
- **Premium UX matters.** SecureSwitch should feel as polished as the best modern SaaS products.
