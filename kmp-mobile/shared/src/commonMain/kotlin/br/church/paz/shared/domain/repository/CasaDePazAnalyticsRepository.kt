package br.church.paz.shared.domain.repository

import br.church.paz.shared.domain.model.CasaDePazAnalyticsSummary

interface CasaDePazAnalyticsRepository {
    // `from`/`to` are "YYYY-MM-DD" — omit to default to the server's window
    // (6 months back, start of month, through today).
    @Throws(Exception::class)
    suspend fun getSummary(
        from: String? = null,
        to: String? = null,
    ): CasaDePazAnalyticsSummary
}
