package br.church.paz.android.ui.features.lifegroupreports

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.data.remote.httpStatusCodeOrNull
import br.church.paz.shared.domain.model.LifeGroupReportDraft
import br.church.paz.shared.domain.model.LifeGroupReportField
import br.church.paz.shared.domain.model.LifeGroupReportRules
import br.church.paz.shared.domain.repository.ChurchRepository
import br.church.paz.shared.domain.repository.FormsRepository
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Weekly life-group report submit form. Validation, normalisation and the wire payload live in
 * `:shared` ([LifeGroupReportDraft], [LifeGroupReportRules]); this class only holds UI state.
 *
 * @param preselectedLifeGroupId group the form was opened from (group detail); ignored when the
 *   viewer does not lead/co-lead it.
 */
class LifeGroupReportFormViewModel(
    private val preselectedLifeGroupId: Int?,
    private val formsRepository: FormsRepository,
    private val churchRepository: ChurchRepository,
    private val clock: () -> Long = { System.currentTimeMillis() },
) : ViewModel() {
    private val _uiState = MutableStateFlow(LifeGroupReportFormUiState())
    val uiState: StateFlow<LifeGroupReportFormUiState> = _uiState.asStateFlow()

    private val _effect = Channel<LifeGroupReportFormEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, loadError = null) }
            try {
                val all = churchRepository.getMyLifeGroups()
                val reportable = LifeGroupReportRules.reportableGroups(all)
                val today = LifeGroupReportRules.todayInSaoPaulo(clock())
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        groups = reportable,
                        noGroupsMessage =
                            if (reportable.isEmpty()) LifeGroupReportRules.noReportableGroupsMessage(all) else null,
                        today = today,
                        draft =
                            LifeGroupReportDraft(
                                date = today,
                                lifeGroupId = LifeGroupReportRules.initialGroupId(reportable, preselectedLifeGroupId),
                            ),
                    )
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, loadError = e.message ?: "Erro ao carregar seus grupos")
                }
            }
        }
    }

    fun onGroupSelected(lifeGroupId: Int) = updateDraft { it.copy(lifeGroupId = lifeGroupId) }

    fun onDateChanged(isoDate: String) = updateDraft { it.copy(date = isoDate) }

    fun onFieldChanged(
        field: LifeGroupReportField,
        value: String,
    ) = updateDraft { d ->
        when (field) {
            LifeGroupReportField.COMMITTED_MEMBERS -> d.copy(committedMembers = value)
            LifeGroupReportField.COMMITTED_MEMBERS_PRESENT -> d.copy(committedMembersPresent = value)
            LifeGroupReportField.KIDS_0_TO_11 -> d.copy(kids0To11 = value)
            LifeGroupReportField.GUESTS -> d.copy(guests = value)
            LifeGroupReportField.MDAS -> d.copy(mdas = value)
            LifeGroupReportField.OFFERING -> d.copy(offering = value)
            LifeGroupReportField.COMMITTED_AT_TADEL -> d.copy(committedAtTadel = value)
            LifeGroupReportField.COMMITTED_AT_CULTO -> d.copy(committedAtCulto = value)
            LifeGroupReportField.LEADER_ATTENDED -> d.copy(leaderAttended = value)
            LifeGroupReportField.DISCIPLES_COUNT -> d.copy(disciplesCount = value)
            LifeGroupReportField.DISCIPLES_DISCIPLED_THIS_WEEK -> d.copy(disciplesDiscipledThisWeek = value)
            LifeGroupReportField.PASTORING_ACTIVITY_TYPE -> d.copy(pastoringActivityType = value)
            LifeGroupReportField.PASTORING_ACTIVITY_OTHER -> d.copy(pastoringActivityOther = value)
            LifeGroupReportField.TRAINING_ACTIVITY_TYPE -> d.copy(trainingActivityType = value)
            LifeGroupReportField.TRAINING_ACTIVITY_OTHER -> d.copy(trainingActivityOther = value)
            // Date and group have dedicated setters.
            LifeGroupReportField.DATE, LifeGroupReportField.LIFE_GROUP -> d
        }
    }

    private fun updateDraft(transform: (LifeGroupReportDraft) -> LifeGroupReportDraft) {
        _uiState.update { state ->
            val draft = transform(state.draft)
            state.copy(
                draft = draft,
                submitError = null,
                // Once errors are showing, keep them live so the user sees them clear as they fix fields.
                fieldErrors = if (state.fieldErrors.isEmpty()) state.fieldErrors else draft.validate(state.today).errors,
            )
        }
    }

    fun onSubmit() {
        val state = _uiState.value
        if (state.isSubmitting) return
        val validation = state.draft.validate(state.today)
        if (!validation.isValid) {
            _uiState.update { it.copy(fieldErrors = validation.errors) }
            return
        }
        val form = state.draft.toForm(state.today) ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, submitError = null, fieldErrors = emptyMap()) }
            try {
                formsRepository.submitLifeGroupReport(form)
                _uiState.update { it.copy(isSubmitting = false, isSubmitted = true) }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isSubmitting = false,
                        submitError = LifeGroupReportRules.submitErrorMessage(e.httpStatusCodeOrNull(), e.message),
                    )
                }
            }
        }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(LifeGroupReportFormEffect.NavigateBack) }
    }
}
