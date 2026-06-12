package br.church.paz.shared.domain.repository

import br.church.paz.shared.domain.model.ConversionForm
import br.church.paz.shared.domain.model.CourseForm
import br.church.paz.shared.domain.model.FormCatalogItem
import br.church.paz.shared.domain.model.GuestForm
import br.church.paz.shared.domain.model.LifeGroupReportForm
import br.church.paz.shared.domain.model.MemberRegistrationForm
import br.church.paz.shared.domain.model.MultiplicationForm
import br.church.paz.shared.domain.model.ServiceReportForm
import br.church.paz.shared.domain.model.User

interface FormsRepository {
    @Throws(Exception::class)
    suspend fun getCatalog(): List<FormCatalogItem>
    @Throws(Exception::class)
    suspend fun lookupUsers(query: String): List<User>
    @Throws(Exception::class)
    suspend fun submitMemberRegistration(form: MemberRegistrationForm)
    @Throws(Exception::class)
    suspend fun submitConversion(form: ConversionForm)
    @Throws(Exception::class)
    suspend fun submitGuest(form: GuestForm)
    @Throws(Exception::class)
    suspend fun submitMultiplication(form: MultiplicationForm)
    @Throws(Exception::class)
    suspend fun submitServiceReport(form: ServiceReportForm)
    @Throws(Exception::class)
    suspend fun submitCourse(form: CourseForm)
    @Throws(Exception::class)
    suspend fun submitLifeGroupReport(form: LifeGroupReportForm)
    @Throws(Exception::class)
    suspend fun submitSectorReport(form: LifeGroupReportForm)
    @Throws(Exception::class)
    suspend fun submitAreaReport(form: LifeGroupReportForm)
}
