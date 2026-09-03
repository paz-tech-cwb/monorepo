package br.church.paz.android.ui.features.agenda

import br.church.paz.shared.domain.model.AgendaEvent

data class AgendaDetailUiState(
    val event: AgendaEvent? = null,
    val isLoading: Boolean = true,
    val error: String? = null,
)

sealed class AgendaDetailEffect {
    data object NavigateBack : AgendaDetailEffect()
}
