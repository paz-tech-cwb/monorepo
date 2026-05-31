package br.church.paz.shared.domain.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class MemberJourney(
    val steps: List<JourneyStep> = emptyList(),
)

@Serializable
data class JourneyStep(
    val id: String,
    val title: String,
    val description: String? = null,
    val order: Int,
    val status: JourneyStepStatus,
    @SerialName("completed_at") val completedAt: String? = null,
)

@Serializable
enum class JourneyStepStatus {
    @SerialName("completed")   completed,
    @SerialName("in_progress") in_progress,
    @SerialName("pending")     pending,
}
