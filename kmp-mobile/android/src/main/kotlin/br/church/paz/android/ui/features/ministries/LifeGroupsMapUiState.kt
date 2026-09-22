package br.church.paz.android.ui.features.ministries

import br.church.paz.shared.domain.model.LifeGroup

/** Map-based discovery of life groups — mirrors iOS `LifeGroupsMapView`. */
data class LifeGroupsMapUiState(
    val lifeGroups: List<LifeGroup> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null,
) {
    val groupsWithLocation: List<LifeGroup>
        get() = lifeGroups.filter { it.latitude != null && it.longitude != null }
}

sealed class LifeGroupsMapEffect {
    data object NavigateBack : LifeGroupsMapEffect()

    data class OpenDirections(
        val latitude: Double,
        val longitude: Double,
        val name: String,
    ) : LifeGroupsMapEffect()

    data class NavigateToLifeGroupDetail(
        val lifeGroupId: String,
    ) : LifeGroupsMapEffect()
}
