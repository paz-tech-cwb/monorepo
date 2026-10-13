package br.church.paz.shared.domain.model

import kotlinx.serialization.Serializable
import kotlin.math.roundToInt

@Serializable
data class LifeGroupAttendancePoint(
    val period: String,
    val meetingsCount: Int,
    val presentCount: Int,
    val membersCount: Int,
    val attendanceRate: Double,
)

@Serializable
data class LifeGroupAttendanceAnalytics(
    val granularity: String,
    val year: Int,
    val month: Int?,
    val rows: List<LifeGroupAttendancePoint>,
)

@Serializable
data class LifeGroupDistributionBucket(
    val label: String,
    val count: Int,
)

@Serializable
data class LifeGroupDistributionAnalytics(
    val byDay: List<LifeGroupDistributionBucket>,
    val byHour: List<LifeGroupDistributionBucket>,
    val byNeighborhood: List<LifeGroupDistributionBucket>,
    val byCity: List<LifeGroupDistributionBucket>,
)

@Serializable
data class LifeGroupOverview(
    val totalKids: Int,
    val avgMembersPerGroup: Double,
    val groupsBySector: List<LifeGroupDistributionBucket>,
    val membersInGroup: Int,
    val membersTotal: Int,
    // Scoped to groups the current user is actually allowed to query via
    // ?life_group_id= on the attendance/distribution endpoints — use this
    // (not the unscoped GET /api/life-groups) to populate the analytics
    // filter dropdown, so it can never offer a group that 403s.
    val lifeGroups: List<LifeGroupSummary> = emptyList(),
)

/**
 * Totals of the attendance rows of ONE group (the single-group "Relatórios" tab): the overview
 * cards are church-wide, so this is the only summary that is safe to show for a single group.
 * [attendancePercent] is `present / members` over all meetings (0..100), null without any member slot.
 */
data class LifeGroupAttendanceSummary(
    val meetingsCount: Int,
    val presentCount: Int,
    val membersCount: Int,
) {
    val attendancePercent: Int?
        get() = if (membersCount > 0) (presentCount * 100.0 / membersCount).roundToInt() else null
}

fun List<LifeGroupAttendancePoint>.summarizeAttendance(): LifeGroupAttendanceSummary =
    LifeGroupAttendanceSummary(
        meetingsCount = sumOf { it.meetingsCount },
        presentCount = sumOf { it.presentCount },
        membersCount = sumOf { it.membersCount },
    )
