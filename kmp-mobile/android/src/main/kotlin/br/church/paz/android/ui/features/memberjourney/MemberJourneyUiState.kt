package br.church.paz.android.ui.features.memberjourney

import br.church.paz.shared.domain.model.MemberJourney

data class MemberJourneyUiState(
    val journey: MemberJourney? = null,
    val isLoading: Boolean = true,
    val error: String? = null,
)

sealed class MemberJourneyEffect {
    data object NavigateBack : MemberJourneyEffect()
}
