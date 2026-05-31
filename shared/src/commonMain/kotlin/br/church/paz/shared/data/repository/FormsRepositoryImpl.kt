package br.church.paz.shared.data.repository

import br.church.paz.shared.domain.model.ConversionForm
import br.church.paz.shared.domain.model.CourseForm
import br.church.paz.shared.domain.model.FormCatalogItem
import br.church.paz.shared.domain.model.GuestForm
import br.church.paz.shared.domain.model.MeetingReportRequest
import br.church.paz.shared.domain.model.MemberRegistrationForm
import br.church.paz.shared.domain.model.MultiplicationForm
import br.church.paz.shared.domain.model.ServiceReportForm
import br.church.paz.shared.domain.model.User
import br.church.paz.shared.domain.repository.FormsRepository
import br.church.paz.shared.util.safeRunCatching
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType

class FormsRepositoryImpl(private val client: HttpClient) : FormsRepository {

    override suspend fun getCatalog(): Result<List<FormCatalogItem>> = safeRunCatching {
        client.get("/forms").body()
    }

    override suspend fun lookupUsers(query: String): Result<List<User>> = safeRunCatching {
        client.get("/users/lookup") { parameter("q", query) }.body()
    }

    override suspend fun submitMemberRegistration(form: MemberRegistrationForm): Result<Unit> =
        post("/forms/member-registrations", form)

    override suspend fun submitConversion(form: ConversionForm): Result<Unit> =
        post("/forms/form-conversions", form)

    override suspend fun submitGuest(form: GuestForm): Result<Unit> =
        post("/forms/form-guests", form)

    override suspend fun submitMultiplication(form: MultiplicationForm): Result<Unit> =
        post("/forms/multiplications", form)

    override suspend fun submitServiceReport(form: ServiceReportForm): Result<Unit> =
        post("/forms/service-reports", form)

    override suspend fun submitCourse(form: CourseForm): Result<Unit> =
        post("/forms/member-registrations/courses", form)

    override suspend fun submitLifeGroupReport(report: MeetingReportRequest): Result<Unit> =
        post("/forms/life-group-reports", report)

    override suspend fun submitSectorReport(report: MeetingReportRequest): Result<Unit> =
        post("/forms/sector-supervisor-reports", report)

    override suspend fun submitAreaReport(report: MeetingReportRequest): Result<Unit> =
        post("/forms/area-supervisor-reports", report)

    private suspend inline fun <reified T : Any> post(path: String, body: T): Result<Unit> =
        safeRunCatching {
            client.post(path) {
                contentType(ContentType.Application.Json)
                setBody(body)
            }
            Unit
        }
}
