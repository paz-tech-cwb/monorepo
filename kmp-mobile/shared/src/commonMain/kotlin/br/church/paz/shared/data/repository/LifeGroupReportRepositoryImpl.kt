package br.church.paz.shared.data.repository

import br.church.paz.shared.data.remote.throwOnClientOrServerError
import br.church.paz.shared.domain.model.LifeGroupWeeklyReport
import br.church.paz.shared.domain.repository.LifeGroupReportRepository
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive

class LifeGroupReportRepositoryImpl(
    private val client: HttpClient,
) : LifeGroupReportRepository {

    @Throws(Exception::class)
    override suspend fun getReports(lifeGroupId: Int): List<LifeGroupWeeklyReport> {
        val httpResponse =
            client.get("api/forms/life-group-reports") {
                parameter("life_group_id", lifeGroupId)
            }
        httpResponse.throwOnClientOrServerError()
        return httpResponse.body<List<LifeGroupReportDto>>().map { it.toDomain() }
    }

    @Throws(Exception::class)
    override suspend fun getReport(reportId: String): LifeGroupWeeklyReport {
        val httpResponse = client.get("api/forms/life-group-reports/$reportId")
        httpResponse.throwOnClientOrServerError()
        return httpResponse.body<LifeGroupReportDto>().toDomain()
    }
}

@Serializable
internal data class SubmittedByDto(
    val name: String? = null,
)

// Wire contract: snake_case. Multi-valued and numeric-ish fields are read as raw JSON so a
// string/array (or number/string for `offering`) difference never fails the whole list.
@Serializable
internal data class LifeGroupReportDto(
    val id: String,
    val date: String,
    @SerialName("life_group_id") val lifeGroupId: Int = 0,
    @SerialName("committed_members") val committedMembers: Int = 0,
    @SerialName("committed_members_present") val committedMembersPresent: Int = 0,
    @SerialName("kids_0_to_11") val kids0To11: Int = 0,
    val guests: Int = 0,
    val mdas: Int = 0,
    val offering: JsonElement? = null,
    @SerialName("committed_at_tadel") val committedAtTadel: Int = 0,
    @SerialName("committed_at_culto") val committedAtCulto: Int = 0,
    @SerialName("leader_attended") val leaderAttended: JsonElement? = null,
    @SerialName("disciples_count") val disciplesCount: Int = 0,
    @SerialName("disciples_discipled_this_week") val disciplesDiscipledThisWeek: Int = 0,
    @SerialName("pastoring_activity_type") val pastoringActivityType: JsonElement? = null,
    @SerialName("pastoring_activity_other") val pastoringActivityOther: String? = null,
    @SerialName("training_activity_type") val trainingActivityType: JsonElement? = null,
    @SerialName("training_activity_other") val trainingActivityOther: String? = null,
    @SerialName("submitted_by") val submittedBy: SubmittedByDto? = null,
    @SerialName("created_at") val createdAt: String? = null,
) {
    fun toDomain() =
        LifeGroupWeeklyReport(
            id = id,
            date = date,
            lifeGroupId = lifeGroupId,
            committedMembers = committedMembers,
            committedMembersPresent = committedMembersPresent,
            kids0To11 = kids0To11,
            guests = guests,
            mdas = mdas,
            offering = offering.asText() ?: "0",
            committedAtTadel = committedAtTadel,
            committedAtCulto = committedAtCulto,
            leaderAttended = leaderAttended.asStringList(),
            disciplesCount = disciplesCount,
            disciplesDiscipledThisWeek = disciplesDiscipledThisWeek,
            pastoringActivityType = pastoringActivityType.asStringList(),
            pastoringActivityOther = pastoringActivityOther?.takeIf { it.isNotBlank() },
            trainingActivityType = trainingActivityType.asStringList(),
            trainingActivityOther = trainingActivityOther?.takeIf { it.isNotBlank() },
            submittedByName = submittedBy?.name?.takeIf { it.isNotBlank() },
            createdAt = createdAt,
        )
}

private fun JsonElement?.asText(): String? =
    when (this) {
        is JsonPrimitive -> if (this is JsonNull) null else content
        else -> null
    }

private fun JsonElement?.asStringList(): List<String> =
    when (this) {
        is JsonArray -> mapNotNull { it.asText()?.takeIf { s -> s.isNotBlank() } }
        is JsonPrimitive -> asText()?.takeIf { it.isNotBlank() }?.let { listOf(it) } ?: emptyList()
        else -> emptyList()
    }
