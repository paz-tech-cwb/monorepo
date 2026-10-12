package br.church.paz.android.ui.features.lifegrouptasks

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.model.LifeGroupTaskStatus
import br.church.paz.shared.domain.repository.LifeGroupTaskRepository
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class LifeGroupTaskGuideViewModel(
    private val assignmentId: String,
    private val repository: LifeGroupTaskRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(LifeGroupTaskGuideUiState())
    val uiState: StateFlow<LifeGroupTaskGuideUiState> = _uiState.asStateFlow()

    private val _effect = Channel<LifeGroupTaskGuideEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        load(showSkeleton = true)
    }

    fun load() = load(showSkeleton = true)

    /** Pull-to-refresh entry point — re-invokes the same load path without the full-screen skeleton. */
    fun refresh() = load(showSkeleton = false)

    private fun load(showSkeleton: Boolean) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = showSkeleton, isRefreshing = !showSkeleton, error = null) }
            try {
                val task = repository.getMyTask(assignmentId)
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        isRefreshing = false,
                        task = task,
                        // A task that was already given back (e.g. opened from an old push).
                        declined = task.status == LifeGroupTaskStatus.DECLINED,
                    )
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, isRefreshing = false, error = e.message ?: "Erro ao carregar tarefa")
                }
            }
        }
    }

    fun onDeclineClicked() {
        _uiState.update { it.copy(showDeclineConfirm = true, declineError = null) }
    }

    fun onDeclineDismissed() {
        _uiState.update { it.copy(showDeclineConfirm = false) }
    }

    fun onDeclineConfirmed() {
        if (_uiState.value.isDeclining) return
        viewModelScope.launch {
            _uiState.update { it.copy(showDeclineConfirm = false, isDeclining = true, declineError = null) }
            try {
                val result = repository.declineTask(assignmentId)
                _uiState.update {
                    it.copy(isDeclining = false, declined = true, declineReassigned = result.reassigned)
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isDeclining = false, declineError = e.message ?: "Erro ao devolver tarefa. Tente novamente.")
                }
            }
        }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(LifeGroupTaskGuideEffect.NavigateBack) }
    }
}
