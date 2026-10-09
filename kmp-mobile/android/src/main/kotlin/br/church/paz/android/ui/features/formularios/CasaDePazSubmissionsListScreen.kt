package br.church.paz.android.ui.features.formularios

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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.navigation.Screen
import br.church.paz.android.ui.components.PazErrorState
import br.church.paz.android.ui.components.PazMenuRow
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.CasaDePazReportSection
import br.church.paz.shared.domain.model.CasaDePazReportSubmission
import org.koin.androidx.compose.koinViewModel

@Composable
fun CasaDePazSubmissionsListScreen(
    navController: NavController,
    viewModel: CasaDePazSubmissionsListViewModel = koinViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                is CasaDePazSubmissionsListEffect.NavigateToDetail ->
                    navController.navigate(Screen.CasaDePazSubmissionEditor.createRoute(effect.submissionId))
                CasaDePazSubmissionsListEffect.NavigateBack -> navController.popBackStack()
            }
        }
    }

    // Reload whenever this screen returns to the foreground (e.g. popping back from the
    // editor after a save/delete) — the ViewModel only loads once in init otherwise.
    val lifecycleOwner = LocalLifecycleOwner.current
    val currentOnResume = rememberUpdatedState(viewModel::load)
    DisposableEffect(lifecycleOwner) {
        val observer =
            LifecycleEventObserver { _, event ->
                if (event == Lifecycle.Event.ON_RESUME) currentOnResume.value()
            }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    if (uiState.isCyclePickerVisible) {
        CasaDePazCyclePickerSheet(
            state =
                PickerState(
                    key = "casaDePazId",
                    label = "Selecione o ciclo",
                    kind = PickerKind.CASA_DE_PAZ_CYCLE,
                    query = uiState.cyclePickerQuery,
                    results = viewModel.filteredCycles,
                    isLoading = false,
                    error = null,
                ),
            selectedId = uiState.selectedCycleId ?: "",
            onQueryChanged = viewModel::onCyclePickerQueryChanged,
            onSelect = { id, _ -> viewModel.onCycleSelected(id) },
            onDismiss = viewModel::onDismissCyclePicker,
        )
    }

    Column(Modifier.fillMaxSize().padding(PazSpacing.Lg)) {
        // Hub entry point to the Casa de Paz weekly lesson content.
        Row(
            Modifier
                .fillMaxWidth()
                .clip(PazShapes.large)
                .background(MaterialTheme.colorScheme.surface)
                .clickable { navController.navigate(Screen.CasaDePazLessonsList.route) }
                .padding(PazSpacing.Md),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(PazSpacing.Sm),
        ) {
            Icon(Icons.Filled.MenuBook, contentDescription = null)
            Text("Conteúdo Casa de Paz", style = MaterialTheme.typography.titleSmall)
            Spacer(Modifier.weight(1f))
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null)
        }
        Spacer(Modifier.height(PazSpacing.Sm))

        Text("Relatórios Casa de Paz", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(PazSpacing.Sm))

        CycleSwitcher(
            cycleName = uiState.selectedCycleName ?: "Selecionar ciclo",
            onClick = viewModel::onOpenCyclePicker,
        )
        Spacer(Modifier.height(PazSpacing.Sm))

        when {
            uiState.isLoading -> repeat(3) { PazSkeleton(height = 72.dp) }
            uiState.error != null ->
                PazErrorState(
                    message = uiState.error ?: "Não foi possível carregar os registros",
                    onRetry = viewModel::onRetry,
                )
            uiState.sections.isEmpty() ->
                Box(Modifier.fillMaxSize(), Alignment.Center) {
                    Text("Nenhum registro encontrado", style = MaterialTheme.typography.titleMedium)
                }
            else ->
                LazyColumn(contentPadding = PaddingValues(vertical = PazSpacing.Sm)) {
                    uiState.sections.forEach { section ->
                        val collapsed = uiState.collapsedDates.contains(section.date)
                        item(key = "header-${section.date}") {
                            SectionHeaderRow(
                                section = section,
                                collapsed = collapsed,
                                onClick = { viewModel.onToggleSection(section.date) },
                            )
                        }
                        if (!collapsed) {
                            items(section.submissions) { submission ->
                                SubmissionRow(
                                    submission = submission,
                                    sectorName = uiState.sectorNames[submission.sectorId] ?: "Setor removido",
                                    onClick = { viewModel.onRowTap(submission.id) },
                                )
                            }
                        }
                    }
                }
        }
    }
}

@Composable
private fun CycleSwitcher(
    cycleName: String,
    onClick: () -> Unit,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(PazShapes.large)
            .background(MaterialTheme.colorScheme.surface)
            .clickable(onClick = onClick)
            .padding(PazSpacing.Md),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text("Ciclo: $cycleName", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null)
    }
}

@Composable
private fun SectionHeaderRow(
    section: CasaDePazReportSection,
    collapsed: Boolean,
    onClick: () -> Unit,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Md),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            section.date,
            style = MaterialTheme.typography.titleSmall,
            modifier = Modifier.weight(1f),
        )
        Icon(
            imageVector = if (collapsed) Icons.Filled.ExpandMore else Icons.Filled.ExpandLess,
            contentDescription = null,
        )
    }
    HorizontalDivider(color = MaterialTheme.colorScheme.outline, thickness = 0.5.dp)
}

@Composable
private fun SubmissionRow(
    submission: CasaDePazReportSubmission,
    sectorName: String,
    onClick: () -> Unit,
) {
    PazMenuRow(
        title = sectorName,
        icon = Icons.Filled.MenuBook,
        onClick = onClick,
        trailing = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(horizontalAlignment = Alignment.End) {
                    Text(submission.facilitator, style = MaterialTheme.typography.bodySmall)
                    Text(
                        "Crianças: ${submission.kids} · Convidados: ${submission.guests.size} · " +
                            "Conversões: ${submission.conversions}",
                        style = MaterialTheme.typography.labelSmall,
                    )
                }
                Spacer(Modifier.width(PazSpacing.Sm))
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                )
            }
        },
    )
}
