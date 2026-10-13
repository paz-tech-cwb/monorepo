package br.church.paz.android.ui.features.lifegroupmeeting

import br.church.paz.shared.domain.model.LifeGroupAttendanceEntry
import br.church.paz.shared.domain.model.LifeGroupMeeting
import br.church.paz.shared.domain.model.LifeGroupMeetingReportDraft
import br.church.paz.shared.domain.model.LifeGroupMeetingReportField
import br.church.paz.shared.domain.model.LifeGroupMeetingRules
import br.church.paz.shared.domain.model.LifeGroupMeetingSummary
import br.church.paz.shared.domain.model.MeetingReportBlockedReason

data class LifeGroupMeetingUiState(
    val meetingDate: String,
    val isLoading: Boolean = true,
    val loadError: String? = null,
    // The server said the date is not the group's weekday: the user must tick "Reunião extra" first.
    val needsExtraChoice: Boolean = false,
    val isExtra: Boolean = false,
    val meeting: LifeGroupMeeting? = null,
    // Presence toggles being edited (start from the server entries, plus any restored local draft).
    val entries: List<LifeGroupAttendanceEntry> = emptyList(),
    val reportDraft: LifeGroupMeetingReportDraft = LifeGroupMeetingReportDraft(),
    val reportErrors: Map<LifeGroupMeetingReportField, String> = emptyMap(),
    val isSavingAttendance: Boolean = false,
    val isSavingReport: Boolean = false,
    val attendanceError: String? = null,
    val attendanceNotice: String? = null,
    val reportError: String? = null,
    val reportNotice: String? = null,
    val draftRestored: Boolean = false,
) {
    /** Past the edit window for this user (admins bypass it server side through `can_edit`). */
    val isReadOnly: Boolean get() = meeting?.canEdit == false

    val isAttendanceSaved: Boolean get() = meeting?.isAttendanceSaved == true

    val isReportSaved: Boolean get() = meeting?.isReportSaved == true

    val attendanceDirty: Boolean
        get() = meeting?.let { LifeGroupMeetingRules.isAttendanceDirty(it, entries) } ?: false

    val reportDirty: Boolean
        get() = meeting?.let { LifeGroupMeetingRules.isReportDirty(it, reportDraft) } ?: false

    /** The "Reunião extra" switch: shown until the first save, then the type is fixed. */
    val showExtraToggle: Boolean
        get() = needsExtraChoice || (meeting?.attendance?.isDraft == true && isExtra && !isReadOnly)

    val isExtraLocked: Boolean get() = meeting?.attendance?.isDraft == false

    val isBusy: Boolean get() = isSavingAttendance || isSavingReport

    val canSaveAttendance: Boolean
        get() =
            meeting?.attendance != null &&
                !isReadOnly &&
                entries.isNotEmpty() &&
                !isBusy &&
                (!isAttendanceSaved || attendanceDirty)

    val reportBlockedReason: MeetingReportBlockedReason? get() = meeting?.reportBlockedReason

    /** The report can be typed and saved: attendance is saved and not edited since, the group can file reports. */
    val canEditReport: Boolean
        get() = meeting != null && !isReadOnly && reportBlockedReason == null && isAttendanceSaved && !attendanceDirty

    // A never-touched form must not be saveable: it would file an all-zero report with offering 0.00
    // (and silence the reminder follow-up). The first save needs at least one edited field.
    val canSaveReport: Boolean
        get() = canEditReport && !isBusy && reportDirty

    /** Why the report cannot be edited right now (null when it can, or when the screen is read-only). */
    val reportLockedMessage: String?
        get() {
            val blocked = reportBlockedReason
            return when {
                meeting == null || isReadOnly -> null
                blocked != null -> LifeGroupMeetingRules.reportBlockedMessage(blocked)
                meeting?.attendance == null && meeting?.report != null -> LifeGroupMeetingRules.legacyReportMessage()
                !isAttendanceSaved -> "Salve a presença para liberar o relatório."
                attendanceDirty -> "Salve as alterações da presença antes de enviar o relatório."
                else -> null
            }
        }

    // Live numbers, shown read-only in the report ("calculado da presença"): the server derives the
    // committed_* snapshots from the saved attendance.
    val committedMembers: Int get() = entries.size

    val committedMembersPresent: Int get() = LifeGroupMeetingRules.presentCount(entries)
}

sealed class LifeGroupMeetingEffect {
    data object NavigateBack : LifeGroupMeetingEffect()
}

data class LifeGroupMeetingHistoryUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val meetings: List<LifeGroupMeetingSummary> = emptyList(),
    val error: String? = null,
    // The group's fixed weekday ("Quarta-feira"), null for "Sem dia fixo" or when it could not be loaded.
    val meetingDay: String? = null,
)

sealed class LifeGroupMeetingHistoryEffect {
    data object NavigateBack : LifeGroupMeetingHistoryEffect()

    data class NavigateToMeeting(
        val date: String,
    ) : LifeGroupMeetingHistoryEffect()
}
