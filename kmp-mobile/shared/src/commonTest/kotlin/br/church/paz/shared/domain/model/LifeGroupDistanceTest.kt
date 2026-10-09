package br.church.paz.shared.domain.model

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class LifeGroupDistanceTest {

    // Two well-known points in Curitiba: Praça Tiradentes (city center) and
    // Parque Barigui — roughly 3-5km apart per public map measurement.
    private val pracaTiradentes = -25.4284 to -49.2733
    private val parqueBarigui = -25.4284 to -49.3100

    @Test
    fun `returns zero for identical points`() {
        val distance = haversineDistanceKm(
            pracaTiradentes.first,
            pracaTiradentes.second,
            pracaTiradentes.first,
            pracaTiradentes.second,
        )
        assertEquals(0.0, distance)
    }

    @Test
    fun `returns approximate known distance between two Curitiba landmarks`() {
        val distance = haversineDistanceKm(
            pracaTiradentes.first,
            pracaTiradentes.second,
            parqueBarigui.first,
            parqueBarigui.second,
        )
        requireNotNull(distance)
        // Same latitude, ~0.0367 degrees of longitude apart ≈ 3.7km at this
        // latitude — assert within a tolerant range rather than pin an exact
        // float to avoid flakiness from formula rounding.
        assertTrue(distance in 3.0..5.0, "expected ~3-5km, got $distance")
    }

    @Test
    fun `returns null when first coordinate is missing`() {
        assertNull(haversineDistanceKm(null, null, pracaTiradentes.first, pracaTiradentes.second))
    }

    @Test
    fun `returns null when second coordinate is missing`() {
        assertNull(haversineDistanceKm(pracaTiradentes.first, pracaTiradentes.second, null, null))
    }

    @Test
    fun `returns null when only one axis is missing`() {
        assertNull(haversineDistanceKm(pracaTiradentes.first, null, parqueBarigui.first, parqueBarigui.second))
    }
}
