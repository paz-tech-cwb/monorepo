package br.church.paz.shared.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class CasaDePazAnalyticsRange(
    val from: String,
    val to: String,
)

@Serializable
data class CasaDePazAnalyticsTotals(
    val houses: Int,
    val kids: Int,
    val guests: Int,
    // kids + guests — every person reached across all visits.
    val lives: Int,
    val conversions: Int,
    val conversionRate: Double,
)

@Serializable
data class CasaDePazAnalyticsGrowth(
    // Percent change vs. the most recent prior month with data. `null` when
    // there is no previous-period data to compare against — render no badge.
    val houses: Double?,
    val lives: Double?,
    val guests: Double?,
    val conversions: Double?,
)

@Serializable
data class CasaDePazSeriesPoint(
    val period: String,
    val houses: Int,
    val kids: Int,
    val guests: Int,
    val conversions: Int,
)

@Serializable
data class CasaDePazBySector(
    val label: String,
    val sectorId: Int?,
    val houses: Int,
    val kids: Int,
    val guests: Int,
    val conversions: Int,
)

@Serializable
data class CasaDePazByDay(
    val label: String,
    val houses: Int,
    val guests: Int,
    val conversions: Int,
)

@Serializable
data class CasaDePazAnalyticsComparison(
    // "YYYY-MM" of the most recent month with data used for growth comparisons.
    val period: String,
)

@Serializable
data class CasaDePazAnalyticsSummary(
    val range: CasaDePazAnalyticsRange,
    val totals: CasaDePazAnalyticsTotals,
    val growth: CasaDePazAnalyticsGrowth,
    // `null` when there's no prior month with data to compare against.
    val comparison: CasaDePazAnalyticsComparison?,
    val series: List<CasaDePazSeriesPoint>,
    val bySector: List<CasaDePazBySector>,
    val byDay: List<CasaDePazByDay>,
    // `by_time` is intentionally not modeled here — the "Horário" chart was
    // removed from admin-ui (commit 4494359) and must not be added on mobile.
)
