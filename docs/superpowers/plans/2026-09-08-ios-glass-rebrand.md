# iOS Glassmorphic Rebrand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the kmp-mobile iOS SwiftUI app to a glassmorphic visual language (frosted/blurred cards, pill-shaped buttons, larger radii) across all 21 screens, without changing the existing `PazColors` brand palette, business logic, or navigation.

**Architecture:** Add three new reusable SwiftUI components (`GlassCard`, `PazPillButtonStyle`, `GlassBlurBackground`) plus new radius tokens in `PazSpacing`, then migrate each of the 21 `Features/**/*View.swift` files (+ `Navigation/MainTabView.swift`) to consume them in place of inline `.background(PazColors.surface).cornerRadius(_)` cards and ad-hoc button styling.

**Tech Stack:** SwiftUI, `.ultraThinMaterial`/`.regularMaterial`, existing `PazColors`/`PazSpacing`/`PazTypography` design tokens.

## Global Constraints

- No new color tokens; no yellow/gold highlight block — reuse existing `PazColors` only.
- Preserve all required screen states (loading, error, empty, loggedIn, loggedOut) in both light and dark mode per `kmp-mobile/docs/CODING_GUIDELINES.md`.
- iOS ViewModels stay `@Observable @MainActor` — this plan does not touch ViewModel logic, only View styling.
- Run `swiftformat` + `swiftlint --fix` before every commit (repo convention).
- Android is out of scope — do not touch `kmp-mobile/android/`.
- Card corner radius: 24pt (compact cards) / 28pt (hero/large cards). Button height: 52pt, fully pill (radius = height / 2).

---

## File Structure

**New files:**
- `kmp-mobile/ios/PazChurch/Components/GlassCard.swift` — `GlassCard` container view + `.glassCard()` view modifier
- `kmp-mobile/ios/PazChurch/Components/PazPillButtonStyle.swift` — `PazPillButtonStyle` (primary/secondary) + `ButtonStyle` static accessors
- `kmp-mobile/ios/PazChurch/Components/GlassBlurBackground.swift` — `GlassBlurBackground` view modifier for hero/nav areas

**Modified files:**
- `kmp-mobile/ios/PazChurch/Theme/PazSpacing.swift` — add `cardRadiusLarge`, `cardRadiusCompact`, `pillButtonHeight` tokens
- All 21 files under `kmp-mobile/ios/PazChurch/Features/**/*View.swift` (list in Task 5 onward) — replace inline card/button styling with the new components
- `kmp-mobile/ios/PazChurch/Navigation/MainTabView.swift` — apply `GlassBlurBackground` to tab bar container if it has custom background styling

---

### Task 1: Add spacing/radius tokens

**Files:**
- Modify: `kmp-mobile/ios/PazChurch/Theme/PazSpacing.swift`

**Interfaces:**
- Produces: `PazSpacing.cardRadiusCompact: CGFloat` (24), `PazSpacing.cardRadiusLarge: CGFloat` (28), `PazSpacing.pillButtonHeight: CGFloat` (52)

- [ ] **Step 1: Read the current file to find the right insertion point**

Run: `sed -n '1,40p' kmp-mobile/ios/PazChurch/Theme/PazSpacing.swift`

- [ ] **Step 2: Add the new tokens**

Add inside the `PazSpacing` enum (alongside existing spacing constants), e.g.:

```swift
    // MARK: - Glass rebrand radii (2026-09 glassmorphic restyle)

    static let cardRadiusCompact: CGFloat = 24
    static let cardRadiusLarge: CGFloat = 28
    static let pillButtonHeight: CGFloat = 52
```

- [ ] **Step 3: Build to verify it compiles**

Run: `cd kmp-mobile/ios && xcodebuild -project PazChurch.xcodeproj -scheme PazChurch -destination 'generic/platform=iOS Simulator' build 2>&1 | tail -30`
Expected: `** BUILD SUCCEEDED **`

- [ ] **Step 4: Commit**

```bash
git add kmp-mobile/ios/PazChurch/Theme/PazSpacing.swift
git commit -m "feat(ios): add glass rebrand radius/height tokens"
```

---

### Task 2: `GlassCard` component

**Files:**
- Create: `kmp-mobile/ios/PazChurch/Components/GlassCard.swift`

**Interfaces:**
- Consumes: `PazSpacing.cardRadiusCompact`, `PazSpacing.cardRadiusLarge` (Task 1)
- Produces: `GlassCard<Content: View>` container view with `init(radius: CGFloat = PazSpacing.cardRadiusCompact, material: Material = .ultraThinMaterial, @ViewBuilder content: () -> Content)`; and `View.glassCard(radius:material:) -> some View` modifier that wraps `self` in the same styling for cases where a container view isn't convenient.

- [ ] **Step 1: Write the component**

```swift
import SwiftUI

// MARK: - GlassCard

/// A frosted, translucent card container used for the 2026-09 glassmorphic restyle.
/// Floats over `PazColors` gradients/backgrounds using system Material blur.
struct GlassCard<Content: View>: View {
    var radius: CGFloat = PazSpacing.cardRadiusCompact
    var material: Material = .ultraThinMaterial
    @ViewBuilder var content: Content

    var body: some View {
        content
            .background(
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .fill(material)
            )
            .overlay(
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .strokeBorder(Color.white.opacity(0.12), lineWidth: 0.5)
            )
            .shadow(color: Color.black.opacity(0.10), radius: 16, x: 0, y: 8)
    }
}

extension View {
    /// Wraps this view in `GlassCard` styling without needing a separate container.
    func glassCard(
        radius: CGFloat = PazSpacing.cardRadiusCompact,
        material: Material = .ultraThinMaterial
    ) -> some View {
        GlassCard(radius: radius, material: material) { self }
    }
}
```

- [ ] **Step 2: Build to verify it compiles**

Run: `cd kmp-mobile/ios && xcodebuild -project PazChurch.xcodeproj -scheme PazChurch -destination 'generic/platform=iOS Simulator' build 2>&1 | tail -30`
Expected: `** BUILD SUCCEEDED **`

- [ ] **Step 3: Format**

Run: `cd kmp-mobile/ios && swiftformat PazChurch/Components/GlassCard.swift && swiftlint --fix --path PazChurch/Components/GlassCard.swift`

- [ ] **Step 4: Commit**

```bash
git add kmp-mobile/ios/PazChurch/Components/GlassCard.swift
git commit -m "feat(ios): add GlassCard glassmorphic container component"
```

---

### Task 3: `PazPillButtonStyle` component

**Files:**
- Create: `kmp-mobile/ios/PazChurch/Components/PazPillButtonStyle.swift`

**Interfaces:**
- Consumes: `PazSpacing.pillButtonHeight` (Task 1), `PazColors.pazPrimary`, `PazColors.ink`, `PazColors.surface`
- Produces: `PazPillButtonStyle` (`ButtonStyle`, `variant: .primary | .secondary`), exposed as `ButtonStyle == PazPillButtonStyle` static members `.pazPillPrimary` and `.pazPillSecondary`.

- [ ] **Step 1: Write the component**

```swift
import SwiftUI

// MARK: - PazPillButtonStyle

/// Fully-rounded ("pill") button style used for the 2026-09 glassmorphic restyle.
struct PazPillButtonStyle: ButtonStyle {
    enum Variant {
        case primary
        case secondary
    }

    var variant: Variant

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 17, weight: .semibold))
            .frame(maxWidth: .infinity)
            .frame(height: PazSpacing.pillButtonHeight)
            .foregroundStyle(foregroundColor)
            .background(
                Capsule(style: .continuous)
                    .fill(backgroundColor)
            )
            .overlay(
                Capsule(style: .continuous)
                    .strokeBorder(borderColor, lineWidth: variant == .secondary ? 1 : 0)
            )
            .opacity(configuration.isPressed ? 0.85 : 1.0)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }

    private var backgroundColor: Color {
        variant == .primary ? PazColors.ink : Color.clear
    }

    private var foregroundColor: Color {
        variant == .primary ? PazColors.surface : PazColors.ink
    }

    private var borderColor: Color {
        PazColors.line
    }
}

extension ButtonStyle where Self == PazPillButtonStyle {
    static var pazPillPrimary: PazPillButtonStyle { PazPillButtonStyle(variant: .primary) }
    static var pazPillSecondary: PazPillButtonStyle { PazPillButtonStyle(variant: .secondary) }
}
```

- [ ] **Step 2: Build to verify it compiles**

Run: `cd kmp-mobile/ios && xcodebuild -project PazChurch.xcodeproj -scheme PazChurch -destination 'generic/platform=iOS Simulator' build 2>&1 | tail -30`
Expected: `** BUILD SUCCEEDED **`

- [ ] **Step 3: Format**

Run: `cd kmp-mobile/ios && swiftformat PazChurch/Components/PazPillButtonStyle.swift && swiftlint --fix --path PazChurch/Components/PazPillButtonStyle.swift`

- [ ] **Step 4: Commit**

```bash
git add kmp-mobile/ios/PazChurch/Components/PazPillButtonStyle.swift
git commit -m "feat(ios): add PazPillButtonStyle pill button component"
```

---

### Task 4: `GlassBlurBackground` component

**Files:**
- Create: `kmp-mobile/ios/PazChurch/Components/GlassBlurBackground.swift`

**Interfaces:**
- Consumes: `PazColors.heroGradient`
- Produces: `View.glassBlurBackground(gradient: LinearGradient = PazColors.heroGradient) -> some View` modifier — applies the gradient behind the view, then a thin material blur, for hero/nav areas.

- [ ] **Step 1: Write the component**

```swift
import SwiftUI

// MARK: - GlassBlurBackground

extension View {
    /// Applies a brand gradient background with a frosted material layer on top,
    /// used behind hero sections and nav-adjacent chrome in the 2026-09 restyle.
    func glassBlurBackground(gradient: LinearGradient = PazColors.heroGradient) -> some View {
        background(
            ZStack {
                gradient
                Rectangle().fill(.ultraThinMaterial)
            }
            .ignoresSafeArea()
        )
    }
}
```

- [ ] **Step 2: Build to verify it compiles**

Run: `cd kmp-mobile/ios && xcodebuild -project PazChurch.xcodeproj -scheme PazChurch -destination 'generic/platform=iOS Simulator' build 2>&1 | tail -30`
Expected: `** BUILD SUCCEEDED **`

- [ ] **Step 3: Format**

Run: `cd kmp-mobile/ios && swiftformat PazChurch/Components/GlassBlurBackground.swift && swiftlint --fix --path PazChurch/Components/GlassBlurBackground.swift`

- [ ] **Step 4: Commit**

```bash
git add kmp-mobile/ios/PazChurch/Components/GlassBlurBackground.swift
git commit -m "feat(ios): add GlassBlurBackground hero background modifier"
```

---

## Screen Migration Tasks (5–25)

Each screen task follows the same repeatable procedure. Apply it to the file named in
that task's **Files** section.

**Standard migration procedure (applies to every task below):**

1. Read the target file in full.
2. Find every card-like container currently styled as
   `.background(PazColors.surface)` / `.background(PazColors.surface2)` followed by
   `.cornerRadius(_)` or `RoundedRectangle(cornerRadius:).fill(PazColors.surface)` —
   replace with `GlassCard { ... }` (wrap the inner content) or `.glassCard()`
   (if it's simpler to apply as a modifier to the existing view), choosing
   `radius: PazSpacing.cardRadiusLarge` for hero/full-width cards and the default
   `PazSpacing.cardRadiusCompact` for list-row/small cards.
3. Find every primary action `Button` (solid-fill call-to-action, e.g. "Salvar",
   "Entrar", "Confirmar") — replace its existing `.background(...).cornerRadius(...)`
   or custom style with `.buttonStyle(.pazPillPrimary)`. Secondary/outline buttons get
   `.buttonStyle(.pazPillSecondary)`.
4. If the screen has a hero/header area currently using a flat gradient background
   (e.g. `.background(PazColors.heroGradient)`), replace with
   `.glassBlurBackground()`.
5. Do **not** change any ViewModel calls, state properties, navigation, or
   loading/error/empty-state branching logic — styling only.
6. Verify screen states are still all present: search the file for
   `viewModel.isLoading`, `viewModel.error`, empty-state checks — confirm none were
   deleted.
7. Build, then manually run the app in Simulator (Debug/staging config) and visually
   check this screen in both light and dark mode, and in every state reachable
   (loading/error/empty/loggedIn/loggedOut as applicable to that screen).
8. Format and commit.

- [ ] **Step A: Apply the standard migration procedure above to this task's file**
- [ ] **Step B: Build**

Run: `cd kmp-mobile/ios && xcodebuild -project PazChurch.xcodeproj -scheme PazChurch -destination 'generic/platform=iOS Simulator' build 2>&1 | tail -30`
Expected: `** BUILD SUCCEEDED **`

- [ ] **Step C: Format**

Run (substitute the task's file path): `cd kmp-mobile/ios && swiftformat <path> && swiftlint --fix --path <path>`

- [ ] **Step D: Manual verification**

Run app in Simulator (Debug config), navigate to this screen, check light/dark mode
and all reachable states per Step 6/7 above.

- [ ] **Step E: Commit**

```bash
git add <path>
git commit -m "style(ios): migrate <ScreenName> to glassmorphic components"
```

---

### Task 5: `Navigation/MainTabView.swift`

**Files:** `kmp-mobile/ios/PazChurch/Navigation/MainTabView.swift`
Apply the standard migration procedure. If the tab bar container has custom
background styling, apply `.glassBlurBackground()` to it; otherwise skip step 4.

### Task 6: `Features/Home/HomeView.swift`

**Files:** `kmp-mobile/ios/PazChurch/Features/Home/HomeView.swift`
This screen has a hero banner carousel, weekday picker row, and content section cards
(announcements/contribution/agenda) — each content section card becomes a `GlassCard`.
Any CTA buttons become `.pazPillPrimary`.

### Task 7: `Features/Auth/LoginView.swift`

**Files:** `kmp-mobile/ios/PazChurch/Features/Auth/LoginView.swift`
The login form container becomes a `GlassCard`; "Entrar" and social-login buttons
become `.pazPillPrimary` / `.pazPillSecondary`.

### Task 8: `Features/Account/AccountView.swift`

**Files:** `kmp-mobile/ios/PazChurch/Features/Account/AccountView.swift`

### Task 9: `Features/Academy/AcademyView.swift`

**Files:** `kmp-mobile/ios/PazChurch/Features/Academy/AcademyView.swift`

### Task 10: `Features/Academy/VideoPlayerView.swift`

**Files:** `kmp-mobile/ios/PazChurch/Features/Academy/VideoPlayerView.swift`
Player chrome/controls overlay is a good candidate for `.glassBlurBackground()`.

### Task 11: `Features/Agenda/AgendaListView.swift`

**Files:** `kmp-mobile/ios/PazChurch/Features/Agenda/AgendaListView.swift`

### Task 12: `Features/Agenda/AgendaDetailView.swift`

**Files:** `kmp-mobile/ios/PazChurch/Features/Agenda/AgendaDetailView.swift`

### Task 13: `Features/Formularios/FormulariosView.swift`

**Files:** `kmp-mobile/ios/PazChurch/Features/Formularios/FormulariosView.swift`

### Task 14: `Features/Formularios/FormDetailView.swift`

**Files:** `kmp-mobile/ios/PazChurch/Features/Formularios/FormDetailView.swift`

### Task 15: `Features/Formularios/FormSubmissionsListView.swift`

**Files:** `kmp-mobile/ios/PazChurch/Features/Formularios/FormSubmissionsListView.swift`

### Task 16: `Features/LifeGroupStudy/LifeGroupStudyListView.swift`

**Files:** `kmp-mobile/ios/PazChurch/Features/LifeGroupStudy/LifeGroupStudyListView.swift`

### Task 17: `Features/LifeGroupStudy/LifeGroupStudyDetailView.swift`

**Files:** `kmp-mobile/ios/PazChurch/Features/LifeGroupStudy/LifeGroupStudyDetailView.swift`

### Task 18: `Features/LifeGroupStudy/LifeGroupStudyEditorView.swift`

**Files:** `kmp-mobile/ios/PazChurch/Features/LifeGroupStudy/LifeGroupStudyEditorView.swift`
Form fields/editor container becomes `GlassCard`; "Salvar"/"Confirmar" buttons become
`.pazPillPrimary`.

### Task 19: `Features/MemberJourney/MemberJourneyView.swift`

**Files:** `kmp-mobile/ios/PazChurch/Features/MemberJourney/MemberJourneyView.swift`

### Task 20: `Features/Ministries/MinistriesView.swift`

**Files:** `kmp-mobile/ios/PazChurch/Features/Ministries/MinistriesView.swift`

### Task 21: `Features/Ministries/MinistryDetailView.swift`

**Files:** `kmp-mobile/ios/PazChurch/Features/Ministries/MinistryDetailView.swift`

### Task 22: `Features/Notifications/NotificationPrefsView.swift`

**Files:** `kmp-mobile/ios/PazChurch/Features/Notifications/NotificationPrefsView.swift`

### Task 23: `Features/Profile/ProfileView.swift`

**Files:** `kmp-mobile/ios/PazChurch/Features/Profile/ProfileView.swift`

### Task 24: `Features/Profile/EditProfileView.swift`

**Files:** `kmp-mobile/ios/PazChurch/Features/Profile/EditProfileView.swift`
Form container becomes `GlassCard`; "Salvar" button becomes `.pazPillPrimary`.

### Task 25: `Features/Search/SearchView.swift`

**Files:** `kmp-mobile/ios/PazChurch/Features/Search/SearchView.swift`

---

### Task 26: `Components/SkeletonView.swift` loading-state parity

**Files:**
- Modify: `kmp-mobile/ios/PazChurch/Components/SkeletonView.swift`

**Interfaces:**
- Consumes: `PazSpacing.cardRadiusCompact` (Task 1)

Skeleton loading placeholders should match the new card radius so loading states
don't visually jump to a different shape once content loads.

- [ ] **Step 1: Read the current file**

Run: `cat kmp-mobile/ios/PazChurch/Components/SkeletonView.swift`

- [ ] **Step 2: Update any hardcoded corner radius values to `PazSpacing.cardRadiusCompact`**

Locate `cornerRadius(` calls in the file and replace numeric literals with
`PazSpacing.cardRadiusCompact` (or `cardRadiusLarge` if the skeleton represents a
hero-sized placeholder).

- [ ] **Step 3: Build**

Run: `cd kmp-mobile/ios && xcodebuild -project PazChurch.xcodeproj -scheme PazChurch -destination 'generic/platform=iOS Simulator' build 2>&1 | tail -30`
Expected: `** BUILD SUCCEEDED **`

- [ ] **Step 4: Commit**

```bash
git add kmp-mobile/ios/PazChurch/Components/SkeletonView.swift
git commit -m "style(ios): align skeleton loading radius with glass rebrand"
```

---

### Task 27: Full regression pass + PR

**Files:** none (verification only)

- [ ] **Step 1: Run full iOS build**

Run: `cd kmp-mobile/ios && xcodebuild -project PazChurch.xcodeproj -scheme PazChurch -destination 'generic/platform=iOS Simulator' build 2>&1 | tail -50`
Expected: `** BUILD SUCCEEDED **`

- [ ] **Step 2: Run shared KMP tests (business logic untouched, must still pass)**

Run: `./gradlew :shared:allTests`
Expected: all tests pass

- [ ] **Step 3: Manual walkthrough**

Launch the app in Simulator (Debug/staging config). Navigate through every tab and
every screen touched in Tasks 5–25. For each: toggle light/dark mode via Simulator
Settings, and exercise loading/error/empty states where feasible (e.g. airplane mode
for error state).

- [ ] **Step 4: Push branch and open PR**

```bash
git push -u origin feature/ios-glass-rebrand
gh pr create --title "iOS: glassmorphic rebrand (cards, blur, pill buttons)" --body "$(cat <<'EOF'
## Summary
- New glass/pill design-system components (GlassCard, PazPillButtonStyle, GlassBlurBackground)
- All 21 iOS screens migrated to the new components, including LifeGroupStudy (3 screens: List/Detail/Editor), rebuilt on top of `feat/life-groups-ministries-split-clean` (which merges `develop`) since that feature isn't present on `main`
- No color palette changes; Android out of scope (follow-up PR)

## Test plan
- [ ] Build succeeds
- [ ] Manual walkthrough of all screens in light + dark mode
- [ ] Loading/error/empty states verified per screen

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review Notes

- **Spec coverage:** visual language (Tasks 2–4), component architecture (Tasks 2–4),
  screen migration for all 21 screens (Tasks 5, 6–25), skeleton parity (Task 26),
  states/dark-light verification (embedded in every screen task step D/6-7), iOS-only
  scope with Android excluded (Global Constraints + Task 27 PR body) — all covered.
- **Type consistency:** `GlassCard` (Task 2), `.glassCard()` (Task 2), `.pazPillPrimary`
  / `.pazPillSecondary` (Task 3), `.glassBlurBackground()` (Task 4) are used with
  identical names/signatures across all screen tasks.
- No placeholder steps — every code step contains real, compilable Swift.
