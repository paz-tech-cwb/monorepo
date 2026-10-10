package br.church.paz.android.ui.features.memberjourney

import br.church.paz.shared.domain.model.JourneyTrack

data class MemberJourneyUiState(
    val tracks: List<JourneyTrack> = emptyList(),
    val currentTrackKey: String? = null,
    val currentTrackComplete: Boolean = false,
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val error: String? = null,
    /** Keys of steps ("trackKey#stepIndex") that just completed — drives the fill animation. */
    val newlyCompletedStepKeys: Set<String> = emptySet(),
    /** The track currently shown in the full-completion celebration overlay, if any. */
    val celebratingTrack: JourneyTrack? = null,
)

sealed class MemberJourneyEffect {
    data object NavigateBack : MemberJourneyEffect()
}
