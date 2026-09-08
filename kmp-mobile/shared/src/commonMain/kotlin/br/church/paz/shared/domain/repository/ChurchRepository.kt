package br.church.paz.shared.domain.repository

import br.church.paz.shared.domain.model.Area
import br.church.paz.shared.domain.model.Church
import br.church.paz.shared.domain.model.LifeGroup
import br.church.paz.shared.domain.model.Ministry
import br.church.paz.shared.domain.model.Sector

interface ChurchRepository {
    @Throws(Exception::class)
    suspend fun getChurch(): Church
    @Throws(Exception::class)
    suspend fun getMyLifeGroups(): List<LifeGroup>
    @Throws(Exception::class)
    suspend fun getAllLifeGroups(): List<LifeGroup>
    @Throws(Exception::class)
    suspend fun getAllMinistries(): List<Ministry>
    @Throws(Exception::class)
    suspend fun getAreas(): List<Area>
    @Throws(Exception::class)
    suspend fun getSectors(): List<Sector>

    // Leader/admin management — backend enforces LEADERSHIP_ROLES via
    // RolesGuard on all of these; the app only needs to decide when to
    // show the UI, not re-implement the authorization check.
    @Throws(Exception::class)
    suspend fun updateLifeGroup(id: Int, request: UpdateLifeGroupRequest): LifeGroup
    @Throws(Exception::class)
    suspend fun addLifeGroupMember(lifeGroupId: Int, userId: Int)
    @Throws(Exception::class)
    suspend fun removeLifeGroupMember(lifeGroupId: Int, userId: Int)
}

data class UpdateLifeGroupRequest(
    val name: String? = null,
    val location: String? = null,
    val meetingDay: String? = null,
    val meetingTime: String? = null,
    val kidsCount: Int? = null,
)
