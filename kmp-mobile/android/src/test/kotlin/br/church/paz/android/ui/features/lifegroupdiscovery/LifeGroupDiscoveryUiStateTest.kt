package br.church.paz.android.ui.features.lifegroupdiscovery

import br.church.paz.shared.domain.model.LifeGroup
import org.junit.Assert.assertEquals
import org.junit.Test

class LifeGroupDiscoveryUiStateTest {
    @Test
    fun `availableSortOptions only offers NAME when there is no location`() {
        val state = LifeGroupDiscoveryUiState(userLocation = null)

        assertEquals(listOf(LifeGroupSortOption.NAME), state.availableSortOptions)
    }

    @Test
    fun `availableSortOptions includes DISTANCE when a location is available`() {
        val state = LifeGroupDiscoveryUiState(userLocation = -25.4284 to -49.2733)

        assertEquals(LifeGroupSortOption.entries, state.availableSortOptions)
    }

    @Test
    fun `displayedGroups sorted by distance puts geocoded groups first sorted by distance, then non-geocoded groups`() {
        val near = LifeGroup(id = 1, name = "Near", latitude = -25.4284, longitude = -49.2733)
        val far = LifeGroup(id = 2, name = "Far", latitude = -25.4284, longitude = -49.3100)
        val noLocation = LifeGroup(id = 3, name = "No location", latitude = null, longitude = null)

        val state =
            LifeGroupDiscoveryUiState(
                lifeGroups = listOf(far, noLocation, near),
                sortOption = LifeGroupSortOption.DISTANCE,
                userLocation = -25.4284 to -49.2733,
            )

        assertEquals(listOf(near, far, noLocation), state.displayedGroups)
    }
}
