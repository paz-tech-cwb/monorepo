package br.church.paz.shared.domain.repository

import br.church.paz.shared.domain.model.LifeGroupAttendanceEntry
import br.church.paz.shared.domain.model.LifeGroupMeeting
import br.church.paz.shared.domain.model.LifeGroupMeetingDraft
import br.church.paz.shared.domain.model.LifeGroupMeetingReportInput

/**
 * A non-2xx answer of the meetings API. [code] is the backend's machine-readable `code`
 * (`extra_meeting_required`, `edit_window_closed`, `attendance_required`, ...), null when absent.
 * Use `LifeGroupMeetingErrors.message(error)` for pt-BR copy.
 */
class LifeGroupMeetingException(
    val statusCode: Int,
    val code: String?,
    val serverMessage: String?,
) : Exception(serverMessage ?: "HTTP $statusCode")

/**
 * `GET/PUT /api/life-groups/:id/meetings/:date`: one record per (group, date) with two independently
 * saved halves. Save presence first, the report second; PUT is idempotent so retrying is safe.
 */
interface LifeGroupMeetingRepository {
    /**
     * [extraMeeting] true previews the draft of an extra meeting (a date that is not the group's
     * weekday); pass null/false otherwise. Ignored by the server when a record already exists.
     * Throws [LifeGroupMeetingException] for any non-2xx (400 `extra_meeting_required` when the date
     * is not the group's weekday and [extraMeeting] was not set).
     */
    @Throws(LifeGroupMeetingException::class, Exception::class)
    suspend fun getMeeting(
        lifeGroupId: Int,
        date: String,
        extraMeeting: Boolean?,
    ): LifeGroupMeeting

    /**
     * Saves the presence half. [extraMeeting] must be true only when creating an extra meeting
     * (see `LifeGroupMeetingRules.extraFlagForSave`); otherwise null.
     */
    @Throws(LifeGroupMeetingException::class, Exception::class)
    suspend fun saveAttendance(
        lifeGroupId: Int,
        date: String,
        entries: List<LifeGroupAttendanceEntry>,
        extraMeeting: Boolean?,
    ): LifeGroupMeeting

    /** Saves the report half; 409 `attendance_required` when the presence was never saved. */
    @Throws(LifeGroupMeetingException::class, Exception::class)
    suspend fun saveReport(
        lifeGroupId: Int,
        date: String,
        report: LifeGroupMeetingReportInput,
    ): LifeGroupMeeting
}

/**
 * Local (on-device) store of unsaved meeting edits, keyed by (user, group, date) so accounts never
 * see each other's drafts. Cleared on logout via [clearAll].
 */
interface MeetingDraftStore {
    suspend fun read(
        userId: String,
        lifeGroupId: Int,
        date: String,
    ): LifeGroupMeetingDraft?

    suspend fun save(
        userId: String,
        lifeGroupId: Int,
        date: String,
        draft: LifeGroupMeetingDraft,
    )

    suspend fun clear(
        userId: String,
        lifeGroupId: Int,
        date: String,
    )

    /** Removes every meeting draft of every user (called on logout). */
    suspend fun clearAll()
}
