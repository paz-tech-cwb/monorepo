package br.church.paz.android.ui.features.lifegroupanalytics

import android.app.Activity
import android.content.Intent
import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.ChildCare
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LargeTopAppBar
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.ui.components.PazBarChart
import br.church.paz.android.ui.components.PazBarChartEmpty
import br.church.paz.android.ui.components.PazBarChartEntry
import br.church.paz.android.ui.components.PazButton
import br.church.paz.android.ui.components.PazCardSkeleton
import br.church.paz.android.ui.components.PazDonutChart
import br.church.paz.android.ui.components.PazDonutChartEmpty
import br.church.paz.android.ui.components.PazDonutPalette
import br.church.paz.android.ui.components.PazDonutSlice
import br.church.paz.android.ui.components.PazMeshBackground
import br.church.paz.android.ui.components.PazPullToRefresh
import br.church.paz.android.ui.components.PazStatCard
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.android.util.ReportPdfExporter
import br.church.paz.shared.domain.model.LifeGroupAttendancePoint
import br.church.paz.shared.domain.model.LifeGroupOverview
import kotlinx.coroutines.launch
import org.koin.androidx.compose.koinViewModel
import org.koin.core.parameter.parametersOf
import java.time.LocalDate
import java.time.format.DateTimeFormatter

private val MONTH_LABELS =
    listOf("Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LifeGroupAnalyticsScreen(
    navController: NavController,
    lifeGroupId: String?,
    viewModel: LifeGroupAnalyticsViewModel =
        koinViewModel(parameters = { parametersOf(lifeGroupId?.toIntOrNull()) }),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var isExportingPdf by remember { mutableStateOf(false) }
    var exportError by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                LifeGroupAnalyticsEffect.NavigateBack -> navController.popBackStack()
            }
        }
    }

    // Renders the FULL report (stat cards, overview donuts, attendance chart,
    // distribution chart — filters excluded, since they're controls, not
    // report content) off-screen into a paginated PDF via [ReportPdfExporter]
    // and opens the system share sheet with the resulting file. Replaces the
    // previous viewport-clipped `graphicsLayer` screenshot export, which only
    // captured whatever was currently scrolled into view.
    fun exportAndShare() {
        val activity =
            context as? Activity ?: run {
                exportError = "Não foi possível exportar o relatório. Tente novamente."
                return
            }
        scope.launch {
            isExportingPdf = true
            try {
                val file =
                    ReportPdfExporter.export(activity, "relatorio-life-group-${System.currentTimeMillis()}.pdf") {
                        LifeGroupReportExportContent(uiState)
                    }
                val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
                val intent =
                    Intent(Intent.ACTION_SEND).apply {
                        type = "application/pdf"
                        putExtra(Intent.EXTRA_STREAM, uri)
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    }
                context.startActivity(Intent.createChooser(intent, "Compartilhar relatório"))
            } catch (_: Exception) {
                exportError = "Não foi possível exportar o relatório. Tente novamente."
            } finally {
                isExportingPdf = false
            }
        }
    }

    if (exportError != null) {
        AlertDialog(
            onDismissRequest = { exportError = null },
            title = { Text("Não foi possível exportar") },
            text = { Text(exportError.orEmpty()) },
            confirmButton = { TextButton(onClick = { exportError = null }) { Text("OK") } },
        )
    }

    Box(Modifier.fillMaxSize()) {
        PazMeshBackground()

        Scaffold(
            topBar = {
                LargeTopAppBar(
                    title = { Text("Relatórios") },
                    navigationIcon = {
                        IconButton(onClick = viewModel::onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, "voltar")
                        }
                    },
                    actions = {
                        if (!uiState.isLoading && uiState.error == null) {
                            IconButton(onClick = ::exportAndShare, enabled = !isExportingPdf) {
                                if (isExportingPdf) {
                                    CircularProgressIndicator(modifier = Modifier.size(20.dp))
                                } else {
                                    Icon(Icons.Filled.Share, "exportar PDF")
                                }
                            }
                        }
                    },
                    colors = TopAppBarDefaults.largeTopAppBarColors(containerColor = Color.Transparent),
                )
            },
            containerColor = Color.Transparent,
        ) { innerPadding ->
            Box(
                Modifier
                    .fillMaxSize()
                    .padding(top = innerPadding.calculateTopPadding()),
            ) {
                PazPullToRefresh(
                    isRefreshing = uiState.isRefreshing,
                    onRefresh = viewModel::refresh,
                    modifier = Modifier.fillMaxSize(),
                ) {
                    when {
                        uiState.isLoading -> AnalyticsSkeleton()
                        uiState.error != null -> AnalyticsError(uiState.error!!, viewModel::load)
                        else ->
                            AnalyticsContent(
                                uiState = uiState,
                                onYearSelected = viewModel::onYearSelected,
                                onMonthSelected = viewModel::onMonthSelected,
                                onLifeGroupSelected = viewModel::onLifeGroupSelected,
                                onDistributionTabSelected = viewModel::onDistributionTabSelected,
                            )
                    }
                }
            }
        }
    }
}

/**
 * Plain [Column] (not [LazyColumn] — needs unbounded height so
 * [ReportPdfExporter] can measure the full report) rendering every section
 * of the Life Group report for PDF export: stat cards, overview donuts,
 * attendance chart, distribution chart. Filters are excluded — they're
 * controls, not report content. Uses a plain white background (no
 * [PazMeshBackground] mesh/glass chrome) since [PdfDocument]'s software
 * canvas can't reliably render hardware-accelerated-only effects, and a
 * plain background reads better in a printed/shared PDF anyway.
 */
@Composable
private fun LifeGroupReportExportContent(uiState: LifeGroupAnalyticsUiState) {
    Column(
        modifier =
            Modifier
                .fillMaxWidth()
                .background(Color.White)
                .padding(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
    ) {
        ExportHeader(
            title = "Relatório de Frequência — Life Groups",
            scopeLabel =
                buildString {
                    append(uiState.lifeGroups.firstOrNull { it.first == uiState.lifeGroupId }?.second ?: "Todos os grupos")
                    append(" · ")
                    append(uiState.month?.let { MONTH_LABELS.getOrNull(it - 1) } ?: "Todos os meses")
                    append(" ")
                    append(uiState.year)
                },
        )
        uiState.overview?.let { overview ->
            LifeGroupStatCards(overview)
            LifeGroupOverviewCharts(overview)
        }
        SectionCard(title = "Frequência de Presença") {
            if (uiState.attendanceRows.all { it.meetingsCount == 0 }) {
                PazBarChartEmpty("Nenhum registro de presença encontrado.")
            } else {
                PazBarChart(entries = uiState.attendanceRows.toChartEntries(uiState.month != null))
            }
        }
        SectionCard(title = "Distribuição dos Life Groups") {
            val bucketEntries = uiState.distributionForSelectedTab
            if (bucketEntries.isEmpty()) {
                PazBarChartEmpty("Nenhum life group com esse dado cadastrado.")
            } else {
                PazBarChart(entries = bucketEntries.map { PazBarChartEntry(it.label, it.count.toFloat()) })
            }
        }
    }
}

/** Simple title + scope/date metadata block shown at the top of the exported PDF. */
@Composable
private fun ExportHeader(
    title: String,
    scopeLabel: String,
) {
    Column {
        Text(title, style = MaterialTheme.typography.titleSmall)
        Text(scopeLabel, style = MaterialTheme.typography.bodySmall)
        Text(
            "Exportado em ${DateTimeFormatter.ofPattern("dd/MM/yyyy").format(LocalDate.now())}",
            style = MaterialTheme.typography.bodySmall,
        )
    }
}

@Composable
private fun AnalyticsContent(
    uiState: LifeGroupAnalyticsUiState,
    onYearSelected: (Int) -> Unit,
    onMonthSelected: (Int?) -> Unit,
    onLifeGroupSelected: (Int?) -> Unit,
    onDistributionTabSelected: (DistributionTab) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
    ) {
        item {
            AnalyticsFilters(
                uiState = uiState,
                onYearSelected = onYearSelected,
                onMonthSelected = onMonthSelected,
                onLifeGroupSelected = onLifeGroupSelected,
            )
        }

        uiState.overview?.let { overview ->
            item { LifeGroupStatCards(overview) }
            item { LifeGroupOverviewCharts(overview) }
        }

        item {
            SectionCard(title = "Frequência de Presença") {
                // Monthly rows are always zero-filled for all 12 months, so the
                // list is never actually empty for that view — check every row
                // has zero meetings instead of just checking list emptiness.
                if (uiState.attendanceRows.all { it.meetingsCount == 0 }) {
                    PazBarChartEmpty("Nenhum registro de presença encontrado.")
                } else {
                    PazBarChart(entries = uiState.attendanceRows.toChartEntries(uiState.month != null))
                }
            }
        }

        item {
            SectionCard(title = "Distribuição dos Life Groups") {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(PazSpacing.Xs),
                ) {
                    DistributionTab.entries.forEach { tab ->
                        FilterChip(
                            selected = uiState.distributionTab == tab,
                            onClick = { onDistributionTabSelected(tab) },
                            label = { Text(tab.label()) },
                        )
                    }
                }
                Spacer(Modifier.height(PazSpacing.Md))
                val bucketEntries = uiState.distributionForSelectedTab
                if (bucketEntries.isEmpty()) {
                    PazBarChartEmpty("Nenhum life group com esse dado cadastrado.")
                } else {
                    PazBarChart(
                        entries = bucketEntries.map { PazBarChartEntry(it.label, it.count.toFloat()) },
                    )
                }
            }
        }

        item { Spacer(Modifier.height(PazSpacing.Xl)) }
    }
}

@Composable
private fun LifeGroupStatCards(overview: LifeGroupOverview) {
    Column(verticalArrangement = Arrangement.spacedBy(PazSpacing.Md)) {
        PazStatCard(
            title = "Crianças nos Grupos",
            value = overview.totalKids.toString(),
            subtitle = "crianças de 0 a 11 anos cadastradas",
            icon = Icons.Filled.ChildCare,
        )
        PazStatCard(
            title = "Média por Grupo",
            value = overview.avgMembersPerGroup.toString(),
            subtitle = "membros por grupo, em média",
            icon = Icons.Filled.BarChart,
        )
        val inGroupPercent =
            if (overview.membersTotal > 0) {
                (overview.membersInGroup * 100 / overview.membersTotal)
            } else {
                0
            }
        PazStatCard(
            title = "Membros em Grupos",
            value = overview.membersInGroup.toString(),
            secondaryValue = overview.membersTotal.toString(),
            subtitle = "$inGroupPercent% em grupo · ${overview.membersTotal - overview.membersInGroup} sem grupo",
            icon = Icons.Filled.Groups,
        )
    }
}

@Composable
private fun LifeGroupOverviewCharts(overview: LifeGroupOverview) {
    Column(verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg)) {
        SectionCard(title = "Grupos por Setor") {
            if (overview.groupsBySector.isEmpty()) {
                PazDonutChartEmpty("Nenhum grupo cadastrado.")
            } else {
                PazDonutChart(
                    slices =
                        overview.groupsBySector.mapIndexed { index, bucket ->
                            PazDonutSlice(
                                label = bucket.label,
                                value = bucket.count.toFloat(),
                                color = PazDonutPalette[index % PazDonutPalette.size],
                            )
                        },
                )
            }
        }
        SectionCard(title = "Membros com e sem Grupo") {
            val withoutGroup = overview.membersTotal - overview.membersInGroup
            if (overview.membersTotal <= 0) {
                PazDonutChartEmpty("Nenhum membro cadastrado.")
            } else {
                PazDonutChart(
                    slices =
                        listOf(
                            PazDonutSlice("Em um grupo", overview.membersInGroup.toFloat(), PazDonutPalette[0]),
                            PazDonutSlice("Sem grupo", withoutGroup.toFloat(), PazDonutPalette[2]),
                        ),
                )
            }
        }
    }
}

private fun DistributionTab.label() =
    when (this) {
        DistributionTab.DAY -> "Dia"
        DistributionTab.HOUR -> "Horário"
        DistributionTab.NEIGHBORHOOD -> "Bairro"
        DistributionTab.CITY -> "Cidade"
    }

private fun List<LifeGroupAttendancePoint>.toChartEntries(perMeeting: Boolean): List<PazBarChartEntry> =
    map { point ->
        val label =
            if (perMeeting) {
                point.period.split("-").let { parts -> if (parts.size == 3) "${parts[2]}/${parts[1]}" else point.period }
            } else {
                point.period
                    .split("-")
                    .getOrNull(1)
                    ?.toIntOrNull()
                    ?.let { MONTH_LABELS.getOrNull(it - 1) }
                    ?: point.period
            }
        PazBarChartEntry(label = label, value = point.presentCount.toFloat())
    }

@Composable
private fun SectionCard(
    title: String,
    content: @Composable () -> Unit,
) {
    Column(
        Modifier
            .fillMaxWidth()
            .clip(PazShapes.large)
            .background(MaterialTheme.colorScheme.surface)
            .padding(PazSpacing.Lg),
    ) {
        Text(title, style = MaterialTheme.typography.titleSmall)
        Spacer(Modifier.height(PazSpacing.Md))
        content()
    }
}

@Composable
private fun AnalyticsFilters(
    uiState: LifeGroupAnalyticsUiState,
    onYearSelected: (Int) -> Unit,
    onMonthSelected: (Int?) -> Unit,
    onLifeGroupSelected: (Int?) -> Unit,
) {
    val currentYear = remember { LocalDate.now().year }
    val years = remember { (0..4).map { currentYear - it } }

    Column(verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
        LazyRow(horizontalArrangement = Arrangement.spacedBy(PazSpacing.Xs)) {
            items(years) { year ->
                FilterChip(
                    selected = uiState.year == year,
                    onClick = { onYearSelected(year) },
                    label = { Text(year.toString()) },
                )
            }
        }

        LazyRow(horizontalArrangement = Arrangement.spacedBy(PazSpacing.Xs)) {
            item {
                FilterChip(
                    selected = uiState.month == null,
                    onClick = { onMonthSelected(null) },
                    label = { Text("Todos os meses") },
                )
            }
            items(MONTH_LABELS.size) { index ->
                FilterChip(
                    selected = uiState.month == index + 1,
                    onClick = { onMonthSelected(index + 1) },
                    label = { Text(MONTH_LABELS[index]) },
                )
            }
        }

        LifeGroupDropdown(
            lifeGroups = uiState.lifeGroups,
            selectedId = uiState.lifeGroupId,
            onSelected = onLifeGroupSelected,
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LifeGroupDropdown(
    lifeGroups: List<Pair<Int, String>>,
    selectedId: Int?,
    onSelected: (Int?) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val selectedLabel = lifeGroups.firstOrNull { it.first == selectedId }?.second ?: "Todos os grupos"

    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
        TextField(
            value = selectedLabel,
            onValueChange = {},
            readOnly = true,
            label = { Text("Life Group") },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier =
                Modifier
                    .fillMaxWidth()
                    .menuAnchor(MenuAnchorType.PrimaryNotEditable, true),
        )
        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            DropdownMenuItem(text = { Text("Todos os grupos") }, onClick = {
                onSelected(null)
                expanded = false
            })
            lifeGroups.forEach { (id, name) ->
                DropdownMenuItem(text = { Text(name) }, onClick = {
                    onSelected(id)
                    expanded = false
                })
            }
        }
    }
}

@Composable
private fun AnalyticsError(
    message: String,
    onRetry: () -> Unit,
) {
    Box(Modifier.fillMaxSize(), Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
            modifier = Modifier.padding(PazSpacing.Xl),
        ) {
            Text(message, style = MaterialTheme.typography.bodySmall)
            PazButton(text = "Tentar Novamente", onClick = onRetry, modifier = Modifier.fillMaxWidth())
        }
    }
}

@Composable
private fun AnalyticsSkeleton() {
    LazyColumn(
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
        modifier = Modifier.fillMaxSize().padding(PazSpacing.Lg),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Sm)) }
        repeat(3) { item { PazCardSkeleton() } }
    }
}
