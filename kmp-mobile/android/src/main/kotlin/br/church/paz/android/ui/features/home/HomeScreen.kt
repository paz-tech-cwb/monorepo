package br.church.paz.android.ui.features.home

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.PageSize
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowForward
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.LargeTopAppBar
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.navigation.Screen
import br.church.paz.android.ui.components.PazCardSkeleton
import br.church.paz.android.ui.components.PazErrorState
import br.church.paz.android.ui.components.PazGlassCard
import br.church.paz.android.ui.components.PazMeshBackground
import br.church.paz.android.ui.components.PazPillPrimaryButton
import br.church.paz.android.ui.components.PazPullToRefresh
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazShapePill
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.AgendaEvent
import br.church.paz.shared.domain.model.BankInfo
import br.church.paz.shared.domain.model.Banner
import coil3.compose.AsyncImage
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.koin.androidx.compose.koinViewModel
import java.util.Calendar
import java.util.Locale

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

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                is HomeEffect.OpenUrl ->
                    context.startActivity(
                        Intent(Intent.ACTION_VIEW, Uri.parse(effect.url)),
                    )
                is HomeEffect.NavigateToAgenda -> navController.navigate(Screen.AgendaDetail.createRoute(effect.eventId))
            }
        }
    }

    Box(Modifier.fillMaxSize()) {
        PazMeshBackground()

        Scaffold(
            topBar = { HomeTopBar() },
            containerColor = Color.Transparent,
        ) { innerPadding ->
            val bottomPad = contentPadding.calculateBottomPadding() + PazSpacing.Xl
            val adjustedPadding =
                PaddingValues(
                    top = innerPadding.calculateTopPadding(),
                    bottom = bottomPad,
                )
            PazPullToRefresh(
                isRefreshing = uiState.isRefreshing,
                onRefresh = viewModel::refresh,
                modifier = Modifier.fillMaxSize(),
            ) {
                when {
                    uiState.isLoading -> LoadingSkeleton(adjustedPadding)
                    uiState.error != null -> ErrorState(uiState.error!!, viewModel::load, adjustedPadding)
                    else ->
                        HomeContent(
                            banners = uiState.banners,
                            agendaEvents = uiState.agendaEvents,
                            bank = uiState.bank,
                            sectionOrder = uiState.sectionOrder,
                            showLifeGroupDiscoveryCTA = uiState.showLifeGroupDiscoveryCTA,
                            onBannerTap = viewModel::onBannerTapped,
                            onEventTap = viewModel::onEventTapped,
                            onSeeAllEvents = { navController.navigate(Screen.AgendaList.route) },
                            onLifeGroupDiscoveryTap = { navController.navigate(Screen.LifeGroupDiscovery.route) },
                            contentPadding = adjustedPadding,
                        )
                }
            }
        }
    }
}

// ── Top bar ───────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun HomeTopBar() {
    LargeTopAppBar(
        title = { Text("Início") },
        colors = TopAppBarDefaults.largeTopAppBarColors(containerColor = Color.Transparent),
    )
}

// ── Content ───────────────────────────────────────────────────────────────────

@Composable
private fun HomeContent(
    banners: List<Banner>,
    agendaEvents: List<AgendaEvent>,
    bank: BankInfo?,
    sectionOrder: List<String>,
    showLifeGroupDiscoveryCTA: Boolean,
    onBannerTap: (String?) -> Unit,
    onEventTap: (String) -> Unit,
    onSeeAllEvents: () -> Unit,
    onLifeGroupDiscoveryTap: () -> Unit,
    contentPadding: PaddingValues,
) {
    val nextSevenDaysEvents = remember(agendaEvents) { filterNextSevenDays(agendaEvents).take(7) }

    LazyColumn(
        contentPadding = contentPadding,
        modifier = Modifier.fillMaxSize(),
    ) {
        sectionOrder.forEachIndexed { index, type ->
            when (type) {
                "announcements" ->
                    if (banners.isNotEmpty()) {
                        item(key = "featured") {
                            AnimatedSection(index = index) {
                                FeaturedSection(banners = banners, onBannerTap = onBannerTap)
                            }
                        }
                    }
                "contribution" ->
                    if (bank != null) {
                        item(key = "dizimos") {
                            AnimatedSection(index = index) {
                                DizimosCard(
                                    bank = bank,
                                    modifier = Modifier.padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Xl),
                                )
                            }
                        }
                    }
                "agenda" ->
                    item(key = "agenda") {
                        AnimatedSection(index = index) {
                            AgendaSection(
                                nextSevenDaysEvents = nextSevenDaysEvents,
                                onEventTap = onEventTap,
                                onSeeAll = onSeeAllEvents,
                            )
                        }
                    }
            }
        }

        // Client-side addition after the ordered sections — not a new
        // backend `sectionOrder` key, per plan.
        if (showLifeGroupDiscoveryCTA) {
            item(key = "life_group_discovery_cta") {
                AnimatedSection(index = sectionOrder.size) {
                    LifeGroupDiscoveryCTA(
                        onClick = onLifeGroupDiscoveryTap,
                        modifier =
                            Modifier
                                .padding(horizontal = PazSpacing.Lg)
                                .padding(top = PazSpacing.Xl),
                    )
                }
            }
        }
    }
}

// ── Life group discovery CTA ─────────────────────────────────────────────────

@Composable
private fun LifeGroupDiscoveryCTA(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    androidx.compose.material3.Surface(
        onClick = onClick,
        modifier = modifier.fillMaxWidth(),
        shape =
            androidx.compose.foundation.shape
                .RoundedCornerShape(PazSpacing.CardRadiusLarge),
        color = androidx.compose.ui.graphics.Color.Transparent,
    ) {
        PazGlassCard(modifier = Modifier.fillMaxWidth(), cornerRadius = PazSpacing.CardRadiusLarge) {
            Column(Modifier.padding(PazSpacing.Lg)) {
                Text(
                    "LIFE GROUPS",
                    style =
                        MaterialTheme.typography.labelMedium.copy(
                            color = PazColors.accent.copy(alpha = 0.7f),
                        ),
                )
                Spacer(Modifier.height(PazSpacing.Xs))
                Text(
                    "Encontre um grupo perto de você",
                    style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Black),
                )
                Spacer(Modifier.height(PazSpacing.Sm))
                Text(
                    "Você ainda não faz parte de um Life Group. Veja no mapa os grupos mais próximos e comece a participar.",
                    style =
                        MaterialTheme.typography.bodySmall.copy(
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                        ),
                )
                Spacer(Modifier.height(PazSpacing.Md))
                Row(
                    Modifier
                        .fillMaxWidth()
                        .height(PazSpacing.PillButtonHeight)
                        .clip(PazShapePill)
                        .background(PazColors.accent.copy(alpha = 0.78f)),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.Filled.LocationOn,
                        contentDescription = null,
                        tint = androidx.compose.ui.graphics.Color.White,
                        modifier = Modifier.size(18.dp),
                    )
                    Spacer(Modifier.width(6.dp))
                    Text(
                        "Ver Life Groups",
                        style =
                            MaterialTheme.typography.titleMedium.copy(
                                color = androidx.compose.ui.graphics.Color.White,
                            ),
                    )
                }
            }
        }
    }
}

// ── Entrance animation wrapper ────────────────────────────────────────────────

@Composable
private fun AnimatedSection(
    index: Int,
    content: @Composable () -> Unit,
) {
    var visible by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        delay(index * 65L)
        visible = true
    }
    AnimatedVisibility(
        visible = visible,
        enter =
            fadeIn(tween(600, easing = CubicBezierEasing(.2f, .7f, .2f, 1f))) +
                slideInVertically(tween(600)) { (it * 0.08f).toInt() },
    ) {
        content()
    }
}

// ── Featured events section ───────────────────────────────────────────────────

@Composable
private fun FeaturedSection(
    banners: List<Banner>,
    onBannerTap: (String?) -> Unit,
) {
    val pagerState = rememberPagerState { banners.size }
    val screenWidth = LocalConfiguration.current.screenWidthDp.dp
    val cardWidth = screenWidth - 88.dp

    // Auto-advance every 3s, matching iOS's Timer-driven carousel. Restarting the
    // effect on every page change (whether from this timer or a user swipe) both
    // keeps the cadence going and effectively pauses it while a drag is in progress,
    // since currentPage doesn't change mid-drag until the user releases.
    LaunchedEffect(pagerState.currentPage, banners.size) {
        if (banners.size <= 1) return@LaunchedEffect
        delay(3000)
        if (!pagerState.isScrollInProgress) {
            val next = (pagerState.currentPage + 1) % banners.size
            pagerState.animateScrollToPage(next)
        }
    }

    Column(Modifier.padding(top = PazSpacing.Md)) {
        HorizontalPager(
            state = pagerState,
            contentPadding = PaddingValues(horizontal = PazSpacing.Lg),
            pageSpacing = PazSpacing.Md,
            pageSize = PageSize.Fixed(cardWidth),
            modifier =
                Modifier
                    .fillMaxWidth()
                    .height(224.dp),
        ) { page ->
            FeaturedCard(
                banner = banners[page],
                isAlt = page % 2 == 1,
                // Android keeps tap-to-open on banner cards (iOS lacks this — follow-up to add there).
                onClick = { onBannerTap(banners[page].actionUrl) },
            )
        }
    }
}

// ── Featured card ─────────────────────────────────────────────────────────────

@Composable
private fun FeaturedCard(
    banner: Banner,
    isAlt: Boolean,
    onClick: () -> Unit,
) {
    val shape = RoundedCornerShape(22.dp)
    Box(
        Modifier
            .fillMaxWidth()
            .height(180.dp)
            .clip(shape)
            .clickable(onClick = onClick),
    ) {
        if (banner.imageUrl.isNotEmpty()) {
            AsyncImage(
                model = banner.imageUrl,
                contentDescription = banner.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.matchParentSize(),
            )
            // Dark gradient overlay so title remains legible
            Box(
                Modifier
                    .matchParentSize()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.6f)),
                        ),
                    ),
            )
        } else {
            Box(
                Modifier
                    .matchParentSize()
                    .background(if (isAlt) PazGradients.FeaturedCardAlt else PazGradients.FeaturedCard),
            )
            CrossWatermark(
                Modifier
                    .size(158.dp)
                    .align(Alignment.BottomEnd)
                    .offset(x = 14.dp, y = 30.dp)
                    .rotate(-9f),
            )
        }

        // Title (bottom-left)
        Text(
            text = banner.title,
            style = MaterialTheme.typography.headlineMedium.copy(color = Color.White),
            modifier =
                Modifier
                    .align(Alignment.BottomStart)
                    .padding(18.dp),
        )
    }
}

// ── Cross watermark ───────────────────────────────────────────────────────────

@Composable
private fun CrossWatermark(modifier: Modifier = Modifier) {
    Canvas(modifier = modifier) {
        val sx = size.width / 24f
        val sy = size.height / 24f
        drawPath(
            path =
                Path().apply {
                    moveTo(10.6f * sx, 2.5f * sy)
                    lineTo(13.4f * sx, 2.5f * sy)
                    lineTo(13.4f * sx, 6.7f * sy)
                    lineTo(18f * sx, 6.7f * sy)
                    lineTo(18f * sx, 9.5f * sy)
                    lineTo(13.4f * sx, 9.5f * sy)
                    lineTo(13.4f * sx, 21.5f * sy)
                    lineTo(10.6f * sx, 21.5f * sy)
                    lineTo(10.6f * sx, 9.5f * sy)
                    lineTo(6f * sx, 9.5f * sy)
                    lineTo(6f * sx, 6.7f * sy)
                    lineTo(10.6f * sx, 6.7f * sy)
                    close()
                },
            color = Color.White,
            alpha = 0.08f,
        )
    }
}

// ── Dízimos card ──────────────────────────────────────────────────────────────

@Composable
private fun DizimosCard(
    bank: BankInfo,
    modifier: Modifier = Modifier,
) {
    PazGlassCard(
        modifier = modifier.fillMaxWidth(),
        cornerRadius = PazSpacing.CardRadiusCompact,
    ) {
        Column(Modifier.padding(22.dp)) {
            Text(
                "DÍZIMOS & OFERTAS",
                style =
                    MaterialTheme.typography.labelSmall.copy(
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                    ),
            )
            Spacer(Modifier.height(PazSpacing.Xs))
            Text(
                "Contribua com a visão",
                style =
                    MaterialTheme.typography.headlineMedium.copy(
                        fontSize = 27.sp,
                        lineHeight = 30.sp,
                        color = MaterialTheme.colorScheme.onSurface,
                    ),
            )
            Text(
                "Sua oferta transforma vidas na comunidade",
                style =
                    MaterialTheme.typography.bodySmall.copy(
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.70f),
                        lineHeight = 20.sp,
                    ),
                modifier = Modifier.padding(top = PazSpacing.Xs),
            )
            val pixKey = bank.pixKey
            if (pixKey != null) {
                Spacer(Modifier.height(PazSpacing.Lg))
                PixCopyButton(pixKey = pixKey)
            }
        }
    }
}

@Composable
private fun PixCopyButton(pixKey: String) {
    val clipboardManager = LocalClipboardManager.current
    var copied by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    PazPillPrimaryButton(
        text = if (copied) "Copiado!" else "Copiar PIX",
        icon = if (copied) Icons.Filled.Check else Icons.Filled.ContentCopy,
        onClick = {
            clipboardManager.setText(AnnotatedString(pixKey))
            copied = true
            scope.launch {
                delay(1500)
                copied = false
            }
        },
    )
}

// ── Agenda section ────────────────────────────────────────────────────────────

private fun parseEventDate(str: String): Calendar? {
    val instant = runCatching { java.time.Instant.parse(str) }.getOrNull()
    if (instant != null) {
        return Calendar.getInstance().also { it.timeInMillis = instant.toEpochMilli() }
    }
    val localFmt = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm", Locale.US)
    val dateFmt = java.text.SimpleDateFormat("yyyy-MM-dd", Locale.US)
    val date =
        runCatching { localFmt.parse(str) }.getOrNull()
            ?: runCatching { dateFmt.parse(str) }.getOrNull()
            ?: return null
    return Calendar.getInstance().also { it.time = date }
}

/** Events starting from the start of today through the next 7 days inclusive. */
private fun filterNextSevenDays(events: List<AgendaEvent>): List<AgendaEvent> {
    val startOfToday =
        Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
    val sevenDaysOut = (startOfToday.clone() as Calendar).apply { add(Calendar.DAY_OF_MONTH, 7) }

    return events
        .filter { event ->
            val ed = parseEventDate(event.startDate) ?: return@filter false
            !ed.before(startOfToday) && ed.before(sevenDaysOut)
        }.sortedBy { parseEventDate(it.startDate)?.timeInMillis ?: Long.MAX_VALUE }
}

@Composable
private fun AgendaSection(
    nextSevenDaysEvents: List<AgendaEvent>,
    onEventTap: (String) -> Unit,
    onSeeAll: () -> Unit,
) {
    Column(Modifier.padding(top = PazSpacing.Xl)) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = PazSpacing.Lg),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("Agenda", style = MaterialTheme.typography.headlineMedium)
            TextButton(onClick = onSeeAll) {
                Text(
                    "Ver tudo",
                    style = MaterialTheme.typography.labelSmall.copy(color = PazColors.PrimaryLight),
                )
                Icon(
                    Icons.AutoMirrored.Outlined.ArrowForward,
                    contentDescription = null,
                    tint = PazColors.PrimaryLight,
                    modifier = Modifier.size(15.dp).padding(start = 4.dp),
                )
            }
        }

        if (nextSevenDaysEvents.isEmpty()) {
            // No events in the next 7 days — keep only the entry point to the
            // full agenda, without the detailed week-list view.
            Spacer(Modifier.height(PazSpacing.Sm))
        } else {
            Spacer(Modifier.height(PazSpacing.Md))

            Column(
                Modifier.padding(horizontal = PazSpacing.Lg),
                verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
            ) {
                nextSevenDaysEvents.forEach { event ->
                    EventCard(event = event, onClick = { onEventTap(event.id) })
                }
            }
        }
        Spacer(Modifier.height(PazSpacing.Lg))
    }
}

@Composable
private fun EventCard(
    event: AgendaEvent,
    onClick: () -> Unit,
) {
    val time =
        event.startDate
            .substringAfter("T", "")
            .take(5)
            .ifEmpty { "--:--" }
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f), RoundedCornerShape(18.dp))
            .clickable(onClick = onClick)
            .padding(15.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        Text(
            time,
            style =
                MaterialTheme.typography.bodyMedium.copy(
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.5.sp,
                    color = PazColors.PrimaryLight,
                ),
            modifier = Modifier.width(50.dp),
        )
        Box(Modifier.size(18.dp), contentAlignment = Alignment.Center) {
            Box(Modifier.size(18.dp).background(PazColors.tint, CircleShape))
            Box(Modifier.size(10.dp).background(PazColors.Primary, CircleShape))
        }
        Column(Modifier.weight(1f)) {
            Text(
                event.title,
                style =
                    MaterialTheme.typography.bodyMedium.copy(
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.5.sp,
                    ),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            if (!event.location.isNullOrBlank()) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(top = 3.dp),
                ) {
                    Icon(
                        imageVector = Icons.Filled.LocationOn,
                        contentDescription = null,
                        tint = PazColors.LocationRed,
                        modifier = Modifier.size(12.dp),
                    )
                    Spacer(Modifier.width(4.dp))
                    Text(
                        event.location!!,
                        style =
                            MaterialTheme.typography.bodySmall.copy(
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
        contentPadding = contentPadding,
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
        modifier =
            Modifier
                .fillMaxSize()
                .padding(horizontal = PazSpacing.Lg),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Md)) }
        item { PazSkeleton(height = 180.dp) }
        item { PazCardSkeleton() }
        repeat(3) { item { PazCardSkeleton() } }
    }
}

// ── Error state ───────────────────────────────────────────────────────────────

@Composable
private fun ErrorState(
    message: String,
    onRetry: () -> Unit,
    contentPadding: PaddingValues,
) {
    PazErrorState(message = message, onRetry = onRetry, contentPadding = contentPadding)
}
