package br.church.paz.android.ui.features.agenda

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.Icon
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import br.church.paz.android.ui.components.PazButton
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.AgendaEvent
import org.koin.androidx.compose.koinViewModel
import org.koin.core.parameter.parametersOf

@Composable
fun AgendaDetailScreen(
    navController: NavController,
    eventId: String,
    viewModel: AgendaDetailViewModel = koinViewModel(parameters = { parametersOf(eventId) }),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                AgendaDetailEffect.NavigateBack -> navController.popBackStack()
            }
        }
    }

    Column(Modifier.fillMaxSize()) {
        Box(
            Modifier
                .fillMaxWidth()
                .background(PazGradients.Hero)
                .statusBarsPadding(),
        ) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Md),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = { viewModel.onBack() }) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, "back", tint = Color.White)
                }
                Text(
                    "Evento",
                    style = MaterialTheme.typography.headlineMedium.copy(color = Color.White),
                    modifier = Modifier.weight(1f),
                )
            }
        }

        Box(
            Modifier
                .fillMaxSize()
                .clip(androidx.compose.foundation.shape.RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
                .background(MaterialTheme.colorScheme.background),
        ) {
            when {
                uiState.isLoading -> LoadingState()
                uiState.error != null -> ErrorState(error = uiState.error!!, onRetry = viewModel::onRetry)
                uiState.event != null -> ContentState(event = uiState.event!!)
            }
        }
    }
}

@Composable
private fun ContentState(event: AgendaEvent) {
    LazyColumn(
        modifier            = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Lg)) }

        item {
            Column(Modifier.padding(horizontal = PazSpacing.Lg)) {
                Text(event.title, style = MaterialTheme.typography.headlineSmall)
                Spacer(Modifier.height(PazSpacing.Sm))
                Text(
                    "Evento da Igreja",
                    style = MaterialTheme.typography.labelSmall.copy(color = PazColors.Primary),
                )
            }
        }

        item {
            Column(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = PazSpacing.Lg)
                    .clip(PazShapes.large)
                    .background(MaterialTheme.colorScheme.surface)
                    .padding(PazSpacing.Lg),
                verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
            ) {
                DetailRow(icon = Icons.Default.Schedule, title = "Data e Hora", value = formatDateTime(event.startDate, event.endDate ?: ""))
                if (!event.location.isNullOrEmpty()) {
                    DetailRow(icon = Icons.Default.LocationOn, title = "Local", value = event.location!!)
                }
            }
        }

        if (!event.description.isNullOrEmpty()) {
            item {
                Column(
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = PazSpacing.Lg),
                ) {
                    Text("Descrição", style = MaterialTheme.typography.titleSmall)
                    Spacer(Modifier.height(PazSpacing.Sm))
                    Text(event.description!!, style = MaterialTheme.typography.bodySmall)
                }
            }
        }

        item { Spacer(Modifier.height(PazSpacing.Xl)) }
    }
}

@Composable
private fun DetailRow(icon: ImageVector, title: String, value: String) {
    Row(
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Icon(
            imageVector = icon,
            contentDescription = title,
            tint = PazColors.Primary,
            modifier = Modifier.padding(top = 2.dp),
        )
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.labelSmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(.6f)))
            Text(value, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun ErrorState(error: String, onRetry: () -> Unit) {
    Box(
        modifier         = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
            modifier            = Modifier.padding(PazSpacing.Xl),
        ) {
            Text(error, style = MaterialTheme.typography.bodySmall)
            Spacer(Modifier.height(PazSpacing.Lg))
            PazButton(text = "Tentar Novamente", onClick = onRetry, modifier = Modifier.fillMaxWidth())
        }
    }
}

@Composable
private fun LoadingState() {
    Column(
        modifier            = Modifier
            .fillMaxSize()
            .padding(PazSpacing.Xl),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
    ) {
        Spacer(Modifier.height(PazSpacing.Lg))
        PazSkeleton(height = 32.dp)
        PazSkeleton(height = 16.dp, width = 100.dp)
        Spacer(Modifier.height(PazSpacing.Lg))
        PazSkeleton(height = 120.dp)
        Spacer(Modifier.height(PazSpacing.Lg))
        PazSkeleton(height = 16.dp)
    }
}

private fun formatDateTime(startDate: String, endDate: String): String {
    return "$startDate — $endDate"
}
