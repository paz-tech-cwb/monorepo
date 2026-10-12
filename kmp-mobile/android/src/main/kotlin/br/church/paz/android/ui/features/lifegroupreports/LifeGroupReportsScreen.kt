package br.church.paz.android.ui.features.lifegroupreports

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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.Assignment
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LargeTopAppBar
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.navigation.Screen
import br.church.paz.android.ui.components.PazButton
import br.church.paz.android.ui.components.PazCardSkeleton
import br.church.paz.android.ui.components.PazMeshBackground
import br.church.paz.android.ui.components.PazPullToRefresh
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.android.util.brDateString
import br.church.paz.shared.domain.model.LifeGroupWeeklyReport
import org.koin.androidx.compose.koinViewModel
import org.koin.core.parameter.parametersOf

/** Read-only list of one life group's weekly reports. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LifeGroupReportsScreen(
    navController: NavController,
    lifeGroupId: String,
    viewModel: LifeGroupReportsViewModel =
        koinViewModel(parameters = { parametersOf(lifeGroupId.toInt()) }),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                LifeGroupReportsEffect.NavigateBack -> navController.popBackStack()
                is LifeGroupReportsEffect.NavigateToDetail ->
                    navController.navigate(Screen.LifeGroupReportDetail.createRoute(effect.reportId))
            }
        }
    }

    Box(Modifier.fillMaxSize()) {
        PazMeshBackground()

        Scaffold(
            topBar = {
                LargeTopAppBar(
                    title = { Text("Relatórios semanais", maxLines = 1) },
                    navigationIcon = {
                        IconButton(onClick = viewModel::onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, "voltar")
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
                    uiState.isLoading -> ReportsSkeleton()
                    uiState.noAccess -> ReportsMessage("Você não tem acesso aos relatórios deste grupo.")
                    uiState.error != null -> ReportsMessage(uiState.error!!, onRetry = viewModel::load)
                    uiState.reports.isEmpty() -> ReportsMessage("Nenhum relatório enviado")
                    else ->
                        ReportsList(
                            reports = uiState.reports,
                            onReportTap = { viewModel.onReportTapped(it.id) },
                        )
                }
            }
        }
    }
}

@Composable
private fun ReportsList(
    reports: List<LifeGroupWeeklyReport>,
    onReportTap: (LifeGroupWeeklyReport) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        items(reports, key = { it.id }) { report ->
            ReportCard(report = report, onClick = { onReportTap(report) })
        }
        item { Spacer(Modifier.height(PazSpacing.Xl)) }
    }
}

@Composable
private fun ReportCard(
    report: LifeGroupWeeklyReport,
    onClick: () -> Unit,
) {
    val subdued = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f)
    Row(
        modifier =
            Modifier
                .fillMaxWidth()
                .clip(PazShapes.large)
                .background(MaterialTheme.colorScheme.surface)
                .clickable(onClick = onClick)
                .padding(PazSpacing.Lg),
        horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.AutoMirrored.Outlined.Assignment, contentDescription = null, tint = PazColors.Primary)
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(PazSpacing.Xs)) {
            Text(brDateString(report.date), style = MaterialTheme.typography.bodyMedium)
            Text(
                "${report.committedMembersPresent} de ${report.committedMembers} presentes · ${report.guests} convidados",
                style = MaterialTheme.typography.bodySmall.copy(color = subdued),
            )
            Text(
                "Oferta ${formatOffering(report.offering)}",
                style = MaterialTheme.typography.bodySmall.copy(color = subdued),
            )
            report.submittedByName?.let {
                Text("Enviado por $it", style = MaterialTheme.typography.labelSmall.copy(color = subdued))
            }
        }
        Icon(
            Icons.AutoMirrored.Outlined.KeyboardArrowRight,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
        )
    }
}

/** Centered message with an optional retry; shared by the list and detail screens. */
@Composable
internal fun ReportsMessage(
    message: String,
    onRetry: (() -> Unit)? = null,
) {
    Box(Modifier.fillMaxSize(), Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
            modifier = Modifier.padding(PazSpacing.Xl),
        ) {
            Text(
                message,
                style = MaterialTheme.typography.bodyMedium.copy(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)),
            )
            if (onRetry != null) {
                PazButton(text = "Tentar Novamente", onClick = onRetry, modifier = Modifier.fillMaxWidth())
            }
        }
    }
}

@Composable
internal fun ReportsSkeleton() {
    LazyColumn(
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
        modifier = Modifier.fillMaxSize().padding(PazSpacing.Lg),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Sm)) }
        repeat(5) { item { PazCardSkeleton() } }
    }
}
