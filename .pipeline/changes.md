# Changes

## Reminders v2 (phase 2)

Branch `feat/life-group-reminders-v2`, stacked on PR #96 (`feat/life-group-meetings-api`).

### Backend (`backend/src/reminders`)
- `life-group-meeting-v2.flag.ts`: `isLifeGroupMeetingV2Enabled()` reads env `LIFE_GROUP_MEETING_V2` (`true`/`1`) at call time; default OFF.
- `evaluators/life-group-attendance-reminder.evaluator.ts`: `run()` delegates to the new class when the flag is on; the previous body moved verbatim into `runLegacy()` (existing spec unchanged and green).
- `evaluators/life-group-meeting-v2.reminders.ts` (new): primary push with the combined copy (claim-first, same dedupe key as legacy), daily follow-up at `followup_hour` for attendance-without-report, day-N escalation to sector leader + co-leader (`paz://lifegroup/{id}`, category `life_group_attendance`), report detection via `attendance_id` or date window [meeting, +6], Sao Paulo time via the shared zoned helpers, per-group error isolation with claim release.
- `claim-dispatch-key.ts` (new): claim/release helper parameterized by rule type.
- `types/reminder-config.ts`: new optional config fields + defaults, `validateReminderConfig` for `life_group_attendance` (only present fields), `resolveLifeGroupAttendanceConfig` (defaults for legacy rows; no data migration).
- `reminders.module.ts`: `LifeGroupReport` registered in `forFeature`.
- Specs: `life-group-meeting-v2.reminders.spec.ts` (50), `life-group-meeting-v2.flag.spec.ts`, additions to `reminder-config.spec.ts` and `reminders.service.spec.ts`, opt-in `life-group-meeting-v2.integration.spec.ts` (real PostgreSQL, `REMINDERS_PG_*`).

### Admin-ui
- `lib/api/types/reminder-rules.ts`: `life_group_attendance` in `ReminderRuleType` + `LifeGroupAttendanceReminderConfig`.
- `app/(dashboard)/notifications/reminder-settings.tsx`: title/description maps, settings card (legacy copy, meeting copy, follow-up hour/interval/cap/copy, escalation day/copy, flag note), client-side validation, blank text fields dropped on save.

### Docs
`.ai/features/notifications.md`, `.ai/features/life-groups.md`, `.ai/apps/backend.md`, `.ai/apps/admin-ui.md`.

### Not changed on purpose
`form_report` `life-group-reports` entry and its data (cutover is a later migration), mobile apps, categories/enums/migrations, the `.env` examples.

## Review fixes (reminders v2)
- M1: follow-up accepts hours [followup_hour, +2] (same SP day, no wrap); escalation accepts days [N, N+2]; claim keys dedupe (one push per follow-up day k / per meeting). Primary push and flag-off legacy unchanged. Comments fixed (retry happens on the next hourly ticks inside the window).
- M2: admin-ui hint and docs reworded: only the per-category toggle is bypassed; user-level allNotificationsEnabled/pushEnabled still suppress.
- m1: backend validation lets blank legacy `title`/`message` through (as before V2); V2 copy keys still reject blank (admin-ui omits them).
- m2: admin-ui NumberField: cleared input = undefined (key omitted, default applies), placeholder shows the default; `hours_after_meeting_start` optional in the admin-ui type.
- m3: sendClaimed marks the Notification `failed` when dispatch throws, then releases the claim.
- m4/m7/m6: documented (escalation key ignores escalation_after_days; kill switch needs restart; GET /life-groups/:id has no role gate and supervisors get the full detail, so a sector leader can open paz://lifegroup/{id}).
