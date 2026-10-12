package br.church.paz.android.ui.features.lifegroupreports

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.ui.components.PazGlassCard
import br.church.paz.android.ui.components.PazMeshBackground
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.android.util.brDateString
import br.church.paz.shared.domain.model.LifeGroupWeeklyReport
import org.koin.androidx.compose.koinViewModel
import org.koin.core.parameter.parametersOf

/** Read-only detail of one weekly report. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LifeGroupReportDetailScreen(
    navController: NavController,
    reportId: String,
    viewModel: LifeGroupReportDetailViewModel =
        koinViewModel(parameters = { parametersOf(reportId) }),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                LifeGroupReportDetailEffect.NavigateBack -> navController.popBackStack()
            }
        }
    }

    Box(Modifier.fillMaxSize()) {
        PazMeshBackground()

        Scaffold(
            topBar = {
                LargeTopAppBar(
                    title = { Text(uiState.report?.let { brDateString(it.date) } ?: "Relatório", maxLines = 1) },
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
            Box(Modifier.fillMaxSize().padding(top = innerPadding.calculateTopPadding())) {
                val report = uiState.report
                when {
                    uiState.isLoading -> ReportsSkeleton()
                    uiState.noAccess -> ReportsMessage("Relatório não encontrado ou sem acesso.")
                    uiState.error != null -> ReportsMessage(uiState.error!!, onRetry = viewModel::load)
                    report == null -> ReportsMessage("Relatório não encontrado.")
                    else -> ReportDetailContent(report)
                }
            }
        }
    }
}

@Composable
private fun ReportDetailContent(report: LifeGroupWeeklyReport) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
    ) {
        item {
            DetailCard(
                title = "Reunião",
                rows =
                    listOfNotNull(
                        "Data" to brDateString(report.date),
                        report.submittedByName?.let { "Enviado por" to it },
                        "Membros comprometidos" to report.committedMembers.toString(),
                        "Comprometidos presentes" to report.committedMembersPresent.toString(),
                        "Crianças (0 a 11)" to report.kids0To11.toString(),
                        "Convidados" to report.guests.toString(),
                        "MDAs" to report.mdas.toString(),
                        "Oferta" to formatOffering(report.offering),
                    ),
            )
        }
        item {
            DetailCard(
                title = "Liderança",
                rows =
                    listOf(
                        "Comprometidos no Tadel" to report.committedAtTadel.toString(),
                        "Comprometidos no culto" to report.committedAtCulto.toString(),
                        "Líder presente em" to activitySummary(report.leaderAttended, null),
                        "Discípulos" to report.disciplesCount.toString(),
                        "Discipulados na semana" to report.disciplesDiscipledThisWeek.toString(),
                    ),
            )
        }
        item {
            DetailCard(
                title = "Atividades",
                rows =
                    listOf(
                        "Pastoreio" to activitySummary(report.pastoringActivityType, report.pastoringActivityOther),
                        "Treinamento" to activitySummary(report.trainingActivityType, report.trainingActivityOther),
                    ),
            )
        }
        item { Spacer(Modifier.height(PazSpacing.Xl)) }
    }
}

@Composable
private fun DetailCard(
    title: String,
    rows: List<Pair<String, String>>,
) {
    PazGlassCard(
        modifier = Modifier.fillMaxWidth().clip(PazShapes.large),
        cornerRadius = PazSpacing.CardRadiusCompact,
    ) {
        Column(Modifier.padding(PazSpacing.Lg), verticalArrangement = Arrangement.spacedBy(PazSpacing.Md)) {
            Text(title, style = MaterialTheme.typography.titleSmall)
            rows.forEach { (label, value) ->
                Column {
                    Text(
                        label,
                        style = MaterialTheme.typography.labelSmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)),
                    )
                    Text(value, style = MaterialTheme.typography.bodyMedium)
                }
            }
        }
    }
}
