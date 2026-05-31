package br.church.paz.android.ui.features.memberjourney

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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.outlined.Circle
import androidx.compose.material3.Icon
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
import androidx.navigation.NavController
import br.church.paz.android.ui.components.PazButton
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.JourneyStep
import br.church.paz.shared.domain.model.JourneyStepStatus
import br.church.paz.shared.domain.model.MemberJourney
import org.koin.androidx.compose.koinViewModel

@Composable
fun MemberJourneyScreen(
    navController: NavController,
    viewModel: MemberJourneyViewModel = koinViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                MemberJourneyEffect.NavigateBack -> navController.popBackStack()
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
                    "Minha Jornada",
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
                uiState.journey != null -> ContentState(journey = uiState.journey!!)
            }
        }
    }
}

@Composable
private fun ContentState(journey: MemberJourney) {
    LazyColumn(
        modifier            = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
        contentPadding      = androidx.compose.foundation.layout.PaddingValues(PazSpacing.Lg),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Sm)) }

        items(journey.steps.sortedBy { it.order }) { step ->
            JourneyStepCard(step = step)
        }

        item { Spacer(Modifier.height(PazSpacing.Xl)) }
    }
}

@Composable
private fun JourneyStepCard(step: JourneyStep) {
    Row(
        modifier            = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
        verticalAlignment   = Alignment.Top,
    ) {
        Box(
            modifier        = Modifier
                .size(40.dp)
                .clip(CircleShape)
                .background(
                    when (step.status) {
                        JourneyStepStatus.completed -> PazColors.Primary.copy(alpha = 0.1f)
                        JourneyStepStatus.in_progress -> PazColors.Primary.copy(alpha = 0.05f)
                        JourneyStepStatus.pending -> MaterialTheme.colorScheme.surfaceVariant
                    }
                ),
            contentAlignment = Alignment.Center,
        ) {
            when (step.status) {
                JourneyStepStatus.completed -> Icon(
                    Icons.Filled.CheckCircle,
                    "completado",
                    tint = PazColors.Primary,
                    modifier = Modifier.size(24.dp),
                )
                JourneyStepStatus.in_progress -> Box(
                    Modifier
                        .size(20.dp)
                        .clip(CircleShape)
                        .background(PazColors.Primary),
                )
                JourneyStepStatus.pending -> Icon(
                    Icons.Outlined.Circle,
                    "pendente",
                    tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f),
                    modifier = Modifier.size(24.dp),
                )
            }
        }

        Column(
            modifier            = Modifier
                .weight(1f)
                .clip(PazShapes.large)
                .background(MaterialTheme.colorScheme.surface)
                .padding(PazSpacing.Lg),
            verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm),
        ) {
            Row(
                modifier            = Modifier.fillMaxWidth(),
                verticalAlignment   = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(PazSpacing.Sm),
            ) {
                Column(Modifier.weight(1f)) {
                    Text(step.title, style = MaterialTheme.typography.titleSmall)
                }
                Text(
                    when (step.status) {
                        JourneyStepStatus.completed -> "Concluído"
                        JourneyStepStatus.in_progress -> "Em andamento"
                        JourneyStepStatus.pending -> "Pendente"
                    },
                    style = MaterialTheme.typography.labelSmall.copy(
                        color = when (step.status) {
                            JourneyStepStatus.completed -> PazColors.Primary
                            JourneyStepStatus.in_progress -> PazColors.Primary
                            JourneyStepStatus.pending -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                        }
                    ),
                )
            }

            if (!step.description.isNullOrEmpty()) {
                Text(
                    step.description!!,
                    style = MaterialTheme.typography.bodySmall.copy(
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    ),
                )
            }

            if (step.completedAt != null) {
                Text(
                    "Concluído em ${ step.completedAt}",
                    style = MaterialTheme.typography.labelSmall.copy(
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                    ),
                )
            }
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
            .padding(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
    ) {
        Spacer(Modifier.height(PazSpacing.Lg))
        repeat(4) {
            Row(
                modifier            = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
                verticalAlignment   = Alignment.Top,
            ) {
                PazSkeleton(height = 40.dp, width = 40.dp)
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
                    PazSkeleton(height = 16.dp, width = 100.dp)
                    PazSkeleton(height = 12.dp)
                }
            }
        }
    }
}
