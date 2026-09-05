package br.church.paz.shared.domain.repository

import br.church.paz.shared.auth.TokenPair
import br.church.paz.shared.domain.model.User

interface AuthRepository {
    suspend fun socialLogin(idToken: String, provider: String, birthDate: String? = null): Result<User>
    suspend fun logout(fcmToken: String? = null): Result<Unit>
    @Throws(Exception::class)
    suspend fun currentUser(): User?
    @Throws(Exception::class)
    suspend fun storedTokens(): TokenPair?
}

/**
 * Thrown by [AuthRepository.socialLogin] when signing in with an unrecognized
 * identity for the first time — the backend requires [String] birth date to
 * identity-match against a pre-created member record before it will create a
 * new account. Callers should prompt for the birth date and retry.
 */
class BirthDateRequiredException : Exception("birth_date is required to register a new user")
