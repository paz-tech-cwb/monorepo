package br.church.paz.android.ui.features.lifegroupdiscovery

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.FilterAlt
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.FilterAlt
import androidx.compose.material.icons.outlined.List
import androidx.compose.material.icons.outlined.Map
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
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
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
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
                            // "Com crianças" filter + sort, relocated next to the
                            // map toggle rather than living in the (now
                            // scroll-collapsible) search header.
                            FilterSortMenu(
                                uiState = uiState,
                                onKidsOnlyToggled = viewModel::onKidsOnlyToggled,
                                onSortSelected = viewModel::onSortOptionSelected,
                            )
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
                    else -> {
                        val listState = rememberLazyListState()
                        // The search field stays mounted at all times (never
                        // conditionally removed, per plan) — only its
                        // wrapping container's height animates on scroll, so a
                        // debounced search reload never loses keyboard focus.
                        // Dead band between the show/hide thresholds avoids flicker when the
                        // scroll offset hovers right around a single bare cutoff.
                        var isSearchBarVisible by remember { mutableStateOf(true) }
                        LaunchedEffect(listState) {
                            snapshotFlow {
                                if (listState.firstVisibleItemIndex == 0) {
                                    listState.firstVisibleItemScrollOffset
                                } else {
                                    Int.MAX_VALUE
                                }
                            }.collect { offset ->
                                isSearchBarVisible =
                                    when {
                                        offset < 8 -> true
                                        offset > 24 -> false
                                        else -> isSearchBarVisible
                                    }
                            }
                        }

                        Column(Modifier.fillMaxSize()) {
                            CollapsingSearchHeader(
                                uiState = uiState,
                                isVisible = isSearchBarVisible,
                                onSearchChanged = viewModel::onSearchTextChanged,
                                onSearchCleared = viewModel::onSearchCleared,
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
                                            listState = listState,
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
}

@Composable
private fun DiscoveryList(
    groups: List<LifeGroup>,
    sortOption: LifeGroupSortOption,
    userLocation: Pair<Double, Double>?,
    listState: LazyListState,
    onTap: (String) -> Unit,
) {
    val isSortedByDistance = sortOption == LifeGroupSortOption.DISTANCE && userLocation != null
    LazyColumn(
        state = listState,
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

/**
 * Search field + the `hasLocation` hint — the "Com crianças" filter and sort
 * control now live in the top app bar next to the map toggle (see
 * [FilterSortMenu]). The search field itself is always composed (never
 * conditionally removed); only the wrapping [Box]'s height is animated based
 * on [isVisible], so a debounced search reload never loses keyboard focus.
 */
@Composable
private fun CollapsingSearchHeader(
    uiState: LifeGroupDiscoveryUiState,
    isVisible: Boolean,
    onSearchChanged: (String) -> Unit,
    onSearchCleared: () -> Unit,
) {
    var naturalHeightPx by remember { mutableStateOf(0) }
    val density = LocalDensity.current
    val targetHeight = if (isVisible) with(density) { naturalHeightPx.toDp() } else 0.dp
    val animatedHeight by animateDpAsState(targetValue = targetHeight, animationSpec = tween(200), label = "searchHeader")

    Box(
        Modifier
            .fillMaxWidth()
            .heightIn(max = animatedHeight)
            .clipToBounds(),
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .wrapContentHeight(unbounded = true)
                .padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Sm)
                .onGloballyPositioned { naturalHeightPx = it.size.height },
        ) {
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

            if (!uiState.hasLocation) {
                Spacer(Modifier.height(PazSpacing.Xs))
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
}

/** "Com crianças" filter + sort, hosted as a top app bar action next to the map toggle. */
@Composable
private fun FilterSortMenu(
    uiState: LifeGroupDiscoveryUiState,
    onKidsOnlyToggled: (Boolean) -> Unit,
    onSortSelected: (LifeGroupSortOption) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }

    Box {
        IconButton(onClick = { expanded = true }) {
            Icon(
                if (uiState.kidsOnly) Icons.Filled.FilterAlt else Icons.Outlined.FilterAlt,
                contentDescription = "Filtrar e ordenar",
            )
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = PazSpacing.Md, vertical = PazSpacing.Xs),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Com crianças", style = MaterialTheme.typography.labelSmall)
                Switch(checked = uiState.kidsOnly, onCheckedChange = onKidsOnlyToggled)
            }
            HorizontalDivider()
            uiState.availableSortOptions.forEach { option ->
                DropdownMenuItem(
                    text = { Text(option.label) },
                    onClick = {
                        onSortSelected(option)
                        expanded = false
                    },
                )
            }
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
