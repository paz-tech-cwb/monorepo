package br.church.paz.shared.domain.model

import kotlinx.serialization.Serializable

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
