package br.church.paz.android.ui.features.ministries

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.repository.ChurchRepository
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class MinistriesViewModel(
    private val churchRepository: ChurchRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(MinistriesUiState())
    val uiState: StateFlow<MinistriesUiState> = _uiState.asStateFlow()

    private val _effect = Channel<MinistriesEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        load()
    }

    fun load() = fetch(showSkeleton = true)

    /** Pull-to-refresh entry point — re-invokes the same load path without the full-screen skeleton. */
    fun refresh() = fetch(showSkeleton = false)

    private fun fetch(showSkeleton: Boolean) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = showSkeleton, isRefreshing = !showSkeleton, error = null) }
            runCatching { churchRepository.getAllMinistries() }
                .onSuccess { ministries ->
                    _uiState.update {
                        it.copy(ministries = ministries, isLoading = false, isRefreshing = false, error = null)
                    }
                }.onFailure { e ->
                    _uiState.update {
                        it.copy(isLoading = false, isRefreshing = false, error = e.message ?: "Erro ao carregar dados")
                    }
                }
        }
    }

    fun onMinistryTap(ministryId: String) {
        viewModelScope.launch { _effect.send(MinistriesEffect.NavigateToMinistryDetail(ministryId)) }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(MinistriesEffect.NavigateBack) }
    }

    fun onRetry() {
        _uiState.update { it.copy(isLoading = true, error = null) }
        load()
    }
}
