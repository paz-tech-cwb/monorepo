# Home Screen Redesign — Paz Church KMP

**Date:** 2026-06-03  
**Scope:** UI only. No backend wiring. ViewModel/UiState contracts unchanged.  
**Reference:** `~/Downloads/design_handoff_paz_church/Home Native v2.html` + `README.md`

---

## 1. Files Changed

| File | Action |
|------|--------|
| `android/…/home/HomeScreen.kt` | Full rewrite |
| `ios/…/Features/Home/HomeView.swift` | Full rewrite |
| `android/…/theme/PazColors.kt` | Add `DarkCard2`, `DarkSlate` tokens |
| `android/…/theme/PazGradients.kt` | Add `FeaturedCard`, `FeaturedCardAlt`, `DizimosCard` gradients |
| `android/…/theme/PazTypography.kt` | Update `displayLarge` + `headlineMedium` to Playfair Display ExtraBold |
| `ios/…/Theme/PazColors.swift` | Rewrite to match Android palette (replaces old purple theme) |
| `shared/…/data/repository/HomeRepositoryImpl.kt` | Return mock data; real API call commented out |

No new files. No routing changes. No ViewModel changes.

---

## 2. Mock Data

`HomeRepositoryImpl` returns hardcoded data matching the HTML prototype:
- 3 featured cards: "Culto da Família", "Escola de Líderes", "Culto de Oração"
- Dízimos card: always present
- 7 day pills (Mon–Sun, Wednesday pre-selected)
- 3 agenda events: 10:00 / 19:30 / 20:00

---

## 3. Color Tokens

### Android additions to `PazColors.kt`
```kotlin
val DarkCard2  = Color(0xFF101F31)
val DarkSlate  = Color(0xFF97A6BC)
```

### iOS — full rewrite of `PazColors.swift`
Replace purple-based palette with the church brand palette:
- `pazPrimary` = `#032E58`
- `pazPrimaryMid` = `#0B4D8C`
- `pazPrimaryLight` = `#1565C0`
- `pazSky` = `#5B9BD5`
- `pazGold` = `#FFB300`
- `pazInk` = `#16243A`
- `pazSlate` = `#5A6B82`
- `pazSlateLight` = `#8A94A6`
- Dark variants via adaptive `Color(UIColor { … })`

---

## 4. Typography

### Android — `PazTypography.kt`
```kotlin
val PazDisplayFont = FontFamily(Font(R.font.playfair_display_extrabold))

displayLarge = TextStyle(
    fontFamily = PazDisplayFont,
    fontWeight = FontWeight.W800,
    fontSize = 34.sp, lineHeight = 36.sp
)
headlineMedium = TextStyle(
    fontFamily = PazDisplayFont,
    fontWeight = FontWeight.W800,
    fontSize = 23.sp, lineHeight = 26.sp
)
```

### iOS — `PazTypography.swift` extension
```swift
extension Font {
    static func playfair(_ size: CGFloat, _ weight: Font.Weight = .heavy) -> Font {
        .custom("PlayfairDisplay-ExtraBold", size: size)
    }
}
```

---

## 5. Android Home Screen

### Layout
Single `Scaffold` with `TopAppBarScrollBehavior.exitUntilCollapsed`. No separate hero header. One `LazyColumn` owns the whole scroll.

### Collapsing app bar
- **Expanded state:** Eyebrow (date, uppercase 11.5sp `labelSmall`, `PrimaryLight`), Playfair 34sp greeting `"Olá, {name}"` in `Primary` (light) / `ink` (dark). Bell icon button right.
- **Collapsed state:** Playfair 19sp compact title fades in. Background: `bg` color + shadow on Android.
- Bell badge: `8dp` gold dot, `1.6dp` white border.

### Featured Events carousel
- `LazyRow` with `snapFlingBehavior`
- Cards: `286×176dp`, `22dp` radius
- Background: `LinearGradient(158°, #0A335F → #072E5A → #06243F)` / alt: `#0E4683 → #0B3A6B → #072E58`
- Cross watermark: `Vector` drawable at 8% alpha, `158×158dp`, rotated -9°, bottom-right
- Gold pill badge: `PazColors.Gold` background, dark text, `100dp` radius, 11sp bold uppercase
- Title: Playfair 23sp bold white; subtitle: 13.5sp white 72% alpha
- Dot indicators: inactive `7×7dp` circle; active `20×7dp` capsule animated with `animateIntAsState`
- Section header: "Eventos" Playfair 23sp + "Ver todos" link with arrow icon

### Dízimos & Ofertas card
- `16dp` horizontal margin, `24dp` radius
- Radial gradient: `RadialGradientShader` centered at `(82%, -8%)`, `#1257A0 → #0B4D8C → #07315E`
- Shadow: `elevation = 12.dp`, `spotColor = Color(0xB307315E)`
- Eyebrow: "DÍZIMOS & OFERTAS" 11sp uppercase, white 60%
- Title: Playfair 27sp bold white
- Subtitle: 14sp white 70%
- PIX button: white fill, `#0B3A6B` text, `52dp` height, pill
- Cartão button: white 13% fill + 1dp white 24% border + `blur` (RenderEffect API 31+, fallback semi-transparent), white text

### Agenda
- Section header: "Agenda" + "Mês completo" link
- Day strip: `LazyRow`, `52×74dp` pills, `18dp` radius
  - Inactive: `surface` bg + `line` border
  - Active: `LinearGradient(170°, #0A3360 → #06294C)`, shadow `elevation = 8.dp`
  - Gold `4dp` dot at bottom for active
- Event cards: `Surface` with `18dp` radius, 1dp `outline` border at 50% alpha, shadow `elevation = 4.dp`
  - Time: 15.5sp bold `PrimaryLight`, `50dp` column
  - Dot: `10dp` circle `Primary` color + `4dp` `tint` ring
  - Title: 15.5sp bold `ink`
  - Location: `Pin` vector icon in `#E0533D` + 13sp `slate` text

### Entrance animation
All top-level items: `AnimatedVisibility` with `fadeIn(tween(600, CubicBezier(.2,.7,.2,1))) + slideInVertically(13dp)`, staggered +65ms per item index.

### Dark mode
All surface/background/text colors via `MaterialTheme.colorScheme`. Gradients are the same dark blue in both modes. Active tab dot uses `Sky` in dark mode.

### Landscape
No layout changes needed — `LazyColumn` scrolls, carousel and day strip scroll horizontally.

---

## 6. iOS Home Screen

### Layout
`NavigationStack` with `ScrollView`. Large title area rendered as the first item in the scroll content (not a native `navigationTitle` large title — gives full Playfair font control). Compact title fades in via scroll offset tracking with a `PreferenceKey`.

### Collapsing header
- Scroll offset tracked via `GeometryReader` + `PreferenceKey`
- At offset > 64pt: compact title (16pt system bold, centered) fades in
- Toolbar: bell icon button (right), custom compact title overlay (center) at opacity driven by scroll
- `toolbarBackground(.ultraThinMaterial)` activates at same threshold

### Featured Events carousel
- `TabView(.page(indexDisplayMode: .never))` for native paging + momentum
- Cards: `286×176pt`, `22pt` corner radius, same gradients as Android
- Cross watermark: `Image(systemName: "cross.fill")` or custom SVG at 8% opacity
- Gold pill badge: `Capsule()` fill with `.pazGold`, dark text
- Custom dot row: `HStack` of `Capsule` shapes — active `20pt` wide, animated with `.spring`

### Dízimos & Ofertas card
- `ZStack`: `RadialGradient` background (same stops as Android)
- PIX: white `Capsule` button, `52pt` height
- Cartão: `.ultraThinMaterial` + border + `Capsule`

### Agenda day strip
- `ScrollView(.horizontal, showsIndicators: false)`
- `52×74pt` pills — same active/inactive styling
- `@State var selectedDay: Int`, animated with `.spring`

### Event cards
- `RoundedRectangle(cornerRadius: 18)` with `strokeBorder`
- Pin icon: `Image(systemName: "mappin.fill")` in `Color(hex: "E0533D")`

### Entrance animation
`.transition(.opacity.combined(with: .move(edge: .bottom)))` + `.animation(.spring(response: 0.6, dampingFraction: 0.8).delay(Double(index) * 0.065))`

### Dark mode
All colors adaptive via `Color(UIColor { trait in … })`. Gradient cards same in both modes.

### Landscape
`ScrollView` + `VStack` reflows naturally. Carousel and day strip scroll horizontally.

---

## 7. Out of Scope

- Tab bar redesign (app shell level — separate ticket)
- Backend wiring / live data
- Other screens (Academia, Perfil, etc.)
- Pull-to-refresh
- Notification badge count from API
