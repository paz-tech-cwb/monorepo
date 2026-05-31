package br.church.paz.shared.data.remote

import br.church.paz.shared.auth.TokenPair
import br.church.paz.shared.auth.TokenStorage
import io.ktor.client.HttpClient
import io.ktor.client.HttpClientConfig
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.plugins.auth.Auth
import io.ktor.client.plugins.auth.providers.BearerTokens
import io.ktor.client.plugins.auth.providers.bearer
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.defaultRequest
import io.ktor.client.plugins.logging.LogLevel
import io.ktor.client.plugins.logging.Logging
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.body
import io.ktor.http.ContentType
import io.ktor.http.HttpTimeout
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

fun createPazHttpClient(
    tokenStorage: TokenStorage,
    baseUrl: String,
    engine: HttpClientEngine,
    debug: Boolean = false,
): HttpClient = HttpClient(engine) {
    defaultRequest { url(baseUrl) }

    install(ContentNegotiation) {
        json(Json {
            ignoreUnknownKeys = true
            coerceInputValues  = true
            isLenient          = true
        })
    }

    install(HttpTimeout) {
        requestTimeoutMillis = 30_000
        connectTimeoutMillis = 10_000
    }

    install(Logging) {
        level = if (debug) LogLevel.INFO else LogLevel.NONE
        sanitizeHeader { header -> header == io.ktor.http.HttpHeaders.Authorization }
    }

    install(Auth) {
        bearer {
            loadTokens {
                tokenStorage.read()?.let { BearerTokens(it.access, it.refresh) }
            }
            refreshTokens {
                val refreshed = refreshAccessToken(tokenStorage, client) ?: return@refreshTokens null
                BearerTokens(refreshed.access, refreshed.refresh)
            }
        }
    }
}

@Serializable
private data class RefreshRequest(@SerialName("refresh_token") val refreshToken: String)

@Serializable
private data class RefreshResponse(
    @SerialName("access_token")  val accessToken: String,
    @SerialName("refresh_token") val refreshToken: String,
)

private suspend fun refreshAccessToken(storage: TokenStorage, client: HttpClient): TokenPair? {
    return try {
        val current = storage.read() ?: run { storage.clear(); return null }
        val response = client.post("/auth/refresh") {
            contentType(ContentType.Application.Json)
            setBody(RefreshRequest(current.refresh))
            markAsRefreshTokenRequest()
        }
        if (!response.status.isSuccess()) { storage.clear(); return null }
        val body = response.body<RefreshResponse>()
        val pair = TokenPair(body.accessToken, body.refreshToken)
        storage.save(pair)
        pair
    } catch (_: Exception) {
        storage.clear()
        null
    }
}
