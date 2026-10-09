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

Entity-specific notifications must include IDs in the data payload.

## Automatic reminders

| Reminder type | Category |
|---|---|
| `form_report` | `forms` |
| `event` | `events` |
| `member_journey` | `member_journey` |
| `life_group_attendance` | `life_group_attendance` |

`forms` and `life_group_attendance` are deliberately absent from `CATEGORY_PREF_MAP`
(`notification-dispatch.service.ts`), so leaders cannot opt out of them via
notification preferences — they cover core recurring job duties, not optional
updates. Recipients for `life_group_attendance` are the group's `leader_id`
and `co_leader_id` (when set); it fires once, `hours_after_meeting_start`
hours after the group's `meeting_day`/`meeting_time`, and is skipped entirely
for groups without a fixed meeting day/time ("Sem dia fixo" or no
`meeting_time`).

## Change checklist

- Backend category enum and payload producer updated.
- Admin UI category/role/channel management updated if exposed.
- Android/iOS deep-link parsing updated.
- Tests or manual test notes cover notification tap behavior.

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
