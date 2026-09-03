package br.church.paz.shared.domain.repository

import br.church.paz.shared.domain.model.AgendaEvent

interface AgendaRepository {
    @Throws(Exception::class)
    suspend fun getEvents(page: Int, limit: Int): List<AgendaEvent>
}
