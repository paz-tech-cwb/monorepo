package br.church.paz.android.ui.features.memberjourney

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.repository.MemberJourneyRepository
import br.church.paz.shared.domain.usecase.DetectJourneyLevelUpUseCase
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class MemberJourneyViewModel(
    private val memberJourneyRepository: MemberJourneyRepository,
    private val detectJourneyLevelUpUseCase: DetectJourneyLevelUpUseCase,
) : ViewModel() {
    private val _uiState = MutableStateFlow(MemberJourneyUiState())
    val uiState: StateFlow<MemberJourneyUiState> = _uiState.asStateFlow()

    private val _effect = Channel<MemberJourneyEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        loadJourney(showSkeleton = true)
    }

    /** Pull-to-refresh entry point — re-invokes the same load path without the full-screen skeleton. */
    fun refresh() = loadJourney(showSkeleton = false)

    private fun loadJourney(showSkeleton: Boolean) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = showSkeleton, isRefreshing = !showSkeleton, error = null) }
            runCatching { memberJourneyRepository.getMemberJourney() }
                .onSuccess { journey ->
                    val levelUp =
                        runCatching { detectJourneyLevelUpUseCase(journey) }.getOrDefault(
                            DetectJourneyLevelUpUseCase.Result(),
                        )
                    val celebratingTrack =
                        levelUp.newlyCompletedTrackKeys
                            .firstOrNull()
                            ?.let { key -> journey.tracks.firstOrNull { it.key == key } }
                    _uiState.update {
                        it.copy(
                            tracks = journey.tracks,
                            currentTrackKey = journey.currentTrackKey,
                            currentTrackComplete = journey.currentTrackComplete,
                            isLoading = false,
                            isRefreshing = false,
                            newlyCompletedStepKeys = levelUp.newlyCompletedStepKeys,
                            celebratingTrack = celebratingTrack,
                        )
                    }
                }.onFailure { e ->
                    _uiState.update {
                        it.copy(isLoading = false, isRefreshing = false, error = e.message ?: "Erro ao carregar jornada")
                    }
                }
        }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(MemberJourneyEffect.NavigateBack) }
    }

    fun onRetry() = loadJourney(showSkeleton = true)

    fun onCelebrationDismissed() {
        _uiState.update { it.copy(celebratingTrack = null) }
    }
}
