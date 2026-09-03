package br.church.paz.shared.data.repository

import br.church.paz.shared.domain.model.AreaSupervisorReportForm
import br.church.paz.shared.domain.model.ConversionForm
import br.church.paz.shared.domain.model.CourseForm
import br.church.paz.shared.domain.model.FormCatalogItem
import br.church.paz.shared.domain.model.GuestForm
import br.church.paz.shared.domain.model.LifeGroupReportForm
import br.church.paz.shared.domain.model.LifeGroupSummary
import br.church.paz.shared.domain.model.MemberRegistrationForm
import br.church.paz.shared.domain.model.MultiplicationForm
import br.church.paz.shared.domain.model.SectorSupervisorReportForm
import br.church.paz.shared.domain.model.ServiceReportForm
import br.church.paz.shared.domain.model.ServiceReportSubmission
import br.church.paz.shared.domain.model.User
import br.church.paz.shared.domain.repository.FormsRepository
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType

class FormsRepositoryImpl(private val client: HttpClient) : FormsRepository {

    @Throws(Exception::class)
    override suspend fun getCatalog(): List<FormCatalogItem> =
        client.get("api/forms").body()

    @Throws(Exception::class)
    override suspend fun searchUsers(query: String): List<User> =
        client.get("api/users") { parameter("q", query) }.body()

    @Throws(Exception::class)
    override suspend fun searchLifeGroups(query: String): List<LifeGroupSummary> =
        client.get("api/life-groups") { parameter("q", query) }.body()

    @Throws(Exception::class)
    override suspend fun submitMemberRegistration(form: MemberRegistrationForm) =
        post("api/forms/member-registrations", form)

    @Throws(Exception::class)
    override suspend fun submitConversion(form: ConversionForm) =
        post("api/forms/form-conversions", form)

    @Throws(Exception::class)
    override suspend fun submitGuest(form: GuestForm) =
        post("api/forms/form-guests", form)

    @Throws(Exception::class)
    override suspend fun submitMultiplication(form: MultiplicationForm) =
        post("api/forms/multiplications", form)

    @Throws(Exception::class)
    override suspend fun submitServiceReport(form: ServiceReportForm) =
        post("api/forms/service-reports", form)

    @Throws(Exception::class)
    override suspend fun submitCourse(form: CourseForm) =
        post("api/forms/member-registrations/courses", form)

    @Throws(Exception::class)
    override suspend fun submitLifeGroupReport(form: LifeGroupReportForm) =
        post("api/forms/life-group-reports", form)

    @Throws(Exception::class)
    override suspend fun submitSectorReport(form: SectorSupervisorReportForm) =
        post("api/forms/sector-supervisor-reports", form)

    @Throws(Exception::class)
    override suspend fun submitAreaReport(form: AreaSupervisorReportForm) =
        post("api/forms/area-supervisor-reports", form)

    @Throws(Exception::class)
    override suspend fun getServiceReportSubmissions(): List<ServiceReportSubmission> =
        client.get("api/forms/service-reports").body()

    private suspend inline fun <reified T : Any> post(path: String, body: T) {
        client.post(path) {
            contentType(ContentType.Application.Json)
            setBody(body)
        }
    }
}
