package br.church.paz.shared.data.repository

import br.church.paz.shared.domain.model.MemberJourney
import br.church.paz.shared.domain.repository.MemberJourneyRepository
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get

class MemberJourneyRepositoryImpl(private val client: HttpClient) : MemberJourneyRepository {
    @Throws(Exception::class)
    override suspend fun getMemberJourney(): MemberJourney =
        client.get("api/member-journey/me").body()
}
