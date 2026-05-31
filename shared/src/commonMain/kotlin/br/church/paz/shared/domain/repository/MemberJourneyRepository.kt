package br.church.paz.shared.domain.repository

import br.church.paz.shared.domain.model.MemberJourney

interface MemberJourneyRepository {
    suspend fun getMemberJourney(): Result<MemberJourney>
}
