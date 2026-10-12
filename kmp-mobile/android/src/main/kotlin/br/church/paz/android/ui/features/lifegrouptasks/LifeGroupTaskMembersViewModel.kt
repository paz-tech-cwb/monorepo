package br.church.paz.android.ui.features.lifegrouptasks

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.model.LifeGroupTaskMember
import br.church.paz.shared.domain.model.LifeGroupTaskMemberUpdate
import br.church.paz.shared.domain.repository.LifeGroupTaskRepository
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Leader/co-leader screen: who takes part in the life group task rotation. */
class LifeGroupTaskMembersViewModel(
    private val lifeGroupId: Int,
    private val repository: LifeGroupTaskRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(LifeGroupTaskMembersUiState())
    val uiState: StateFlow<LifeGroupTaskMembersUiState> = _uiState.asStateFlow()

    private val _effect = Channel<LifeGroupTaskMembersEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        load(showSkeleton = true)
    }

    fun load() = load(showSkeleton = true)

    /** Pull-to-refresh entry point. Discards unsaved edits, as the list is re-read from the server. */
    fun refresh() = load(showSkeleton = false)

    private fun load(showSkeleton: Boolean) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = showSkeleton, isRefreshing = !showSkeleton, error = null) }
            try {
                val members = repository.getTaskMembers(lifeGroupId)
                val settings = repository.getTaskSettings(lifeGroupId)
                // Templates only feed the optional per-member exclusions: a failure must not block the screen.
                val templates =
                    try {
                        repository.getTaskTemplates(lifeGroupId).filter { it.isEnabled }
                    } catch (e: CancellationException) {
                        throw e
                    } catch (e: Exception) {
                        emptyList()
                    }
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        isRefreshing = false,
                        drafts = members.map(::LifeGroupTaskMemberDraft),
                        templates = templates,
                        minPresentMeetings = settings.minPresentMeetings,
                        savedMinPresentMeetings = settings.minPresentMeetings,
                        saveError = null,
                    )
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, isRefreshing = false, error = e.message ?: "Erro ao carregar membros")
                }
            }
        }
    }

    fun onEligibleChanged(
        userId: Int,
        eligible: Boolean,
    ) = updateDraft(userId) {
        // A manual choice replaces any pending "voltar ao automático".
        it.copy(eligible = eligible, resetToAutomatic = false)
    }

    fun onNoteChanged(
        userId: Int,
        note: String,
    ) = updateDraft(userId) { it.copy(note = note.take(TASK_NOTE_MAX_LENGTH)) }

    fun onTemplateExclusionToggled(
        userId: Int,
        templateId: Int,
    ) = updateDraft(userId) {
        val next =
            if (templateId in it.excludedTemplateIds) it.excludedTemplateIds - templateId else it.excludedTemplateIds + templateId
        it.copy(excludedTemplateIds = next)
    }

    fun onResetToAutomatic(userId: Int) = updateDraft(userId) { it.copy(resetToAutomatic = true) }

    fun onUndoResetToAutomatic(userId: Int) = updateDraft(userId) { it.copy(resetToAutomatic = false) }

    fun onMinPresentMeetingsChanged(value: Int) {
        _uiState.update {
            it.copy(minPresentMeetings = value.coerceIn(0, TASK_MIN_PRESENT_MEETINGS_MAX), savedMessage = null)
        }
    }

    private fun updateDraft(
        userId: Int,
        transform: (LifeGroupTaskMemberDraft) -> LifeGroupTaskMemberDraft,
    ) {
        _uiState.update { state ->
            state.copy(
                drafts = state.drafts.map { if (it.member.userId == userId) transform(it) else it },
                savedMessage = null,
            )
        }
    }

    fun onSave() {
        val state = _uiState.value
        if (state.isSaving || !state.hasChanges) return
        val updates = state.drafts.filter { it.isDirty }.map(::toUpdate)
        val settingsChanged = state.minPresentMeetings != state.savedMinPresentMeetings
        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, saveError = null, savedMessage = null) }
            try {
                // Settings first: they change which members count as automatically eligible,
                // so the member response below already reflects the new threshold.
                if (settingsChanged) {
                    val saved = repository.updateTaskSettings(lifeGroupId, state.minPresentMeetings)
                    _uiState.update { it.copy(savedMinPresentMeetings = saved.minPresentMeetings) }
                }
                val members: List<LifeGroupTaskMember> =
                    if (updates.isNotEmpty()) {
                        repository.updateTaskMembers(lifeGroupId, updates)
                    } else {
                        repository.getTaskMembers(lifeGroupId)
                    }
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        drafts = members.map(::LifeGroupTaskMemberDraft),
                        minPresentMeetings = it.savedMinPresentMeetings,
                        savedMessage = "Alterações salvas",
                    )
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isSaving = false, saveError = e.message ?: "Erro ao salvar. Tente novamente.")
                }
            }
        }
    }

    fun onSavedMessageShown() {
        _uiState.update { it.copy(savedMessage = null) }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(LifeGroupTaskMembersEffect.NavigateBack) }
    }

    // The backend requires `eligible` unless resetting, and keeps note/exclusions only on an
    // explicit row — so any edit sends the draft's eligibility (pinning it as a manual decision).
    private fun toUpdate(draft: LifeGroupTaskMemberDraft): LifeGroupTaskMemberUpdate =
        if (draft.resetToAutomatic) {
            LifeGroupTaskMemberUpdate(userId = draft.member.userId, resetToAutomatic = true)
        } else {
            LifeGroupTaskMemberUpdate(
                userId = draft.member.userId,
                eligible = draft.eligible,
                note = if (draft.noteChanged) draft.note.trim() else null,
                excludedTemplateIds = if (draft.exclusionsChanged) draft.excludedTemplateIds.sorted() else null,
            )
        }
}
