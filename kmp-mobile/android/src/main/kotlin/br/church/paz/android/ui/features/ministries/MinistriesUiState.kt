package br.church.paz.android.ui.features.ministries

import br.church.paz.shared.domain.model.Ministry

data class MinistriesUiState(
    val ministries: List<Ministry> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null,
)

sealed class MinistriesEffect {
    data object NavigateBack : MinistriesEffect()

    data class NavigateToMinistryDetail(
        val ministryId: String,
    ) : MinistriesEffect()
}
