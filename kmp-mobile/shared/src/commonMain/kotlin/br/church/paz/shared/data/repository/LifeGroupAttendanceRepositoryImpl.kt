package br.church.paz.shared.data.repository

import br.church.paz.shared.data.remote.throwOnClientOrServerError
import br.church.paz.shared.domain.model.LifeGroupAttendance
import br.church.paz.shared.domain.model.LifeGroupAttendanceEntry
import br.church.paz.shared.domain.repository.LifeGroupAttendanceRepository
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.put
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

class LifeGroupAttendanceRepositoryImpl(
    private val client: HttpClient,
) : LifeGroupAttendanceRepository {

    @Throws(Exception::class)
    override suspend fun getHistory(lifeGroupId: Int): List<LifeGroupAttendance> {
        val httpResponse = client.get("api/life-groups/$lifeGroupId/attendance")
        httpResponse.throwOnClientOrServerError()
        return httpResponse.body<List<LifeGroupAttendanceDto>>().map { it.toDomain() }
    }

    @Throws(Exception::class)
    override suspend fun getByDate(lifeGroupId: Int, date: String): LifeGroupAttendance {
        val httpResponse = client.get("api/life-groups/$lifeGroupId/attendance/$date")
        httpResponse.throwOnClientOrServerError()
        return httpResponse.body<LifeGroupAttendanceDto>().toDomain()
    }

    @Throws(Exception::class)
    override suspend fun save(
        lifeGroupId: Int,
        date: String,
        entries: List<LifeGroupAttendanceEntry>,
    ): LifeGroupAttendance {
        val httpResponse =
            client.put("api/life-groups/$lifeGroupId/attendance/$date") {
                contentType(ContentType.Application.Json)
                setBody(
                    UpsertAttendanceRequest(
                        entries = entries.map {
                            AttendanceEntryRequest(userId = it.userId, present = it.present)
                        },
                    ),
                )
            }
        httpResponse.throwOnClientOrServerError()
        return httpResponse.body<LifeGroupAttendanceDto>().toDomain()
    }
}

@Serializable
private data class AttendanceEntryRequest(
    @SerialName("user_id") val userId: Int,
    val present: Boolean,
)

@Serializable
private data class UpsertAttendanceRequest(
    val entries: List<AttendanceEntryRequest>,
)

@Serializable
private data class LifeGroupAttendanceEntryDto(
    @SerialName("user_id") val userId: Int,
    val name: String,
    val present: Boolean,
) {
    fun toDomain() = LifeGroupAttendanceEntry(userId = userId, name = name, present = present)
}

@Serializable
private data class LifeGroupAttendanceDto(
    val id: String? = null,
    @SerialName("life_group_id") val lifeGroupId: Int,
    @SerialName("meeting_date") val meetingDate: String,
    @SerialName("present_count") val presentCount: Int = 0,
    @SerialName("members_count") val membersCount: Int = 0,
    val entries: List<LifeGroupAttendanceEntryDto> = emptyList(),
    @SerialName("is_draft") val isDraft: Boolean = false,
) {
    fun toDomain() =
        LifeGroupAttendance(
            id = id,
            lifeGroupId = lifeGroupId,
            meetingDate = meetingDate,
            presentCount = presentCount,
            membersCount = membersCount,
            entries = entries.map { it.toDomain() },
            isDraft = isDraft,
        )
}
