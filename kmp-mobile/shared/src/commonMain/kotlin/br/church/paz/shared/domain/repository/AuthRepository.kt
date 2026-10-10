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

    /**
     * Overwrites the locally cached session [User] (read by [currentUser]) with [user].
     *
     * Call this right after any successful write that returns a fresher [User] than the one
     * cached at login — e.g. `PUT /users/me` from the edit-profile flow. Without it, every
     * screen that reads [currentUser] (Account, Home, etc.) keeps showing the login-time
     * snapshot — including a stale profile picture URL — until the next full sign-in, even
     * though the backend record already changed.
     */
    @Throws(Exception::class)
    suspend fun updateCachedUser(user: User)
}

/**
 * Thrown by [AuthRepository.socialLogin] when signing in with an unrecognized
 * identity for the first time — the backend requires [String] birth date to
 * identity-match against a pre-created member record before it will create a
 * new account. Callers should prompt for the birth date and retry.
 */
class BirthDateRequiredException : Exception("birth_date is required to register a new user")
