package br.church.paz.shared.data.repository

import br.church.paz.shared.domain.model.AcademyContent
import br.church.paz.shared.domain.repository.AcademyRepository
import br.church.paz.shared.util.safeRunCatching
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get

class AcademyRepositoryImpl(private val client: HttpClient) : AcademyRepository {
    override suspend fun getAcademyContent(): Result<AcademyContent> = safeRunCatching {
        client.get("/academy").body()
    }
}
