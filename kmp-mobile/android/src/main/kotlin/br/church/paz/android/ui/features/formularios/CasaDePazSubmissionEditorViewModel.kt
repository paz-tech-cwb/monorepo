package br.church.paz.android.ui.features.formularios

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.model.CasaDePazReportForm
import br.church.paz.shared.domain.model.CasaDePazReportGuestEntry
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
                val cycles = formsRepository.getCasaDePazCycles()
                val submission =
                    submissions.firstOrNull { it.id == submissionId }
                        ?: error("Registro não encontrado")
                Triple(submission, sectors.associate { it.id to it.name }, cycles)
            }.onSuccess { (submission, sectorNames, cycles) ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        date = submission.date,
                        facilitator = submission.facilitator,
                        sectorId = submission.sectorId,
                        casaDePazId = submission.casaDePazId,
                        kids = submission.kids.toString(),
                        guests = submission.guests.map { g ->
                            CasaDePazGuestDraft(
                                name = g.name,
                                email = g.email,
                                birthDate = g.birthDate,
                                whatsapp = g.whatsapp ?: "",
                            )
                        },
                        conversions = submission.conversions.toString(),
                        meetingDay = submission.meetingDay ?: "",
                        sectorNames = sectorNames,
                        cycles = cycles.map { CasaDePazCycleOption(it.id, it.name) },
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

    fun onCycleChange(v: String) = _uiState.update { it.copy(casaDePazId = v) }

    fun onKidsChange(v: String) = _uiState.update { it.copy(kids = v) }

    fun onConversionsChange(v: String) = _uiState.update { it.copy(conversions = v) }

    fun onMeetingDayChange(v: String) = _uiState.update { it.copy(meetingDay = v) }

    fun onAddGuest() = _uiState.update { it.copy(guests = it.guests + CasaDePazGuestDraft()) }

    fun onUpdateGuest(index: Int, patch: CasaDePazGuestDraft.() -> CasaDePazGuestDraft) {
        _uiState.update { state ->
            state.copy(guests = state.guests.mapIndexed { i, g -> if (i == index) g.patch() else g })
        }
    }

    fun onRemoveGuest(index: Int) {
        _uiState.update { state -> state.copy(guests = state.guests.filterIndexed { i, _ -> i != index }) }
    }

    fun onSave() {
        val state = _uiState.value
        val sectorId = state.sectorId ?: return
        val casaDePazId = state.casaDePazId ?: return
        _uiState.update { it.copy(isSaving = true, error = null) }
        viewModelScope.launch {
            val form =
                CasaDePazReportForm(
                    date = state.date,
                    facilitator = state.facilitator.trim(),
                    sectorId = sectorId,
                    casaDePazId = casaDePazId,
                    kids = state.kids.toIntOrNull() ?: 0,
                    guests = state.guests.map {
                        CasaDePazReportGuestEntry(
                            name = it.name.trim(),
                            email = it.email.trim(),
                            birthDate = it.birthDate,
                            whatsapp = it.whatsapp.trim().ifEmpty { null },
                        )
                    },
                    conversions = state.conversions.toIntOrNull() ?: 0,
                    meetingDay = state.meetingDay.ifBlank { null },
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
