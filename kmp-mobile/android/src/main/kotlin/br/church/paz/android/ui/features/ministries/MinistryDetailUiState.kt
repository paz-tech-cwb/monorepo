package br.church.paz.android.ui.features.ministries

import br.church.paz.shared.domain.model.Ministry

data class MinistryDetailUiState(
    val ministry: Ministry? = null,
    val isLoading: Boolean = true,
    val error: String? = null,
)

data class LifeGroupDetailUiState(
    val lifeGroup: br.church.paz.shared.domain.model.LifeGroup? = null,
    val isLoading: Boolean = true,
    val error: String? = null,
    // Only the group's leader or co-leader may record attendance — this has
    // no dedicated role slug, so it's resolved by comparing the current
    // user's id against the group's leader_id/co_leader_id directly.
    val canManageAttendance: Boolean = false,
)

sealed class MinistryDetailEffect {
    data object NavigateBack : MinistryDetailEffect()
}

sealed class LifeGroupDetailEffect {
    data object NavigateBack : LifeGroupDetailEffect()
}
