# Test results

## Reminders v2 (phase 2)

Node v22.23.3. Worktree `scratchpad/wt-phase2` (backend/node_modules and admin-ui/node_modules symlinked from the main checkout, both gitignored).

### Backend
- `npm run build` (nest build): PASS.
- Scoped jest (`reminders`, `life-group-meetings`, `life-group-attendance`, `life-group-reports`, `notifications`): 21 suites passed, 1 failed (`notifications/dto/reach.dto.spec.ts`, known baseline failure), 2 skipped (opt-in real-DB specs); 290 tests passed, 35 skipped.
- Full jest: 78 suites passed, 6 failed, 2 skipped; 738 tests passed, 5 failed, 35 skipped. Failing suites are exactly the known develop baseline: `auth.controller`, `notification-sender`, `home.controller`, `onboarding.service`, `reach.dto`, `user-device-tokens`. No new failures.
- Existing `life-group-attendance-reminder.evaluator.spec.ts` unchanged and green (flag off = legacy path).
- New specs: `life-group-meeting-v2.reminders.spec.ts` 50 tests with jest fake timers (09:00 SP follow-up not before/not twice, daily cap, stop at day 5, escalation recipients/none/no sector/dedupe per group+date, two concurrent instances -> one push for primary, follow-up and escalation, claim release on send failure, midnight rollover, UTC vs SP incl. 02:00 UTC = 23:00 SP, co-leader recipients, no fixed day / null time skipped, report exists stops everything, attendance missing -> primary only, flag off variants); config validation and resolver tests; flag unit tests; `reminders.service` validation tests.
- eslint on every changed/new backend file: clean (pre-existing unrelated errors in untouched `event-reminder` / `form-report-reminder` specs remain). prettier --check src/reminders: clean.

### Real SQL (throwaway PostgreSQL 17.5, embedded-postgres reusing the existing install, NEW data dir `scratchpad/pg7`, port 54937, loopback, throwaway user)
- Full migration chain (incl. 1796000000000) applied, then the opt-in `life-group-meeting-v2.integration.spec.ts`: 7/7 PASS: group query with sector/leader joins, primary claim under 3 parallel evaluators -> 1 push + 1 log row, follow-up once under 2 parallel evaluators, day-5 escalation to sector leader + co-leader, report linked by `attendance_id` / dated meeting day / dated +6 stops everything, soft-deleted report and one dated +7 do not count, group without fixed day skipped.

### Admin-ui
- `tsc --noEmit`: 24 errors before and after (identical list, none in reminder files).
- eslint on the two changed files: clean.
- `next build`: compiled successfully.

### Not verified
- Postgres 16 (tests ran on 17.5); behavior on prod-shaped data; real FCM delivery; the hourly cron in a deployed multi-instance environment.
- Mobile clients (no change): `paz://lifegroup/{id}` parsing was verified by reading `PushNotificationHelper.kt` and `DeepLinkDestination.swift`, not by running their tests.

### Cleanup
Throwaway Postgres stopped (port 54937 closed). `rm -rf scratchpad/pg7/data` was DENIED by the sandbox: the data dir (throwaway creds, fixtures only) remains and needs manual removal.
