package br.church.paz.shared.data.repository

import br.church.paz.shared.domain.model.Area
import br.church.paz.shared.domain.model.Church
import br.church.paz.shared.domain.model.LifeGroup
import br.church.paz.shared.domain.model.MeetingReportRequest
import br.church.paz.shared.domain.model.Sector
import br.church.paz.shared.domain.repository.ChurchRepository
import br.church.paz.shared.util.safeRunCatching
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType

class ChurchRepositoryImpl(private val client: HttpClient) : ChurchRepository {

    override suspend fun getChurch(): Result<Church> = safeRunCatching {
        client.get("/church").body()
    }

    override suspend fun getMyLifeGroups(): Result<List<LifeGroup>> = safeRunCatching {
        client.get("/life-groups/me").body()
    }

    override suspend fun getAllLifeGroups(): Result<List<LifeGroup>> = safeRunCatching {
        client.get("/life-groups/my-groups").body()
    }

    override suspend fun getAreas(): Result<List<Area>> = safeRunCatching {
        client.get("/areas").body()
    }

    override suspend fun getSectors(): Result<List<Sector>> = safeRunCatching {
        client.get("/sectors").body()
    }

    override suspend fun submitMeetingReport(report: MeetingReportRequest): Result<Unit> = safeRunCatching {
        client.post("/meeting-reports") {
            contentType(ContentType.Application.Json)
            setBody(report)
        }
        Unit
    }
}
