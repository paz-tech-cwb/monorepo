# Feature: Notifications

## Purpose

Send push notifications and route users to the correct screen when notifications are opened.

## Category navigation map

| Category | Expected destination | Deep link |
|---|---|---|
| `events` | Event/agenda detail | `paz://agenda/{eventId}` |
| `announcements` | Home/account announcement area | `paz://account` |
| `life_group` | Life group detail | `paz://lifegroup/{lifeGroupId}` |
| `academy` | Academy | none/current app route |
| `forms` | Formulários list | `paz://formularios` |
| `member_journey` | Minha Jornada | `paz://journey` |
| `admin_alerts` | Account/admin alert area | `paz://account` |
| `contributions` | Account/contributions area | `paz://account` |
| `life_group_attendance` | Life group attendance editor (sector-leader escalation: life group detail) | `paz://presenca/{lifeGroupId}/{date}` (escalation: `paz://lifegroup/{lifeGroupId}`) |
| `life_group_task` | Life group task guide | `paz://tarefa/{assignmentId}` |
| `life_group_study` | Estudo do Life detail | `paz://estudo-do-life/{studyId}` |

Entity-specific notifications must include IDs in the data payload.

`life_group_study` is sent once when a study is created (see
`features/life-groups.md`, "Estudo do Life") to roster members, leaders,
co-leaders and leadership roles via explicit `segment.filters.user_ids`; channel
`paz_life_group_study`. It requires the `notification_category_enum` value added by
migration `1795900000008`. The tasks reminder's d1 pass also generates when a
meeting has no assignments yet (late setup).

## Automatic reminders

| Reminder type | Category |
|---|---|
| `form_report` | `forms` |
| `event` | `events` |
| `member_journey` | `member_journey` |
| `life_group_attendance` | `life_group_attendance` |
| `life_group_tasks` | `life_group_task` |

`forms` and `life_group_attendance` are deliberately absent from `CATEGORY_PREF_MAP`
(`notification-dispatch.service.ts`), so leaders cannot opt out of them via
notification preferences — they cover core recurring job duties, not optional
updates. Recipients for `life_group_attendance` are the group's `leader_id`
and `co_leader_id` (when set); it fires once, `hours_after_meeting_start`
hours after the group's `meeting_day`/`meeting_time`, and is skipped entirely
for groups without a fixed meeting day/time ("Sem dia fixo" or no
`meeting_time`).

The Meetings API (`features/life-groups.md`, phase 1) does not change this rule,
the push copy, the dedupe keys or the `paz://presenca/{lifeGroupId}/{date}` deep link.

### Meeting reminders v2 (phase 2) - server flag `LIFE_GROUP_MEETING_V2`

The `life_group_attendance` rule gained the merged attendance + report behavior
(`reminders/evaluators/life-group-meeting-v2.reminders.ts`), ALL behind the
server env flag `LIFE_GROUP_MEETING_V2` (`true`/`1`; **default OFF**, read on every
evaluator run via `reminders/life-group-meeting-v2.flag.ts`). With the flag off
the evaluator runs the legacy path unchanged (same copy, check-then-send-then-
insert dedupe, no follow-up, no escalation, `form_report` untouched).
With the flag on (everything in church time, America/Sao_Paulo):

1. **Primary push** at meeting start + `hours_after_meeting_start`, new copy
   (`meeting_title`/`meeting_message`, default "Registre a reunião do Life Group"),
   deep link `paz://presenca/{lifeGroupId}/{date}`, recipients leader + co-leader
   (deduped by user, co-leader included even with role `member`). Sent only when
   attendance is missing (attendance saved without a report is the follow-up's job).
   Claim-first: the `ReminderDispatchLog` row is inserted before sending and
   deleted if the send throws; the key is the same as the legacy one
   (`life_group_attendance:{gid}:{date}`) so flipping the flag never re-sends.
2. **Follow-up**, RELATIVE TO THE MEETING DATETIME (user decision, 2026-10-13):
   the meeting instant is the meeting date + the group's `meeting_time`
   (hour AND minutes, America/Sao_Paulo). Leader + co-leader are reminded
   `followup_first_after_hours` (default 24) after it, then every
   `followup_interval_hours` (default 24): defaults +24h, +48h, +72h, +96h, never
   beyond `followup_max_days` (default 5; 0 = follow-ups off) and never at/after
   the escalation instant, so nothing is sent after +96h. Only when attendance
   exists for that meeting but no report. Copy `followup_title`/`followup_message`,
   deep link `paz://presenca/{lifeGroupId}/{date}`. Dedupe key
   `life_group_meeting_followup:{gid}:{date}:{offsetHours}h`, claim-first.
   Tolerance: the scheduler ticks hourly, so a due time is honored by any tick in
   `[due, due + followup_window_hours]` (default 2h, inclusive). A follow-up due at
   21:30 is therefore sent by the 22:00 tick (and the 23:00 tick would still be
   accepted but is deduped by the claim key); a lost or failed tick is retried by
   the following ones. This REPLACES the earlier "09:00 next morning, daily" rule
   (old `followup_hour` is ignored). The primary push has no window: it stays
   exact-hour, as in legacy.
3. **Escalation** at `escalation_after_days` x 24h after the meeting instant
   (default 5 days = +120h; 0 = off), with the same catch-up window (+121h and +122h
   still escalate, +123h does not): one push to the group's SECTOR leader and sector
   co-leader
   (deduped; none if the group has no sector or the sector has no leader) with
   `{group}`/`{date}` (DD/MM) placeholders. Category `life_group_attendance`
   (reused: absent from `CATEGORY_PREF_MAP`, so the per-category toggle does not
   apply; the user-level global opt-outs `allNotificationsEnabled=false` /
   `pushEnabled=false` in `NotificationDispatchService` STILL suppress it; channel `paz_life_group`, no enum migration, no
   client change), deep link `paz://lifegroup/{lifeGroupId}` (already parsed by
   Android `life_group_detail/{id}` and iOS; no new scheme; confirmed by the
   product owner). Dedupe key
   `life_group_meeting_escalation:{gid}:{date}` (one per group and meeting date),
   claim-first. The key ignores `escalation_after_days`: changing that setting
   mid-flight can re-escalate an older still-unreported meeting whose new window
   lands today (bounded, low risk). The follow-ups stop before the escalation
   instant. The sector leader opens
   `paz://lifegroup/{id}` through `GET /life-groups/:id`; see the access note below.
4. "Has a report": a non-deleted `life_group_reports` row for the GROUP (any author:
   leader or co-leader) linked via `attendance_id` OR dated within
   [meeting date, meeting date + 6]. So a report by the co-leader silences the
   follow-ups and the escalation for the leader and vice versa (the query has no
   author filter; covered by tests). A meeting without attendance is never
   followed up or escalated (the primary push owns that gap; flagged to product,
   decision: keep, the primary push covers it).
5. Groups without a fixed day or null `meeting_time` are skipped everywhere (no
   meeting instant can be computed), even if they have extra attendance rows.
6. Extra meetings (`life_group_attendance.is_extra = true`): reminders are driven
   by attendance rows, so an extra is followed up and escalated exactly like a
   regular meeting once its attendance exists (its own date + the group's
   `meeting_time`; the push deep link carries the extra's date). Reminders are
   never CREATED for an extra (no attendance row = nothing), and the primary-push
   check ignores extras (`is_extra = false` filter), so an extra on a regular date
   does not mark the regular meeting as recorded. Note: a report dated within
   6 days after a regular meeting also counts for an extra in that window
   (legacy date-window rule).

Config (`reminder_rules.config`, validated in `validateReminderConfig`; rows
saved before v2 get defaults through `resolveLifeGroupAttendanceConfig`):
`hours_after_meeting_start`, legacy `title`/`message`, `meeting_title`/
`meeting_message`, `followup_first_after_hours` (1-168, default 24),
`followup_interval_hours` (1-168, default 24), `followup_max_days` (0-14, default 5,
0 = off), `followup_window_hours` (0-12, default 2), `followup_title`/
`followup_message`, `escalation_after_days` (0-14, default 5, 0 = off),
`escalation_title`/`escalation_message`. Old -> new mapping (rows saved with the
earlier model keep working): `followup_hour` is ignored (the 09:00 model is gone);
`followup_interval_days` (1-7) is still ACCEPTED on save and used as a fallback
`followup_interval_hours = days x 24` only when `followup_interval_hours` is absent;
the admin UI no longer sends either old key. No data migration (defaults at read time).
Legacy `title`/`message` may be blank (flag-off saves unchanged); the V2 copy
keys reject blank, so the admin UI omits blank/cleared fields and the defaults
apply. A send failure marks the just-created Notification `failed` and releases
the claim, so a retry does not leave a stray `pending` row.
Edit them in admin-ui Notificacoes > Lembretes automaticos > "Reuniao do Life Group".

Switch-on steps (order matters, the combined screen does not exist in the apps yet and
old apps open the old attendance editor through the same deep link):
1. Release the app builds that contain the combined meeting screen (Phase 3).
2. Confirm adoption of those builds.
3. Set `LIFE_GROUP_MEETING_V2=true` in the backend environment and restart.
4. Later, as a separate cutover step (NOT part of phase 2): remove the
   `life-group-reports` entry from the `form_report` rule (defaults + a data migration on
   `reminder_rules`, pattern of `1780900000004`), so leaders stop getting the
   Sunday 20:00 form reminder in addition to the new follow-up.
Escalation deep link access: `GET /life-groups/:id` has no role gate (any
authenticated user), and `findSupervisedGroupIds` marks the group as supervised
for the sector leader/co-leader and area leader/co-leader, so they get the full
detail including members (`is_supervised: true`). A sector leader who is not the
group's leader can therefore open `paz://lifegroup/{id}`; no backend change needed.
Kill switch: unset/`false` and restart (the env var is only re-read after a restart); the legacy path then resumes.
Already-claimed keys are shared with the legacy path, so no duplicate pushes either way.

Tests: `reminders/evaluators/life-group-meeting-v2.reminders.spec.ts` (jest fake
timers), `types/reminder-config.spec.ts`, `life-group-meeting-v2.flag.spec.ts`,
opt-in `life-group-meeting-v2.integration.spec.ts` (real PostgreSQL, env
`REMINDERS_PG_*`, skipped by default).

`life_group_task` is also absent from `CATEGORY_PREF_MAP` (not opt-outable) and
maps to Android channel `paz_life_group`. The `life_group_tasks` rule is
seeded enabled with `days_before_meeting: [3,1]` and `hour: 9` (validated in
`RemindersService.update`). Per group, the evaluator runs hourly and acts on a
meeting `offset` days ahead: the largest offset generates assignments
(idempotent) and pushes assignees not yet notified (`notified_at`); smaller
offsets only remind `assigned` members with `reminded_at IS NULL`. Dedupe key
`life_group_tasks:{groupId}:{date}:d{offset}`; skipped dates and groups without
a fixed day are ignored. Reroll/decline/manual reassign push the new assignee
immediately; decline/reroll/no-eligible also push leader and co-leader. Message
templates support the `{task}` placeholder.

Multi-instance safety (claim first): the evaluator inserts the
`ReminderDispatchLog` row BEFORE generating/sending; a unique violation (23505)
means another instance owns it and it skips. If a send fails (or a d-1 run has
nobody to remind) the claim row is deleted so the next tick retries. Each
assignment push also claims its own marker with a conditional
`UPDATE ... WHERE id = ? AND notified_at|reminded_at IS NULL` before pushing and
puts it back to NULL on failure (same for the reroll/decline push and the
"no eligible member" leader push, which claims its
`...:unassignable:{digest}` key first). A hard process kill between claim and
release leaves the key claimed (that offset is not retried). A manual generate
by a leader/admin pushes new assignees through the same per-assignment claim
(only when the meeting falls within the largest configured offset; and not on
the largest-offset day itself while the Sao Paulo hour is still before the
rule's `hour`, since the evaluator will send it later that day with
`notified_at` left NULL).

## Push payload and tap routing (real flow)

Backend (`NotificationDispatchService` -> `FcmService.sendToUser`) sends one FCM message per
device token: `notification {title, body}`, `data {channel_id, deep_link?}` (all strings) and
`android.notification.channelId`. Clients must read exactly `deep_link` / `channel_id`
(locked by `notification-dispatch.service.spec.ts` and `providers/fcm.service.spec.ts`).

Android tap handling (`MainActivity`, `PushNotificationHelper`, `PazNavGraph`):
- App in background/killed: the FCM SDK renders the tray notification (our
  `PazFirebaseMessagingService.onMessageReceived` is NOT invoked) and a tap launches
  `MainActivity` with the `data` entries as Intent extras. Foreground messages go through
  `onMessageReceived`, whose own PendingIntent carries the same `deep_link` extra.
- `MainActivity` is `launchMode="singleTop"`: with the app task alive the tap arrives in
  `onNewIntent` (before this was a standard activity with no `onNewIntent`, so the existing task
  was just resumed on Home and the extra was lost - the "attendance push opens Home" bug).
  Killed app: `onCreate`.
- Both paths call `PushNotificationHelper.routeFromExtras` -> pending route state ->
  `PazNavGraph` navigates once the current destination is past Splash (auth/onboarding done),
  then consumes it. Unknown/blank links resolve to null (never crash `navigate`).

iOS tap handling (`AppDelegate`, `PushNotificationService`, `DeepLinkDestination`,
`MainTabView`, `AccountView`):
- FCM data keys are top-level `userInfo` keys. The `UNUserNotificationCenter` delegate is
  installed in `AppDelegate.didFinishLaunching` (a cold-start tap is delivered right after launch;
  installing it after the splash lost it). The tap sets `pendingDeepLink`.
- `MainTabView`/`AccountView` observe it with `onChange(..., initial: true)` because on a cold
  start the value is set before those views exist, and the Account tab is built lazily.
  Home-stack destinations (agenda, attendance, task) and `.account` are consumed by `MainTabView`;
  the rest are pushed by `AccountView`.

Manual verification on real devices: `.pipeline/push-qa-checklist.md`.

## Change checklist

- Backend category enum and payload producer updated.
- Admin UI category/role/channel management updated if exposed.
- Android/iOS deep-link parsing updated.
- Tests or manual test notes cover notification tap behavior
  (Android `PushNotificationHelperTest`, iOS `DeepLinkDestinationTests`, backend payload specs,
  device checklist `.pipeline/push-qa-checklist.md`).
- Deep link prefix added on one platform must be added on both
  (`PushNotificationHelper.parseDeepLink`, `DeepLinkDestination.parsedRoute`).

## 2026-10 bug investigation: forms deep-link 404 + Android channel routing

- **Forms deep-link 404 (false positive):** investigated a report that opening
  a `forms`-category push on iOS 404s. The forms catalog
  (`forms-catalog.service.ts`) is slug-keyed — `FormCatalogItem.id` on the
  client is aliased from the wire `slug` field — so `paz://formularios/{slug}`
  lookups already resolve correctly. No code fix was needed; a regression
  guard test (`reminders/types/reminder-config.spec.ts`) now asserts every
  configured `form_report` reminder's `form_slug` resolves to a real catalog
  slug, so a future rename can't silently break this again.
- **Android notification channel routing (real bug, fixed):** the backend
  never sent `channel_id` in the FCM payload, so every Android push landed in
  the "Eventos" channel regardless of category. `notification-channel.ts` now
  defines `CATEGORY_CHANNEL_MAP`, a `NotificationCategory → Android channel
  id` map, which is the documented contract with the Android `CHANNELS` list
  in `PazFirebaseMessagingService.kt`. `notification-dispatch.service.ts`
  includes `channel_id` in the push `data` payload and forwards it to
  `FcmService.sendToUser` as `androidChannelId`, which sets
  `android.notification.channelId` on the FCM send call — required because
  background/killed-state Android notifications are rendered natively by the
  FCM SDK from this field, not from the `data` payload. The backend contract
  is correct, but it only takes effect once the target channel ID actually
  exists on-device: Android ignores `android.notification.channelId` and
  falls back to the manifest-declared default channel if the channel hasn't
  been created yet by the app. `PazFirebaseMessagingService.ensureChannels()`
  previously only ran reactively inside `onMessageReceived`, which is never
  invoked for background/killed-state pushes carrying a top-level
  `notification` block (the FCM SDK renders those natively) — so a fresh
  install's channels, including the manifest default
  (`paz_church_default`), didn't exist yet when the first such push arrived.
  This is now fixed by calling `ensureChannels()` eagerly from
  `PazApplication.onCreate()`, closing the gap between the backend contract
  and what's actually registered on-device.
- `forms` and `meeting_reports` both collapse into the `paz_admin_alerts`
  channel today because no dedicated Android channel exists for them yet.
  This is a current limitation pending a dedicated channel — worth adding a
  `paz_forms` channel (and registering it in `PazFirebaseMessagingService.kt`
  `CHANNELS`) in a future app release if finer-grained notification control
  for forms is desired.
