package br.church.paz.android.ui.features.ministries

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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.outlined.Groups
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.navigation.Screen
import br.church.paz.android.ui.components.PazButton
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.LifeGroup
import br.church.paz.shared.domain.model.Ministry
import org.koin.androidx.compose.koinViewModel
import org.koin.core.parameter.parametersOf

// ── Ministry Detail ──────────────────────────────────────────────────────────

@Composable
fun MinistryDetailScreen(
    navController: NavController,
    ministryId: String,
    viewModel: MinistryDetailViewModel = koinViewModel(parameters = { parametersOf(ministryId) }),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.effect.collect {
            when (it) {
                MinistryDetailEffect.NavigateBack -> navController.popBackStack()
            }
        }
    }

    DetailScaffold(
        title = uiState.ministry?.name ?: "Ministério",
        isLoading = uiState.isLoading,
        error = uiState.error,
        onBack = viewModel::onBack,
    ) {
        uiState.ministry?.let { MinistryContent(ministry = it) }
    }
}

@Composable
private fun MinistryContent(ministry: Ministry) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding =
            androidx.compose.foundation.layout
                .PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Lg)) }

        item {
            Box(
                modifier =
                    Modifier
                        .size(72.dp)
                        .clip(PazShapes.large)
                        .background(PazColors.Primary.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Outlined.Groups, contentDescription = null, tint = PazColors.Primary, modifier = Modifier.size(36.dp))
            }
        }

        item {
            Text(ministry.name, style = MaterialTheme.typography.headlineSmall)
        }

        if (!ministry.description.isNullOrEmpty()) {
            item {
                Column(
                    Modifier
                        .fillMaxWidth()
                        .clip(PazShapes.large)
                        .background(MaterialTheme.colorScheme.surface)
                        .padding(PazSpacing.Lg),
                ) {
                    Text("Sobre", style = MaterialTheme.typography.titleSmall)
                    Spacer(Modifier.height(PazSpacing.Sm))
                    Text(
                        ministry.description!!,
                        style =
                            MaterialTheme.typography.bodySmall.copy(
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                            ),
                    )
                }
            }
        }

        item { Spacer(Modifier.height(PazSpacing.Xl)) }
    }
}

// ── Life Group Detail ────────────────────────────────────────────────────────

@Composable
fun LifeGroupDetailScreen(
    navController: NavController,
    lifeGroupId: String,
    viewModel: LifeGroupDetailViewModel = koinViewModel(parameters = { parametersOf(lifeGroupId) }),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                LifeGroupDetailEffect.NavigateBack -> navController.popBackStack()
                LifeGroupDetailEffect.NavigateToMeetingReport ->
                    navController.navigate(Screen.MeetingReport.route)
            }
        }
    }

    DetailScaffold(
        title = uiState.lifeGroup?.name ?: "Grupo de Vida",
        isLoading = uiState.isLoading,
        error = uiState.error,
        onBack = viewModel::onBack,
    ) {
        uiState.lifeGroup?.let { LifeGroupContent(lifeGroup = it, onMeetingReport = viewModel::onMeetingReport) }
    }
}

@Composable
private fun LifeGroupContent(
    lifeGroup: LifeGroup,
    onMeetingReport: () -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding =
            androidx.compose.foundation.layout
                .PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Lg)) }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(PazSpacing.Lg), verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier =
                        Modifier
                            .size(72.dp)
                            .clip(PazShapes.large)
                            .background(PazColors.Primary.copy(alpha = 0.12f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Default.Person, contentDescription = null, tint = PazColors.Primary, modifier = Modifier.size(36.dp))
                }
                Column {
                    Text(lifeGroup.name, style = MaterialTheme.typography.headlineSmall)
                    Spacer(Modifier.height(PazSpacing.Xs))
                    Box(
                        Modifier
                            .clip(
                                androidx.compose.foundation.shape
                                    .RoundedCornerShape(20.dp),
                            ).background(PazColors.Primary.copy(alpha = 0.12f))
                            .padding(horizontal = 10.dp, vertical = 4.dp),
                    ) {
                        Text(
                            "${lifeGroup.membersCount} membros",
                            style = MaterialTheme.typography.labelSmall.copy(color = PazColors.Primary),
                        )
                    }
                }
            }
        }

        item {
            Column(
                Modifier
                    .fillMaxWidth()
                    .clip(PazShapes.large)
                    .background(MaterialTheme.colorScheme.surface)
                    .padding(PazSpacing.Lg),
                verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
            ) {
                lifeGroup.leader?.let {
                    InfoRow(icon = Icons.Default.Person, label = "Líder", value = it)
                }
                if (!lifeGroup.meetingDay.isNullOrEmpty() || !lifeGroup.meetingTime.isNullOrEmpty()) {
                    InfoRow(
                        icon = Icons.Default.CalendarToday,
                        label = "Reunião",
                        value =
                            buildString {
                                lifeGroup.meetingDay?.let { append(it) }
                                if (!lifeGroup.meetingDay.isNullOrEmpty() && !lifeGroup.meetingTime.isNullOrEmpty()) append(" às ")
                                lifeGroup.meetingTime?.let { append(it) }
                            },
                    )
                }
                lifeGroup.address?.let {
                    InfoRow(icon = Icons.Default.LocationOn, label = "Endereço", value = it)
                }
            }
        }

        item {
            PazButton(
                text = "Relatório de Reunião",
                onClick = onMeetingReport,
                modifier = Modifier.fillMaxWidth(),
            )
        }

        item { Spacer(Modifier.height(PazSpacing.Xl)) }
    }
}

@Composable
private fun InfoRow(
    icon: ImageVector,
    label: String,
    value: String,
) {
    Row(horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md), verticalAlignment = Alignment.Top) {
        Icon(icon, contentDescription = null, tint = PazColors.Primary, modifier = Modifier.size(20.dp).padding(top = 2.dp))
        Column {
            Text(label, style = MaterialTheme.typography.labelSmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)))
            Text(value, style = MaterialTheme.typography.bodySmall)
        }
    }
}

// ── Shared scaffold ──────────────────────────────────────────────────────────

@Composable
private fun DetailScaffold(
    title: String,
    isLoading: Boolean,
    error: String?,
    onBack: () -> Unit,
    content: @Composable () -> Unit,
) {
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
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, "back", tint = Color.White)
                }
                Text(
                    title,
                    style = MaterialTheme.typography.headlineMedium.copy(color = Color.White),
                    modifier = Modifier.weight(1f),
                    maxLines = 1,
                )
            }
        }

        Box(
            Modifier
                .fillMaxSize()
                .clip(
                    androidx.compose.foundation.shape
                        .RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
                ).background(MaterialTheme.colorScheme.background),
        ) {
            when {
                isLoading ->
                    Column(Modifier.padding(PazSpacing.Lg), verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg)) {
                        Spacer(Modifier.height(PazSpacing.Lg))
                        PazSkeleton(height = 72.dp, width = 72.dp)
                        PazSkeleton(height = 28.dp, width = 200.dp)
                        PazSkeleton(height = 120.dp)
                    }
                error != null ->
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(
                            error,
                            style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)),
                        )
                    }
                else -> content()
            }
        }
    }
}
