package br.church.paz.shared.data.repository

import br.church.paz.shared.auth.TokenPair
import br.church.paz.shared.auth.TokenStorage
import br.church.paz.shared.domain.model.User
import br.church.paz.shared.domain.repository.AuthRepository
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

class AuthRepositoryImpl(
    private val httpClient: HttpClient,
    private val tokenStorage: TokenStorage,
    private val userStore: UserStore,
) : AuthRepository {

    override suspend fun socialLogin(idToken: String, provider: String): Result<User> {
        return runCatching {
            val response = httpClient.post("/auth/social-login") {
                contentType(ContentType.Application.Json)
                setBody(SocialLoginRequest(idToken = idToken, provider = provider))
            }.body<SocialLoginResponse>()

            tokenStorage.save(TokenPair(response.accessToken, response.refreshToken))
            userStore.save(response.user)
            response.user
        }
    }

    override suspend fun logout(): Result<Unit> {
        return runCatching {
            runCatching { httpClient.post("/auth/logout") }
            tokenStorage.clear()
            userStore.clear()
        }
    }

    override suspend fun currentUser(): User? = userStore.read()
}

@Serializable
private data class SocialLoginRequest(
    @SerialName("id_token") val idToken: String,
    val provider: String,
)

@Serializable
private data class SocialLoginResponse(
    @SerialName("access_token")  val accessToken: String,
    @SerialName("refresh_token") val refreshToken: String,
    val user: User,
)
