package br.church.paz.android.ui.features.agenda

import androidx.compose.animation.core.animateFloatAsState
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
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.navigation.Screen
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.AgendaEvent
import coil3.compose.AsyncImage
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.filter
import org.koin.androidx.compose.koinViewModel
import java.time.LocalDateTime

// ── Models ────────────────────────────────────────────────────────────────────

private data class DateSection(
    val label: String,
    val events: List<AgendaEvent>,
)

private data class YearSection(
    val year: String,
    val dateSections: List<DateSection>,
)

// ── Screen ────────────────────────────────────────────────────────────────────

@Composable
fun AgendaListScreen(
    navController: NavController,
    viewModel: AgendaListViewModel = koinViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Column(Modifier.fillMaxSize()) {
        Box(Modifier.fillMaxWidth().background(PazGradients.Hero).statusBarsPadding()) {
            Row(
                Modifier.fillMaxWidth().padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Sm),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = { navController.popBackStack() }) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, "back", tint = Color.White)
                }
                Text("Agenda", style = MaterialTheme.typography.headlineMedium.copy(color = Color.White), modifier = Modifier.weight(1f))
            }
        }

        Box(
            Modifier
                .fillMaxSize()
                .clip(RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
                .background(MaterialTheme.colorScheme.background),
        ) {
            when {
                uiState.isLoading -> AgendaListSkeleton()
                uiState.error != null && uiState.events.isEmpty() ->
                    Box(Modifier.fillMaxSize(), Alignment.Center) {
                        Text("Erro ao carregar eventos", style = MaterialTheme.typography.bodyMedium)
                    }
                uiState.events.isEmpty() ->
                    Box(Modifier.fillMaxSize(), Alignment.Center) {
                        Text("Nenhum evento disponível", style = MaterialTheme.typography.bodyMedium)
                    }
                else ->
                    AgendaEventList(
                        uiState = uiState,
                        onTap = { navController.navigate(Screen.AgendaDetail.createRoute(it.id)) },
                        onLoadMore = viewModel::loadMore,
                    )
            }
        }
    }
}

// ── List with year/date sections ──────────────────────────────────────────────

@Composable
private fun AgendaEventList(
    uiState: AgendaListUiState,
    onTap: (AgendaEvent) -> Unit,
    onLoadMore: () -> Unit,
) {
    val listState = rememberLazyListState()
    val yearSections = remember(uiState.events) { uiState.events.toYearSections() }

    // Initialise expansion state: current year open, rest closed.
    val currentYear =
        remember {
            java.time.Year
                .now()
                .toString()
        }
    val expanded =
        remember(yearSections) {
            mutableStateMapOf<String, Boolean>().also { map ->
                yearSections.forEach { map[it.year] = (it.year == currentYear) }
            }
        }

    LaunchedEffect(listState) {
        snapshotFlow {
            val info = listState.layoutInfo
            val last = info.visibleItemsInfo.lastOrNull()?.index ?: -1
            info.totalItemsCount > 0 && last >= info.totalItemsCount - 3
        }.distinctUntilChanged()
            .filter { it }
            .collect { onLoadMore() }
    }

    LazyColumn(
        state = listState,
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = PazSpacing.Lg, vertical = PazSpacing.Md),
        verticalArrangement = Arrangement.spacedBy(0.dp),
    ) {
        yearSections.forEach { yearSection ->
            val isExpanded = expanded[yearSection.year] == true

            // Year header
            item(key = "year_${yearSection.year}") {
                YearHeader(
                    year = yearSection.year,
                    isExpanded = isExpanded,
                    onClick = { expanded[yearSection.year] = !isExpanded },
                )
            }

            if (isExpanded) {
                yearSection.dateSections.forEach { dateSection ->
                    // Date sub-header
                    item(key = "date_${yearSection.year}_${dateSection.label}") {
                        Text(
                            dateSection.label,
                            style =
                                MaterialTheme.typography.labelMedium.copy(
                                    color = PazColors.Primary,
                                ),
                            modifier = Modifier.padding(top = PazSpacing.Md, bottom = PazSpacing.Sm),
                        )
                    }
                    // Events for that date
                    itemsIndexed(
                        dateSection.events,
                        key = { _, e -> "${yearSection.year}_${dateSection.label}_${e.id}" },
                    ) { _, event ->
                        AgendaEventCard(
                            event = event,
                            onClick = { onTap(event) },
                            modifier = Modifier.padding(bottom = PazSpacing.Sm),
                        )
                    }
                }
            }
        }

        if (uiState.isLoadingMore) {
            item(key = "loading_more") {
                Column(verticalArrangement = Arrangement.spacedBy(PazSpacing.Md)) {
                    repeat(2) { PazSkeleton(height = 72.dp) }
                }
            }
        }

        item(key = "bottom_spacer") { Spacer(Modifier.height(PazSpacing.Xl)) }
    }
}

@Composable
private fun YearHeader(
    year: String,
    isExpanded: Boolean,
    onClick: () -> Unit,
) {
    val rotation by animateFloatAsState(targetValue = if (isExpanded) 180f else 0f, label = "chevron")
    Row(
        modifier =
            Modifier
                .fillMaxWidth()
                .clickable(onClick = onClick)
                .padding(vertical = PazSpacing.Md),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(year, style = MaterialTheme.typography.titleMedium)
        Icon(
            Icons.Filled.KeyboardArrowDown,
            contentDescription = if (isExpanded) "recolher" else "expandir",
            tint = MaterialTheme.colorScheme.onSurface.copy(.5f),
            modifier = Modifier.size(20.dp).rotate(rotation),
        )
    }
}

// ── Event card ────────────────────────────────────────────────────────────────

@Composable
private fun AgendaEventCard(
    event: AgendaEvent,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val parts = event.startDate.split("-")
    Row(
        modifier =
            modifier
                .fillMaxWidth()
                .clip(PazShapes.large)
                .background(MaterialTheme.colorScheme.surface)
                .clickable(onClick = onClick)
                .padding(PazSpacing.Md),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        if (!event.imageUrl.isNullOrEmpty()) {
            AsyncImage(
                model = event.imageUrl,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.size(52.dp).clip(RoundedCornerShape(12.dp)),
            )
        } else {
            Column(
                Modifier
                    .size(52.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(PazColors.Primary.copy(.08f)),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Text(
                    parts.getOrNull(2)?.substringBefore("T") ?: "--",
                    style = MaterialTheme.typography.titleMedium.copy(color = PazColors.Primary),
                )
                Text(
                    monthAbbrev(parts.getOrNull(1)),
                    style = MaterialTheme.typography.labelSmall.copy(color = PazColors.Accent),
                )
            }
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(event.title, style = MaterialTheme.typography.titleSmall, maxLines = 2)
            if (!event.location.isNullOrEmpty()) {
                Text(
                    event.location!!,
                    style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(.5f)),
                    maxLines = 1,
                )
            }
        }
        Box(Modifier.size(8.dp).clip(RoundedCornerShape(50)).background(PazColors.Primary))
    }
}

// ── Date helpers ──────────────────────────────────────────────────────────────

private fun List<AgendaEvent>.toYearSections(): List<YearSection> {
    // Preserves API order; groups by (year, dateLabel) sequentially.
    val byYear = linkedMapOf<String, LinkedHashMap<String, MutableList<AgendaEvent>>>()
    forEach { event ->
        val dt = parseDateTime(event.startDate)
        val year = dt?.year?.toString() ?: event.startDate.take(4)
        val label = dt?.let { dateSectionLabel(it) } ?: event.startDate.take(10)
        byYear.getOrPut(year) { linkedMapOf() }.getOrPut(label) { mutableListOf() }.add(event)
    }
    return byYear.map { (year, dateMap) ->
        YearSection(year, dateMap.map { (label, events) -> DateSection(label, events) })
    }
}

private fun parseDateTime(iso: String): LocalDateTime? =
    runCatching {
        val s = iso.replace("Z", "").substringBefore("+").trimEnd()
        when {
            s.length == 10 -> LocalDateTime.parse("${s}T00:00")
            else -> LocalDateTime.parse(s.take(16))
        }
    }.getOrNull()

private fun dateSectionLabel(dt: LocalDateTime): String {
    val day = dt.dayOfMonth.toString().padStart(2, '0')
    val month = monthName(dt.monthValue)
    val dow = dayOfWeekName(dt.dayOfWeek.value)
    return "$day de $month ($dow)"
}

private fun monthName(m: Int) =
    when (m) {
        1 -> "Janeiro"
        2 -> "Fevereiro"
        3 -> "Março"
        4 -> "Abril"
        5 -> "Maio"
        6 -> "Junho"
        7 -> "Julho"
        8 -> "Agosto"
        9 -> "Setembro"
        10 -> "Outubro"
        11 -> "Novembro"
        12 -> "Dezembro"
        else -> "?"
    }

private fun dayOfWeekName(d: Int) =
    when (d) {
        1 -> "Segunda-feira"
        2 -> "Terça-feira"
        3 -> "Quarta-feira"
        4 -> "Quinta-feira"
        5 -> "Sexta-feira"
        6 -> "Sábado"
        7 -> "Domingo"
        else -> "?"
    }

private fun monthAbbrev(m: String?) =
    when (m) {
        "01" -> "JAN"
        "02" -> "FEV"
        "03" -> "MAR"
        "04" -> "ABR"
        "05" -> "MAI"
        "06" -> "JUN"
        "07" -> "JUL"
        "08" -> "AGO"
        "09" -> "SET"
        "10" -> "OUT"
        "11" -> "NOV"
        "12" -> "DEZ"
        else -> "???"
    }

// ── Skeleton ──────────────────────────────────────────────────────────────────

@Composable
private fun AgendaListSkeleton() {
    LazyColumn(
        contentPadding = PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
        modifier = Modifier.fillMaxSize().padding(top = PazSpacing.Lg),
    ) {
        repeat(6) { item { PazSkeleton(height = 72.dp) } }
    }
}
