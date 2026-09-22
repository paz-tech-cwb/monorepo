package br.church.paz.android.ui.features.ministries

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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.outlined.GridView
import androidx.compose.material.icons.outlined.Map
import androidx.compose.material.icons.outlined.Person
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
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.navigation.Screen
import br.church.paz.android.ui.components.PazErrorState
import br.church.paz.android.ui.components.PazGlassCard
import br.church.paz.android.ui.components.PazMeshBackground
import br.church.paz.android.ui.components.PazPullToRefresh
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.LifeGroup
import org.koin.androidx.compose.koinViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LifeGroupsScreen(
    navController: NavController,
    viewModel: LifeGroupsViewModel = koinViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                LifeGroupsEffect.NavigateBack -> navController.popBackStack()
                is LifeGroupsEffect.NavigateToLifeGroupDetail ->
                    navController.navigate(Screen.LifeGroupDetail.createRoute(effect.lifeGroupId))
                LifeGroupsEffect.NavigateToAllLifeGroups ->
                    navController.navigate(Screen.AllLifeGroups.route)
                LifeGroupsEffect.NavigateToMap ->
                    navController.navigate(Screen.LifeGroupsMap.route)
            }
        }
    }

    val showsMapToggle =
        uiState.isFallbackToAll && !uiState.isLoading && uiState.error == null && uiState.lifeGroups.isNotEmpty()

    Box(Modifier.fillMaxSize()) {
        PazMeshBackground()

        Scaffold(
            topBar = {
                LargeTopAppBar(
                    title = { Text(if (uiState.isFallbackToAll) "Todos os Life Groups" else "Life Groups") },
                    navigationIcon = {
                        IconButton(onClick = { viewModel.onBack() }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, "back")
                        }
                    },
                    actions = {
                        if (showsMapToggle) {
                            IconButton(onClick = { viewModel.onMapToggle() }) {
                                Icon(Icons.Outlined.Map, contentDescription = "Ver mapa")
                            }
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
                    uiState.isLoading -> LifeGroupsLoadingState()
                    uiState.error != null -> PazErrorState(message = uiState.error!!, onRetry = viewModel::onRetry)
                    uiState.lifeGroups.isEmpty() -> LifeGroupsEmptyState(message = "Nenhum life group encontrado")
                    uiState.isFallbackToAll ->
                        AllStyleLifeGroupsList(
                            lifeGroups = uiState.lifeGroups,
                            onTap = viewModel::onLifeGroupTap,
                        )
                    else ->
                        MyLifeGroupsContent(
                            lifeGroups = uiState.lifeGroups,
                            onTap = viewModel::onLifeGroupTap,
                            onSeeAllTap = viewModel::onSeeAllTap,
                        )
                }
            }
        }
    }
}

@Composable
private fun MyLifeGroupsContent(
    lifeGroups: List<LifeGroup>,
    onTap: (String) -> Unit,
    onSeeAllTap: () -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Sm)) }
        items(lifeGroups) { lifeGroup ->
            LifeGroupCard(lifeGroup = lifeGroup, onClick = { onTap(lifeGroup.id.toString()) })
        }
        item {
            PazGlassCard(modifier = Modifier.fillMaxWidth().clip(PazShapes.large).clickable(onClick = onSeeAllTap)) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(PazSpacing.Lg),
                    horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Outlined.GridView, contentDescription = null, tint = PazColors.Primary)
                    Text("Ver mais life groups", style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
                    Icon(
                        Icons.AutoMirrored.Outlined.KeyboardArrowRight,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
                    )
                }
            }
        }
        item { Spacer(Modifier.height(PazSpacing.Xl)) }
    }
}

/** Shared card — reused by [LifeGroupsScreen] and `AllLifeGroupsScreen`. */
@Composable
fun LifeGroupCard(
    lifeGroup: LifeGroup,
    onClick: () -> Unit,
) {
    PazGlassCard(modifier = Modifier.fillMaxWidth().clip(PazShapes.large).clickable(onClick = onClick)) {
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
                    Icon(Icons.Outlined.Person, contentDescription = null, tint = PazColors.Primary)
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
                Column(horizontalAlignment = Alignment.End) {
                    Box(
                        Modifier
                            .clip(RoundedCornerShape(20.dp))
                            .background(PazColors.Primary.copy(alpha = 0.12f))
                            .padding(horizontal = 10.dp, vertical = 4.dp),
                    ) {
                        Text(
                            "${lifeGroup.membersCount} membros",
                            style = MaterialTheme.typography.labelSmall.copy(color = PazColors.Primary),
                        )
                    }
                    if (lifeGroup.kidsCount > 0) {
                        Spacer(Modifier.height(PazSpacing.Xs))
                        Text(
                            "${lifeGroup.kidsCount} crianças",
                            style =
                                MaterialTheme.typography.labelSmall.copy(
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                                ),
                        )
                    }
                }
            }

            if (!lifeGroup.meetingDay.isNullOrEmpty() || !lifeGroup.meetingTime.isNullOrEmpty()) {
                Spacer(Modifier.height(PazSpacing.Md))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(PazSpacing.Sm),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.Default.CalendarToday,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                        modifier = Modifier.size(14.dp),
                    )
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

            if (!lifeGroup.location.isNullOrEmpty()) {
                Spacer(Modifier.height(PazSpacing.Xs))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(PazSpacing.Sm),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                        modifier = Modifier.size(14.dp),
                    )
                    Text(
                        lifeGroup.location!!,
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
}

@Composable
fun LifeGroupsEmptyState(message: String) {
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
fun LifeGroupsLoadingState() {
    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Sm)) }
        items(4) {
            PazSkeleton(height = 80.dp)
        }
    }
}
