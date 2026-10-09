package br.church.paz.android.ui.features.lifegroupdiscovery

import android.preference.PreferenceManager
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import br.church.paz.shared.domain.model.LifeGroup
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.mylocation.GpsMyLocationProvider
import org.osmdroid.views.overlay.mylocation.MyLocationNewOverlay

/**
 * OpenStreetMap-tiled map for the Life Group Discovery screen (osmdroid —
 * no API key/billing, unlike the existing Google Maps-based
 * `LifeGroupsMapScreen`). osmdroid is a classic View-based library, hosted
 * inside Compose via `AndroidView`, same pattern as
 * `GatedYouTubePlayer`/`YouTubeWebView` hosting a `WebView`.
 */
@Composable
fun LifeGroupMapView(
    lifeGroups: List<LifeGroup>,
    hasLocationPermission: Boolean,
    modifier: Modifier = Modifier,
    onMarkerTap: (LifeGroup) -> Unit,
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val groupsWithLocation = remember(lifeGroups) { lifeGroups.filter { it.latitude != null && it.longitude != null } }
    val mapViewRef = remember { mutableStateOf<MapView?>(null) }
    val myLocationOverlayRef = remember { mutableStateOf<MyLocationNewOverlay?>(null) }
    var hasCenteredOnce by remember { mutableStateOf(false) }

    DisposableEffect(Unit) {
        Configuration.getInstance().load(context, PreferenceManager.getDefaultSharedPreferences(context))
        Configuration.getInstance().userAgentValue = context.packageName
        onDispose {
            myLocationOverlayRef.value?.disableMyLocation()
            mapViewRef.value?.onDetach()
        }
    }

    DisposableEffect(lifecycleOwner) {
        val observer =
            LifecycleEventObserver { _, event ->
                when (event) {
                    Lifecycle.Event.ON_RESUME -> mapViewRef.value?.onResume()
                    Lifecycle.Event.ON_PAUSE -> mapViewRef.value?.onPause()
                    else -> Unit
                }
            }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    AndroidView(
        modifier = modifier.fillMaxSize(),
        factory = { ctx ->
            MapView(ctx)
                .apply {
                    setTileSource(TileSourceFactory.MAPNIK)
                    setMultiTouchControls(true)
                    controller.setZoom(11.0)
                }.also { mapViewRef.value = it }
        },
        update = { mapView ->
            mapView.overlays.clear()

            if (hasLocationPermission) {
                val myLocationOverlay =
                    myLocationOverlayRef.value ?: MyLocationNewOverlay(GpsMyLocationProvider(context), mapView)
                        .also { overlay ->
                            overlay.enableMyLocation()
                            myLocationOverlayRef.value = overlay
                        }
                mapView.overlays.add(myLocationOverlay)
            } else {
                myLocationOverlayRef.value?.disableMyLocation()
                myLocationOverlayRef.value = null
            }

            groupsWithLocation.forEach { group ->
                val marker =
                    Marker(mapView).apply {
                        position = GeoPoint(group.latitude!!, group.longitude!!)
                        title = group.name
                        snippet = group.location
                        setOnMarkerClickListener { _, _ ->
                            onMarkerTap(group)
                            true
                        }
                    }
                mapView.overlays.add(marker)
            }

            if (!hasCenteredOnce) {
                val firstPoint = groupsWithLocation.firstOrNull()
                if (firstPoint != null) {
                    mapView.controller.setCenter(GeoPoint(firstPoint.latitude!!, firstPoint.longitude!!))
                    hasCenteredOnce = true
                }
            }
            mapView.invalidate()
        },
    )
}
