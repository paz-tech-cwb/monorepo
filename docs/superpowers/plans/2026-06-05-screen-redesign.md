# Screen Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **iOS tasks:** invoke `swiftui-expert-skill` + `swift-concurrency` before writing SwiftUI code.
> **Android tasks:** invoke `kotlin-project-feature-implementation` before writing Compose code.

**Goal:** Redesign Academy, Account/Conta, Formulários, Profile, AgendaDetail, and Full Agenda List screens for Android (Compose) and iOS (SwiftUI) to match the design handoff at `~/Downloads/design_handoff_paz_church/`, covering all design states.

**Architecture:** Each screen is modified in-place using the existing UDF pattern. New shared components (icon containers, gold badges, pill chips) are added to the existing component files. A new `AgendaListScreen`/`AgendaListView` is created for "ver todos" from Home.

**Tech Stack:** Kotlin/Compose (Android, API 35, minSdk 26), SwiftUI (iOS 19.4), KMP shared models, DM Sans font (Android — already in `res/font/`), SF Pro system font (iOS — no custom fonts). Color tokens in `PazColors.kt` / `PazColors.swift`. Formatting: ktlint (Android), SwiftFormat + SwiftLint (iOS).

**Design state matrix** (from `TWEAK_DEFAULTS` in each HTML file):

| Screen | States to implement |
|--------|-------------------|
| Academy | loading, error, empty, `loggedIn=true`, `loggedIn=false` (lock + promo), `resume=true` (resume banner), dark/light |
| Account | loading, `user=present`, `user=null` (embedded login), dark/light |
| Formulários | loading, error, empty, content, dark/light |
| Profile | loading, `loggedIn=true` (with `roleBadge`, `journey`), `loggedIn=false` (visitor), dark/light |
| Event Detail | loading, error, content with `tab=geral/info`, dark/light |
| Agenda List | loading, empty, content, dark/light |

**Coding rules:** See `docs/CODING_GUIDELINES.md`. iOS: `@Observable` only, `.task {}` modifier, no custom fonts. Android: `viewModelScope`, `collectAsStateWithLifecycle`, DM Sans typography.

---

## Task 0: Android — Add ktlint

**Files:**
- Modify: `android/build.gradle.kts`
- Modify: `gradle/libs.versions.toml`

- [ ] Check if ktlint is already configured:
```bash
grep -r "ktlint" /Users/jonathalima/Developer/church/kmp-mobile/gradle/libs.versions.toml /Users/jonathalima/Developer/church/kmp-mobile/android/build.gradle.kts 2>/dev/null
```

- [ ] If not present, add to `gradle/libs.versions.toml` in `[versions]`:
```toml
ktlint = "12.1.2"
```
And in `[plugins]`:
```toml
ktlint = { id = "org.jlleitschuh.gradle.ktlint", version.ref = "ktlint" }
```

- [ ] Add to `android/build.gradle.kts` plugins block:
```kotlin
alias(libs.plugins.ktlint)
```

- [ ] Add ktlint config block in `android/build.gradle.kts`:
```kotlin
ktlint {
    version.set("1.3.1")
    android.set(true)
    outputColorName.set("RED")
    reporters { reporter(org.jlleitschuh.gradle.ktlint.reporter.ReporterType.PLAIN) }
}
```

- [ ] Add plugin to `build-logic/convention-plugins.gradle.kts` if it exists — add `id("org.jlleitschuh.gradle.ktlint")` to the plugin management resolution.

- [ ] Sync and verify:
```bash
cd /Users/jonathalima/Developer/church/kmp-mobile
./gradlew :android:ktlintCheck 2>&1 | tail -20
```
Fix any formatting violations reported:
```bash
./gradlew :android:ktlintFormat
```

- [ ] Commit:
```bash
git add gradle/libs.versions.toml android/build.gradle.kts build-logic/
git commit -m "chore(android): add ktlint for code formatting enforcement"
```

---

## Task 1: Android — Update PazTypography to use DM Sans for all roles

**Files:**
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/theme/PazTypography.kt`

DM Sans is already in `android/src/main/res/font/`. Assign it to ALL typography roles including display/headline (no serif).

- [ ] Replace content of `PazTypography.kt`:

```kotlin
package br.church.paz.android.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import br.church.paz.android.R

val PazFont = FontFamily(
    Font(R.font.dm_sans_regular, FontWeight.Normal),
    Font(R.font.dm_sans_medium, FontWeight.Medium),
    Font(R.font.dm_sans_semibold, FontWeight.SemiBold),
    Font(R.font.dm_sans_bold, FontWeight.Bold),
)

val PazTypography = Typography(
    displayLarge  = TextStyle(fontFamily = PazFont, fontWeight = FontWeight.Bold,     fontSize = 34.sp, lineHeight = 40.sp),
    headlineLarge = TextStyle(fontFamily = PazFont, fontWeight = FontWeight.Bold,     fontSize = 32.sp, lineHeight = 38.sp),
    headlineMedium= TextStyle(fontFamily = PazFont, fontWeight = FontWeight.Bold,     fontSize = 28.sp, lineHeight = 34.sp),
    headlineSmall = TextStyle(fontFamily = PazFont, fontWeight = FontWeight.Bold,     fontSize = 24.sp, lineHeight = 30.sp),
    titleLarge    = TextStyle(fontFamily = PazFont, fontWeight = FontWeight.Bold,     fontSize = 22.sp, lineHeight = 28.sp),
    titleMedium   = TextStyle(fontFamily = PazFont, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, lineHeight = 24.sp),
    titleSmall    = TextStyle(fontFamily = PazFont, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, lineHeight = 20.sp),
    bodyLarge     = TextStyle(fontFamily = PazFont, fontWeight = FontWeight.Normal,   fontSize = 16.sp, lineHeight = 24.sp),
    bodyMedium    = TextStyle(fontFamily = PazFont, fontWeight = FontWeight.Normal,   fontSize = 14.sp, lineHeight = 20.sp),
    bodySmall     = TextStyle(fontFamily = PazFont, fontWeight = FontWeight.Normal,   fontSize = 12.sp, lineHeight = 16.sp),
    labelLarge    = TextStyle(fontFamily = PazFont, fontWeight = FontWeight.Medium,   fontSize = 14.sp, lineHeight = 20.sp),
    labelMedium   = TextStyle(fontFamily = PazFont, fontWeight = FontWeight.Medium,   fontSize = 12.sp, lineHeight = 16.sp),
    labelSmall    = TextStyle(fontFamily = PazFont, fontWeight = FontWeight.Bold,     fontSize = 11.sp, lineHeight = 14.sp, letterSpacing = 0.8.sp),
)
```

- [ ] Build:
```bash
./gradlew :android:assembleDebug 2>&1 | tail -10
```
Expected: `BUILD SUCCESSFUL`

- [ ] Commit:
```bash
git add android/src/main/kotlin/br/church/paz/android/ui/theme/PazTypography.kt
git commit -m "feat(android): apply DM Sans to all typography roles"
```

---

## Task 2: iOS — Update PazTypography to use SF Pro system font

**Files:**
- Modify: `ios/PazChurch/Theme/PazTypography.swift`

- [ ] Replace content:

```swift
import SwiftUI

enum PazTypography {
    // Display / Headline — SF Pro Heavy/Bold
    static let displayLarge   = Font.system(size: 34, weight: .heavy,    design: .default)
    static let headlineLarge  = Font.system(size: 32, weight: .bold,     design: .default)
    static let headlineMedium = Font.system(size: 28, weight: .bold,     design: .default)
    static let headlineSmall  = Font.system(size: 24, weight: .bold,     design: .default)

    // Title
    static let titleLarge  = Font.system(size: 22, weight: .bold,     design: .default)
    static let titleMedium = Font.system(size: 16, weight: .semibold, design: .default)
    static let titleSmall  = Font.system(size: 14, weight: .semibold, design: .default)

    // Body
    static let bodyLarge   = Font.system(size: 16, weight: .regular, design: .default)
    static let bodyMedium  = Font.system(size: 14, weight: .regular, design: .default)
    static let bodySmall   = Font.system(size: 12, weight: .regular, design: .default)

    // Label
    static let labelLarge  = Font.system(size: 14, weight: .medium, design: .default)
    static let labelMedium = Font.system(size: 12, weight: .medium, design: .default)
    static let labelSmall  = Font.system(size: 11, weight: .bold,   design: .default)
}
```

- [ ] Run SwiftFormat:
```bash
cd /Users/jonathalima/Developer/church/kmp-mobile/ios
swiftformat PazChurch/Theme/PazTypography.swift --config .swiftformat
```

- [ ] Commit:
```bash
git add ios/PazChurch/Theme/PazTypography.swift
git commit -m "feat(ios): use SF Pro system font for all typography roles"
```

---

## Task 3: Android — Add shared design-system components

**Files:**
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/components/PazComponents.kt`

- [ ] Check the end of the file:
```bash
tail -30 /Users/jonathalima/Developer/church/kmp-mobile/android/src/main/kotlin/br/church/paz/android/ui/components/PazComponents.kt
```

- [ ] Append after the last existing composable (before end of file):

```kotlin
/** 38 dp tinted icon container used in Conta / Formulários rows */
@Composable
fun PazIconContainer(
    icon: ImageVector,
    tint: Color,
    modifier: Modifier = Modifier,
    size: Dp = 38.dp,
) {
    Box(
        modifier = modifier
            .size(size)
            .clip(RoundedCornerShape(12.dp))
            .background(tint.copy(alpha = 0.14f)),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(size * 0.53f))
    }
}

/** Gold pill badge — "Gratuito", event time labels */
@Composable
fun PazGoldBadge(text: String, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(50.dp))
            .background(PazColors.Gold)
            .padding(horizontal = 10.dp, vertical = 4.dp),
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.labelSmall.copy(
                color = PazColors.GoldOnBadge,
                fontWeight = FontWeight.Bold,
            ),
        )
    }
}

/** Selectable pill chip for filter bars */
@Composable
fun PazPillChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val bg = if (selected) PazColors.Primary else MaterialTheme.colorScheme.surface
    val fg = if (selected) Color.White else MaterialTheme.colorScheme.onSurface
    Box(
        modifier = modifier
            .height(38.dp)
            .clip(RoundedCornerShape(50.dp))
            .background(bg)
            .then(
                if (!selected) Modifier.border(1.dp, PazColors.Primary.copy(0.18f), RoundedCornerShape(50.dp))
                else Modifier,
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium.copy(color = fg, fontWeight = FontWeight.SemiBold),
        )
    }
}
```

- [ ] Ensure these imports exist at the top of `PazComponents.kt` (add only missing ones):
```kotlin
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
```

- [ ] Format and build:
```bash
./gradlew :android:ktlintFormat
./gradlew :android:assembleDebug 2>&1 | tail -10
```

- [ ] Commit:
```bash
git add android/src/main/kotlin/br/church/paz/android/ui/components/PazComponents.kt
git commit -m "feat(android): add PazIconContainer, PazGoldBadge, PazPillChip to design system"
```

---

## Task 4: iOS — Add shared design-system components

**Files:**
- Create: `ios/PazChurch/Components/PazIconContainer.swift`
- Create: `ios/PazChurch/Components/PazGoldBadge.swift`
- Create: `ios/PazChurch/Components/PazPillChip.swift`

> First verify the Components directory is covered by the Xcode sources glob:
```bash
grep -n "sources\|Components" /Users/jonathalima/Developer/church/kmp-mobile/ios/project.yml | head -10
```
If the glob is `PazChurch/**/*.swift` no change needed.

- [ ] Create `ios/PazChurch/Components/PazIconContainer.swift`:

```swift
import SwiftUI

struct PazIconContainer: View {
    let icon: String
    let tint: Color
    var size: CGFloat = 38

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 12)
                .fill(tint.opacity(0.14))
                .frame(width: size, height: size)
            Image(systemName: icon)
                .font(.system(size: size * 0.5, weight: .medium))
                .foregroundStyle(tint)
        }
    }
}

#Preview {
    HStack {
        PazIconContainer(icon: "figure.walk", tint: .blue)
        PazIconContainer(icon: "bell", tint: .orange)
        PazIconContainer(icon: "door.left.hand.open", tint: .red)
    }
    .padding()
}
```

- [ ] Create `ios/PazChurch/Components/PazGoldBadge.swift`:

```swift
import SwiftUI

struct PazGoldBadge: View {
    let text: String

    var body: some View {
        Text(text)
            .font(PazTypography.labelSmall)
            .fontWeight(.bold)
            .foregroundStyle(Color(hex: "3A2600"))
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(PazColors.pazGold)
            .clipShape(Capsule())
    }
}
```

- [ ] Create `ios/PazChurch/Components/PazPillChip.swift`:

```swift
import SwiftUI

struct PazPillChip: View {
    let label: String
    let selected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            Text(label)
                .font(PazTypography.labelMedium)
                .fontWeight(.semibold)
                .foregroundStyle(selected ? .white : PazColors.ink)
                .padding(.horizontal, 16)
                .frame(height: 38)
                .background(selected ? PazColors.pazPrimary : PazColors.surface)
                .clipShape(Capsule())
                .overlay(Capsule().stroke(PazColors.pazPrimary.opacity(selected ? 0 : 0.18), lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}
```

- [ ] Run SwiftFormat on the new files:
```bash
cd /Users/jonathalima/Developer/church/kmp-mobile/ios
swiftformat PazChurch/Components/ --config .swiftformat
```

- [ ] Commit:
```bash
git add ios/PazChurch/Components/
git commit -m "feat(ios): add PazIconContainer, PazGoldBadge, PazPillChip"
```

---

## Task 5: Android — Redesign AcademyScreen

**Files:**
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/academy/AcademyScreen.kt`

**States to cover:** loading skeleton, error, empty (authenticated), `loggedIn=false` (lock card + promo gradient card), `loggedIn=true` content with filter chips, `resume=true` (resume banner at top of list), dark/light (automatic via MaterialTheme tokens).

- [ ] Replace full content of `AcademyScreen.kt`:

```kotlin
package br.church.paz.android.ui.features.academy

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.PlayArrow
import androidx.compose.material.icons.outlined.School
import androidx.compose.material.icons.outlined.Star
import androidx.compose.material.icons.outlined.VideoLibrary
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.navigation.Screen
import br.church.paz.android.ui.components.PazCardSkeleton
import br.church.paz.android.ui.components.PazGoldBadge
import br.church.paz.android.ui.components.PazPillChip
import br.church.paz.android.ui.components.PazSectionHeader
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.features.auth.LoginScreen
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.Course
import br.church.paz.shared.domain.model.CourseTrack
import coil3.compose.AsyncImage
import org.koin.androidx.compose.koinViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AcademyScreen(
    navController: NavController,
    contentPadding: PaddingValues = PaddingValues(),
    viewModel: AcademyViewModel = koinViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var showLoginSheet by remember { mutableStateOf(false) }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var selectedTrackIndex by remember { mutableIntStateOf(0) }

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                is AcademyEffect.NavigateToPlayer ->
                    navController.navigate(Screen.VideoPlayer.createRoute(effect.videoId))
            }
        }
    }

    if (showLoginSheet) {
        ModalBottomSheet(onDismissRequest = { showLoginSheet = false }, sheetState = sheetState) {
            LoginScreen(
                onLoginSuccess = { showLoginSheet = false; viewModel.refreshAuthState() },
                onDismiss = { showLoginSheet = false },
            )
        }
    }

    Column(Modifier.fillMaxSize()) {
        Box(
            Modifier
                .fillMaxWidth()
                .background(PazGradients.Hero)
                .statusBarsPadding()
                .padding(horizontal = PazSpacing.Xl, vertical = PazSpacing.Lg),
        ) {
            Column {
                Text("Conteúdo exclusivo", style = MaterialTheme.typography.bodySmall.copy(color = Color.White.copy(.5f)))
                Text("Academia\nPaz Church", style = MaterialTheme.typography.headlineMedium.copy(color = Color.White))
            }
        }

        Box(
            Modifier
                .fillMaxSize()
                .clip(RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
                .background(MaterialTheme.colorScheme.background),
        ) {
            when {
                uiState.isLoading  -> AcademySkeleton(contentPadding)
                uiState.error != null -> AcademyError(message = uiState.error!!, onRetry = viewModel::onRetry)
                !uiState.isAuthenticated && uiState.tracks.isEmpty() ->
                    LoggedOutPromo(onLogin = { showLoginSheet = true })
                uiState.tracks.isEmpty() -> AcademyEmpty()
                else -> AcademyContent(
                    uiState             = uiState,
                    selectedTrackIndex  = selectedTrackIndex,
                    onSelectTrack       = { selectedTrackIndex = it },
                    onCourseTap         = { course ->
                        if (uiState.isAuthenticated) viewModel.onVideoTapped(course.id)
                        else showLoginSheet = true
                    },
                    contentPadding      = contentPadding,
                )
            }
        }
    }
}

// ── Content state ─────────────────────────────────────────────────────────────

@Composable
private fun AcademyContent(
    uiState: AcademyUiState,
    selectedTrackIndex: Int,
    onSelectTrack: (Int) -> Unit,
    onCourseTap: (Course) -> Unit,
    contentPadding: PaddingValues,
) {
    LazyColumn(contentPadding = contentPadding, modifier = Modifier.fillMaxSize()) {
        item {
            Spacer(Modifier.height(PazSpacing.Lg))

            // Resume banner (loggedIn + resume state)
            if (uiState.isAuthenticated && uiState.resumeCourse != null) {
                ResumeBanner(
                    course   = uiState.resumeCourse,
                    modifier = Modifier.padding(horizontal = PazSpacing.Lg).padding(bottom = PazSpacing.Lg),
                )
            }

            // Track filter chips
            LazyRow(
                contentPadding        = PaddingValues(horizontal = PazSpacing.Lg),
                horizontalArrangement = Arrangement.spacedBy(PazSpacing.Sm),
            ) {
                itemsIndexed(uiState.tracks) { index, track ->
                    PazPillChip(
                        label    = track.title,
                        selected = selectedTrackIndex == index,
                        onClick  = { onSelectTrack(index) },
                    )
                }
            }
            Spacer(Modifier.height(PazSpacing.Lg))
        }

        val track = uiState.tracks.getOrNull(selectedTrackIndex) ?: uiState.tracks.first()

        if (!track.description.isNullOrBlank()) {
            item {
                Text(
                    track.description!!,
                    style    = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(.55f)),
                    modifier = Modifier.padding(horizontal = PazSpacing.Lg),
                )
                Spacer(Modifier.height(PazSpacing.Md))
            }
        }

        itemsIndexed(track.courses, key = { _, c -> c.id }) { index, course ->
            var visible by remember { mutableStateOf(false) }
            LaunchedEffect(course.id) { visible = true }
            AnimatedVisibility(
                visible = visible,
                enter   = fadeIn(tween(600, index * 65, CubicBezierEasing(.2f, .7f, .2f, 1f))) +
                          slideInVertically(tween(600, index * 65)) { 20 },
            ) {
                CourseCard(
                    course   = course,
                    onClick  = { onCourseTap(course) },
                    modifier = Modifier.padding(horizontal = PazSpacing.Lg).padding(bottom = PazSpacing.Md),
                )
            }
        }
        item { Spacer(Modifier.height(PazSpacing.Xl)) }
    }
}

@Composable
private fun ResumeBanner(course: Course, modifier: Modifier = Modifier) {
    Row(
        modifier          = modifier
            .fillMaxWidth()
            .clip(PazShapes.large)
            .background(MaterialTheme.colorScheme.surface)
            .clickable { }
            .padding(PazSpacing.Md),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        Box(
            Modifier.size(width = 72.dp, height = 48.dp).clip(PazShapes.medium).background(PazGradients.Card),
            Alignment.Center,
        ) {
            Icon(Icons.Outlined.PlayArrow, null, tint = Color.White, modifier = Modifier.size(24.dp))
        }
        Column(Modifier.weight(1f)) {
            Text("Continuar assistindo", style = MaterialTheme.typography.labelSmall.copy(color = PazColors.Accent))
            Text(course.title, style = MaterialTheme.typography.titleSmall, maxLines = 1)
        }
        PazGoldBadge(text = "Retomar")
    }
}

@Composable
private fun CourseCard(course: Course, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Row(
        modifier              = modifier
            .fillMaxWidth()
            .clip(PazShapes.large)
            .background(MaterialTheme.colorScheme.surface)
            .clickable(onClick = onClick)
            .padding(PazSpacing.Md),
        verticalAlignment     = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        Box(
            modifier         = Modifier.size(width = 104.dp, height = 68.dp).clip(RoundedCornerShape(10.dp)).background(PazGradients.Card),
            contentAlignment = Alignment.Center,
        ) {
            if (course.thumbnailUrl != null) {
                AsyncImage(model = course.thumbnailUrl, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
            } else {
                Icon(Icons.Outlined.VideoLibrary, null, tint = Color.White.copy(.7f), modifier = Modifier.size(28.dp))
            }
            Box(Modifier.size(28.dp).clip(RoundedCornerShape(50)).background(Color.White.copy(.22f)), Alignment.Center) {
                Icon(Icons.Outlined.PlayArrow, null, tint = Color.White, modifier = Modifier.size(16.dp))
            }
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(course.title, style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold), maxLines = 2)
            if (!course.description.isNullOrBlank()) {
                Text(course.description!!, style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(.5f)), maxLines = 1)
            }
        }
    }
}

// ── Logged-out state ──────────────────────────────────────────────────────────

@Composable
private fun LoggedOutPromo(onLogin: () -> Unit) {
    LazyColumn(
        modifier            = Modifier.fillMaxSize(),
        contentPadding      = PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Lg)) }
        item {
            Column(
                Modifier.fillMaxWidth().clip(PazShapes.large).background(MaterialTheme.colorScheme.surface).padding(PazSpacing.Xl),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
            ) {
                Box(Modifier.size(64.dp).clip(RoundedCornerShape(50)).background(PazColors.Primary.copy(.1f)), Alignment.Center) {
                    Icon(Icons.Outlined.Lock, null, tint = PazColors.Primary, modifier = Modifier.size(32.dp))
                }
                Text("Conteúdo exclusivo", style = MaterialTheme.typography.titleMedium)
                Text(
                    "Faça login para acessar todos os cursos da Academia Paz Church",
                    style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(.6f)),
                )
            }
        }
        item {
            Column(
                Modifier.fillMaxWidth().clip(PazShapes.large).background(PazGradients.Card).padding(PazSpacing.Xl),
                verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
            ) {
                Text("O que você encontra", style = MaterialTheme.typography.titleMedium.copy(color = Color.White))
                listOf(Icons.Outlined.School to "Cursos de discipulado", Icons.Outlined.VideoLibrary to "Videoaulas exclusivas", Icons.Outlined.Star to "Trilhas de aprendizado")
                    .forEach { (icon, label) ->
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
                            Icon(icon, null, tint = PazColors.Gold, modifier = Modifier.size(18.dp))
                            Text(label, style = MaterialTheme.typography.bodySmall.copy(color = Color.White.copy(.9f)))
                        }
                    }
                Spacer(Modifier.height(PazSpacing.Sm))
                Box(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(Color.White).clickable(onClick = onLogin).padding(vertical = 14.dp),
                    Alignment.Center,
                ) {
                    Text("Entrar na minha conta", style = MaterialTheme.typography.titleSmall.copy(color = PazColors.Primary))
                }
            }
        }
    }
}

// ── Trivial states ────────────────────────────────────────────────────────────

@Composable
private fun AcademyEmpty() {
    Box(Modifier.fillMaxSize(), Alignment.Center) {
        Text("Nenhum conteúdo disponível", style = MaterialTheme.typography.bodyMedium.copy(color = MaterialTheme.colorScheme.onSurface.copy(.5f)))
    }
}

@Composable
private fun AcademyError(message: String, onRetry: () -> Unit) {
    Box(Modifier.fillMaxSize(), Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(PazSpacing.Md), modifier = Modifier.padding(PazSpacing.Xl)) {
            Text(message, style = MaterialTheme.typography.bodySmall)
            br.church.paz.android.ui.components.PazButton(text = "Tentar Novamente", onClick = onRetry, modifier = Modifier.fillMaxWidth())
        }
    }
}

@Composable
private fun AcademySkeleton(contentPadding: PaddingValues) {
    LazyColumn(contentPadding = contentPadding, verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg), modifier = Modifier.fillMaxSize().padding(top = PazSpacing.Xl, start = PazSpacing.Lg, end = PazSpacing.Lg)) {
        item { PazSkeleton(height = 38.dp) }
        item { PazSkeleton(height = 24.dp, width = 160.dp) }
        repeat(4) { item { PazCardSkeleton() } }
    }
}
```

> `uiState.resumeCourse` and `uiState.isAuthenticated` may need to be added to `AcademyUiState` if not present. Check `AcademyUiState.kt` and add:
```kotlin
val isAuthenticated: Boolean = false,
val resumeCourse: Course? = null,
```
And set `isAuthenticated` from the ViewModel's auth check (already done in `AcademyViewModel.refreshAuthState()`).

- [ ] Check `AcademyUiState.kt`:
```bash
cat /Users/jonathalima/Developer/church/kmp-mobile/android/src/main/kotlin/br/church/paz/android/ui/features/academy/AcademyUiState.kt
```

- [ ] Add missing fields if needed, format, then build:
```bash
./gradlew :android:ktlintFormat && ./gradlew :android:assembleDebug 2>&1 | tail -10
```

- [ ] Commit:
```bash
git add android/src/main/kotlin/br/church/paz/android/ui/features/academy/
git commit -m "feat(android): redesign AcademyScreen — all states, pill chips, resume banner"
```

---

## Task 6: iOS — Redesign AcademyView

**Files:**
- Modify: `ios/PazChurch/Features/Academy/AcademyView.swift`
- Modify: `ios/PazChurch/Features/Academy/AcademyViewModel.swift` (add `resumeCourse` if missing)

**States:** loading, error, empty (auth), loggedOut (lock + promo), content with filter chips + optional resume banner, dark/light via PazColors adaptive tokens.

- [ ] Replace full content of `AcademyView.swift`:

```swift
import Shared
import SwiftUI

struct AcademyView: View {
    @State private var viewModel: AcademyViewModel
    @Environment(AuthenticationCoordinator.self) private var authCoordinator
    @State private var showLoginSheet = false
    @State private var selectedTrackIndex = 0

    init(academyRepository: AcademyRepository) {
        _viewModel = State(initialValue: AcademyViewModel(academyRepository: academyRepository))
    }

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                PazColors.background.ignoresSafeArea()
                VStack(spacing: 0) {
                    heroHeader
                    ZStack {
                        PazColors.background
                            .clipShape(RoundedRectangle(cornerRadius: 28))
                            .ignoresSafeArea(edges: .bottom)
                        screenContent
                    }
                }
            }
            .navigationBarHidden(true)
        }
        .sheet(isPresented: $showLoginSheet) {
            LoginView(authCoordinator: authCoordinator, onDismiss: { showLoginSheet = false })
        }
        .task { await viewModel.load(isAuthenticated: authCoordinator.isAuthenticated) }
        .onChange(of: authCoordinator.isAuthenticated) { _, auth in
            Task { await viewModel.load(isAuthenticated: auth) }
        }
    }

    // MARK: - States

    @ViewBuilder
    private var screenContent: some View {
        if viewModel.isLoading {
            loadingState
        } else if let error = viewModel.error {
            errorState(message: error)
        } else if !authCoordinator.isAuthenticated && viewModel.tracks.isEmpty {
            loggedOutPromo
        } else if viewModel.tracks.isEmpty {
            emptyState
        } else {
            contentState
        }
    }

    private var heroHeader: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Conteúdo exclusivo")
                .font(PazTypography.bodySmall)
                .foregroundStyle(.white.opacity(0.5))
            Text("Academia\nPaz Church")
                .font(PazTypography.headlineMedium)
                .foregroundStyle(.white)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 24)
        .padding(.top, 16)
        .padding(.bottom, 24)
        .background(PazColors.heroGradient)
    }

    private var contentState: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 0, pinnedViews: []) {
                // Resume banner
                if authCoordinator.isAuthenticated, let resume = viewModel.resumeCourse {
                    ResumeBanner(course: resume)
                        .padding(.horizontal, 20)
                        .padding(.top, 20)
                        .padding(.bottom, 12)
                }

                // Filter chips
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(viewModel.tracks.indices, id: \.self) { i in
                            PazPillChip(
                                label: viewModel.tracks[i].title,
                                selected: selectedTrackIndex == i,
                                onTap: { selectedTrackIndex = i }
                            )
                        }
                    }
                    .padding(.horizontal, 20)
                }
                .padding(.top, viewModel.resumeCourse == nil ? 20 : 0)
                .padding(.bottom, 12)

                let track = viewModel.tracks[safe: selectedTrackIndex] ?? viewModel.tracks[0]

                if let desc = track.description_, !desc.isEmpty {
                    Text(desc)
                        .font(PazTypography.bodySmall)
                        .foregroundStyle(PazColors.slate)
                        .padding(.horizontal, 20)
                        .padding(.bottom, 12)
                }

                ForEach(Array(track.courses.enumerated()), id: \.element.id) { index, course in
                    CourseCard(course: course) {
                        if authCoordinator.isAuthenticated { viewModel.onCourseTapped(course) }
                        else { showLoginSheet = true }
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 12)
                    .transition(.opacity.combined(with: .move(edge: .bottom)))
                    .animation(.spring(response: 0.6, dampingFraction: 0.8).delay(Double(index) * 0.065), value: selectedTrackIndex)
                }

                Spacer().frame(height: 32)
            }
        }
    }

    private var loggedOutPromo: some View {
        ScrollView {
            VStack(spacing: 16) {
                Spacer().frame(height: 20)
                VStack(spacing: 16) {
                    ZStack {
                        Circle().fill(PazColors.pazPrimary.opacity(0.1)).frame(width: 64, height: 64)
                        Image(systemName: "lock.fill").font(.system(size: 26)).foregroundStyle(PazColors.pazPrimary)
                    }
                    Text("Conteúdo exclusivo").font(PazTypography.titleMedium)
                    Text("Faça login para acessar todos os cursos da Academia Paz Church")
                        .font(PazTypography.bodySmall).foregroundStyle(PazColors.slate).multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(24)
                .background(PazColors.surface)
                .clipShape(RoundedRectangle(cornerRadius: 18))
                .padding(.horizontal, 20)

                VStack(alignment: .leading, spacing: 12) {
                    Text("O que você encontra").font(PazTypography.titleMedium).foregroundStyle(.white)
                    ForEach([("graduationcap.fill", "Cursos de discipulado"),
                             ("play.rectangle.fill", "Videoaulas exclusivas"),
                             ("star.fill", "Trilhas de aprendizado")], id: \.0) { icon, label in
                        HStack(spacing: 8) {
                            Image(systemName: icon).foregroundStyle(PazColors.pazGold).font(.system(size: 15))
                            Text(label).font(PazTypography.bodySmall).foregroundStyle(.white.opacity(0.9))
                        }
                    }
                    Button { showLoginSheet = true } label: {
                        Text("Entrar na minha conta")
                            .font(PazTypography.titleSmall)
                            .foregroundStyle(PazColors.pazPrimary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                    .padding(.top, 4)
                }
                .padding(24)
                .background(PazColors.featuredCardGradient)
                .clipShape(RoundedRectangle(cornerRadius: 18))
                .padding(.horizontal, 20)

                Spacer().frame(height: 32)
            }
        }
    }

    private var emptyState: some View {
        VStack {
            Spacer()
            Text("Nenhum conteúdo disponível").font(PazTypography.bodyMedium).foregroundStyle(PazColors.slate)
            Spacer()
        }
    }

    private func errorState(message: String) -> some View {
        VStack(spacing: 16) {
            Spacer()
            Text(message).font(PazTypography.bodySmall).foregroundStyle(PazColors.slate).multilineTextAlignment(.center)
            Button("Tentar Novamente") { Task { await viewModel.load(isAuthenticated: authCoordinator.isAuthenticated) } }
                .font(PazTypography.titleSmall).foregroundStyle(PazColors.pazPrimary)
            Spacer()
        }
        .padding(.horizontal, 24)
    }

    private var loadingState: some View {
        ScrollView {
            VStack(spacing: 16) {
                Spacer().frame(height: 20)
                SkeletonView().frame(height: 38).padding(.horizontal, 20)
                ForEach(0..<4, id: \.self) { _ in SkeletonView().frame(height: 80).padding(.horizontal, 20) }
                Spacer()
            }
        }
    }
}

// MARK: - Sub-views

private struct ResumeBanner: View {
    let course: Course

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                PazColors.featuredCardGradient
                Image(systemName: "play.fill").font(.system(size: 18)).foregroundStyle(.white)
            }
            .frame(width: 72, height: 48)
            .clipShape(RoundedRectangle(cornerRadius: 10))

            VStack(alignment: .leading, spacing: 2) {
                Text("Continuar assistindo").font(PazTypography.labelSmall).foregroundStyle(PazColors.pazSky)
                Text(course.title).font(PazTypography.titleSmall).foregroundStyle(PazColors.ink).lineLimit(1)
            }
            Spacer()
            PazGoldBadge(text: "Retomar")
        }
        .padding(12)
        .background(PazColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 18))
    }
}

private struct CourseCard: View {
    let course: Course
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                ZStack {
                    PazColors.featuredCardGradient
                    if let url = course.thumbnailUrl, !url.isEmpty {
                        AsyncImage(url: URL(string: url)) { img in img.resizable().scaledToFill() } placeholder: { Color.clear }
                            .clipped()
                    } else {
                        Image(systemName: "play.rectangle.fill").font(.system(size: 22)).foregroundStyle(.white.opacity(0.7))
                    }
                    Circle().fill(.white.opacity(0.22)).frame(width: 28, height: 28)
                        .overlay(Image(systemName: "play.fill").font(.system(size: 10)).foregroundStyle(.white))
                }
                .frame(width: 104, height: 68)
                .clipShape(RoundedRectangle(cornerRadius: 10))

                VStack(alignment: .leading, spacing: 4) {
                    Text(course.title).font(PazTypography.titleSmall).foregroundStyle(PazColors.ink).lineLimit(2)
                    if let desc = course.description_, !desc.isEmpty {
                        Text(desc).font(PazTypography.bodySmall).foregroundStyle(PazColors.slate).lineLimit(1)
                    }
                }
                Spacer()
            }
            .padding(12)
            .background(PazColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: 18))
        }
        .buttonStyle(.plain)
    }
}

private extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}

#Preview {
    AcademyView(academyRepository: IosAppContainer.shared.academyRepository)
        .environment(AuthenticationCoordinator(authRepository: IosAppContainer.shared.authRepository))
}
```

- [ ] Update `AcademyViewModel.swift` — change `loadContent()` / `onAppear()` to an `async` method signature so the view can use `.task {}`:
```swift
// Add to AcademyViewModel:
var resumeCourse: Course? = nil  // set from last-watched logic when available

func load(isAuthenticated: Bool) async {
    // existing load logic, add isAuthenticated parameter
}
```

- [ ] Run SwiftFormat:
```bash
cd /Users/jonathalima/Developer/church/kmp-mobile/ios
swiftformat PazChurch/Features/Academy/ --config .swiftformat
swiftlint lint --fix PazChurch/Features/Academy/ --config .swiftlint.yml
```

- [ ] Commit:
```bash
git add ios/PazChurch/Features/Academy/
git commit -m "feat(ios): redesign AcademyView — all states, filter chips, resume banner"
```

---

## Task 7: Android — Redesign AccountScreen (Conta)

**Files:**
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/account/AccountScreen.kt`
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/components/PazComponents.kt` (`PazMenuRow` — add `iconTint`/`titleColor`)

**States:** loading skeleton, `user=null` (embedded login), `user=present` with full menu, dark/light.

- [ ] First check `PazMenuRow` signature:
```bash
grep -n "fun PazMenuRow" /Users/jonathalima/Developer/church/kmp-mobile/android/src/main/kotlin/br/church/paz/android/ui/components/PazMenuRow.kt 2>/dev/null || grep -rn "fun PazMenuRow" /Users/jonathalima/Developer/church/kmp-mobile/android/src/main/kotlin/br/church/paz/android/ui/components/
```

- [ ] If `PazMenuRow` doesn't have `iconTint`/`titleColor` params, add them with defaults that preserve existing behavior. Find the composable and update its signature to:
```kotlin
fun PazMenuRow(
    title: String,
    icon: ImageVector,
    onClick: () -> Unit,
    showDivider: Boolean = true,
    tintIcon: Boolean = true,
    iconTint: Color = PazColors.Primary,
    titleColor: Color? = null,
    trailing: @Composable (() -> Unit)? = null,
)
```
Use `iconTint` in the icon rendering; use `titleColor ?: MaterialTheme.colorScheme.onSurface` for the Text color.

- [ ] Replace the hero `Box` in `AccountScreen` to add the gear button and use `headlineLarge` typography:
```kotlin
Box(
    Modifier
        .fillMaxWidth()
        .background(PazGradients.Hero)
        .statusBarsPadding()
        .padding(horizontal = PazSpacing.Xl, vertical = PazSpacing.Lg),
) {
    Column {
        Text("Meu Perfil", style = MaterialTheme.typography.bodySmall.copy(color = Color.White.copy(.5f)))
        Text(
            uiState.user?.name?.split(Regex("\\s+"))?.firstOrNull() ?: "Conta",
            style = MaterialTheme.typography.headlineLarge.copy(color = Color.White),
        )
    }
    Box(
        Modifier
            .align(Alignment.CenterEnd)
            .size(44.dp)
            .clip(RoundedCornerShape(50))
            .background(PazColors.DarkCard2),
        Alignment.Center,
    ) {
        Icon(Icons.Outlined.Settings, "Configurações", tint = Color.White, modifier = Modifier.size(20.dp))
    }
}
```

- [ ] Replace `ProfileCard` with the 56dp avatar + 22dp radius version from previous plan (already specified). Replace logout `PazMenuRow` to use `iconTint = PazColors.Error, titleColor = PazColors.Error`.

- [ ] Update `Minha Igreja` section to pass per-row icon tints:
```kotlin
PazMenuRow(title = "Jornada do Membro",  icon = Icons.Outlined.Route,                   iconTint = PazColors.PrimaryLight, onClick = viewModel::onMemberJourney)
PazMenuRow(title = "Relatar Reunião",    icon = Icons.AutoMirrored.Outlined.Assignment,  iconTint = Color(0xFF2E7D32),       onClick = viewModel::onMeetingReport)
PazMenuRow(title = "Formulários",        icon = Icons.Outlined.DynamicForm,              iconTint = Color(0xFF6A1B9A),       onClick = viewModel::onFormularios)
PazMenuRow(title = "Ministérios",        icon = Icons.Outlined.MusicNote,               iconTint = Color(0xFFE65100),       onClick = viewModel::onMinistries, showDivider = false)
```

- [ ] Format and build:
```bash
./gradlew :android:ktlintFormat && ./gradlew :android:assembleDebug 2>&1 | tail -10
```

- [ ] Commit:
```bash
git add android/src/main/kotlin/br/church/paz/android/ui/features/account/ \
        android/src/main/kotlin/br/church/paz/android/ui/components/
git commit -m "feat(android): redesign AccountScreen — colored icon rows, gear button, red logout"
```

---

## Task 8: iOS — Redesign AccountView (Conta)

**Files:**
- Modify: `ios/PazChurch/Features/Account/AccountView.swift`

**States:** loading, `isAuthenticated=false` (embedded LoginView), `isAuthenticated=true` full content, dark/light.

- [ ] Replace full content of `AccountView.swift`:

```swift
import Shared
import SwiftUI

struct AccountView: View {
    @State private var viewModel: AccountViewModel
    @Environment(AuthenticationCoordinator.self) private var authCoordinator

    init(userRepository: UserRepository, authRepository: AuthRepository) {
        _viewModel = State(initialValue: AccountViewModel(
            userRepository: userRepository,
            authRepository: authRepository
        ))
    }

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                PazColors.background.ignoresSafeArea()
                if viewModel.isLoading {
                    loadingState
                } else if !authCoordinator.isAuthenticated {
                    LoginView(authCoordinator: authCoordinator, isEmbedded: true)
                } else {
                    VStack(spacing: 0) {
                        heroHeader
                        contentState
                    }
                }
            }
            .navigationBarHidden(true)
        }
        .onChange(of: authCoordinator.isAuthenticated) { _, isAuth in
            if isAuth { Task { await viewModel.reload() } }
        }
    }

    // MARK: - Hero

    private var heroHeader: some View {
        ZStack(alignment: .trailing) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Meu Perfil").font(PazTypography.bodySmall).foregroundStyle(.white.opacity(0.5))
                Text(viewModel.user?.name.components(separatedBy: " ").first ?? "Conta")
                    .font(PazTypography.displayLarge).foregroundStyle(.white)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 24)
            .padding(.vertical, 20)
            .background(PazColors.heroGradient)

            Button(action: {}) {
                Image(systemName: "gear")
                    .font(.system(size: 18, weight: .medium))
                    .foregroundStyle(.white)
                    .frame(width: 44, height: 44)
                    .background(Color(hex: "101F31"))
                    .clipShape(Circle())
            }
            .padding(.trailing, 24)
        }
    }

    // MARK: - Content

    private var contentState: some View {
        ScrollView {
            VStack(spacing: 0) {
                Spacer().frame(height: 24)

                if let user = viewModel.user {
                    userCard(user: user).padding(.horizontal, 20).padding(.bottom, 24)

                    sectionLabel("MINHA IGREJA")
                    menuCard {
                        AccountRow(title: "Jornada do Membro", icon: "figure.walk",    tint: PazColors.pazPrimaryLight) {}
                        rowDivider
                        AccountRow(title: "Relatar Reunião",   icon: "doc.text",       tint: Color(hex: "2E7D32")) {}
                        rowDivider
                        AccountRow(title: "Formulários",       icon: "list.clipboard", tint: Color(hex: "6A1B9A")) {}
                        rowDivider
                        AccountRow(title: "Ministérios",       icon: "music.note",     tint: Color(hex: "E65100")) {}
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 20)

                    sectionLabel("PREFERÊNCIAS")
                    menuCard {
                        AccountRow(title: "Notificações", icon: "bell", tint: PazColors.pazPrimaryMid) {}
                        rowDivider
                        HStack(spacing: 16) {
                            PazIconContainer(
                                icon: viewModel.isDarkMode ? "moon.fill" : "sun.max.fill",
                                tint: PazColors.pazPrimaryMid
                            )
                            Text("Modo Escuro").font(PazTypography.bodyMedium).foregroundStyle(PazColors.ink)
                            Spacer()
                            Toggle("", isOn: $viewModel.isDarkMode).labelsHidden().tint(PazColors.pazPrimaryLight)
                        }
                        .padding(.horizontal, 16).padding(.vertical, 12)
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 20)

                    menuCard {
                        Button(action: { viewModel.onLogout() }) {
                            HStack(spacing: 16) {
                                PazIconContainer(icon: "door.left.hand.open", tint: PazColors.error)
                                Text("Sair da conta").font(PazTypography.bodyMedium).foregroundStyle(PazColors.error)
                                Spacer()
                                Image(systemName: "chevron.right").font(.system(size: 13)).foregroundStyle(PazColors.slateLight)
                            }
                            .padding(.horizontal, 16).padding(.vertical, 12)
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal, 20)
                }

                Spacer().frame(height: 32)
            }
        }
        .background(PazColors.background)
    }

    // MARK: - Helpers

    private func userCard(user: Shared.User) -> some View {
        HStack(spacing: 12) {
            ZStack {
                Circle().fill(PazColors.pazPrimary.opacity(0.15)).frame(width: 56, height: 56)
                Text(user.name.prefix(1).uppercased()).font(PazTypography.headlineSmall).foregroundStyle(PazColors.pazPrimary)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(user.name).font(PazTypography.titleMedium).foregroundStyle(PazColors.pazPrimary)
                Text(user.email).font(PazTypography.bodySmall).foregroundStyle(PazColors.pazSky).lineLimit(1)
                Spacer().frame(height: 2)
                Text(user.role.displayName)
                    .font(PazTypography.labelSmall).foregroundStyle(PazColors.pazPrimary)
                    .padding(.horizontal, 8).padding(.vertical, 2)
                    .background(PazColors.pazPrimary.opacity(0.12)).clipShape(Capsule())
            }
            Spacer()
        }
        .padding(16)
        .background(PazColors.tint)
        .clipShape(RoundedRectangle(cornerRadius: 22))
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(PazColors.pazPrimary.opacity(0.13), lineWidth: 1))
    }

    private func sectionLabel(_ text: String) -> some View {
        Text(text).font(PazTypography.labelSmall).foregroundStyle(PazColors.slateLight)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 20).padding(.bottom, 8)
    }

    private func menuCard<C: View>(@ViewBuilder content: () -> C) -> some View {
        VStack(spacing: 0) { content() }
            .background(PazColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: 18))
    }

    private var rowDivider: some View {
        Divider().padding(.leading, 20)
    }

    private var loadingState: some View {
        ScrollView {
            VStack(spacing: 16) {
                SkeletonView().frame(height: 100).padding(.horizontal, 20).padding(.top, 20)
                SkeletonView().frame(height: 80).padding(.horizontal, 20)
                ForEach(0..<4, id: \.self) { _ in SkeletonView().frame(height: 52).padding(.horizontal, 20) }
                Spacer()
            }
        }
    }
}

private struct AccountRow: View {
    let title: String
    let icon: String
    let tint: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 16) {
                PazIconContainer(icon: icon, tint: tint)
                Text(title).font(PazTypography.bodyMedium).foregroundStyle(PazColors.ink)
                Spacer()
                Image(systemName: "chevron.right").font(.system(size: 13)).foregroundStyle(PazColors.slateLight)
            }
            .padding(.horizontal, 16).padding(.vertical, 12)
        }
        .buttonStyle(.plain)
    }
}

#Preview("Light") {
    AccountView(userRepository: IosAppContainer.shared.userRepository, authRepository: IosAppContainer.shared.authRepository)
        .environment(AuthenticationCoordinator(authRepository: IosAppContainer.shared.authRepository))
}

#Preview("Dark") {
    AccountView(userRepository: IosAppContainer.shared.userRepository, authRepository: IosAppContainer.shared.authRepository)
        .environment(AuthenticationCoordinator(authRepository: IosAppContainer.shared.authRepository))
        .preferredColorScheme(.dark)
}
```

- [ ] Run formatter:
```bash
cd /Users/jonathalima/Developer/church/kmp-mobile/ios
swiftformat PazChurch/Features/Account/ --config .swiftformat
swiftlint lint --fix PazChurch/Features/Account/ --config .swiftlint.yml
```

- [ ] Commit:
```bash
git add ios/PazChurch/Features/Account/AccountView.swift
git commit -m "feat(ios): redesign AccountView — all states, icon rows, dark/light previews"
```

---

## Task 9: Android — Redesign FormulariosScreen

**Files:**
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/formularios/FormulariosScreen.kt`

**States:** loading, error+retry, empty, content rows, dark/light.

- [ ] Replace hero header Row with circle back button:
```kotlin
Row(
    Modifier.fillMaxWidth().padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Md),
    verticalAlignment = Alignment.CenterVertically,
    horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
) {
    Box(
        Modifier.size(40.dp).clip(RoundedCornerShape(50)).background(Color.White.copy(.15f)).clickable { viewModel.onBack() },
        Alignment.Center,
    ) {
        Icon(Icons.AutoMirrored.Filled.ArrowBack, "back", tint = Color.White, modifier = Modifier.size(20.dp))
    }
    Text("Formulários", style = MaterialTheme.typography.headlineMedium.copy(color = Color.White), modifier = Modifier.weight(1f))
}
```

- [ ] Replace `FormCard` composable:
```kotlin
@Composable
private fun FormCard(form: FormCatalogItem, onClick: () -> Unit) {
    val tint = formTint(form.type.name)
    Row(
        modifier              = Modifier
            .fillMaxWidth()
            .clip(PazShapes.large)
            .background(MaterialTheme.colorScheme.surface)
            .clickable(onClick = onClick)
            .padding(PazSpacing.Md),
        verticalAlignment     = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        PazIconContainer(icon = formIcon(form.type.name), tint = tint, size = 42.dp)
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(form.title, style = MaterialTheme.typography.titleSmall)
            if (!form.description.isNullOrEmpty()) {
                Text(form.description!!, style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(.6f)), maxLines = 1)
            }
        }
        Icon(Icons.Default.ChevronRight, null, tint = MaterialTheme.colorScheme.onSurface.copy(.3f), modifier = Modifier.size(18.dp))
    }
}

private fun formTint(typeName: String): Color = when {
    typeName.contains("CONVERSION", true) -> Color(0xFF1565C0)
    typeName.contains("GUEST",      true) -> Color(0xFF2E7D32)
    typeName.contains("SERVICE",    true) -> Color(0xFF6A1B9A)
    typeName.contains("REPORT",     true) -> Color(0xFFE65100)
    else                                  -> PazColors.Primary
}

private fun formIcon(typeName: String): ImageVector = when {
    typeName.contains("CONVERSION", true) -> Icons.Outlined.Favorite
    typeName.contains("GUEST",      true) -> Icons.Outlined.PersonAdd
    typeName.contains("SERVICE",    true) -> Icons.Outlined.AccountBalance
    typeName.contains("REPORT",     true) -> Icons.AutoMirrored.Outlined.Assignment
    else                                  -> Icons.Outlined.DynamicForm
}
```

- [ ] Add required imports (verify each exists in the Material Icons set before adding):
```kotlin
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.DynamicForm
import androidx.compose.material.icons.outlined.Favorite
import androidx.compose.material.icons.outlined.PersonAdd
```

- [ ] Format and build:
```bash
./gradlew :android:ktlintFormat && ./gradlew :android:assembleDebug 2>&1 | tail -10
```

- [ ] Commit:
```bash
git add android/src/main/kotlin/br/church/paz/android/ui/features/formularios/FormulariosScreen.kt
git commit -m "feat(android): redesign FormulariosScreen — card rows with tinted icons"
```

---

## Task 10: iOS — Redesign FormulariosView

**Files:**
- Modify: `ios/PazChurch/Features/Formularios/FormulariosView.swift`

**States:** loading, empty, error (if ViewModel supports it), content rows, dark/light.

- [ ] Replace hero header with circle back button:
```swift
HStack(spacing: 14) {
    Button(action: { dismiss() }) {
        Image(systemName: "chevron.left")
            .font(.system(size: 16, weight: .semibold))
            .foregroundStyle(.white)
            .frame(width: 40, height: 40)
            .background(.white.opacity(0.15))
            .clipShape(Circle())
    }
    Text("Formulários").font(PazTypography.headlineMedium).foregroundStyle(.white)
    Spacer()
}
.padding(.horizontal, 20)
.padding(.vertical, 14)
```

- [ ] Replace `FormCard` private struct:
```swift
private struct FormCard: View {
    let form: FormCatalogItem

    private var tint: Color {
        let name = form.type.name.uppercased()
        if name.contains("CONVERSION") { return PazColors.pazPrimaryLight }
        if name.contains("GUEST")      { return Color(hex: "2E7D32") }
        if name.contains("SERVICE")    { return Color(hex: "6A1B9A") }
        if name.contains("REPORT")     { return Color(hex: "E65100") }
        return PazColors.pazPrimary
    }

    private var icon: String {
        let name = form.type.name.uppercased()
        if name.contains("CONVERSION") { return "heart.fill" }
        if name.contains("GUEST")      { return "person.badge.plus" }
        if name.contains("SERVICE")    { return "building.columns.fill" }
        if name.contains("REPORT")     { return "doc.text.fill" }
        return "list.clipboard.fill"
    }

    var body: some View {
        HStack(spacing: 12) {
            PazIconContainer(icon: icon, tint: tint, size: 42)
            VStack(alignment: .leading, spacing: 2) {
                Text(form.title).font(PazTypography.titleSmall).foregroundStyle(PazColors.ink)
                if let desc = form.description_, !desc.isEmpty {
                    Text(desc).font(PazTypography.bodySmall).foregroundStyle(PazColors.slate).lineLimit(1)
                }
            }
            Spacer()
            Image(systemName: "chevron.right").font(.system(size: 13)).foregroundStyle(PazColors.slateLight)
        }
        .padding(14)
        .background(PazColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}
```

- [ ] Run formatter:
```bash
cd /Users/jonathalima/Developer/church/kmp-mobile/ios
swiftformat PazChurch/Features/Formularios/ --config .swiftformat
```

- [ ] Commit:
```bash
git add ios/PazChurch/Features/Formularios/FormulariosView.swift
git commit -m "feat(ios): redesign FormulariosView — card rows with tinted icons"
```

---

## Task 11: Android — Redesign ProfileScreen

**Files:**
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/profile/ProfileScreen.kt`

**States:** loading, `loggedIn=false` (visitor — dashed avatar + gradient join card), `loggedIn=true` (avatar overlap card + edit button + logout), `roleBadge=true/false`, `journey=true` (journey stepper placeholder), dark/light.

- [ ] Replace `LoggedInState`:
```kotlin
@Composable
private fun LoggedInState(user: br.church.paz.shared.domain.model.User, viewModel: ProfileViewModel) {
    LazyColumn(modifier = Modifier.fillMaxSize()) {
        item {
            // Card overlapping header by offset
            Column(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = PazSpacing.Lg)
                    .offset(y = (-22).dp)
                    .clip(RoundedCornerShape(22.dp))
                    .background(MaterialTheme.colorScheme.surface)
                    .padding(PazSpacing.Lg),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
            ) {
                Box {
                    PazAvatar(name = user.name, imageUrl = user.picture, size = 80.dp)
                    Box(
                        Modifier.size(26.dp).clip(RoundedCornerShape(50)).background(PazColors.Gold).align(Alignment.BottomEnd),
                        Alignment.Center,
                    ) {
                        Icon(Icons.Outlined.Edit, null, tint = PazColors.GoldOnBadge, modifier = Modifier.size(14.dp))
                    }
                }
                Text(user.name, style = MaterialTheme.typography.headlineSmall)
                Text(user.email, style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(.5f)))
                Box(
                    Modifier.clip(RoundedCornerShape(20.dp)).background(PazColors.Primary.copy(.12f)).padding(horizontal = 12.dp, vertical = 4.dp),
                ) {
                    Text(user.role.displayName, style = MaterialTheme.typography.labelSmall.copy(color = PazColors.Primary))
                }
            }
        }

        item {
            Column(Modifier.padding(horizontal = PazSpacing.Lg).offset(y = (-22).dp)) {
                PazButton(text = "Editar Perfil", onClick = viewModel::onEditProfile, modifier = Modifier.fillMaxWidth())
            }
        }

        item {
            Column(
                Modifier.fillMaxWidth().padding(horizontal = PazSpacing.Lg).offset(y = (-14).dp).clip(PazShapes.large).background(MaterialTheme.colorScheme.surface),
            ) {
                PazMenuRow(
                    title       = "Sair da conta",
                    icon        = Icons.AutoMirrored.Outlined.Logout,
                    iconTint    = PazColors.Error,
                    titleColor  = PazColors.Error,
                    onClick     = viewModel::onLogout,
                    showDivider = false,
                    tintIcon    = false,
                )
            }
            Spacer(Modifier.height(PazSpacing.Xl))
        }
    }
}
```

- [ ] Replace `LoggedOutState`:
```kotlin
@Composable
private fun LoggedOutState(onLogin: () -> Unit) {
    LazyColumn(
        modifier            = Modifier.fillMaxSize(),
        contentPadding      = PaddingValues(PazSpacing.Lg),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Xl)) }
        item {
            Box(
                Modifier.size(80.dp).clip(RoundedCornerShape(50)).background(MaterialTheme.colorScheme.surface).border(2.dp, PazColors.Primary.copy(.25f), RoundedCornerShape(50)),
                Alignment.Center,
            ) {
                Icon(Icons.Outlined.Person, null, tint = PazColors.Primary.copy(.4f), modifier = Modifier.size(40.dp))
            }
        }
        item {
            Text("Bem-vindo(a)!", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(4.dp))
            Text("Faça login para ver seu perfil e acompanhar sua jornada", style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(.6f)))
        }
        item {
            Column(
                Modifier.fillMaxWidth().clip(PazShapes.large).background(PazGradients.Card).padding(PazSpacing.Xl),
                verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
            ) {
                Text("Entre na comunidade", style = MaterialTheme.typography.titleMedium.copy(color = Color.White))
                Text("Conecte-se com sua família de fé", style = MaterialTheme.typography.bodySmall.copy(color = Color.White.copy(.8f)))
                PazButton(text = "Entrar na minha conta", onClick = onLogin, modifier = Modifier.fillMaxWidth())
            }
        }
    }
}
```

- [ ] Add `Icons.Outlined.Person` import if missing.

- [ ] Format and build:
```bash
./gradlew :android:ktlintFormat && ./gradlew :android:assembleDebug 2>&1 | tail -10
```

- [ ] Commit:
```bash
git add android/src/main/kotlin/br/church/paz/android/ui/features/profile/ProfileScreen.kt
git commit -m "feat(android): redesign ProfileScreen — overlap card, gold badge, visitor state"
```

---

## Task 12: iOS — Redesign ProfileView

**Files:**
- Modify: `ios/PazChurch/Features/Profile/ProfileView.swift`

**States:** loading, `loggedIn=false` (visitor — dashed circle + gradient card), `loggedIn=true` (`roleBadge`, `journey` placeholder), dark/light.

- [ ] Replace full content:

```swift
import Shared
import SwiftUI

struct ProfileView: View {
    @State private var viewModel: ProfileViewModel
    @Environment(\.dismiss) private var dismiss
    @Environment(AuthenticationCoordinator.self) private var authCoordinator

    init(authRepository: AuthRepository) {
        _viewModel = State(initialValue: ProfileViewModel(authRepository: authRepository))
    }

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                PazColors.background.ignoresSafeArea()
                VStack(spacing: 0) {
                    heroHeader
                    ZStack(alignment: .top) {
                        PazColors.background.ignoresSafeArea(edges: .bottom)
                        screenContent
                    }
                }
            }
            .navigationBarHidden(true)
        }
        .task { await viewModel.loadUser() }
    }

    @ViewBuilder
    private var screenContent: some View {
        if viewModel.isLoading { loadingState }
        else if viewModel.user == nil { loggedOutState }
        else { loggedInState }
    }

    private var heroHeader: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("Meu Perfil").font(PazTypography.bodySmall).foregroundStyle(.white.opacity(0.5))
            Text(viewModel.user?.name ?? "Perfil").font(PazTypography.headlineMedium).foregroundStyle(.white)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 24)
        .padding(.top, 16)
        .padding(.bottom, 44)
        .background(PazColors.heroGradient)
    }

    private var loggedInState: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Avatar card overlapping header
                VStack(spacing: 12) {
                    ZStack(alignment: .bottomTrailing) {
                        Circle().fill(PazColors.pazPrimary.opacity(0.15)).frame(width: 80, height: 80)
                            .overlay(
                                Text(viewModel.user?.name.prefix(1).uppercased() ?? "")
                                    .font(PazTypography.headlineLarge).foregroundStyle(PazColors.pazPrimary)
                            )
                        Circle().fill(PazColors.pazGold).frame(width: 26, height: 26)
                            .overlay(Image(systemName: "pencil").font(.system(size: 11, weight: .bold)).foregroundStyle(Color(hex: "3A2600")))
                    }
                    Text(viewModel.user?.name ?? "").font(PazTypography.headlineSmall)
                    Text(viewModel.user?.email ?? "").font(PazTypography.bodySmall).foregroundStyle(PazColors.slate)
                    Text(viewModel.user?.role.displayName ?? "")
                        .font(PazTypography.labelSmall).foregroundStyle(PazColors.pazPrimary)
                        .padding(.horizontal, 12).padding(.vertical, 4)
                        .background(PazColors.pazPrimary.opacity(0.12)).clipShape(Capsule())
                }
                .frame(maxWidth: .infinity)
                .padding(24)
                .background(PazColors.surface)
                .clipShape(RoundedRectangle(cornerRadius: 22))
                .shadow(color: .black.opacity(0.07), radius: 16, y: 6)
                .padding(.horizontal, 20)
                .offset(y: -22)

                VStack(spacing: 16) {
                    NavigationLink(destination: EditProfileView()) {
                        Text("Editar Perfil")
                            .font(PazTypography.titleMedium).foregroundStyle(.white)
                            .frame(maxWidth: .infinity).frame(height: 50)
                            .background(PazColors.pazPrimary)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                    .padding(.horizontal, 20)

                    VStack(spacing: 0) {
                        Button(action: { viewModel.onLogout() }) {
                            HStack(spacing: 16) {
                                PazIconContainer(icon: "door.left.hand.open", tint: PazColors.error)
                                Text("Sair da conta").font(PazTypography.bodyMedium).foregroundStyle(PazColors.error)
                                Spacer()
                                Image(systemName: "chevron.right").font(.system(size: 13)).foregroundStyle(PazColors.slateLight)
                            }
                            .padding(.horizontal, 16).padding(.vertical, 12)
                        }
                        .buttonStyle(.plain)
                    }
                    .background(PazColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 18))
                    .padding(.horizontal, 20)
                }
                .padding(.top, 4)

                Spacer().frame(height: 32)
            }
        }
    }

    private var loggedOutState: some View {
        ScrollView {
            VStack(spacing: 20) {
                Spacer().frame(height: 24)
                ZStack {
                    Circle().strokeBorder(PazColors.pazPrimary.opacity(0.25), style: StrokeStyle(lineWidth: 2, dash: [6]))
                        .frame(width: 80, height: 80)
                    Image(systemName: "person.fill").font(.system(size: 32)).foregroundStyle(PazColors.pazPrimary.opacity(0.4))
                }
                VStack(spacing: 6) {
                    Text("Bem-vindo(a)!").font(PazTypography.titleMedium)
                    Text("Faça login para ver seu perfil e acompanhar sua jornada na Paz Church")
                        .font(PazTypography.bodySmall).foregroundStyle(PazColors.slate).multilineTextAlignment(.center)
                }
                .padding(.horizontal, 24)

                VStack(alignment: .leading, spacing: 12) {
                    Text("Entre na comunidade").font(PazTypography.titleMedium).foregroundStyle(.white)
                    Text("Conecte-se com sua família de fé").font(PazTypography.bodySmall).foregroundStyle(.white.opacity(0.8))
                    NavigationLink(destination: LoginView(authCoordinator: authCoordinator)) {
                        Text("Entrar na minha conta")
                            .font(PazTypography.titleSmall).foregroundStyle(PazColors.pazPrimary)
                            .frame(maxWidth: .infinity).padding(.vertical, 14)
                            .background(.white).clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                }
                .padding(24)
                .background(PazColors.featuredCardGradient)
                .clipShape(RoundedRectangle(cornerRadius: 18))
                .padding(.horizontal, 20)

                Spacer().frame(height: 32)
            }
        }
    }

    private var loadingState: some View {
        VStack(spacing: 16) {
            Spacer().frame(height: 20)
            SkeletonView().frame(width: 80, height: 80).clipShape(Circle())
            SkeletonView().frame(height: 24).frame(maxWidth: 200)
            SkeletonView().frame(height: 16).frame(maxWidth: 150)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity).padding(20)
    }
}

#Preview("Logged In — Light") {
    ProfileView(authRepository: IosAppContainer.shared.authRepository)
        .environment(AuthenticationCoordinator(authRepository: IosAppContainer.shared.authRepository))
}
#Preview("Logged In — Dark") {
    ProfileView(authRepository: IosAppContainer.shared.authRepository)
        .environment(AuthenticationCoordinator(authRepository: IosAppContainer.shared.authRepository))
        .preferredColorScheme(.dark)
}
```

> `viewModel.loadUser()` must be `async`. If `ProfileViewModel` currently uses `init`-based loading, add `func loadUser() async` that wraps the existing logic.

- [ ] Run formatter:
```bash
cd /Users/jonathalima/Developer/church/kmp-mobile/ios
swiftformat PazChurch/Features/Profile/ --config .swiftformat
swiftlint lint --fix PazChurch/Features/Profile/ --config .swiftlint.yml
```

- [ ] Commit:
```bash
git add ios/PazChurch/Features/Profile/
git commit -m "feat(ios): redesign ProfileView — overlap card, gold badge, visitor state, previews"
```

---

## Task 13: Android — Redesign AgendaDetailScreen

**Files:**
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/agenda/AgendaDetailScreen.kt`

**States:** loading, error+retry, content with `tab=geral` (default) / `tab=info` (tabbed layout), dark/light.

- [ ] Replace full content with the version from the previous plan (Task 13), adding tab support:

Key changes over the previous version:
1. Add `selectedTab` state (`"geral"` / `"info"`) 
2. Add an underline tab bar between metadata chips and description
3. `geral` tab: description + CTA. `info` tab: date/location chips only (placeholder for additional info)

```kotlin
// In ContentState, add after MetaChip row:
var selectedTab by remember { mutableStateOf("geral") }
Spacer(Modifier.height(PazSpacing.Md))

// Tab bar
Row(
    Modifier.fillMaxWidth().padding(horizontal = PazSpacing.Lg),
    horizontalArrangement = Arrangement.spacedBy(PazSpacing.Xl),
) {
    listOf("geral" to "Geral", "info" to "Informações").forEach { (key, label) ->
        Column(
            Modifier.clickable { selectedTab = key },
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                label,
                style = MaterialTheme.typography.titleSmall.copy(
                    color = if (selectedTab == key) PazColors.Primary else MaterialTheme.colorScheme.onSurface.copy(.5f),
                ),
            )
            Spacer(Modifier.height(6.dp))
            Box(
                Modifier.height(2.5.dp).fillMaxWidth()
                    .background(if (selectedTab == key) PazColors.Primary else Color.Transparent),
            )
        }
    }
}
Spacer(Modifier.height(PazSpacing.Lg))
```

For the complete `AgendaDetailScreen.kt`, use the version from the previous plan Task 13, then add the tab bar and conditional tab content between the MetaChip row and the CTA.

- [ ] Format and build:
```bash
./gradlew :android:ktlintFormat && ./gradlew :android:assembleDebug 2>&1 | tail -10
```

- [ ] Commit:
```bash
git add android/src/main/kotlin/br/church/paz/android/ui/features/agenda/AgendaDetailScreen.kt
git commit -m "feat(android): redesign AgendaDetailScreen — hero overlap, tab bar, gradient CTA"
```

---

## Task 14: iOS — Redesign AgendaDetailView

**Files:**
- Modify: `ios/PazChurch/Features/Agenda/AgendaDetailView.swift`

**States:** content with `tab=geral/info` switcher, dark/light. (No loading state — event is passed in.)

- [ ] Replace full content:

```swift
import Shared
import SwiftUI

struct AgendaDetailView: View {
    let event: AgendaEvent
    @Environment(\.dismiss) private var dismiss
    @State private var selectedTab = "geral"

    var body: some View {
        ZStack(alignment: .top) {
            PazColors.background.ignoresSafeArea()

            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    heroArea
                    bodyCard
                }
            }
            .ignoresSafeArea(edges: .top)

            // Floating back button
            Button(action: { dismiss() }) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 40, height: 40)
                    .background(.white.opacity(0.18))
                    .clipShape(Circle())
            }
            .padding(.top, 56)
            .padding(.leading, 20)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .navigationBarHidden(true)
    }

    private var heroArea: some View {
        ZStack(alignment: .bottom) {
            PazColors.heroGradient.frame(height: 300)
                .overlay(
                    Image(systemName: "plus")
                        .font(.system(size: 180, weight: .ultraLight))
                        .foregroundStyle(.white.opacity(0.08))
                )

            VStack(alignment: .leading, spacing: 8) {
                PazGoldBadge(text: eventBadge)
                Text(event.title)
                    .font(PazTypography.headlineMedium)
                    .foregroundStyle(.white)
                    .shadow(color: .black.opacity(0.3), radius: 4, y: 2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 20)
            .padding(.bottom, 32)
        }
    }

    private var bodyCard: some View {
        VStack(alignment: .leading, spacing: 20) {
            // Meta chips
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    MetaChip(icon: "calendar", label: formatDate(event.startDate, event.endDate))
                    if let loc = event.location, !loc.isEmpty {
                        MetaChip(icon: "mappin.circle.fill", label: loc)
                    }
                }
            }

            // Tab bar
            HStack(spacing: 32) {
                ForEach([("geral", "Geral"), ("info", "Informações")], id: \.0) { key, label in
                    Button(action: { selectedTab = key }) {
                        VStack(spacing: 6) {
                            Text(label)
                                .font(PazTypography.titleSmall)
                                .foregroundStyle(selectedTab == key ? PazColors.pazPrimary : PazColors.slate)
                            Rectangle()
                                .fill(selectedTab == key ? PazColors.pazPrimary : Color.clear)
                                .frame(height: 2.5)
                        }
                    }
                    .buttonStyle(.plain)
                }
                Spacer()
            }

            // Tab content
            if selectedTab == "geral" {
                if let desc = event.description_, !desc.isEmpty {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Descrição").font(PazTypography.titleSmall)
                        Text(desc).font(PazTypography.bodySmall).foregroundStyle(PazColors.slate)
                    }
                }
            } else {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Detalhes do Evento").font(PazTypography.titleSmall)
                    Text("Informações adicionais em breve.").font(PazTypography.bodySmall).foregroundStyle(PazColors.slate)
                }
            }

            // CTA
            Button(action: {}) {
                HStack(spacing: 8) {
                    Image(systemName: "heart.fill")
                    Text("Confirmar presença").font(PazTypography.titleMedium)
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity).frame(height: 56)
                .background(PazColors.heroGradient)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .shadow(color: PazColors.pazPrimaryMid.opacity(0.4), radius: 12, y: 6)
            }
            .buttonStyle(.plain)
            .padding(.top, 8)

            Spacer().frame(height: 16)
        }
        .padding(20)
        .background(PazColors.background)
        .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
        .offset(y: -20)
    }

    private var eventBadge: String { event.startDate.prefix(8).uppercased().description }

    private func formatDate(_ start: String, _ end: String?) -> String {
        guard let end, !end.isEmpty else { return start }
        return "\(start) — \(end)"
    }
}

private struct MetaChip: View {
    let icon: String
    let label: String

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: icon).font(.system(size: 12)).foregroundStyle(PazColors.pazPrimary)
            Text(label).font(PazTypography.labelSmall).foregroundStyle(PazColors.ink)
        }
        .padding(.horizontal, 12).padding(.vertical, 8)
        .background(PazColors.surface)
        .clipShape(Capsule())
    }
}

#Preview("Light") {
    AgendaDetailView(event: AgendaEvent(id: "1", title: "Culto de Domingo", description: "Venha participar", startDate: "2026-06-08", endDate: "2026-06-08", location: "Sede Paz Church", imageUrl: nil))
}
#Preview("Dark") {
    AgendaDetailView(event: AgendaEvent(id: "1", title: "Culto de Domingo", description: "Venha participar", startDate: "2026-06-08", endDate: "2026-06-08", location: "Sede Paz Church", imageUrl: nil))
        .preferredColorScheme(.dark)
}
```

- [ ] Run formatter:
```bash
cd /Users/jonathalima/Developer/church/kmp-mobile/ios
swiftformat PazChurch/Features/Agenda/ --config .swiftformat
```

- [ ] Commit:
```bash
git add ios/PazChurch/Features/Agenda/AgendaDetailView.swift
git commit -m "feat(ios): redesign AgendaDetailView — hero overlap, tab bar, dark/light previews"
```

---

## Task 15: Android — Add AgendaListScreen + wire Home "Ver todos"

**Files:**
- Create: `android/src/main/kotlin/br/church/paz/android/ui/features/agenda/AgendaListScreen.kt`
- Create: `android/src/main/kotlin/br/church/paz/android/ui/features/agenda/AgendaListViewModel.kt`
- Modify: `android/src/main/kotlin/br/church/paz/android/navigation/Screen.kt`
- Modify: `android/src/main/kotlin/br/church/paz/android/navigation/PazNavGraph.kt`
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/home/HomeScreen.kt`

**States:** loading skeleton, empty, content list, dark/light.

- [ ] Add route to `Screen.kt`:
```kotlin
data object AgendaList : Screen("agenda_list")
```

- [ ] Create `AgendaListViewModel.kt`:
```kotlin
package br.church.paz.android.ui.features.agenda

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.model.AgendaEvent
import br.church.paz.shared.domain.repository.HomeRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class AgendaListUiState(
    val events: List<AgendaEvent> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null,
)

class AgendaListViewModel(private val homeRepository: HomeRepository) : ViewModel() {
    private val _uiState = MutableStateFlow(AgendaListUiState())
    val uiState: StateFlow<AgendaListUiState> = _uiState.asStateFlow()

    init { load() }

    private fun load() {
        viewModelScope.launch {
            runCatching { homeRepository.getHomeContent() }
                .onSuccess { _uiState.value = AgendaListUiState(events = it.agendaEvents, isLoading = false) }
                .onFailure { _uiState.value = AgendaListUiState(isLoading = false, error = it.message) }
        }
    }
}
```

- [ ] Create `AgendaListScreen.kt`:
```kotlin
package br.church.paz.android.ui.features.agenda

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.navigation.Screen
import br.church.paz.android.ui.components.PazSectionHeader
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.AgendaEvent
import org.koin.androidx.compose.koinViewModel

@Composable
fun AgendaListScreen(
    navController: NavController,
    viewModel: AgendaListViewModel = koinViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Column(Modifier.fillMaxSize()) {
        Box(Modifier.fillMaxWidth().background(PazGradients.Hero).statusBarsPadding()) {
            Row(
                Modifier.fillMaxWidth().padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Md),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = { navController.popBackStack() }) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, "back", tint = Color.White)
                }
                Text("Agenda", style = MaterialTheme.typography.headlineMedium.copy(color = Color.White), modifier = Modifier.weight(1f))
            }
        }

        Box(Modifier.fillMaxSize().clip(RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp)).background(MaterialTheme.colorScheme.background)) {
            when {
                uiState.isLoading -> AgendaListSkeleton()
                uiState.events.isEmpty() -> Box(Modifier.fillMaxSize(), Alignment.Center) {
                    Text("Nenhum evento disponível", style = MaterialTheme.typography.bodyMedium)
                }
                else -> AgendaEventList(events = uiState.events, onTap = { navController.navigate(Screen.AgendaDetail.createRoute(it.id)) })
            }
        }
    }
}

@Composable
private fun AgendaEventList(events: List<AgendaEvent>, onTap: (AgendaEvent) -> Unit) {
    LazyColumn(
        modifier        = Modifier.fillMaxSize(),
        contentPadding  = PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Md)); PazSectionHeader("Próximos eventos") }
        items(events, key = { it.id }) { event ->
            AgendaEventCard(event = event, onClick = { onTap(event) })
        }
        item { Spacer(Modifier.height(PazSpacing.Xl)) }
    }
}

@Composable
private fun AgendaEventCard(event: AgendaEvent, onClick: () -> Unit) {
    Row(
        modifier              = Modifier
            .fillMaxWidth()
            .clip(PazShapes.large)
            .background(MaterialTheme.colorScheme.surface)
            .clickable(onClick = onClick)
            .padding(PazSpacing.Md),
        verticalAlignment     = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        val parts = event.startDate.split("-")
        Column(
            Modifier.size(52.dp).clip(RoundedCornerShape(12.dp)).background(PazColors.Primary.copy(.08f)),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text(parts.getOrNull(2) ?: "--", style = MaterialTheme.typography.titleMedium.copy(color = PazColors.Primary))
            Text(monthAbbrev(parts.getOrNull(1)), style = MaterialTheme.typography.labelSmall.copy(color = PazColors.Accent))
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(event.title, style = MaterialTheme.typography.titleSmall, maxLines = 2)
            if (!event.location.isNullOrEmpty()) {
                Text(event.location!!, style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(.5f)), maxLines = 1)
            }
        }
        Box(Modifier.size(8.dp).clip(RoundedCornerShape(50)).background(PazColors.Primary))
    }
}

private fun monthAbbrev(m: String?) = when (m) {
    "01" -> "JAN"; "02" -> "FEV"; "03" -> "MAR"; "04" -> "ABR"
    "05" -> "MAI"; "06" -> "JUN"; "07" -> "JUL"; "08" -> "AGO"
    "09" -> "SET"; "10" -> "OUT"; "11" -> "NOV"; "12" -> "DEZ"
    else -> "???"
}

@Composable
private fun AgendaListSkeleton() {
    LazyColumn(
        contentPadding      = PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
        modifier            = Modifier.fillMaxSize().padding(top = PazSpacing.Lg),
    ) {
        repeat(6) { item { PazSkeleton(height = 72.dp) } }
    }
}
```

- [ ] Register `AgendaListViewModel` in Koin DI:
```bash
grep -rn "viewModel\|androidModule" /Users/jonathalima/Developer/church/kmp-mobile/android/src/main/kotlin/br/church/paz/android/di/ | head -10
```
Add: `viewModel { AgendaListViewModel(get()) }`

- [ ] Add composable to `PazNavGraph.kt` after the existing `AgendaDetail` composable:
```kotlin
composable(Screen.AgendaList.route) {
    AgendaListScreen(navController = navController)
}
```

- [ ] Wire "Ver todos" in `HomeScreen.kt`. Find the `NavigateToAgenda` effect handler:
```bash
grep -n "NavigateToAgenda" /Users/jonathalima/Developer/church/kmp-mobile/android/src/main/kotlin/br/church/paz/android/ui/features/home/HomeScreen.kt
```
Change: `is HomeEffect.NavigateToAgenda -> { /* TODO Phase 4 */ }` → `is HomeEffect.NavigateToAgenda -> navController.navigate(Screen.AgendaList.route)`

- [ ] Format and build:
```bash
./gradlew :android:ktlintFormat && ./gradlew :android:assembleDebug 2>&1 | tail -10
```

- [ ] Commit:
```bash
git add android/src/main/kotlin/br/church/paz/android/ui/features/agenda/ \
        android/src/main/kotlin/br/church/paz/android/navigation/ \
        android/src/main/kotlin/br/church/paz/android/ui/features/home/HomeScreen.kt
git commit -m "feat(android): add AgendaListScreen and wire Home 'Ver todos'"
```

---

## Task 16: iOS — Add AgendaListView + wire Home "Ver todos"

**Files:**
- Create: `ios/PazChurch/Features/Agenda/AgendaListView.swift`
- Modify: `ios/PazChurch/Features/Home/HomeView.swift`

**States:** empty, content list, dark/light.

- [ ] Create `ios/PazChurch/Features/Agenda/AgendaListView.swift`:

```swift
import Shared
import SwiftUI

struct AgendaListView: View {
    let events: [AgendaEvent]
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                PazColors.background.ignoresSafeArea()
                VStack(spacing: 0) {
                    headerBar
                    if events.isEmpty {
                        emptyState
                    } else {
                        eventList
                    }
                }
            }
            .navigationBarHidden(true)
        }
    }

    private var headerBar: some View {
        HStack(spacing: 14) {
            Button(action: { dismiss() }) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 40, height: 40)
                    .background(.white.opacity(0.15))
                    .clipShape(Circle())
            }
            Text("Agenda").font(PazTypography.headlineMedium).foregroundStyle(.white)
            Spacer()
        }
        .padding(.horizontal, 20).padding(.vertical, 14)
        .background(PazColors.heroGradient)
    }

    private var eventList: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                Text("PRÓXIMOS EVENTOS")
                    .font(PazTypography.labelSmall).foregroundStyle(PazColors.slateLight)
                    .padding(.horizontal, 20).padding(.top, 16)

                ForEach(events, id: \.id) { event in
                    NavigationLink(destination: AgendaDetailView(event: event)) {
                        AgendaEventRow(event: event).padding(.horizontal, 20)
                    }
                    .buttonStyle(.plain)
                }
                Spacer().frame(height: 32)
            }
        }
        .background(PazColors.background)
    }

    private var emptyState: some View {
        VStack {
            Spacer()
            Text("Nenhum evento disponível").font(PazTypography.bodyMedium).foregroundStyle(PazColors.slate)
            Spacer()
        }
    }
}

private struct AgendaEventRow: View {
    let event: AgendaEvent

    var body: some View {
        HStack(spacing: 12) {
            dateBox
            VStack(alignment: .leading, spacing: 2) {
                Text(event.title).font(PazTypography.titleSmall).foregroundStyle(PazColors.ink).lineLimit(2)
                if let loc = event.location, !loc.isEmpty {
                    Text(loc).font(PazTypography.bodySmall).foregroundStyle(PazColors.slate).lineLimit(1)
                }
            }
            Spacer()
            Circle().fill(PazColors.pazPrimary).frame(width: 8, height: 8)
        }
        .padding(14)
        .background(PazColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 18))
    }

    private var dateBox: some View {
        let parts = event.startDate.split(separator: "-").map(String.init)
        return VStack(spacing: 0) {
            Text(parts[safe: 2] ?? "--").font(PazTypography.titleMedium).foregroundStyle(PazColors.pazPrimary)
            Text(monthAbbrev(parts[safe: 1])).font(PazTypography.labelSmall).foregroundStyle(PazColors.pazSky)
        }
        .frame(width: 52, height: 52)
        .background(PazColors.pazPrimary.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func monthAbbrev(_ m: String?) -> String {
        switch m {
        case "01": "JAN"; case "02": "FEV"; case "03": "MAR"; case "04": "ABR"
        case "05": "MAI"; case "06": "JUN"; case "07": "JUL"; case "08": "AGO"
        case "09": "SET"; case "10": "OUT"; case "11": "NOV"; case "12": "DEZ"
        default: "???"
        }
    }
}

private extension Array {
    subscript(safe index: Int) -> Element? { indices.contains(index) ? self[index] : nil }
}

#Preview("Light") { AgendaListView(events: []) }
#Preview("Dark")  { AgendaListView(events: []).preferredColorScheme(.dark) }
```

- [ ] Find and wire the "Ver todos" button in `HomeView.swift`:
```bash
grep -n "Ver todos\|seeAll\|verTodos\|showAgenda" /Users/jonathalima/Developer/church/kmp-mobile/ios/PazChurch/Features/Home/HomeView.swift | head -10
```

- [ ] Add `@State private var showAgendaList = false` to `HomeView`. On the "Ver todos" button action: `showAgendaList = true`. Add sheet/navigation:
```swift
.sheet(isPresented: $showAgendaList) {
    AgendaListView(events: viewModel.agendaEvents)
}
```
If `HomeView` uses `NavigationStack`, prefer `NavigationLink(destination: AgendaListView(...))` over a sheet.

- [ ] Run formatter:
```bash
cd /Users/jonathalima/Developer/church/kmp-mobile/ios
swiftformat PazChurch/Features/Agenda/ PazChurch/Features/Home/ --config .swiftformat
```

- [ ] Commit:
```bash
git add ios/PazChurch/Features/Agenda/AgendaListView.swift ios/PazChurch/Features/Home/HomeView.swift
git commit -m "feat(ios): add AgendaListView and wire Home 'Ver todos'"
```

---

## Task 17: Final build verification, push, update root pointer

- [ ] Full Android build + lint check:
```bash
cd /Users/jonathalima/Developer/church/kmp-mobile
./gradlew :android:ktlintCheck 2>&1 | tail -5
./gradlew :android:assembleDebug 2>&1 | tail -10
```
Expected: both `BUILD SUCCESSFUL` with no errors.

- [ ] iOS XCFramework + build:
```bash
./gradlew :shared:assembleSharedXCFramework 2>&1 | tail -10
xcodebuild -project ios/PazChurch.xcodeproj -scheme PazChurch -destination 'generic/platform=iOS Simulator' build 2>&1 | grep -E "error:|BUILD"
```
Expected: `BUILD SUCCEEDED`, no `error:` lines.

- [ ] Full SwiftLint pass:
```bash
cd ios
swiftlint lint --config .swiftlint.yml 2>&1 | grep -E "error:|warning:" | head -30
```
Fix any errors (warnings are acceptable).

- [ ] Push kmp-mobile and update root:
```bash
cd /Users/jonathalima/Developer/church/kmp-mobile
git push
cd /Users/jonathalima/Developer/church
git add kmp-mobile
git commit -m "chore: update kmp-mobile pointer — screen redesigns complete"
git push
```

---

## Post-implementation checklist

Things that require manual action or a backend change before they fully work:

- [ ] **`resume` state (Academy)**: `AcademyUiState.resumeCourse` is always `null` until the backend exposes a "last watched" endpoint. Implement mock data in `AcademyViewModel` for now, or leave the banner hidden (the nil check already handles it).
- [ ] **`journey` state (Profile)**: Journey stepper (`Perfil Native.html`) requires a `MemberJourneyRepository` call. The `ProfileView`/`ProfileScreen` currently show a placeholder — wire to `MemberJourneyView` when the journey screen redesign is ready.
- [ ] **Event RSVP CTA**: The "Confirmar presença" button on AgendaDetail is a no-op. Backend endpoint needed.
- [ ] **Event tabs `info`**: "Informações" tab shows placeholder text. Populate when backend adds extended event fields.
- [ ] **AccountView navigation rows**: `AccountRow` action closures are empty (`{}`). Wire to NavController navigate calls (same as existing `PazMenuRow` calls in old code — copy them over).
- [ ] **Icons — verify SF Symbols availability**: All `Image(systemName:)` calls in iOS use SF Symbols. The following are used and should be tested on device: `lock.fill`, `graduationcap.fill`, `play.rectangle.fill`, `person.badge.plus`, `building.columns.fill`, `door.left.hand.open`, `figure.walk`, `moon.fill`, `sun.max.fill`. All are available in SF Symbols 4+ (iOS 16+), well within the iOS 19.4 target.
- [ ] **ktlint plugin in Gradle plugin portal**: If `./gradlew :android:ktlintCheck` fails with "Plugin not found", add the plugin portal classpath to the root `build.gradle.kts` or `settings.gradle.kts`:
  ```kotlin
  // settings.gradle.kts — pluginManagement.repositories
  gradlePluginPortal()
  ```
- [ ] **SwiftFormat installed locally**: Run `which swiftformat` — if missing, install: `brew install swiftformat`. SwiftLint: `brew install swiftlint`.
- [ ] **Dark mode preview testing**: Every screen now has `#Preview("Dark") { ... .preferredColorScheme(.dark) }`. Run Xcode previews to verify all dark-mode adaptive tokens render correctly before shipping.
- [ ] **`PazColors.error` iOS**: Verify `PazColors.error` exists in `PazColors.swift`. If it is only `static let error = Color(...)`, it is not adaptive. For the logout row red, this is intentional (always red) — no change needed.
