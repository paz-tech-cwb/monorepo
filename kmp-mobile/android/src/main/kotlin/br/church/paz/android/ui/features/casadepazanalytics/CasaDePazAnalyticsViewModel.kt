package br.church.paz.android.ui.features.casadepazanalytics

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.repository.CasaDePazAnalyticsRepository
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter

private val ISO_DATE: DateTimeFormatter = DateTimeFormatter.ISO_LOCAL_DATE
private const val DEFAULT_WINDOW_MONTHS = 6L

class CasaDePazAnalyticsViewModel(
    private val repository: CasaDePazAnalyticsRepository,
) : ViewModel() {
    private val _uiState =
        MutableStateFlow(
            CasaDePazAnalyticsUiState(from = defaultFrom(), to = defaultTo()),
        )
    val uiState: StateFlow<CasaDePazAnalyticsUiState> = _uiState.asStateFlow()

    private val _effect = Channel<CasaDePazAnalyticsEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        load(showSkeleton = true)
    }

    fun load() = load(showSkeleton = true)

    /** Pull-to-refresh entry point — re-invokes the same load path without the full-screen skeleton. */
    fun refresh() = load(showSkeleton = false)

    private fun load(showSkeleton: Boolean) {
        val state = _uiState.value
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = showSkeleton, isRefreshing = !showSkeleton, error = null) }
            runCatching { repository.getSummary(from = state.from, to = state.to) }
                .onSuccess { summary ->
                    _uiState.update { it.copy(isLoading = false, isRefreshing = false, summary = summary) }
                }.onFailure { e ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isRefreshing = false,
                            error = e.message ?: "Não foi possível carregar o relatório de Casa de Paz.",
                        )
                    }
                }
        }
    }

    fun onFromSelected(from: String) {
        _uiState.update { it.copy(from = from) }
        load(showSkeleton = true)
    }

    fun onToSelected(to: String) {
        _uiState.update { it.copy(to = to) }
        load(showSkeleton = true)
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(CasaDePazAnalyticsEffect.NavigateBack) }
    }

    private companion object {
        fun defaultTo(): String = LocalDate.now().format(ISO_DATE)

        fun defaultFrom(): String =
            LocalDate
                .now()
                .minusMonths(DEFAULT_WINDOW_MONTHS - 1)
                .withDayOfMonth(1)
                .format(ISO_DATE)
    }
}
