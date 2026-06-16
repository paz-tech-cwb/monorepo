package br.church.paz.android.ui.features.formularios

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.navigation.Screen
import br.church.paz.android.ui.components.PazButton
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.ServiceReportSubmission
import org.koin.androidx.compose.koinViewModel

@Composable
fun FormSubmissionsListScreen(
    navController: NavController,
    viewModel: FormSubmissionsListViewModel = koinViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                is FormSubmissionsListEffect.NavigateToDetail ->
                    navController.navigate(Screen.FormSubmissionDetail.createRoute(effect.submissionId))
                FormSubmissionsListEffect.NavigateBack -> navController.popBackStack()
            }
        }
    }

    Column(Modifier.fillMaxSize().padding(PazSpacing.Lg)) {
        when {
            uiState.isLoading -> repeat(3) { PazSkeleton(height = 72.dp) }
            uiState.error != null ->
                Column {
                    Text(uiState.error!!, style = MaterialTheme.typography.bodySmall)
                    PazButton(text = "Tentar Novamente", onClick = viewModel::onRetry)
                }
            uiState.submissions.isEmpty() ->
                Box(Modifier.fillMaxSize(), Alignment.Center) {
                    Text("Nenhum registro encontrado", style = MaterialTheme.typography.titleMedium)
                }
            else ->
                LazyColumn(
                    contentPadding = PaddingValues(vertical = PazSpacing.Sm),
                    verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm),
                ) {
                    items(uiState.submissions) { submission ->
                        SubmissionRow(submission = submission, onClick = { viewModel.onRowTap(submission.id) })
                    }
                }
        }
    }
}

@Composable
private fun SubmissionRow(
    submission: ServiceReportSubmission,
    onClick: () -> Unit,
) {
    Column(
        Modifier
            .fillMaxWidth()
            .clip(PazShapes.large)
            .background(MaterialTheme.colorScheme.surface)
            .clickable(onClick = onClick)
            .padding(PazSpacing.Md),
    ) {
        Text("${submission.date} · ${submission.period}", style = MaterialTheme.typography.titleSmall)
        Text(submission.atmosphereResponsible, style = MaterialTheme.typography.bodySmall)
        Text(
            "Adultos: ${submission.tadelAdults} · Crianças: ${submission.tadelKids}",
            style = MaterialTheme.typography.bodySmall,
        )
    }
}

@Composable
fun FormSubmissionDetailScreen(
    navController: NavController,
    submissionId: String,
    viewModel: FormSubmissionsListViewModel = koinViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val submission = uiState.submissions.find { it.id == submissionId }

    Column(Modifier.fillMaxSize().padding(PazSpacing.Lg)) {
        if (submission == null) {
            Text("Registro não encontrado", style = MaterialTheme.typography.bodyMedium)
        } else {
            val rows = listOf(
                "Data" to submission.date,
                "Tipo" to submission.reportType,
                "Período" to submission.period,
                "Responsável" to submission.atmosphereResponsible,
                "Adultos (Tadel)" to submission.tadelAdults.toString(),
                "Crianças (Tadel)" to submission.tadelKids.toString(),
                "Carros" to submission.vehiclesCars.toString(),
                "Motos" to submission.vehiclesMotos.toString(),
                "Bicicletas" to submission.vehiclesBikes.toString(),
                "Voluntários Atmosfera" to submission.volunteersAtmosfera.toString(),
                "Voluntários Louvor" to submission.volunteersLouvor.toString(),
                "Voluntários Mídia" to submission.volunteersMiddia.toString(),
                "Voluntários Dança" to submission.volunteersDanca.toString(),
                "Observações" to (submission.notes ?: "-"),
            )
            LazyColumn(verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
                items(rows) { (label, value) ->
                    Column {
                        Text(label, style = MaterialTheme.typography.labelSmall)
                        Text(value, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        }
    }
}
