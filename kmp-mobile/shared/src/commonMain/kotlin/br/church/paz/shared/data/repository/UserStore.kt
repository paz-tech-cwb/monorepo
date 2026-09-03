package br.church.paz.shared.data.repository

import br.church.paz.shared.domain.model.User

interface UserStore {
    suspend fun save(user: User)
    suspend fun read(): User?
    suspend fun clear()
}

expect fun createUserStore(): UserStore
