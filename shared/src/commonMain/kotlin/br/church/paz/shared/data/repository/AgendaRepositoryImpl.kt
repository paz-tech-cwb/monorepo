package br.church.paz.shared.data.repository

import br.church.paz.shared.domain.model.AgendaEvent
import br.church.paz.shared.domain.repository.AgendaRepository
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

class AgendaRepositoryImpl(private val client: HttpClient) : AgendaRepository {

    @Throws(Exception::class)
    override suspend fun getEvents(page: Int, limit: Int): List<AgendaEvent> {
        val response: List<EventDto> = client.get("api/events") {
            parameter("page", page)
            parameter("limit", limit)
        }.body()
        return response.map { it.toDomain() }
    }
}

@Serializable
private data class EventDto(
    val id: Int,
    val title: String,
    @SerialName("initial_date") val initialDate: String,
    val description: String? = null,
    @SerialName("final_date") val finalDate: String? = null,
    @SerialName("recurrence_type") val recurrenceType: String? = null,
    val location: String? = null,
    @SerialName("image_url") val imageUrl: String? = null,
) {
    fun toDomain() = AgendaEvent(
        id = id.toString(),
        title = title,
        description = description,
        startDate = initialDate,
        endDate = finalDate,
        location = location,
        imageUrl = imageUrl,
        recurrenceType = recurrenceType,
    )
}
