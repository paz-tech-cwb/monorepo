package br.church.paz.shared.data.repository

import br.church.paz.shared.domain.model.LifeGroupAttendanceEntry
import br.church.paz.shared.domain.model.LifeGroupMeeting
import br.church.paz.shared.domain.model.LifeGroupMeetingAttendance
import br.church.paz.shared.domain.model.LifeGroupMeetingReportInput
import br.church.paz.shared.domain.model.MeetingReportBlockedReason
import br.church.paz.shared.domain.repository.LifeGroupMeetingException
import br.church.paz.shared.domain.repository.LifeGroupMeetingRepository
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.put
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject

class LifeGroupMeetingRepositoryImpl(
    private val client: HttpClient,
) : LifeGroupMeetingRepository {

    @Throws(LifeGroupMeetingException::class, Exception::class)
    override suspend fun getMeeting(
        lifeGroupId: Int,
        date: String,
        extraMeeting: Boolean?,
    ): LifeGroupMeeting {
        val httpResponse =
            client.get("api/life-groups/$lifeGroupId/meetings/$date") {
                if (extraMeeting == true) parameter("extra_meeting", "true")
            }
        httpResponse.throwMeetingErrorIfNeeded()
        return httpResponse.body<MeetingResponseDto>().toDomain()
    }

    @Throws(LifeGroupMeetingException::class, Exception::class)
    override suspend fun saveAttendance(
        lifeGroupId: Int,
        date: String,
        entries: List<LifeGroupAttendanceEntry>,
        extraMeeting: Boolean?,
    ): LifeGroupMeeting =
        put(
            lifeGroupId,
            date,
            UpsertMeetingRequest(
                attendance =
                    MeetingAttendanceRequest(
                        entries = entries.map { MeetingEntryRequest(userId = it.userId, present = it.present) },
                    ),
                extraMeeting = extraMeeting,
            ),
        )

    @Throws(LifeGroupMeetingException::class, Exception::class)
    override suspend fun saveReport(
        lifeGroupId: Int,
        date: String,
        report: LifeGroupMeetingReportInput,
    ): LifeGroupMeeting = put(lifeGroupId, date, UpsertMeetingRequest(report = report.toRequest()))

    private suspend fun put(
        lifeGroupId: Int,
        date: String,
        request: UpsertMeetingRequest,
    ): LifeGroupMeeting {
        val httpResponse =
            client.put("api/life-groups/$lifeGroupId/meetings/$date") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }
        httpResponse.throwMeetingErrorIfNeeded()
        return httpResponse.body<MeetingResponseDto>().toDomain()
    }
}

/**
 * Raises a [LifeGroupMeetingException] carrying the Nest error body's `code` and `message`
 * (`message` is an array for class-validator failures: joined with "; ").
 */
internal suspend fun HttpResponse.throwMeetingErrorIfNeeded() {
    if (status.isSuccess()) return
    val text = runCatching { bodyAsText() }.getOrDefault("")
    val obj = runCatching { Json.parseToJsonElement(text).jsonObject }.getOrNull()
    val code = (obj?.get("code") as? JsonPrimitive)?.contentOrNull
    val message =
        when (val raw = obj?.get("message")) {
            is JsonPrimitive -> raw.contentOrNull
            is JsonArray -> raw.joinToString("; ") { (it as? JsonPrimitive)?.contentOrNull.orEmpty() }
            else -> null
        }
    throw LifeGroupMeetingException(statusCode = status.value, code = code, serverMessage = message)
}

// ---- request DTOs (wire contract: snake_case, see backend UpsertLifeGroupMeetingDto) -----------
// Properties with a default (null) are omitted from the JSON (encodeDefaults = false), which is what
// the backend expects for "not sent"; required fields have no default so they are always encoded.

@Serializable
private data class UpsertMeetingRequest(
    val attendance: MeetingAttendanceRequest? = null,
    val report: MeetingReportRequest? = null,
    @SerialName("extra_meeting") val extraMeeting: Boolean? = null,
)

@Serializable
private data class MeetingAttendanceRequest(
    val entries: List<MeetingEntryRequest>,
)

@Serializable
private data class MeetingEntryRequest(
    @SerialName("user_id") val userId: Int,
    val present: Boolean,
)

@Serializable
private data class MeetingReportRequest(
    @SerialName("kids_0_to_11") val kids0To11: Int,
    val guests: Int,
    val mdas: Int,
    val offering: String,
    @SerialName("committed_at_tadel") val committedAtTadel: Int,
    @SerialName("committed_at_culto") val committedAtCulto: Int,
    @SerialName("leader_attended") val leaderAttended: List<String>,
    @SerialName("disciples_count") val disciplesCount: Int,
    @SerialName("disciples_discipled_this_week") val disciplesDiscipledThisWeek: Int,
    @SerialName("pastoring_activity_type") val pastoringActivityType: List<String>,
    @SerialName("pastoring_activity_other") val pastoringActivityOther: String? = null,
    @SerialName("training_activity_type") val trainingActivityType: List<String>,
    @SerialName("training_activity_other") val trainingActivityOther: String? = null,
)

private fun LifeGroupMeetingReportInput.toRequest() =
    MeetingReportRequest(
        kids0To11 = kids0To11,
        guests = guests,
        mdas = mdas,
        offering = offering,
        committedAtTadel = committedAtTadel,
        committedAtCulto = committedAtCulto,
        leaderAttended = leaderAttended,
        disciplesCount = disciplesCount,
        disciplesDiscipledThisWeek = disciplesDiscipledThisWeek,
        pastoringActivityType = pastoringActivityType,
        pastoringActivityOther = pastoringActivityOther,
        trainingActivityType = trainingActivityType,
        trainingActivityOther = trainingActivityOther,
    )

// ---- response DTOs ---------------------------------------------------------------------------

@Serializable
private data class MeetingEntryDto(
    @SerialName("user_id") val userId: Int,
    val name: String = "",
    val present: Boolean = false,
)

@Serializable
private data class MeetingAttendanceDto(
    val id: String? = null,
    @SerialName("meeting_date") val meetingDate: String,
    @SerialName("present_count") val presentCount: Int = 0,
    @SerialName("members_count") val membersCount: Int = 0,
    val entries: List<MeetingEntryDto> = emptyList(),
    @SerialName("is_draft") val isDraft: Boolean = false,
    @SerialName("is_extra") val isExtra: Boolean = false,
    @SerialName("default_present") val defaultPresent: Boolean? = null,
) {
    fun toDomain() =
        LifeGroupMeetingAttendance(
            id = id,
            meetingDate = meetingDate,
            presentCount = presentCount,
            membersCount = membersCount,
            entries = entries.map { LifeGroupAttendanceEntry(userId = it.userId, name = it.name, present = it.present) },
            isDraft = isDraft,
            isExtra = isExtra,
            defaultPresent = defaultPresent,
        )
}

@Serializable
private data class MeetingDerivedDto(
    @SerialName("committed_members") val committedMembers: Int? = null,
    @SerialName("committed_members_present") val committedMembersPresent: Int? = null,
)

@Serializable
private data class MeetingResponseDto(
    @SerialName("life_group_id") val lifeGroupId: Int,
    @SerialName("meeting_date") val meetingDate: String,
    val attendance: MeetingAttendanceDto? = null,
    val report: LifeGroupReportDto? = null,
    val derived: MeetingDerivedDto? = null,
    // Safe defaults: unknown permission = read-only.
    @SerialName("can_write") val canWrite: Boolean = false,
    @SerialName("can_edit") val canEdit: Boolean = false,
    @SerialName("edit_deadline") val editDeadline: String = "",
    @SerialName("report_blocked_reason") val reportBlockedReason: String? = null,
) {
    fun toDomain() =
        LifeGroupMeeting(
            lifeGroupId = lifeGroupId,
            meetingDate = meetingDate,
            attendance = attendance?.toDomain(),
            report = report?.toDomain(),
            committedMembers = derived?.committedMembers,
            committedMembersPresent = derived?.committedMembersPresent,
            canWrite = canWrite,
            canEdit = canEdit,
            editDeadline = editDeadline,
            reportBlockedReason =
                when (reportBlockedReason) {
                    null -> null
                    "group_has_no_sector" -> MeetingReportBlockedReason.GROUP_HAS_NO_SECTOR
                    "sector_has_no_area" -> MeetingReportBlockedReason.SECTOR_HAS_NO_AREA
                    else -> MeetingReportBlockedReason.UNKNOWN
                },
        )
}
