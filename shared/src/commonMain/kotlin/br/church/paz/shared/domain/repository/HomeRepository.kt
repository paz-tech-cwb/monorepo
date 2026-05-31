package br.church.paz.shared.domain.repository

import br.church.paz.shared.domain.model.HomeContent

interface HomeRepository {
    suspend fun getHomeContent(): Result<HomeContent>
}
