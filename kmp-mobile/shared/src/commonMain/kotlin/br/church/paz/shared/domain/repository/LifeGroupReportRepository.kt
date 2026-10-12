package br.church.paz.shared.domain.repository

import br.church.paz.shared.domain.model.LifeGroupWeeklyReport

interface LifeGroupReportRepository {
    /**
     * Weekly reports of one life group, as returned by the backend (newest first).
     * A 403 (group outside the viewer's scope) surfaces as a thrown client exception.
     */
    @Throws(Exception::class)
    suspend fun getReports(lifeGroupId: Int): List<LifeGroupWeeklyReport>

    /** One weekly report; the backend answers 404 when it is out of the viewer's scope. */
    @Throws(Exception::class)
    suspend fun getReport(reportId: String): LifeGroupWeeklyReport
}
