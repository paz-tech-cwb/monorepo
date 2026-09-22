package br.church.paz.shared.data.repository

import br.church.paz.shared.domain.model.JourneyTrack
import br.church.paz.shared.domain.model.JourneyTrackStep
import br.church.paz.shared.domain.model.JourneyTrackStepSource
import br.church.paz.shared.domain.model.JourneyTrackStepType
import br.church.paz.shared.domain.model.MemberJourney
import br.church.paz.shared.domain.repository.MemberJourneyRepository
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

class MemberJourneyRepositoryImpl(private val client: HttpClient) : MemberJourneyRepository {

    @Throws(Exception::class)
    override suspend fun getMemberJourney(): MemberJourney {
        val dto: CurrentTrackResponseDto = client.get("api/journey-tracks/me").body()
        return MemberJourney(
            track = dto.track?.toDomain(),
            allStepsComplete = dto.allStepsComplete,
        )
    }
}

@Serializable
private data class CurrentTrackResponseDto(
    val track: JourneyTrackDto? = null,
    @SerialName("all_steps_complete") val allStepsComplete: Boolean = false,
)

@Serializable
private data class JourneyTrackDto(
    val track: JourneyTrackInfoDto,
    val steps: List<JourneyTrackStepDto>,
    @SerialName("progress_percentage") val progressPercentage: Int,
) {
    fun toDomain(): JourneyTrack =
        JourneyTrack(
            key = track.key,
            title = track.title,
            description = track.description,
            eligibilityText = track.eligibilityText,
            progressPercentage = progressPercentage,
            steps = steps.map { it.toDomain() },
        )
}

@Serializable
private data class JourneyTrackInfoDto(
    val key: String,
    val title: String,
    val description: String? = null,
    @SerialName("eligibility_text") val eligibilityText: String? = null,
    @SerialName("sort_order") val sortOrder: Int = 0,
)

@Serializable
private data class JourneyTrackStepDto(
    val key: String? = null,
    @SerialName("sort_order") val sortOrder: Int = 0,
    val type: String,
    val title: String,
    val description: String? = null,
    @SerialName("course_id") val courseId: String? = null,
    @SerialName("external_url") val externalUrl: String? = null,
    val completed: Boolean,
    @SerialName("completed_at") val completedAt: String? = null,
    val source: String? = null,
    @SerialName("completed_by_name") val completedByName: String? = null,
) {
    fun toDomain(): JourneyTrackStep =
        JourneyTrackStep(
            key = key,
            title = title,
            description = description,
            type = type.toStepType(),
            externalUrl = externalUrl,
            completed = completed,
            completedAt = completedAt,
            source = source?.toStepSource(),
            completedByName = completedByName,
        )
}

private fun String.toStepType(): JourneyTrackStepType =
    when (this) {
        "course_completion" -> JourneyTrackStepType.CourseCompletion
        "manual_approval" -> JourneyTrackStepType.ManualApproval
        "informational" -> JourneyTrackStepType.Informational
        else -> JourneyTrackStepType.Informational
    }

private fun String.toStepSource(): JourneyTrackStepSource =
    when (this) {
        "course_completion" -> JourneyTrackStepSource.CourseCompletion
        "manual_approval" -> JourneyTrackStepSource.ManualApproval
        "legacy_import" -> JourneyTrackStepSource.LegacyImport
        else -> JourneyTrackStepSource.LegacyImport
    }
