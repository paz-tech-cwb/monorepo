package br.church.paz.shared.data.repository

import br.church.paz.shared.data.remote.throwOnClientOrServerError
import br.church.paz.shared.domain.model.CasaDePazLesson
import br.church.paz.shared.domain.repository.CasaDePazLessonRepository
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get

class CasaDePazLessonRepositoryImpl(private val client: HttpClient) : CasaDePazLessonRepository {

    @Throws(Exception::class)
    override suspend fun getLessons(): List<CasaDePazLesson> {
        val httpResponse = client.get("api/casa-de-paz-lessons")
        httpResponse.throwOnClientOrServerError()
        return httpResponse.body()
    }
}
