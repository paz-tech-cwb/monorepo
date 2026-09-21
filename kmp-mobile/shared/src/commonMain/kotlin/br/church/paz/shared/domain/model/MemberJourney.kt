package br.church.paz.shared.domain.model

data class MemberJourney(
    val tracks: List<JourneyTrack> = emptyList(),
)

data class JourneyTrack(
    val key: String,
    val title: String,
    val description: String? = null,
    val eligibilityText: String? = null,
    val progressPercentage: Int,
    val steps: List<JourneyTrackStep> = emptyList(),
)

data class JourneyTrackStep(
    val key: String?,
    val title: String,
    val description: String? = null,
    val type: JourneyTrackStepType,
    val externalUrl: String? = null,
    val completed: Boolean,
    val completedAt: String? = null,
    val source: JourneyTrackStepSource? = null,
    val completedByName: String? = null,
)

enum class JourneyTrackStepType { CourseCompletion, ManualApproval, Informational }

enum class JourneyTrackStepSource { CourseCompletion, ManualApproval, LegacyImport }
