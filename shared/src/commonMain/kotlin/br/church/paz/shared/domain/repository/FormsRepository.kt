package br.church.paz.shared.domain.repository

import br.church.paz.shared.domain.model.ConversionForm
import br.church.paz.shared.domain.model.CourseForm
import br.church.paz.shared.domain.model.FormCatalogItem
import br.church.paz.shared.domain.model.GuestForm
import br.church.paz.shared.domain.model.MemberRegistrationForm
import br.church.paz.shared.domain.model.MultiplicationForm
import br.church.paz.shared.domain.model.ServiceReportForm
import br.church.paz.shared.domain.model.User

interface FormsRepository {
    suspend fun getCatalog(): Result<List<FormCatalogItem>>
    suspend fun lookupUsers(query: String): Result<List<User>>
    suspend fun submitMemberRegistration(form: MemberRegistrationForm): Result<Unit>
    suspend fun submitConversion(form: ConversionForm): Result<Unit>
    suspend fun submitGuest(form: GuestForm): Result<Unit>
    suspend fun submitMultiplication(form: MultiplicationForm): Result<Unit>
    suspend fun submitServiceReport(form: ServiceReportForm): Result<Unit>
    suspend fun submitCourse(form: CourseForm): Result<Unit>
    // Life-group / sector / area supervisor reports use MeetingReportRequest shape
    suspend fun submitLifeGroupReport(report: br.church.paz.shared.domain.model.MeetingReportRequest): Result<Unit>
    suspend fun submitSectorReport(report: br.church.paz.shared.domain.model.MeetingReportRequest): Result<Unit>
    suspend fun submitAreaReport(report: br.church.paz.shared.domain.model.MeetingReportRequest): Result<Unit>
}
