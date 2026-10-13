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
| `life_group_attendance` | Life group attendance editor | `paz://presenca/{lifeGroupId}/{date}` |
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

`form_report` for the `life-group-reports` slug is group-based: before dispatching, `FormReportReminderEvaluator` loads the groups each role-holder target leads or co-leads (`life_groups.leader_id`/`co_leader_id`) and drops the target when EVERY one of those groups has a non-deleted `life_group_reports` row whose meeting `date` is on/after the Monday of the current church week (America/Sao_Paulo calendar, ISO week Monday..Sunday; `churchWeekStartKey`), regardless of who submitted. So a report by the co-leader silences the leader and vice-versa (the recipient set stays role-based: only role holders are notified); a user with two groups keeps being reminded until both have reported; a target who leads/co-leads no group is always reminded. If everyone is silenced, no notification row is created. Other slugs (sector/area supervisor reports) still notify every target. Clock: `FormReportReminderEvaluator.run` evaluates the entry's `weekday`/`hour` in America/Sao_Paulo (`zonedParts`/`weekdayOf` from `meeting-day.util`), not the server's UTC, so "Sunday 20h" fires at 20:00 Sao Paulo (it used to fire at 17h). Dedupe key is `form_report:<slug>:<Sao Paulo date>` (was the UTC date). Deploy day: the old clock sent at 20:00 UTC = 17:00 SP and the new one fires at 23:00 UTC = 20:00 SP, both on the same UTC and SP date, so the key is identical and the unique `reminder_dispatch_log` row dedupes (no second send that Sunday; rules at hours where UTC and SP dates differ only gain a correct key). Reminder config unchanged.

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
