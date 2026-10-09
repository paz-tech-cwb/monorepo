package br.church.paz.android.ui.features.lifegroupdiscovery

import br.church.paz.shared.domain.model.LifeGroup

enum class LifeGroupSortOption(
    val label: String,
) {
    NAME("Nome"),
    DISTANCE("Distância"),
}

/**
 * Unfiltered, church-wide life group discovery — map/list toggle, search,
 * kids-headcount filter and sort. Mirrors iOS `AllLifeGroupsContentView`.
 */
data class LifeGroupDiscoveryUiState(
    val lifeGroups: List<LifeGroup> = emptyList(),
    /** True only for the very first load — drives the full-screen skeleton. */
    val isLoading: Boolean = true,
    /**
     * True while a debounced search reload is in flight — the search field
     * stays mounted and only the content below it reflects this, so typing
     * never makes the field disappear/reset mid-keystroke.
     */
    val isSearching: Boolean = false,
    /** True once a load (initial or search) has ever completed. */
    val hasLoadedOnce: Boolean = false,
    val error: String? = null,
    val searchText: String = "",
    val kidsOnly: Boolean = false,
    val sortOption: LifeGroupSortOption = LifeGroupSortOption.NAME,
    val showMap: Boolean = false,
    /** Non-null once a coordinate is resolved; drives `availableSortOptions`. */
    val userLocation: Pair<Double, Double>? = null,
    /** True once permission has been explicitly denied — used only to decide
     * whether to show a "ative a localização" hint; never blocks the rest
     * of the screen. */
    val locationPermissionDenied: Boolean = false,
) {
    val hasLocation: Boolean get() = userLocation != null

    /**
     * Only offers [LifeGroupSortOption.DISTANCE] once a coordinate is
     * actually available — showing it disabled-but-selectable doesn't
     * reliably block selection on every Compose dropdown implementation, so
     * it's removed from the list entirely rather than shown-but-disabled.
     */
    val availableSortOptions: List<LifeGroupSortOption>
        get() = if (hasLocation) LifeGroupSortOption.entries else listOf(LifeGroupSortOption.NAME)

    val showsMapToggle: Boolean get() = !isLoading && error == null && lifeGroups.isNotEmpty()

    private val baseFilteredGroups: List<LifeGroup>
        get() = if (kidsOnly) lifeGroups.filter { it.kidsCount > 0 } else lifeGroups

    val geocodedGroups: List<LifeGroup>
        get() = baseFilteredGroups.filter { it.latitude != null && it.longitude != null }

    private val nonGeocodedGroups: List<LifeGroup>
        get() = baseFilteredGroups.filter { it.latitude == null || it.longitude == null }

    /**
     * Sorted/filtered groups ready for display. For distance sort,
     * non-geocoded groups are appended after the sorted geocoded ones —
     * never interleaved as "very far away" — matching the iOS fix for the
     * same issue.
     */
    val displayedGroups: List<LifeGroup>
        get() =
            when (sortOption) {
                LifeGroupSortOption.NAME ->
                    baseFilteredGroups.sortedBy { it.name.lowercase() }
                LifeGroupSortOption.DISTANCE -> {
                    val (userLat, userLon) = userLocation ?: return baseFilteredGroups
                    val sortedGeocoded =
                        geocodedGroups.sortedBy { group ->
                            br.church.paz.shared.domain.model.haversineDistanceKm(
                                userLat,
                                userLon,
                                group.latitude,
                                group.longitude,
                            ) ?: Double.MAX_VALUE
                        }
                    sortedGeocoded + nonGeocodedGroups
                }
            }
}

sealed class LifeGroupDiscoveryEffect {
    data object NavigateBack : LifeGroupDiscoveryEffect()

    data class NavigateToLifeGroupDetail(
        val lifeGroupId: String,
    ) : LifeGroupDiscoveryEffect()

    data class OpenDirections(
        val latitude: Double,
        val longitude: Double,
        val name: String,
    ) : LifeGroupDiscoveryEffect()
}
