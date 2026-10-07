package br.church.paz.android.ui.features.ministries

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Map
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LargeTopAppBar
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.navigation.Screen
import br.church.paz.android.ui.components.PazErrorState
import br.church.paz.android.ui.components.PazMeshBackground
import br.church.paz.android.ui.components.PazPullToRefresh
import br.church.paz.android.ui.theme.PazSpacing
import org.koin.androidx.compose.koinViewModel

/**
 * Unfiltered, church-wide life groups list. Reached either as the fallback
 * when the viewer has no group of their own, or via "Ver mais life groups"
 * from [LifeGroupsScreen] — mirrors iOS `AllLifeGroupsContentView`.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AllLifeGroupsScreen(
    navController: NavController,
    viewModel: AllLifeGroupsViewModel = koinViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                AllLifeGroupsEffect.NavigateBack -> navController.popBackStack()
                is AllLifeGroupsEffect.NavigateToLifeGroupDetail ->
                    navController.navigate(Screen.LifeGroupDetail.createRoute(effect.lifeGroupId))
                AllLifeGroupsEffect.NavigateToMap ->
                    navController.navigate(Screen.LifeGroupsMap.route)
            }
        }
    }

    val showsMapToggle = !uiState.isLoading && uiState.error == null && uiState.lifeGroups.isNotEmpty()

    Box(Modifier.fillMaxSize()) {
        PazMeshBackground()

        Scaffold(
            topBar = {
                LargeTopAppBar(
                    title = { Text("Todos os Life Groups") },
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
                    else ->
                        AllStyleLifeGroupsList(
                            lifeGroups = uiState.lifeGroups,
                            onTap = viewModel::onLifeGroupTap,
                        )
                }
            }
        }
    }
}

/**
 * Unfiltered-style list rendering (no "Ver mais" row) — shared by [AllLifeGroupsScreen]
 * and [LifeGroupsScreen] when the latter falls back to the church-wide list.
 */
@Composable
fun AllStyleLifeGroupsList(
    lifeGroups: List<br.church.paz.shared.domain.model.LifeGroup>,
    onTap: (String) -> Unit,
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
        item { Spacer(Modifier.height(PazSpacing.Xl)) }
    }
}
