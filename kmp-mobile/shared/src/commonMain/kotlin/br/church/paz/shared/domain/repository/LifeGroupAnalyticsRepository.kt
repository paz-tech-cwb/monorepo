package br.church.paz.shared.domain.repository

import br.church.paz.shared.domain.model.LifeGroupAttendanceAnalytics
import br.church.paz.shared.domain.model.LifeGroupDistributionAnalytics

interface LifeGroupAnalyticsRepository {
    // `granularity` defaults to "month" server-side when omitted — pass
    // "meeting" explicitly (with a non-null `month`) to drill into
    // per-meeting-date bars for that month.
    @Throws(Exception::class)
    suspend fun getAttendance(
        year: Int,
        month: Int? = null,
        lifeGroupId: Int? = null,
        granularity: String? = null,
    ): LifeGroupAttendanceAnalytics

    @Throws(Exception::class)
    suspend fun getDistribution(lifeGroupId: Int? = null): LifeGroupDistributionAnalytics
}
