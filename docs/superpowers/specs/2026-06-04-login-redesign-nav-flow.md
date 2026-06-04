# Login Redesign + Navigation Flow

**Date:** 2026-06-04  
**Scope:** kmp-mobile (Android Compose + iOS SwiftUI)  
**Constraint:** No changes to backend or shared KMP mapping layer.

---

## Goals

1. Home is always the first screen — no auth gate at launch.
2. Login is accessible from (a) the Conta/Account tab and (b) as a modal over Academy.
3. Login screen matches `Login Native v2.html` — hero + overlapping card, Playfair Display, gold rule, dark mode.
4. After login from any entry point, the whole app reflects authenticated state.

---

## Navigation Flow

### Current (to be removed)
```
Splash → check auth → Login (if no token) | Shell (if token)
```
Login is a root-level destination. Unauthenticated users cannot reach Home.

### New
```
Splash → Shell always (Home tab selected)

Shell
├── Home tab        — always accessible, no auth required
├── Academy tab     — content visible; locked items show LoginSheet on tap
├── Search tab      — always accessible
└── Conta tab       — if not authenticated: show LoginCover (full-screen within tab)
                      if authenticated: show AccountView normally
```

**LoginSheet** (Academy): bottom sheet / modal presented over Academy. On success → dismiss sheet, Academy reloads in logged-in state.

**LoginCover** (Conta tab): full-screen cover inside the tab. On success → cover dismissed, AccountView shown.

**Shared auth state:** Both Android (`LoginViewModel` → `AuthRepository`) and iOS (`AuthenticationCoordinator`) already publish auth state reactively. The tab views observe this and react without additional coordination.

### Android nav changes

- `SplashScreen.onNavigateToLogin` path is removed. Splash always calls `onNavigateToHome`.
- `Screen.Login` stays in `PazNavGraph` but is no longer reachable from Splash. It is used only as a full-screen route navigated to from `AccountScreen` when unauthenticated.
- `AccountScreen` gets a new `onNavigateToLogin` callback. When `!isAuthenticated`, it navigates to `Screen.Login` (which pops back to Shell on success).
- `AcademyScreen` gets a `showLoginSheet: Boolean` state + `LoginBottomSheet` composable. Triggered when a locked video card is tapped.

### iOS nav changes

- `PazChurchApp.body`: remove the `if authCoordinator.isAuthenticated … else LoginView` branch. Always render `MainTabView`.
- `AccountView`: if `!authCoordinator.isAuthenticated` → show `LoginView` as a `.fullScreenCover`.
- `AcademyView`: if locked content tapped → `showLoginSheet = true` → present `LoginView` as `.sheet`.
- `LoginView` gains an optional `onDismiss: (() -> Void)?` parameter. When set (modal context), shows a close/X button.

---

## Login Screen Visual Spec

Reference: `Login Native v2.html` (toggle Tweaks panel for dark/light).

### Layout

```
┌─────────────────────────────┐
│  Hero zone (~400dp)         │  ← PazGradients.Hero, scrim at top for status bar
│                             │
│  [status bar — white text]  │
│                             │
│     ✝  (ghost cross, 8%)    │
│                             │
├── card overlaps by -48dp ───┤
│  ┌───────────────────────┐  │
│  │  "Paz Church"         │  │  ← Playfair ExtraBold 30sp, --primary (sky in dark)
│  │  ————  (gold 32×2dp)  │  │  ← gold rule #FFB300
│  │  welcome text         │  │  ← slate 15sp
│  │                       │  │
│  │  [Google button]      │  │
│  │  [Apple button]       │  │
│  │                       │  │
│  │  Explorar como        │  │
│  │  visitante            │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

### Card

| Property | Value |
|---|---|
| `border-radius` | 26dp |
| background | `--surface` (`#FFFFFF` / `#0D1826` dark) |
| border | `1px solid rgba(3,46,88,.06)` |
| shadow | `0 20px 44px -18px rgba(3,46,88,.4), 0 2px 8px rgba(3,46,88,.06)` |
| margin-top | `-48dp` (overlaps hero) |
| padding | `26dp horizontal, 28dp vertical` |

### Typography

| Element | Style |
|---|---|
| Title "Paz Church" | Playfair Display ExtraBold, 30sp, `--primary` (#032E58) / sky (#5B9BD5) dark |
| Gold rule | 32×2dp, radius 2dp, `#FFB300` |
| Welcome text | 15sp, slate (#5A6B82) |

### Buttons

**Google:**
- Height: 54dp, radius: 100dp (pill)
- Light: `--surface` bg, `--ink` text, `1px --line` border, subtle shadow
- Dark: `--card2` (`#101F31`) bg, `--ink` text, `1px --line` border

**Apple:**
- Height: 54dp, radius: 100dp (pill)
- Light: `#000000` bg, white text
- Dark: `rgba(255,255,255,.10)` bg, `1px rgba(255,255,255,.20)` border, white text

**Visitor link:**
- "Explorar como visitante"
- Color: `--slate` (#5A6B82)
- Underline in `--primary-light` (#1565C0) / sky (#5B9BD5) dark

### Dark Mode Tokens (new, add to PazColors)

```kotlin
// PazColors.kt
val PrimaryMid   = Color(0xFF0B4D8C)
val PrimaryLight = Color(0xFF1565C0)
val Gold         = Color(0xFFFFB300)
val Sky          = Color(0xFF5B9BD5)
val DarkCard2    = Color(0xFF101F31)
val DarkSlate    = Color(0xFF97A6BC)
val DarkSurface  = Color(0xFF0D1826)
```

```swift
// PazColors.swift
static let pazPrimaryMid   = Color(hex: "0B4D8C")
static let pazPrimaryLight = Color(hex: "1565C0")
static let pazGold         = Color(hex: "FFB300")
static let pazSky          = Color(hex: "5B9BD5")
static let pazDarkCard2    = Color(hex: "101F31")
static let pazDarkSlate    = Color(hex: "97A6BC")
static let pazDarkSurface  = Color(hex: "0D1826")
```

### Hero Ghost Cross

A decorative cross watermark in the hero zone, white at ~8% opacity, large (display-size font or custom shape). Positioned center or slightly offset — matches the existing `✝` character approach in the current LoginScreen.

### Modal variant (LoginSheet / LoginCover)

When presented as a sheet (Academy), add a close `✕` button top-right of the card. No other layout changes.

---

## Academy Locked-State UX

When `!isAuthenticated` and user taps a locked video:
- Android: `showLoginSheet` state set to `true` → `ModalBottomSheet` with `LoginContent` composable (same visual, no hero — just the card portion, sheet background is the surface color).
- iOS: `showLoginSheet` binding set to `true` → `.sheet { LoginView(onDismiss: { showLoginSheet = false }) }`.

The "lock card + promo card" logged-out state from `Academia Native.html` (showing benefits, spark icons) is a **separate** Academy screen redesign task and is **out of scope** for this spec. This spec only covers the login modal entry point.

---

## Out of Scope

- Any backend or shared KMP mapping changes.
- Academy logged-out promo card redesign (separate task).
- Home screen redesign (separate task).
- Profile/Perfil screen redesign (separate task).
- Event Detail, Conta, Formulários redesigns (separate tasks).
- Playfair Display font asset addition for Android (prerequisite — must be done first in implementation).

---

## Files to Change

### Android
| File | Change |
|---|---|
| `android/.../auth/LoginScreen.kt` | Full visual redesign |
| `android/.../navigation/PazNavGraph.kt` | Remove Login from Splash path; add login-on-success-back-to-shell |
| `android/.../navigation/AppShell.kt` | Pass `rootNavController` to Account tab for login nav |
| `android/.../navigation/Screen.kt` | No change |
| `android/.../features/account/AccountScreen.kt` | Auth gate: if not authenticated navigate to Login |
| `android/.../features/academy/AcademyScreen.kt` | Add `showLoginSheet` state + `LoginBottomSheet` |
| `android/.../ui/theme/PazColors.kt` | Add new color tokens |

### iOS
| File | Change |
|---|---|
| `ios/.../PazChurchApp.swift` | Remove auth gate; always render MainTabView |
| `ios/.../Features/Auth/LoginView.swift` | Full visual redesign + optional `onDismiss` param |
| `ios/.../Navigation/MainTabView.swift` | No nav change needed (auth handled inside tab views) |
| `ios/.../Features/Account/AccountView.swift` | `.fullScreenCover` when not authenticated |
| `ios/.../Features/Academy/AcademyView.swift` | `.sheet` login when locked content tapped |
| `ios/.../Theme/PazColors.swift` | Add new color tokens |
