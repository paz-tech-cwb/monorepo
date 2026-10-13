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

## Review fixes (reminders v2)
- backend build: ok. Scoped jest (reminders, life-group-meetings, life-group-attendance, notifications): 270 passed, 35 skipped; only failing suite reach.dto (baseline).
- Full jest: 6 failed suites (baseline: auth.controller, notification-sender, home.controller, onboarding.service, reach.dto, user-device-tokens), 78 passed; 745 tests passed, 5 failed (baseline), 35 skipped.
- eslint src/reminders: only pre-existing errors in event/form-report evaluator specs (untouched); prettier clean.
- admin-ui: dependencies are not installed in this environment, so tsc/eslint/next build could not be run meaningfully.
- New tests: 10:00 retry after failed 09:00 sends once (+ Notification marked failed); 11:00 ok, 12:00 no; no wrap past midnight; escalation on day 6 and 7, not day 8, once across 5/6/7; blank legacy title/message accepted.

## User decisions round 2 (reminders v2)
- backend `nest build`: ok. Scoped jest (reminders, life-group-meetings, life-group-attendance, notifications): 320 passed, 42 skipped; only failing suite reach.dto (baseline).
- Full jest: 78 suites passed, 6 failed (baseline: auth.controller, notification-sender, home.controller, onboarding.service, reach.dto, user-device-tokens), 2 skipped; 795 tests passed, 5 failed (baseline), 42 skipped.
- eslint on all 9 changed backend files: 0 errors (1 `no-unsafe-argument` warning in the v2 spec FakeEm); prettier --check clean.
- New/rewritten fake-timer tests in `life-group-meeting-v2.reminders.spec.ts`: first follow-up at +24h (not +23h), +48/+72/+96h, nothing after +96h, full hourly sweep = 4 follow-ups + 1 escalation, 22:00 meeting (+24h next day 22:00), 23:30 midnight rollover, 21:30 due sent by the 22:00 tick, UTC vs SP, catch-up window inclusive (+26h yes, +27h no), failed send retried, escalation at +120h with +121h/+122h catch-up and not +123h, once only, configurable window/first/interval/max/escalation, old `followup_interval_days` mapping, leader + co-leader recipients, report by either leader silences all (group-based query without author filter asserted), extras (own date, report silences, no primary for extras, regular + extra independent, extra on regular date not counted as recorded), skipped groups (incl. extras), batched query count, dedupe under two parallel runs, flag off identical. Config validation/resolver tests and `zonedDateTimeToDate` tests added.
- Real SQL: throwaway PostgreSQL (embedded-postgres, NEW data dir `scratchpad/pg9`, port 54939), all migrations incl. 1796000000001 applied, `life-group-meeting-v2.integration.spec.ts` 8/8 PASS (updated timing + extras case). Postgres stopped afterwards.
- admin-ui: `tsc --noEmit` 24 errors (same baseline, none in reminder files), eslint clean on both changed files, `next build` ok.
- CI does not run for this stacked PR (base is `feat/life-group-meetings-api`, not develop).
