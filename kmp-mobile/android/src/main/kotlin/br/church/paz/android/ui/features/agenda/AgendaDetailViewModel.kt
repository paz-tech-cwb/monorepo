package br.church.paz.android.ui.features.agenda

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.repository.HomeRepository
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class AgendaDetailViewModel(
    private val homeRepository: HomeRepository,
    private val eventId: String,
) : ViewModel() {
    private val _uiState = MutableStateFlow(AgendaDetailUiState())
    val uiState: StateFlow<AgendaDetailUiState> = _uiState.asStateFlow()

    private val _effect = Channel<AgendaDetailEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        loadEvent()
    }

    private fun loadEvent() {
        viewModelScope.launch {
            runCatching { homeRepository.getHomeContent() }
                .onSuccess { homeContent ->
                    val event = homeContent.agenda.find { it.id == eventId }
                    _uiState.update {
                        it.copy(event = event, isLoading = false, error = if (event == null) "Evento não encontrado" else null)
                    }
                }.onFailure { e ->
                    _uiState.update {
                        it.copy(isLoading = false, error = e.message ?: "Erro ao carregar evento")
                    }
                }
        }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(AgendaDetailEffect.NavigateBack) }
    }

    fun onRetry() {
        _uiState.update { it.copy(isLoading = true, error = null) }
        loadEvent()
    }
}
