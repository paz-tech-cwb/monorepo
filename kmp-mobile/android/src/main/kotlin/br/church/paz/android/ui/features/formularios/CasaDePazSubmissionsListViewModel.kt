package br.church.paz.android.ui.features.formularios

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.model.CasaDePazCycle
import br.church.paz.shared.domain.model.CasaDePazReportSubmission
import br.church.paz.shared.domain.model.buildCasaDePazReportSections
import br.church.paz.shared.domain.model.defaultCasaDePazCycleSelection
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

    private var allSubmissions: List<CasaDePazReportSubmission> = emptyList()
    private var allCycles: List<CasaDePazCycle> = emptyList()

    init {
        load()
    }

    fun load() {
        _uiState.update { it.copy(isLoading = true, error = null) }
        viewModelScope.launch {
            runCatching {
                val submissions = formsRepository.getCasaDePazReportSubmissions()
                val cycles = formsRepository.getCasaDePazCycles()
                val sectors = formsRepository.searchSectors("")
                Triple(submissions, cycles, sectors)
            }.onSuccess { (submissions, cycles, sectors) ->
                allSubmissions = submissions
                allCycles = cycles
                val selectedCycleId =
                    _uiState.value.selectedCycleId?.takeIf { id -> cycles.any { it.id == id } }
                        ?: defaultCasaDePazCycleSelection(submissions, cycles)
                _uiState.update {
                    it.copy(
                        cycles = cycles,
                        selectedCycleId = selectedCycleId,
                        sections = sections(selectedCycleId),
                        sectorNames = sectors.associate { sector -> sector.id to sector.name },
                        isLoading = false,
                    )
                }
            }.onFailure { e ->
                _uiState.update {
                    it.copy(isLoading = false, error = e.message ?: "Erro ao carregar registros")
                }
            }
        }
    }

    private fun sections(selectedCycleId: String?) =
        if (selectedCycleId == null) emptyList() else buildCasaDePazReportSections(allSubmissions, selectedCycleId)

    fun onRetry() = load()

    fun onRowTap(submissionId: String) {
        viewModelScope.launch { _effect.send(CasaDePazSubmissionsListEffect.NavigateToDetail(submissionId)) }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(CasaDePazSubmissionsListEffect.NavigateBack) }
    }

    fun onToggleSection(date: String) {
        _uiState.update {
            val collapsed = it.collapsedDates.toMutableSet()
            if (!collapsed.add(date)) collapsed.remove(date)
            it.copy(collapsedDates = collapsed)
        }
    }

    fun onOpenCyclePicker() {
        _uiState.update { it.copy(isCyclePickerVisible = true, cyclePickerQuery = "") }
    }

    fun onDismissCyclePicker() {
        _uiState.update { it.copy(isCyclePickerVisible = false) }
    }

    fun onCyclePickerQueryChanged(query: String) {
        _uiState.update { it.copy(cyclePickerQuery = query) }
    }

    fun onCycleSelected(cycleId: String) {
        _uiState.update {
            it.copy(
                selectedCycleId = cycleId,
                sections = sections(cycleId),
                isCyclePickerVisible = false,
                collapsedDates = emptySet(),
            )
        }
    }

    val filteredCycles: List<CasaDePazCycle>
        get() {
            val query = _uiState.value.cyclePickerQuery.trim()
            return if (query.isBlank()) allCycles else allCycles.filter { it.name.contains(query, ignoreCase = true) }
        }
}
