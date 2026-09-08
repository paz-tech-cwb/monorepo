# iOS Glassmorphic Rebrand — Design

## Context

Restyle the kmp-mobile iOS app (SwiftUI) to a glassmorphic visual language shown in
reference screenshots: frosted/translucent cards over gradient backgrounds, blurred
surfaces, pill-shaped solid buttons, soft large corner radii.

This is phase 1 of a larger two-platform rebrand. Android is explicitly out of scope
here and will be a separate follow-up branch/PR once the iOS design system is proven
out. Full scope originally requested (both platforms, all 44 screens) was too large
for one branch — this spec covers iOS only, all 21 screens.

## Goals

- Introduce a small set of reusable glass/pill design-system components.
- Migrate all 21 existing SwiftUI screens to use them in place of ad-hoc card/button
  styling.
- Keep the existing `PazColors` brand palette (navy/blue gradient family, gold accent)
  unchanged — no new yellow highlight block (per product decision).
- Preserve all required screen states (loading, error, empty, loggedIn, loggedOut,
  dark, light) per `kmp-mobile/docs/CODING_GUIDELINES.md`.

## Non-goals

- Android (Compose Multiplatform) restyle — separate follow-up.
- New color tokens / new accent colors.
- Any change to navigation structure, data flow, or business logic.

## Visual language

- Frosted/translucent cards using `.ultraThinMaterial` (or `.regularMaterial` where
  more opacity/contrast is needed for readability), replacing flat
  `PazColors.surface` card backgrounds.
- Pill-shaped, fully-rounded primary buttons (solid navy/black fill, white label),
  replacing current rounded-rect buttons.
- Larger corner radii app-wide: ~24–28pt for cards, full pill (height/2) for buttons.
- Depth via soft shadow + blur rather than hard 1px borders.
- Existing `PazColors` gradients (`heroGradient`, `featuredCardGradient`, etc.) remain
  the background layer that glass cards float over.

## Component architecture

New components under `kmp-mobile/ios/PazChurch/Components/`:

- **`GlassCard`** — container view / `ViewModifier` applying material background,
  rounded corners, soft shadow. Configurable material style (thin/regular) for
  contrast needs. Replaces per-screen `.background(PazColors.surface).cornerRadius(_)`
  calls.
- **`PazPillButtonStyle`** — `ButtonStyle` conformances for primary and secondary
  variants, pill-shaped, using existing `PazColors` for fill/label color. Exposed via
  `.buttonStyle(.pazPillPrimary)` / `.buttonStyle(.pazPillSecondary)`.
- **`GlassBlurBackground`** — reusable blurred gradient background modifier for hero
  sections / nav bar areas needing a frosted-over-gradient look.

`PazSpacing` gains new tokens for the larger radii (e.g. `cardRadiusLarge`,
`pillRadius`) rather than hardcoding magic numbers in the new components.
`PazColors`/`PazTypography` are extended, not replaced.

## Screen migration

Each of the 21 screens in `kmp-mobile/ios/PazChurch/Features/` (plus
`Navigation/MainTabView.swift`) is migrated individually to consume the new
components instead of inline styling. This is mechanical per-screen work, not a
redesign of layout/content — cards become `GlassCard`, buttons become
`.pazPillPrimary`/`.pazPillSecondary`, hero/nav backgrounds become
`GlassBlurBackground` where applicable.

Per `docs/CODING_GUIDELINES.md`, each touched screen must still correctly render its
required states (loading, error, empty, loggedIn, loggedOut) in both light and dark
mode after migration — swap `.background(PazColors.surface)`-style card usage only,
don't drop existing state-handling branches.

## Testing / verification

- No new unit-testable logic is introduced (visual-only change), so this is not a
  TDD-first change — but existing screen ViewModels/logic are untouched, so existing
  tests must still pass (`./gradlew :shared:allTests`, iOS unit tests if any).
- Manual verification: build and run the iOS app (Debug/staging config), visually
  check each of the 21 migrated screens in both light and dark mode, plus loading/
  error/empty states where reachable.
- Run `swiftformat` + `swiftlint --fix` before commit, per repo convention.

## Rollout / branching

- New branch off `fix/estudo-do-life-and-auth-fixes`'s base (`main`), named for this
  work (e.g. `feature/ios-glass-rebrand`).
- Single PR covering the design-system components + all 21 screen migrations.
- Android rebrand is a separate, later PR — not part of this branch.
