# SecureSwitch Roadmap

SecureSwitch is being built in deliberate milestones so the product can become the trusted place people use to prepare for, survive, and recover from digital account lockouts.

## Milestone 1: UI Foundation ✅

### Goal
Create a premium, trustworthy interface that clearly communicates the SecureSwitch promise: never lose another account again.

### Features
- Premium dark SaaS dashboard visual direction.
- Landing page and dashboard experience.
- Account cards, recovery score surfaces, vault previews, and emergency workflow entry points.
- Mobile responsive layout.
- Toasts, loading states, hover states, and polished visual feedback.

### Definition of Done
- Users can understand what SecureSwitch does within seconds.
- Core sections are visible and navigable on desktop and mobile.
- Static prototype runs on GitHub Pages.
- Visual quality feels closer to modern SaaS products than a throwaway demo.

### Future improvements
- Add user testing around first impression and comprehension.
- Expand animation language with motion guidelines.
- Add design tokens and component states for every interaction.

## Milestone 2: Architecture Refactor ✅

### Goal
Refactor the prototype into a scalable static front-end architecture that can grow into a production application.

### Features
- Reusable component structure.
- Separate page modules.
- Shared data and utility layers.
- Component documentation.
- Cleaner rendering and event binding.

### Definition of Done
- App code is split into `/components`, `/pages`, `/data`, `/utils`, and `/assets`.
- Duplicate UI logic is reduced.
- Components can be reused across pages.
- The app remains static and GitHub Pages compatible.

### Future improvements
- Add unit tests for utilities and rendering helpers.
- Introduce a build step only when the product needs it.
- Add visual regression testing for key screens.

## Milestone 3: Authentication

### Goal
Let users securely create an account and sign in while keeping the first implementation simple and auditable.

### Features
- Email-based authentication.
- Google sign-in.
- Apple sign-in.
- Passkey support exploration.
- Session state and signed-in/signed-out views.

### Definition of Done
- Users can sign up, sign in, and sign out.
- Auth errors are clear and recoverable.
- Private recovery data is never shown to signed-out users.
- Authentication choices are documented.

### Future improvements
- Add device trust management.
- Add suspicious sign-in alerts.
- Add passwordless-first onboarding.

## Milestone 4: Backend

### Goal
Add a secure backend foundation for accounts, vault records, users, and workspace data.

### Features
- API for users, accounts, vault records, devices, trusted contacts, and timelines.
- Database schema and migrations.
- Server-side validation.
- Audit logging.
- Environment configuration and deployment docs.

### Definition of Done
- Front end reads and writes real data through authenticated APIs.
- Data model supports the Recovery Vault and timeline.
- API errors are handled gracefully.
- Deployment path is documented.

### Future improvements
- Add background jobs for reminders and health checks.
- Add workspace/team permissions.
- Add export and import jobs.

## Milestone 5: Recovery Engine

### Goal
Make SecureSwitch genuinely useful by calculating recovery readiness and guiding users toward a stronger recovery posture.

### Features
- Recovery Health Score based on password, recovery email, recovery phone, backup codes, trusted contacts, authenticator, passkeys, and recent verification.
- Account-specific recommendations.
- “Improve My Score” guided checklist.
- Verification reminders.
- Recovery timeline events.

### Definition of Done
- Score is deterministic and explainable.
- Every recommendation maps to a user action.
- Users can improve their score by completing tasks.
- Health changes are recorded in the timeline.

### Future improvements
- Add risk weighting by account category.
- Add stale-data detection.
- Add integrations with password managers or identity providers.

## Milestone 6: AI Assistant

### Goal
Add an assistant that helps users respond calmly and correctly during account recovery emergencies.

### Features
- AI Recovery Assistant panel.
- Guided lost-phone and lockout flows.
- Personalized recovery plan generation.
- Context from vault records, trusted contacts, and device inventory.
- Safety boundaries and clear disclaimers.

### Definition of Done
- Assistant can generate a useful recovery plan from user context.
- Assistant never exposes sensitive data unnecessarily.
- Users can copy or export the plan.
- AI actions are clearly distinguished from user-confirmed actions.

### Future improvements
- Add voice-friendly emergency mode.
- Add proactive alerts and next-best-action suggestions.
- Add integrations for support links and carrier/bank checklists.

## Milestone 7: iOS App

### Goal
Bring SecureSwitch to iPhone with a native-feeling recovery vault and emergency workflow.

### Features
- Native iOS app shell.
- Biometric unlock.
- Secure local storage strategy.
- Push notifications for reminders and emergency events.
- Mobile-first Blackout Mode.

### Definition of Done
- Users can sign in and view core vault data on iOS.
- Biometric unlock protects sensitive screens.
- Critical recovery workflows are usable on a phone.
- App Store readiness checklist is started.

### Future improvements
- Add widgets for readiness reminders.
- Add offline emergency packet access.
- Add Shortcuts integration.

## Milestone 8: Android App

### Goal
Bring SecureSwitch to Android with secure device-native recovery workflows.

### Features
- Native Android app shell.
- Biometric unlock.
- Secure storage strategy.
- Push notifications.
- Mobile-first recovery and Blackout Mode flows.

### Definition of Done
- Users can sign in and view core vault data on Android.
- Sensitive screens support biometric protection.
- Key recovery workflows are usable on Android devices.
- Play Store readiness checklist is started.

### Future improvements
- Add Android widgets.
- Add offline emergency packet access.
- Add deeper passkey and device trust integrations.

## Milestone 9: Beta Launch

### Goal
Launch SecureSwitch to a controlled group of early users and learn from real recovery preparedness workflows.

### Features
- Invite-only onboarding.
- Feedback collection.
- Analytics for activation and task completion.
- Support and incident response process.
- Security review checklist.

### Definition of Done
- Beta users can complete onboarding and add real recovery records.
- Team can monitor errors and feedback.
- High-priority risks are documented and triaged.
- Beta launch criteria are met.

### Future improvements
- Add referral invites.
- Add guided migration from spreadsheets/password managers.
- Expand onboarding based on beta feedback.

## Milestone 10: Public Release

### Goal
Release SecureSwitch publicly as a trustworthy recovery preparedness product.

### Features
- Public marketing site.
- Production billing.
- Support documentation.
- Security and privacy documentation.
- Stable web app and mobile release plan.

### Definition of Done
- Users can discover, sign up, subscribe, and use SecureSwitch without manual support.
- Public documentation explains security posture and product limits.
- Core recovery workflows are reliable.
- Launch metrics and support operations are ready.

### Future improvements
- Add enterprise and family plans.
- Add partner integrations.
- Add advanced AI recovery workflows.
