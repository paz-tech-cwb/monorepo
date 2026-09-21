package br.church.paz.android.ui.features.memberjourney

import br.church.paz.shared.domain.model.JourneyTrack

data class MemberJourneyUiState(
    val tracks: List<JourneyTrack> = emptyList(),
    val expandedTrackKey: String? = null,
    val isLoading: Boolean = true,
    val error: String? = null,
) {
    val isEmpty: Boolean get() = !isLoading && error == null && tracks.isEmpty()
}

sealed class MemberJourneyEffect {
    data object NavigateBack : MemberJourneyEffect()
}
