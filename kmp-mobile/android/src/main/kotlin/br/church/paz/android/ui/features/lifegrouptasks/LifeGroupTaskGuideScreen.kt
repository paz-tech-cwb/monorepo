package br.church.paz.android.ui.features.lifegrouptasks

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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
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
import br.church.paz.android.ui.components.MarkdownText
import br.church.paz.android.ui.components.PazButton
import br.church.paz.android.ui.components.PazButtonVariant
import br.church.paz.android.ui.components.PazErrorState
import br.church.paz.android.ui.components.PazGlassCard
import br.church.paz.android.ui.components.PazMeshBackground
import br.church.paz.android.ui.components.PazPullToRefresh
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.android.util.brDateString
import br.church.paz.shared.domain.model.LifeGroupTask
import org.koin.androidx.compose.koinViewModel
import org.koin.core.parameter.parametersOf

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LifeGroupTaskGuideScreen(
    navController: NavController,
    assignmentId: String,
    viewModel: LifeGroupTaskGuideViewModel = koinViewModel(parameters = { parametersOf(assignmentId) }),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                LifeGroupTaskGuideEffect.NavigateBack -> navController.popBackStack()
            }
        }
    }

    if (uiState.showDeclineConfirm) {
        AlertDialog(
            onDismissRequest = viewModel::onDeclineDismissed,
            title = { Text("Não posso fazer esta tarefa?") },
            text = {
                Text(
                    "A tarefa será passada para outra pessoa do grupo e a liderança será avisada.",
                    style = MaterialTheme.typography.bodyMedium,
                )
            },
            confirmButton = {
                TextButton(onClick = viewModel::onDeclineConfirmed) { Text("Sim, não posso") }
            },
            dismissButton = {
                TextButton(onClick = viewModel::onDeclineDismissed) { Text("Cancelar") }
            },
        )
    }

    Box(Modifier.fillMaxSize()) {
        PazMeshBackground()

        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("Tarefa do Life", maxLines = 1) },
                    navigationIcon = {
                        IconButton(onClick = viewModel::onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, "voltar")
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent),
                )
            },
            containerColor = Color.Transparent,
        ) { innerPadding ->
            PazPullToRefresh(
                isRefreshing = uiState.isRefreshing,
                onRefresh = viewModel::refresh,
                modifier = Modifier.fillMaxSize().padding(top = innerPadding.calculateTopPadding()),
            ) {
                val task = uiState.task
                when {
                    uiState.isLoading -> GuideSkeleton()
                    uiState.error != null -> PazErrorState(message = uiState.error!!, onRetry = viewModel::load)
                    uiState.declined -> DeclinedState(reassigned = uiState.declineReassigned, onBack = viewModel::onBack)
                    task != null ->
                        GuideContent(
                            task = task,
                            isDeclining = uiState.isDeclining,
                            declineError = uiState.declineError,
                            onDecline = viewModel::onDeclineClicked,
                        )
                }
            }
        }
    }
}

@Composable
private fun GuideContent(
    task: LifeGroupTask,
    isDeclining: Boolean,
    declineError: String?,
    onDecline: () -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
    ) {
        item { Text(task.name, style = MaterialTheme.typography.headlineSmall) }

        item {
            PazGlassCard(
                modifier = Modifier.fillMaxWidth().clip(PazShapes.large),
                cornerRadius = PazSpacing.CardRadiusCompact,
            ) {
                Column(
                    Modifier.padding(PazSpacing.Lg),
                    verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
                ) {
                    InfoRow(icon = Icons.Outlined.Groups, label = "Grupo", value = task.lifeGroupName)
                    InfoRow(icon = Icons.Default.CalendarToday, label = "Reunião", value = brDateString(task.meetingDate))
                }
            }
        }

        if (task.description.isNotBlank()) {
            item {
                PazGlassCard(
                    modifier = Modifier.fillMaxWidth().clip(PazShapes.large),
                    cornerRadius = PazSpacing.CardRadiusCompact,
                ) {
                    Column(Modifier.padding(PazSpacing.Lg)) {
                        Text("Sobre a tarefa", style = MaterialTheme.typography.titleSmall)
                        Spacer(Modifier.height(PazSpacing.Sm))
                        Text(
                            task.description,
                            style =
                                MaterialTheme.typography.bodyMedium.copy(
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f),
                                ),
                        )
                    }
                }
            }
        }

        if (task.guidance.isNotBlank()) {
            item {
                PazGlassCard(
                    modifier = Modifier.fillMaxWidth().clip(PazShapes.large),
                    cornerRadius = PazSpacing.CardRadiusCompact,
                ) {
                    Column(Modifier.padding(PazSpacing.Lg)) {
                        Text("Guia", style = MaterialTheme.typography.titleSmall)
                        Spacer(Modifier.height(PazSpacing.Sm))
                        MarkdownText(markdown = task.guidance)
                    }
                }
            }
        }

        item {
            Column(verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
                if (declineError != null) {
                    Text(
                        declineError,
                        style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.error),
                    )
                }
                PazButton(
                    text = "Não posso",
                    onClick = onDecline,
                    variant = PazButtonVariant.Destructive,
                    enabled = !isDeclining,
                    loading = isDeclining,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }

        item { Spacer(Modifier.height(PazSpacing.Xl)) }
    }
}

@Composable
private fun InfoRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String,
) {
    Row(horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md), verticalAlignment = Alignment.Top) {
        Icon(icon, contentDescription = null, tint = PazColors.Primary, modifier = Modifier.size(20.dp).padding(top = 2.dp))
        Column {
            Text(
                label,
                style = MaterialTheme.typography.labelSmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)),
            )
            Text(value, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@Composable
private fun DeclinedState(
    reassigned: Boolean,
    onBack: () -> Unit,
) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
            modifier = Modifier.padding(PazSpacing.Xl),
        ) {
            Text("Tarefa devolvida", style = MaterialTheme.typography.titleMedium)
            Text(
                if (reassigned) {
                    "Tudo certo! Passamos a tarefa para outra pessoa do grupo e avisamos a liderança."
                } else {
                    "Tudo certo! A liderança foi avisada para encontrar outra pessoa."
                },
                style = MaterialTheme.typography.bodyMedium.copy(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)),
            )
            PazButton(text = "Voltar", onClick = onBack, modifier = Modifier.fillMaxWidth())
        }
    }
}

@Composable
private fun GuideSkeleton() {
    Column(Modifier.padding(PazSpacing.Lg), verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg)) {
        PazSkeleton(height = 28.dp, width = 220.dp)
        PazSkeleton(height = 90.dp)
        PazSkeleton(height = 160.dp)
    }
}
