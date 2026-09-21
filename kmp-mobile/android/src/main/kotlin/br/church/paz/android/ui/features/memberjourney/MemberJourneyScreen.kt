package br.church.paz.android.ui.features.memberjourney

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.HourglassEmpty
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.outlined.Circle
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.ui.components.PazErrorState
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.JourneyTrack
import br.church.paz.shared.domain.model.JourneyTrackStep
import br.church.paz.shared.domain.model.JourneyTrackStepType
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
                .clip(RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
                .background(MaterialTheme.colorScheme.background),
        ) {
            when {
                uiState.isLoading -> LoadingState()
                uiState.error != null -> ErrorState(error = uiState.error!!, onRetry = viewModel::onRetry)
                uiState.isEmpty -> EmptyState()
                else ->
                    ContentState(
                        tracks = uiState.tracks,
                        expandedTrackKey = uiState.expandedTrackKey,
                        onToggleTrack = viewModel::onToggleTrack,
                    )
            }
        }
    }
}

@Composable
private fun ContentState(
    tracks: List<JourneyTrack>,
    expandedTrackKey: String?,
    onToggleTrack: (String) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
        contentPadding = PaddingValues(PazSpacing.Lg),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Sm)) }

        items(tracks, key = { it.key }) { track ->
            JourneyTrackCard(
                track = track,
                isExpanded = track.key == expandedTrackKey,
                onToggle = { onToggleTrack(track.key) },
            )
        }

        item { Spacer(Modifier.height(PazSpacing.Xl)) }
    }
}

@Composable
private fun JourneyTrackCard(
    track: JourneyTrack,
    isExpanded: Boolean,
    onToggle: () -> Unit,
) {
    val totalTrackedSteps = track.steps.count { it.type != JourneyTrackStepType.Informational }
    val completedTrackedSteps =
        track.steps.count { it.type != JourneyTrackStepType.Informational && it.completed }

    val rotation by androidx.compose.animation.core.animateFloatAsState(
        targetValue = if (isExpanded) 180f else 0f,
        label = "chevronRotation",
    )

    Column(
        modifier =
            Modifier
                .fillMaxWidth()
                .clip(PazShapes.large)
                .background(MaterialTheme.colorScheme.surface),
    ) {
        Column(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .clickable(onClick = onToggle)
                    .padding(PazSpacing.Lg),
            verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(PazSpacing.Sm),
            ) {
                Column(Modifier.weight(1f)) {
                    Text(track.title, style = MaterialTheme.typography.titleMedium)
                    if (totalTrackedSteps > 0) {
                        Text(
                            "$completedTrackedSteps/$totalTrackedSteps concluído",
                            style =
                                MaterialTheme.typography.labelSmall.copy(
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                                ),
                        )
                    }
                }
                Icon(
                    Icons.Filled.ExpandMore,
                    contentDescription = if (isExpanded) "recolher" else "expandir",
                    tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                    modifier = Modifier.rotate(rotation),
                )
            }

            val trackDescription = track.description
            if (!trackDescription.isNullOrEmpty()) {
                Text(
                    trackDescription,
                    style =
                        MaterialTheme.typography.bodySmall.copy(
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        ),
                )
            }

            if (totalTrackedSteps > 0) {
                LinearProgressIndicator(
                    progress = { track.progressPercentage / 100f },
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .clip(PazShapes.small),
                    color = PazColors.Primary,
                    trackColor = MaterialTheme.colorScheme.surfaceVariant,
                )
            }
        }

        AnimatedVisibility(
            visible = isExpanded,
            enter = fadeIn(tween(200)) + expandVertically(tween(200)),
            exit = fadeOut(tween(150)) + shrinkVertically(tween(150)),
        ) {
            Column(
                modifier = Modifier.padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Sm),
                verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
            ) {
                track.steps.forEach { step ->
                    JourneyStepRow(step = step)
                }
                Spacer(Modifier.height(PazSpacing.Sm))
            }
        }
    }
}

@Composable
private fun JourneyStepRow(step: JourneyTrackStep) {
    val uriHandler = LocalUriHandler.current

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
        verticalAlignment = Alignment.Top,
    ) {
        Box(
            modifier =
                Modifier
                    .size(32.dp)
                    .clip(CircleShape)
                    .background(stepIconBackground(step)),
            contentAlignment = Alignment.Center,
        ) {
            when {
                step.type == JourneyTrackStepType.Informational ->
                    Icon(
                        Icons.Filled.Info,
                        "informativo",
                        tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                        modifier = Modifier.size(18.dp),
                    )
                step.completed ->
                    Icon(
                        Icons.Filled.CheckCircle,
                        "concluído",
                        tint = PazColors.Primary,
                        modifier = Modifier.size(20.dp),
                    )
                step.type == JourneyTrackStepType.ManualApproval ->
                    Icon(
                        Icons.Filled.HourglassEmpty,
                        "aguardando aprovação",
                        tint = PazColors.Gold,
                        modifier = Modifier.size(18.dp),
                    )
                else ->
                    Icon(
                        Icons.Outlined.Circle,
                        "pendente",
                        tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f),
                        modifier = Modifier.size(18.dp),
                    )
            }
        }

        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(PazSpacing.Xs)) {
            Text(step.title, style = MaterialTheme.typography.bodyMedium)

            val stepDescription = step.description
            if (!stepDescription.isNullOrEmpty()) {
                Text(
                    stepDescription,
                    style =
                        MaterialTheme.typography.bodySmall.copy(
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        ),
                )
            }

            Text(
                stepStatusLabel(step),
                style =
                    MaterialTheme.typography.labelSmall.copy(
                        color = stepStatusColor(step),
                    ),
            )

            val stepExternalUrl = step.externalUrl
            if (step.type == JourneyTrackStepType.Informational && !stepExternalUrl.isNullOrEmpty()) {
                Row(
                    modifier =
                        Modifier
                            .clickable { uriHandler.openUri(stepExternalUrl) }
                            .padding(top = PazSpacing.Xs),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(PazSpacing.Xs),
                ) {
                    Text(
                        "Saiba mais",
                        style = MaterialTheme.typography.labelMedium.copy(color = PazColors.Primary),
                    )
                    Icon(
                        Icons.AutoMirrored.Filled.OpenInNew,
                        contentDescription = null,
                        tint = PazColors.Primary,
                        modifier = Modifier.size(14.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun stepIconBackground(step: JourneyTrackStep): Color =
    when {
        step.type == JourneyTrackStepType.Informational -> MaterialTheme.colorScheme.surfaceVariant
        step.completed -> PazColors.Primary.copy(alpha = 0.1f)
        step.type == JourneyTrackStepType.ManualApproval -> PazColors.Gold.copy(alpha = 0.15f)
        else -> MaterialTheme.colorScheme.surfaceVariant
    }

@Composable
private fun stepStatusColor(step: JourneyTrackStep): Color =
    when {
        step.completed -> PazColors.Primary
        step.type == JourneyTrackStepType.ManualApproval -> PazColors.Gold
        else -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
    }

private fun stepStatusLabel(step: JourneyTrackStep): String =
    when {
        step.completed && step.source?.name == "ManualApproval" && !step.completedByName.isNullOrEmpty() ->
            "Concluído por ${step.completedByName}"
        step.completed -> "Concluído"
        step.type == JourneyTrackStepType.ManualApproval -> "Aguardando aprovação de um líder"
        step.type == JourneyTrackStepType.CourseCompletion -> "Ainda não concluído"
        else -> ""
    }

@Composable
private fun ErrorState(
    error: String,
    onRetry: () -> Unit,
) {
    PazErrorState(message = error, onRetry = onRetry)
}

@Composable
private fun EmptyState() {
    Box(
        modifier = Modifier.fillMaxSize().padding(PazSpacing.Lg),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            "Nenhuma trilha encontrada",
            style =
                MaterialTheme.typography.bodyMedium.copy(
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                ),
        )
    }
}

@Composable
private fun LoadingState() {
    Column(
        modifier =
            Modifier
                .fillMaxSize()
                .padding(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
    ) {
        Spacer(Modifier.height(PazSpacing.Lg))
        repeat(4) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
                verticalAlignment = Alignment.Top,
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
