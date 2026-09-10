package br.church.paz.shared.data.repository

import br.church.paz.shared.data.remote.throwOnClientOrServerError
import br.church.paz.shared.domain.model.LifeGroupAnalyticsScope
import br.church.paz.shared.domain.model.LifeGroupAnalyticsScopeItem
import br.church.paz.shared.domain.model.LifeGroupAttendanceAnalytics
import br.church.paz.shared.domain.model.LifeGroupAttendancePoint
import br.church.paz.shared.domain.model.LifeGroupDistributionAnalytics
import br.church.paz.shared.domain.model.LifeGroupDistributionBucket
import br.church.paz.shared.domain.repository.LifeGroupAnalyticsRepository
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

class LifeGroupAnalyticsRepositoryImpl(
    private val client: HttpClient,
) : LifeGroupAnalyticsRepository {

    @Throws(Exception::class)
    override suspend fun getScope(): LifeGroupAnalyticsScope {
        val httpResponse = client.get("api/life-group-analytics/scope")
        httpResponse.throwOnClientOrServerError()
        return httpResponse.body<LifeGroupAnalyticsScopeDto>().toDomain()
    }

    @Throws(Exception::class)
    override suspend fun getAttendance(
        year: Int,
        month: Int?,
        lifeGroupId: Int?,
        granularity: String?,
    ): LifeGroupAttendanceAnalytics {
        val httpResponse =
            client.get("api/life-group-analytics/attendance") {
                parameter("year", year)
                month?.let { parameter("month", it) }
                lifeGroupId?.let { parameter("life_group_id", it) }
                granularity?.let { parameter("granularity", it) }
            }
        httpResponse.throwOnClientOrServerError()
        return httpResponse.body<LifeGroupAttendanceAnalyticsDto>().toDomain()
    }

    @Throws(Exception::class)
    override suspend fun getDistribution(lifeGroupId: Int?): LifeGroupDistributionAnalytics {
        val httpResponse =
            client.get("api/life-group-analytics/distribution") {
                lifeGroupId?.let { parameter("life_group_id", it) }
            }
        httpResponse.throwOnClientOrServerError()
        return httpResponse.body<LifeGroupDistributionAnalyticsDto>().toDomain()
    }
}

@Serializable
private data class LifeGroupAnalyticsScopeItemDto(
    val id: Int,
    val name: String,
) {
    fun toDomain() = LifeGroupAnalyticsScopeItem(id = id, name = name)
}

@Serializable
private data class LifeGroupAnalyticsScopeDto(
    val unrestricted: Boolean = false,
    @SerialName("life_groups") val lifeGroups: List<LifeGroupAnalyticsScopeItemDto> = emptyList(),
) {
    fun toDomain() =
        LifeGroupAnalyticsScope(
            unrestricted = unrestricted,
            lifeGroups = lifeGroups.map { it.toDomain() },
        )
}

@Serializable
private data class LifeGroupAttendancePointDto(
    val period: String,
    @SerialName("meetings_count") val meetingsCount: Int = 0,
    @SerialName("present_count") val presentCount: Int = 0,
    @SerialName("members_count") val membersCount: Int = 0,
    @SerialName("attendance_rate") val attendanceRate: Double = 0.0,
) {
    fun toDomain() =
        LifeGroupAttendancePoint(
            period = period,
            meetingsCount = meetingsCount,
            presentCount = presentCount,
            membersCount = membersCount,
            attendanceRate = attendanceRate,
        )
}

@Serializable
private data class LifeGroupAttendanceAnalyticsDto(
    val granularity: String,
    val year: Int,
    val month: Int? = null,
    val rows: List<LifeGroupAttendancePointDto> = emptyList(),
) {
    fun toDomain() =
        LifeGroupAttendanceAnalytics(
            granularity = granularity,
            year = year,
            month = month,
            rows = rows.map { it.toDomain() },
        )
}

@Serializable
private data class LifeGroupDistributionBucketDto(
    val label: String,
    val count: Int,
) {
    fun toDomain() = LifeGroupDistributionBucket(label = label, count = count)
}

@Serializable
private data class LifeGroupDistributionAnalyticsDto(
    @SerialName("by_day") val byDay: List<LifeGroupDistributionBucketDto> = emptyList(),
    @SerialName("by_hour") val byHour: List<LifeGroupDistributionBucketDto> = emptyList(),
    @SerialName("by_neighborhood") val byNeighborhood: List<LifeGroupDistributionBucketDto> = emptyList(),
    @SerialName("by_city") val byCity: List<LifeGroupDistributionBucketDto> = emptyList(),
) {
    fun toDomain() =
        LifeGroupDistributionAnalytics(
            byDay = byDay.map { it.toDomain() },
            byHour = byHour.map { it.toDomain() },
            byNeighborhood = byNeighborhood.map { it.toDomain() },
            byCity = byCity.map { it.toDomain() },
        )
}
