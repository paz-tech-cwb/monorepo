package br.church.paz.shared.domain.repository

import br.church.paz.shared.auth.TokenPair
import br.church.paz.shared.domain.model.User

interface AuthRepository {
    suspend fun socialLogin(idToken: String, provider: String): Result<User>
    suspend fun logout(): Result<Unit>
    @Throws(Exception::class)
    suspend fun currentUser(): User?
    @Throws(Exception::class)
    suspend fun storedTokens(): TokenPair?
}
