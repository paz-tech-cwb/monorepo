package br.church.paz.android.ui.features.lifegroupdiscovery

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.List
import androidx.compose.material.icons.outlined.Map
import androidx.compose.material.icons.outlined.Sort
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LargeTopAppBar
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.navigation.Screen
import br.church.paz.android.ui.components.PazMeshBackground
import br.church.paz.android.ui.components.PazPullToRefresh
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.features.ministries.LifeGroupCard
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.LifeGroup
import org.koin.androidx.compose.koinViewModel

/**
 * Map/list discovery of life groups, with search, "Com crianças" filter and
 * Nome/Distância sort — mirrors iOS `AllLifeGroupsContentView`.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LifeGroupDiscoveryScreen(
    navController: NavController,
    viewModel: LifeGroupDiscoveryViewModel = koinViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current

    var hasLocationPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) ==
                PackageManager.PERMISSION_GRANTED,
        )
    }
    val locationPermissionLauncher =
        rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            hasLocationPermission = granted
            viewModel.onLocationPermissionResult(granted)
        }
    LaunchedEffect(Unit) {
        if (!hasLocationPermission) {
            locationPermissionLauncher.launch(Manifest.permission.ACCESS_COARSE_LOCATION)
        }
    }

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                LifeGroupDiscoveryEffect.NavigateBack -> navController.popBackStack()
                is LifeGroupDiscoveryEffect.NavigateToLifeGroupDetail ->
                    navController.navigate(Screen.LifeGroupDetail.createRoute(effect.lifeGroupId))
                is LifeGroupDiscoveryEffect.OpenDirections ->
                    openInMaps(context, effect.latitude, effect.longitude, effect.name)
            }
        }
    }

    Box(Modifier.fillMaxSize()) {
        PazMeshBackground()

        Scaffold(
            topBar = {
                LargeTopAppBar(
                    title = { Text("Todos os Life Groups") },
                    navigationIcon = {
                        IconButton(onClick = viewModel::onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, "Voltar")
                        }
                    },
                    actions = {
                        if (uiState.showsMapToggle) {
                            IconButton(onClick = viewModel::onMapToggle) {
                                Icon(
                                    if (uiState.showMap) Icons.Outlined.List else Icons.Outlined.Map,
                                    contentDescription = if (uiState.showMap) "Ver lista" else "Ver mapa",
                                )
                            }
                        }
                    },
                    colors = TopAppBarDefaults.largeTopAppBarColors(containerColor = Color.Transparent),
                )
            },
            containerColor = Color.Transparent,
        ) { innerPadding ->
            Box(Modifier.fillMaxSize().padding(top = innerPadding.calculateTopPadding())) {
                when {
                    uiState.isLoading -> DiscoveryLoadingState()
                    uiState.error != null && !uiState.hasLoadedOnce ->
                        br.church.paz.android.ui.components
                            .PazErrorState(message = uiState.error!!, onRetry = viewModel::onRetry)
                    uiState.showMap ->
                        LifeGroupMapView(
                            lifeGroups = uiState.displayedGroups,
                            hasLocationPermission = hasLocationPermission,
                            modifier = Modifier.fillMaxSize(),
                            onMarkerTap = { viewModel.onLifeGroupTap(it.id.toString()) },
                        )
                    else ->
                        Column(Modifier.fillMaxSize()) {
                            DiscoveryFilterBar(
                                uiState = uiState,
                                onSearchChanged = viewModel::onSearchTextChanged,
                                onSearchCleared = viewModel::onSearchCleared,
                                onKidsOnlyToggled = viewModel::onKidsOnlyToggled,
                                onSortSelected = viewModel::onSortOptionSelected,
                            )
                            when {
                                uiState.error != null -> InlineErrorState(uiState.error!!, viewModel::onRetry)
                                uiState.isSearching -> SearchLoadingState()
                                uiState.lifeGroups.isEmpty() -> DiscoveryEmptyState("Nenhum life group encontrado")
                                uiState.displayedGroups.isEmpty() ->
                                    DiscoveryEmptyState("Nenhum life group encontrado para esse filtro")
                                else ->
                                    PazPullToRefresh(
                                        isRefreshing = false,
                                        onRefresh = viewModel::onRetry,
                                        modifier = Modifier.fillMaxSize(),
                                    ) {
                                        DiscoveryList(
                                            groups = uiState.displayedGroups,
                                            sortOption = uiState.sortOption,
                                            userLocation = uiState.userLocation,
                                            onTap = viewModel::onLifeGroupTap,
                                        )
                                    }
                            }
                        }
                }
            }
        }
    }
}

@Composable
private fun DiscoveryList(
    groups: List<LifeGroup>,
    sortOption: LifeGroupSortOption,
    userLocation: Pair<Double, Double>?,
    onTap: (String) -> Unit,
) {
    val isSortedByDistance = sortOption == LifeGroupSortOption.DISTANCE && userLocation != null
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Sm)) }
        items(groups) { lifeGroup ->
            val distanceKm =
                if (isSortedByDistance) {
                    br.church.paz.shared.domain.model.haversineDistanceKm(
                        userLocation!!.first,
                        userLocation.second,
                        lifeGroup.latitude,
                        lifeGroup.longitude,
                    )
                } else {
                    null
                }
            LifeGroupCard(
                lifeGroup = lifeGroup,
                onClick = { onTap(lifeGroup.id.toString()) },
                distanceKm = distanceKm,
                isSortedByDistance = isSortedByDistance,
            )
        }
        item { Spacer(Modifier.height(PazSpacing.Xl)) }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DiscoveryFilterBar(
    uiState: LifeGroupDiscoveryUiState,
    onSearchChanged: (String) -> Unit,
    onSearchCleared: () -> Unit,
    onKidsOnlyToggled: (Boolean) -> Unit,
    onSortSelected: (LifeGroupSortOption) -> Unit,
) {
    var sortMenuExpanded by remember { mutableStateOf(false) }

    Column(Modifier.padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Sm)) {
        OutlinedTextField(
            value = uiState.searchText,
            onValueChange = onSearchChanged,
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("Buscar por nome ou líder") },
            singleLine = true,
            leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
            trailingIcon = {
                if (uiState.searchText.isNotEmpty()) {
                    IconButton(onClick = onSearchCleared) {
                        Icon(Icons.Filled.Clear, contentDescription = "Limpar busca")
                    }
                }
            },
        )

        Spacer(Modifier.height(PazSpacing.Sm))

        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Com crianças", style = MaterialTheme.typography.labelSmall)
                Switch(checked = uiState.kidsOnly, onCheckedChange = onKidsOnlyToggled)
            }

            Box {
                IconButton(onClick = { sortMenuExpanded = true }) {
                    Icon(Icons.Outlined.Sort, contentDescription = "Ordenar: ${uiState.sortOption.label}")
                }
                DropdownMenu(expanded = sortMenuExpanded, onDismissRequest = { sortMenuExpanded = false }) {
                    uiState.availableSortOptions.forEach { option ->
                        DropdownMenuItem(
                            text = { Text(option.label) },
                            onClick = {
                                onSortSelected(option)
                                sortMenuExpanded = false
                            },
                        )
                    }
                }
            }
        }

        if (!uiState.hasLocation) {
            Text(
                "Ative a localização para ordenar por distância",
                style =
                    MaterialTheme.typography.labelSmall.copy(
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                    ),
            )
        }
    }
}

@Composable
private fun DiscoveryLoadingState() {
    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Sm)) }
        items(4) { PazSkeleton(height = 80.dp) }
    }
}

/**
 * Lightweight in-place indicator for a debounced search reload — unlike
 * [DiscoveryLoadingState], this never replaces the filter bar, so the
 * search field keeps focus and the keyboard stays up while typing.
 */
@Composable
private fun SearchLoadingState() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        androidx.compose.material3.CircularProgressIndicator()
    }
}

/** A search-triggered error renders inline, below the still-mounted filter bar. */
@Composable
private fun InlineErrorState(
    message: String,
    onRetry: () -> Unit,
) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                message,
                style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)),
            )
            Spacer(Modifier.height(PazSpacing.Sm))
            androidx.compose.material3.TextButton(onClick = onRetry) {
                Text("Tentar novamente", color = PazColors.Primary)
            }
        }
    }
}

@Composable
private fun DiscoveryEmptyState(message: String) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text(
            message,
            style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)),
        )
    }
}

private fun openInMaps(
    context: android.content.Context,
    latitude: Double,
    longitude: Double,
    name: String,
) {
    val uri = Uri.parse("geo:$latitude,$longitude?q=$latitude,$longitude(${Uri.encode(name)})")
    context.startActivity(Intent(Intent.ACTION_VIEW, uri))
}
