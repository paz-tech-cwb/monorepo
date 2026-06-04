package br.church.paz.shared.data.repository

import br.church.paz.shared.domain.model.AcademyContent
import br.church.paz.shared.domain.model.Course
import br.church.paz.shared.domain.model.CourseTrack
import br.church.paz.shared.domain.repository.AcademyRepository
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

class AcademyRepositoryImpl(private val client: HttpClient) : AcademyRepository {
    @Throws(Exception::class)
    override suspend fun getAcademyContent(): AcademyContent {
        val response: AcademyResponse = client.get("api/academy").body()
        return AcademyContent(tracks = response.tracks.map { it.toDomain() })
    }
}

@Serializable
private data class AcademyResponse(val tracks: List<TrackDto> = emptyList())

@Serializable
private data class TrackDto(
    val id: String,
    val title: String,
    val description: String? = null,
    @SerialName("sort_order") val sortOrder: Int = 0,
    val courses: List<CourseDto> = emptyList(),
) {
    fun toDomain() = CourseTrack(
        id          = id,
        title       = title,
        description = description,
        courses     = courses.map { it.toDomain() },
    )
}

@Serializable
private data class CourseDto(
    val id: String,
    val title: String,
    val description: String? = null,
    @SerialName("thumbnail_url") val thumbnailUrl: String? = null,
) {
    fun toDomain() = Course(
        id           = id,
        title        = title,
        description  = description,
        thumbnailUrl = thumbnailUrl,
    )
}
