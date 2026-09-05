package br.church.paz.shared.domain.repository

import br.church.paz.shared.domain.model.HomeContent

interface HomeRepository {
    @Throws(Exception::class)
    suspend fun getHomeContent(): HomeContent
}
