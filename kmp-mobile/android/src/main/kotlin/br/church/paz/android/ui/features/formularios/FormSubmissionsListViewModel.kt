package br.church.paz.android.ui.features.formularios

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.repository.FormsRepository
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class FormSubmissionsListViewModel(
    private val formsRepository: FormsRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(FormSubmissionsListUiState())
    val uiState: StateFlow<FormSubmissionsListUiState> = _uiState.asStateFlow()

    private val _effect = Channel<FormSubmissionsListEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        load()
    }

    private fun load() {
        viewModelScope.launch {
            runCatching { formsRepository.getServiceReportSubmissions() }
                .onSuccess { submissions ->
                    _uiState.update { it.copy(submissions = submissions, isLoading = false) }
                }
                .onFailure { e ->
                    _uiState.update {
                        it.copy(isLoading = false, error = e.message ?: "Erro ao carregar registros")
                    }
                }
        }
    }

    fun onRetry() {
        _uiState.update { it.copy(isLoading = true, error = null) }
        load()
    }

    fun onRowTap(submissionId: String) {
        viewModelScope.launch { _effect.send(FormSubmissionsListEffect.NavigateToDetail(submissionId)) }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(FormSubmissionsListEffect.NavigateBack) }
    }
}
