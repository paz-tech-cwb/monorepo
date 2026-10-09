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
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.TopAppBarScrollBehavior
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.navigation.Screen
import br.church.paz.android.ui.components.PazCardSkeleton
import br.church.paz.android.ui.components.PazErrorState
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.LocalPazDarkTheme
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazShapePill
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.AgendaEvent
import br.church.paz.shared.domain.model.BankInfo
import br.church.paz.shared.domain.model.Banner
import coil3.compose.AsyncImage
import kotlinx.coroutines.delay
import org.koin.androidx.compose.koinViewModel
import java.text.SimpleDateFormat
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
    val scrollBehavior = TopAppBarDefaults.exitUntilCollapsedScrollBehavior()

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

    Scaffold(
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection),
        topBar = { HomeTopBar(userName = uiState.userName, scrollBehavior = scrollBehavior) },
        containerColor = MaterialTheme.colorScheme.background,
    ) { innerPadding ->
        val bottomPad = contentPadding.calculateBottomPadding() + PazSpacing.Xl
        val adjustedPadding =
            PaddingValues(
                top = innerPadding.calculateTopPadding(),
                bottom = bottomPad,
            )
        when {
            uiState.isLoading -> LoadingSkeleton(adjustedPadding)
            uiState.error != null -> ErrorState(uiState.error!!, viewModel::load, adjustedPadding)
            else ->
                HomeContent(
                    banners = uiState.banners,
                    agendaEvents = uiState.agendaEvents,
                    bank = uiState.bank,
                    sectionOrder = uiState.sectionOrder,
                    isAgendaExpanded = uiState.isAgendaExpanded,
                    isLoadingFullAgenda = uiState.isLoadingFullAgenda,
                    fullAgendaEvents = uiState.fullAgendaEvents,
                    fullAgendaLoadError = uiState.fullAgendaLoadError,
                    onBannerTap = viewModel::onBannerTapped,
                    onEventTap = viewModel::onEventTapped,
                    onToggleAgendaExpanded = viewModel::onToggleAgendaExpanded,
                    onRetryFullAgenda = viewModel::onRetryFullAgenda,
                    onSeeAllEvents = { navController.navigate(Screen.AgendaList.route) },
                    contentPadding = adjustedPadding,
                )
        }
    }
}

// ── Top bar ───────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun HomeTopBar(
    userName: String,
    scrollBehavior: TopAppBarScrollBehavior,
) {
    val fraction = scrollBehavior.state.collapsedFraction
    val collapsed = fraction > 0.5f
    val isDark = LocalPazDarkTheme.current

    val today = remember { Calendar.getInstance() }
    val ptBr = remember { Locale("pt", "BR") }
    val dateLabel =
        remember {
            val dow = SimpleDateFormat("EEEE", ptBr).format(today.time).uppercase(ptBr)
            val day = today.get(Calendar.DAY_OF_MONTH)
            val month = SimpleDateFormat("MMMM", ptBr).format(today.time).uppercase(ptBr)
            "$dow, $day DE $month"
        }

    LargeTopAppBar(
        expandedHeight = 112.dp,
        title = {
            if (collapsed) {
                Text("Início", style = MaterialTheme.typography.titleMedium)
            } else {
                Column {
                    Text(
                        text = dateLabel,
                        style =
                            MaterialTheme.typography.labelSmall.copy(
                                color = PazColors.PrimaryLight,
                            ),
                    )
                    Spacer(Modifier.height(7.dp))
                    Text(
                        text = if (userName.isEmpty()) "Olá!" else "Olá, $userName",
                        style =
                            MaterialTheme.typography.displayLarge.copy(
                                color =
                                    if (isDark) {
                                        MaterialTheme.colorScheme.onBackground
                                    } else {
                                        PazColors.Primary
                                    },
                            ),
                    )
                }
            }
        },
        actions = {
            Box(contentAlignment = Alignment.TopEnd) {
                IconButton(onClick = {}) {
                    Icon(
                        imageVector = Icons.Outlined.Notifications,
                        contentDescription = "Notificações",
                        tint = MaterialTheme.colorScheme.onBackground,
                    )
                }
                Box(
                    Modifier
                        .padding(top = 11.dp, end = 11.dp)
                        .size(8.dp)
                        .border(1.6.dp, MaterialTheme.colorScheme.background, CircleShape)
                        .background(PazColors.Gold, CircleShape),
                )
            }
        },
        colors =
            TopAppBarDefaults.largeTopAppBarColors(
                containerColor = MaterialTheme.colorScheme.background,
                scrolledContainerColor = MaterialTheme.colorScheme.background,
                titleContentColor = MaterialTheme.colorScheme.onBackground,
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
    sectionOrder: List<String>,
    isAgendaExpanded: Boolean,
    isLoadingFullAgenda: Boolean,
    fullAgendaEvents: List<AgendaEvent>,
    fullAgendaLoadError: String?,
    onBannerTap: (String?) -> Unit,
    onEventTap: (String) -> Unit,
    onToggleAgendaExpanded: () -> Unit,
    onRetryFullAgenda: () -> Unit,
    onSeeAllEvents: () -> Unit,
    contentPadding: PaddingValues,
) {
    val nextSevenDaysEvents = remember(agendaEvents) { filterNextSevenDays(agendaEvents) }

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
                                FeaturedSection(banners = banners, onBannerTap = onBannerTap, onSeeAll = onSeeAllEvents)
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
                                isExpanded = isAgendaExpanded,
                                isLoadingFullAgenda = isLoadingFullAgenda,
                                fullAgendaEvents = fullAgendaEvents,
                                fullAgendaLoadError = fullAgendaLoadError,
                                onToggleExpanded = onToggleAgendaExpanded,
                                onRetryFullAgenda = onRetryFullAgenda,
                                onEventTap = onEventTap,
                                onSeeAll = onSeeAllEvents,
                            )
                        }
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
    onSeeAll: () -> Unit,
) {
    val pagerState = rememberPagerState { banners.size }
    val isDark = LocalPazDarkTheme.current

    Column(Modifier.padding(top = PazSpacing.Md)) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Sm),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("Eventos", style = MaterialTheme.typography.headlineMedium)
            TextButton(onClick = onSeeAll) {
                Text(
                    "Ver todos",
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

        HorizontalPager(
            state = pagerState,
            contentPadding = PaddingValues(horizontal = PazSpacing.Lg),
            pageSpacing = PazSpacing.Md,
            modifier =
                Modifier
                    .fillMaxWidth()
                    .padding(vertical = 12.dp),
        ) { page ->
            FeaturedCard(
                banner = banners[page],
                isAlt = page % 2 == 1,
                onClick = { onBannerTap(banners[page].actionUrl) },
            )
        }

        // Dot indicators
        Row(
            Modifier
                .fillMaxWidth()
                .padding(top = PazSpacing.Md),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            banners.indices.forEach { i ->
                val isActive = pagerState.currentPage == i
                val w by animateDpAsState(
                    targetValue = if (isActive) 20.dp else 7.dp,
                    animationSpec = tween(250),
                    label = "dotWidth$i",
                )
                Box(
                    Modifier
                        .padding(horizontal = 3.dp)
                        .size(width = w, height = 7.dp)
                        .background(
                            color =
                                if (isActive) {
                                    if (isDark) PazColors.PrimaryLight else PazColors.Primary
                                } else {
                                    PazColors.DotInactive
                                },
                            shape = RoundedCornerShape(4.dp),
                        ),
                )
            }
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
            .height(176.dp)
            .shadow(
                elevation = 12.dp,
                shape = shape,
                spotColor = PazColors.Primary.copy(alpha = 0.70f),
                ambientColor = PazColors.Primary.copy(alpha = 0.10f),
            ).clip(shape)
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
    Box(
        modifier
            .fillMaxWidth()
            .shadow(
                elevation = 12.dp,
                shape = RoundedCornerShape(24.dp),
                spotColor = PazColors.ContributionDeep.copy(alpha = 0.70f),
                ambientColor = PazColors.ContributionDeep.copy(alpha = 0.10f),
            ).clip(RoundedCornerShape(24.dp))
            .drawBehind {
                drawRect(
                    brush =
                        Brush.radialGradient(
                            colorStops =
                                arrayOf(
                                    0f to PazColors.ContributionHighlight,
                                    0.40f to PazColors.PrimaryMid,
                                    1f to PazColors.ContributionDeep,
                                ),
                            center = Offset(size.width * 0.82f, -size.height * 0.08f),
                            radius = size.width * 1.30f,
                        ),
                )
            }.padding(22.dp),
    ) {
        Column {
            Text(
                "DÍZIMOS & OFERTAS",
                style =
                    MaterialTheme.typography.labelSmall.copy(
                        color = Color.White.copy(alpha = 0.6f),
                    ),
            )
            Spacer(Modifier.height(PazSpacing.Xs))
            Text(
                "Contribua com a visão",
                style =
                    MaterialTheme.typography.headlineMedium.copy(
                        fontSize = 27.sp,
                        lineHeight = 30.sp,
                        color = Color.White,
                    ),
            )
            Text(
                "Sua oferta transforma vidas na comunidade",
                style =
                    MaterialTheme.typography.bodySmall.copy(
                        color = Color.White.copy(alpha = 0.70f),
                        lineHeight = 20.sp,
                    ),
                modifier = Modifier.padding(top = PazSpacing.Xs),
            )
            Spacer(Modifier.height(PazSpacing.Lg))
            Row(horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md)) {
                if (bank.pixKey != null) {
                    DizimosButton("PIX", primary = true, modifier = Modifier.weight(1f), onClick = {})
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
        targetValue = if (pressed) 0.97f else 1f,
        animationSpec = tween(120),
        label = "btnScale",
    )
    Box(
        modifier =
            modifier
                .height(52.dp)
                .shadow(
                    elevation = if (primary) 8.dp else 0.dp,
                    shape = PazShapePill,
                    spotColor = Color.Black.copy(alpha = 0.33f),
                ).clip(PazShapePill)
                .background(if (primary) Color.White else Color.White.copy(alpha = 0.13f))
                .border(
                    width = if (primary) 0.dp else 1.dp,
                    color = if (primary) Color.Transparent else Color.White.copy(alpha = 0.24f),
                    shape = PazShapePill,
                ).clickable(interactionSource = interactionSource, indication = null, onClick = onClick)
                .graphicsLayer {
                    scaleX = scale
                    scaleY = scale
                },
        contentAlignment = Alignment.Center,
    ) {
        Text(
            label,
            style =
                MaterialTheme.typography.bodyMedium.copy(
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.5.sp,
                    color = if (primary) PazColors.NavyText else Color.White,
                ),
        )
    }
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
    isExpanded: Boolean,
    isLoadingFullAgenda: Boolean,
    fullAgendaEvents: List<AgendaEvent>,
    fullAgendaLoadError: String?,
    onToggleExpanded: () -> Unit,
    onRetryFullAgenda: () -> Unit,
    onEventTap: (String) -> Unit,
    onSeeAll: () -> Unit,
) {
    val eventsToShow = if (isExpanded) fullAgendaEvents else nextSevenDaysEvents

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

        if (!isExpanded && nextSevenDaysEvents.isEmpty()) {
            // No events in the next 7 days — keep only the entry point to the
            // full agenda, without the detailed week-list view.
            Spacer(Modifier.height(PazSpacing.Sm))
        } else {
            Spacer(Modifier.height(PazSpacing.Md))

            Column(
                Modifier.padding(horizontal = PazSpacing.Lg),
                verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
            ) {
                if (isExpanded && isLoadingFullAgenda) {
                    repeat(3) { PazCardSkeleton() }
                } else if (isExpanded && fullAgendaLoadError != null) {
                    FullAgendaErrorRow(error = fullAgendaLoadError, onRetry = onRetryFullAgenda)
                } else {
                    eventsToShow.forEach { event ->
                        EventCard(event = event, onClick = { onEventTap(event.id) })
                    }
                }

                AgendaExpandToggle(isExpanded = isExpanded, onClick = onToggleExpanded)
            }
        }
        Spacer(Modifier.height(PazSpacing.Lg))
    }
}

@Composable
private fun FullAgendaErrorRow(
    error: String,
    onRetry: () -> Unit,
) {
    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(MaterialTheme.colorScheme.surface)
            .padding(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm),
    ) {
        Text(
            "Não foi possível carregar a agenda completa. ($error)",
            style = MaterialTheme.typography.bodyMedium,
        )
        TextButton(onClick = onRetry) {
            Text("Tentar novamente", style = MaterialTheme.typography.labelMedium.copy(color = PazColors.PrimaryLight))
        }
    }
}

@Composable
private fun AgendaExpandToggle(
    isExpanded: Boolean,
    onClick: () -> Unit,
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surface,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(vertical = PazSpacing.Md),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = if (isExpanded) "Ver menos" else "Ver próximos eventos",
                style = MaterialTheme.typography.labelMedium.copy(color = PazColors.PrimaryLight),
            )
        }
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
            .shadow(
                elevation = 4.dp,
                shape = RoundedCornerShape(18.dp),
                spotColor = PazColors.ShadowNavy.copy(alpha = 0.21f),
                ambientColor = PazColors.ShadowNavy.copy(alpha = 0.04f),
            ).clip(RoundedCornerShape(18.dp))
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
            Box(Modifier.size(18.dp).background(MaterialTheme.colorScheme.surfaceVariant, CircleShape))
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
        item { PazSkeleton(height = 176.dp) }
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
