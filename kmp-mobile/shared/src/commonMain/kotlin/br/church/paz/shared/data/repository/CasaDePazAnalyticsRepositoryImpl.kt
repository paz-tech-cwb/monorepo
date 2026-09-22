package br.church.paz.shared.data.repository

import br.church.paz.shared.data.remote.throwOnClientOrServerError
import br.church.paz.shared.domain.model.CasaDePazAnalyticsComparison
import br.church.paz.shared.domain.model.CasaDePazAnalyticsGrowth
import br.church.paz.shared.domain.model.CasaDePazAnalyticsRange
import br.church.paz.shared.domain.model.CasaDePazAnalyticsSummary
import br.church.paz.shared.domain.model.CasaDePazAnalyticsTotals
import br.church.paz.shared.domain.model.CasaDePazByDay
import br.church.paz.shared.domain.model.CasaDePazBySector
import br.church.paz.shared.domain.model.CasaDePazSeriesPoint
import br.church.paz.shared.domain.repository.CasaDePazAnalyticsRepository
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

class CasaDePazAnalyticsRepositoryImpl(
    private val client: HttpClient,
) : CasaDePazAnalyticsRepository {

    @Throws(Exception::class)
    override suspend fun getSummary(
        from: String?,
        to: String?,
    ): CasaDePazAnalyticsSummary {
        val httpResponse =
            client.get("api/casa-de-paz-analytics/summary") {
                from?.let { parameter("from", it) }
                to?.let { parameter("to", it) }
            }
        httpResponse.throwOnClientOrServerError()
        return httpResponse.body<CasaDePazAnalyticsSummaryDto>().toDomain()
    }
}

@Serializable
private data class CasaDePazAnalyticsRangeDto(
    val from: String,
    val to: String,
) {
    fun toDomain() = CasaDePazAnalyticsRange(from = from, to = to)
}

@Serializable
private data class CasaDePazAnalyticsTotalsDto(
    val houses: Int = 0,
    val kids: Int = 0,
    val guests: Int = 0,
    val lives: Int = 0,
    val conversions: Int = 0,
    @SerialName("conversion_rate") val conversionRate: Double = 0.0,
) {
    fun toDomain() =
        CasaDePazAnalyticsTotals(
            houses = houses,
            kids = kids,
            guests = guests,
            lives = lives,
            conversions = conversions,
            conversionRate = conversionRate,
        )
}

@Serializable
private data class CasaDePazAnalyticsGrowthDto(
    val houses: Double? = null,
    val lives: Double? = null,
    val guests: Double? = null,
    val conversions: Double? = null,
) {
    fun toDomain() =
        CasaDePazAnalyticsGrowth(
            houses = houses,
            lives = lives,
            guests = guests,
            conversions = conversions,
        )
}

@Serializable
private data class CasaDePazSeriesPointDto(
    val period: String,
    val houses: Int = 0,
    val kids: Int = 0,
    val guests: Int = 0,
    val conversions: Int = 0,
) {
    fun toDomain() =
        CasaDePazSeriesPoint(
            period = period,
            houses = houses,
            kids = kids,
            guests = guests,
            conversions = conversions,
        )
}

@Serializable
private data class CasaDePazBySectorDto(
    val label: String,
    @SerialName("sector_id") val sectorId: Int? = null,
    val houses: Int = 0,
    val kids: Int = 0,
    val guests: Int = 0,
    val conversions: Int = 0,
) {
    fun toDomain() =
        CasaDePazBySector(
            label = label,
            sectorId = sectorId,
            houses = houses,
            kids = kids,
            guests = guests,
            conversions = conversions,
        )
}

@Serializable
private data class CasaDePazByDayDto(
    val label: String,
    val houses: Int = 0,
    val guests: Int = 0,
    val conversions: Int = 0,
) {
    fun toDomain() =
        CasaDePazByDay(
            label = label,
            houses = houses,
            guests = guests,
            conversions = conversions,
        )
}

@Serializable
private data class CasaDePazAnalyticsComparisonDto(
    val period: String,
) {
    fun toDomain() = CasaDePazAnalyticsComparison(period = period)
}

@Serializable
private data class CasaDePazAnalyticsSummaryDto(
    val range: CasaDePazAnalyticsRangeDto,
    val totals: CasaDePazAnalyticsTotalsDto,
    val growth: CasaDePazAnalyticsGrowthDto,
    val comparison: CasaDePazAnalyticsComparisonDto? = null,
    val series: List<CasaDePazSeriesPointDto> = emptyList(),
    @SerialName("by_sector") val bySector: List<CasaDePazBySectorDto> = emptyList(),
    @SerialName("by_day") val byDay: List<CasaDePazByDayDto> = emptyList(),
) {
    fun toDomain() =
        CasaDePazAnalyticsSummary(
            range = range.toDomain(),
            totals = totals.toDomain(),
            growth = growth.toDomain(),
            comparison = comparison?.toDomain(),
            series = series.map { it.toDomain() },
            bySector = bySector.map { it.toDomain() },
            byDay = byDay.map { it.toDomain() },
        )
}
