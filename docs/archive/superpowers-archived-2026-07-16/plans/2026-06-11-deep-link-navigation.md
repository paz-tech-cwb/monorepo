# Deep-Link Navigation End-to-End Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Push notifications dispatched by the backend include a `deep_link` field in the FCM data payload; tapping a notification on Android or iOS navigates the user directly to the correct screen.

**Architecture:** The backend adds a nullable `deep_link` column to `notifications` and passes it through `NotificationDispatchService → FcmService` as a FCM `data` map entry. Android already reads `message.data["deep_link"]` and routes via `PazNavGraph` — one defensive fix is needed. iOS has `PushNotificationService.pendingDeepLink` set on tap but no view consumes it; `MainTabView` gets a typed `DeepLinkDestination` router and a `NavigationPath` per tab.

**Tech Stack:** NestJS 11 / TypeORM / PostgreSQL 16 (backend) · Jetpack Compose / Compose Navigation (Android) · SwiftUI / `@Observable` / `NavigationStack` (iOS)

---

## File Map

### Backend
| Action | File |
|---|---|
| Modify | `backend/src/notifications/entities/notification.entity.ts` |
| Modify | `backend/src/notifications/notification-dispatch.service.ts` |
| Modify | `backend/src/reminders/evaluators/event-reminder.evaluator.ts` |
| Modify | `backend/src/reminders/evaluators/form-report-reminder.evaluator.ts` |
| Modify | `backend/src/reminders/evaluators/member-journey-reminder.evaluator.ts` |
| Create | `backend/database/migrations/1780900000005-AddDeepLinkToNotifications.ts` |

### Android
| Action | File |
|---|---|
| Modify | `kmp-mobile/android/src/main/kotlin/br/church/paz/android/MainActivity.kt` |

### iOS
| Action | File |
|---|---|
| Create | `kmp-mobile/ios/PazChurch/Navigation/DeepLinkDestination.swift` |
| Modify | `kmp-mobile/ios/PazChurch/Services/PushNotificationService.swift` |
| Modify | `kmp-mobile/ios/PazChurch/Navigation/MainTabView.swift` |

---

## Task 1 — Backend: add `deep_link` column to `notifications`

**Files:**
- Modify: `backend/src/notifications/entities/notification.entity.ts`
- Create: `backend/database/migrations/1780900000005-AddDeepLinkToNotifications.ts`

- [ ] **Step 1.1 — Add `deepLink` property to the `Notification` entity**

  Open `backend/src/notifications/entities/notification.entity.ts` and add this column after `sentAt`:

  ```typescript
  @Column({ name: 'deep_link', type: 'varchar', length: 500, nullable: true })
  deepLink: string | null;
  ```

- [ ] **Step 1.2 — Create the migration**

  Create `backend/database/migrations/1780900000005-AddDeepLinkToNotifications.ts`:

  ```typescript
  import { MigrationInterface, QueryRunner } from 'typeorm';

  export class AddDeepLinkToNotifications1780900000005
    implements MigrationInterface
  {
    name = 'AddDeepLinkToNotifications1780900000005';

    public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(
        `ALTER TABLE "notifications" ADD COLUMN "deep_link" varchar(500) NULL`,
      );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(
        `ALTER TABLE "notifications" DROP COLUMN "deep_link"`,
      );
    }
  }
  ```

- [ ] **Step 1.3 — Run the migration (requires Docker / local DB)**

  ```bash
  cd backend
  npm run migration:run
  ```

  Expected output: `query: ALTER TABLE "notifications" ADD COLUMN "deep_link" varchar(500) NULL`

- [ ] **Step 1.4 — Commit**

  ```bash
  git add backend/src/notifications/entities/notification.entity.ts \
          backend/database/migrations/1780900000005-AddDeepLinkToNotifications.ts
  git commit -m "feat(backend): add deep_link column to notifications"
  ```

---

## Task 2 — Backend: thread `deep_link` through dispatch to FCM

**Files:**
- Modify: `backend/src/notifications/notification-dispatch.service.ts`

- [ ] **Step 2.1 — Pass `deepLink` to the FCM payload in `sendChannel`**

  In `sendChannel`, change the `case 'push':` branch from:

  ```typescript
  case 'push':
    return this.fcmService.sendToUser(user.id, payload);
  ```

  To:

  ```typescript
  case 'push':
    return this.fcmService.sendToUser(user.id, {
      ...payload,
      data: notification.deepLink
        ? { deep_link: notification.deepLink }
        : undefined,
    });
  ```

  The `sendChannel` method already receives `notification: Notification`, so `notification.deepLink` is available. `FcmService.sendToUser` already accepts `data?: Record<string, string>` and passes it to `admin.messaging().send({ data })` — no changes needed there.

- [ ] **Step 2.2 — Verify TypeScript compiles**

  ```bash
  cd backend && npm run build 2>&1 | grep -E "error|Error" | head -20
  ```

  Expected: no errors.

- [ ] **Step 2.3 — Commit**

  ```bash
  git add backend/src/notifications/notification-dispatch.service.ts
  git commit -m "feat(backend): pass deep_link through FCM data payload"
  ```

---

## Task 3 — Backend: set `deepLink` in each reminder evaluator

**Files:**
- Modify: `backend/src/reminders/evaluators/event-reminder.evaluator.ts`
- Modify: `backend/src/reminders/evaluators/form-report-reminder.evaluator.ts`
- Modify: `backend/src/reminders/evaluators/member-journey-reminder.evaluator.ts`

- [ ] **Step 3.1 — Event evaluator: `paz://agenda/{event.id}`**

  In `event-reminder.evaluator.ts`, change the `this.em.create(Notification, { ... })` call to add `deepLink`:

  ```typescript
  const notification = await this.em.save(
    this.em.create(Notification, {
      title: cfg.title,
      message: event.title,
      category: 'events' as NotificationCategory,
      channels: ['push'],
      segment: { type: 'all' },
      status: 'pending',
      origin: 'automatic',
      deepLink: `paz://agenda/${String(event.id)}`,
    }),
  );
  ```

  > Note: `event.id` is a number — coerce to string because FCM data values must be strings.

- [ ] **Step 3.2 — Form report evaluator: `paz://formularios`**

  In `form-report-reminder.evaluator.ts`, inside `runEntry`, change the `this.em.create(Notification, { ... })` call:

  ```typescript
  const notification = await this.em.save(
    this.em.create(Notification, {
      title: entry.title,
      message: entry.message,
      category: 'forms' as NotificationCategory,
      channels: ['push'],
      segment: { type: 'filtered', filters: { roles: entry.roles } },
      status: 'pending',
      origin: 'automatic',
      deepLink: 'paz://formularios',
    }),
  );
  ```

- [ ] **Step 3.3 — Member journey evaluator: `paz://journey`**

  In `member-journey-reminder.evaluator.ts`, change the `this.em.create(Notification, { ... })` call:

  ```typescript
  const notification = await this.em.save(
    this.em.create(Notification, {
      title: cfg.title,
      message: cfg.message,
      category: 'member_journey' as NotificationCategory,
      channels: ['push'],
      segment: { type: 'filtered', filters: {} },
      status: 'pending',
      origin: 'automatic',
      deepLink: 'paz://journey',
    }),
  );
  ```

- [ ] **Step 3.4 — Verify TypeScript compiles**

  ```bash
  cd backend && npm run build 2>&1 | grep -E "error|Error" | head -20
  ```

  Expected: no errors.

- [ ] **Step 3.5 — Commit**

  ```bash
  git add backend/src/reminders/evaluators/
  git commit -m "feat(backend): set deep_link in reminder evaluators"
  ```

---

## Task 4 — Android: prevent double-navigation on config change

**Files:**
- Modify: `kmp-mobile/android/src/main/kotlin/br/church/paz/android/MainActivity.kt`

**Context:** `MainActivity.onCreate` reads the deep-link Intent extra and passes it to `PazNavGraph`. On configuration changes (rotation), `onCreate` is called again with the same Intent, which causes `PazNavGraph`'s `LaunchedEffect` to re-fire and navigate a second time. Clearing the extra immediately after reading it prevents this.

- [ ] **Step 4.1 — Clear the Intent extra after reading**

  In `MainActivity.kt`, change the `startRoute` block from:

  ```kotlin
  val startRoute =
      intent
          .getStringExtra(PazFirebaseMessagingService.EXTRA_DEEP_LINK)
          ?.let { PushNotificationHelper.parseDeepLink(it) }
  ```

  To:

  ```kotlin
  val startRoute =
      intent
          .getStringExtra(PazFirebaseMessagingService.EXTRA_DEEP_LINK)
          ?.also { intent.removeExtra(PazFirebaseMessagingService.EXTRA_DEEP_LINK) }
          ?.let { PushNotificationHelper.parseDeepLink(it) }
  ```

- [ ] **Step 4.2 — Verify the Android build**

  ```bash
  cd kmp-mobile && ./gradlew :android:assembleDebug 2>&1 | tail -5
  ```

  Expected: `BUILD SUCCESSFUL`

- [ ] **Step 4.3 — Commit**

  ```bash
  git add kmp-mobile/android/src/main/kotlin/br/church/paz/android/MainActivity.kt
  git commit -m "fix(android): clear deep-link Intent extra after reading to prevent double-navigation"
  ```

---

## Task 5 — iOS: create `DeepLinkDestination` typed enum

**Files:**
- Create: `kmp-mobile/ios/PazChurch/Navigation/DeepLinkDestination.swift`

- [ ] **Step 5.1 — Create the file**

  Create `kmp-mobile/ios/PazChurch/Navigation/DeepLinkDestination.swift`:

  ```swift
  import Foundation

  enum DeepLinkDestination: Hashable {
      case agendaDetail(eventId: String)
      case formularios
      case memberJourney
      case account
  }

  extension DeepLinkDestination {
      /// Converts the parsed route string returned by PushNotificationService.parseDeepLink
      /// into a typed destination. Returns nil for unknown or unsupported routes.
      static func from(parsedRoute: String) -> DeepLinkDestination? {
          if parsedRoute.hasPrefix("agenda/") {
              let eventId = String(parsedRoute.dropFirst("agenda/".count))
              return eventId.isEmpty ? nil : .agendaDetail(eventId: eventId)
          }
          switch parsedRoute {
          case "formularios":   return .formularios
          case "journey":       return .memberJourney
          case "account":       return .account
          default:              return nil
          }
      }
  }
  ```

  > Destinations `form/{id}`, `ministry/{id}`, and `lifegroup/{id}` are not yet reachable from automatic reminders — add them here when those reminder types are introduced.

- [ ] **Step 5.2 — Verify the iOS project builds**

  ```bash
  cd kmp-mobile
  xcodebuild -project ios/PazChurch.xcodeproj \
             -scheme PazChurch \
             -destination 'platform=iOS Simulator,name=iPhone 16' \
             build 2>&1 | grep -E "error:|BUILD" | tail -10
  ```

  Expected: `BUILD SUCCEEDED`

- [ ] **Step 5.3 — Commit**

  ```bash
  git add kmp-mobile/ios/PazChurch/Navigation/DeepLinkDestination.swift
  git commit -m "feat(ios): add DeepLinkDestination typed enum for notification routing"
  ```

---

## Task 6 — iOS: expose typed destination + `consumeDeepLink()` on `PushNotificationService`

**Files:**
- Modify: `kmp-mobile/ios/PazChurch/Services/PushNotificationService.swift`

- [ ] **Step 6.1 — Add `deepLinkDestination` computed property and `consumeDeepLink()`**

  In `PushNotificationService`, after the `var pendingDeepLink: String?` declaration, add:

  ```swift
  var deepLinkDestination: DeepLinkDestination? {
      pendingDeepLink.flatMap { DeepLinkDestination.from(parsedRoute: $0) }
  }

  func consumeDeepLink() {
      pendingDeepLink = nil
  }
  ```

  No other changes to the file are needed.

- [ ] **Step 6.2 — Verify the iOS project builds**

  ```bash
  xcodebuild -project ios/PazChurch.xcodeproj \
             -scheme PazChurch \
             -destination 'platform=iOS Simulator,name=iPhone 16' \
             build 2>&1 | grep -E "error:|BUILD" | tail -10
  ```

  Expected: `BUILD SUCCEEDED`

- [ ] **Step 6.3 — Commit**

  ```bash
  git add kmp-mobile/ios/PazChurch/Services/PushNotificationService.swift
  git commit -m "feat(ios): expose deepLinkDestination and consumeDeepLink on PushNotificationService"
  ```

---

## Task 7 — iOS: wire navigation in `MainTabView`

**Files:**
- Modify: `kmp-mobile/ios/PazChurch/Navigation/MainTabView.swift`

**Context:** `MainTabView` already has `@Environment(PushNotificationService.self) private var pushService`. The three tabs are Home (index 0), Academia (index 1), Conta (index 2). Deep links from reminders target: `agendaDetail` (lives inside Home tab's navigation stack), `formularios` (lives inside Conta tab), `memberJourney` (lives inside Conta tab), `account` (Conta tab root).

The approach: `MainTabView` owns a `@State private var selectedTab: Int` to switch tabs, plus a `@State private var agendaPath: [DeepLinkDestination]` passed into the Home tab's `NavigationStack`. On deep link arrival, switch to the right tab and push onto the path if needed.

- [ ] **Step 7.1 — Rewrite `MainTabView` to wire deep-link navigation**

  Replace the entire content of `kmp-mobile/ios/PazChurch/Navigation/MainTabView.swift`:

  ```swift
  import Shared
  import SwiftUI

  struct MainTabView: View {
      @Environment(PushNotificationService.self) private var pushService
      @Environment(AuthenticationCoordinator.self) private var authCoordinator

      @State private var selectedTab = 0
      @State private var agendaPath: [DeepLinkDestination] = []

      var body: some View {
          TabView(selection: $selectedTab) {
              NavigationStack(path: $agendaPath) {
                  HomeView(
                      homeRepository: IosAppContainer.shared.homeRepository,
                      authRepository: IosAppContainer.shared.authRepository
                  )
                  .navigationDestination(for: DeepLinkDestination.self) { destination in
                      deepLinkView(for: destination)
                  }
              }
              .tabItem { Label("Início", systemImage: "house.fill") }
              .tag(0)

              AcademyView(academyRepository: IosAppContainer.shared.academyRepository)
                  .tabItem { Label("Academia", systemImage: "book.fill") }
                  .tag(1)

              AccountView(
                  userRepository: IosAppContainer.shared.userRepository,
                  authRepository: IosAppContainer.shared.authRepository
              )
              .tabItem { Label("Conta", systemImage: "person.fill") }
              .tag(2)
          }
          .tint(PazColors.pazPrimaryLight)
          .onChange(of: pushService.pendingDeepLink) { _, newValue in
              guard newValue != nil,
                    let destination = pushService.deepLinkDestination
              else { return }
              handleDeepLink(destination)
              pushService.consumeDeepLink()
          }
      }

      // MARK: - Deep Link Handling

      private func handleDeepLink(_ destination: DeepLinkDestination) {
          switch destination {
          case .agendaDetail:
              // Switch to Home tab, then push onto the agenda path
              selectedTab = 0
              agendaPath = [destination]

          case .formularios, .memberJourney, .account:
              // All live inside the Conta tab — switch to it
              // AccountView owns its own NavigationStack and will handle
              // further pushes via .navigationDestination once it observes
              // pushService.deepLinkDestination (future enhancement).
              selectedTab = 2
          }
      }

      @ViewBuilder
      private func deepLinkView(for destination: DeepLinkDestination) -> some View {
          switch destination {
          case .agendaDetail(let eventId):
              AgendaDetailView(
                  eventId: eventId,
                  agendaRepository: IosAppContainer.shared.agendaRepository
              )
          default:
              EmptyView()
          }
      }
  }

  #Preview {
      MainTabView()
          .environment(AuthenticationCoordinator(authRepository: IosAppContainer.shared.authRepository))
          .environment(PushNotificationService.shared)
  }
  ```

  > `AgendaDetailView` — verify the exact initializer signature in `Features/Agenda/AgendaDetailView.swift` before compiling. Adjust parameter names if different.

- [ ] **Step 7.2 — Verify the iOS project builds**

  ```bash
  xcodebuild -project ios/PazChurch.xcodeproj \
             -scheme PazChurch \
             -destination 'platform=iOS Simulator,name=iPhone 16' \
             build 2>&1 | grep -E "error:|BUILD" | tail -10
  ```

  Expected: `BUILD SUCCEEDED`. Fix any parameter name mismatches in `deepLinkView`.

- [ ] **Step 7.3 — Commit**

  ```bash
  git add kmp-mobile/ios/PazChurch/Navigation/MainTabView.swift
  git commit -m "feat(ios): wire pendingDeepLink to NavigationStack in MainTabView"
  ```

---

## Task 8 — iOS: handle `formularios` and `memberJourney` inside AccountView

**Context:** `formularios` and `memberJourney` are screens that are reachable from the Conta tab (AccountView). Task 7 switches to the Conta tab, but doesn't push onto AccountView's internal stack yet. This task makes AccountView observe `pendingDeepLink` and push to the correct screen.

**Files:**
- Modify: `kmp-mobile/ios/PazChurch/Features/Account/AccountView.swift`

- [ ] **Step 8.1 — Read AccountView's current structure**

  ```bash
  cat kmp-mobile/ios/PazChurch/Features/Account/AccountView.swift
  ```

  Identify whether `AccountView` already wraps content in a `NavigationStack`. If it does, add a `@State private var path: [DeepLinkDestination] = []` to it and wire `.onChange`. If it does not own a `NavigationStack`, wrap its body content in one.

- [ ] **Step 8.2 — Add deep-link handling to AccountView**

  Add to `AccountView`:

  ```swift
  @Environment(PushNotificationService.self) private var pushService
  @State private var path: [DeepLinkDestination] = []
  ```

  Wrap the existing `body` content in:

  ```swift
  NavigationStack(path: $path) {
      // existing body content
      .navigationDestination(for: DeepLinkDestination.self) { destination in
          switch destination {
          case .formularios:
              FormulariosListView(formsRepository: IosAppContainer.shared.formsRepository)
          case .memberJourney:
              MemberJourneyView(memberJourneyRepository: IosAppContainer.shared.memberJourneyRepository)
          default:
              EmptyView()
          }
      }
  }
  .onChange(of: pushService.pendingDeepLink) { _, newValue in
      guard newValue != nil,
            let destination = pushService.deepLinkDestination
      else { return }
      // Only handle destinations that live inside this tab
      switch destination {
      case .formularios, .memberJourney:
          path = [destination]
          pushService.consumeDeepLink()
      default:
          break
      }
  }
  ```

  > Verify `FormulariosListView` and `MemberJourneyView` initializer signatures from their respective files before compiling.

- [ ] **Step 8.3 — Verify the iOS project builds**

  ```bash
  xcodebuild -project ios/PazChurch.xcodeproj \
             -scheme PazChurch \
             -destination 'platform=iOS Simulator,name=iPhone 16' \
             build 2>&1 | grep -E "error:|BUILD" | tail -10
  ```

  Expected: `BUILD SUCCEEDED`

- [ ] **Step 8.4 — Commit**

  ```bash
  git add kmp-mobile/ios/PazChurch/Features/Account/AccountView.swift
  git commit -m "feat(ios): handle formularios + memberJourney deep links inside AccountView"
  ```

---

## Edge Cases & Risks

| Scenario | Behaviour | Notes |
|---|---|---|
| App killed (cold start) iOS | `handleNotificationTap` fires before views appear; `pendingDeepLink` is set; `onChange` fires when `MainTabView` first renders | Correct — no special handling needed |
| App killed (cold start) Android | `MainActivity.onCreate` reads the Intent extra; `LaunchedEffect` fires once the graph is composed after `SplashScreen` | Works — Splash navigates to Shell first, then `LaunchedEffect` fires |
| Auth not yet complete (Splash visible) iOS | `SplashView` is shown; `MainTabView` not yet in hierarchy; `pendingDeepLink` accumulates; processed when `MainTabView` appears | Correct |
| Double `onChange` after `consumeDeepLink()` | `pendingDeepLink` set to nil triggers `.onChange` again with `newValue == nil`; `guard newValue != nil` exits immediately | No loop |
| Rotation (Android) | `intent.removeExtra(EXTRA_DEEP_LINK)` called on first `onCreate`; subsequent `onCreate` sees nil | Fixed in Task 4 |
| `AgendaDetailView` initializer mismatch | Build will fail with a clear type error | Fix param names in Task 7 step 7.2 |
| `FormulariosListView` / `MemberJourneyView` already inside their own `NavigationStack` | Nested stacks cause double nav bars | Remove inner `NavigationStack` from those views if AccountView now owns one |
| `account` deep link | Task 7 switches to tab 2; AccountView is shown but no push happens | Acceptable for now — landing on the Conta root is the correct destination |

---

## Testing Checklist

After all tasks are done, verify end-to-end with `simctl` (iOS) and `adb` (Android):

**iOS Simulator:**
```bash
# Simulate event reminder notification tap
xcrun simctl push booted br.church.paz.ios - <<'EOF'
{
  "aps": { "alert": { "title": "Não perca este evento!", "body": "Culto de Domingo" } },
  "deep_link": "paz://agenda/42"
}
EOF
```
Expected: app opens to AgendaDetailView for event 42.

```bash
# Simulate form report tap
xcrun simctl push booted br.church.paz.ios - <<'EOF'
{
  "aps": { "alert": { "title": "Relatório pendente", "body": "Envie seu relatório" } },
  "deep_link": "paz://formularios"
}
EOF
```
Expected: app switches to Conta tab and opens FormulariosListView.

**Android (adb):**
```bash
adb shell am start \
  -W -a android.intent.action.VIEW \
  -d "paz://agenda/42" \
  br.church.paz.android
```
Expected: app opens AgendaDetailScreen for event 42.

```bash
adb shell am start \
  -W -a android.intent.action.VIEW \
  -d "paz://journey" \
  br.church.paz.android
```
Expected: app opens MemberJourneyScreen.
