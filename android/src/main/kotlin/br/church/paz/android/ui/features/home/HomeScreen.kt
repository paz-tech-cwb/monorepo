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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.navigation.Screen
import br.church.paz.android.ui.components.PazButton
import br.church.paz.android.ui.components.PazCardSkeleton
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
                    onBannerTap = viewModel::onBannerTapped,
                    onEventTap = viewModel::onEventTapped,
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
                        text = "Olá, ${userName.ifEmpty { "Lucas" }}",
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
    onBannerTap: (String?) -> Unit,
    onEventTap: (String) -> Unit,
    onSeeAllEvents: () -> Unit,
    contentPadding: PaddingValues,
) {
    val weekDays = remember(agendaEvents) { buildWeekDays(agendaEvents) }
    val todayIndex = remember(weekDays) { weekDays.indexOfFirst { it.isToday }.coerceAtLeast(0) }
    var selectedDay by remember { mutableIntStateOf(todayIndex) }

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
                "agenda" -> {
                    item(key = "agenda") {
                        AnimatedSection(index = index) {
                            AgendaSection(
                                weekDays = weekDays,
                                allEvents = agendaEvents,
                                selectedDay = selectedDay,
                                onDaySelected = { selectedDay = it },
                                onEventTap = onEventTap,
                                onSeeAll = onSeeAllEvents,
                            )
                        }
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
            contentPadding = PaddingValues(start = PazSpacing.Lg, end = PazSpacing.Md),
            pageSpacing = PazSpacing.Md,
            modifier = Modifier.fillMaxWidth(),
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

private data class DayItem(
    val dow: String,
    val day: Int,
    val date: Calendar,
    val isToday: Boolean,
    val hasEvent: Boolean,
)

private val dowLabels = listOf("DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB")

private fun buildWeekDays(events: List<AgendaEvent>): List<DayItem> {
    fun parseDate(str: String): Calendar? {
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

    val today = Calendar.getInstance()
    val weekStart =
        Calendar.getInstance().apply {
            set(Calendar.DAY_OF_WEEK, firstDayOfWeek)
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
    return (0 until 7).map { offset ->
        val day = (weekStart.clone() as Calendar).apply { add(Calendar.DAY_OF_MONTH, offset) }
        val dowIndex = day.get(Calendar.DAY_OF_WEEK) - 1
        val isToday =
            day.get(Calendar.YEAR) == today.get(Calendar.YEAR) &&
                day.get(Calendar.DAY_OF_YEAR) == today.get(Calendar.DAY_OF_YEAR)
        val hasEvent =
            events.any { event ->
                val ed = parseDate(event.startDate) ?: return@any false
                ed.get(Calendar.YEAR) == day.get(Calendar.YEAR) &&
                    ed.get(Calendar.DAY_OF_YEAR) == day.get(Calendar.DAY_OF_YEAR)
            }
        DayItem(
            dow = dowLabels[dowIndex],
            day = day.get(Calendar.DAY_OF_MONTH),
            date = day,
            isToday = isToday,
            hasEvent = hasEvent,
        )
    }
}

@Composable
private fun AgendaSection(
    weekDays: List<DayItem>,
    allEvents: List<AgendaEvent>,
    selectedDay: Int,
    onDaySelected: (Int) -> Unit,
    onEventTap: (String) -> Unit,
    onSeeAll: () -> Unit,
) {
    fun parseDate(str: String): Calendar? {
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

    val selectedDate = weekDays.getOrNull(selectedDay)?.date
    val dayEvents =
        remember(selectedDay, allEvents) {
            if (selectedDate == null) return@remember emptyList()
            allEvents.filter { event ->
                val ed = parseDate(event.startDate) ?: return@filter false
                ed.get(Calendar.YEAR) == selectedDate.get(Calendar.YEAR) &&
                    ed.get(Calendar.DAY_OF_YEAR) == selectedDate.get(Calendar.DAY_OF_YEAR)
            }
        }

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
        Spacer(Modifier.height(PazSpacing.Md))

        Row(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = PazSpacing.Lg),
            horizontalArrangement = Arrangement.spacedBy(PazSpacing.Sm),
        ) {
            weekDays.forEachIndexed { index, item ->
                DayPill(
                    item = item,
                    isSelected = index == selectedDay,
                    modifier = Modifier.weight(1f),
                    onClick = { onDaySelected(index) },
                )
            }
        }
        Spacer(Modifier.height(PazSpacing.Md))

        if (dayEvents.isEmpty()) {
            Text(
                "Nenhum evento",
                style =
                    MaterialTheme.typography.bodySmall.copy(
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    ),
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = PazSpacing.Lg + 4.dp, vertical = PazSpacing.Sm),
            )
        } else {
            Column(
                Modifier.padding(horizontal = PazSpacing.Lg),
                verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
            ) {
                dayEvents.forEach { event ->
                    EventCard(event = event, onClick = { onEventTap(event.id) })
                }
            }
        }
        Spacer(Modifier.height(PazSpacing.Lg))
    }
}

@Composable
private fun DayPill(
    item: DayItem,
    isSelected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    val pillShape = RoundedCornerShape(18.dp)
    val activeGradient =
        remember {
            Brush.linearGradient(
                colors = listOf(PazColors.DayPillStart, PazColors.DayPillEnd),
                start = Offset(0f, 0f),
                end = Offset(0f, Float.POSITIVE_INFINITY),
            )
        }
    val dotColor =
        when {
            item.isToday -> PazColors.Gold
            item.hasEvent -> PazColors.Primary
            else -> Color.Transparent
        }
    Box(
        modifier
            .height(74.dp)
            .shadow(
                elevation = if (isSelected) 8.dp else 2.dp,
                shape = pillShape,
                spotColor = if (isSelected) PazColors.Primary.copy(alpha = 0.70f) else PazColors.ShadowNavy,
                ambientColor = PazColors.ShadowNavy.copy(alpha = 0.04f),
            ).clip(pillShape)
            .then(
                when {
                    isSelected -> Modifier.background(activeGradient)
                    item.isToday ->
                        Modifier
                            .background(MaterialTheme.colorScheme.surface)
                            .border(1.5.dp, PazColors.Primary.copy(alpha = 0.5f), pillShape)
                    else ->
                        Modifier
                            .background(MaterialTheme.colorScheme.surface)
                            .border(1.dp, MaterialTheme.colorScheme.outline, pillShape)
                },
            ).clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text(
                item.dow,
                style =
                    MaterialTheme.typography.labelSmall.copy(
                        color =
                            if (isSelected) {
                                Color.White.copy(alpha = 0.72f)
                            } else {
                                MaterialTheme.colorScheme.onSurfaceVariant
                            },
                        fontSize = 11.sp,
                        letterSpacing = 0.5.sp,
                    ),
            )
            Text(
                item.day.toString(),
                style =
                    MaterialTheme.typography.bodyLarge.copy(
                        fontWeight = FontWeight.Bold,
                        fontSize = 21.sp,
                        color =
                            if (isSelected) {
                                Color.White
                            } else {
                                MaterialTheme.colorScheme.onSurface
                            },
                    ),
            )
            Box(
                Modifier
                    .padding(top = 2.dp)
                    .size(4.dp)
                    .background(color = dotColor, shape = CircleShape),
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
                style =
                    MaterialTheme.typography.bodySmall.copy(
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                    ),
            )
            PazButton(text = "Tentar novamente", onClick = onRetry)
        }
    }
}
