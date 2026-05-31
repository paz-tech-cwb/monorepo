package br.church.paz.shared.domain.repository

import br.church.paz.shared.domain.model.Area
import br.church.paz.shared.domain.model.Church
import br.church.paz.shared.domain.model.LifeGroup
import br.church.paz.shared.domain.model.MeetingReportRequest
import br.church.paz.shared.domain.model.Sector

interface ChurchRepository {
    suspend fun getChurch(): Result<Church>
    suspend fun getMyLifeGroups(): Result<List<LifeGroup>>
    suspend fun getAllLifeGroups(): Result<List<LifeGroup>>
    suspend fun getAreas(): Result<List<Area>>
    suspend fun getSectors(): Result<List<Sector>>
    suspend fun submitMeetingReport(report: MeetingReportRequest): Result<Unit>
}
