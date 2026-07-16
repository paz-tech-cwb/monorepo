# Flutter → KMP Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. For feature implementation tasks, also invoke `kotlin-project-feature-implementation`. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the Paz Church Flutter app to a Kotlin Multiplatform + Jetpack Compose (Android) + SwiftUI (iOS) native architecture, preserving continuous delivery and zero big-bang rewrites.

**Architecture:** KMP `:shared` module owns domain/networking/auth/business logic; `:android` uses Jetpack Compose + Hilt for the UI layer; `:ios` consumes the KMP XCFramework from SwiftUI. Each platform delivers a genuinely native experience — no shared UI.

**Tech Stack:** Kotlin 2.x, KMP, Ktor Client, kotlinx.serialization, DataStore Multiplatform, Koin Multiplatform, Jetpack Compose, SwiftUI, Firebase KMP (BoM), Coil 3 (Android), SDWebImage (iOS), Kotlin Coroutines + Flow, Turbine (testing).

---

## Executive Summary

The Paz Church mobile app is a moderately complex Flutter application (≈ 13 features, 30+ screens, ≈ 9 form types) built with GetX for state management and Dio for networking. It serves authenticated members and leaders of a Brazilian church network.

**Why migrate?**
- Flutter's widget toolkit emulates native controls rather than using them. Church members notice the difference on iOS.
- GetX conflates routing, DI, state, and storage into one opinionated package — hard to test and reason about at scale.
- Long-term hiring is easier for Android/Kotlin and iOS/Swift specialists than Flutter generalists.
- The backend uses snake_case JSON (documented in CLAUDE.md); current Flutter code has no transformation layer, making it fragile to schema evolution.

**Expected outcomes:**
- Pixel-perfect native UX on both platforms
- Shared auth, networking, domain models, and business rules via KMP (≈ 40-50 % of logic shared)
- Feature-level migration — Flutter and native can coexist during transition
- CI/CD parity from day one (GitHub Actions)

---

## 1. Current State Analysis

### 1.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Flutter App (paz_app)                         │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │  GetX    │  │  GetX    │  │  GetX    │   ← State + DI +     │
│  │Controller│  │Controller│  │Controller│     Navigation        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                      │
│       │              │              │                            │
│  ┌────▼──────────────▼──────────────▼─────┐                     │
│  │            NetworkService (Dio)         │                     │
│  │     + AuthInterceptor (JWT refresh)    │                     │
│  └────────────────────┬────────────────────┘                    │
│                        │                                         │
│  ┌─────────────────────▼──────────────────┐                     │
│  │  TokenStorage (flutter_secure_storage) │                     │
│  │  UserStorage  (get_storage)            │                     │
│  └────────────────────────────────────────┘                     │
│                                                                  │
│  Firebase: Auth · Messaging · RemoteConfig                       │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Feature Inventory

| Feature | Screens | Complexity | Leader-only | Notes |
|---------|---------|-----------|------------|-------|
| Splash | 1 | Low | No | Bootstrap + route guard |
| Login | 1 | Medium | No | Google + Apple OAuth via Firebase |
| Home | 1 | High | No | Carousel, Agenda widget, Contribution widget |
| Academy | 1 | Medium | No | YouTube video list |
| Account | 1 | Medium | No | Profile card, menu sections, dark mode |
| Edit Profile | 1 | Low | No | Name + photo update |
| Notification Preferences | 1 | Low | No | Granular push toggles |
| Member Journey | 1 | Medium | No | Spiritual journey tracker |
| Meeting Report | 1 | Medium | Yes | Life-group meeting form |
| Ministries | 1 | Low | No | Browse ministry list |
| Formulários | 9 | High | Yes | 9 distinct form types (see §1.3) |
| Agenda | 1 | Medium | No | Church event calendar |
| Markdown viewer | 1 | Low | No | Generic content renderer |

**Total: 13 features, ≈ 21 screens**

### 1.3 Formulários Sub-types

1. Member registrations
2. Conversions
3. Life group reports
4. Sector supervisor reports
5. Area supervisor reports
6. Multiplications
7. Service reports
8. Guests
9. Courses

### 1.4 Dependency Mapping

| Flutter | KMP / Native equivalent |
|---------|------------------------|
| `dio` | Ktor Client (`ktor-client-cio` Android, `ktor-client-darwin` iOS) |
| `firebase_auth` + `google_sign_in` + `sign_in_with_apple` | Firebase Auth KMP (platform SDKs wrapped) |
| `firebase_messaging` | Firebase Messaging (platform SDKs) |
| `firebase_remote_config` | Firebase Remote Config (platform SDKs) |
| `get_storage` | DataStore Preferences Multiplatform |
| `flutter_secure_storage` | DataStore Encrypted (Android Keystore / iOS Keychain via expect/actual) |
| `get` (GetX) | Koin (DI) + Compose Navigation (routing) + `ViewModel` (state) |
| `cached_network_image` | Coil 3 (Android), SDWebImage/Kingfisher (iOS) |
| `video_player` | ExoPlayer / Media3 (Android), AVPlayer via SwiftUI (iOS) |
| `flutter_svg` | `androidx.compose.ui:ui-graphics` SVG (Android), SwiftUI `Image` (iOS) |
| `markdown_widget` | Markwon (Android), custom SwiftUI parser (iOS) |
| `equatable` | Kotlin `data class` (structural equality built-in) |
| `intl` | `kotlinx-datetime` + `java.time` (Android) / Foundation (iOS) |
| `url_launcher` | `Intent` (Android) / `UIApplication.open` (iOS) |
| `logger` | Timber (Android) / OSLog (iOS) |

---

## 2. Target Architecture

### 2.1 High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        :shared (KMP)                                │
│                                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────────┐  │
│  │   domain/   │  │    data/     │  │         di/               │  │
│  │  models     │  │  repositories│  │   (Koin modules)          │  │
│  │  use cases  │  │  Ktor client │  │                           │  │
│  │  repo ifaces│  │  auth logic  │  │                           │  │
│  │  validation │  │  DataStore   │  │                           │  │
│  └─────────────┘  └──────────────┘  └───────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │  KMP Framework / XCFramework
               ┌───────────────┴────────────────┐
               │                                 │
┌──────────────▼──────────────┐  ┌───────────────▼────────────────┐
│       :android               │  │           :ios (Swift)          │
│                              │  │                                  │
│  Jetpack Compose UI          │  │  SwiftUI views                  │
│  ViewModels (Compose)        │  │  @Observable ViewModels         │
│  Compose Navigation          │  │  NavigationStack                │
│  Hilt (Android DI entry pt)  │  │  KMP shared logic consumed      │
│  Coil 3 / ExoPlayer          │  │  Firebase native SDKs           │
│  Firebase native SDKs        │  │  AVPlayer / SDWebImage          │
└──────────────────────────────┘  └──────────────────────────────────┘
```

### 2.2 Module Structure

```
paz-church/
├── build-logic/                        ← Convention plugins (included build)
│   └── src/main/kotlin/
│       ├── KmpLibraryConventionPlugin.kt
│       ├── AndroidLibraryConventionPlugin.kt
│       └── AndroidApplicationConventionPlugin.kt
│
├── shared/                             ← :shared KMP module
│   ├── build.gradle.kts
│   └── src/
│       ├── commonMain/kotlin/br/church/paz/shared/
│       │   ├── domain/
│       │   │   ├── model/              ← User, HomeContent, AcademyVideo, …
│       │   │   ├── repository/         ← interfaces only
│       │   │   └── usecase/
│       │   ├── data/
│       │   │   ├── remote/             ← Ktor client, DTOs, mappers
│       │   │   ├── local/              ← DataStore wrappers
│       │   │   └── repository/         ← implementations
│       │   ├── auth/                   ← token storage, refresh logic
│       │   ├── forms/                  ← form catalog models + submission logic
│       │   ├── di/                     ← Koin modules (sharedModule)
│       │   └── util/                   ← DateFormatter, extensions
│       ├── androidMain/kotlin/…        ← expect/actual (Keystore, platform I/O)
│       └── iosMain/kotlin/…            ← expect/actual (Keychain, platform I/O)
│
├── android/                            ← :android application module
│   ├── build.gradle.kts
│   └── src/main/
│       ├── AndroidManifest.xml
│       └── kotlin/br/church/paz/android/
│           ├── MainActivity.kt
│           ├── PazApplication.kt
│           ├── navigation/             ← NavGraph, Screen sealed class
│           ├── ui/
│           │   ├── theme/              ← PazTheme, PazColors, PazTypography, …
│           │   ├── components/         ← design system composables
│           │   └── features/           ← one sub-package per feature
│           └── di/                     ← Hilt modules bridging to Koin shared
│
└── ios/                                ← Xcode project
    └── PazChurch/
        ├── PazChurchApp.swift
        ├── Navigation/
        ├── Theme/                      ← SwiftUI design tokens
        ├── Components/                 ← reusable SwiftUI components
        └── Features/                   ← one folder per feature
```

### 2.3 Shared vs Native Boundary

| Concern | Layer | Rationale |
|---------|-------|-----------|
| Domain models (User, HomeContent, etc.) | KMP shared | Same data on both platforms |
| Repository interfaces | KMP shared | Contract, not implementation |
| Repository implementations | KMP shared | Ktor + DataStore run on both |
| Ktor HTTP client | KMP shared | Same API, different engine per platform via expect/actual |
| Auth logic (token refresh, JWT parsing) | KMP shared | Security-critical, must not diverge |
| Token storage | KMP shared (expect/actual) | Android Keystore / iOS Keychain behind common interface |
| Firebase Auth trigger | Platform-native | Different SDKs; KMP wraps the result only |
| Push notification registration | Platform-native | FCM (Android) / APNs (iOS) |
| Remote config | Platform-native | Firebase platform SDKs |
| All UI | Platform-native | Non-negotiable — see §6 |
| Navigation | Platform-native | Compose Navigation / SwiftUI NavigationStack |
| Video playback | Platform-native | ExoPlayer vs AVPlayer |
| Deep links | Platform-native | See `kotlin-platform-app-links-and-deep-links` skill |

---

## 3. Design System Specification

All Kotlin files belong in `:android/src/main/kotlin/br/church/paz/android/ui/theme/`.

### 3.1 Color Tokens

**File:** `PazColors.kt`

```kotlin
package br.church.paz.android.ui.theme

import androidx.compose.ui.graphics.Color

object PazColors {
    // ── Brand ────────────────────────────────────────────────────────────────
    val PrimaryBlue     = Color(0xFF043A6F)
    val SecondaryBlue   = Color(0xFF6784AE)
    val Cultured        = Color(0xFFBCC1CD)

    // ── Light palette ─────────────────────────────────────────────────────
    val Surface         = Color(0xFFFFFFFF)
    val Background      = Color(0xFFF5F5F7)
    val OnSurface       = Color(0xFF1A1A2E)
    val Border          = Color(0xFFEAEEF5)
    val PrimaryTint     = Color(0xFFE8F0FB)
    val PrimaryContainer      = Color(0xFFDEE6F4)
    val SecondaryContainer    = Color(0xFFE6ECF7)
    val Success         = Color(0xFF2E7D32)
    val Error           = Color(0xFFD32F2F)
    val ErrorTint       = Color(0xFFFFEAEA)

    // ── Dark palette ──────────────────────────────────────────────────────
    val DarkBackground        = Color(0xFF0F1115)
    val DarkSurface           = Color(0xFF171A21)
    val DarkOnBackground      = Color(0xFFEAEFF7)
    val DarkOnSurface         = Color(0xFFD6DEE9)
    val DarkDivider           = Color(0xFF2A2F38)
    val DarkIcon              = Color(0xFFE6ECF3)
    val DarkIconMuted         = Color(0xFFB9C4D1)
    val DarkPrimaryContainer  = Color(0xFF0C274A)
    val DarkSecondaryContainer= Color(0xFF263447)
    val DarkError             = Color(0xFFFF4D4F)
}
```

**File:** `PazColorScheme.kt`

```kotlin
package br.church.paz.android.ui.theme

import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme

val PazLightColorScheme = lightColorScheme(
    primary             = PazColors.PrimaryBlue,
    onPrimary           = PazColors.Surface,
    primaryContainer    = PazColors.PrimaryContainer,
    onPrimaryContainer  = PazColors.PrimaryBlue,
    secondary           = PazColors.SecondaryBlue,
    onSecondary         = PazColors.Surface,
    secondaryContainer  = PazColors.SecondaryContainer,
    onSecondaryContainer= PazColors.SecondaryBlue,
    tertiary            = PazColors.Cultured,
    onTertiary          = PazColors.OnSurface,
    background          = PazColors.Background,
    onBackground        = PazColors.OnSurface,
    surface             = PazColors.Surface,
    onSurface           = PazColors.OnSurface,
    surfaceVariant      = PazColors.PrimaryTint,
    onSurfaceVariant    = PazColors.SecondaryBlue,
    outline             = PazColors.Border,
    error               = PazColors.Error,
    onError             = PazColors.Surface,
    errorContainer      = PazColors.ErrorTint,
    onErrorContainer    = PazColors.Error,
    scrim               = Color(0x99000000),
)

val PazDarkColorScheme = darkColorScheme(
    primary             = PazColors.PrimaryBlue,
    onPrimary           = PazColors.Surface,
    primaryContainer    = PazColors.DarkPrimaryContainer,
    onPrimaryContainer  = PazColors.Surface,
    secondary           = PazColors.SecondaryBlue,
    onSecondary         = PazColors.Surface,
    secondaryContainer  = PazColors.DarkSecondaryContainer,
    onSecondaryContainer= PazColors.Surface,
    tertiary            = PazColors.DarkIcon,
    onTertiary          = PazColors.DarkOnSurface,
    background          = PazColors.DarkBackground,
    onBackground        = PazColors.DarkOnBackground,
    surface             = PazColors.DarkSurface,
    onSurface           = PazColors.DarkOnSurface,
    surfaceVariant      = PazColors.DarkSurface,
    onSurfaceVariant    = PazColors.DarkOnSurface,
    outline             = PazColors.DarkDivider,
    error               = PazColors.DarkError,
    onError             = PazColors.DarkBackground,
    errorContainer      = Color(0xFF4D1212),
    onErrorContainer    = PazColors.DarkError,
    scrim               = Color(0xFF000000),
)
```

### 3.2 Typography

**File:** `PazTypography.kt`

```kotlin
package br.church.paz.android.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

val PazTypography = Typography(
    displayLarge = TextStyle(
        fontSize = 32.sp,
        fontWeight = FontWeight.Bold,
        lineHeight = 40.sp,
    ),
    headlineMedium = TextStyle(
        fontSize = 24.sp,
        fontWeight = FontWeight.Bold,
        lineHeight = 32.sp,
    ),
    titleLarge = TextStyle(
        fontSize = 18.sp,
        fontWeight = FontWeight.Bold,
        lineHeight = 24.sp,
    ),
    titleMedium = TextStyle(
        fontSize = 16.sp,
        fontWeight = FontWeight.SemiBold,
        lineHeight = 22.sp,
    ),
    bodyLarge = TextStyle(
        fontSize = 15.sp,
        fontWeight = FontWeight.Normal,
        lineHeight = 22.sp,
    ),
    bodyMedium = TextStyle(
        fontSize = 14.sp,
        fontWeight = FontWeight.Normal,
        lineHeight = 20.sp,
    ),
    bodySmall = TextStyle(
        fontSize = 13.sp,
        fontWeight = FontWeight.Normal,
        lineHeight = 18.sp,
    ),
    labelSmall = TextStyle(
        fontSize = 11.sp,
        fontWeight = FontWeight.Bold,
        lineHeight = 16.sp,
        letterSpacing = 1.0.sp,
    ),
)
```

### 3.3 Spacing & Shape

**File:** `PazSpacing.kt`

```kotlin
package br.church.paz.android.ui.theme

import androidx.compose.ui.unit.dp

object PazSpacing {
    val Xs    = 4.dp
    val Sm    = 8.dp
    val Md    = 12.dp
    val Lg    = 16.dp
    val Xl    = 24.dp
    val Xxl   = 32.dp
    val Xxxl  = 48.dp

    val PageHorizontal = Lg
    val CardGap        = Md
}
```

**File:** `PazShapes.kt`

```kotlin
package br.church.paz.android.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

val PazShapes = Shapes(
    extraSmall = RoundedCornerShape(4.dp),
    small      = RoundedCornerShape(8.dp),
    medium     = RoundedCornerShape(12.dp),
    large      = RoundedCornerShape(16.dp),
    extraLarge = RoundedCornerShape(24.dp),
)

val PazShapeXxl  = RoundedCornerShape(32.dp)
val PazShapePill = RoundedCornerShape(100.dp)
```

### 3.4 Elevation

**File:** `PazElevation.kt`

```kotlin
package br.church.paz.android.ui.theme

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

data class PazShadow(val elevation: Dp, val spotColor: Color, val ambientColor: Color)

object PazElevation {
    val Low = PazShadow(
        elevation    = 2.dp,
        spotColor    = Color(0x0F000000),
        ambientColor = Color(0x08000000),
    )
    val Medium = PazShadow(
        elevation    = 6.dp,
        spotColor    = Color(0x14000000),
        ambientColor = Color(0x0A000000),
    )
    val High = PazShadow(
        elevation    = 12.dp,
        spotColor    = Color(0x1F000000),
        ambientColor = Color(0x0D000000),
    )
    val Floating = PazShadow(
        elevation    = 20.dp,
        spotColor    = Color(0x29000000),
        ambientColor = Color(0x14000000),
    )
}
```

### 3.5 Theme Entry Point

**File:** `PazTheme.kt`

```kotlin
package br.church.paz.android.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf

// Exposes dark-mode flag to any composable without threading it manually.
val LocalPazDarkTheme = staticCompositionLocalOf { false }

@Composable
fun PazTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    CompositionLocalProvider(LocalPazDarkTheme provides darkTheme) {
        MaterialTheme(
            colorScheme = if (darkTheme) PazDarkColorScheme else PazLightColorScheme,
            typography  = PazTypography,
            shapes      = PazShapes,
            content     = content,
        )
    }
}
```

### 3.5b Dark-Mode Preview Annotation

Compose Previews only show one theme by default. Add a multipreview annotation so every component gets both modes for free.

**File:** `PazPreviews.kt`

```kotlin
package br.church.paz.android.ui.theme

import androidx.compose.ui.tooling.preview.Preview

@Preview(name = "Light", showBackground = true)
@Preview(name = "Dark",  showBackground = true, uiMode = android.content.res.Configuration.UI_MODE_NIGHT_YES)
annotation class PazPreview
```

Usage in any component file:

```kotlin
@PazPreview
@Composable
private fun PazButtonPreview() {
    PazTheme {
        PazButton(text = "Entrar com Google", onClick = {})
    }
}
```

### 3.5c iOS Dark Mode Tokens

**File:** `ios/PazChurch/Theme/PazColors.swift`

```swift
import SwiftUI

// Adaptive colors automatically switch between light and dark mode.
extension Color {
    // ── Brand ────────────────────────────────────────────────────────────────
    static let pazPrimary      = Color(light: Color(hex: "043A6F"), dark: Color(hex: "043A6F"))
    static let pazSecondary    = Color(light: Color(hex: "6784AE"), dark: Color(hex: "6784AE"))

    // ── Backgrounds ───────────────────────────────────────────────────────
    static let pazBackground   = Color(light: Color(hex: "F5F5F7"), dark: Color(hex: "0F1115"))
    static let pazSurface      = Color(light: .white,               dark: Color(hex: "171A21"))

    // ── Text ──────────────────────────────────────────────────────────────
    static let pazOnSurface    = Color(light: Color(hex: "1A1A2E"), dark: Color(hex: "D6DEE9"))
    static let pazOnBackground = Color(light: Color(hex: "1A1A2E"), dark: Color(hex: "EAEFF7"))

    // ── Supporting ────────────────────────────────────────────────────────
    static let pazBorder       = Color(light: Color(hex: "EAEEF5"), dark: Color(hex: "2A2F38"))
    static let pazPrimaryTint  = Color(light: Color(hex: "E8F0FB"), dark: Color(hex: "0C274A"))
    static let pazMuted        = Color(light: Color(hex: "BCC1CD"), dark: Color(hex: "B9C4D1"))
    static let pazError        = Color(light: Color(hex: "D32F2F"), dark: Color(hex: "FF4D4F"))
    static let pazErrorTint    = Color(light: Color(hex: "FFEEEA"), dark: Color(hex: "4D1212"))
    static let pazSuccess      = Color(light: Color(hex: "2E7D32"), dark: Color(hex: "4CAF50"))

    // ── Private initializer ───────────────────────────────────────────────
    private init(light: Color, dark: Color) {
        self.init(UIColor { traitCollection in
            traitCollection.userInterfaceStyle == .dark
                ? UIColor(dark)
                : UIColor(light)
        })
    }
}

// Hex convenience initializer
extension Color {
    init(hex: String) {
        let scanner = Scanner(string: hex)
        var rgb: UInt64 = 0
        scanner.scanHexInt64(&rgb)
        self.init(
            red:   Double((rgb >> 16) & 0xFF) / 255.0,
            green: Double((rgb >>  8) & 0xFF) / 255.0,
            blue:  Double( rgb        & 0xFF) / 255.0
        )
    }
}
```

**File:** `ios/PazChurch/Theme/PazTheme.swift`

```swift
import SwiftUI

// Apply to the root view. Propagates paz colors and dark-mode-aware background.
struct PazThemeModifier: ViewModifier {
    @Environment(\.colorScheme) private var colorScheme

    func body(content: Content) -> some View {
        content
            .background(Color.pazBackground.ignoresSafeArea())
            .tint(Color.pazPrimary)
            .preferredColorScheme(nil)          // respects system setting
    }
}

extension View {
    func pazTheme() -> some View {
        modifier(PazThemeModifier())
    }
}
```

Usage at app root:

```swift
// PazChurchApp.swift
@main
struct PazChurchApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
                .pazTheme()
        }
    }
}
```

### 3.6 Component Specifications

All components live in `:android/src/main/kotlin/br/church/paz/android/ui/components/`.

---

#### PazButton

**File:** `PazButton.kt`

```kotlin
package br.church.paz.android.ui.components

import androidx.compose.foundation.layout.size
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import br.church.paz.android.ui.theme.PazShapePill

enum class PazButtonVariant { Primary, Secondary, Destructive, Ghost }

@Composable
fun PazButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: PazButtonVariant = PazButtonVariant.Primary,
    enabled: Boolean = true,
    loading: Boolean = false,
) {
    val colors = when (variant) {
        PazButtonVariant.Primary -> ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.primary,
            contentColor   = MaterialTheme.colorScheme.onPrimary,
        )
        PazButtonVariant.Secondary -> ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.secondaryContainer,
            contentColor   = MaterialTheme.colorScheme.secondary,
        )
        PazButtonVariant.Destructive -> ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.errorContainer,
            contentColor   = MaterialTheme.colorScheme.error,
        )
        PazButtonVariant.Ghost -> ButtonDefaults.buttonColors(
            containerColor = androidx.compose.ui.graphics.Color.Transparent,
            contentColor   = MaterialTheme.colorScheme.primary,
        )
    }

    Button(
        onClick   = { if (!loading) onClick() },
        modifier  = modifier,
        enabled   = enabled && !loading,
        shape     = PazShapePill,
        colors    = colors,
    ) {
        if (loading) {
            CircularProgressIndicator(
                modifier = Modifier.size(18.dp),
                color    = MaterialTheme.colorScheme.onPrimary,
                strokeWidth = 2.dp,
            )
        } else {
            Text(text = text, style = MaterialTheme.typography.titleMedium)
        }
    }
}
```

**iOS SwiftUI equivalent:** A `PazButton` SwiftUI `View` accepting `title: String`, `variant: PazButtonStyle` enum, `isLoading: Bool`, and `action: () -> Void`. Uses native `Button` with a `.buttonStyle()` modifier backed by a custom `ButtonStyle` that applies the matching color tokens from a Swift `PazColors` struct. Pill shape via `.clipShape(Capsule())`.

---

#### PazCard

**File:** `PazCard.kt`

```kotlin
package br.church.paz.android.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import br.church.paz.android.ui.theme.PazShapes

enum class PazCardVariant { Default, Elevated, Outlined }

@Composable
fun PazCard(
    modifier: Modifier = Modifier,
    variant: PazCardVariant = PazCardVariant.Default,
    content: @Composable ColumnScope.() -> Unit,
) {
    when (variant) {
        PazCardVariant.Default -> Card(
            modifier = modifier,
            shape    = PazShapes.large,
            colors   = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
            content  = content,
        )
        PazCardVariant.Elevated -> ElevatedCard(
            modifier  = modifier,
            shape     = PazShapes.large,
            elevation = CardDefaults.elevatedCardElevation(defaultElevation = 6.dp),
            content   = content,
        )
        PazCardVariant.Outlined -> OutlinedCard(
            modifier = modifier,
            shape    = PazShapes.large,
            border   = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
            content  = content,
        )
    }
}
```

**iOS:** SwiftUI `PazCard` view modifier / container using `.background(Color.pazSurface).cornerRadius(16).shadow(radius:)` or a custom `ViewModifier` with `.outlined` variant using `.overlay(RoundedRectangle(cornerRadius: 16).stroke(...))`.

---

#### PazTopBar

**File:** `PazTopBar.kt`

```kotlin
package br.church.paz.android.ui.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PazTopBar(
    title: String,
    modifier: Modifier = Modifier,
    onBack: (() -> Unit)? = null,
    actions: @Composable () -> Unit = {},
    scrollBehavior: TopAppBarScrollBehavior? = null,
) {
    LargeTopAppBar(
        title          = { Text(title, style = MaterialTheme.typography.titleLarge) },
        modifier       = modifier,
        navigationIcon = {
            if (onBack != null) {
                IconButton(onClick = onBack) {
                    Icon(
                        imageVector        = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Voltar",
                    )
                }
            }
        },
        actions        = { actions() },
        scrollBehavior = scrollBehavior,
        colors         = TopAppBarDefaults.largeTopAppBarColors(
            containerColor             = MaterialTheme.colorScheme.background,
            scrolledContainerColor     = MaterialTheme.colorScheme.surface,
            titleContentColor          = MaterialTheme.colorScheme.onSurface,
            navigationIconContentColor = MaterialTheme.colorScheme.onSurface,
        ),
    )
}
```

**iOS:** SwiftUI `NavigationBarModifier` using `.navigationTitle(title)` and `.navigationBarTitleDisplayMode(.large)`. Back button is native iOS chevron — do not override.

---

#### PazBottomNavBar

**File:** `PazBottomNavBar.kt`

```kotlin
package br.church.paz.android.ui.components

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import br.church.paz.android.ui.theme.PazShapePill
import br.church.paz.android.ui.theme.PazSpacing

data class PazNavItem(val icon: ImageVector, val label: String)

@Composable
fun PazBottomNavBar(
    items: List<PazNavItem>,
    selectedIndex: Int,
    onItemSelected: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    NavigationBar(
        modifier         = modifier,
        containerColor   = MaterialTheme.colorScheme.surface.copy(alpha = 0.92f),
        contentColor     = MaterialTheme.colorScheme.onSurface,
        tonalElevation   = 0.dp,
    ) {
        items.forEachIndexed { index, item ->
            val selected = index == selectedIndex
            NavigationBarItem(
                selected    = selected,
                onClick     = { onItemSelected(index) },
                icon        = {
                    AnimatedContent(
                        targetState = selected,
                        transitionSpec = { fadeIn() togetherWith fadeOut() },
                        label = "nav_item_$index",
                    ) { isSelected ->
                        if (isSelected) {
                            Row(
                                modifier = Modifier
                                    .clip(PazShapePill)
                                    .background(MaterialTheme.colorScheme.primary)
                                    .padding(horizontal = PazSpacing.Md, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Icon(
                                    imageVector        = item.icon,
                                    contentDescription = item.label,
                                    tint               = MaterialTheme.colorScheme.onPrimary,
                                    modifier           = Modifier.size(20.dp),
                                )
                                Spacer(Modifier.width(6.dp))
                                Text(
                                    text  = item.label,
                                    style = MaterialTheme.typography.labelSmall.copy(
                                        color = MaterialTheme.colorScheme.onPrimary,
                                    ),
                                )
                            }
                        } else {
                            Icon(
                                imageVector        = item.icon,
                                contentDescription = item.label,
                                modifier           = Modifier.size(20.dp),
                                tint               = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
                            )
                        }
                    }
                },
                label       = null,
                colors      = NavigationBarItemDefaults.colors(
                    indicatorColor = androidx.compose.ui.graphics.Color.Transparent,
                ),
            )
        }
    }
}
```

**iOS:** SwiftUI `TabView` with `.tabItem { Label(...) }`. Selected tab accent via `.tint(Color.pazPrimary)`. Pill animation not natively replicable in `TabView` — use a custom `HStack` overlay bottom bar instead of `TabView` if the animated pill is required on iOS.

---

#### PazMenuRow

**File:** `PazMenuRow.kt`

```kotlin
package br.church.paz.android.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import br.church.paz.android.ui.theme.PazSpacing

@Composable
fun PazMenuRow(
    title: String,
    icon: ImageVector,
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    trailing: @Composable (() -> Unit)? = null,
    showDivider: Boolean = true,
) {
    Column(modifier = modifier) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
                .padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Md),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(34.dp)
                    .then(Modifier),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector        = icon,
                    contentDescription = null,
                    tint               = MaterialTheme.colorScheme.primary,
                    modifier           = Modifier.size(20.dp),
                )
            }
            Spacer(Modifier.width(PazSpacing.Md))
            Text(
                text     = title,
                style    = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.weight(1f),
            )
            if (trailing != null) trailing()
            else if (onClick != null) {
                Icon(
                    imageVector        = Icons.Default.ChevronRight,
                    contentDescription = null,
                    tint               = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f),
                    modifier           = Modifier.size(20.dp),
                )
            }
        }
        if (showDivider) {
            HorizontalDivider(
                modifier  = Modifier.padding(start = PazSpacing.Lg + 34.dp + PazSpacing.Md),
                color     = MaterialTheme.colorScheme.outline,
                thickness = 0.5.dp,
            )
        }
    }
}
```

**iOS:** SwiftUI `Label` inside a `List` row. Native `List` provides the divider automatically. Trailing content via `HStack` with `Spacer()`.

---

#### PazSectionHeader

**File:** `PazSectionHeader.kt`

```kotlin
package br.church.paz.android.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import br.church.paz.android.ui.theme.PazSpacing

@Composable
fun PazSectionHeader(
    title: String,
    modifier: Modifier = Modifier,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null,
) {
    Row(
        modifier          = modifier.fillMaxWidth().padding(bottom = PazSpacing.Sm),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text     = title.uppercase(),
            style    = MaterialTheme.typography.labelSmall,
            color    = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.weight(1f),
        )
        if (actionLabel != null && onAction != null) {
            TextButton(onClick = onAction, contentPadding = PaddingValues(0.dp)) {
                Text(
                    text  = actionLabel,
                    style = MaterialTheme.typography.labelSmall.copy(
                        color = MaterialTheme.colorScheme.primary,
                    ),
                )
            }
        }
    }
}
```

**iOS:** SwiftUI `HStack` with `.font(.caption.weight(.bold)).foregroundStyle(.secondary)` for the title and a `Button` for the action.

---

#### PazAvatar

**File:** `PazAvatar.kt`

```kotlin
package br.church.paz.android.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage

@Composable
fun PazAvatar(
    name: String,
    modifier: Modifier = Modifier,
    imageUrl: String? = null,
    size: Dp = 48.dp,
    showBorder: Boolean = true,
) {
    val initials = name.trim().split(Regex("\\s+"))
        .filter { it.isNotEmpty() }
        .let { parts ->
            when {
                parts.isEmpty()    -> "?"
                parts.size == 1    -> parts[0].first().uppercaseChar().toString()
                else               -> "${parts.first().first().uppercaseChar()}${parts.last().first().uppercaseChar()}"
            }
        }

    val borderModifier = if (showBorder) {
        Modifier.border(
            width  = 1.5.dp,
            color  = MaterialTheme.colorScheme.primary.copy(alpha = 0.25f),
            shape  = CircleShape,
        )
    } else Modifier

    Box(
        modifier          = modifier
            .size(size)
            .clip(CircleShape)
            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.10f))
            .then(borderModifier),
        contentAlignment  = Alignment.Center,
    ) {
        if (!imageUrl.isNullOrEmpty()) {
            AsyncImage(
                model             = imageUrl,
                contentDescription = name,
                contentScale       = ContentScale.Crop,
                modifier           = Modifier.fillMaxSize(),
            )
        } else {
            Text(
                text  = initials,
                style = MaterialTheme.typography.bodySmall.copy(
                    fontWeight = androidx.compose.ui.text.font.FontWeight.Bold,
                    color      = MaterialTheme.colorScheme.primary,
                ),
            )
        }
    }
}
```

**iOS:** SwiftUI `AsyncImage` + fallback `Text(initials)`. Wrapped in `ZStack` with `Circle()` background and `.overlay(Circle().strokeBorder(...))`.

---

#### PazBadge

**File:** `PazBadge.kt`

```kotlin
package br.church.paz.android.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp

@Composable
fun PazRoleBadge(
    label: String,
    modifier: Modifier = Modifier,
) {
    Text(
        text     = label,
        style    = MaterialTheme.typography.labelSmall.copy(
            color = MaterialTheme.colorScheme.primary,
        ),
        modifier = modifier
            .clip(RoundedCornerShape(20.dp))
            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f))
            .padding(horizontal = 8.dp, vertical = 2.dp),
    )
}
```

---

#### PazTextField

**File:** `PazTextField.kt`

```kotlin
package br.church.paz.android.ui.components

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import br.church.paz.android.ui.theme.PazShapes

@Composable
fun PazTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    isError: Boolean = false,
    errorMessage: String? = null,
    enabled: Boolean = true,
    singleLine: Boolean = true,
    trailingIcon: @Composable (() -> Unit)? = null,
) {
    OutlinedTextField(
        value         = value,
        onValueChange = onValueChange,
        label         = { Text(label) },
        modifier      = modifier.fillMaxWidth(),
        isError       = isError,
        enabled       = enabled,
        singleLine    = singleLine,
        trailingIcon  = trailingIcon,
        supportingText = errorMessage?.let { msg ->
            { Text(msg, color = MaterialTheme.colorScheme.error) }
        },
        shape  = PazShapes.medium,
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor   = MaterialTheme.colorScheme.primary,
            unfocusedBorderColor = MaterialTheme.colorScheme.outline,
            errorBorderColor     = MaterialTheme.colorScheme.error,
        ),
    )
}
```

**iOS:** SwiftUI `TextField` inside `VStack` with a `RoundedRectangle` overlay border. Error state shown via `.foregroundStyle(.red)` text below the field.

---

#### PazEmptyState

**File:** `PazEmptyState.kt`

```kotlin
package br.church.paz.android.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import br.church.paz.android.ui.theme.PazSpacing

@Composable
fun PazEmptyState(
    icon: ImageVector,
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null,
) {
    Column(
        modifier          = modifier.padding(PazSpacing.Xxxl),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(
            imageVector        = icon,
            contentDescription = null,
            modifier           = Modifier.size(64.dp),
            tint               = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f),
        )
        Spacer(Modifier.height(PazSpacing.Lg))
        Text(
            text      = title,
            style     = MaterialTheme.typography.titleMedium,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(PazSpacing.Sm))
        Text(
            text      = subtitle,
            style     = MaterialTheme.typography.bodyMedium,
            color     = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
            textAlign = TextAlign.Center,
        )
        if (actionLabel != null && onAction != null) {
            Spacer(Modifier.height(PazSpacing.Xl))
            PazButton(text = actionLabel, onClick = onAction)
        }
    }
}
```

---

#### PazSkeletonLoader

**File:** `PazSkeletonLoader.kt`

```kotlin
package br.church.paz.android.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing

@Composable
fun PazSkeleton(
    modifier: Modifier = Modifier,
    width: Dp = Dp.Unspecified,
    height: Dp = 16.dp,
    cornerRadius: Dp = 8.dp,
) {
    val shimmerColors = listOf(
        Color.LightGray.copy(alpha = 0.6f),
        Color.LightGray.copy(alpha = 0.2f),
        Color.LightGray.copy(alpha = 0.6f),
    )
    val transition = rememberInfiniteTransition(label = "shimmer")
    val translateAnim by transition.animateFloat(
        initialValue   = 0f,
        targetValue    = 1000f,
        animationSpec  = infiniteRepeatable(
            animation = tween(1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart,
        ),
        label          = "shimmer_translate",
    )
    val brush = Brush.linearGradient(
        colors = shimmerColors,
        start  = Offset.Zero,
        end    = Offset(x = translateAnim, y = translateAnim),
    )
    val widthModifier = if (width != Dp.Unspecified) Modifier.width(width) else Modifier.fillMaxWidth()
    Box(
        modifier = modifier
            .then(widthModifier)
            .height(height)
            .clip(androidx.compose.foundation.shape.RoundedCornerShape(cornerRadius))
            .background(brush),
    )
}

@Composable
fun PazCardSkeleton(modifier: Modifier = Modifier) {
    PazCard(modifier = modifier.padding(PazSpacing.Lg)) {
        Column(Modifier.padding(PazSpacing.Lg), verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
            PazSkeleton(height = 20.dp, width = 160.dp)
            PazSkeleton(height = 14.dp, width = 200.dp)
            PazSkeleton(height = 14.dp)
        }
    }
}
```

**iOS:** SwiftUI `.redacted(reason: .placeholder)` with a custom shimmer `ViewModifier` using `withAnimation(.easeInOut(duration: 1.2).repeatForever())`.

---

#### PazBottomSheet

**File:** `PazBottomSheet.kt`

```kotlin
package br.church.paz.android.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.android.ui.theme.PazShapeXxl

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PazBottomSheet(
    onDismiss: () -> Unit,
    sheetState: SheetState = rememberModalBottomSheetState(),
    content: @Composable ColumnScope.() -> Unit,
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState       = sheetState,
        shape            = PazShapeXxl,
        containerColor   = MaterialTheme.colorScheme.surface,
        dragHandle       = {
            Box(
                modifier          = Modifier.fillMaxWidth().padding(vertical = PazSpacing.Sm),
                contentAlignment  = Alignment.Center,
            ) {
                Box(
                    Modifier
                        .width(36.dp)
                        .height(4.dp)
                        .padding(0.dp)
                        .then(
                            Modifier.then(
                                Modifier.wrapContentSize()
                            )
                        )
                )
                BottomSheetDefaults.DragHandle()
            }
        },
        content = content,
    )
}
```

**iOS:** SwiftUI `.sheet(isPresented:)` with `.presentationDetents([.medium, .large])` and `.presentationDragIndicator(.visible)`. Native iOS bottom sheet with drag handle.

---

#### PazCarousel

**File:** `PazCarousel.kt`

```kotlin
package br.church.paz.android.ui.components

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazSpacing
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun <T> PazCarousel(
    items: List<T>,
    modifier: Modifier = Modifier,
    autoScrollDelayMs: Long = 4000L,
    content: @Composable (item: T, pageIndex: Int) -> Unit,
) {
    if (items.isEmpty()) return

    val pagerState  = rememberPagerState(pageCount = { items.size })
    val scope       = rememberCoroutineScope()

    LaunchedEffect(pagerState) {
        while (true) {
            delay(autoScrollDelayMs)
            val next = (pagerState.currentPage + 1) % items.size
            scope.launch { pagerState.animateScrollToPage(next) }
        }
    }

    Box(modifier = modifier) {
        HorizontalPager(
            state    = pagerState,
            modifier = Modifier.fillMaxWidth(),
        ) { page ->
            content(items[page], page)
        }
        Row(
            modifier          = Modifier.align(Alignment.BottomCenter).padding(bottom = PazSpacing.Sm),
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            repeat(items.size) { index ->
                val isSelected = pagerState.currentPage == index
                Box(
                    modifier = Modifier
                        .size(if (isSelected) 8.dp else 6.dp)
                        .clip(CircleShape)
                        .background(
                            if (isSelected) PazColors.PrimaryBlue
                            else PazColors.PrimaryBlue.copy(alpha = 0.3f)
                        )
                )
            }
        }
    }
}
```

**iOS:** SwiftUI `TabView` with `.tabViewStyle(.page(indexDisplayMode: .never))` plus a custom `HStack` of `Circle()` page indicators. Auto-scroll via `Timer.publish(every: 4, on: .main, in: .common)`.

---

## 4. UI Redesign Specification

> **Preview:** Open `docs/superpowers/design-preview/index.html` locally (or run `python3 -m http.server 7654` from that folder) to see all 5 screens rendered.
>
> **Inspiration sources:** church app UX pattern (blue gradient headers, photo cards, date strip calendar, full-width CTAs) + LMS app patterns (pill category chips, carousel, illustrated onboarding).

### 4.1 Design Direction

**Concept:** *Refined Faith* — a visual language that feels authoritative and spiritual without being heavy. Deep navy as the anchor; a gradient sky as movement; clean white cards as calm. The Playfair Display serif in headings gives gravitas; DM Sans body text keeps it modern and legible.

**The one thing someone remembers:** The deep blue gradient hero that pulls from the top and lifts a white card up from underneath — every screen has a sense of depth and motion even when static.

---

### 4.2 Extended Color Tokens

These replace/extend the tokens in §3.1. The brand primary (`#043A6F`) is preserved but gains a full gradient family and a gold accent.

**File:** `PazColors.kt` — updated

```kotlin
object PazColors {
    // ── Brand gradient family ────────────────────────────────────────────────
    val Primary        = Color(0xFF043A6F)   // deep navy — unchanged
    val PrimaryMid     = Color(0xFF0D5299)   // mid-range blue
    val PrimaryLight   = Color(0xFF1A72D6)   // interactive / link blue
    val Accent         = Color(0xFF5B9BD5)   // sky accent
    val Sky            = Color(0xFFA8CBF0)   // soft sky tint
    val Gold           = Color(0xFFF5C842)   // warm gold — used on tags/badges

    // ── Light palette ────────────────────────────────────────────────────────
    val Background     = Color(0xFFF0F4FA)   // slightly cooler than pure white
    val Surface        = Color(0xFFFFFFFF)
    val Surface2       = Color(0xFFF7F9FC)
    val OnSurface      = Color(0xFF0D1B2A)   // near-black with blue hue
    val OnSurface2     = Color(0xFF3D5A7A)   // secondary text
    val Muted          = Color(0xFF8BA7C4)   // placeholder / muted text
    val Border         = Color(0x14043A6F)   // primary at 8% alpha

    // ── Semantic ─────────────────────────────────────────────────────────────
    val Success        = Color(0xFF1E8A4C)
    val Error          = Color(0xFFC62828)
    val Warning        = Color(0xFFE8A020)
    val ErrorTint      = Color(0xFFFFEAEA)
    val PrimaryTint    = Color(0xFFEAF2FC)

    // ── Dark palette ─────────────────────────────────────────────────────────
    val DarkBackground  = Color(0xFF090F18)   // very dark navy
    val DarkSurface     = Color(0xFF111927)   // card surface
    val DarkSurface2    = Color(0xFF182336)   // elevated surface
    val DarkOnBackground= Color(0xFFE8F1FB)   // primary text
    val DarkOnSurface   = Color(0xFF7AADD6)   // secondary text
    val DarkMuted       = Color(0xFF3D6285)   // muted
    val DarkBorder      = Color(0x1F5B9BD5)   // accent at 12% alpha
    val DarkError       = Color(0xFFFF6B6B)
}
```

**Gradients** — define as `Brush` objects, not in `Color`:

**File:** `PazGradients.kt`

```kotlin
package br.church.paz.android.ui.theme

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush

object PazGradients {
    /** Deep navy hero — used on splash, home hero, detail hero */
    val Hero = Brush.linearGradient(
        colors = listOf(PazColors.Primary, PazColors.PrimaryMid, PazColors.PrimaryLight),
        start  = Offset(0f, 0f),
        end    = Offset(Float.POSITIVE_INFINITY, Float.POSITIVE_INFINITY),
    )

    /** Carousel / card gradient */
    val Card = Brush.linearGradient(
        colors = listOf(PazColors.PrimaryMid, PazColors.PrimaryLight),
        start  = Offset(0f, 0f),
        end    = Offset(Float.POSITIVE_INFINITY, Float.POSITIVE_INFINITY),
    )

    /** Soft background gradient for page bodies */
    val Soft = Brush.verticalGradient(
        colors = listOf(PazColors.PrimaryTint, PazColors.Background),
    )

    /** Dark hero for dark mode screens */
    val DarkHero = Brush.linearGradient(
        colors = listOf(Color(0xFF07243F), Color(0xFF0D3A60), Color(0xFF0A2E50)),
        start  = Offset(0f, 0f),
        end    = Offset(Float.POSITIVE_INFINITY, Float.POSITIVE_INFINITY),
    )
}
```

---

### 4.3 Typography Update

Add **Playfair Display** for display headings (gives gravitas to section titles, hero titles, page titles). DM Sans for all body and UI text.

**File:** `PazTypography.kt` — updated

```kotlin
package br.church.paz.android.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// Add Playfair Display to android/src/main/res/font/
val PlayfairDisplay = FontFamily(
    Font(R.font.playfair_display_bold,        FontWeight.Bold),
    Font(R.font.playfair_display_extrabold,   FontWeight.ExtraBold),
)

val DmSans = FontFamily(
    Font(R.font.dm_sans_regular,  FontWeight.Normal),
    Font(R.font.dm_sans_medium,   FontWeight.Medium),
    Font(R.font.dm_sans_semibold, FontWeight.SemiBold),
    Font(R.font.dm_sans_bold,     FontWeight.Bold),
)

val PazTypography = Typography(
    // Playfair for display/editorial headings
    displayLarge = TextStyle(
        fontFamily = PlayfairDisplay,
        fontSize   = 42.sp, fontWeight = FontWeight.ExtraBold, lineHeight = 50.sp,
    ),
    headlineMedium = TextStyle(
        fontFamily = PlayfairDisplay,
        fontSize   = 28.sp, fontWeight = FontWeight.Bold, lineHeight = 34.sp,
    ),
    titleLarge = TextStyle(
        fontFamily = PlayfairDisplay,
        fontSize   = 22.sp, fontWeight = FontWeight.Bold, lineHeight = 28.sp,
    ),
    // DM Sans for UI text
    titleMedium = TextStyle(
        fontFamily = DmSans,
        fontSize   = 16.sp, fontWeight = FontWeight.SemiBold, lineHeight = 22.sp,
    ),
    bodyLarge = TextStyle(
        fontFamily = DmSans,
        fontSize   = 15.sp, fontWeight = FontWeight.Normal, lineHeight = 24.sp,
    ),
    bodyMedium = TextStyle(
        fontFamily = DmSans,
        fontSize   = 14.sp, fontWeight = FontWeight.Normal, lineHeight = 22.sp,
    ),
    bodySmall = TextStyle(
        fontFamily = DmSans,
        fontSize   = 13.sp, fontWeight = FontWeight.Normal, lineHeight = 18.sp,
    ),
    labelSmall = TextStyle(
        fontFamily = DmSans,
        fontSize   = 11.sp, fontWeight = FontWeight.Bold,
        lineHeight  = 14.sp, letterSpacing = 1.5.sp,
    ),
)
```

> Download fonts: `Playfair_Display` and `DM_Sans` from Google Fonts. Place `.ttf` files in `android/src/main/res/font/`.

---

### 4.4 New / Updated Components

#### HeroGradientHeader

Replaces the plain `PazTopBar` on the Home, Splash, and Detail screens. Renders a gradient background with decorative orbs and lifts the page body up over it via a rounded top.

**File:** `PazHeroHeader.kt`

```kotlin
package br.church.paz.android.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.unit.dp
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazShapeXxl

@Composable
fun PazHeroHeader(
    modifier: Modifier = Modifier,
    bottomPadding: Int = 40,      // extra padding so body card overlaps
    content: @Composable BoxScope.() -> Unit,
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .background(PazGradients.Hero)
            .padding(bottom = bottomPadding.dp),
    ) {
        // Decorative orbs
        Box(
            Modifier
                .size(280.dp).offset(x = 80.dp, y = (-80).dp)
                .background(androidx.compose.ui.graphics.Color.White.copy(alpha = 0.05f), CircleShape)
                .blur(40.dp)
        )
        Box(
            Modifier
                .size(140.dp).offset(x = (-30).dp, y = 60.dp)
                .background(androidx.compose.ui.graphics.Color.White.copy(alpha = 0.04f), CircleShape)
                .blur(30.dp)
        )
        content()
    }
}
```

#### GreetingHeader (Home-specific)

```kotlin
@Composable
fun PazGreetingHeader(
    firstName: String,
    avatarInitials: String,
    avatarUrl: String? = null,
    onAvatarClick: () -> Unit,
    chips: List<Pair<String, String>>,     // (emoji, label)
    selectedChip: Int,
    onChipSelected: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    PazHeroHeader(modifier = modifier) {
        Column(
            Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 24.dp, vertical = 16.dp),
        ) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column {
                    Text(
                        text  = "Bom dia 👋",
                        style = MaterialTheme.typography.bodySmall.copy(
                            color = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.65f),
                        ),
                    )
                    Text(
                        text  = firstName,
                        style = MaterialTheme.typography.headlineMedium.copy(
                            color = androidx.compose.ui.graphics.Color.White,
                        ),
                    )
                }
                PazAvatar(
                    name      = firstName,
                    imageUrl  = avatarUrl,
                    size      = 44.dp,
                    modifier  = Modifier.clickable(onClick = onAvatarClick),
                )
            }
            Spacer(Modifier.height(20.dp))
            // Quick-action chips
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                itemsIndexed(chips) { i, (emoji, label) ->
                    val active = i == selectedChip
                    PazQuickChip(emoji = emoji, label = label, active = active, onClick = { onChipSelected(i) })
                }
            }
        }
    }
}
```

#### PazQuickChip

```kotlin
@Composable
fun PazQuickChip(
    emoji: String,
    label: String,
    active: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val bg = if (active) Color.White.copy(alpha = 0.28f) else Color.White.copy(alpha = 0.14f)
    Row(
        modifier = modifier
            .clip(PazShapePill)
            .background(bg)
            .border(1.dp, Color.White.copy(alpha = 0.2f), PazShapePill)
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 9.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Text(emoji, fontSize = 14.sp)
        Text(
            text  = label,
            style = MaterialTheme.typography.labelSmall.copy(
                color = Color.White,
                letterSpacing = 0.sp,
                fontSize = 12.sp,
            ),
        )
    }
}
```

#### PazBodyLift

The "body card that lifts over the hero" pattern used on Home and Account:

```kotlin
@Composable
fun PazBodyLift(
    modifier: Modifier = Modifier,
    overlapDp: Int = 24,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier = modifier
            .offset(y = (-overlapDp).dp)
            .clip(RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
            .background(MaterialTheme.colorScheme.background)
            .padding(top = 24.dp),
        content = content,
    )
}
```

#### PazDateStrip

Horizontal date picker strip used on the Agenda/Events screen:

```kotlin
data class DateItem(val dayOfWeek: String, val dayNum: Int, val isToday: Boolean = false)

@Composable
fun PazDateStrip(
    dates: List<DateItem>,
    selectedIndex: Int,
    onDateSelected: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    LazyRow(
        modifier              = modifier,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        contentPadding        = PaddingValues(horizontal = PazSpacing.Lg),
    ) {
        itemsIndexed(dates) { index, date ->
            val selected = index == selectedIndex
            Column(
                modifier = Modifier
                    .clip(PazShapes.medium)
                    .background(
                        if (selected) MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.surface
                    )
                    .clickable { onDateSelected(index) }
                    .padding(horizontal = 10.dp, vertical = 10.dp)
                    .width(46.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                Text(
                    text  = date.dayOfWeek.uppercase(),
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontSize = 9.sp,
                        color = if (selected) Color.White.copy(.7f)
                                else MaterialTheme.colorScheme.onSurface.copy(.45f),
                    ),
                )
                Text(
                    text  = date.dayNum.toString(),
                    style = MaterialTheme.typography.titleMedium.copy(
                        color = if (selected) Color.White
                                else MaterialTheme.colorScheme.onSurface,
                    ),
                )
                if (date.isToday && !selected) {
                    Box(
                        Modifier.size(4.dp)
                            .background(MaterialTheme.colorScheme.primary, CircleShape)
                    )
                }
            }
        }
    }
}
```

#### PazEventCard

Timeline-style event card as seen in the inspiration:

```kotlin
@Composable
fun PazEventCard(
    time: String,
    amPm: String,
    title: String,
    location: String,
    emoji: String,
    modifier: Modifier = Modifier,
    onClick: () -> Unit = {},
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(PazShapes.large)
            .background(MaterialTheme.colorScheme.surface)
            .clickable(onClick = onClick)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        // Time column
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.width(40.dp),
        ) {
            Text(
                text  = time,
                style = MaterialTheme.typography.titleMedium.copy(
                    color = MaterialTheme.colorScheme.primary,
                    fontSize = 13.sp,
                ),
            )
            Text(
                text  = amPm,
                style = MaterialTheme.typography.labelSmall.copy(
                    color = MaterialTheme.colorScheme.onSurface.copy(.4f),
                    fontSize = 9.sp,
                ),
            )
        }
        // Dot + line
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Box(Modifier.size(8.dp).background(MaterialTheme.colorScheme.primary, CircleShape))
            Box(Modifier.width(2.dp).height(24.dp).background(
                Brush.verticalGradient(listOf(MaterialTheme.colorScheme.primary.copy(.3f), Color.Transparent))
            ))
        }
        // Event info
        Column(Modifier.weight(1f)) {
            Text(title,    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold))
            Text(location, style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(.5f)))
        }
        // Emoji thumb
        Box(
            Modifier.size(48.dp)
                .clip(PazShapes.medium)
                .background(PazGradients.Card),
            contentAlignment = Alignment.Center,
        ) { Text(emoji, fontSize = 22.sp) }
    }
}
```

#### PazTagBadge (Gold)

Used on event detail hero and carousel cards:

```kotlin
@Composable
fun PazTagBadge(
    label: String,
    modifier: Modifier = Modifier,
    gold: Boolean = true,
) {
    val bg    = if (gold) PazColors.Gold else MaterialTheme.colorScheme.primary
    val tint  = if (gold) Color(0xFF1A1A1A) else Color.White
    Text(
        text     = label.uppercase(),
        style    = MaterialTheme.typography.labelSmall.copy(
            color         = tint,
            letterSpacing = 1.5.sp,
        ),
        modifier = modifier
            .clip(PazShapePill)
            .background(bg)
            .padding(horizontal = 12.dp, vertical = 5.dp),
    )
}
```

---

### 4.5 Screen-by-Screen Redesign Map

| Screen | Key changes from current Flutter app |
|--------|--------------------------------------|
| **Splash / Login** | Full-screen gradient hero with orbs + decorative cross watermark. Playfair Display wordmark. "Continuar como visitante" guest link added |
| **Home** | `PazGreetingHeader` with gradient + quick-action chips replacing plain app bar. `PazBodyLift` card overlapping hero. `PazCarousel` with photo-style dark overlay cards. `PazDateStrip` + `PazEventCard` timeline replacing flat list |
| **Event Detail** | Hero photo/gradient with overlay `PazTagBadge` (gold). Tab bar (Visão Geral / Local / Fotos). Attendee avatar stack. "Contribuir Online" full-width gradient CTA at bottom |
| **Academy** | Horizontal card carousels per category with course thumbnail images + play icon overlay |
| **Account** | `PazGreetingHeader` (dark variant on dark mode). Profile card with role badge. Grouped `PazMenuRow` cards. Dark toggle visible with active state |
| **Formulários** | Categorized list (Evangelismo / Grupos de Vida / Supervisão) with colored icon backgrounds per category |
| **Member Journey** | Step timeline with connecting lines, completed steps in primary, future steps in muted |

---

### 4.6 iOS SwiftUI Redesign Equivalents

**Playfair Display on iOS:** Add via `UIFontDescriptor` or use a system serif (`UIFont(descriptor:size:)`) — or bundle the `.ttf` in the app target.

```swift
// PazFonts.swift
import SwiftUI

extension Font {
    static func pazDisplay(_ size: CGFloat)  -> Font { .custom("PlayfairDisplay-Bold",      size: size) }
    static func pazHeading(_ size: CGFloat)  -> Font { .custom("PlayfairDisplay-Bold",      size: size) }
    static func pazBody(_ size: CGFloat)     -> Font { .custom("DMSans-Regular",            size: size) }
    static func pazBodySemibold(_ size: CGFloat) -> Font { .custom("DMSans-SemiBold",       size: size) }
    static func pazLabel(_ size: CGFloat)    -> Font { .custom("DMSans-Bold",               size: size) }
}
```

**Gradient hero view modifier:**

```swift
struct PazHeroBackground: ViewModifier {
    var dark: Bool = false
    func body(content: Content) -> some View {
        content.background(
            LinearGradient(
                colors: dark
                    ? [Color(hex: "07243F"), Color(hex: "0D3A60"), Color(hex: "0A2E50")]
                    : [Color(hex: "043A6F"), Color(hex: "0D5299"), Color(hex: "1A72D6")],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
        )
    }
}

extension View {
    func pazHeroBackground(dark: Bool = false) -> some View { modifier(PazHeroBackground(dark: dark)) }
}
```

**Date strip (SwiftUI):**

```swift
struct PazDateStrip: View {
    let dates: [(dow: String, num: Int)]
    @Binding var selectedIndex: Int

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(dates.indices, id: \.self) { i in
                    let selected = i == selectedIndex
                    VStack(spacing: 2) {
                        Text(dates[i].dow.uppercased())
                            .font(.pazLabel(9))
                            .foregroundStyle(selected ? .white.opacity(0.7) : Color.pazMuted)
                        Text("\(dates[i].num)")
                            .font(.pazBodySemibold(17))
                            .foregroundStyle(selected ? .white : Color.pazOnSurface)
                    }
                    .frame(width: 46)
                    .padding(.vertical, 10)
                    .background(selected ? Color.pazPrimary : Color.pazSurface)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .onTapGesture { selectedIndex = i }
                }
            }
            .padding(.horizontal, PazSpacing.lg)
        }
    }
}
```

---

### 4.7 Updated Phase 0 Checklist (Font + Gradient additions)

Add to Phase 0 steps:

- [ ] Download `Playfair_Display` and `DM_Sans` font families from Google Fonts
- [ ] Add `.ttf` files to `android/src/main/res/font/` (4 weights each)
- [ ] Add font files to Xcode project target (`ios/PazChurch/Resources/Fonts/`)
- [ ] Add `UIAppFonts` entries to `ios/PazChurch/Info.plist` for all 8 `.ttf` files
- [ ] Create `PazGradients.kt` in `:android` theme package
- [ ] Create `PazFonts.swift` in `ios/PazChurch/Theme/`
- [ ] Create `PazHeroBackground.swift` view modifier

## 5. iOS: SwiftUI vs Compose Multiplatform

| Dimension | SwiftUI + KMP (Recommended) | Compose Multiplatform |
|-----------|-----------------------------|-----------------------|
| Native UX | Full — SF Symbols, Dynamic Type, native gestures, Live Activities | Partial — Compose draws on canvas, not native controls |
| Performance | Metal-accelerated native rendering | Skia canvas (good but not native) |
| Accessibility | Full VoiceOver, Dynamic Type, Switch Control out of the box | Manual implementation required for many a11y features |
| iOS 26 features | Liquid Glass, TipKit, etc. at GA | Dependent on KMP team shipping support |
| Developer experience | Excellent: Xcode Previews, SwiftUI inspector, native debugger | Good: fleet/IDEA previews, but toolchain split |
| Hiring | Large Swift/iOS talent pool | Smaller — Compose iOS devs are rare |
| Community | Massive Apple + open source community | Growing but smaller |
| Ecosystem maturity | Production-proven for 5+ years | CMP 1.0 stable (2023); still maturing on iOS |
| Long-term maintenance | Apple actively invests in SwiftUI | JetBrains drives roadmap — API churn risk |
| Code sharing | UI is separate; business logic shared via KMP | Could share UI too |

**Verdict:** Use **SwiftUI + KMP** for iOS. The church app targets real members who notice the difference between native iOS UI and a canvas-drawn approximation. The hiring argument is especially strong for a volunteer/ministry-funded project. Compose Multiplatform is an acceptable fallback only for forms (Formulários) if timeline is critically constrained — justify per feature.

---

## 5. Migration Roadmap

### Phase 0 — Foundation (Week 1–2)

**Scope:** Project skeleton. No features. CI green from day one.

**Files to create:**
- `settings.gradle.kts` — root, includes `build-logic`, `:shared`, `:android`
- `build-logic/build.gradle.kts` + convention plugins (`KmpLibraryConventionPlugin`, `AndroidApplicationConventionPlugin`)
- `gradle/libs.versions.toml` — full version catalog
- `shared/build.gradle.kts` — KMP module, `androidTarget()`, `iosArm64()`, `iosSimulatorArm64()`
- `android/build.gradle.kts` — application module
- `.github/workflows/android-ci.yml` — compile + test
- `.github/workflows/ios-ci.yml` — xcodebuild test
- Design system files (§3.1–3.5)

- [ ] **Step 1: Create `settings.gradle.kts`**
```kotlin
rootProject.name = "PazChurch"
includeBuild("build-logic")
include(":shared", ":android")
```

- [ ] **Step 2: Create `gradle/libs.versions.toml`**
```toml
[versions]
kotlin            = "2.1.0"
kmp               = "2.1.0"
agp               = "8.7.0"
compose-bom       = "2025.04.00"
ktor              = "3.1.0"
koin              = "4.0.0"
datastore         = "1.1.1"
coroutines        = "1.9.0"
serialization     = "1.7.3"
coil              = "3.1.0"
firebase-bom      = "33.7.0"
turbine           = "1.2.0"
junit             = "4.13.2"
kotlin-test       = "2.1.0"

[libraries]
ktor-client-core           = { module = "io.ktor:ktor-client-core",            version.ref = "ktor" }
ktor-client-cio            = { module = "io.ktor:ktor-client-cio",             version.ref = "ktor" }
ktor-client-darwin         = { module = "io.ktor:ktor-client-darwin",          version.ref = "ktor" }
ktor-client-content-neg    = { module = "io.ktor:ktor-client-content-negotiation", version.ref = "ktor" }
ktor-serialization-json    = { module = "io.ktor:ktor-serialization-kotlinx-json", version.ref = "ktor" }
ktor-client-auth           = { module = "io.ktor:ktor-client-auth",            version.ref = "ktor" }
koin-core                  = { module = "io.insert-koin:koin-core",            version.ref = "koin" }
koin-android               = { module = "io.insert-koin:koin-android",         version.ref = "koin" }
koin-compose               = { module = "io.insert-koin:koin-androidx-compose", version.ref = "koin" }
datastore-preferences-core = { module = "androidx.datastore:datastore-preferences-core", version.ref = "datastore" }
coroutines-core            = { module = "org.jetbrains.kotlinx:kotlinx-coroutines-core", version.ref = "coroutines" }
coroutines-android         = { module = "org.jetbrains.kotlinx:kotlinx-coroutines-android", version.ref = "coroutines" }
serialization-json         = { module = "org.jetbrains.kotlinx:kotlinx-serialization-json", version.ref = "serialization" }
compose-bom                = { module = "androidx.compose:compose-bom",        version.ref = "compose-bom" }
compose-ui                 = { module = "androidx.compose.ui:ui" }
compose-material3          = { module = "androidx.compose.material3:material3" }
compose-navigation         = { module = "androidx.navigation:navigation-compose", version = "2.8.5" }
coil-compose               = { module = "io.coil-kt.coil3:coil-compose",       version.ref = "coil" }
coil-network               = { module = "io.coil-kt.coil3:coil-network-ktor3", version.ref = "coil" }
firebase-bom               = { module = "com.google.firebase:firebase-bom",    version.ref = "firebase-bom" }
firebase-auth              = { module = "com.google.firebase:firebase-auth-ktx" }
firebase-messaging         = { module = "com.google.firebase:firebase-messaging-ktx" }
firebase-remote-config     = { module = "com.google.firebase:firebase-config-ktx" }
turbine                    = { module = "app.cash.turbine:turbine",             version.ref = "turbine" }
junit                      = { module = "junit:junit",                         version.ref = "junit" }
kotlin-test                = { module = "org.jetbrains.kotlin:kotlin-test",    version.ref = "kotlin-test" }

[plugins]
kotlin-multiplatform = { id = "org.jetbrains.kotlin.multiplatform", version.ref = "kotlin" }
kotlin-serialization = { id = "org.jetbrains.kotlin.plugin.serialization", version.ref = "kotlin" }
android-application  = { id = "com.android.application", version.ref = "agp" }
android-library      = { id = "com.android.library",     version.ref = "agp" }
compose-compiler     = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }
koin-annotations     = { id = "io.insert-koin:koin-annotations-compiler", version.ref = "koin" }
```

- [ ] **Step 3: Write KmpLibraryConventionPlugin**
```kotlin
// build-logic/src/main/kotlin/KmpLibraryConventionPlugin.kt
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.kotlin.dsl.*
import org.jetbrains.kotlin.gradle.dsl.KotlinMultiplatformExtension

class KmpLibraryConventionPlugin : Plugin<Project> {
    override fun apply(target: Project) = with(target) {
        pluginManager.apply("org.jetbrains.kotlin.multiplatform")
        extensions.configure<KotlinMultiplatformExtension> {
            androidTarget()
            iosArm64()
            iosSimulatorArm64()
            applyDefaultHierarchyTemplate()
        }
    }
}
```

- [ ] **Step 4: Create design system files** — Write all files from §3.1–3.5 to `android/src/main/kotlin/br/church/paz/android/ui/theme/`

- [ ] **Step 5: Write component files** — Write all 14 component files from §3.6 to `android/src/main/kotlin/br/church/paz/android/ui/components/`

- [ ] **Step 6: Verify build compiles**
```bash
./gradlew :android:assembleDebug
./gradlew :shared:compileKotlinIosSimulatorArm64
```
Expected: BUILD SUCCESSFUL

- [ ] **Step 7: Commit**
```bash
git add build-logic gradle shared android
git commit -m "chore: KMP project skeleton + Paz design system"
```

**Risks:** KMP Gradle setup is fiddly — allocate extra time. Convention plugin classpath errors are common on first setup.
**Effort:** 3–4 days
**Success criteria:** `./gradlew build` green; `./gradlew :shared:iosSimulatorArm64Binaries` green; all 14 components render in Compose Preview.

---

### Phase 1 — Shared Core (Week 3–5)

**Scope:** KMP networking, auth, token storage, Firebase wrapper, Koin wiring.

**Files to create:**
- `shared/src/commonMain/kotlin/br/church/paz/shared/data/remote/PazHttpClient.kt`
- `shared/src/commonMain/kotlin/br/church/paz/shared/data/remote/AuthInterceptor.kt`
- `shared/src/commonMain/kotlin/br/church/paz/shared/auth/TokenStorage.kt` (expect)
- `shared/src/androidMain/kotlin/br/church/paz/shared/auth/TokenStorage.android.kt` (actual)
- `shared/src/iosMain/kotlin/br/church/paz/shared/auth/TokenStorage.ios.kt` (actual)
- `shared/src/commonMain/kotlin/br/church/paz/shared/domain/model/*.kt`
- `shared/src/commonMain/kotlin/br/church/paz/shared/di/SharedModule.kt`

- [ ] **Step 1: Write failing test for token storage**
```kotlin
// shared/src/commonTest/kotlin/br/church/paz/shared/auth/TokenStorageTest.kt
class TokenStorageTest {
    @Test
    fun `save and read tokens round-trip`() = runTest {
        val storage = FakeTokenStorage()
        storage.save(TokenPair(access = "acc", refresh = "ref"))
        val result = storage.read()
        assertEquals("acc", result?.access)
        assertEquals("ref", result?.refresh)
    }

    @Test
    fun `clear removes stored tokens`() = runTest {
        val storage = FakeTokenStorage()
        storage.save(TokenPair(access = "acc", refresh = "ref"))
        storage.clear()
        assertNull(storage.read())
    }
}
```

- [ ] **Step 2: Run test — expect FAIL**
```bash
./gradlew :shared:allTests
```
Expected: `TokenStorageTest` — FAIL (class not found)

- [ ] **Step 3: Define TokenStorage interface + expect/actual**
```kotlin
// commonMain: TokenStorage.kt
interface TokenStorage {
    suspend fun save(pair: TokenPair)
    suspend fun read(): TokenPair?
    suspend fun clear()
}

data class TokenPair(val access: String, val refresh: String)

// commonMain: expect
expect fun createTokenStorage(): TokenStorage
```

```kotlin
// androidMain: TokenStorage.android.kt
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
actual fun createTokenStorage(): TokenStorage = DataStoreTokenStorage(/* context injected via Koin */)

class DataStoreTokenStorage(private val dataStore: DataStore<Preferences>) : TokenStorage {
    private val KEY_ACCESS  = stringPreferencesKey("tok_access")
    private val KEY_REFRESH = stringPreferencesKey("tok_refresh")

    override suspend fun save(pair: TokenPair) {
        dataStore.edit {
            it[KEY_ACCESS]  = pair.access
            it[KEY_REFRESH] = pair.refresh
        }
    }
    override suspend fun read(): TokenPair? {
        val prefs = dataStore.data.first()
        val a = prefs[KEY_ACCESS]  ?: return null
        val r = prefs[KEY_REFRESH] ?: return null
        return TokenPair(a, r)
    }
    override suspend fun clear() { dataStore.edit { it.clear() } }
}
```

```swift
// iosMain: TokenStorage.ios.kt
actual fun createTokenStorage(): TokenStorage = KeychainTokenStorage()

class KeychainTokenStorage : TokenStorage {
    // Uses Security framework via kotlinx-cinterop
    override suspend fun save(pair: TokenPair) { /* Keychain SecItemAdd/Update */ }
    override suspend fun read(): TokenPair? { /* Keychain SecItemCopyMatching */ }
    override suspend fun clear() { /* Keychain SecItemDelete */ }
}
```

- [ ] **Step 4: Write failing test for Ktor client auth interceptor**
```kotlin
// shared/src/commonTest/kotlin/br/church/paz/shared/data/remote/AuthInterceptorTest.kt
class AuthInterceptorTest {
    @Test
    fun `attaches Bearer token to requests`() = runTest {
        val storage = FakeTokenStorage().also {
            it.save(TokenPair("test-access", "test-refresh"))
        }
        val client = buildTestClient(storage)
        val engine = client.engine as MockEngine
        engine.config.addHandler { request ->
            assertEquals("Bearer test-access", request.headers["Authorization"])
            respond("{}", HttpStatusCode.OK, headersOf(HttpHeaders.ContentType, "application/json"))
        }
        client.get("/home")
    }
}
```

- [ ] **Step 5: Implement PazHttpClient**
```kotlin
// shared/src/commonMain/kotlin/br/church/paz/shared/data/remote/PazHttpClient.kt
fun createPazHttpClient(
    tokenStorage: TokenStorage,
    baseUrl: String,
    engine: HttpClientEngine,
): HttpClient = HttpClient(engine) {
    defaultRequest { url(baseUrl) }
    install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true; coerceInputValues = true }) }
    install(HttpTimeout) { requestTimeoutMillis = 30_000 }
    install(Auth) {
        bearer {
            loadTokens {
                tokenStorage.read()?.let { BearerTokens(it.access, it.refresh) }
            }
            refreshTokens {
                val refreshed = refreshAccessToken(tokenStorage, client)
                refreshed?.let { BearerTokens(it.access, it.refresh) }
            }
        }
    }
}

private suspend fun refreshAccessToken(storage: TokenStorage, client: HttpClient): TokenPair? {
    return try {
        val current = storage.read() ?: return null
        val response = client.post("/auth/refresh") {
            contentType(ContentType.Application.Json)
            setBody(mapOf("refresh_token" to current.refresh))
            markAsRefreshTokenRequest()
        }
        if (!response.status.isSuccess()) { storage.clear(); return null }
        val body = response.body<RefreshResponse>()
        val pair = TokenPair(body.access_token, body.refresh_token)
        storage.save(pair)
        pair
    } catch (e: Exception) {
        storage.clear()
        null
    }
}
```

- [ ] **Step 6: Define all domain models**
```kotlin
// shared/src/commonMain/kotlin/br/church/paz/shared/domain/model/User.kt
@Serializable
data class User(
    val id: String,
    val name: String,
    val email: String,
    val picture: String?,
    val role: UserRole,
)

enum class UserRole { admin, pastor, area_leader, sector_leader, life_group_leader, member }
val UserRole.isLeader get() = this != UserRole.member
```

- [ ] **Step 7: Write Koin shared module**
```kotlin
// shared/src/commonMain/kotlin/br/church/paz/shared/di/SharedModule.kt
val sharedNetworkModule = module {
    single<TokenStorage> { createTokenStorage() }
    single<HttpClient> {
        createPazHttpClient(
            tokenStorage = get(),
            baseUrl      = getProperty("BASE_URL", "http://10.0.2.2:3001/api"),
            engine       = get(),
        )
    }
}

val sharedRepositoryModule = module {
    single<AuthRepository>  { AuthRepositoryImpl(get(), get()) }
    single<HomeRepository>  { HomeRepositoryImpl(get()) }
    // … one entry per repository
}

val sharedModule = listOf(sharedNetworkModule, sharedRepositoryModule)
```

- [ ] **Step 8: Run all shared tests**
```bash
./gradlew :shared:allTests
```
Expected: ALL PASS

- [ ] **Step 9: Commit**
```bash
git add shared/
git commit -m "feat(shared): KMP networking, auth interceptor, token storage"
```

**Risks:** Keychain interop on iOS requires cinterop setup; DataStore on Android needs context threading. JWT parsing without a KMP library — use `kotlinx.serialization` to decode the payload manually.
**Effort:** 5–6 days
**Success criteria:** All `shared` unit tests green; `TokenStorage` round-trips verified on both platforms; Ktor client sends `Authorization: Bearer …` headers.

---

### Phase 2 — Android Shell + Authentication (Week 6–8)

**Scope:** Runnable Android app with splash, login, and bottom navigation shell. No content yet.

**Files:**
- `android/src/main/kotlin/br/church/paz/android/PazApplication.kt`
- `android/src/main/kotlin/br/church/paz/android/MainActivity.kt`
- `android/src/main/kotlin/br/church/paz/android/navigation/PazNavGraph.kt`
- `android/src/main/kotlin/br/church/paz/android/navigation/Screen.kt`
- `android/src/main/kotlin/br/church/paz/android/ui/features/splash/SplashScreen.kt`
- `android/src/main/kotlin/br/church/paz/android/ui/features/auth/LoginScreen.kt`
- `android/src/main/kotlin/br/church/paz/android/ui/features/auth/LoginViewModel.kt`
- `android/src/main/kotlin/br/church/paz/android/ui/features/shell/AppShell.kt`

- [ ] **Step 1: Write LoginViewModel test**
```kotlin
// android/src/test/kotlin/.../auth/LoginViewModelTest.kt
@OptIn(ExperimentalCoroutinesApi::class)
class LoginViewModelTest {
    private val fakeAuthRepo = FakeAuthRepository()
    private val viewModel    = LoginViewModel(fakeAuthRepo)

    @Test
    fun `login success emits NavigateToHome`() = runTest {
        viewModel.uiEffect.test {
            viewModel.onGoogleSignIn(idToken = "fake-google-token")
            assertEquals(LoginEffect.NavigateToHome, awaitItem())
        }
    }

    @Test
    fun `login failure emits ShowError`() = runTest {
        fakeAuthRepo.shouldFail = true
        viewModel.uiEffect.test {
            viewModel.onGoogleSignIn(idToken = "bad-token")
            val effect = awaitItem()
            assertTrue(effect is LoginEffect.ShowError)
        }
    }
}
```

- [ ] **Step 2: Implement LoginViewModel**
```kotlin
// LoginViewModel.kt
class LoginViewModel(private val authRepository: AuthRepository) : ViewModel() {
    private val _uiState  = MutableStateFlow(LoginUiState())
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    private val _uiEffect = Channel<LoginEffect>(Channel.BUFFERED)
    val uiEffect = _uiEffect.receiveAsFlow()

    fun onGoogleSignIn(idToken: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            authRepository.socialLogin(idToken = idToken, provider = "google")
                .onSuccess { _uiEffect.send(LoginEffect.NavigateToHome) }
                .onFailure { e -> _uiEffect.send(LoginEffect.ShowError(e.message ?: "Erro ao entrar")) }
            _uiState.update { it.copy(isLoading = false) }
        }
    }
}

data class LoginUiState(val isLoading: Boolean = false)
sealed class LoginEffect {
    object NavigateToHome : LoginEffect()
    data class ShowError(val message: String) : LoginEffect()
}
```

- [ ] **Step 3: Implement LoginScreen**
```kotlin
@Composable
fun LoginScreen(
    viewModel: LoginViewModel = koinViewModel(),
    onNavigateToHome: () -> Unit,
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val launcher = rememberLauncherForActivityResult(GoogleSignIn.Contract()) { result ->
        result.getOrNull()?.let { viewModel.onGoogleSignIn(it) }
    }

    LaunchedEffect(Unit) {
        viewModel.uiEffect.collect { effect ->
            when (effect) {
                LoginEffect.NavigateToHome      -> onNavigateToHome()
                is LoginEffect.ShowError        -> { /* show snackbar */ }
            }
        }
    }

    Column(
        modifier            = Modifier.fillMaxSize().padding(PazSpacing.Xl),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text("Paz Church", style = MaterialTheme.typography.displayLarge)
        Spacer(Modifier.height(PazSpacing.Xxxl))
        PazButton(
            text    = "Entrar com Google",
            onClick = { launcher.launch(Unit) },
            loading = uiState.isLoading,
        )
        Spacer(Modifier.height(PazSpacing.Md))
        PazButton(
            text    = "Entrar com Apple",
            onClick = { /* Apple sign-in */ },
            variant = PazButtonVariant.Secondary,
        )
    }
}
```

- [ ] **Step 4: Implement Screen sealed class + NavGraph**
```kotlin
// Screen.kt
sealed class Screen(val route: String) {
    object Splash  : Screen("splash")
    object Login   : Screen("login")
    object Home    : Screen("home")
    object Academy : Screen("academy")
    object Account : Screen("account")
    // … all routes
}

// PazNavGraph.kt
@Composable
fun PazNavGraph(navController: NavHostController) {
    NavHost(navController, startDestination = Screen.Splash.route) {
        composable(Screen.Splash.route)  { SplashScreen(navController) }
        composable(Screen.Login.route)   { LoginScreen(onNavigateToHome = { navController.navigate(Screen.Home.route) }) }
        composable(Screen.Home.route)    { AppShell(navController) }
    }
}
```

- [ ] **Step 5: Run LoginViewModel tests**
```bash
./gradlew :android:testDebugUnitTest --tests "*.LoginViewModelTest"
```
Expected: 2 tests PASS

- [ ] **Step 6: Run Android app on emulator and verify login flow works end-to-end**

- [ ] **Step 7: Commit**
```bash
git add android/
git commit -m "feat(android): app shell, splash, login with Google/Apple"
```

**Risks:** Google Sign-In credential setup (SHA-1 fingerprint in Firebase Console). Apple Sign-In requires paid Apple Developer account.
**Effort:** 4–5 days
**Success criteria:** App launches on emulator; tapping "Entrar com Google" opens Google account picker; successful login navigates to empty shell screen.

---

### Phase 3 — Android Core Features (Week 9–13)

**Scope:** Home, Academy, Account, Edit Profile, Notification Preferences.

For each feature the pattern is:
1. Define domain model in `:shared`
2. Implement repository in `:shared`
3. Write ViewModel unit tests
4. Implement ViewModel
5. Implement Compose screen
6. Wire navigation

- [ ] **Task 3.1: Home Screen**

Files:
- `shared/src/commonMain/…/domain/model/HomeContent.kt`
- `shared/src/commonMain/…/data/repository/HomeRepositoryImpl.kt`
- `android/…/ui/features/home/HomeViewModel.kt`
- `android/…/ui/features/home/HomeScreen.kt`
- `android/…/ui/features/home/HomeUiState.kt`

```kotlin
// HomeUiState.kt
data class HomeUiState(
    val isLoading: Boolean = true,
    val banners: List<Banner> = emptyList(),
    val agendaItems: List<AgendaItem> = emptyList(),
    val contributionSection: ContributionSection? = null,
    val error: String? = null,
)

// HomeViewModel.kt
class HomeViewModel(private val homeRepo: HomeRepository) : ViewModel() {
    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            homeRepo.getHomeContent()
                .onSuccess { content ->
                    _uiState.update { it.copy(
                        isLoading          = false,
                        banners            = content.banners,
                        agendaItems        = content.agenda,
                        contributionSection = content.contribution,
                    )}
                }
                .onFailure { e ->
                    _uiState.update { it.copy(isLoading = false, error = e.message) }
                }
        }
    }
}

// HomeScreen.kt
@Composable
fun HomeScreen(viewModel: HomeViewModel = koinViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = { PazTopBar(title = "Início") }
    ) { padding ->
        when {
            uiState.isLoading -> Column(Modifier.padding(padding)) {
                repeat(3) { PazCardSkeleton(Modifier.padding(PazSpacing.Lg)) }
            }
            uiState.error != null -> PazEmptyState(
                icon     = Icons.Default.WifiOff,
                title    = "Erro ao carregar",
                subtitle = uiState.error!!,
                actionLabel = "Tentar novamente",
                onAction = viewModel::load,
            )
            else -> LazyColumn(contentPadding = padding) {
                item {
                    PazCarousel(
                        items   = uiState.banners,
                        modifier = Modifier.fillMaxWidth().height(220.dp),
                    ) { banner, _ ->
                        AsyncImage(
                            model              = banner.imageUrl,
                            contentDescription = banner.title,
                            contentScale       = ContentScale.Crop,
                            modifier           = Modifier.fillMaxSize().clip(PazShapes.large),
                        )
                    }
                }
                // agenda items, contribution section
            }
        }
    }
}
```

- [ ] **Task 3.2: Academy Screen** — Video list from `/academy` + YouTube deep-link. Pattern identical to Home but with `VideoItem` domain model.

- [ ] **Task 3.3: Account Screen** — `AccountViewModel` consumes `UserRepository.observeCurrentUser(): Flow<User?>` from `:shared`. Menu rows open sub-screens via nav.

- [ ] **Task 3.4: Edit Profile** — `PATCH /users/me`. Single-screen form with `PazTextField` + `PazButton`.

- [ ] **Task 3.5: Notification Preferences** — `GET + PATCH /users/me/notification-preferences`. Toggle list using `Switch` composable.

- [ ] **Commit at end of each task.**

**Risks:** YouTube embed vs native player decision (ExoPlayer for local media; `Intent` for YouTube links is simpler and requires no API key).
**Effort:** 8–10 days
**Success criteria:** All 5 features render correctly with real data; ViewModels tested; Home carousel auto-scrolls.

---

### Phase 4 — Android Leader Features (Week 14–17)

**Scope:** Member Journey, Meeting Report, Ministries, Formulários (all 9).

- [ ] **Task 4.1: Member Journey** — `GET /member-journey/me`. Display step list with progress indicator.

- [ ] **Task 4.2: Meeting Report** — `POST /meeting-reports`. Form with life group selector, attendance count, date picker.

- [ ] **Task 4.3: Ministries** — `GET /church` + sub-resources. Browse list.

- [ ] **Task 4.4: Formulários List** — `GET /forms`. Role-gated list of available forms per leader type.

- [ ] **Task 4.5–4.13: Each form type** — Shared `FormSubmissionViewModel` base class; each form provides its own `UiState` data class and field validation. All POST endpoints listed in §1.2.

```kotlin
// shared: FormSubmissionUseCase.kt
class SubmitFormUseCase<T>(private val repo: FormRepository) {
    suspend operator fun invoke(form: T, endpoint: FormEndpoint): Result<Unit> =
        repo.submit(form, endpoint)
}

// android: BaseFormViewModel.kt
abstract class BaseFormViewModel<F>(
    private val submitUseCase: SubmitFormUseCase<F>,
    private val endpoint: FormEndpoint,
) : ViewModel() {
    private val _isSubmitting = MutableStateFlow(false)
    val isSubmitting = _isSubmitting.asStateFlow()

    private val _effect = Channel<FormEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    protected abstract fun buildForm(): F
    protected abstract fun validate(): List<String>

    fun onSubmit() {
        val errors = validate()
        if (errors.isNotEmpty()) {
            viewModelScope.launch { _effect.send(FormEffect.ValidationError(errors)) }
            return
        }
        viewModelScope.launch {
            _isSubmitting.value = true
            submitUseCase(buildForm(), endpoint)
                .onSuccess { _effect.send(FormEffect.Success) }
                .onFailure { e -> _effect.send(FormEffect.Error(e.message ?: "Erro")) }
            _isSubmitting.value = false
        }
    }
}

sealed class FormEffect {
    object Success : FormEffect()
    data class Error(val message: String) : FormEffect()
    data class ValidationError(val errors: List<String>) : FormEffect()
}
```

- [ ] **Commit after each form type is complete.**

**Risks:** `/users/lookup` for member search in forms — debounce query in ViewModel.
**Effort:** 10–12 days
**Success criteria:** All 9 form types submit successfully; leader-only features hidden for `member` role; validation prevents empty form submission.

---

### Phase 5 — iOS Shell + Authentication (Week 18–20)

**Scope:** Xcode project consuming KMP XCFramework. SwiftUI app shell + login.

**Files:**
- `ios/PazChurch/PazChurchApp.swift`
- `ios/PazChurch/Navigation/RootView.swift`
- `ios/PazChurch/Features/Auth/LoginView.swift`
- `ios/PazChurch/Features/Auth/LoginViewModel.swift`
- `ios/PazChurch/Theme/PazColors.swift`
- `ios/PazChurch/Theme/PazTypography.swift`
- `ios/PazChurch/Theme/PazSpacing.swift`

- [ ] **Step 1: Export KMP XCFramework**
```bash
./gradlew :shared:assembleXCFramework
```
Add resulting `.xcframework` to Xcode project via `File > Add Packages` or drag into Frameworks.

- [ ] **Step 2: Write Swift design tokens**
```swift
// PazColors.swift
import SwiftUI

extension Color {
    static let pazPrimary      = Color(red: 0.016, green: 0.227, blue: 0.435)   // #043A6F
    static let pazSecondary    = Color(red: 0.404, green: 0.518, blue: 0.682)   // #6784AE
    static let pazBackground   = Color(red: 0.961, green: 0.961, blue: 0.969)   // #F5F5F7
    static let pazSurface      = Color.white
    static let pazOnSurface    = Color(red: 0.102, green: 0.102, blue: 0.180)   // #1A1A2E
    static let pazBorder       = Color(red: 0.918, green: 0.933, blue: 0.961)   // #EAEEF5
    static let pazPrimaryTint  = Color(red: 0.910, green: 0.941, blue: 0.984)   // #E8F0FB
    static let pazError        = Color(red: 0.824, green: 0.184, blue: 0.184)   // #D32F2F
    static let pazSuccess      = Color(red: 0.180, green: 0.490, blue: 0.196)   // #2E7D32
}
```

```swift
// PazSpacing.swift
import SwiftUI

enum PazSpacing {
    static let xs: CGFloat   = 4
    static let sm: CGFloat   = 8
    static let md: CGFloat   = 12
    static let lg: CGFloat   = 16
    static let xl: CGFloat   = 24
    static let xxl: CGFloat  = 32
    static let xxxl: CGFloat = 48
}
```

- [ ] **Step 3: Implement LoginViewModel (Swift, consuming KMP)**
```swift
@Observable
final class LoginViewModel {
    var isLoading = false
    var errorMessage: String? = nil
    var isAuthenticated = false

    private let authRepository: AuthRepository  // KMP interface

    init(authRepository: AuthRepository) {
        self.authRepository = authRepository
    }

    func signInWithGoogle(idToken: String) {
        isLoading = true
        Task {
            do {
                try await authRepository.socialLogin(idToken: idToken, provider: "google")
                isAuthenticated = true
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}
```

- [ ] **Step 4: Build and run on iOS Simulator**
```bash
xcodebuild -scheme PazChurch -destination 'platform=iOS Simulator,name=iPhone 16' build
```
Expected: BUILD SUCCEEDED

- [ ] **Step 5: Commit**

**Risks:** Swift/KMP interop for suspend functions requires `kotlinx-coroutines-core` with `@ObjCName` annotations or a Swift async wrapper. Use `KmpAsync.swift` wrapper pattern.
**Effort:** 5–6 days
**Success criteria:** iOS app launches; Google Sign-In opens and returns token; successful login navigates to empty tab shell.

---

### Phase 6 — iOS Core + Leader Features (Week 21–26)

**Scope:** Port all features from Phases 3–4 to SwiftUI.

- [ ] **Task 6.1–6.5:** Home, Academy, Account, Edit Profile, Notification Preferences — same domain logic via KMP, SwiftUI views.
- [ ] **Task 6.6–6.14:** Member Journey, Meeting Report, Ministries, all 9 Formulários.

Each task follows the same pattern as Android: KMP ViewModel (or Swift `@Observable` class consuming KMP use cases), SwiftUI view, navigation wiring.

**Effort:** 18–20 days
**Success criteria:** Feature parity with Android; all API calls succeed; role-gating works; all forms submit.

---

### Phase 7 — Flutter Decommission (Week 27–28)

- [ ] Feature parity audit — compare every screen against Flutter using the checklist below
- [ ] Submit Android app to Play Store (internal track)
- [ ] Submit iOS app to App Store (TestFlight)
- [ ] Staged rollout: 10% → 50% → 100%
- [ ] Archive Flutter repo (`git tag flutter-final && git archive`)
- [ ] Remove Flutter CI from root monorepo

**Feature parity checklist:**
- [ ] Splash + bootstrap
- [ ] Google Sign-In
- [ ] Apple Sign-In
- [ ] Home carousel auto-scroll
- [ ] Agenda display
- [ ] Contribution/donation section
- [ ] Academy video list + playback
- [ ] Account screen + dark mode toggle
- [ ] Edit Profile
- [ ] Notification Preferences
- [ ] Member Journey
- [ ] Meeting Report (leader)
- [ ] Ministries
- [ ] All 9 Formulários (leader)
- [ ] Markdown content pages
- [ ] Push notifications received and displayed
- [ ] JWT auto-refresh on 401
- [ ] Role-gated UI (leader vs member)

**Risks:** Store review times (1–3 days Android, 1–7 days iOS). Maintain Flutter app live until 100 % rollout confirmed.
**Effort:** 3–4 days
**Success criteria:** Both store submissions approved; crash-free rate > 99.5 % in first week.

---

## 6. Risk Assessment

| Risk | Type | Probability | Impact | Mitigation |
|------|------|-------------|--------|------------|
| KMP iOS interop with suspend functions | Technical | High | Medium | Use `kotlinx.coroutines` `@ObjCName` + Swift async wrappers early (Phase 1) |
| Firebase no KMP-native SDK for all services | Technical | Medium | Medium | Use platform-native Firebase SDKs; KMP only wraps auth token result |
| DataStore Multiplatform API churn | Technical | Low | Low | Pin exact DataStore version; abstract behind `TokenStorage` interface |
| Apple Sign-In iOS testing requires real device | Technical | Medium | Low | Use simulator mock for unit tests; real device for integration |
| Google/Apple Sign-In credential setup delay | Product | Medium | High | Do this in Phase 0 setup, not Phase 2 |
| No mobile Kotlin/Swift specialist on team | Team | Unknown | High | Start with 1 Android senior + 1 iOS senior; KMP glue can be done by either |
| Store rejection due to login-only app (no guest mode) | Product | Low | High | Add "explore as guest" flow before submission |
| Flutter and native diverging in prod during migration | Product | Medium | Medium | Keep Flutter as read-only fallback; no new Flutter features after Phase 0 |
| Timeline slip on Formulários (9 types × 2 platforms) | Timeline | High | Medium | Batch with `BaseFormViewModel`; all 9 forms share 80 % of the code |

---

## 7. Final Recommendation

**Recommended architecture:** KMP `:shared` module for all business logic + Jetpack Compose on Android + SwiftUI on iOS.

**What to share via KMP:**
- All domain models
- All repository interfaces and implementations
- Ktor HTTP client + auth interceptor + JWT refresh
- Token storage (expect/actual)
- Auth use cases
- Form submission use cases
- Validation rules

**What stays platform-native:**
- All UI (non-negotiable)
- Navigation
- Firebase Auth trigger (Google/Apple OAuth flow)
- Push notification registration
- Video playback
- Camera/photo picker (Edit Profile)

**Compose Multiplatform:** Not recommended. The Paz Church app serves real members with accessibility needs on iOS. SwiftUI delivers full VoiceOver, Dynamic Type, and native gestures automatically. Compose Multiplatform would require manual work for each of these.

**Estimated timeline:** 28 weeks (7 months) with a team of 2 engineers.

**Recommended team composition:**
- 1 Android Senior (Kotlin/Compose) — leads `:shared` KMP + `:android`
- 1 iOS Senior (Swift/SwiftUI) — leads `:ios`, consumes KMP framework

**Expected benefits:**
- 100 % native UX on both platforms
- ≈ 45 % code shared (networking, auth, domain, repositories)
- Easier hiring — standard Android/iOS skills
- Full accessibility compliance on iOS at no extra cost
- Long-term maintainability: each platform owned independently

**Trade-offs:**
- More code to maintain than Flutter (two UI codebases instead of one)
- KMP Gradle setup has a real learning curve
- iOS SwiftUI/KMP interop for async is non-trivial on first setup
- 7-month timeline is realistic only with dedicated senior engineers
