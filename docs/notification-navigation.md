# Notification Navigation — Deep Link Map

When a user taps a push notification, the app navigates based on the notification's `category` field and optional `deep_link` payload.

---

## Category → Screen mapping

| Category | Android Route | iOS Navigation | Deep Link Scheme |
|---|---|---|---|
| `events` | `agenda_detail/{eventId}` | `AgendaDetailView(eventId:)` | `paz://agenda/{eventId}` |
| `announcements` | `home` (scroll to announcements) | `HomeView` | `paz://account` |
| `life_group` | `life_group_detail/{lifeGroupId}` | `LifeGroupDetailView(lifeGroupId:)` | `paz://lifegroup/{lifeGroupId}` |
| `academy` | `academy` | `AcademyView` | — |
| `forms` | `formularios` | `FormulariosListView` | `paz://formularios` |
| `member_journey` | `member_journey` | `MemberJourneyView` | `paz://journey` |
| `admin_alerts` | `account` | `AccountView` | `paz://account` |
| `contributions` | `account` | `AccountView` | `paz://account` |

> **Note:** `eventId`, `lifeGroupId` etc. must be included in the notification's `data` payload (FCM data fields). The app reads them from the notification extras on tap.

---

## Android — PushNotificationHelper.parseDeepLink

Handled in `kmp-mobile/android/.../notifications/PushNotificationHelper.kt`:

```kotlin
fun parseDeepLink(deepLink: String): String? =
    when {
        deepLink.startsWith("paz://agenda/")     -> "agenda_detail/${deepLink.removePrefix("paz://agenda/")}"
        deepLink.startsWith("paz://form/")       -> "form_detail/${deepLink.removePrefix("paz://form/")}"
        deepLink.startsWith("paz://ministry/")   -> "ministry_detail/${deepLink.removePrefix("paz://ministry/")}"
        deepLink.startsWith("paz://lifegroup/")  -> "life_group_detail/${deepLink.removePrefix("paz://lifegroup/")}"
        deepLink.startsWith("paz://formularios") -> "formularios"
        deepLink.startsWith("paz://journey")     -> "member_journey"
        deepLink.startsWith("paz://account")     -> "account"
        else -> null
    }
```

---

## Automatic reminder categories (hardcoded, not admin-configurable)

| Reminder type | Category sent |
|---|---|
| `form_report` | `forms` → navigates to Formulários list |
| `event` | `events` → navigates to the specific event detail |
| `member_journey` | `member_journey` → navigates to Minha Jornada |

For `event` reminders, the `eventId` should be included in the notification data payload so the app can open the correct event detail screen directly.

---

## Future: adding a new category

1. Add the category value to `NotificationCategory` in `backend` and `admin-ui`.
2. Add a row to this table.
3. Add a `when` branch in `PushNotificationHelper.parseDeepLink` (Android).
4. Add a `NavigationLink` / `.onReceive` handler for the deep link on iOS.
