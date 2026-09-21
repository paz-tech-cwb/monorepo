package br.church.paz.android.ui.features.memberjourney

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.repository.MemberJourneyRepository
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class MemberJourneyViewModel(
    private val memberJourneyRepository: MemberJourneyRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(MemberJourneyUiState())
    val uiState: StateFlow<MemberJourneyUiState> = _uiState.asStateFlow()

    private val _effect = Channel<MemberJourneyEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        loadJourney()
    }

    private fun loadJourney() {
        viewModelScope.launch {
            runCatching { memberJourneyRepository.getMemberJourney() }
                .onSuccess { journey ->
                    val firstIncompleteTrackKey =
                        journey.tracks.firstOrNull { track -> track.progressPercentage < 100 }?.key
                    _uiState.update {
                        it.copy(
                            tracks = journey.tracks,
                            expandedTrackKey = firstIncompleteTrackKey ?: journey.tracks.firstOrNull()?.key,
                            isLoading = false,
                        )
                    }
                }.onFailure { e ->
                    _uiState.update {
                        it.copy(isLoading = false, error = e.message ?: "Erro ao carregar jornada")
                    }
                }
        }
    }

    fun onToggleTrack(trackKey: String) {
        _uiState.update {
            it.copy(expandedTrackKey = if (it.expandedTrackKey == trackKey) null else trackKey)
        }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(MemberJourneyEffect.NavigateBack) }
    }

    fun onRetry() {
        _uiState.update { it.copy(isLoading = true, error = null) }
        loadJourney()
    }
}
