package br.church.paz.shared.domain.model

data class MemberJourney(
    val steps: List<JourneyStep> = emptyList(),
)

data class JourneyStep(
    val id: String,
    val title: String,
    val description: String? = null,
    val order: Int,
    val status: JourneyStepStatus,
    val completedAt: String? = null,
)

enum class JourneyStepStatus { completed, in_progress, pending }
