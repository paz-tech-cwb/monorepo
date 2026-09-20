package br.church.paz.android.ui.features.formularios

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.model.CasaDePazReportForm
import br.church.paz.shared.domain.repository.FormsRepository
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class CasaDePazSubmissionEditorViewModel(
    private val submissionId: String,
    private val formsRepository: FormsRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(CasaDePazSubmissionEditorUiState())
    val uiState: StateFlow<CasaDePazSubmissionEditorUiState> = _uiState.asStateFlow()

    private val _effect = Channel<CasaDePazSubmissionEditorEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        load()
    }

    private fun load() {
        viewModelScope.launch {
            runCatching {
                val submissions = formsRepository.getCasaDePazReportSubmissions()
                val sectors = formsRepository.searchSectors("")
                val submission =
                    submissions.firstOrNull { it.id == submissionId }
                        ?: error("Registro não encontrado")
                submission to sectors.associate { it.id to it.name }
            }.onSuccess { (submission, sectorNames) ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        date = submission.date,
                        facilitator = submission.facilitator,
                        sectorId = submission.sectorId,
                        adults = submission.adults.toString(),
                        kids = submission.kids.toString(),
                        guests = submission.guests.toString(),
                        conversions = submission.conversions.toString(),
                        meetingDay = submission.meetingDay ?: "",
                        meetingTime = submission.meetingTime ?: "",
                        sectorNames = sectorNames,
                    )
                }
            }.onFailure { e ->
                _uiState.update { it.copy(isLoading = false, error = e.message ?: "Erro ao carregar registro") }
            }
        }
    }

    fun onDateChange(v: String) = _uiState.update { it.copy(date = v) }

    fun onFacilitatorChange(v: String) = _uiState.update { it.copy(facilitator = v) }

    fun onSectorChange(v: Int) = _uiState.update { it.copy(sectorId = v) }

    fun onAdultsChange(v: String) = _uiState.update { it.copy(adults = v) }

    fun onKidsChange(v: String) = _uiState.update { it.copy(kids = v) }

    fun onGuestsChange(v: String) = _uiState.update { it.copy(guests = v) }

    fun onConversionsChange(v: String) = _uiState.update { it.copy(conversions = v) }

    fun onMeetingDayChange(v: String) = _uiState.update { it.copy(meetingDay = v) }

    fun onMeetingTimeChange(v: String) = _uiState.update { it.copy(meetingTime = v) }

    fun onSave() {
        val state = _uiState.value
        val sectorId = state.sectorId ?: return
        _uiState.update { it.copy(isSaving = true, error = null) }
        viewModelScope.launch {
            val form =
                CasaDePazReportForm(
                    date = state.date,
                    facilitator = state.facilitator.trim(),
                    sectorId = sectorId,
                    adults = state.adults.toIntOrNull() ?: 0,
                    kids = state.kids.toIntOrNull() ?: 0,
                    guests = state.guests.toIntOrNull() ?: 0,
                    conversions = state.conversions.toIntOrNull() ?: 0,
                    meetingDay = state.meetingDay.ifBlank { null },
                    meetingTime = state.meetingTime.ifBlank { null },
                )
            runCatching { formsRepository.updateCasaDePazReport(submissionId, form) }
                .onSuccess {
                    _uiState.update { it.copy(isSaving = false) }
                    _effect.send(CasaDePazSubmissionEditorEffect.Saved)
                }.onFailure { e ->
                    _uiState.update { it.copy(isSaving = false, error = e.message ?: "Erro ao salvar registro") }
                }
        }
    }

    fun onDelete() {
        _uiState.update { it.copy(isDeleting = true, error = null) }
        viewModelScope.launch {
            runCatching { formsRepository.deleteCasaDePazReport(submissionId) }
                .onSuccess {
                    _uiState.update { it.copy(isDeleting = false) }
                    _effect.send(CasaDePazSubmissionEditorEffect.Deleted)
                }.onFailure { e ->
                    _uiState.update { it.copy(isDeleting = false, error = e.message ?: "Erro ao remover registro") }
                }
        }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(CasaDePazSubmissionEditorEffect.NavigateBack) }
    }
}
