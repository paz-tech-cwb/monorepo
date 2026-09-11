# CLAUDE.md — kmp-mobile

Kotlin Multiplatform mobile app for Paz Church (Android + iOS).

## Module map

| Module | Plugin | Purpose |
|--------|--------|---------|
| `:shared` | `kotlin("multiplatform")` | Domain models, repositories, Ktor client, auth, DI (Koin) |
| `:android` | `com.android.application` | Jetpack Compose UI, ViewModels, Navigation |
| `ios/` | Xcode project | SwiftUI UI consuming `:shared` XCFramework |
| `build-logic/` | `kotlin-dsl` included build | Convention plugins |

## Commands

```bash
# Android
./gradlew :android:assembleDebug          # build APK
./gradlew :android:installDebug           # install on connected device
./gradlew :android:testDebugUnitTest      # unit tests

# Shared
./gradlew :shared:allTests                # all KMP tests
./gradlew :shared:assembleXCFramework     # build iOS XCFramework

# All
./gradlew build                           # compile everything
./gradlew allTests                        # all tests
```

## Architecture

```
:shared (KMP)
  commonMain/  ← domain models, repository interfaces, Ktor client, Koin modules
  androidMain/ ← DataStore implementations (expect/actual)
  iosMain/     ← NSUserDefaults / Keychain implementations (expect/actual)

:android
  ui/theme/    ← PazTheme, PazColors, PazGradients, PazTypography
  ui/components/ ← design system composables
  ui/features/ ← one package per screen
  navigation/  ← Screen sealed class, PazNavGraph, AppShell
  di/          ← androidModule (Koin)
```

## Coding guidelines

**Full rules:** `docs/CODING_GUIDELINES.md` — read before any code change.

Quick summary:
- **iOS ViewModels:** `@Observable @MainActor` only — never `ObservableObject`/`@Published`
- **iOS async:** `.task {}` modifier on views, not `onAppear + Task { }`. Cancel stored Tasks in `deinit`.
- **Android coroutines:** `viewModelScope.launch` only. `collectAsStateWithLifecycle()` everywhere.
- **Fonts:** SF Pro system font (iOS), DM Sans (Android). No custom display fonts.
- **Colors:** `PazColors.*` tokens only — no raw hex in screen/component files.
- **Screen states:** every screen must implement loading, error, empty, loggedIn, loggedOut, dark, light.
- **Format before commit:** `swiftformat + swiftlint --fix` (iOS) · `./gradlew ktlintFormat` (Android)
- **Skills:** `swiftui-expert-skill` + `swift-concurrency` for iOS · `kotlin-project-feature-implementation` for Android

## Key conventions

- **No business logic in Composables or ViewModels** — use cases / repositories live in `:shared`
- **snake_case JSON on the wire** — backend API contract; `@SerialName` on every DTO field
- **`expect`/`actual` only for platform I/O** — token storage, file system, platform info
- **Koin for DI** — `sharedModules` wired in `PazApplication`, feature ViewModels via `koinViewModel()`
- **UDF** — `UiState` data class + `UiEffect` sealed class per screen; `StateFlow` + `Channel`
- **No `Modifier.clickable` on non-interactive containers** — use `Button` or `Surface(onClick=)`

## Environments (staging vs production)

Both platforms switch environment automatically based on the standard build variant — there is no separate flag to remember:

| | **Debug** (staging) | **Release** (production) |
|---|---|---|
| Backend | local (`http://localhost:3001/api` iOS Simulator · `http://10.0.2.2:3001/api` Android emulator) | VPS (`http://znzcybe6t18zwapiy9hytma5.62.238.45.195.sslip.io/api`) |
| Firebase project | `paz-church-curitiba-staging` | prod project |
| iOS bundle ID | `com.cwb.pazchurch.app.dev` | `com.cwb.pazchurch.app` |
| Android applicationId | `com.cwb.pazchurch.app.dev` (`applicationIdSuffix = ".dev"`) | `com.cwb.pazchurch.app` |

**To run staging locally:** just build/run the Debug configuration (iOS) or `assembleDebug`/`installDebug` (Android) — nothing else to configure beyond having the local backend running (`backend/`, port 3001) and the staging Firebase config files in place locally (gitignored, not committed — see below).

iOS Simulator reaches the backend via `localhost` since it shares the host Mac's network stack — no IP to keep in sync. Android's emulator alias `10.0.2.2` similarly always points back to the host. **Physical-device testing is the one case that needs a real LAN address** — override `IosAppContainer.shared.baseUrl` / Android's `BASE_URL` locally with your Mac's current LAN IP or `<hostname>.local` for that session; don't hardcode it, since DHCP-assigned IPs change across networks.

**Local Firebase config files** (`ios/PazChurch/GoogleService-Info.plist`, `android/google-services.json`) are gitignored and must be downloaded per-developer from the Firebase Console:
- For local/staging dev: download from the **`paz-church-curitiba-staging`** project, registered under bundle/package `com.cwb.pazchurch.app.dev`
- Production builds get the prod files injected by CI from GitHub secrets (`ANDROID_GOOGLE_SERVICES_JSON`, `GOOGLE_SERVICE_INFO_PLIST`) — see `.github/workflows/deploy-kmp-mobile.yml`

`GoogleSignInHelper` (iOS) reads its Google `clientID` from whatever `GoogleService-Info.plist` is bundled at build time (via `FirebaseApp.app()?.options.clientID`), so it never needs to be hardcoded or kept in sync manually — it's automatically correct for whichever environment you built.

## Design system

Colors, typography, shapes: `android/src/main/kotlin/br/church/paz/android/ui/theme/`
Design reference HTML files: `~/Downloads/design_handoff_paz_church/*.html` (open in browser, use Tweaks panel bottom-right for dark/light/state variants)
Full spec: `docs/superpowers/plans/2026-05-31-flutter-to-kmp-migration.md` §3–§4

## Environment

### android/local.properties (not committed — copy from local.properties.example)
```
sdk.dir=/Users/<you>/Library/Android/sdk
```

### android/google-services.json (not committed — copy from google-services.json.example)
Download from Firebase Console → Project Settings → Android app.

### iOS GoogleService-Info.plist (not committed)
Download from Firebase Console → Project Settings → iOS app. Place at `ios/PazChurch/`.

## GitHub Actions secrets

This repo needs no secrets — CI only runs Gradle and xcodebuild.
`ANTHROPIC_API_KEY` lives in the root `church` monorepo (for the Claude PR workflows there).
