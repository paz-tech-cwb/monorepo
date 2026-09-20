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

class CasaDePazSubmissionsListViewModel(
    private val formsRepository: FormsRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(CasaDePazSubmissionsListUiState())
    val uiState: StateFlow<CasaDePazSubmissionsListUiState> = _uiState.asStateFlow()

    private val _effect = Channel<CasaDePazSubmissionsListEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        load()
    }

    fun load() {
        _uiState.update { it.copy(isLoading = true, error = null) }
        viewModelScope.launch {
            runCatching {
                val submissions = formsRepository.getCasaDePazReportSubmissions()
                val sectors = formsRepository.searchSectors("")
                submissions.sortedByDescending { it.date } to sectors.associate { it.id to it.name }
            }.onSuccess { (submissions, sectorNames) ->
                _uiState.update {
                    it.copy(submissions = submissions, sectorNames = sectorNames, isLoading = false)
                }
            }.onFailure { e ->
                _uiState.update {
                    it.copy(isLoading = false, error = e.message ?: "Erro ao carregar registros")
                }
            }
        }
    }

    fun onRetry() = load()

    fun onRowTap(submissionId: String) {
        viewModelScope.launch { _effect.send(CasaDePazSubmissionsListEffect.NavigateToDetail(submissionId)) }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(CasaDePazSubmissionsListEffect.NavigateBack) }
    }
}
