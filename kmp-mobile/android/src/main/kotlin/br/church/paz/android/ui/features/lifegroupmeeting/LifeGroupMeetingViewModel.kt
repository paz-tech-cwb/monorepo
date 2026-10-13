package br.church.paz.android.ui.features.lifegroupmeeting

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.model.LifeGroupMeeting
import br.church.paz.shared.domain.model.LifeGroupMeetingDraft
import br.church.paz.shared.domain.model.LifeGroupMeetingErrors
import br.church.paz.shared.domain.model.LifeGroupMeetingReportDraft
import br.church.paz.shared.domain.model.LifeGroupMeetingRules
import br.church.paz.shared.domain.repository.AuthRepository
import br.church.paz.shared.domain.repository.LifeGroupMeetingRepository
import br.church.paz.shared.domain.repository.MeetingDraftStore
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * The combined "Reunião" screen of one (life group, date): a presence section and a report section,
 * saved independently (presence first, report second). Unsaved edits are mirrored to a local draft
 * keyed by (user, group, date) and restored on the next open.
 */
class LifeGroupMeetingViewModel(
    private val lifeGroupId: Int,
    private val meetingDate: String,
    private val repository: LifeGroupMeetingRepository,
    private val authRepository: AuthRepository,
    private val draftStore: MeetingDraftStore,
    // `LifeGroupMeetingRules.canWrite(role, isGroupLeadership)` decided by the caller (group detail); null when
    // unknown (push deep link): then only the server's `can_write` applies. `false` forces read-only.
    private val viewerCanWrite: Boolean? = null,
) : ViewModel() {
    private val _uiState =
        MutableStateFlow(LifeGroupMeetingUiState(meetingDate = meetingDate, viewerCanWrite = viewerCanWrite))
    val uiState: StateFlow<LifeGroupMeetingUiState> = _uiState.asStateFlow()

    private val _effect = Channel<LifeGroupMeetingEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    private var userId: String? = null
    private var persistJob: Job? = null

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, loadError = null) }
            val currentUserId = userId ?: runCatching { authRepository.currentUser()?.id }.getOrNull()
            userId = currentUserId
            val draft = readDraft(currentUserId)
            fetch(extra = _uiState.value.isExtra || draft?.extraMeeting == true, draft = draft)
        }
    }

    private suspend fun readDraft(currentUserId: String?): LifeGroupMeetingDraft? {
        if (currentUserId == null) return null
        return try {
            draftStore.read(currentUserId, lifeGroupId, meetingDate)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            null
        }
    }

    private suspend fun fetch(
        extra: Boolean,
        draft: LifeGroupMeetingDraft?,
    ) {
        try {
            val meeting = repository.getMeeting(lifeGroupId, meetingDate, extra.takeIf { it })
            applyLoaded(meeting, draft, extra)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            if (extra && LifeGroupMeetingErrors.isExtraFlagRejected(e)) {
                // A stored draft (or earlier choice) says "extra", but the group's day changed: the server
                // now refuses the flag. Drop it and refetch instead of looping on the same 400 forever.
                fetch(extra = false, draft = draft?.copy(extraMeeting = false))
                if (_uiState.value.meeting == null) clearStoredDraft() else persistDraft()
                return
            }
            if (LifeGroupMeetingErrors.requiresExtraChoice(e)) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        loadError = null,
                        needsExtraChoice = true,
                        isExtra = false,
                        meeting = null,
                        entries = emptyList(),
                    )
                }
            } else {
                _uiState.update { it.copy(isLoading = false, loadError = LifeGroupMeetingErrors.message(e)) }
            }
        }
    }

    private fun applyLoaded(
        meeting: LifeGroupMeeting,
        draft: LifeGroupMeetingDraft?,
        extra: Boolean,
    ) {
        val serverEntries = meeting.attendance?.entries.orEmpty()
        // A closed edit window is read-only: a stale local draft must not resurface as editable input.
        val usableDraft = draft?.takeIf { meeting.isEditable && viewerCanWrite != false }
        val entries = LifeGroupMeetingRules.applyDraftEntries(serverEntries, usableDraft?.attendance)
        val baselineReport =
            meeting.report?.let { LifeGroupMeetingReportDraft.fromReport(it) } ?: LifeGroupMeetingReportDraft()
        _uiState.update {
            it.copy(
                isLoading = false,
                loadError = null,
                needsExtraChoice = false,
                isExtra = meeting.attendance?.let { a -> if (a.isDraft) extra else a.isExtra } ?: extra,
                meeting = meeting,
                entries = entries,
                reportDraft = usableDraft?.report ?: baselineReport,
                reportErrors = emptyMap(),
                attendanceError = null,
                reportError = null,
                draftRestored = usableDraft?.let { d -> d.attendance != null || d.report != null } ?: false,
            )
        }
    }

    // ---- extra meeting -------------------------------------------------------------------

    fun onExtraMeetingChanged(extra: Boolean) {
        val state = _uiState.value
        if (state.isWriteForbidden || state.isExtraLocked || state.isBusy || state.isExtra == extra) return
        viewModelScope.launch {
            _uiState.update { it.copy(isExtra = extra, isLoading = true, loadError = null) }
            fetch(extra = extra, draft = readDraft(userId)?.copy(extraMeeting = extra))
            if (_uiState.value.meeting == null) clearStoredDraft() else persistDraft()
        }
    }

    // ---- presence ------------------------------------------------------------------------

    fun onTogglePresent(userId: Int) {
        // Edits while a save is in flight would be overwritten by the response: ignore them.
        if (_uiState.value.isReadOnly || _uiState.value.isBusy) return
        _uiState.update {
            it.copy(
                entries = LifeGroupMeetingRules.togglePresent(it.entries, userId),
                attendanceNotice = null,
                attendanceError = null,
            )
        }
        persistDraft()
    }

    /** "Todos presentes": on marks everyone present, off marks everyone absent. */
    fun onAllPresentChanged(allPresent: Boolean) {
        if (_uiState.value.isReadOnly || _uiState.value.isBusy) return
        _uiState.update {
            it.copy(
                entries = LifeGroupMeetingRules.setAllPresent(it.entries, allPresent),
                attendanceNotice = null,
                attendanceError = null,
            )
        }
        persistDraft()
    }

    fun onSaveAttendance() {
        val state = _uiState.value
        val meeting = state.meeting ?: return
        if (!state.canSaveAttendance) return
        LifeGroupMeetingRules.attendanceError(state.entries)?.let { message ->
            _uiState.update { it.copy(attendanceError = message) }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isSavingAttendance = true, attendanceError = null, attendanceNotice = null) }
            try {
                val saved =
                    repository.saveAttendance(
                        lifeGroupId,
                        meetingDate,
                        state.entries,
                        LifeGroupMeetingRules.extraFlagForSave(meeting.attendance, state.isExtra),
                    )
                _uiState.update {
                    it.copy(
                        isSavingAttendance = false,
                        meeting = saved,
                        entries = saved.attendance?.entries ?: it.entries,
                        isExtra = saved.attendance?.isExtra ?: it.isExtra,
                        attendanceNotice = "Presença salva.",
                        draftRestored = false,
                    )
                }
                persistDraft()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _uiState.update { it.copy(isSavingAttendance = false, attendanceError = LifeGroupMeetingErrors.message(e)) }
                if (LifeGroupMeetingErrors.isEditWindowClosed(e)) load()
            }
        }
    }

    // ---- report --------------------------------------------------------------------------

    fun onReportChanged(draft: LifeGroupMeetingReportDraft) {
        val state = _uiState.value
        if (!state.canEditReport || state.isBusy) return
        _uiState.update {
            it.copy(reportDraft = draft, reportErrors = emptyMap(), reportError = null, reportNotice = null)
        }
        persistDraft()
    }

    fun onSaveReport() {
        val state = _uiState.value
        if (!state.canSaveReport) return
        val validation = state.reportDraft.validate()
        val input = state.reportDraft.toInput()
        if (!validation.isValid || input == null) {
            _uiState.update {
                it.copy(reportErrors = validation.errors, reportError = validation.firstError, reportNotice = null)
            }
            return
        }
        viewModelScope.launch {
            _uiState.update {
                it.copy(isSavingReport = true, reportError = null, reportErrors = emptyMap(), reportNotice = null)
            }
            try {
                val saved = repository.saveReport(lifeGroupId, meetingDate, input)
                _uiState.update {
                    it.copy(
                        isSavingReport = false,
                        meeting = saved,
                        reportDraft = saved.report?.let { r -> LifeGroupMeetingReportDraft.fromReport(r) } ?: it.reportDraft,
                        reportNotice = "Relatório salvo.",
                        draftRestored = false,
                    )
                }
                persistDraft()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _uiState.update { it.copy(isSavingReport = false, reportError = LifeGroupMeetingErrors.message(e)) }
                if (LifeGroupMeetingErrors.isEditWindowClosed(e)) load()
            }
        }
    }

    fun onDismissDraftBanner() {
        _uiState.update { it.copy(draftRestored = false) }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(LifeGroupMeetingEffect.NavigateBack) }
    }

    // ---- local draft ---------------------------------------------------------------------

    private suspend fun clearStoredDraft() {
        val currentUserId = userId ?: return
        try {
            draftStore.clear(currentUserId, lifeGroupId, meetingDate)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            // Best effort.
        }
    }

    /** Mirrors the unsaved edits to the local draft store (or removes the draft when nothing is unsaved). */
    private fun persistDraft() {
        val state = _uiState.value
        val meeting = state.meeting ?: return
        if (!meeting.isEditable || state.isWriteForbidden) return
        val currentUserId = userId ?: return
        val draft = LifeGroupMeetingRules.buildDraft(meeting, state.entries, state.reportDraft, state.isExtra)
        val previous = persistJob
        persistJob =
            viewModelScope.launch {
                // Small bounded write that must survive leaving the screen (onCleared cancels the scope):
                // NonCancellable, and ordered after the previous write so the latest edit always wins.
                withContext(NonCancellable) {
                    previous?.join()
                    try {
                        if (draft == null) {
                            draftStore.clear(currentUserId, lifeGroupId, meetingDate)
                        } else {
                            draftStore.save(currentUserId, lifeGroupId, meetingDate, draft)
                        }
                    } catch (e: Exception) {
                        // Best effort: a failed local write must never break the screen.
                    }
                }
            }
    }
}
