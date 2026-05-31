package br.church.paz.android.ui.features.meetingreport

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.model.MeetingReportRequest
import br.church.paz.shared.domain.repository.AuthRepository
import br.church.paz.shared.domain.repository.FormsRepository
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class MeetingReportViewModel(
    private val formsRepository: FormsRepository,
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(MeetingReportUiState())
    val uiState: StateFlow<MeetingReportUiState> = _uiState.asStateFlow()

    private val _effect = Channel<MeetingReportEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    fun onDateChanged(date: String) {
        _uiState.update { it.copy(date = date, error = null) }
    }

    fun onAttendeesChanged(attendees: String) {
        _uiState.update { it.copy(attendees = attendees, error = null) }
    }

    fun onVisitorsChanged(visitors: String) {
        _uiState.update { it.copy(visitors = visitors, error = null) }
    }

    fun onOfferingsChanged(offerings: String) {
        _uiState.update { it.copy(offerings = offerings, error = null) }
    }

    fun onObservationsChanged(observations: String) {
        _uiState.update { it.copy(observations = observations, error = null) }
    }

    fun onSubmit() {
        val state = _uiState.value
        if (state.date.isEmpty()) {
            _uiState.update { it.copy(error = "Data é obrigatória") }
            return
        }
        if (state.attendees.isEmpty()) {
            _uiState.update { it.copy(error = "Número de participantes é obrigatório") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, error = null) }

            val attendeesInt = state.attendees.toIntOrNull()
            val visitorsInt = state.visitors.takeIf { it.isNotEmpty() }?.toIntOrNull() ?: 0
            val offeringsDouble = state.offerings.takeIf { it.isNotEmpty() }?.toDoubleOrNull()

            if (attendeesInt == null) {
                _uiState.update { it.copy(isSubmitting = false, error = "Número de participantes inválido") }
                return@launch
            }

            val user = authRepository.currentUser()
            val lifeGroupId = user?.id ?: ""

            val report = MeetingReportRequest(
                lifeGroupId = lifeGroupId,
                date = state.date,
                attendees = attendeesInt,
                visitors = visitorsInt,
                offerings = offeringsDouble,
                observations = state.observations.takeIf { it.isNotEmpty() },
            )

            formsRepository.submitLifeGroupReport(report)
                .onSuccess {
                    _uiState.update { it.copy(isSubmitting = false, success = true) }
                    _effect.send(MeetingReportEffect.SubmitSuccess)
                }
                .onFailure { e ->
                    _uiState.update {
                        it.copy(isSubmitting = false, error = e.message ?: "Erro ao enviar relatório")
                    }
                }
        }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(MeetingReportEffect.NavigateBack) }
    }
}
