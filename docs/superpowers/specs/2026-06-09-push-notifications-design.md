# Push Notifications — Full-Stack Design

**Date:** 2026-06-09  
**Status:** Approved  
**Scope:** Backend (NestJS) · Admin UI (Next.js) · KMP shared · Android · iOS

---

## 1. Goals

- Admin targets an audience and sends a push notification; backend dispatches it via FCM to every signed-in device.
- Every signed-in device for a user receives notifications (not just the last one).
- On logout, the current device's FCM token is removed atomically — no further notifications arrive on that device.
- Users can enable or disable per-category notifications from inside the app.
- Core/segmented categories (admin alerts, forms, meeting reports) cannot be opted out of — they are not shown in the preferences screen.
- The backend tracks OS-level push permission status per user (`granted` / `denied` / `not_determined`).

---

## 2. Notification Categories

| Category | User toggle | Audience |
|---|---|---|
| `events` | yes | all or filtered |
| `announcements` | yes — core | all |
| `life_group` | yes | filtered by life group |
| `academy` | yes | all or filtered |
| `member_journey` | yes | filtered (individual) |
| `contributions` | yes | all or filtered |
| `admin_alerts` | no toggle | roles: admin, pastor |
| `forms` | no toggle | roles: leaders (segmented) |
| `meeting_reports` | no toggle | roles: leaders (segmented) |

**Dispatch rule for no-toggle categories:** `NotificationDispatchService` skips the preference check entirely for `admin_alerts`, `forms`, and `meeting_reports` — it only validates the segment.

---

## 3. Backend

### 3.1 Database Migrations

**Migration 1 — extend `notification_category_enum`**
Add values: `forms`, `member_journey`, `contributions`, `meeting_reports`.

**Migration 2 — update `user_notification_preferences`**

Add columns:
```sql
member_journey_enabled  boolean NOT NULL DEFAULT true,
contributions_enabled   boolean NOT NULL DEFAULT true,
os_permission_status    notification_os_permission_enum NOT NULL DEFAULT 'not_determined'
```

Create enum:
```sql
CREATE TYPE notification_os_permission_enum AS ENUM ('granted', 'denied', 'not_determined');
```

Drop columns (no longer needed — these categories are non-toggleable):
```sql
-- forms_enabled and meeting_reports_enabled are never added (segmented-only categories)
```

### 3.2 `UserNotificationPreferences` entity changes

- Add `memberJourneyEnabled: boolean`
- Add `contributionsEnabled: boolean`
- Add `osPermissionStatus: 'granted' | 'denied' | 'not_determined'`
- Remove nothing — `admin_alerts_enabled` stays (used for any future toggleable admin alert variant)

### 3.3 `CATEGORY_PREF_MAP` in `NotificationDispatchService`

```typescript
const CATEGORY_PREF_MAP: Partial<Record<NotificationCategory, keyof UserNotificationPreferences>> = {
  events: 'eventsEnabled',
  announcements: 'announcementsEnabled',
  life_group: 'lifeGroupEnabled',
  academy: 'academyEnabled',
  member_journey: 'memberJourneyEnabled',
  contributions: 'contributionsEnabled',
  // admin_alerts, forms, meeting_reports — intentionally omitted (no pref check)
};
```

Dispatch logic: if the category is not in the map, skip preference check and send directly to the segment.

### 3.4 `POST /api/auth/logout` change

Request body gains optional field:
```typescript
{ fcm_token?: string }
```

On logout: if `fcm_token` is present, `DELETE` from `user_device_tokens` where `token = fcm_token AND user_id = req.user.id` before session invalidation.

### 3.5 `PUT /users/me/notification-preferences`

Accepts partial updates. The mobile foreground sync sends only `{ os_permission_status: 'granted' | 'denied' }`. The full preferences save sends all 6 toggleable fields. Same endpoint, all fields optional in the DTO.

### 3.6 Segment enforcement for `forms` and `meeting_reports`

`CreateNotificationDto` validator: if `category` is `forms` or `meeting_reports`, `segment.type` must be `'filtered'` and `segment.filters.roles` must be non-empty. Reject with `400` otherwise.

---

## 4. Admin UI

### 4.1 Category dropdown

Add to the category options: `forms`, `member_journey`, `contributions`, `meeting_reports`.

### 4.2 Segment lock for leader-only categories

When `category` is `forms` or `meeting_reports`, the segment selector is locked to `filtered` and roles field is required. "Send to all" option is hidden.

### 4.3 No new pages

The existing `NotificationSystem` create/list/delete flow covers everything. Reach estimate endpoint already returns `total + by_channel` — no changes.

---

## 5. KMP Shared Layer (`:shared`)

### 5.1 New DTOs (`commonMain`)

```kotlin
@Serializable
data class NotificationPreferencesDto(
    val events_enabled: Boolean,
    val announcements_enabled: Boolean,
    val life_group_enabled: Boolean,
    val academy_enabled: Boolean,
    val member_journey_enabled: Boolean,
    val contributions_enabled: Boolean,
    val os_permission_status: String, // "granted" | "denied" | "not_determined"
)

@Serializable
data class UpdateNotificationPrefsDto(
    val events_enabled: Boolean? = null,
    val announcements_enabled: Boolean? = null,
    val life_group_enabled: Boolean? = null,
    val academy_enabled: Boolean? = null,
    val member_journey_enabled: Boolean? = null,
    val contributions_enabled: Boolean? = null,
    val os_permission_status: String? = null,
)
```

### 5.2 `UserRepository` interface additions

```kotlin
suspend fun getNotificationPreferences(): Result<NotificationPreferencesDto>
suspend fun updateNotificationPreferences(dto: UpdateNotificationPrefsDto): Result<Unit>
```

### 5.3 `AuthRepository.logout()` change

```kotlin
suspend fun logout(fcmToken: String? = null): Result<Unit>
```

Passes `fcm_token` in the request body if present.

### 5.4 FCM token expect/actual

```kotlin
// commonMain
expect suspend fun getFcmToken(): String?

// androidMain — FirebaseMessaging.getInstance().token.await()
// iosMain — Messaging.messaging().token() via completion-handler wrapper
```

Used by logout flow on both platforms to retrieve the current FCM token before calling `authRepository.logout(fcmToken)`.

---

## 6. Android

### 6.1 FCM token on login

`PushNotificationHelper.registerToken()` already handles this. No change.

### 6.2 Logout

`AuthRepositoryImpl.logout()` calls `getFcmToken()` and passes result to the logout request body. Called from `ProfileViewModel` (or wherever `authRepository.logout()` is invoked).

### 6.3 OS permission sync

`MainActivity.onResume()`:
```kotlin
val status = if (ContextCompat.checkSelfPermission(this, POST_NOTIFICATIONS) == PERMISSION_GRANTED)
    "granted" else "denied"
scope.launch {
    userRepository.updateNotificationPreferences(UpdateNotificationPrefsDto(os_permission_status = status))
}
```
Fires on every foreground return — keeps backend in sync when user changes permission in Android Settings.

### 6.4 `NotificationPrefsViewModel`

- On init: call `getNotificationPreferences()` → populate 6 toggles
- On save: call `updateNotificationPreferences()` with all 6 fields
- `UiState` gains `isLoading: Boolean`, `error: String?`, `saveSuccess: Boolean`

### 6.5 Notification channels

One Android notification channel per category (best practice Android 8+):
```
paz_events, paz_announcements, paz_life_group, paz_academy,
paz_member_journey, paz_contributions, paz_admin_alerts
```
Created in `PazFirebaseMessagingService.ensureChannels()`. FCM message `data` payload includes `channel_id` field so the backend can route each category to the right channel.

---

## 7. iOS

### 7.1 FCM token registration

`PushNotificationService.didRegisterForRemoteNotifications(deviceToken:)`:
```swift
Messaging.messaging().apnsToken = deviceToken
Messaging.messaging().token { token, error in
    guard let token else { return }
    Task {
        try? await userRepository.registerDeviceToken(
            token: DeviceToken(token: token, platform: .ios)
        )
    }
}
```
Replaces the current raw APNs hex-string registration.

### 7.2 Logout

`AuthenticationCoordinator.logout()`:
```swift
let fcmToken = try? await Messaging.messaging().token()
try await authRepository.logout(fcmToken: fcmToken)
```

### 7.3 OS permission sync

In `PazChurchApp`, observe scene phase:
```swift
.onChange(of: scenePhase) { _, phase in
    guard phase == .active else { return }
    Task {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        let status: String = switch settings.authorizationStatus {
            case .authorized: "granted"
            case .denied: "denied"
            default: "not_determined"
        }
        try? await userRepository.updateNotificationPreferences(
            UpdateNotificationPrefsDto(os_permission_status: status)
        )
    }
}
```

### 7.4 `NotificationPrefsViewModel`

- On `.task {}`: call `getNotificationPreferences()` → populate 6 toggles
- On save: call `updateNotificationPreferences()` with all 6 fields
- Gains `isLoading: Bool`, `errorMessage: String?`

### 7.5 `NotificationPrefsView`

Add missing toggles: `member_journey` ("Jornada do Membro") and `contributions` ("Contribuições"). Total: 6 toggles. No-toggle categories never appear.

### 7.6 `AppDelegate`

No changes beyond the FCM token swap inside `PushNotificationService`.

---

## 8. Data Flow Summary

```
Admin creates notification (admin-ui)
  → POST /api/notifications
  → NotificationsService resolves segment → User[]
  → NotificationDispatchService iterates users
      → checks UserNotificationPreferences (skipped for admin_alerts / forms / meeting_reports)
      → FcmService.sendToUser() → UserDeviceTokens (all devices per user)
          → firebase-admin sends to each FCM token
          → stale tokens auto-removed on messaging/registration-token-not-registered

User logs out (mobile)
  → getFcmToken() → authRepository.logout(fcmToken)
  → POST /api/auth/logout { fcm_token }
  → backend deletes token + invalidates session

User opens notification settings (mobile)
  → getNotificationPreferences() → populate UI
  → user saves → updateNotificationPreferences() → PUT /users/me/notification-preferences

App returns to foreground (mobile)
  → check OS permission status → updateNotificationPreferences({ os_permission_status })
```

---

## 9. Out of Scope

- In-app notification inbox/history (not required — OS notification tray only)
- Email / SMS / WhatsApp channels (existing infrastructure, no changes)
- Re-engagement prompts for denied permission (future feature)
- Rich media push notifications (images, actions)
