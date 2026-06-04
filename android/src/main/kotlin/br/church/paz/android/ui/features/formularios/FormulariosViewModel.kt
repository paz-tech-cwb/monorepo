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

class FormulariosViewModel(
    private val formsRepository: FormsRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(FormulariosUiState())
    val uiState: StateFlow<FormulariosUiState> = _uiState.asStateFlow()

    private val _effect = Channel<FormulariosEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init { loadForms() }

    private fun loadForms() {
        viewModelScope.launch {
            runCatching { formsRepository.getCatalog() }
                .onSuccess { forms ->
                    _uiState.update { it.copy(forms = forms, isLoading = false) }
                }
                .onFailure { e ->
                    _uiState.update {
                        it.copy(isLoading = false, error = e.message ?: "Erro ao carregar formulários")
                    }
                }
        }
    }

    fun onFormTap(formId: String) {
        viewModelScope.launch { _effect.send(FormulariosEffect.NavigateToForm(formId)) }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(FormulariosEffect.NavigateBack) }
    }

    fun onRetry() {
        _uiState.update { it.copy(isLoading = true, error = null) }
        loadForms()
    }
}
