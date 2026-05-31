package br.church.paz.shared.data.repository

import br.church.paz.shared.domain.model.MemberJourney
import br.church.paz.shared.domain.repository.MemberJourneyRepository
import br.church.paz.shared.util.safeRunCatching
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get

class MemberJourneyRepositoryImpl(private val client: HttpClient) : MemberJourneyRepository {
    override suspend fun getMemberJourney(): Result<MemberJourney> = safeRunCatching {
        client.get("/member-journey/me").body()
    }
}
