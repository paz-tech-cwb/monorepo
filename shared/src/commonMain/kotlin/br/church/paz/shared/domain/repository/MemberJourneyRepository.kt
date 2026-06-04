package br.church.paz.shared.domain.repository

import br.church.paz.shared.domain.model.MemberJourney

interface MemberJourneyRepository {
    @Throws(Exception::class)
    suspend fun getMemberJourney(): MemberJourney
}
