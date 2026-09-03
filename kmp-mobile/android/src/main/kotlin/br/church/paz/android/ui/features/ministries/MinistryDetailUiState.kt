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
)

sealed class MinistryDetailEffect {
    data object NavigateBack : MinistryDetailEffect()
}

sealed class LifeGroupDetailEffect {
    data object NavigateBack : LifeGroupDetailEffect()
}
