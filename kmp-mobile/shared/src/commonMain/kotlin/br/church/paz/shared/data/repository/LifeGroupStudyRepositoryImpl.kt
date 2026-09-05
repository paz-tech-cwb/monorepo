package br.church.paz.shared.data.repository

import br.church.paz.shared.domain.model.LifeGroupStudy
import br.church.paz.shared.domain.model.LifeGroupStudyPage
import br.church.paz.shared.domain.repository.LifeGroupStudyRepository
import br.church.paz.shared.data.remote.throwOnClientOrServerError
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.patch
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

class LifeGroupStudyRepositoryImpl(private val client: HttpClient) : LifeGroupStudyRepository {

    @Throws(Exception::class)
    override suspend fun getStudies(page: Int, limit: Int): LifeGroupStudyPage {
        val httpResponse =
            client.get("api/life-group-studies") {
                parameter("page", page)
                parameter("limit", limit)
            }
        httpResponse.throwOnClientOrServerError()
        val response: LifeGroupStudyListResponse = httpResponse.body()
        return LifeGroupStudyPage(
            items = response.data.map { it.toDomain() },
            total = response.meta.total,
            page = response.meta.page,
            limit = response.meta.limit,
        )
    }

    @Throws(Exception::class)
    override suspend fun getStudy(id: String): LifeGroupStudy {
        val httpResponse = client.get("api/life-group-studies/$id")
        httpResponse.throwOnClientOrServerError()
        return httpResponse.body<LifeGroupStudyDto>().toDomain()
    }

    @Throws(Exception::class)
    override suspend fun createStudy(
        title: String,
        author: String,
        bodyMarkdown: String,
        imageUrl: String?,
    ): LifeGroupStudy {
        val httpResponse =
            client.post("api/life-group-studies") {
                contentType(ContentType.Application.Json)
                setBody(LifeGroupStudyRequest(title = title, author = author, bodyMarkdown = bodyMarkdown, imageUrl = imageUrl))
            }
        httpResponse.throwOnClientOrServerError()
        return httpResponse.body<LifeGroupStudyDto>().toDomain()
    }

    @Throws(Exception::class)
    override suspend fun updateStudy(
        id: String,
        title: String,
        author: String,
        bodyMarkdown: String,
        imageUrl: String?,
    ): LifeGroupStudy {
        val httpResponse =
            client.patch("api/life-group-studies/$id") {
                contentType(ContentType.Application.Json)
                setBody(LifeGroupStudyRequest(title = title, author = author, bodyMarkdown = bodyMarkdown, imageUrl = imageUrl))
            }
        httpResponse.throwOnClientOrServerError()
        return httpResponse.body<LifeGroupStudyDto>().toDomain()
    }

    @Throws(Exception::class)
    override suspend fun deleteStudy(id: String) {
        val httpResponse = client.delete("api/life-group-studies/$id")
        httpResponse.throwOnClientOrServerError()
    }
}

@Serializable
private data class LifeGroupStudyListResponse(
    val data: List<LifeGroupStudyDto> = emptyList(),
    val meta: LifeGroupStudyMetaDto = LifeGroupStudyMetaDto(),
)

@Serializable
private data class LifeGroupStudyMetaDto(
    val total: Int = 0,
    val page: Int = 1,
    val limit: Int = 20,
)

@Serializable
private data class LifeGroupStudyRequest(
    val title: String,
    val author: String,
    @SerialName("body_markdown") val bodyMarkdown: String,
    @SerialName("image_url") val imageUrl: String? = null,
)

@Serializable
private data class LifeGroupStudyDto(
    val id: String,
    @SerialName("image_url") val imageUrl: String? = null,
    val title: String,
    val author: String,
    @SerialName("body_markdown") val bodyMarkdown: String,
    @SerialName("published_by_id") val publishedById: String,
    @SerialName("created_at") val createdAt: String,
    @SerialName("updated_at") val updatedAt: String,
) {
    fun toDomain() =
        LifeGroupStudy(
            id = id,
            imageUrl = imageUrl,
            title = title,
            author = author,
            bodyMarkdown = bodyMarkdown,
            publishedById = publishedById,
            createdAt = createdAt,
            updatedAt = updatedAt,
        )
}
