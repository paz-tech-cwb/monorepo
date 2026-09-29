package br.church.paz.android.ui.features.agenda

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.model.AgendaEvent
import br.church.paz.shared.domain.repository.AgendaRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class AgendaListUiState(
    val events: List<AgendaEvent> = emptyList(),
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val isLoadingMore: Boolean = false,
    val error: String? = null,
    val hasReachedEnd: Boolean = false,
)

private const val PAGE_SIZE = 20

class AgendaListViewModel(
    private val agendaRepository: AgendaRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(AgendaListUiState())
    val uiState: StateFlow<AgendaListUiState> = _uiState.asStateFlow()

    private var currentPage = 1
    private var isRequestInFlight = false

    init {
        loadFirstPage(showSkeleton = true)
    }

    /** Pull-to-refresh entry point — re-invokes the same load path without the full-screen skeleton. */
    fun refresh() = loadFirstPage(showSkeleton = false)

    private fun loadFirstPage(showSkeleton: Boolean) {
        currentPage = 1
        viewModelScope.launch {
            isRequestInFlight = true
            _uiState.value =
                _uiState.value.copy(
                    isLoading = showSkeleton,
                    isRefreshing = !showSkeleton,
                )
            runCatching { agendaRepository.getEvents(page = 1, limit = PAGE_SIZE) }
                .onSuccess { events ->
                    _uiState.value =
                        AgendaListUiState(
                            events = events,
                            isLoading = false,
                            isRefreshing = false,
                            hasReachedEnd = events.size < PAGE_SIZE,
                        )
                }.onFailure {
                    _uiState.value =
                        _uiState.value.copy(
                            isLoading = false,
                            isRefreshing = false,
                            error = it.message,
                        )
                }
            isRequestInFlight = false
        }
    }

    fun loadMore() {
        val state = _uiState.value
        if (isRequestInFlight || state.isLoading || state.isLoadingMore || state.hasReachedEnd) return
        isRequestInFlight = true
        viewModelScope.launch {
            val nextPage = currentPage + 1
            _uiState.value = state.copy(isLoadingMore = true)
            runCatching { agendaRepository.getEvents(page = nextPage, limit = PAGE_SIZE) }
                .onSuccess { newEvents ->
                    currentPage = nextPage
                    _uiState.value =
                        _uiState.value.copy(
                            events = _uiState.value.events + newEvents,
                            isLoadingMore = false,
                            hasReachedEnd = newEvents.size < PAGE_SIZE,
                        )
                }.onFailure {
                    _uiState.value = _uiState.value.copy(isLoadingMore = false)
                }
            isRequestInFlight = false
        }
    }

    fun retry() = loadFirstPage(showSkeleton = true)
}
