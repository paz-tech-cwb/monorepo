package br.church.paz.shared.domain.repository

import br.church.paz.shared.domain.model.LifeGroupAnalyticsScope
import br.church.paz.shared.domain.model.LifeGroupAttendanceAnalytics
import br.church.paz.shared.domain.model.LifeGroupDistributionAnalytics

interface LifeGroupAnalyticsRepository {
    /** The life groups this caller can see analytics for — never every group
     * in the church unless the caller is actually unrestricted (admin/pastor
     * or an area/sector leader whose cascade covers everything requested). */
    @Throws(Exception::class)
    suspend fun getScope(): LifeGroupAnalyticsScope

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
