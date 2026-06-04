package br.church.paz.shared.domain.repository

import br.church.paz.shared.domain.model.Area
import br.church.paz.shared.domain.model.Church
import br.church.paz.shared.domain.model.LifeGroup
import br.church.paz.shared.domain.model.MeetingReportRequest
import br.church.paz.shared.domain.model.Sector

interface ChurchRepository {
    @Throws(Exception::class)
    suspend fun getChurch(): Church
    @Throws(Exception::class)
    suspend fun getMyLifeGroups(): List<LifeGroup>
    @Throws(Exception::class)
    suspend fun getAllLifeGroups(): List<LifeGroup>
    @Throws(Exception::class)
    suspend fun getAreas(): List<Area>
    @Throws(Exception::class)
    suspend fun getSectors(): List<Sector>
    @Throws(Exception::class)
    suspend fun submitMeetingReport(report: MeetingReportRequest)
}
