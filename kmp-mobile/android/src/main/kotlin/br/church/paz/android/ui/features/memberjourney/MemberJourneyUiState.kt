package br.church.paz.android.ui.features.memberjourney

import br.church.paz.shared.domain.model.JourneyTrack

data class MemberJourneyUiState(
    val track: JourneyTrack? = null,
    val allStepsComplete: Boolean = false,
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val error: String? = null,
)

sealed class MemberJourneyEffect {
    data object NavigateBack : MemberJourneyEffect()
}
