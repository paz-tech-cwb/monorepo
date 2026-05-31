package br.church.paz.shared.data.repository

import br.church.paz.shared.domain.model.HomeContent
import br.church.paz.shared.domain.repository.HomeRepository
import br.church.paz.shared.util.safeRunCatching
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get

class HomeRepositoryImpl(private val client: HttpClient) : HomeRepository {
    override suspend fun getHomeContent(): Result<HomeContent> = safeRunCatching {
        client.get("/home").body()
    }
}
