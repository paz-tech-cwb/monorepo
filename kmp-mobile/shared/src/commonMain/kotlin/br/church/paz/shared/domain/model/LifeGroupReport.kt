package br.church.paz.shared.domain.model

/**
 * A weekly life group report (form `life-group-reports`), read-only on mobile.
 *
 * Multi-valued fields are always lists, regardless of how the backend serialized them
 * (array or single string); `offering` keeps the backend's decimal string untouched.
 */
data class LifeGroupWeeklyReport(
    val id: String,
    // ISO `yyyy-MM-dd`.
    val date: String,
    val lifeGroupId: Int,
    val committedMembers: Int,
    val committedMembersPresent: Int,
    val kids0To11: Int,
    val guests: Int,
    val mdas: Int,
    val offering: String,
    val committedAtTadel: Int,
    val committedAtCulto: Int,
    val leaderAttended: List<String>,
    val disciplesCount: Int,
    val disciplesDiscipledThisWeek: Int,
    val pastoringActivityType: List<String>,
    val pastoringActivityOther: String?,
    val trainingActivityType: List<String>,
    val trainingActivityOther: String?,
    // Display name of the author; null when the backend did not include it.
    val submittedByName: String?,
    val createdAt: String?,
)
