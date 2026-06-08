package br.church.paz.shared.data.repository

import br.church.paz.shared.auth.TokenPair
import br.church.paz.shared.auth.TokenStorage
import br.church.paz.shared.domain.model.User
import br.church.paz.shared.domain.repository.AuthRepository
import br.church.paz.shared.util.safeRunCatching
import io.ktor.client.HttpClient
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

class AuthRepositoryImpl(
    private val httpClient: HttpClient,
    private val tokenStorage: TokenStorage,
    private val userStore: UserStore,
) : AuthRepository {

    override suspend fun socialLogin(idToken: String, provider: String): Result<User> {
        return safeRunCatching {
            val httpResponse = httpClient.post("api/auth/social-login") {
                contentType(ContentType.Application.Json)
                setBody(SocialLoginRequest(idToken = idToken, provider = provider))
            }
            val responseText = httpResponse.bodyAsText()
            if (!httpResponse.status.isSuccess()) {
                throw IllegalStateException(
                    extractErrorMessage(responseText) ?: "Login failed (${httpResponse.status.value})"
                )
            }
            val response = decodeSocialLoginResponse(responseText)

            tokenStorage.save(TokenPair(response.accessToken, response.refreshToken, provider))
            userStore.save(response.user)
            response.user
        }
    }

    override suspend fun logout(): Result<Unit> {
        return safeRunCatching {
            runCatching { httpClient.post("api/auth/logout") }
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

private val authJson = Json {
    ignoreUnknownKeys = true
    coerceInputValues = true
    isLenient = true
}

private fun decodeSocialLoginResponse(responseText: String): SocialLoginResponse {
    val root = authJson.parseToJsonElement(responseText)
    val payload = (root as? JsonObject)?.get("data") ?: root
    return authJson.decodeFromJsonElement(payload)
}

private fun extractErrorMessage(responseText: String): String? {
    return runCatching {
        val root = authJson.parseToJsonElement(responseText).jsonObject
        when (val message = root["message"]) {
            is JsonPrimitive -> message.contentOrNull
            is JsonArray -> message.joinToString("; ") { it.jsonPrimitive.contentOrNull ?: it.toString() }
            else -> null
        }
    }.getOrNull()
}
