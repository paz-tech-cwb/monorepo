# Push notification tap routing - real-device QA checklist

Why this exists: tapping a push must open the target screen (e.g. attendance), not Home.
Emulators/simulators cannot reproduce the killed/background states reliably, so run this
on physical devices (Android + iPhone) with a build from `fix/pilot-readiness`.

## Wire contract (what the clients read)

Backend `NotificationDispatchService` -> `FcmService.sendToUser` sends one FCM message per device:

```
notification: { title, body }
data: { channel_id: "<paz_*>", deep_link: "paz://..." }   // deep_link omitted when none
android.notification.channelId: "<paz_*>"
```

- Android background/killed: the FCM SDK shows the tray notification itself. A tap launches
  `MainActivity` with every `data` key as an Intent extra (`deep_link`). `onMessageReceived`
  is NOT called. Delivered through `onCreate` (killed) or `onNewIntent` (alive; `singleTop`).
- Android foreground: `PazFirebaseMessagingService.onMessageReceived` builds its own
  notification whose PendingIntent carries the same `deep_link` extra.
- iOS: `data` keys are top-level keys of `userInfo` (next to `aps`); read in
  `userNotificationCenter(_:didReceive:)` -> `PushNotificationService` -> `pendingDeepLink`.

Deep links per category: attendance `paz://presenca/{lifeGroupId}/{YYYY-MM-DD}`, task
`paz://tarefa/{assignmentId}`, study `paz://estudo-do-life/{studyId}`, report/form
`paz://form/{formSlug}` (form_report reminders), event `paz://agenda/{eventId}`,
journey `paz://journey`, generic = no `deep_link` (app just opens).

## How to trigger each push

Pick whichever is easiest; all end up as the same FCM payload.

1. Real automatic flows (most faithful): attendance reminder (leader/co-leader of a group whose
   meeting started `hours_after_meeting_start` ago and no attendance recorded), task assignment
   (generate tasks / reroll in the app), study publish, form_report reminder, event reminder.
2. Admin UI (`/notifications`): create a push to yourself (segment: filtered by your user).
   Only `events` sets a deep link automatically (`paz://agenda/{id}`); other categories send none
   (good for the "generic" row).
3. Firebase console -> Cloud Messaging -> "New campaign" -> Notification -> "Send test message"
   with your device FCM token, and under "Additional options -> Custom data" add EXACTLY:
   - `deep_link` = `paz://presenca/<realGroupId>/<meetingDate yyyy-MM-dd>` (or the other links above)
   - `channel_id` = `paz_life_group` (Android only; see `CATEGORY_CHANNEL_MAP`)
   Use a real id the logged-in user can access, otherwise the target screen shows an error state
   (that is a data problem, not a routing problem: the screen itself opening is the pass criterion).
   Note: console test messages do not set `android.notification.channelId`; Android falls back to
   the default channel, which is fine for routing.

## Test matrix

Prerequisites: logged-in user (leader of a life group for attendance/task), notification
permission granted, app updated to the test build. Do each row on Android AND iOS.

States:
- COLD = swipe the app away from recents (Android: also "Force stop" once), lock/unlock not needed.
- BG = app open, then press Home (app still in recents).
- FG = app open on screen X (try both Home and a different tab/screen).

| # | Category / deep link | COLD | BG | FG | Expected |
|---|---|---|---|---|---|
| 1 | Attendance `paz://presenca/{id}/{date}` | [ ] | [ ] | [ ] | Attendance editor for that group+date; Back returns to Home |
| 2 | Task `paz://tarefa/{assignmentId}` | [ ] | [ ] | [ ] | Task guide screen |
| 3 | Study `paz://estudo-do-life/{id}` | [ ] | [ ] | [ ] | Study detail |
| 4 | Report/form `paz://form/{slug}` | [ ] | [ ] | [ ] | Form screen for that slug |
| 5 | Event `paz://agenda/{id}` | [ ] | [ ] | [ ] | Event detail |
| 6 | Member journey `paz://journey` | [ ] | [ ] | [ ] | Minha Jornada |
| 7 | Generic (no `deep_link`) | [ ] | [ ] | [ ] | App opens/stays; no crash, no wrong screen |
| 8 | Bad link `paz://presenca/` or `paz://unknown/1` | [ ] | [ ] | [ ] | App opens on Home, no crash |

Extra scenarios (do for attendance at least):
- [ ] Two taps in a row on two different pushes (BG): second tap goes to its own screen.
- [ ] Tap the same push, press Back, tap another copy of the same push: opens again.
- [ ] COLD while logged out: app opens, no crash (screen may show login/empty state).
- [ ] COLD for a user that still has onboarding steps: onboarding first, then (Android) the target
      screen opens after onboarding finishes; (iOS) target opens once the main tabs appear.
- [ ] iOS: tap while the screen is locked (Face ID) - after unlock the target opens.
- [ ] Android 13+: with POST_NOTIFICATIONS denied nothing is shown (expected); grant and retest.
- [ ] Android: tap from the notification shade AND from the lock screen.

## What to record on a failure

- Platform/OS version, state (COLD/BG/FG), which category, exact `deep_link` string.
- Android: `adb logcat -s ActivityTaskManager FirebaseMessaging` and
  `adb shell dumpsys activity activities | grep -A3 MainActivity` (look for `singleTop`).
- iOS: Console.app filtered on `PazChurch`; check `[PushNotification]` lines.
- Whether the push was sent with a `notification` block (admin/automatic = yes; data-only test = no).

## Known limits

- iOS only receives the tap if the app can register for remote notifications (real device, valid
  APNs key in the Firebase project). Simulators cannot validate this end to end.
- Android channels only apply once created on the device (`PazApplication.onCreate` creates them).
