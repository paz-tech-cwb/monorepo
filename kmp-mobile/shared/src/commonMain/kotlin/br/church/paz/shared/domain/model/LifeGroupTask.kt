package br.church.paz.shared.domain.model

import kotlinx.serialization.Serializable

enum class LifeGroupTaskStatus {
    ASSIGNED,
    DECLINED,
    COMPLETED,

    // Forward-compat: a status the app does not know yet.
    UNKNOWN,
}

/** Member-facing assignment guide. Never carries the leader-only eligibility note. */
@Serializable
data class LifeGroupTask(
    val id: String,
    val lifeGroupId: Int,
    val lifeGroupName: String,
    val meetingDate: String,
    val name: String,
    val description: String,
    // Markdown.
    val guidance: String,
    val status: LifeGroupTaskStatus,
)

@Serializable
data class LifeGroupTaskDeclineResult(
    val id: String,
    val status: LifeGroupTaskStatus,
    // True when the backend auto re-rolled the task to another member.
    val reassigned: Boolean,
)

enum class LifeGroupTaskEligibilitySource {
    // Explicit leader decision.
    MANUAL,

    // Leader/co-leader default.
    LEADER,

    // Reached the attendance threshold.
    AUTO,

    // Still below the threshold.
    PENDING,
    UNKNOWN,
}

/** Leader-side view of a member's rotation eligibility. */
@Serializable
data class LifeGroupTaskMember(
    val userId: Int,
    val name: String,
    val isLeader: Boolean,
    val isCoLeader: Boolean,
    val eligible: Boolean,
    val eligibilitySource: LifeGroupTaskEligibilitySource,
    val presentCount: Int,
    val minPresentMeetings: Int,
    // Existing member grandfathered by the migration: "back to automatic" must not be offered
    // (it would drop an established member from the rotation).
    val grandfathered: Boolean = false,
    // Leader-only note. Never shown to the member.
    val note: String?,
    val excludedTemplateIds: List<Int>,
)

/**
 * One member edit for PUT task-members. Null fields are sent as "unchanged".
 * `note`: null = unchanged, "" = clear. `excludedTemplateIds`: null = unchanged, empty = clear.
 * `resetToAutomatic` deletes the explicit row so the automatic rule applies again
 * (then `eligible` is ignored).
 */
data class LifeGroupTaskMemberUpdate(
    val userId: Int,
    val eligible: Boolean? = null,
    val note: String? = null,
    val excludedTemplateIds: List<Int>? = null,
    val resetToAutomatic: Boolean = false,
)

@Serializable
data class LifeGroupTaskSettings(
    val minPresentMeetings: Int,
)

/** Template as listed per group (id + name), used for per-member exclusions. */
@Serializable
data class LifeGroupTaskTemplateSummary(
    val templateId: Int,
    val name: String,
    val description: String,
    // False when the group's leader disabled this template for the group.
    val isEnabled: Boolean,
)
