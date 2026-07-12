# Dashboard layout repair

This branch replaces the conflicting dashboard override rules with one scoped layout lock.

Desktop:
- fixed sidebar remains outside the dashboard content
- dashboard content uses a center workspace plus a right protection rail
- hero, shortcuts, accounts, activity, protection score, quick actions, and readiness fit in the intended compact composition

Mobile/tablet:
- single-column stack
- two-column shortcut cards on phones
- normal-height account and activity rows
- no desktop fixed heights leaking into small screens

The fix is intentionally isolated to `src/dashboard-reference.css`, which loads after the legacy stylesheet.