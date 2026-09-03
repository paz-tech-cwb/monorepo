package br.church.paz.shared.util

import br.church.paz.shared.data.repository.UserStore
import br.church.paz.shared.domain.model.User

class FakeUserStore : UserStore {
    private var stored: User? = null

    override suspend fun save(user: User) { stored = user }
    override suspend fun read(): User?    = stored
    override suspend fun clear()          { stored = null }
}
