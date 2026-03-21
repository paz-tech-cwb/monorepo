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

### New: `user_device_tokens` table

Stores FCM tokens per user. One user may have multiple tokens (multiple devices).

| Column | Type | Notes |
|---|---|---|
| `id` | int PK | |
| `user_id` | int FK → users | |
| `token` | varchar UNIQUE | FCM registration token |
| `platform` | enum | `android`, `ios` |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### New: `user_notification_preferences` table

One row per user, created automatically on first login with all columns defaulting to `true`.

| Column | Type | Default |
|---|---|---|
| `id` | int PK | |
| `user_id` | int FK UNIQUE → users | |
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

---

## Backend Architecture

### Module structure

All notification work lives in `src/notifications/`. Related user-facing endpoints live in `src/users/`.

```
src/notifications/
  notifications.module.ts
  notifications.controller.ts       # CRUD + reach preview
  notifications.service.ts          # Segment resolution, CRUD, queue registration
  notification-dispatch.service.ts  # Fans out to channel providers
  providers/
    fcm.service.ts                   # Firebase Admin SDK
    email.service.ts                 # Resend SDK
    sms.service.ts                   # Twilio SDK
    whatsapp.service.ts              # Meta Cloud API
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
| `FcmService` | Sends to all `user_device_tokens` for each target user via Firebase Admin SDK; auto-deletes stale tokens on `registration-token-not-registered` error |
| `EmailService` | Sends via Resend SDK to `user.email` |
| `SmsService` | Sends via Twilio SDK to `user.phone_number` |
| `WhatsappService` | Sends via Meta Cloud API to `user.phone_number` |
| `UserDeviceTokensService` | Register / remove FCM tokens |
| `UserNotificationPreferencesService` | Get / upsert preferences; create default row on first login |

### Dispatch flow

```
Admin POST /notifications
  │
  ├─ scheduled_at is null?
  │     └─ YES → status = "pending" → dispatch immediately (async, non-blocking)
  │
  └─ scheduled_at is future?
        └─ status = "scheduled" → register setTimeout for exact scheduled_at
              └─ On fire: dispatch

dispatch(notification):
  status = "processing"
  resolve segment → [User, ...]
  for each user:
    filter channels by user.notification_preferences (channel toggles)
    filter by user.notification_preferences (topic toggle for notification.category)
    if no channels remain → skip user
    else → dispatch to remaining channels
  recipients_count = count of users who received at least one channel
  status = all failed? "failed" : "sent"
  sent_at = now
```

### Scheduled notification recovery on startup

On `NestJS onApplicationBootstrap`:
1. Query: `SELECT * FROM notifications WHERE status = 'scheduled' AND scheduled_at > NOW()`
2. For each result, register a `setTimeout` for `scheduled_at - now` ms
3. Query: `SELECT * FROM notifications WHERE status = 'scheduled' AND scheduled_at <= NOW()`
4. Dispatch these immediately (missed while server was down)

### API Endpoints

All endpoints require `AuthGuard('jwt')`. Notification write endpoints additionally require `RolesGuard` with `admin` or `pastor`.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/notifications` | admin, pastor | Create and queue/schedule a notification |
| `GET` | `/notifications` | admin, pastor | List all notifications (history) |
| `GET` | `/notifications/:id` | admin, pastor | Get single notification |
| `DELETE` | `/notifications/:id` | admin, pastor | Delete (only if status is pending or scheduled) |
| `GET` | `/notifications/reach` | admin, pastor | Preview reach for a segment + channels |
| `POST` | `/users/device-tokens` | any authenticated | Register FCM token |
| `DELETE` | `/users/device-tokens/:token` | any authenticated | Remove FCM token |
| `GET` | `/users/me/notification-preferences` | any authenticated | Get own preferences |
| `PUT` | `/users/me/notification-preferences` | any authenticated | Update own preferences |

### Reach preview response shape

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

`excluded` counts users who match the segment but have that channel disabled — shown as a note in the admin UI ("49 users have push disabled").

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

### Notification composer (redesign of existing `notification-system.tsx`)

The composer is split into a two-column layout:

**Left column (form):**
1. **Category** — pill badge row; one selected at a time (Announcements, Events, Life Group, Academy, Admin Alerts)
2. **Channels** — 2×2 card grid; each card shows icon, name, provider label, checkmark; multi-select
3. **Audience segment** — filter builder; each filter row has a type dropdown + value dropdown + remove button; an "Add filter" button appends a new row; filter types: Status, Role, Sector, Life Group
4. **Message** — Title input + Message textarea

**Right sidebar:**
- **Estimated Reach box** — shows total recipients count + per-channel breakdown + exclusion note; updates live (debounced 500ms) as admin changes segment or channels; calls `GET /notifications/reach`
- **Schedule toggle** — toggles date + time inputs; when off, sends immediately
- **Send / Schedule button**

### History tab

Table columns: Title, Category, Channels (pills), Segment (summary text), Recipients, Status (badge), Actions.

Actions per row:
- **Duplicate** — pre-fills composer with copied fields, resets status; admin edits and sends as new notification
- **Delete** — only enabled for `pending` and `scheduled` status

Status badges: `sent` (green), `scheduled` (orange), `pending` (blue), `failed` (red).

### New API types

```typescript
// lib/api/types/notifications.ts additions
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
  created_at: string
}

export interface NotificationReachResponse {
  total: number
  by_channel: Record<string, number>
  excluded: Record<string, number>
}
```

---

## Mobile (Flutter)

### FCM setup

1. Add `firebase_messaging` and `firebase_admin` packages to `pubspec.yaml`
2. On login success: request notification permission (iOS) → get FCM token → `POST /users/device-tokens`
3. Register `FirebaseMessaging.onTokenRefresh` listener → re-POST new token
4. On logout: `DELETE /users/device-tokens/:token` → clear stored token

**Message handlers:**
- `FirebaseMessaging.onMessage` (foreground) — show local notification banner via `flutter_local_notifications`
- `FirebaseMessaging.onMessageOpenedApp` (background tap) — navigate to relevant screen based on `category` in payload
- `FirebaseMessaging.onBackgroundMessage` (terminated) — static top-level handler

### Notification preferences screen

Located at `lib/features/profile/notification_preferences_screen.dart`.

**Structure:**
- Master toggle ("All Notifications") — disables/enables all toggles visually and saves a global mute
- **Channels section**: Push, Email, SMS, WhatsApp — each shows the user's contact info as subtitle
- **Topics section**: Events, Announcements, Life Group, Academy, Admin Alerts

All toggles default to `true`. State loaded from `GET /users/me/notification-preferences` on screen open. Each toggle change calls `PUT /users/me/notification-preferences` immediately (optimistic UI).

**GetX controller:** `NotificationPreferencesController` — handles loading, saving, and error rollback.

### New backend endpoints consumed by mobile

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
| One channel provider fails | Other channels still dispatched; overall status reflects partial success |
| All channel providers fail | `status = "failed"` |
| FCM token invalid | Auto-delete token from DB; skip that device silently |
| User has no email | Skip email channel for that user |
| User has no phone number | Skip SMS and WhatsApp for that user |
| Server restart with pending scheduled notifications | Bootstrap recovery re-registers timers or dispatches missed ones immediately |

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

Three new migrations required:
1. Alter `notifications` table — add `category`, `segment`, `scheduled_at`, `created_by`; change `status` enum; remove `target_audience`
2. Create `user_device_tokens` table
3. Create `user_notification_preferences` table
