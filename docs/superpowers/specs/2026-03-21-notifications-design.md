# Notification System Design

**Date:** 2026-03-21
**Status:** Approved
**Scope:** Backend (NestJS), Admin-UI (Next.js), Mobile (Flutter)

---

## Overview

A full-featured notification system for Paz Church Curitiba that allows church staff to compose, segment, and dispatch notifications to members across four channels (Push, Email, SMS, WhatsApp). Notifications are queued in PostgreSQL and dispatched event-driven — immediately on creation or at a scheduled future time. Members control their preferences per-channel and per-topic from the mobile app.

---

## Goals

- Send notifications to segmented audiences via Push (FCM), Email (Resend), SMS (Twilio), and WhatsApp (Meta Cloud API)
- Admin selects channels and segment; system shows live estimated reach before sending
- Queue with `pending → processing → sent | failed` lifecycle; scheduled notifications fire at an exact time without polling
- History of all notifications with duplicate-and-edit workflow
- Flutter app registers FCM device tokens and exposes per-channel + per-topic preference controls
- User preferences are respected: if a user disables WhatsApp, they never receive WhatsApp notifications regardless of what admin selects
- Push notifications delivered to both Android and iOS

---

## Out of Scope

- In-app notification inbox (bell icon feed) — future feature
- Per-notification read receipts or open-rate analytics
- A/B testing of notification content
- Per-user delivery retries (partial failure = overall `sent`; no per-user dispatch log)

---

## Data Model

### Modified: `notifications` table

Replaces the existing stub entity. Adds `category`, `segment`, `scheduled_at`, `created_by`, and changes `status` to a richer enum.

| Column | Type | Notes |
|---|---|---|
| `id` | int PK | |
| `title` | varchar | |
| `message` | text | |
| `category` | enum | `events`, `announcements`, `life_group`, `academy`, `admin_alerts` |
| `channels` | jsonb | e.g. `["push","email"]` |
| `segment` | jsonb | See segment shape below |
| `recipients_count` | int | Snapshot of resolved recipient count at dispatch time |
| `status` | enum | `pending`, `processing`, `scheduled`, `sent`, `failed` |
| `scheduled_at` | timestamp nullable | null = send immediately on creation |
| `sent_at` | timestamp nullable | |
| `created_by` | int FK → users | Admin who created it |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**Status lifecycle:**
- Immediate: `pending` → `processing` → `sent` | `failed`
- Scheduled: `scheduled` → `processing` → `sent` | `failed`

**Partial failure rule:** If at least one user receives at least one channel, status = `sent`. If every dispatch attempt fails, status = `failed`. If the resolved user list is empty, status = `sent` with `recipients_count = 0`.

**Segment JSONB shape:**
```json
{
  "type": "all",
  "filters": {
    "roles": ["member", "life_group_leader"],
    "sector_ids": [1, 2],
    "life_group_ids": [3],
    "status": "active"
  }
}
```
`type: "all"` ignores `filters`. `type: "filtered"` applies all non-empty filter keys as AND conditions.

`filters.status` maps to the `status` column on the `users` table (existing column, values `active` / `inactive`).

### New: `user_device_tokens` table

Stores FCM tokens per user. One user may have multiple tokens (multiple devices).

| Column | Type | Notes |
|---|---|---|
| `id` | int PK | |
| `user_id` | int FK → users | |
| `token` | varchar UNIQUE | FCM registration token |
| `platform` | enum | `android`, `ios` |
| `last_used_at` | timestamp | Updated on every successful send; used for periodic stale-token cleanup |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### New: `user_notification_preferences` table

One row per user, created automatically on first login with all columns defaulting to `true`.

| Column | Type | Default |
|---|---|---|
| `id` | int PK | |
| `user_id` | int FK UNIQUE → users | |
| `all_notifications_enabled` | bool | true |
| `push_enabled` | bool | true |
| `email_enabled` | bool | true |
| `sms_enabled` | bool | true |
| `whatsapp_enabled` | bool | true |
| `events_enabled` | bool | true |
| `announcements_enabled` | bool | true |
| `life_group_enabled` | bool | true |
| `academy_enabled` | bool | true |
| `admin_alerts_enabled` | bool | true |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

`all_notifications_enabled = false` overrides all other preferences — no notifications are sent to this user regardless of individual toggles.

---

## Backend Architecture

### Module structure

All notification work lives in `src/notifications/`. Related user-facing endpoints live in `src/users/`.

```
src/notifications/
  notifications.module.ts
  notifications.controller.ts               # CRUD + reach preview
  notifications.service.ts                  # Segment resolution, CRUD, queue registration
  notification-dispatch.service.ts          # Fans out to channel providers
  providers/
    fcm.service.ts                           # Firebase Admin SDK
    email.service.ts                         # Resend SDK
    sms.service.ts                           # Twilio SDK
    whatsapp.service.ts                      # Meta Cloud API
  entities/
    notification.entity.ts
  dto/
    create-notification.dto.ts
    notification-response.dto.ts

src/users/
  user-device-tokens.service.ts
  user-notification-preferences.service.ts
  entities/
    user-device-token.entity.ts
    user-notification-preferences.entity.ts
  dto/
    register-device-token.dto.ts
    update-notification-preferences.dto.ts
```

### Service responsibilities

| Service | Responsibility |
|---|---|
| `NotificationsService` | CRUD, segment-to-user-list resolution, reach count calculation, timer registration for scheduled notifications |
| `NotificationDispatchService` | Receives a notification + resolved user list; filters each user by their preferences; calls channel providers |
| `FcmService` | Sends to all `user_device_tokens` for each target user via Firebase Admin SDK; auto-deletes stale tokens on `registration-token-not-registered` error; updates `last_used_at` on success |
| `EmailService` | Sends via Resend SDK to `user.email` |
| `SmsService` | Sends via Twilio SDK to `user.phone_number` |
| `WhatsappService` | Sends via Meta Cloud API to `user.phone_number` |
| `UserDeviceTokensService` | Register / remove FCM tokens |
| `UserNotificationPreferencesService` | Get / upsert preferences; create default row on first login |

### API Endpoints

All endpoints require `AuthGuard('jwt')`. Notification write endpoints additionally require `RolesGuard` with `admin` or `pastor`.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/notifications` | admin, pastor | Create and queue/schedule a notification |
| `GET` | `/notifications` | admin, pastor | List all notifications (history) |
| `GET` | `/notifications/:id` | admin, pastor | Get single notification |
| `DELETE` | `/notifications/:id` | admin, pastor | Delete (only if status is `pending` or `scheduled`; `409` otherwise) |
| `POST` | `/notifications/reach` | admin, pastor | Preview reach for a segment + channels |
| `POST` | `/users/device-tokens` | any authenticated | Register FCM token |
| `DELETE` | `/users/device-tokens/:token` | any authenticated | Remove FCM token |
| `GET` | `/users/me/notification-preferences` | any authenticated | Get own preferences |
| `PUT` | `/users/me/notification-preferences` | any authenticated | Update own preferences |

### Request / Response contracts

**`POST /notifications` — request body:**
```typescript
{
  title: string                    // required
  message: string                  // required
  category: NotificationCategory   // required
  channels: string[]               // required, min length 1; values: "push","email","sms","whatsapp"
  segment: NotificationSegment     // required
  scheduled_at?: string | null     // optional ISO 8601 timestamp; must be in the future if provided (422 otherwise)
}
```

**`POST /notifications/reach` — request body (same shape minus title/message/scheduled_at):**
```typescript
{
  channels: string[]
  segment: NotificationSegment
  category: NotificationCategory
}
```

**`POST /notifications/reach` — response:**
```json
{
  "total": 247,
  "by_channel": {
    "push": 198,
    "email": 247,
    "sms": 89,
    "whatsapp": 0
  },
  "excluded": {
    "push": 49
  }
}
```
`excluded` counts users who match the segment but have that channel disabled — shown in the admin UI as "49 users have push disabled."

**HTTP error codes:**
| Scenario | Code |
|---|---|
| `DELETE` notification with `status = sent/failed/processing` | `409 Conflict` |
| `POST /notifications` with `scheduled_at` in the past | `422 Unprocessable Entity` |
| Invalid segment shape | `400 Bad Request` |
| Unauthorized role | `403 Forbidden` |

### Dispatch flow

```
Admin POST /notifications
  │
  ├─ scheduled_at is null?
  │     └─ YES → status = "pending" → dispatch immediately (async, non-blocking setImmediate)
  │
  └─ scheduled_at is future?
        └─ status = "scheduled" → register setTimeout for (scheduled_at - now) ms
              └─ On fire: dispatch

dispatch(notification):
  status = "processing"
  resolve segment → [User, ...]
  if users list is empty:
    recipients_count = 0; status = "sent"; sent_at = now; return

  successCount = 0
  for each user:
    if user.preferences.all_notifications_enabled = false → skip
    filter channels by user.preferences (push_enabled, email_enabled, etc.)
    filter by user.preferences topic toggle (events_enabled, etc.) for notification.category
    if no channels remain → skip user
    dispatch to remaining channels (each provider independently; one failing does not block others)
    if at least one channel succeeded → successCount++

  recipients_count = successCount
  status = successCount > 0 ? "sent" : "failed"
  sent_at = now
```

### Scheduled notification recovery on startup

On `NestJS onApplicationBootstrap`:
1. Query: `WHERE status = 'scheduled' AND scheduled_at > NOW()` → register `setTimeout` for each
2. Query: `WHERE status = 'scheduled' AND scheduled_at <= NOW()` → dispatch each immediately

Using `>` and `<=` ensures no notification falls into both or neither bucket.

### Environment variables (additions to backend `.env`)

```bash
# Firebase Admin SDK
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@pazchurch.com.br

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

# Meta Cloud API (WhatsApp)
META_WHATSAPP_TOKEN=
META_WHATSAPP_PHONE_NUMBER_ID=
```

---

## Admin-UI Design

### File structure

```
lib/api/types/notifications.ts              # Request/response interfaces (snake_case)
lib/api/endpoints/notifications.ts          # Thin wrappers: sendNotification, getNotifications, deleteNotification, getReach
lib/hooks/use-notifications.ts              # TanStack Query hooks
app/(dashboard)/notifications/
  page.tsx                                  # Server component
  notification-system.tsx                   # "use client" — tabs: Compose + History
```

### Notification composer (redesign of existing `notification-system.tsx`)

Two-column layout:

**Left column (form):**
1. **Category** — pill badge row; one selected at a time (Announcements, Events, Life Group, Academy, Admin Alerts)
2. **Channels** — 2×2 card grid; each card shows icon, name, provider label, checkmark; multi-select; at least one required
3. **Audience segment** — filter builder; each filter row has a type dropdown + value dropdown + remove button; "Add filter" appends a new row; filter types: Status, Role, Sector, Life Group; no filters = all members
4. **Message** — Title input + Message textarea

**Right sidebar:**
- **Estimated Reach box** — total recipients count + per-channel breakdown + exclusion notes; updates live (debounced 500ms) as admin changes segment or channels; calls `POST /notifications/reach`
- **Schedule toggle** — toggles date + time inputs; when off, sends immediately on submit
- **Send / Schedule button**

### History tab

Table columns: Title, Category, Channels (pills), Segment (human-readable summary), Recipients, Status (badge), Sent by, Actions.

Actions per row:
- **Duplicate** — pre-fills composer with copied fields; resets status; admin edits and sends as a new notification
- **Delete** — only enabled for `pending` and `scheduled` status; calls `DELETE /notifications/:id`

Status badges: `sent` (green), `scheduled` (orange), `pending` (blue), `failed` (red).

### TypeScript types

```typescript
// lib/api/types/notifications.ts

export type NotificationCategory =
  | 'events' | 'announcements' | 'life_group' | 'academy' | 'admin_alerts'

export type NotificationStatus =
  | 'pending' | 'processing' | 'scheduled' | 'sent' | 'failed'

export interface NotificationSegment {
  type: 'all' | 'filtered'
  filters?: {
    roles?: string[]
    sector_ids?: number[]
    life_group_ids?: number[]
    status?: 'active' | 'inactive'
  }
}

export interface Notification {
  id: number
  title: string
  message: string
  category: NotificationCategory
  channels: string[]
  segment: NotificationSegment
  recipients_count: number
  status: NotificationStatus
  scheduled_at: string | null
  sent_at: string | null
  created_by: number
  created_at: string
}

export interface CreateNotificationRequest {
  title: string
  message: string
  category: NotificationCategory
  channels: string[]
  segment: NotificationSegment
  scheduled_at?: string | null
}

export interface NotificationReachRequest {
  channels: string[]
  segment: NotificationSegment
  category: NotificationCategory
}

export interface NotificationReachResponse {
  total: number
  by_channel: Record<string, number>
  excluded: Record<string, number>
}

export interface UpdateNotificationPreferencesRequest {
  all_notifications_enabled?: boolean
  push_enabled?: boolean
  email_enabled?: boolean
  sms_enabled?: boolean
  whatsapp_enabled?: boolean
  events_enabled?: boolean
  announcements_enabled?: boolean
  life_group_enabled?: boolean
  academy_enabled?: boolean
  admin_alerts_enabled?: boolean
}
```

---

## Mobile (Flutter)

### Packages to add to `pubspec.yaml`

```yaml
firebase_messaging: ^14.x
flutter_local_notifications: ^17.x
```

`firebase_admin` is a server-side SDK only — it does NOT go in Flutter. The Firebase Admin SDK is used only in the NestJS `FcmService`.

### FCM setup

1. On login success: request notification permission (iOS only via `messaging.requestPermission()`)
2. Get FCM token via `FirebaseMessaging.instance.getToken()`
3. If token is null (permission denied on iOS): skip registration silently — do not show an error
4. If token is non-null: `POST /users/device-tokens` with token + platform
5. Register `FirebaseMessaging.instance.onTokenRefresh` listener → re-POST new token on refresh
6. On logout: `DELETE /users/device-tokens/:token` → clear locally stored token

**Message handlers:**
- `FirebaseMessaging.onMessage` (foreground) — show local notification banner via `flutter_local_notifications`
- `FirebaseMessaging.onMessageOpenedApp` (background tap) — navigate to relevant screen based on `category` in payload data
- `FirebaseMessaging.onBackgroundMessage` (terminated) — static top-level handler (must be a top-level function, not a class method)

### Notification preferences screen

Location: `lib/features/profile/notification_preferences_screen.dart`

**GetX controller:** `NotificationPreferencesController`
- Loads preferences from `GET /users/me/notification-preferences` on screen open
- Each toggle change calls `PUT /users/me/notification-preferences` immediately (optimistic UI; rollback on error)

**Screen structure:**
- **Master toggle** ("All Notifications") — maps to `all_notifications_enabled`; when turned off, greys out all other toggles visually (they remain editable but `all_notifications_enabled = false` overrides them server-side)
- **Channels section**: Push (subtitle: device type), Email (subtitle: user email), SMS (subtitle: phone number), WhatsApp (subtitle: phone number)
- **Topics section**: Events, Announcements, Life Group, Academy, Admin Alerts

All preferences default to `true`. Preferences row is created automatically on first login by `UserNotificationPreferencesService`.

### Backend endpoints consumed by mobile

| Endpoint | When called |
|---|---|
| `POST /users/device-tokens` | After login, on token refresh |
| `DELETE /users/device-tokens/:token` | On logout |
| `GET /users/me/notification-preferences` | Preferences screen open |
| `PUT /users/me/notification-preferences` | Each toggle change |

---

## Error Handling

| Scenario | Behavior |
|---|---|
| One channel provider fails, others succeed | Other channels proceed; overall status = `sent` |
| All channel providers fail for all users | `status = "failed"` |
| No users match the segment | `recipients_count = 0`, `status = "sent"` |
| FCM token invalid (`registration-token-not-registered`) | Auto-delete token from DB; skip that device silently |
| User has no email | Skip email channel for that user silently |
| User has no phone number | Skip SMS and WhatsApp for that user silently |
| User has `all_notifications_enabled = false` | Skip user entirely for all channels |
| Server restart with pending scheduled notifications | Bootstrap recovery re-registers timers or dispatches missed ones immediately |
| iOS notification permission denied | FCM token is null; skip device token registration; no error shown to user |
| `DELETE` notification with non-pending/non-scheduled status | `409 Conflict` |
| `POST /notifications` with `scheduled_at` in the past | `422 Unprocessable Entity` |

---

## Third-party Providers

| Channel | Provider | Free Tier |
|---|---|---|
| Push | Firebase Cloud Messaging | Free (already configured) |
| Email | Resend | 3,000 emails/month |
| SMS | Twilio | Free trial credits |
| WhatsApp | Meta Cloud API | 1,000 conversations/month |

---

## Database Migrations

Three new migrations required (in order):
1. **Alter `notifications` table** — add `category` (enum), `segment` (jsonb), `scheduled_at` (timestamp nullable), `created_by` (int FK); change `status` enum values; remove `target_audience` column; rename `recipients` → `recipients_count`
2. **Create `user_device_tokens` table** — with `last_used_at` column
3. **Create `user_notification_preferences` table** — with `all_notifications_enabled` column and all channel/topic boolean columns defaulting to `true`
