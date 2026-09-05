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
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
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

@Composable
fun MinistriesScreen(
    navController: NavController,
    viewModel: MinistriesViewModel = koinViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                MinistriesEffect.NavigateBack -> navController.popBackStack()
                is MinistriesEffect.NavigateToMinistryDetail ->
                    navController.navigate(Screen.MinistryDetail.createRoute(effect.ministryId))
                is MinistriesEffect.NavigateToLifeGroupDetail ->
                    navController.navigate(Screen.LifeGroupDetail.createRoute(effect.lifeGroupId))
            }
        }
    }

    Column(Modifier.fillMaxSize()) {
        // Hero header
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
                    "Ministérios & Grupos",
                    style = MaterialTheme.typography.headlineMedium.copy(color = Color.White),
                    modifier = Modifier.weight(1f),
                )
            }
        }

        // Tab selector
        TabRow(
            selectedTabIndex = uiState.selectedTab.ordinal,
            containerColor = MaterialTheme.colorScheme.surface,
            contentColor = PazColors.Primary,
        ) {
            Tab(
                selected = uiState.selectedTab == MinistriesTab.Ministries,
                onClick = { viewModel.onTabSelected(MinistriesTab.Ministries) },
                text = { Text("Ministérios") },
            )
            Tab(
                selected = uiState.selectedTab == MinistriesTab.LifeGroups,
                onClick = { viewModel.onTabSelected(MinistriesTab.LifeGroups) },
                text = { Text("Grupos de Vida") },
            )
        }

        Box(
            Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background),
        ) {
            when {
                uiState.isLoading -> LoadingState()
                uiState.error != null && uiState.ministries.isEmpty() && uiState.lifeGroups.isEmpty() ->
                    ErrorState(error = uiState.error!!, onRetry = viewModel::onRetry)
                uiState.selectedTab == MinistriesTab.Ministries ->
                    MinistriesTab(
                        ministries = uiState.ministries,
                        onTap = viewModel::onMinistryTap,
                    )
                else ->
                    LifeGroupsTab(
                        lifeGroups = uiState.lifeGroups,
                        onTap = viewModel::onLifeGroupTap,
                    )
            }
        }
    }
}

@Composable
private fun MinistriesTab(
    ministries: List<Ministry>,
    onTap: (String) -> Unit,
) {
    if (ministries.isEmpty()) {
        EmptyState(message = "Nenhum ministério encontrado")
        return
    }
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding =
            androidx.compose.foundation.layout
                .PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Sm)) }
        items(ministries) { ministry ->
            MinistryCard(ministry = ministry, onClick = { onTap(ministry.id) })
        }
        item { Spacer(Modifier.height(PazSpacing.Xl)) }
    }
}

@Composable
private fun LifeGroupsTab(
    lifeGroups: List<LifeGroup>,
    onTap: (String) -> Unit,
) {
    if (lifeGroups.isEmpty()) {
        EmptyState(message = "Nenhum grupo de vida encontrado")
        return
    }
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding =
            androidx.compose.foundation.layout
                .PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Sm)) }
        items(lifeGroups) { lifeGroup ->
            LifeGroupCard(lifeGroup = lifeGroup, onClick = { onTap(lifeGroup.id) })
        }
        item { Spacer(Modifier.height(PazSpacing.Xl)) }
    }
}

@Composable
private fun MinistryCard(
    ministry: Ministry,
    onClick: () -> Unit,
) {
    androidx.compose.material3.Surface(
        onClick = onClick,
        shape = PazShapes.large,
        color = MaterialTheme.colorScheme.surface,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            Modifier.padding(PazSpacing.Lg),
            horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                Modifier
                    .size(48.dp)
                    .clip(PazShapes.large)
                    .background(PazColors.Primary.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Outlined.Groups,
                    contentDescription = null,
                    tint = PazColors.Primary,
                )
            }
            Column(Modifier.weight(1f)) {
                Text(ministry.name, style = MaterialTheme.typography.titleSmall)
                if (!ministry.description.isNullOrEmpty()) {
                    Spacer(Modifier.height(PazSpacing.Xs))
                    Text(
                        ministry.description!!,
                        style =
                            MaterialTheme.typography.bodySmall.copy(
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                            ),
                        maxLines = 2,
                    )
                }
            }
        }
    }
}

@Composable
private fun LifeGroupCard(
    lifeGroup: LifeGroup,
    onClick: () -> Unit,
) {
    androidx.compose.material3.Surface(
        onClick = onClick,
        shape = PazShapes.large,
        color = MaterialTheme.colorScheme.surface,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(PazSpacing.Lg)) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    Modifier
                        .size(48.dp)
                        .clip(PazShapes.large)
                        .background(PazColors.Primary.copy(alpha = 0.1f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        Icons.Outlined.Person,
                        contentDescription = null,
                        tint = PazColors.Primary,
                    )
                }
                Column(Modifier.weight(1f)) {
                    Text(lifeGroup.name, style = MaterialTheme.typography.titleSmall)
                    if (!lifeGroup.leader.isNullOrEmpty()) {
                        Spacer(Modifier.height(PazSpacing.Xs))
                        Text(
                            "Líder: ${lifeGroup.leader}",
                            style =
                                MaterialTheme.typography.bodySmall.copy(
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                                ),
                        )
                    }
                }
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

            if (!lifeGroup.meetingDay.isNullOrEmpty() || !lifeGroup.meetingTime.isNullOrEmpty()) {
                Spacer(Modifier.height(PazSpacing.Md))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(PazSpacing.Sm),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        buildString {
                            lifeGroup.meetingDay?.let { append(it) }
                            if (!lifeGroup.meetingDay.isNullOrEmpty() && !lifeGroup.meetingTime.isNullOrEmpty()) append(" • ")
                            lifeGroup.meetingTime?.let { append(it) }
                        },
                        style =
                            MaterialTheme.typography.labelSmall.copy(
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                            ),
                    )
                }
            }

            if (lifeGroup.address != null) {
                Spacer(Modifier.height(PazSpacing.Xs))
                Text(
                    lifeGroup.address!!.fullAddress,
                    style =
                        MaterialTheme.typography.bodySmall.copy(
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                        ),
                    maxLines = 1,
                )
            }
        }
    }
}

@Composable
private fun EmptyState(message: String) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text(
            message,
            style =
                MaterialTheme.typography.bodySmall.copy(
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                ),
        )
    }
}

@Composable
private fun ErrorState(
    error: String,
    onRetry: () -> Unit,
) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            Modifier.padding(PazSpacing.Xl),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
        ) {
            Text(error, style = MaterialTheme.typography.bodySmall)
            Spacer(Modifier.height(PazSpacing.Lg))
            PazButton(text = "Tentar Novamente", onClick = onRetry, modifier = Modifier.fillMaxWidth())
        }
    }
}

@Composable
private fun LoadingState() {
    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding =
            androidx.compose.foundation.layout
                .PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Sm)) }
        items(4) {
            PazSkeleton(height = 80.dp)
        }
    }
}
