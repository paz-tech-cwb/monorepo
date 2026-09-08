package br.church.paz.shared.data.repository

import br.church.paz.shared.domain.model.Area
import br.church.paz.shared.domain.model.Church
import br.church.paz.shared.domain.model.LifeGroup
import br.church.paz.shared.domain.model.Ministry
import br.church.paz.shared.domain.model.Sector
import br.church.paz.shared.domain.repository.ChurchRepository
import br.church.paz.shared.domain.repository.UpdateLifeGroupRequest
import br.church.paz.shared.domain.repository.UpdateMinistryRequest
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.delete
import io.ktor.client.request.post
import io.ktor.client.request.put
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

class ChurchRepositoryImpl(private val client: HttpClient) : ChurchRepository {

    @Throws(Exception::class)
    override suspend fun getChurch(): Church =
        client.get("api/church").body()

    @Throws(Exception::class)
    override suspend fun getMyLifeGroups(): List<LifeGroup> =
        client.get("api/life-groups/me").body()

    @Throws(Exception::class)
    override suspend fun getAllLifeGroups(): List<LifeGroup> =
        client.get("api/life-groups").body()

    @Throws(Exception::class)
    override suspend fun getAllMinistries(): List<Ministry> =
        client.get("api/ministries").body()

    @Throws(Exception::class)
    override suspend fun getAreas(): List<Area> =
        client.get("api/areas").body()

    @Throws(Exception::class)
    override suspend fun getSectors(): List<Sector> =
        client.get("api/sectors").body()

    @Throws(Exception::class)
    override suspend fun updateLifeGroup(id: Int, request: UpdateLifeGroupRequest): LifeGroup =
        client.put("api/life-groups/$id") {
            contentType(ContentType.Application.Json)
            setBody(
                UpdateLifeGroupBody(
                    name = request.name,
                    location = request.location,
                    meetingDay = request.meetingDay,
                    meetingTime = request.meetingTime,
                    kidsCount = request.kidsCount,
                ),
            )
        }.body()

    @Throws(Exception::class)
    override suspend fun addLifeGroupMember(lifeGroupId: Int, userId: Int) {
        client.post("api/life-groups/$lifeGroupId/members/$userId")
    }

    @Throws(Exception::class)
    override suspend fun removeLifeGroupMember(lifeGroupId: Int, userId: Int) {
        client.delete("api/life-groups/$lifeGroupId/members/$userId")
    }

    @Throws(Exception::class)
    override suspend fun updateMinistry(id: Int, request: UpdateMinistryRequest): Ministry =
        client.put("api/ministries/$id") {
            contentType(ContentType.Application.Json)
            setBody(UpdateMinistryBody(name = request.name, description = request.description))
        }.body()

    @Throws(Exception::class)
    override suspend fun addMinistryMember(ministryId: Int, userId: Int) {
        client.post("api/ministries/$ministryId/members/$userId")
    }

    @Throws(Exception::class)
    override suspend fun removeMinistryMember(ministryId: Int, userId: Int) {
        client.delete("api/ministries/$ministryId/members/$userId")
    }
}

@Serializable
private data class UpdateLifeGroupBody(
    val name: String? = null,
    val location: String? = null,
    @SerialName("meeting_day") val meetingDay: String? = null,
    @SerialName("meeting_time") val meetingTime: String? = null,
    @SerialName("kids_count") val kidsCount: Int? = null,
)

@Serializable
private data class UpdateMinistryBody(
    val name: String? = null,
    val description: String? = null,
)
