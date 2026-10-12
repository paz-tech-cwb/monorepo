package br.church.paz.shared.data.repository

import br.church.paz.shared.data.remote.throwOnClientOrServerError
import br.church.paz.shared.domain.model.LifeGroupTask
import br.church.paz.shared.domain.model.LifeGroupTaskDeclineResult
import br.church.paz.shared.domain.model.LifeGroupTaskEligibilitySource
import br.church.paz.shared.domain.model.LifeGroupTaskMember
import br.church.paz.shared.domain.model.LifeGroupTaskMemberUpdate
import br.church.paz.shared.domain.model.LifeGroupTaskSettings
import br.church.paz.shared.domain.model.LifeGroupTaskStatus
import br.church.paz.shared.domain.model.LifeGroupTaskTemplateSummary
import br.church.paz.shared.domain.repository.LifeGroupTaskRepository
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.put
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class LifeGroupTaskRepositoryImpl(
    private val client: HttpClient,
) : LifeGroupTaskRepository {

    @Throws(Exception::class)
    override suspend fun getMyTasks(): List<LifeGroupTask> {
        val httpResponse = client.get("api/me/life-group-tasks")
        httpResponse.throwOnClientOrServerError()
        return httpResponse.body<List<LifeGroupTaskDto>>().map { it.toDomain() }
    }

    @Throws(Exception::class)
    override suspend fun getMyTask(assignmentId: String): LifeGroupTask {
        val httpResponse = client.get("api/me/life-group-tasks/$assignmentId")
        httpResponse.throwOnClientOrServerError()
        return httpResponse.body<LifeGroupTaskDto>().toDomain()
    }

    @Throws(Exception::class)
    override suspend fun declineTask(assignmentId: String): LifeGroupTaskDeclineResult {
        val httpResponse = client.post("api/me/life-group-tasks/$assignmentId/decline")
        httpResponse.throwOnClientOrServerError()
        return httpResponse.body<DeclineResultDto>().toDomain()
    }

    @Throws(Exception::class)
    override suspend fun getTaskMembers(lifeGroupId: Int): List<LifeGroupTaskMember> {
        val httpResponse = client.get("api/life-groups/$lifeGroupId/task-members")
        httpResponse.throwOnClientOrServerError()
        return httpResponse.body<List<TaskMemberDto>>().map { it.toDomain() }
    }

    @Throws(Exception::class)
    override suspend fun updateTaskMembers(
        lifeGroupId: Int,
        updates: List<LifeGroupTaskMemberUpdate>,
    ): List<LifeGroupTaskMember> {
        val httpResponse =
            client.put("api/life-groups/$lifeGroupId/task-members") {
                contentType(ContentType.Application.Json)
                setBody(buildMembersBody(updates))
            }
        httpResponse.throwOnClientOrServerError()
        return httpResponse.body<List<TaskMemberDto>>().map { it.toDomain() }
    }

    @Throws(Exception::class)
    override suspend fun getTaskSettings(lifeGroupId: Int): LifeGroupTaskSettings {
        val httpResponse = client.get("api/life-groups/$lifeGroupId/task-settings")
        httpResponse.throwOnClientOrServerError()
        return httpResponse.body<TaskSettingsDto>().toDomain()
    }

    @Throws(Exception::class)
    override suspend fun updateTaskSettings(
        lifeGroupId: Int,
        minPresentMeetings: Int,
    ): LifeGroupTaskSettings {
        val httpResponse =
            client.put("api/life-groups/$lifeGroupId/task-settings") {
                contentType(ContentType.Application.Json)
                setBody(TaskSettingsDto(minPresentMeetings = minPresentMeetings))
            }
        httpResponse.throwOnClientOrServerError()
        return httpResponse.body<TaskSettingsDto>().toDomain()
    }

    @Throws(Exception::class)
    override suspend fun getTaskTemplates(lifeGroupId: Int): List<LifeGroupTaskTemplateSummary> {
        val httpResponse = client.get("api/life-groups/$lifeGroupId/task-overrides")
        httpResponse.throwOnClientOrServerError()
        return httpResponse.body<List<TaskOverrideDto>>().map { it.toDomain() }
    }
}

// Built by hand (not a @Serializable DTO) because the backend distinguishes an
// omitted key ("unchanged") from an explicit value; null fields must be omitted
// regardless of the Json instance's explicitNulls/encodeDefaults settings.
internal fun buildMembersBody(updates: List<LifeGroupTaskMemberUpdate>): JsonObject =
    buildJsonObject {
        put(
            "members",
            JsonArray(
                updates.map { update ->
                    buildJsonObject {
                        put("user_id", update.userId)
                        update.eligible?.let { put("eligible", it) }
                        update.note?.let { put("reason", it) }
                        update.excludedTemplateIds?.let { ids ->
                            put("excluded_template_ids", JsonArray(ids.map { JsonPrimitive(it) }))
                        }
                        if (update.resetToAutomatic) put("reset_to_automatic", true)
                    }
                },
            ),
        )
    }

private fun parseStatus(raw: String): LifeGroupTaskStatus =
    when (raw) {
        "assigned" -> LifeGroupTaskStatus.ASSIGNED
        "declined" -> LifeGroupTaskStatus.DECLINED
        "completed" -> LifeGroupTaskStatus.COMPLETED
        else -> LifeGroupTaskStatus.UNKNOWN
    }

private fun parseSource(raw: String): LifeGroupTaskEligibilitySource =
    when (raw) {
        "manual" -> LifeGroupTaskEligibilitySource.MANUAL
        "leader" -> LifeGroupTaskEligibilitySource.LEADER
        "auto" -> LifeGroupTaskEligibilitySource.AUTO
        "pending" -> LifeGroupTaskEligibilitySource.PENDING
        else -> LifeGroupTaskEligibilitySource.UNKNOWN
    }

@Serializable
private data class LifeGroupTaskDto(
    val id: String,
    @SerialName("life_group_id") val lifeGroupId: Int,
    @SerialName("life_group_name") val lifeGroupName: String = "",
    @SerialName("meeting_date") val meetingDate: String,
    @SerialName("task_name") val taskName: String,
    @SerialName("task_description") val taskDescription: String = "",
    @SerialName("task_guidance") val taskGuidance: String = "",
    val status: String,
) {
    fun toDomain() =
        LifeGroupTask(
            id = id,
            lifeGroupId = lifeGroupId,
            lifeGroupName = lifeGroupName,
            meetingDate = meetingDate,
            name = taskName,
            description = taskDescription,
            guidance = taskGuidance,
            status = parseStatus(status),
        )
}

@Serializable
private data class DeclineResultDto(
    val id: String,
    val status: String,
    val reassigned: Boolean = false,
) {
    fun toDomain() =
        LifeGroupTaskDeclineResult(id = id, status = parseStatus(status), reassigned = reassigned)
}

@Serializable
private data class TaskMemberDto(
    @SerialName("user_id") val userId: Int,
    val name: String,
    @SerialName("is_leader") val isLeader: Boolean = false,
    @SerialName("is_co_leader") val isCoLeader: Boolean = false,
    val eligible: Boolean,
    @SerialName("eligibility_source") val eligibilitySource: String = "",
    @SerialName("present_count") val presentCount: Int = 0,
    @SerialName("min_present_meetings") val minPresentMeetings: Int = 0,
    val reason: String? = null,
    @SerialName("excluded_template_ids") val excludedTemplateIds: List<Int> = emptyList(),
) {
    fun toDomain() =
        LifeGroupTaskMember(
            userId = userId,
            name = name,
            isLeader = isLeader,
            isCoLeader = isCoLeader,
            eligible = eligible,
            eligibilitySource = parseSource(eligibilitySource),
            presentCount = presentCount,
            minPresentMeetings = minPresentMeetings,
            note = reason,
            excludedTemplateIds = excludedTemplateIds,
        )
}

@Serializable
private data class TaskSettingsDto(
    @SerialName("min_present_meetings") val minPresentMeetings: Int,
) {
    fun toDomain() = LifeGroupTaskSettings(minPresentMeetings = minPresentMeetings)
}

@Serializable
private data class TaskOverrideDto(
    @SerialName("template_id") val templateId: Int,
    val name: String,
    val description: String = "",
    @SerialName("is_enabled") val isEnabled: Boolean = true,
) {
    fun toDomain() =
        LifeGroupTaskTemplateSummary(
            templateId = templateId,
            name = name,
            description = description,
            isEnabled = isEnabled,
        )
}
