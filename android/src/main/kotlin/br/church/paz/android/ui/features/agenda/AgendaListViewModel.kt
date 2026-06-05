package br.church.paz.android.ui.features.agenda

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.model.AgendaEvent
import br.church.paz.shared.domain.repository.HomeRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class AgendaListUiState(
    val events: List<AgendaEvent> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null,
)

class AgendaListViewModel(
    private val homeRepository: HomeRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(AgendaListUiState())
    val uiState: StateFlow<AgendaListUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    private fun load() {
        viewModelScope.launch {
            runCatching { homeRepository.getHomeContent() }
                .onSuccess { _uiState.value = AgendaListUiState(events = it.agenda, isLoading = false) }
                .onFailure { _uiState.value = AgendaListUiState(isLoading = false, error = it.message) }
        }
    }
}
