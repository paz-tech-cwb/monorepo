package br.church.paz.android.ui.features.ministries

import br.church.paz.shared.domain.model.LifeGroup

/**
 * Default-to-mine screen: shows [LifeGroup]s the viewer belongs to. If the
 * viewer has none, falls back to the unfiltered church-wide list so nobody
 * hits an empty screen — mirrors iOS `LifeGroupsView` / `LifeGroupsViewModel`.
 */
data class LifeGroupsUiState(
    val lifeGroups: List<LifeGroup> = emptyList(),
    val isFallbackToAll: Boolean = false,
    val isLoading: Boolean = true,
    val error: String? = null,
)

sealed class LifeGroupsEffect {
    data object NavigateBack : LifeGroupsEffect()

    data class NavigateToLifeGroupDetail(
        val lifeGroupId: String,
    ) : LifeGroupsEffect()

    data object NavigateToAllLifeGroups : LifeGroupsEffect()
}

/** Unfiltered, church-wide list — reached via "Ver mais life groups" or as a fallback. */
data class AllLifeGroupsUiState(
    val lifeGroups: List<LifeGroup> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null,
)

sealed class AllLifeGroupsEffect {
    data object NavigateBack : AllLifeGroupsEffect()

    data class NavigateToLifeGroupDetail(
        val lifeGroupId: String,
    ) : AllLifeGroupsEffect()

    data object NavigateToMap : AllLifeGroupsEffect()
}
