package br.church.paz.android.ui.features.casadepazanalytics

import android.app.Activity
import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LargeTopAppBar
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SelectableDates
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.ui.components.PazButton
import br.church.paz.android.ui.components.PazCardSkeleton
import br.church.paz.android.ui.components.PazMeshBackground
import br.church.paz.android.ui.components.PazPullToRefresh
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.android.util.ReportPdfExporter
import br.church.paz.shared.domain.model.CasaDePazAnalyticsSummary
import kotlinx.coroutines.launch
import org.koin.androidx.compose.koinViewModel
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

private val ISO_DATE: DateTimeFormatter = DateTimeFormatter.ISO_LOCAL_DATE

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CasaDePazAnalyticsScreen(
    navController: NavController,
    viewModel: CasaDePazAnalyticsViewModel = koinViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var isExportingPdf by remember { mutableStateOf(false) }
    var exportError by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                CasaDePazAnalyticsEffect.NavigateBack -> navController.popBackStack()
            }
        }
    }

    // Renders the FULL report (stat cards + all charts, filters excluded,
    // since they're controls, not report content) off-screen into a
    // paginated PDF via [ReportPdfExporter] and opens the system share
    // sheet with the resulting file.
    fun exportAndShare() {
        val summary = uiState.summary ?: return
        val activity =
            context as? Activity ?: run {
                exportError = "Não foi possível exportar o relatório. Tente novamente."
                return
            }
        scope.launch {
            isExportingPdf = true
            try {
                val file =
                    ReportPdfExporter.export(activity, "relatorio-casa-de-paz-${System.currentTimeMillis()}.pdf") {
                        CasaDePazReportExportContent(summary, uiState.from, uiState.to)
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
                    title = { Text("Casa de Paz") },
                    navigationIcon = {
                        IconButton(onClick = viewModel::onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, "voltar")
                        }
                    },
                    actions = {
                        if (!uiState.isLoading && uiState.error == null && uiState.summary != null) {
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
            PazPullToRefresh(
                isRefreshing = uiState.isRefreshing,
                onRefresh = viewModel::refresh,
                modifier = Modifier.fillMaxSize().padding(top = innerPadding.calculateTopPadding()),
            ) {
                when {
                    uiState.isLoading -> AnalyticsSkeleton()
                    uiState.error != null -> AnalyticsError(uiState.error!!, viewModel::load)
                    else ->
                        AnalyticsContent(
                            uiState = uiState,
                            onFromSelected = viewModel::onFromSelected,
                            onToSelected = viewModel::onToSelected,
                        )
                }
            }
        }
    }
}

/**
 * Plain [Column] (not [LazyColumn] — needs unbounded height so
 * [ReportPdfExporter] can measure the full report) rendering every section
 * of the Casa de Paz report for PDF export: stat cards + all five charts.
 * Date filters are excluded — they're controls, not report content. Uses a
 * plain white background (no [PazMeshBackground] mesh/glass chrome) since
 * [android.graphics.pdf.PdfDocument]'s software canvas can't reliably
 * render hardware-accelerated-only effects, and a plain background reads
 * better in a printed/shared PDF anyway.
 */
@Composable
private fun CasaDePazReportExportContent(
    summary: CasaDePazAnalyticsSummary,
    from: String,
    to: String,
) {
    Column(
        modifier =
            Modifier
                .fillMaxWidth()
                .background(Color.White)
                .padding(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
    ) {
        ExportHeader(
            title = "Relatório Casa de Paz",
            scopeLabel = "Período: $from a $to",
        )
        CasaDePazStatCards(summary)
        CasaDePazHousesActivityChart(summary)
        CasaDePazAttendanceChart(summary)
        CasaDePazNewPeopleChart(summary)
        CasaDePazBySectorChart(summary)
        CasaDePazByDayChart(summary)
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
    uiState: CasaDePazAnalyticsUiState,
    onFromSelected: (String) -> Unit,
    onToSelected: (String) -> Unit,
) {
    val summary = uiState.summary
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
    ) {
        item {
            DateRangeFilters(
                from = uiState.from,
                to = uiState.to,
                onFromSelected = onFromSelected,
                onToSelected = onToSelected,
            )
        }

        if (summary == null) return@LazyColumn

        item { CasaDePazStatCards(summary) }
        item { CasaDePazHousesActivityChart(summary) }
        item { CasaDePazAttendanceChart(summary) }
        item { CasaDePazNewPeopleChart(summary) }
        item { CasaDePazBySectorChart(summary) }
        item { CasaDePazByDayChart(summary) }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DateRangeFilters(
    from: String,
    to: String,
    onFromSelected: (String) -> Unit,
    onToSelected: (String) -> Unit,
) {
    var openPicker by remember { mutableStateOf<DatePickerTarget?>(null) }

    Row(horizontalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
        DateFilterButton(label = "De", value = from, modifier = Modifier.weight(1f)) {
            openPicker = DatePickerTarget.FROM
        }
        DateFilterButton(label = "Até", value = to, modifier = Modifier.weight(1f)) {
            openPicker = DatePickerTarget.TO
        }
    }

    openPicker?.let { target ->
        DateRangePickerDialog(
            initialDate = if (target == DatePickerTarget.FROM) from else to,
            minDate = if (target == DatePickerTarget.TO) from else null,
            onDismiss = { openPicker = null },
            onConfirm = { iso ->
                if (target == DatePickerTarget.FROM) onFromSelected(iso) else onToSelected(iso)
                openPicker = null
            },
        )
    }
}

private enum class DatePickerTarget { FROM, TO }

@Composable
private fun DateFilterButton(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Column(modifier = modifier) {
        Text(label, style = MaterialTheme.typography.labelSmall)
        OutlinedButton(onClick = onClick, modifier = Modifier.fillMaxWidth()) {
            Text(value)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DateRangePickerDialog(
    initialDate: String,
    minDate: String?,
    onDismiss: () -> Unit,
    onConfirm: (String) -> Unit,
) {
    val initialMillis =
        remember(initialDate) {
            LocalDate
                .parse(initialDate, ISO_DATE)
                .atStartOfDay(ZoneOffset.UTC)
                .toInstant()
                .toEpochMilli()
        }
    val minMillis =
        remember(minDate) {
            minDate?.let {
                LocalDate
                    .parse(it, ISO_DATE)
                    .atStartOfDay(ZoneOffset.UTC)
                    .toInstant()
                    .toEpochMilli()
            }
        }
    val datePickerState =
        rememberDatePickerState(
            initialSelectedDateMillis = initialMillis,
            initialDisplayedMonthMillis = initialMillis,
            selectableDates =
                object : SelectableDates {
                    override fun isSelectableDate(utcTimeMillis: Long): Boolean {
                        if (utcTimeMillis > System.currentTimeMillis()) return false
                        if (minMillis != null && utcTimeMillis < minMillis) return false
                        return true
                    }
                },
        )
    DatePickerDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            TextButton(onClick = {
                datePickerState.selectedDateMillis?.let { millis ->
                    val iso =
                        Instant
                            .ofEpochMilli(millis)
                            .atZone(ZoneOffset.UTC)
                            .toLocalDate()
                            .format(ISO_DATE)
                    onConfirm(iso)
                } ?: onDismiss()
            }) { Text("OK") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } },
    ) {
        DatePicker(state = datePickerState)
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
        repeat(3) { item { PazCardSkeleton() } }
    }
}
