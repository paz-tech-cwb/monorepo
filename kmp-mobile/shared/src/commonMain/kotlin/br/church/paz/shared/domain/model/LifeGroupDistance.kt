package br.church.paz.shared.domain.model

import kotlin.math.PI
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

private const val EARTH_RADIUS_KM = 6371.0

private fun Double.toRadians(): Double = this * PI / 180.0

/**
 * Great-circle distance in kilometers between two coordinate pairs, using
 * the Haversine formula. Returns `null` when either coordinate is missing
 * (e.g. a [LifeGroup] whose address failed to geocode) — callers must treat
 * "unknown distance" distinctly from "zero distance" rather than silently
 * sorting it to either end of a distance-based list.
 */
fun haversineDistanceKm(
    lat1: Double?,
    lon1: Double?,
    lat2: Double?,
    lon2: Double?,
): Double? {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null

    val dLat = (lat2 - lat1).toRadians()
    val dLon = (lon2 - lon1).toRadians()
    val radLat1 = lat1.toRadians()
    val radLat2 = lat2.toRadians()

    val a = sin(dLat / 2) * sin(dLat / 2) +
        cos(radLat1) * cos(radLat2) * sin(dLon / 2) * sin(dLon / 2)
    val c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return EARTH_RADIUS_KM * c
}
