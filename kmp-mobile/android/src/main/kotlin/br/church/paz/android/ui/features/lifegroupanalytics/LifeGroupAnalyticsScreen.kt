package br.church.paz.android.ui.features.lifegroupanalytics

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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenu
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.ui.components.PazBarChart
import br.church.paz.android.ui.components.PazBarChartEmpty
import br.church.paz.android.ui.components.PazBarChartEntry
import br.church.paz.android.ui.components.PazButton
import br.church.paz.android.ui.components.PazCardSkeleton
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.LifeGroupAttendancePoint
import org.koin.androidx.compose.koinViewModel
import org.koin.core.parameter.parametersOf
import java.time.LocalDate
import kotlin.math.roundToInt

private val MONTH_LABELS =
    listOf("Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez")

@Composable
fun LifeGroupAnalyticsScreen(
    navController: NavController,
    lifeGroupId: String?,
    lifeGroupName: String? = null,
    viewModel: LifeGroupAnalyticsViewModel =
        koinViewModel(parameters = { parametersOf(lifeGroupId?.toIntOrNull(), lifeGroupName) }),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                LifeGroupAnalyticsEffect.NavigateBack -> navController.popBackStack()
            }
        }
    }

    Scaffold { _ ->
        Column(Modifier.fillMaxSize()) {
            Box(Modifier.fillMaxWidth().background(PazGradients.Hero).statusBarsPadding()) {
                Row(
                    Modifier.fillMaxWidth().padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Md),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    IconButton(onClick = viewModel::onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "voltar", tint = Color.White)
                    }
                    Text(
                        uiState.lockedGroupName ?: "Relatórios",
                        style = MaterialTheme.typography.headlineMedium.copy(color = Color.White),
                        modifier = Modifier.weight(1f),
                    )
                }
            }

            Box(
                Modifier
                    .fillMaxSize()
                    .clip(RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
                    .background(MaterialTheme.colorScheme.background),
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
                            onClearFilters = viewModel::clearFilters,
                        )
                }
            }
        }
    }
}

@Composable
private fun AnalyticsContent(
    uiState: LifeGroupAnalyticsUiState,
    onYearSelected: (Int) -> Unit,
    onMonthSelected: (Int?) -> Unit,
    onLifeGroupSelected: (Int?) -> Unit,
    onDistributionTabSelected: (DistributionTab) -> Unit,
    onClearFilters: () -> Unit,
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
                onClearFilters = onClearFilters,
            )
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
            SectionCard(title = "Life Groups Distribution") {
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
                    PazBarChartEmpty("No Life Group with this data registered.")
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
        val percentage = point.attendanceRate * 100
        PazBarChartEntry(label = label, value = percentage.toFloat(), displayValue = "${percentage.roundToInt()}%")
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
    onClearFilters: () -> Unit,
) {
    val currentYear = remember { LocalDate.now().year }
    val years = remember { (0..4).map { currentYear - it } }
    val hasActiveFilters =
        uiState.month != null ||
            uiState.year != currentYear ||
            (!uiState.isLockedToSingleGroup && uiState.lifeGroupId != null)

    Column(verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(PazSpacing.Xs),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            SimpleDropdown(
                label = uiState.year.toString(),
                options = years.map { it.toString() to it },
                onSelected = onYearSelected,
            )
            SimpleDropdown(
                label = uiState.month?.let { MONTH_LABELS[it - 1] } ?: "Todos os meses",
                options = listOf("Todos os meses" to null) + MONTH_LABELS.mapIndexed { i, l -> l to (i + 1) },
                onSelected = onMonthSelected,
            )
            if (hasActiveFilters) {
                IconButton(onClick = onClearFilters) {
                    Icon(Icons.Filled.Close, contentDescription = "Limpar filtros")
                }
            }
        }

        // Locked to a single group when opened from that group's own
        // "Relatórios" entry point — no picker, just its name. Only shown
        // as a switcher when opened unscoped and the viewer can see more
        // than one group.
        if (uiState.isLockedToSingleGroup) {
            uiState.lockedGroupName?.let { name ->
                Text(name, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp))
            }
        } else if (uiState.lifeGroups.size > 1) {
            LifeGroupDropdown(
                lifeGroups = uiState.lifeGroups,
                selectedId = uiState.lifeGroupId,
                onSelected = onLifeGroupSelected,
            )
        } else {
            uiState.lifeGroups.firstOrNull()?.let { (_, name) ->
                Text(
                    name,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                )
            }
        }
    }
}

@Composable
private fun <T> SimpleDropdown(
    label: String,
    options: List<Pair<String, T>>,
    onSelected: (T) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    Box {
        androidx.compose.material3.AssistChip(
            onClick = { expanded = true },
            label = { Text(label) },
            trailingIcon = { Icon(Icons.AutoMirrored.Outlined.KeyboardArrowRight, contentDescription = null) },
        )
        androidx.compose.material3.DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            options.forEach { (optionLabel, value) ->
                DropdownMenuItem(text = { Text(optionLabel) }, onClick = {
                    onSelected(value)
                    expanded = false
                })
            }
        }
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
    val selectedLabel = lifeGroups.firstOrNull { it.first == selectedId }?.second ?: "All my Life Groups"

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
            DropdownMenuItem(text = { Text("All my Life Groups") }, onClick = {
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
