# Paz Design System

Design tokens and component specs for the KMP mobile app. Android uses Jetpack Compose; iOS uses SwiftUI. All theme files live in `:android/src/main/kotlin/br/church/paz/android/ui/theme/` and `ios/PazChurch/Theme/`.

---

## Colors

### Brand
| Token | Hex | Usage |
|---|---|---|
| `PrimaryBlue` | `#043A6F` | Primary actions, icons, focus states |
| `SecondaryBlue` | `#6784AE` | Secondary actions, muted accents |
| `Cultured` | `#BCC1CD` | Tertiary / neutral accent |

### Light Palette
| Token | Hex |
|---|---|
| `Surface` | `#FFFFFF` |
| `Background` | `#F5F5F7` |
| `OnSurface` | `#1A1A2E` |
| `Border` | `#EAEEF5` |
| `PrimaryTint` | `#E8F0FB` |
| `PrimaryContainer` | `#DEE6F4` |
| `SecondaryContainer` | `#E6ECF7` |
| `Success` | `#2E7D32` |
| `Error` | `#D32F2F` |
| `ErrorTint` | `#FFEEEA` |

### Dark Palette
| Token | Hex |
|---|---|
| `DarkBackground` | `#0F1115` |
| `DarkSurface` | `#171A21` |
| `DarkOnBackground` | `#EAEFF7` |
| `DarkOnSurface` | `#D6DEE9` |
| `DarkDivider` | `#2A2F38` |
| `DarkIcon` | `#E6ECF3` |
| `DarkIconMuted` | `#B9C4D1` |
| `DarkPrimaryContainer` | `#0C274A` |
| `DarkSecondaryContainer` | `#263447` |
| `DarkError` | `#FF4D4F` |

**Files:** `PazColors.kt` (raw values) · `PazColorScheme.kt` (Material3 scheme mapping) · `PazColors.swift` (adaptive iOS tokens)

---

## Typography

**File:** `PazTypography.kt`

| Style | Size | Weight | Line Height |
|---|---|---|---|
| `displayLarge` | 32sp | Bold | 40sp |
| `headlineMedium` | 24sp | Bold | 32sp |
| `titleLarge` | 18sp | Bold | 24sp |
| `titleMedium` | 16sp | SemiBold | 22sp |
| `bodyLarge` | 15sp | Normal | 22sp |
| `bodyMedium` | 14sp | Normal | 20sp |
| `bodySmall` | 13sp | Normal | 18sp |
| `labelSmall` | 11sp | Bold | 16sp · +1sp tracking |

---

## Spacing

**File:** `PazSpacing.kt`

| Token | Value | Common use |
|---|---|---|
| `Xs` | 4dp | Icon padding, tight gaps |
| `Sm` | 8dp | Internal component spacing |
| `Md` | 12dp | Card gap, row padding |
| `Lg` | 16dp | Page horizontal padding |
| `Xl` | 24dp | Section spacing |
| `Xxl` | 32dp | Large section gaps |
| `Xxxl` | 48dp | Hero / top spacing |

Aliases: `PageHorizontal = Lg` · `CardGap = Md`

---

## Shapes

**File:** `PazShapes.kt`

| Token | Radius | Material3 slot |
|---|---|---|
| `extraSmall` | 4dp | — |
| `small` | 8dp | — |
| `medium` | 12dp | — |
| `large` | 16dp | Cards |
| `extraLarge` | 24dp | — |
| `PazShapeXxl` | 32dp | Bottom sheets |
| `PazShapePill` | 100dp | Buttons, badges |

---

## Elevation

**File:** `PazElevation.kt`

| Level | dp | Use |
|---|---|---|
| `Low` | 2dp | Default cards |
| `Medium` | 6dp | Elevated cards, dropdowns |
| `High` | 12dp | Modals |
| `Floating` | 20dp | FABs, bottom sheets |

---

## Theme Entry Point

**Android — `PazTheme.kt`**
Wraps `MaterialTheme` with `PazLightColorScheme` / `PazDarkColorScheme`, `PazTypography`, and `PazShapes`. Exposes `LocalPazDarkTheme` composition local.

**iOS — `PazThemeModifier` / `.pazTheme()`**
Applied at app root in `PazChurchApp.swift`. Sets `pazBackground`, `.tint(pazPrimary)`, and respects system color scheme.

**Preview annotation — `PazPreviews.kt`**
Use `@PazPreview` on every composable to get light + dark previews automatically.

```kotlin
@PazPreview
@Composable
private fun MyComponentPreview() {
    PazTheme { MyComponent() }
}
```

---

## Components

All Android components live in `:android/src/main/kotlin/br/church/paz/android/ui/components/`.

---

### PazButton

**File:** `PazButton.kt`

| Prop | Type | Default |
|---|---|---|
| `text` | String | — |
| `onClick` | () -> Unit | — |
| `variant` | PazButtonVariant | `Primary` |
| `enabled` | Boolean | `true` |
| `loading` | Boolean | `false` |

**Variants:** `Primary` · `Secondary` · `Destructive` · `Ghost`

- Shape: `PazShapePill`
- Loading state: replaces label with `CircularProgressIndicator` (18dp, 2dp stroke)
- **iOS:** Native `Button` + custom `ButtonStyle` with `Capsule()` clip shape

---

### PazCard

**File:** `PazCard.kt`

**Variants:**
- `Default` — white surface, 2dp elevation, 16dp corners
- `Elevated` — 6dp elevation
- `Outlined` — 1dp border (`colorScheme.outline`), no elevation

- **iOS:** `.background(pazSurface).cornerRadius(16)` + shadow or stroke overlay depending on variant

---

### PazTopBar

**File:** `PazTopBar.kt`

| Prop | Type | Default |
|---|---|---|
| `title` | String | — |
| `onBack` | (() -> Unit)? | `null` |
| `actions` | @Composable () -> Unit | `{}` |
| `scrollBehavior` | TopAppBarScrollBehavior? | `null` |

- Uses `LargeTopAppBar`; back icon is `AutoMirrored.ArrowBack` labeled "Voltar"
- Scroll: background shifts from `background` to `surface`
- **iOS:** Native `.navigationTitle` + `.navigationBarTitleDisplayMode(.large)`. Do not override the back chevron.

---

### PazBottomNavBar

**File:** `PazBottomNavBar.kt`

- Selected tab: animated pill (`PazShapePill`) with primary background + label
- Unselected tab: icon only at 40% opacity, no label
- No tonal elevation; surface at 92% opacity
- **iOS:** Use a custom `HStack` overlay if the animated pill is required; native `TabView` cannot replicate it. Tint via `.tint(Color.pazPrimary)`.

---

### PazMenuRow

**File:** `PazMenuRow.kt`

| Prop | Type | Default |
|---|---|---|
| `title` | String | — |
| `icon` | ImageVector | — |
| `onClick` | (() -> Unit)? | `null` |
| `trailing` | @Composable (() -> Unit)? | `null` (→ chevron if `onClick` set) |
| `showDivider` | Boolean | `true` |

- Icon container: 34dp box, primary tint
- Divider inset-starts after icon + spacing
- **iOS:** Native `List` row with `Label`; divider is automatic

---

### PazSectionHeader

**File:** `PazSectionHeader.kt`

- Title rendered UPPERCASE in `labelSmall` / `onSurfaceVariant`
- Optional `actionLabel` → `TextButton` aligned trailing
- **iOS:** `HStack` with `.caption.bold()` + `Button`

---

### PazAvatar

**File:** `PazAvatar.kt`

| Prop | Type | Default |
|---|---|---|
| `name` | String | — |
| `imageUrl` | String? | `null` |
| `size` | Dp | 48dp |
| `showBorder` | Boolean | `true` |

- Fallback: initials (first + last name, uppercased) on `primary @ 10%` background
- Border: 1.5dp, `primary @ 25%`
- Image: `Coil3 AsyncImage`, `ContentScale.Crop`
- **iOS:** `AsyncImage` + `ZStack` with `Circle()` background and `strokeBorder` overlay

---

### PazRoleBadge

**File:** `PazBadge.kt`

- `labelSmall` text, primary color
- Background: `primary @ 12%`, 20dp corner radius
- Padding: 8dp horizontal · 2dp vertical
- **iOS:** `Text` with `.background(.pazPrimary.opacity(0.12)).clipShape(Capsule())`

---

### PazTextField

**File:** `PazTextField.kt`

| Prop | Type | Default |
|---|---|---|
| `value` | String | — |
| `onValueChange` | (String) -> Unit | — |
| `label` | String | — |
| `isError` | Boolean | `false` |
| `errorMessage` | String? | `null` |
| `enabled` | Boolean | `true` |
| `singleLine` | Boolean | `true` |
| `trailingIcon` | @Composable (() -> Unit)? | `null` |

- `OutlinedTextField`, `PazShapes.medium` (12dp)
- Focused border: `primary` · Unfocused: `outline` · Error: `error`
- Error message shown as `supportingText`
- **iOS:** `TextField` inside `VStack` with `RoundedRectangle` overlay + error text below

---

### PazEmptyState

**File:** `PazEmptyState.kt`

| Prop | Type |
|---|---|
| `icon` | ImageVector |
| `title` | String |
| `subtitle` | String |
| `actionLabel` | String? |
| `onAction` | (() -> Unit)? |

- Centered column layout with icon, title (`titleMedium`), subtitle (`bodyMedium`), optional `PazButton`
