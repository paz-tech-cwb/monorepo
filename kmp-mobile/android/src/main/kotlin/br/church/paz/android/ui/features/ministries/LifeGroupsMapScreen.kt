package br.church.paz.android.ui.features.ministries

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.filled.Directions
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LargeTopAppBar
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Scaffold
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.navigation.Screen
import br.church.paz.android.ui.components.PazErrorState
import br.church.paz.android.ui.components.PazMeshBackground
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.LifeGroup
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.MapProperties
import com.google.maps.android.compose.MapUiSettings
import com.google.maps.android.compose.Marker
import com.google.maps.android.compose.rememberCameraPositionState
import com.google.maps.android.compose.rememberMarkerState
import org.koin.androidx.compose.koinViewModel

/**
 * Map-based discovery view for life groups — the primary way a member finds
 * a group to join. Mirrors iOS `LifeGroupsMapView`: pins for every group with
 * a `latitude`/`longitude`, tapping a pin opens a "Como chegar / Ver
 * detalhes" action sheet.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LifeGroupsMapScreen(
    navController: NavController,
    viewModel: LifeGroupsMapViewModel = koinViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    var hasLocationPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
                PackageManager.PERMISSION_GRANTED,
        )
    }
    val locationPermissionLauncher =
        rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            hasLocationPermission = granted
        }
    LaunchedEffect(Unit) {
        if (!hasLocationPermission) {
            locationPermissionLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
        }
    }

    var selectedGroup by remember { mutableStateOf<LifeGroup?>(null) }

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                LifeGroupsMapEffect.NavigateBack -> navController.popBackStack()
                is LifeGroupsMapEffect.NavigateToLifeGroupDetail ->
                    navController.navigate(Screen.LifeGroupDetail.createRoute(effect.lifeGroupId))
                is LifeGroupsMapEffect.OpenDirections -> openInMaps(context, effect.latitude, effect.longitude, effect.name)
            }
        }
    }

    Box(Modifier.fillMaxSize()) {
        PazMeshBackground()

        Scaffold(
            topBar = {
                LargeTopAppBar(
                    title = { Text("Mapa") },
                    navigationIcon = {
                        IconButton(onClick = { viewModel.onBack() }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, "back")
                        }
                    },
                    colors = TopAppBarDefaults.largeTopAppBarColors(containerColor = Color.Transparent),
                )
            },
            containerColor = Color.Transparent,
        ) { innerPadding ->
            Box(Modifier.fillMaxSize().padding(top = innerPadding.calculateTopPadding())) {
                when {
                    uiState.isLoading ->
                        Column(Modifier.padding(PazSpacing.Lg)) {
                            PazSkeleton(height = 480.dp)
                        }
                    uiState.error != null -> PazErrorState(message = uiState.error!!, onRetry = viewModel::onRetry)
                    uiState.groupsWithLocation.isEmpty() ->
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text(
                                "Nenhum grupo com localização cadastrada ainda.",
                                style =
                                    MaterialTheme.typography.bodySmall.copy(
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                                    ),
                                modifier = Modifier.padding(horizontal = PazSpacing.Xl),
                            )
                        }
                    else ->
                        LifeGroupsMapContent(
                            groups = uiState.groupsWithLocation,
                            hasLocationPermission = hasLocationPermission,
                            onMarkerTap = { selectedGroup = it },
                        )
                }
            }
        }

        selectedGroup?.let { group ->
            LifeGroupMarkerActionSheet(
                lifeGroup = group,
                onDismiss = { selectedGroup = null },
                onDirections = {
                    selectedGroup = null
                    viewModel.onDirectionsTap(group.latitude!!, group.longitude!!, group.name)
                },
                onDetails = {
                    selectedGroup = null
                    viewModel.onDetailsTap(group.id.toString())
                },
            )
        }
    }
}

@Composable
private fun LifeGroupsMapContent(
    groups: List<LifeGroup>,
    hasLocationPermission: Boolean,
    onMarkerTap: (LifeGroup) -> Unit,
) {
    val firstGroup = groups.first()
    val cameraPositionState =
        rememberCameraPositionState {
            position = CameraPosition.fromLatLngZoom(LatLng(firstGroup.latitude!!, firstGroup.longitude!!), 11f)
        }

    GoogleMap(
        modifier = Modifier.fillMaxSize(),
        cameraPositionState = cameraPositionState,
        properties = MapProperties(isMyLocationEnabled = hasLocationPermission),
        uiSettings = MapUiSettings(myLocationButtonEnabled = hasLocationPermission, zoomControlsEnabled = false),
    ) {
        groups.forEach { group ->
            Marker(
                state = rememberMarkerState(position = LatLng(group.latitude!!, group.longitude!!)),
                title = group.name,
                snippet = group.location,
                onClick = {
                    onMarkerTap(group)
                    true
                },
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LifeGroupMarkerActionSheet(
    lifeGroup: LifeGroup,
    onDismiss: () -> Unit,
    onDirections: () -> Unit,
    onDetails: () -> Unit,
) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(Modifier.fillMaxWidth().padding(horizontal = PazSpacing.Lg)) {
            Text(lifeGroup.name, style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(PazSpacing.Md))

            MarkerActionRow(icon = Icons.Default.Directions, label = "Como chegar", onClick = onDirections)
            MarkerActionRow(icon = Icons.AutoMirrored.Outlined.KeyboardArrowRight, label = "Ver detalhes", onClick = onDetails)

            Spacer(Modifier.height(PazSpacing.Xl))
        }
    }
}

@Composable
private fun MarkerActionRow(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
) {
    Row(
        modifier =
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .clickable(onClick = onClick)
                .padding(vertical = PazSpacing.Md),
        horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = null, tint = PazColors.Primary)
        Text(label, style = MaterialTheme.typography.titleSmall)
    }
}

private fun openInMaps(
    context: android.content.Context,
    latitude: Double,
    longitude: Double,
    name: String,
) {
    val uri = Uri.parse("geo:$latitude,$longitude?q=$latitude,$longitude(${Uri.encode(name)})")
    val intent = Intent(Intent.ACTION_VIEW, uri)
    runCatching { context.startActivity(intent) }
}
