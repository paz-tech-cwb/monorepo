package br.church.paz.shared.data.repository

import br.church.paz.shared.domain.model.Area
import br.church.paz.shared.domain.model.Church
import br.church.paz.shared.domain.model.LifeGroup
import br.church.paz.shared.domain.model.MeetingReportRequest
import br.church.paz.shared.domain.model.Sector
import br.church.paz.shared.domain.repository.ChurchRepository
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType

class ChurchRepositoryImpl(private val client: HttpClient) : ChurchRepository {

    @Throws(Exception::class)
    override suspend fun getChurch(): Church =
        client.get("api/church").body()

    @Throws(Exception::class)
    override suspend fun getMyLifeGroups(): List<LifeGroup> =
        client.get("api/life-groups/me").body()

    @Throws(Exception::class)
    override suspend fun getAllLifeGroups(): List<LifeGroup> =
        client.get("api/life-groups/my-groups").body()

    @Throws(Exception::class)
    override suspend fun getAreas(): List<Area> =
        client.get("api/areas").body()

    @Throws(Exception::class)
    override suspend fun getSectors(): List<Sector> =
        client.get("api/sectors").body()

    @Throws(Exception::class)
    override suspend fun submitMeetingReport(report: MeetingReportRequest) {
        client.post("api/meeting-reports") {
            contentType(ContentType.Application.Json)
            setBody(report)
        }
    }
}
