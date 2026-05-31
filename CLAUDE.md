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

## Key conventions

- **No business logic in Composables or ViewModels** — use cases / repositories live in `:shared`
- **snake_case JSON on the wire** — backend API contract; `@SerialName` on every DTO field
- **`expect`/`actual` only for platform I/O** — token storage, file system, platform info
- **Koin for DI** — `sharedModules` wired in `PazApplication`, feature ViewModels via `koinViewModel()`
- **UDF** — `UiState` data class + `UiEffect` sealed class per screen; `StateFlow` + `Channel`
- **No `Modifier.clickable` on non-interactive containers** — use `Button` or `Surface(onClick=)`

## Design system

Colors, typography, shapes: `android/src/main/kotlin/br/church/paz/android/ui/theme/`
Design reference: `docs/superpowers/design-preview/index.html` (run `python3 -m http.server 7654` from that dir)
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
