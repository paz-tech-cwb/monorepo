package br.church.paz.android.ui.features.lifegroupmeeting

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.data.remote.anyHttpStatusCodeOrNull
import br.church.paz.shared.data.remote.httpErrorCodeOrNull
import br.church.paz.shared.domain.model.LifeGroupMeetingErrors
import br.church.paz.shared.domain.model.LifeGroupMeetingRules
import br.church.paz.shared.domain.repository.LifeGroupAttendanceRepository
import br.church.paz.shared.domain.repository.LifeGroupReportRepository
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * "Reuniões" of one life group: the saved attendance records joined with the weekly reports by date
 * (existing endpoints, no dedicated history endpoint), plus the "Nova reunião" entry.
 */
class LifeGroupMeetingHistoryViewModel(
    private val lifeGroupId: Int,
    private val attendanceRepository: LifeGroupAttendanceRepository,
    private val reportRepository: LifeGroupReportRepository,
    // The group's fixed weekday, handed over by the group detail (null/blank: "Sem dia fixo" or unknown).
    meetingDay: String?,
    // `LifeGroupMeetingRules.canWrite(role, isGroupLeadership)` from the group detail. Default false (read-only):
    // a supervisor sees the history but never gets "Nova reunião". The server stays the authority.
    canWrite: Boolean = false,
    private val today: () -> String = { LifeGroupMeetingRules.todayInSaoPaulo(System.currentTimeMillis()) },
) : ViewModel() {
    private val _uiState = MutableStateFlow(LifeGroupMeetingHistoryUiState(meetingDay = meetingDay?.takeIf { it.isNotBlank() }, canWrite = canWrite))
    val uiState: StateFlow<LifeGroupMeetingHistoryUiState> = _uiState.asStateFlow()

    private val _effect = Channel<LifeGroupMeetingHistoryEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    private var loadJob: Job? = null

    init {
        load(showSkeleton = true)
    }

    fun load() = load(showSkeleton = true)

    /** Pull-to-refresh / on-resume entry point: same load path without the full-screen skeleton. */
    fun refresh() {
        // The first load runs from init and the lifecycle observer fires ON_RESUME right after: never
        // start a second, racing load while one is in flight.
        if (loadJob?.isActive == true) return
        load(showSkeleton = false)
    }

    private fun load(showSkeleton: Boolean) {
        loadJob?.cancel()
        loadJob = viewModelScope.launch {
            // Without data yet the skeleton stays up (never flash the empty state before the first answer).
            _uiState.update {
                val skeleton = showSkeleton || it.meetings.isEmpty()
                it.copy(isLoading = skeleton, isRefreshing = !skeleton, error = null)
            }
            try {
                val attendance = attendanceRepository.getHistory(lifeGroupId)
                // Best effort: without reports the chips just hide.
                val reports = bestEffort { reportRepository.getReports(lifeGroupId) }
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        isRefreshing = false,
                        meetings = LifeGroupMeetingRules.mergeHistory(attendance, reports),
                    )
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        isRefreshing = false,
                        error = LifeGroupMeetingErrors.messageForHttpStatus(e.anyHttpStatusCodeOrNull(), e.httpErrorCodeOrNull()),
                    )
                }
            }
        }
    }

    private suspend fun <T> bestEffort(block: suspend () -> T): T? =
        try {
            block()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            null
        }

    /** The date "Nova reunião" opens with: the latest regular meeting day, or today without a fixed day. */
    fun defaultNewMeetingDate(): String = LifeGroupMeetingRules.defaultNewMeetingDate(_uiState.value.meetingDay, today())

    /** Last selectable day of the date picker (the backend rejects future dates). */
    fun latestSelectableDate(): String = today()

    /** True when [date] is not the group's weekday, so the meeting must be saved as an "extra" one. */
    fun needsExtraMeeting(date: String): Boolean = LifeGroupMeetingRules.needsExtraMeeting(_uiState.value.meetingDay, date)

    fun onMeetingTapped(date: String) {
        viewModelScope.launch { _effect.send(LifeGroupMeetingHistoryEffect.NavigateToMeeting(date)) }
    }

    /** "Nova reunião": ignores a future or invalid date (the picker already blocks them). */
    fun onNewMeetingDateChosen(date: String) {
        if (!_uiState.value.canWrite) return
        if (!LifeGroupMeetingRules.isSelectableDate(date, today())) return
        viewModelScope.launch { _effect.send(LifeGroupMeetingHistoryEffect.NavigateToMeeting(date)) }
    }

    fun onTabSelected(tab: LifeGroupMeetingsTab) {
        _uiState.update { it.copy(selectedTab = tab) }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(LifeGroupMeetingHistoryEffect.NavigateBack) }
    }
}
