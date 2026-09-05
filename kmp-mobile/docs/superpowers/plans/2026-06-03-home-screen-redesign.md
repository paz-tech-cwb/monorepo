# Home Screen Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Home screen on both Android (Compose) and iOS (SwiftUI) to match the `Home Native v2.html` design reference — gradient featured cards, radial-gradient Dízimos card, day-strip agenda, collapsing header, staggered entrance animations, full dark mode support, portrait + landscape ready.

**Architecture:** Full rewrites of `HomeScreen.kt` and `HomeView.swift`; ViewModel/UiState contracts are untouched. `HomeRepositoryImpl` swapped to return hardcoded mock data (real API call commented out, not deleted). All UI components are private functions/structs inside their respective screen files.

**Tech Stack:** Kotlin Multiplatform, Jetpack Compose (Material 3, `HorizontalPager`, `LargeTopAppBar`), SwiftUI (`TabView(.page)`, `Canvas`, `RadialGradient`), Koin DI

**Reference file:** `~/Downloads/design_handoff_paz_church/Home Native v2.html` — open in a browser alongside this plan.

---

## File Map

| File | Action |
|------|--------|
| `android/…/theme/PazColors.kt` | Add `DarkCard2`, `DarkSlate` |
| `android/…/theme/PazGradients.kt` | Add `FeaturedCard`, `FeaturedCardAlt` |
| `android/…/theme/PazTypography.kt` | Update `displayLarge` → 34sp/36sp, `headlineMedium` → 23sp/26sp |
| `ios/…/Theme/PazColors.swift` | Full rewrite — brand palette + `Color(hex:)` extension |
| `shared/…/data/repository/HomeRepositoryImpl.kt` | Replace `getHomeContent()` with mock data |
| `android/…/features/home/HomeScreen.kt` | Full rewrite |
| `ios/…/Features/Home/HomeView.swift` | Full rewrite |

---

## Task 1: Android theme tokens

**Files:**
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/theme/PazColors.kt`
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/theme/PazGradients.kt`
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/theme/PazTypography.kt`

- [ ] **Step 1: Add missing dark palette tokens to `PazColors.kt`**

Add these two lines at the end of the dark palette block (after `DarkSecondaryContainer`):

```kotlin
    val DarkCard2  = Color(0xFF101F31)   // dark card surface variant
    val DarkSlate  = Color(0xFF97A6BC)   // dark muted text
```

- [ ] **Step 2: Add featured card gradients to `PazGradients.kt`**

Add after the `DarkHero` gradient:

```kotlin
    /** Primary featured card — dark navy left-to-right-bottom */
    val FeaturedCard = Brush.linearGradient(
        colorStops = arrayOf(
            0f    to Color(0xFF0A335F),
            0.52f to Color(0xFF072E5A),
            1f    to Color(0xFF06243F),
        ),
        start = Offset(0f, 0f),
        end   = Offset(Float.POSITIVE_INFINITY, Float.POSITIVE_INFINITY),
    )

    /** Alternate featured card — slightly lighter navy */
    val FeaturedCardAlt = Brush.linearGradient(
        colorStops = arrayOf(
            0f    to Color(0xFF0E4683),
            0.55f to Color(0xFF0B3A6B),
            1f    to Color(0xFF072E58),
        ),
        start = Offset(0f, 0f),
        end   = Offset(Float.POSITIVE_INFINITY, Float.POSITIVE_INFINITY),
    )
```

Note: `Offset` is already imported (`androidx.compose.ui.geometry.Offset`).

- [ ] **Step 3: Update `PazTypography.kt` display sizes to match design spec**

Replace the `displayLarge` and `headlineMedium` entries:

```kotlin
    displayLarge = TextStyle(
        fontFamily = PlayfairDisplay, fontSize = 34.sp,
        fontWeight = FontWeight.ExtraBold, lineHeight = 36.sp,
    ),
    headlineMedium = TextStyle(
        fontFamily = PlayfairDisplay, fontSize = 23.sp,
        fontWeight = FontWeight.ExtraBold, lineHeight = 26.sp,
    ),
```

- [ ] **Step 4: Verify Gradle build compiles**

```bash
cd /Users/jonathalima/Developer/church/kmp-mobile
./gradlew :android:assembleDebug 2>&1 | tail -20
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 5: Commit**

```bash
git add android/src/main/kotlin/br/church/paz/android/ui/theme/PazColors.kt \
        android/src/main/kotlin/br/church/paz/android/ui/theme/PazGradients.kt \
        android/src/main/kotlin/br/church/paz/android/ui/theme/PazTypography.kt
git commit -m "feat(theme): add featured card gradients, dark card tokens, update display sizes"
```

---

## Task 2: iOS theme — PazColors.swift rewrite

**Files:**
- Modify: `ios/PazChurch/Theme/PazColors.swift`

The current file has the old purple-based palette. Replace it entirely.

- [ ] **Step 1: Rewrite `PazColors.swift`**

Replace the entire file with:

```swift
import SwiftUI

struct PazColors {
    // MARK: - Brand (non-adaptive — always these values)
    static let pazPrimary      = Color(hex: "032E58")
    static let pazPrimaryMid   = Color(hex: "0B4D8C")
    static let pazPrimaryLight = Color(hex: "1565C0")
    static let pazSky          = Color(hex: "5B9BD5")
    static let pazGold         = Color(hex: "FFB300")

    // MARK: - Adaptive surfaces (dark / light)
    static let background = Color(UIColor {
        $0.userInterfaceStyle == .dark
            ? UIColor(hex: "070E1A") : UIColor(hex: "EDF1F7")
    })
    static let surface = Color(UIColor {
        $0.userInterfaceStyle == .dark
            ? UIColor(hex: "0D1826") : .white
    })
    static let surface2 = Color(UIColor {
        $0.userInterfaceStyle == .dark
            ? UIColor(hex: "101F31") : UIColor(hex: "F4F7FC")
    })
    static let ink = Color(UIColor {
        $0.userInterfaceStyle == .dark
            ? UIColor(hex: "EAEFF7") : UIColor(hex: "16243A")
    })
    static let slate = Color(UIColor {
        $0.userInterfaceStyle == .dark
            ? UIColor(hex: "97A6BC") : UIColor(hex: "5A6B82")
    })
    static let slateLight = Color(UIColor {
        $0.userInterfaceStyle == .dark
            ? UIColor(hex: "6B7C93") : UIColor(hex: "8A94A6")
    })
    static let line = Color(UIColor {
        $0.userInterfaceStyle == .dark
            ? UIColor(hex: "1C2A3D") : UIColor(hex: "E7ECF3")
    })
    static let tint = Color(UIColor {
        $0.userInterfaceStyle == .dark
            ? UIColor(hex: "0C274A") : UIColor(hex: "E8F0FB")
    })

    // MARK: - Semantic
    static let primary = pazPrimary   // alias for legacy callers
    static let error   = Color(red: 0.78, green: 0.16, blue: 0.16)

    // MARK: - Gradient
    static let heroGradient = LinearGradient(
        colors: [Color(hex: "032E58"), Color(hex: "0B4D8C"), Color(hex: "1565C0")],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}

// MARK: - Hex initializers
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: .alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        self.init(
            red:   Double((int >> 16) & 0xFF) / 255,
            green: Double((int >>  8) & 0xFF) / 255,
            blue:  Double( int        & 0xFF) / 255
        )
    }
}

extension UIColor {
    convenience init(hex: String) {
        let hex = hex.trimmingCharacters(in: .alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        self.init(
            red:   CGFloat((int >> 16) & 0xFF) / 255,
            green: CGFloat((int >>  8) & 0xFF) / 255,
            blue:  CGFloat( int        & 0xFF) / 255,
            alpha: 1
        )
    }
}
```

- [ ] **Step 2: Verify iOS builds cleanly**

Open `ios/PazChurch.xcodeproj` in Xcode and do Product → Build (⌘B).
Expected: no errors (existing callers use `PazColors.primary` and `PazColors.error` which are still present as aliases).

- [ ] **Step 3: Commit**

```bash
git add ios/PazChurch/Theme/PazColors.swift
git commit -m "feat(ios/theme): rewrite PazColors to Paz Church brand palette"
```

---

## Task 3: Mock data in HomeRepositoryImpl

**Files:**
- Modify: `shared/src/commonMain/kotlin/br/church/paz/shared/data/repository/HomeRepositoryImpl.kt`

- [ ] **Step 1: Replace `getHomeContent()` with mock and comment out the real call**

Replace the full file contents:

```kotlin
package br.church.paz.shared.data.repository

import br.church.paz.shared.domain.model.AgendaEvent
import br.church.paz.shared.domain.model.BankInfo
import br.church.paz.shared.domain.model.Banner
import br.church.paz.shared.domain.model.ContributionSection
import br.church.paz.shared.domain.model.HomeContent
import br.church.paz.shared.domain.repository.HomeRepository
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

class HomeRepositoryImpl(private val client: HttpClient) : HomeRepository {

    @Throws(Exception::class)
    override suspend fun getHomeContent(): HomeContent {
        // TODO(backend): restore when API is ready
        // val response: HomeResponse = client.get("api/home").body()
        // return response.toDomain()
        return mockHomeContent()
    }

    private fun mockHomeContent() = HomeContent(
        banners = listOf(
            // imageUrl reused as subtitle for mock; badge text in actionUrl
            Banner(id = "1", title = "Culto da Família",   imageUrl = "Auditório Principal", actionUrl = "DOMINGO · 10H"),
            Banner(id = "2", title = "Escola de Líderes",  imageUrl = "Inscrições abertas",  actionUrl = "ACADEMIA"),
            Banner(id = "3", title = "Culto de Oração",    imageUrl = "Templo Sede",         actionUrl = "QUARTA · 20H"),
        ),
        contribution = ContributionSection(
            bank = BankInfo(name = "Paz Church", pixKey = "pix@pazchurch.com.br"),
        ),
        agenda = listOf(
            AgendaEvent(id = "1", title = "Culto da Família",  startDate = "2026-06-08T10:00", location = "Auditório Principal"),
            AgendaEvent(id = "2", title = "Grupo de Vida",     startDate = "2026-06-04T19:30", location = "Sala 3 — Bloco B"),
            AgendaEvent(id = "3", title = "Ensaio do Louvor",  startDate = "2026-06-04T20:00", location = "Sala de Música"),
        ),
    )
}

// ── Wire DTOs kept for when the real API is restored ─────────────────────────

@Serializable
private data class HomeResponse(val sections: List<SectionDto> = emptyList()) {
    fun toDomain(): HomeContent {
        var banners = emptyList<Banner>()
        var agenda = emptyList<AgendaEvent>()
        var contribution: ContributionSection? = null
        for (section in sections) {
            when (section.type) {
                "announcements" -> banners = section.items.mapNotNull { it.toBanner() }
                "contribution"  -> contribution = section.items.firstOrNull()?.toContribution()
                "agenda"        -> agenda = section.items.mapNotNull { it.toEvent() }
            }
        }
        return HomeContent(banners = banners, agenda = agenda, contribution = contribution)
    }
}

@Serializable
private data class SectionDto(val type: String, val items: List<ItemDto> = emptyList(), val order: Int = 0)

@Serializable
private data class ItemDto(
    val id: Int? = null,
    val title: String? = null,
    val imageUrl: String? = null,
    val actionUrl: String? = null,
    @SerialName("bank_name")     val bankName:      String? = null,
    @SerialName("branch_number") val branchNumber:  String? = null,
    @SerialName("account_number") val accountNumber: String? = null,
    @SerialName("pix_key")       val pixKey:        String? = null,
    val date: String? = null,
) {
    fun toBanner()       = id?.let { Banner(it.toString(), title ?: return null, imageUrl ?: return null, actionUrl) }
    fun toContribution() = bankName?.let { ContributionSection(BankInfo(it, pixKey, branchNumber, accountNumber)) }
    fun toEvent()        = id?.let { AgendaEvent(it.toString(), title ?: return null, null, date ?: return null, null, null, imageUrl) }
}
```

- [ ] **Step 2: Compile shared module**

```bash
cd /Users/jonathalima/Developer/church/kmp-mobile
./gradlew :shared:compileKotlinAndroid 2>&1 | tail -10
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 3: Commit**

```bash
git add shared/src/commonMain/kotlin/br/church/paz/shared/data/repository/HomeRepositoryImpl.kt
git commit -m "feat(shared/mock): swap HomeRepository to return hardcoded mock data"
```

---

## Task 4: Android HomeScreen.kt — full rewrite

**Files:**
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/home/HomeScreen.kt`

All composables are private and live in this file.

- [ ] **Step 1: Replace `HomeScreen.kt` with the full rewrite**

```kotlin
package br.church.paz.android.ui.features.home

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowForward
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LargeTopAppBar
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.TopAppBarScrollBehavior
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
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.ui.components.PazButton
import br.church.paz.android.ui.components.PazCardSkeleton
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.LocalPazDarkTheme
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazShapePill
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.android.ui.theme.PlayfairDisplay
import br.church.paz.shared.domain.model.AgendaEvent
import br.church.paz.shared.domain.model.BankInfo
import br.church.paz.shared.domain.model.Banner
import kotlinx.coroutines.delay
import org.koin.androidx.compose.koinViewModel

// ── Screen ────────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    navController: NavController,
    contentPadding: PaddingValues = PaddingValues(),
    viewModel: HomeViewModel = koinViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val scrollBehavior = TopAppBarDefaults.exitUntilCollapsedScrollBehavior()

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                is HomeEffect.OpenUrl -> context.startActivity(
                    Intent(Intent.ACTION_VIEW, Uri.parse(effect.url))
                )
                is HomeEffect.NavigateToAgenda -> { /* TODO Phase 4 */ }
            }
        }
    }

    Scaffold(
        modifier       = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection),
        topBar         = { HomeTopBar(userName = uiState.userName, scrollBehavior = scrollBehavior) },
        containerColor = MaterialTheme.colorScheme.background,
    ) { innerPadding ->
        val bottomPad = contentPadding.calculateBottomPadding() + PazSpacing.Xl
        val adjustedPadding = PaddingValues(
            top    = innerPadding.calculateTopPadding(),
            bottom = bottomPad,
        )
        when {
            uiState.isLoading  -> LoadingSkeleton(adjustedPadding)
            uiState.error != null -> ErrorState(uiState.error!!, viewModel::load, adjustedPadding)
            else -> HomeContent(
                banners      = uiState.banners,
                agendaEvents = uiState.agendaEvents,
                bank         = uiState.bank,
                onBannerTap  = viewModel::onBannerTapped,
                onEventTap   = viewModel::onEventTapped,
                contentPadding = adjustedPadding,
            )
        }
    }
}

// ── Top bar ───────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun HomeTopBar(userName: String, scrollBehavior: TopAppBarScrollBehavior) {
    val fraction  = scrollBehavior.state.collapsedFraction
    val collapsed = fraction > 0.5f
    val isDark    = LocalPazDarkTheme.current

    LargeTopAppBar(
        expandedHeight = 112.dp,
        title = {
            if (collapsed) {
                Text("Início", style = MaterialTheme.typography.titleMedium)
            } else {
                Column {
                    Text(
                        text  = "QUARTA, 4 DE JUNHO",
                        style = MaterialTheme.typography.labelSmall.copy(
                            color = PazColors.PrimaryLight,
                        ),
                    )
                    Spacer(Modifier.height(7.dp))
                    Text(
                        text  = "Olá, ${userName.ifEmpty { "Lucas" }}",
                        style = MaterialTheme.typography.displayLarge.copy(
                            color = if (isDark) MaterialTheme.colorScheme.onBackground
                                    else PazColors.Primary,
                        ),
                    )
                }
            }
        },
        actions = {
            Box(contentAlignment = Alignment.TopEnd) {
                IconButton(onClick = {}) {
                    Icon(
                        imageVector        = Icons.Outlined.Notifications,
                        contentDescription = "Notificações",
                        tint               = MaterialTheme.colorScheme.onBackground,
                    )
                }
                Box(
                    Modifier
                        .padding(top = 11.dp, end = 11.dp)
                        .size(8.dp)
                        .border(1.6.dp, MaterialTheme.colorScheme.background, CircleShape)
                        .background(PazColors.Gold, CircleShape)
                )
            }
        },
        colors = TopAppBarDefaults.largeTopAppBarColors(
            containerColor        = MaterialTheme.colorScheme.background,
            scrolledContainerColor = MaterialTheme.colorScheme.background,
            titleContentColor     = MaterialTheme.colorScheme.onBackground,
        ),
        scrollBehavior = scrollBehavior,
    )
}

// ── Content ───────────────────────────────────────────────────────────────────

@Composable
private fun HomeContent(
    banners: List<Banner>,
    agendaEvents: List<AgendaEvent>,
    bank: BankInfo?,
    onBannerTap: (String?) -> Unit,
    onEventTap: (String) -> Unit,
    contentPadding: PaddingValues,
) {
    var selectedDay by remember { mutableIntStateOf(2) }   // Wednesday pre-selected

    LazyColumn(
        contentPadding = contentPadding,
        modifier       = Modifier.fillMaxSize(),
    ) {
        if (banners.isNotEmpty()) {
            item(key = "featured") {
                AnimatedSection(index = 0) {
                    FeaturedSection(banners = banners, onBannerTap = onBannerTap)
                }
            }
        }
        if (bank != null) {
            item(key = "dizimos") {
                AnimatedSection(index = 1) {
                    DizimosCard(
                        bank     = bank,
                        modifier = Modifier.padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Xl),
                    )
                }
            }
        }
        if (agendaEvents.isNotEmpty()) {
            item(key = "agenda") {
                AnimatedSection(index = 2) {
                    AgendaSection(
                        events        = agendaEvents,
                        selectedDay   = selectedDay,
                        onDaySelected = { selectedDay = it },
                        onEventTap    = onEventTap,
                    )
                }
            }
        }
    }
}

// ── Entrance animation wrapper ────────────────────────────────────────────────

@Composable
private fun AnimatedSection(index: Int, content: @Composable () -> Unit) {
    var visible by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        delay(index * 65L)
        visible = true
    }
    AnimatedVisibility(
        visible = visible,
        enter   = fadeIn(tween(600, easing = CubicBezierEasing(.2f, .7f, .2f, 1f))) +
                  slideInVertically(tween(600)) { (it * 0.08f).toInt() },
    ) {
        content()
    }
}

// ── Featured events section ───────────────────────────────────────────────────

@Composable
private fun FeaturedSection(banners: List<Banner>, onBannerTap: (String?) -> Unit) {
    val pagerState = rememberPagerState { banners.size }
    val isDark     = LocalPazDarkTheme.current

    Column(Modifier.padding(top = PazSpacing.Md)) {
        // Section header
        Row(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Sm),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment     = Alignment.CenterVertically,
        ) {
            Text("Eventos", style = MaterialTheme.typography.headlineMedium)
            TextButton(onClick = {}, contentPadding = PaddingValues(0.dp)) {
                Text(
                    "Ver todos",
                    style = MaterialTheme.typography.labelSmall.copy(color = PazColors.PrimaryLight),
                )
                Icon(
                    Icons.AutoMirrored.Outlined.ArrowForward,
                    contentDescription = null,
                    tint               = PazColors.PrimaryLight,
                    modifier           = Modifier.size(15.dp).padding(start = 4.dp),
                )
            }
        }

        // Pager
        HorizontalPager(
            state          = pagerState,
            contentPadding = PaddingValues(horizontal = PazSpacing.Lg, end = PazSpacing.Md),
            pageSpacing    = PazSpacing.Md,
            modifier       = Modifier.fillMaxWidth(),
        ) { page ->
            FeaturedCard(
                banner  = banners[page],
                isAlt   = page % 2 == 1,
                onClick = { onBannerTap(banners[page].actionUrl) },
            )
        }

        // Dot indicators
        Row(
            Modifier
                .fillMaxWidth()
                .padding(top = PazSpacing.Md),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment     = Alignment.CenterVertically,
        ) {
            banners.indices.forEach { i ->
                val isActive = pagerState.currentPage == i
                val w by animateDpAsState(
                    targetValue  = if (isActive) 20.dp else 7.dp,
                    animationSpec = tween(250),
                    label        = "dotWidth$i",
                )
                Box(
                    Modifier
                        .padding(horizontal = 3.dp)
                        .size(width = w, height = 7.dp)
                        .background(
                            color = if (isActive) {
                                if (isDark) PazColors.PrimaryLight else PazColors.Primary
                            } else Color(0x2914243A),
                            shape = RoundedCornerShape(4.dp),
                        )
                )
            }
        }
    }
}

// ── Featured card ─────────────────────────────────────────────────────────────

@Composable
private fun FeaturedCard(banner: Banner, isAlt: Boolean, onClick: () -> Unit) {
    Box(
        Modifier
            .fillMaxWidth()
            .height(176.dp)
            .shadow(
                elevation  = 12.dp,
                shape      = RoundedCornerShape(22.dp),
                spotColor  = Color(0xB307295E),
                ambientColor = Color(0x1A07295E),
            )
            .clip(RoundedCornerShape(22.dp))
            .background(if (isAlt) PazGradients.FeaturedCardAlt else PazGradients.FeaturedCard)
            .clickable(onClick = onClick)
            .padding(18.dp),
    ) {
        // Cross watermark (bottom-right, slightly overflows)
        CrossWatermark(
            Modifier
                .size(158.dp)
                .align(Alignment.BottomEnd)
                .offset(x = 14.dp, y = 30.dp)
                .rotate(-9f),
        )

        // Gold pill badge (top-left)
        Text(
            text     = banner.actionUrl ?: "",
            style    = MaterialTheme.typography.labelSmall.copy(color = Color(0xFF3A2600)),
            modifier = Modifier
                .align(Alignment.TopStart)
                .background(PazColors.Gold, RoundedCornerShape(100.dp))
                .padding(horizontal = 13.dp, vertical = 6.dp),
        )

        // Title + subtitle (bottom-left)
        Column(Modifier.align(Alignment.BottomStart)) {
            Text(
                text  = banner.title,
                style = MaterialTheme.typography.headlineMedium.copy(color = Color.White),
            )
            // banner.imageUrl holds the subtitle in mock data
            // TODO(backend): when real data arrives, add a `subtitle` field to Banner
            Text(
                text     = banner.imageUrl,
                style    = MaterialTheme.typography.bodySmall.copy(
                    color = Color.White.copy(alpha = 0.72f),
                ),
                modifier = Modifier.padding(top = 5.dp),
            )
        }
    }
}

// ── Cross watermark ───────────────────────────────────────────────────────────

@Composable
private fun CrossWatermark(modifier: Modifier = Modifier) {
    Canvas(modifier = modifier) {
        val sx = size.width  / 24f
        val sy = size.height / 24f
        drawPath(
            path = Path().apply {
                moveTo(10.6f * sx, 2.5f  * sy); lineTo(13.4f * sx, 2.5f  * sy)
                lineTo(13.4f * sx, 6.7f  * sy); lineTo(18f   * sx, 6.7f  * sy)
                lineTo(18f   * sx, 9.5f  * sy); lineTo(13.4f * sx, 9.5f  * sy)
                lineTo(13.4f * sx, 21.5f * sy); lineTo(10.6f * sx, 21.5f * sy)
                lineTo(10.6f * sx, 9.5f  * sy); lineTo(6f    * sx, 9.5f  * sy)
                lineTo(6f    * sx, 6.7f  * sy); lineTo(10.6f * sx, 6.7f  * sy)
                close()
            },
            color = Color.White,
            alpha = 0.08f,
        )
    }
}

// ── Dízimos card ──────────────────────────────────────────────────────────────

@Composable
private fun DizimosCard(bank: BankInfo, modifier: Modifier = Modifier) {
    Box(
        modifier
            .fillMaxWidth()
            .shadow(
                elevation    = 12.dp,
                shape        = RoundedCornerShape(24.dp),
                spotColor    = Color(0xB307315E),
                ambientColor = Color(0x1A07315E),
            )
            .clip(RoundedCornerShape(24.dp))
            .drawBehind {
                drawRect(
                    brush = Brush.radialGradient(
                        colorStops = arrayOf(
                            0f    to Color(0xFF1257A0),
                            0.40f to Color(0xFF0B4D8C),
                            1f    to Color(0xFF07315E),
                        ),
                        center = Offset(size.width * 0.82f, -size.height * 0.08f),
                        radius = size.width * 1.30f,
                    ),
                )
            }
            .padding(22.dp),
    ) {
        Column {
            Text(
                "DÍZIMOS & OFERTAS",
                style = MaterialTheme.typography.labelSmall.copy(
                    color = Color.White.copy(alpha = 0.6f),
                ),
            )
            Spacer(Modifier.height(PazSpacing.Xs))
            Text(
                "Contribua com a visão",
                style = MaterialTheme.typography.headlineMedium.copy(
                    fontSize   = 27.sp,
                    lineHeight = 30.sp,
                    color      = Color.White,
                ),
            )
            Text(
                "Sua oferta transforma vidas na comunidade",
                style    = MaterialTheme.typography.bodySmall.copy(
                    color      = Color.White.copy(alpha = 0.70f),
                    lineHeight = 20.sp,
                ),
                modifier = Modifier.padding(top = PazSpacing.Xs),
            )
            Spacer(Modifier.height(PazSpacing.Lg))
            Row(horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md)) {
                if (bank.pixKey != null) {
                    DizimosButton("PIX",    primary = true,  modifier = Modifier.weight(1f), onClick = {})
                }
                DizimosButton("Cartão", primary = false, modifier = Modifier.weight(1f), onClick = {})
            }
        }
    }
}

@Composable
private fun DizimosButton(
    label: String,
    primary: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val pressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue   = if (pressed) 0.97f else 1f,
        animationSpec = tween(120),
        label         = "btnScale",
    )
    Box(
        modifier = modifier
            .height(52.dp)
            .shadow(
                elevation = if (primary) 8.dp else 0.dp,
                shape     = PazShapePill,
                spotColor = Color(0x55000000),
            )
            .clip(PazShapePill)
            .background(if (primary) Color.White else Color.White.copy(alpha = 0.13f))
            .border(
                width = if (primary) 0.dp else 1.dp,
                color = if (primary) Color.Transparent else Color.White.copy(alpha = 0.24f),
                shape = PazShapePill,
            )
            .clickable(interactionSource = interactionSource, indication = null, onClick = onClick)
            .graphicsLayer { scaleX = scale; scaleY = scale },
        contentAlignment = Alignment.Center,
    ) {
        Text(
            label,
            style = MaterialTheme.typography.bodyMedium.copy(
                fontWeight = FontWeight.Bold,
                fontSize   = 14.5.sp,
                color      = if (primary) Color(0xFF0B3A6B) else Color.White,
            ),
        )
    }
}

// ── Agenda section ────────────────────────────────────────────────────────────

private data class DayItem(val dow: String, val day: Int)
private val agendaDays = listOf(
    DayItem("SEG", 2), DayItem("TER", 3), DayItem("QUA", 4),
    DayItem("QUI", 5), DayItem("SEX", 6), DayItem("SÁB", 7), DayItem("DOM", 8),
)

@Composable
private fun AgendaSection(
    events: List<AgendaEvent>,
    selectedDay: Int,
    onDaySelected: (Int) -> Unit,
    onEventTap: (String) -> Unit,
) {
    Column(Modifier.padding(top = PazSpacing.Xl)) {
        // Section header
        Row(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = PazSpacing.Lg),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment     = Alignment.CenterVertically,
        ) {
            Text("Agenda", style = MaterialTheme.typography.headlineMedium)
            TextButton(onClick = {}, contentPadding = PaddingValues(0.dp)) {
                Text(
                    "Mês completo",
                    style = MaterialTheme.typography.labelSmall.copy(color = PazColors.PrimaryLight),
                )
                Icon(
                    Icons.AutoMirrored.Outlined.ArrowForward,
                    contentDescription = null,
                    tint               = PazColors.PrimaryLight,
                    modifier           = Modifier.size(15.dp).padding(start = 4.dp),
                )
            }
        }
        Spacer(Modifier.height(PazSpacing.Md))

        // Day strip
        Row(
            modifier             = Modifier
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = PazSpacing.Lg),
            horizontalArrangement = Arrangement.spacedBy(PazSpacing.Sm),
        ) {
            agendaDays.forEachIndexed { index, item ->
                DayPill(
                    item       = item,
                    isSelected = index == selectedDay,
                    onClick    = { onDaySelected(index) },
                )
            }
        }
        Spacer(Modifier.height(PazSpacing.Md))

        // Event cards
        Column(
            Modifier.padding(horizontal = PazSpacing.Lg),
            verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
        ) {
            events.take(3).forEach { event ->
                EventCard(event = event, onClick = { onEventTap(event.id) })
            }
        }
        Spacer(Modifier.height(PazSpacing.Lg))
    }
}

@Composable
private fun DayPill(item: DayItem, isSelected: Boolean, onClick: () -> Unit) {
    val activeGradient = remember {
        Brush.linearGradient(
            colors = listOf(Color(0xFF0A3360), Color(0xFF06294C)),
            start  = Offset(0f, 0f),
            end    = Offset(0f, Float.POSITIVE_INFINITY),
        )
    }
    Box(
        Modifier
            .size(width = 52.dp, height = 74.dp)
            .shadow(
                elevation    = if (isSelected) 8.dp else 2.dp,
                shape        = RoundedCornerShape(18.dp),
                spotColor    = if (isSelected) Color(0xB307295E) else Color(0x1414243A),
                ambientColor = Color(0x0A14243A),
            )
            .clip(RoundedCornerShape(18.dp))
            .then(
                if (isSelected) Modifier.background(activeGradient)
                else Modifier
                    .background(MaterialTheme.colorScheme.surface)
                    .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(18.dp))
            )
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text(
                item.dow,
                style = MaterialTheme.typography.labelSmall.copy(
                    color        = if (isSelected) Color.White.copy(alpha = 0.72f)
                                   else MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize     = 11.sp,
                    letterSpacing = 0.5.sp,
                ),
            )
            Text(
                item.day.toString(),
                style = MaterialTheme.typography.bodyLarge.copy(
                    fontWeight = FontWeight.Bold,
                    fontSize   = 21.sp,
                    color      = if (isSelected) Color.White
                                 else MaterialTheme.colorScheme.onSurface,
                ),
            )
            Box(
                Modifier
                    .padding(top = 2.dp)
                    .size(4.dp)
                    .background(
                        color = if (isSelected) PazColors.Gold else Color.Transparent,
                        shape = CircleShape,
                    )
            )
        }
    }
}

@Composable
private fun EventCard(event: AgendaEvent, onClick: () -> Unit) {
    val time = event.startDate.substringAfter("T", "").take(5).ifEmpty { "--:--" }
    Row(
        Modifier
            .fillMaxWidth()
            .shadow(
                elevation    = 4.dp,
                shape        = RoundedCornerShape(18.dp),
                spotColor    = Color(0x3514243A),
                ambientColor = Color(0x0A14243A),
            )
            .clip(RoundedCornerShape(18.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f), RoundedCornerShape(18.dp))
            .clickable(onClick = onClick)
            .padding(15.dp),
        verticalAlignment     = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        // Time
        Text(
            time,
            style    = MaterialTheme.typography.bodyMedium.copy(
                fontWeight = FontWeight.Bold,
                fontSize   = 15.5.sp,
                color      = PazColors.PrimaryLight,
            ),
            modifier = Modifier.width(50.dp),
        )
        // Dot with ring
        Box(Modifier.size(18.dp), contentAlignment = Alignment.Center) {
            Box(
                Modifier
                    .size(18.dp)
                    .background(MaterialTheme.colorScheme.surfaceVariant, CircleShape)
            )
            Box(
                Modifier
                    .size(10.dp)
                    .background(PazColors.Primary, CircleShape)
            )
        }
        // Title + location
        Column(Modifier.weight(1f)) {
            Text(
                event.title,
                style    = MaterialTheme.typography.bodyMedium.copy(
                    fontWeight = FontWeight.Bold,
                    fontSize   = 15.5.sp,
                ),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            if (!event.location.isNullOrBlank()) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier          = Modifier.padding(top = 3.dp),
                ) {
                    Icon(
                        imageVector        = Icons.Filled.LocationOn,
                        contentDescription = null,
                        tint               = Color(0xFFE0533D),
                        modifier           = Modifier.size(12.dp),
                    )
                    Spacer(Modifier.width(4.dp))
                    Text(
                        event.location!!,
                        style = MaterialTheme.typography.bodySmall.copy(
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        ),
                    )
                }
            }
        }
    }
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

@Composable
private fun LoadingSkeleton(contentPadding: PaddingValues) {
    LazyColumn(
        contentPadding      = contentPadding,
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
        modifier            = Modifier
            .fillMaxSize()
            .padding(horizontal = PazSpacing.Lg),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Md)) }
        item { PazSkeleton(height = 176.dp) }
        item { PazCardSkeleton() }
        repeat(3) { item { PazCardSkeleton() } }
    }
}

// ── Error state ───────────────────────────────────────────────────────────────

@Composable
private fun ErrorState(message: String, onRetry: () -> Unit, contentPadding: PaddingValues) {
    Box(
        Modifier
            .fillMaxSize()
            .padding(contentPadding),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
        ) {
            Text("Erro ao carregar", style = MaterialTheme.typography.titleMedium)
            Text(
                message,
                style = MaterialTheme.typography.bodySmall.copy(
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                ),
            )
            PazButton(text = "Tentar novamente", onClick = onRetry)
        }
    }
}
```

- [ ] **Step 2: Verify Android build**

```bash
cd /Users/jonathalima/Developer/church/kmp-mobile
./gradlew :android:assembleDebug 2>&1 | tail -20
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 3: Run on Android emulator and compare to HTML**

```bash
./gradlew :android:installDebug
```

Open `~/Downloads/design_handoff_paz_church/Home Native v2.html` in a browser. Check:
- Playfair greeting collapses as you scroll
- 3 featured cards swipe with dot indicator animating
- Dízimos card has radial gradient, PIX + Cartão buttons animate on press
- Day strip scrolls horizontally, Wednesday pill is pre-selected (dark gradient + gold dot)
- 3 event cards show time, dot ring, title, location with red pin
- Dark mode: toggle device dark mode, verify all surfaces switch correctly

- [ ] **Step 4: Commit**

```bash
git add android/src/main/kotlin/br/church/paz/android/ui/features/home/HomeScreen.kt
git commit -m "feat(android/home): full redesign — gradient cards, dízimos, agenda strip, collapsing nav"
```

---

## Task 5: iOS HomeView.swift — full rewrite

**Files:**
- Modify: `ios/PazChurch/Features/Home/HomeView.swift`

- [ ] **Step 1: Replace `HomeView.swift` with the full rewrite**

```swift
import SwiftUI
import Shared

// MARK: - Scroll offset preference key
private struct ScrollOffsetKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) { value = nextValue() }
}

// MARK: - HomeView
struct HomeView: View {
    @StateObject private var viewModel: HomeViewModel
    @State private var scrollOffset: CGFloat = 0
    @State private var selectedDayIndex: Int = 2     // Wednesday
    @State private var currentFeatureIndex: Int = 0
    @Environment(\.colorScheme) private var colorScheme

    init(homeRepository: HomeRepository, authRepository: AuthRepository) {
        _viewModel = StateObject(wrappedValue: HomeViewModel(
            homeRepository: homeRepository,
            authRepository: authRepository
        ))
    }

    private var isCollapsed: Bool { scrollOffset > 64 }
    private var isDark: Bool { colorScheme == .dark }

    // Convenience accessors from homeContent
    private var banners: [Banner] { viewModel.homeContent?.banners ?? [] }
    private var bank: BankInfo? { viewModel.homeContent?.contribution?.bank }
    private var agendaEvents: [AgendaEvent] { Array((viewModel.homeContent?.agenda ?? []).prefix(3)) }

    var body: some View {
        ZStack(alignment: .top) {
            mainScroll
            compactNavOverlay
        }
        .ignoresSafeArea(edges: .top)
    }

    // MARK: - Main scroll

    private var mainScroll: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Anchor for scroll offset tracking
                GeometryReader { geo in
                    Color.clear.preference(
                        key: ScrollOffsetKey.self,
                        value: -geo.frame(in: .named("homeScroll")).minY
                    )
                }
                .frame(height: 0)

                largeHeader

                if viewModel.isLoading {
                    loadingState
                } else if viewModel.error != nil {
                    errorState
                } else {
                    contentSections
                }

                Spacer().frame(height: 40)
            }
        }
        .coordinateSpace(name: "homeScroll")
        .onPreferenceChange(ScrollOffsetKey.self) { scrollOffset = $0 }
        .background(PazColors.background)
    }

    // MARK: - Content sections

    @ViewBuilder
    private var contentSections: some View {
        if !banners.isEmpty {
            featuredSection
                .padding(.top, 26)
                .transition(.opacity.combined(with: .move(edge: .bottom)))
                .animation(.spring(response: 0.6, dampingFraction: 0.8), value: banners.count)
        }
        if let b = bank {
            dizimosCard(bank: b)
                .padding(.top, 26)
                .transition(.opacity.combined(with: .move(edge: .bottom)))
                .animation(.spring(response: 0.6, dampingFraction: 0.8).delay(0.065), value: banners.count)
        }
        if !agendaEvents.isEmpty {
            agendaSection
                .padding(.top, 26)
                .transition(.opacity.combined(with: .move(edge: .bottom)))
                .animation(.spring(response: 0.6, dampingFraction: 0.8).delay(0.13), value: agendaEvents.count)
        }
    }

    // MARK: - Compact nav overlay

    private var compactNavOverlay: some View {
        HStack {
            if isCollapsed {
                Spacer()
                Text("Início")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(PazColors.ink)
                Spacer()
            } else {
                Spacer()
            }
            bellButton
                .opacity(isCollapsed ? 1 : 0)
        }
        .padding(.horizontal, 16)
        .frame(height: 46)
        .background(
            Group {
                if isCollapsed {
                    Rectangle()
                        .fill(.ultraThinMaterial)
                        .overlay(
                            Rectangle().fill(PazColors.line).frame(height: 0.5),
                            alignment: .bottom
                        )
                } else {
                    Color.clear
                }
            }
        )
        .padding(.top, safeAreaTop)
        .animation(.easeInOut(duration: 0.2), value: isCollapsed)
    }

    private var bellButton: some View {
        Button(action: {}) {
            ZStack(alignment: .topTrailing) {
                Image(systemName: "bell")
                    .font(.system(size: 20, weight: .regular))
                    .foregroundColor(PazColors.ink)
                Circle()
                    .fill(PazColors.pazGold)
                    .frame(width: 8, height: 8)
                    .offset(x: 2, y: -2)
            }
            .frame(width: 23, height: 23)
        }
    }

    // MARK: - Large header

    private var largeHeader: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 0) {
                Text("QUARTA, 4 DE JUNHO")
                    .font(PazTypography.labelSmall)
                    .foregroundColor(PazColors.pazPrimaryLight)
                    .padding(.bottom, 7)
                Text("Olá, \(viewModel.userName.isEmpty ? "Lucas" : viewModel.userName)")
                    .font(.custom("PlayfairDisplay-ExtraBold", size: 34))
                    .foregroundColor(isDark ? PazColors.ink : PazColors.pazPrimary)
                    .lineSpacing(2)
            }
            Spacer()
            bellButton
                .opacity(isCollapsed ? 0 : 1)
                .animation(.easeInOut(duration: 0.2), value: isCollapsed)
        }
        .padding(.horizontal, 18)
        .padding(.top, safeAreaTop + 52 + 6)
        .padding(.bottom, 2)
    }

    // MARK: - Featured section

    private var featuredSection: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Eventos")
                    .font(.custom("PlayfairDisplay-ExtraBold", size: 23))
                    .foregroundColor(PazColors.ink)
                Spacer()
                Button(action: {}) {
                    HStack(spacing: 5) {
                        Text("Ver todos").font(PazTypography.labelSmall)
                        Image(systemName: "arrow.right").font(.system(size: 12, weight: .semibold))
                    }
                    .foregroundColor(PazColors.pazPrimaryLight)
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 13)

            TabView(selection: $currentFeatureIndex) {
                ForEach(Array(banners.enumerated()), id: \.offset) { index, banner in
                    FeaturedCardView(
                        badge:    banner.actionUrl ?? "",
                        title:    banner.title,
                        // banner.imageUrl holds subtitle in mock; see TODO in HomeRepositoryImpl
                        subtitle: banner.imageUrl,
                        isAlt:    index % 2 == 1
                    )
                    .padding(.horizontal, 18)
                    .tag(index)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .frame(height: 176)

            // Dots
            HStack(spacing: 6) {
                ForEach(0..<banners.count, id: \.self) { i in
                    Capsule()
                        .fill(i == currentFeatureIndex
                              ? (isDark ? PazColors.pazPrimaryLight : PazColors.pazPrimary)
                              : Color(white: 0, opacity: 0.16))
                        .frame(width: i == currentFeatureIndex ? 20 : 7, height: 7)
                        .animation(.easeInOut(duration: 0.25), value: currentFeatureIndex)
                }
            }
            .padding(.top, 13)
        }
    }

    // MARK: - Dízimos card

    private func dizimosCard(bank: BankInfo) -> some View {
        ZStack(alignment: .topLeading) {
            RadialGradient(
                colors: [Color(hex: "1257A0"), Color(hex: "0B4D8C"), Color(hex: "07315E")],
                center: UnitPoint(x: 0.82, y: -0.08),
                startRadius: 0,
                endRadius: 400
            )

            VStack(alignment: .leading, spacing: 0) {
                Text("DÍZIMOS & OFERTAS")
                    .font(PazTypography.labelSmall)
                    .foregroundColor(.white.opacity(0.6))

                Text("Contribua com a visão")
                    .font(.custom("PlayfairDisplay-ExtraBold", size: 27))
                    .foregroundColor(.white)
                    .padding(.top, 9)

                Text("Sua oferta transforma vidas na comunidade")
                    .font(PazTypography.bodyMedium)
                    .foregroundColor(.white.opacity(0.7))
                    .lineSpacing(4)
                    .padding(.top, 7)

                HStack(spacing: 11) {
                    if bank.pixKey != nil {
                        DizimosButtonView(label: "PIX", primary: true)
                    }
                    DizimosButtonView(label: "Cartão", primary: false)
                }
                .padding(.top, 18)
            }
            .padding(22)
        }
        .clipShape(RoundedRectangle(cornerRadius: 24))
        .shadow(color: Color(hex: "07315E").opacity(0.65), radius: 21, x: 0, y: 22)
        .padding(.horizontal, 16)
    }

    // MARK: - Agenda section

    private var agendaSection: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Agenda")
                    .font(.custom("PlayfairDisplay-ExtraBold", size: 23))
                    .foregroundColor(PazColors.ink)
                Spacer()
                Button(action: {}) {
                    HStack(spacing: 5) {
                        Text("Mês completo").font(PazTypography.labelSmall)
                        Image(systemName: "arrow.right").font(.system(size: 12, weight: .semibold))
                    }
                    .foregroundColor(PazColors.pazPrimaryLight)
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 13)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 9) {
                    ForEach(Array(agendaDayItems.enumerated()), id: \.offset) { index, item in
                        DayPillView(dow: item.dow, day: item.day, isSelected: index == selectedDayIndex)
                            .onTapGesture {
                                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                    selectedDayIndex = index
                                }
                            }
                    }
                }
                .padding(.horizontal, 18)
                .padding(.vertical, 4)
            }
            .padding(.bottom, 6)

            VStack(spacing: 12) {
                ForEach(agendaEvents, id: \.id) { event in
                    EventCardView(event: event, onTap: {})
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 4)
        }
    }

    // MARK: - Loading / Error states

    private var loadingState: some View {
        VStack(spacing: PazSpacing.lg) {
            SkeletonView().frame(height: 176).padding(.horizontal, PazSpacing.lg).padding(.top, PazSpacing.lg)
            SkeletonView().frame(height: 130).padding(.horizontal, PazSpacing.lg)
            SkeletonView().frame(height: 80).padding(.horizontal, PazSpacing.lg)
            SkeletonView().frame(height: 80).padding(.horizontal, PazSpacing.lg)
            SkeletonView().frame(height: 80).padding(.horizontal, PazSpacing.lg)
        }
        .padding(.top, PazSpacing.xl)
    }

    private var errorState: some View {
        VStack(spacing: PazSpacing.md) {
            Spacer().frame(height: 60)
            Image(systemName: "exclamationmark.circle")
                .font(.system(size: 48))
                .foregroundColor(PazColors.error)
            Text("Erro ao carregar").font(PazTypography.titleMedium)
            Text(viewModel.error ?? "Algo deu errado")
                .font(PazTypography.bodySmall).foregroundColor(.gray)
            Button(action: { viewModel.onRetry() }) {
                Text("Tentar Novamente")
                    .font(PazTypography.titleMedium).foregroundColor(.white)
                    .frame(maxWidth: .infinity).padding(.vertical, PazSpacing.md)
                    .background(PazColors.primary).cornerRadius(12)
            }
            .padding(.top, PazSpacing.md)
        }
        .padding(PazSpacing.lg)
    }

    // MARK: - Safe area helper

    private var safeAreaTop: CGFloat {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first?.windows.first?.safeAreaInsets.top ?? 47
    }
}

// MARK: - Agenda mock data
private struct AgendaDayItem { let dow: String; let day: Int }
private let agendaDayItems: [AgendaDayItem] = [
    .init(dow: "SEG", day: 2), .init(dow: "TER", day: 3), .init(dow: "QUA", day: 4),
    .init(dow: "QUI", day: 5), .init(dow: "SEX", day: 6), .init(dow: "SÁB", day: 7),
    .init(dow: "DOM", day: 8),
]

// MARK: - FeaturedCardView

private struct FeaturedCardView: View {
    let badge: String
    let title: String
    let subtitle: String
    let isAlt: Bool

    @State private var pressed = false

    private var gradient: LinearGradient {
        isAlt
            ? LinearGradient(
                colors: [Color(hex: "0E4683"), Color(hex: "0B3A6B"), Color(hex: "072E58")],
                startPoint: .topLeading, endPoint: .bottomTrailing)
            : LinearGradient(
                colors: [Color(hex: "0A335F"), Color(hex: "072E5A"), Color(hex: "06243F")],
                startPoint: .topLeading, endPoint: .bottomTrailing)
    }

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            gradient

            CrossWatermarkView()
                .frame(width: 158, height: 158)
                .opacity(0.08)
                .rotationEffect(.degrees(-9))
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
                .offset(x: 14, y: 30)
                .clipped()

            VStack(alignment: .leading, spacing: 0) {
                Text(badge)
                    .font(PazTypography.labelSmall)
                    .foregroundColor(Color(hex: "3A2600"))
                    .padding(.horizontal, 13).padding(.vertical, 6)
                    .background(Color(hex: "FFB300"))
                    .clipShape(Capsule())

                Spacer()

                Text(title)
                    .font(.custom("PlayfairDisplay-ExtraBold", size: 23))
                    .foregroundColor(.white)
                    .lineLimit(2)

                Text(subtitle)
                    .font(PazTypography.bodySmall)
                    .foregroundColor(.white.opacity(0.72))
                    .padding(.top, 5)
            }
            .padding(18)
        }
        .frame(height: 176)
        .clipShape(RoundedRectangle(cornerRadius: 22))
        .shadow(color: Color(hex: "07295E").opacity(0.6), radius: 15, x: 0, y: 16)
        .scaleEffect(pressed ? 0.97 : 1.0)
        .animation(.easeInOut(duration: 0.12), value: pressed)
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in pressed = true }
                .onEnded   { _ in pressed = false }
        )
    }
}

// MARK: - CrossWatermarkView

private struct CrossWatermarkView: View {
    var body: some View {
        Canvas { ctx, size in
            let sx = size.width  / 24
            let sy = size.height / 24
            var p = Path()
            p.move(to:    .init(x: 10.6 * sx, y:  2.5 * sy))
            p.addLine(to: .init(x: 13.4 * sx, y:  2.5 * sy))
            p.addLine(to: .init(x: 13.4 * sx, y:  6.7 * sy))
            p.addLine(to: .init(x: 18   * sx, y:  6.7 * sy))
            p.addLine(to: .init(x: 18   * sx, y:  9.5 * sy))
            p.addLine(to: .init(x: 13.4 * sx, y:  9.5 * sy))
            p.addLine(to: .init(x: 13.4 * sx, y: 21.5 * sy))
            p.addLine(to: .init(x: 10.6 * sx, y: 21.5 * sy))
            p.addLine(to: .init(x: 10.6 * sx, y:  9.5 * sy))
            p.addLine(to: .init(x:  6   * sx, y:  9.5 * sy))
            p.addLine(to: .init(x:  6   * sx, y:  6.7 * sy))
            p.addLine(to: .init(x: 10.6 * sx, y:  6.7 * sy))
            p.closeSubpath()
            ctx.fill(p, with: .color(.white))
        }
    }
}

// MARK: - DizimosButtonView

private struct DizimosButtonView: View {
    let label: String
    let primary: Bool
    @State private var pressed = false

    var body: some View {
        Text(label)
            .font(PazTypography.titleMedium)
            .foregroundColor(primary ? Color(hex: "0B3A6B") : .white)
            .frame(maxWidth: .infinity)
            .frame(height: 52)
            .background(
                Group {
                    if primary {
                        Capsule().fill(.white)
                            .shadow(color: .black.opacity(0.45), radius: 10, x: 0, y: 8)
                    } else {
                        Capsule().fill(.ultraThinMaterial)
                            .overlay(Capsule().strokeBorder(.white.opacity(0.24), lineWidth: 1))
                    }
                }
            )
            .scaleEffect(pressed ? 0.97 : 1.0)
            .animation(.easeInOut(duration: 0.12), value: pressed)
            .simultaneousGesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { _ in pressed = true }
                    .onEnded   { _ in pressed = false }
            )
    }
}

// MARK: - DayPillView

private struct DayPillView: View {
    let dow: String
    let day: Int
    let isSelected: Bool

    var body: some View {
        VStack(spacing: 3) {
            Text(dow)
                .font(PazTypography.labelSmall)
                .foregroundColor(isSelected ? .white.opacity(0.72) : PazColors.slateLight)
            Text("\(day)")
                .font(.system(size: 21, weight: .bold))
                .foregroundColor(isSelected ? .white : PazColors.ink)
            Circle()
                .fill(isSelected ? PazColors.pazGold : .clear)
                .frame(width: 4, height: 4)
        }
        .frame(width: 52, height: 74)
        .background(
            Group {
                if isSelected {
                    RoundedRectangle(cornerRadius: 18)
                        .fill(LinearGradient(
                            colors: [Color(hex: "0A3360"), Color(hex: "06294C")],
                            startPoint: .top, endPoint: .bottom
                        ))
                        .shadow(color: Color(hex: "07295E").opacity(0.6), radius: 11, x: 0, y: 12)
                } else {
                    RoundedRectangle(cornerRadius: 18)
                        .fill(PazColors.surface)
                        .overlay(RoundedRectangle(cornerRadius: 18).strokeBorder(PazColors.line))
                        .shadow(color: .black.opacity(0.05), radius: 3, x: 0, y: 2)
                }
            }
        )
    }
}

// MARK: - EventCardView

private struct EventCardView: View {
    let event: AgendaEvent
    let onTap: () -> Void

    private var time: String {
        guard let part = event.startDate.split(separator: "T").last else { return "--:--" }
        return String(part.prefix(5))
    }

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 13) {
                Text(time)
                    .font(.system(size: 15.5, weight: .bold))
                    .foregroundColor(PazColors.pazPrimaryLight)
                    .frame(width: 50, alignment: .leading)

                ZStack {
                    Circle().fill(PazColors.tint).frame(width: 18, height: 18)
                    Circle().fill(PazColors.pazPrimary).frame(width: 10, height: 10)
                }

                VStack(alignment: .leading, spacing: 3) {
                    Text(event.title)
                        .font(.system(size: 15.5, weight: .bold))
                        .foregroundColor(PazColors.ink)
                        .lineLimit(1)

                    if let loc = event.location, !loc.isEmpty {
                        HStack(spacing: 5) {
                            Image(systemName: "mappin.fill")
                                .font(.system(size: 10))
                                .foregroundColor(Color(hex: "E0533D"))
                            Text(loc)
                                .font(PazTypography.bodySmall)
                                .foregroundColor(PazColors.slate)
                        }
                    }
                }

                Spacer()
            }
            .padding(15)
            .background(
                RoundedRectangle(cornerRadius: 18)
                    .fill(PazColors.surface)
                    .overlay(RoundedRectangle(cornerRadius: 18).strokeBorder(PazColors.line))
                    .shadow(color: .black.opacity(0.08), radius: 9, x: 0, y: 4)
            )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - SkeletonView (reuse existing or inline)
private struct SkeletonView: View {
    @State private var animating = false
    var body: some View {
        RoundedRectangle(cornerRadius: 12)
            .fill(
                LinearGradient(
                    colors: [Color.gray.opacity(0.15), Color.gray.opacity(0.25), Color.gray.opacity(0.15)],
                    startPoint: animating ? .leading : .trailing,
                    endPoint:   animating ? .trailing : .leading
                )
            )
            .onAppear { withAnimation(.linear(duration: 1.2).repeatForever(autoreverses: false)) { animating = true } }
    }
}

#Preview {
    HomeView(
        homeRepository: IosAppContainer.shared.homeRepository,
        authRepository: IosAppContainer.shared.authRepository
    )
}
```

- [ ] **Step 2: Build in Xcode (⌘B)**

Expected: no errors. If there are `SkeletonView` name conflicts with an existing component, rename the private struct to `HomeSkeletonView`.

- [ ] **Step 3: Run on iOS Simulator and compare to HTML**

Run on iPhone 16 Pro (or similar). Open `~/Downloads/design_handoff_paz_church/Home Native v2.html` in Safari. Check:
- Large title shows Playfair greeting; collapses to compact nav + blur backdrop on scroll
- Featured cards swipe natively (TabView paging), dots animate width on swipe
- Dízimos card radial gradient, `.ultraThinMaterial` Cartão button
- Day strip scrolls, Wednesday pre-selected (dark gradient pill + gold dot)
- Event cards show time, dot ring, red pin icon, location
- Dark mode: Settings → Developer → Dark Mode appearance — all adaptive colors switch

- [ ] **Step 4: Commit**

```bash
git add ios/PazChurch/Features/Home/HomeView.swift
git commit -m "feat(ios/home): full redesign — gradient cards, dízimos, agenda strip, collapsing nav"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Collapsing nav (Android: `LargeTopAppBar exitUntilCollapsed`, iOS: scroll offset + overlay)
- ✅ Featured cards with gradient, cross watermark, gold badge, Playfair title
- ✅ Dot indicators with animated width
- ✅ Dízimos radial gradient card with PIX + Cartão buttons + press animation
- ✅ Day strip 52×74dp pills, active dark gradient + gold dot
- ✅ Event cards with time, dot ring, red pin, 18dp radius
- ✅ Staggered entrance animations (fade + slide)
- ✅ Dark mode — all adaptive tokens
- ✅ Landscape — scroll-based layout adapts naturally
- ✅ Mock data via repository — ViewModel untouched
- ✅ Tab bar out of scope (app shell)

**Type consistency:** `Banner.actionUrl` used as badge, `Banner.imageUrl` used as subtitle in mock — documented with `TODO(backend)` comment in both files.
