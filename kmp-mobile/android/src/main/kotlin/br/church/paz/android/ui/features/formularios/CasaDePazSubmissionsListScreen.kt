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
import br.church.paz.android.ui.components.PazButton
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
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

@Composable
private fun SubmissionRow(
    submission: CasaDePazReportSubmission,
    sectorName: String,
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
        Text("${submission.date} · $sectorName", style = MaterialTheme.typography.titleSmall)
        Text(submission.facilitator, style = MaterialTheme.typography.bodySmall)
        Text(
            "Crianças: ${submission.kids} · Convidados: ${submission.guests.size} · " +
                "Conversões: ${submission.conversions}",
            style = MaterialTheme.typography.bodySmall,
        )
    }
}
