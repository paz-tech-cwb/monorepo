package br.church.paz.android.ui.features.lifegroupdiscovery

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import com.google.android.gms.location.CurrentLocationRequest
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import kotlinx.coroutines.tasks.await

/**
 * Thin wrapper around `FusedLocationProviderClient` — used to power
 * distance-based sorting on the Life Group Discovery screen. Mirrors iOS
 * `LocationProvider`: degrades silently (returns `null`) when permission
 * isn't granted or location can't be resolved, rather than crashing or
 * blocking the UI. Callers must treat "no coordinate" as a valid, expected
 * state (e.g. hide "Distância" sort instead of reordering with it).
 */
class LocationProvider(
    private val context: Context,
) {
    fun hasLocationPermission(): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED

    /**
     * One-shot coordinate fetch. Returns `null` on missing permission, no
     * fix available, or any provider error — this is a best-effort feature,
     * never a hard requirement for the screen to function.
     */
    suspend fun getCurrentLocation(): Pair<Double, Double>? {
        if (!hasLocationPermission()) return null
        return runCatching {
            val client = LocationServices.getFusedLocationProviderClient(context)
            val request =
                CurrentLocationRequest
                    .Builder()
                    .setPriority(Priority.PRIORITY_BALANCED_POWER_ACCURACY)
                    .build()
            val location = client.getCurrentLocation(request, null).await()
            location?.let { it.latitude to it.longitude }
        }.getOrNull()
    }
}
