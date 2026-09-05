package br.church.paz.shared.data.remote

import br.church.paz.shared.auth.TokenPair
import br.church.paz.shared.auth.TokenStorage
import io.ktor.client.HttpClient
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.plugins.ClientRequestException
import io.ktor.client.plugins.HttpCallValidator
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.ServerResponseException
import io.ktor.client.statement.bodyAsText
import io.ktor.client.plugins.auth.Auth
import io.ktor.client.plugins.auth.authProvider
import io.ktor.client.plugins.auth.providers.BearerAuthProvider
import io.ktor.client.plugins.auth.providers.BearerTokens
import io.ktor.client.plugins.auth.providers.bearer
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.defaultRequest
import io.ktor.client.plugins.logging.LogLevel
import io.ktor.client.plugins.logging.Logger
import io.ktor.client.plugins.logging.Logging
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.call.body
import io.ktor.client.statement.HttpResponse
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
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
        requestTimeoutMillis  = 30_000
        connectTimeoutMillis  = 10_000
        socketTimeoutMillis   = 30_000
    }

    install(Logging) {
        logger = object : Logger {
            override fun log(message: String) {
                println("[PazHttp] $message")
            }
        }
        level = if (debug) LogLevel.BODY else LogLevel.NONE
        sanitizeHeader { header -> header == HttpHeaders.Authorization }
    }

    install(HttpCallValidator) {
        validateResponse { response ->
            if (!response.status.isSuccess()) {
                println("[PazHttp] HTTP ${response.status.value} ${response.status.description} — ${response.call.request.url}")
            }
        }
        handleResponseExceptionWithRequest { cause, request ->
            println("[PazHttp] request failed — ${request.url} — ${cause::class.simpleName}: ${cause.message}")
        }
    }

    install(Auth) {
        bearer {
            loadTokens {
                val pair = tokenStorage.read()
                println(
                    "[PazAuth] loadTokens -> " +
                        if (pair != null) "access=${pair.access.take(10)}… len=${pair.access.length}"
                        else "NO TOKEN",
                )
                pair?.let { BearerTokens(it.access, it.refresh) }
            }
            refreshTokens {
                println("[PazAuth] refreshTokens invoked")
                val refreshed = refreshAccessToken(tokenStorage, client) ?: return@refreshTokens null
                BearerTokens(refreshed.access, refreshed.refresh)
            }
        }
    }
}

/**
 * Clears the Ktor bearer provider's cached token so the next request re-invokes
 * [loadTokens] and reads freshly-persisted tokens from storage.
 *
 * Ktor caches the result of `loadTokens` for the client's lifetime; without this,
 * a token persisted AFTER the first authenticated request (e.g. right after login)
 * is never picked up, and every subsequent request is sent unauthenticated.
 */
fun HttpClient.clearBearerTokenCache() {
    authProvider<BearerAuthProvider>()?.clearToken()
}

/**
 * Returns the HTTP status code carried by a Ktor client-error exception (e.g. a 403
 * from a permission check), or `null` if this throwable is not a Ktor
 * [ClientRequestException]. Prefer this over string-matching on [Throwable.message]
 * when a caller needs to branch on a specific status code.
 */
fun Throwable.httpStatusCodeOrNull(): Int? = (this as? ClientRequestException)?.response?.status?.value

/**
 * Explicitly raises a [ClientRequestException]/[ServerResponseException] for a non-2xx
 * [HttpResponse].
 *
 * The shared [HttpClient] intentionally keeps Ktor's default `expectSuccess = false` because
 * other call sites (e.g. [br.church.paz.shared.data.repository.AuthRepositoryImpl] and the
 * token-refresh flow above) read the raw response body/status on non-2xx responses to extract a
 * server-provided error message, which only works when Ktor does *not* throw. Flipping
 * `expectSuccess` globally would break that behavior. Call sites that instead want status-code
 * based error handling (e.g. detecting a 403) should call this right after receiving the
 * [HttpResponse] and before decoding its body.
 */
suspend fun HttpResponse.throwOnClientOrServerError() {
    if (status.isSuccess()) return
    val text = runCatching { bodyAsText() }.getOrDefault("")
    when (status.value) {
        in 400..499 -> throw ClientRequestException(this, text)
        in 500..599 -> throw ServerResponseException(this, text)
    }
}

/**
 * Use instead of [body] so decode failures are always printed at the network layer.
 */
suspend inline fun <reified T> HttpResponse.decodedBody(): T {
    return try {
        body()
    } catch (e: Exception) {
        println("[PazHttp] decode error — ${call.request.url} — ${e::class.simpleName}: ${e.message}")
        throw e
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
        // In Ktor 3.x the bearer plugin prevents re-entry automatically;
        // markAsRefreshTokenRequest() no longer exists.
        val response = client.post("api/auth/refresh") {
            contentType(ContentType.Application.Json)
            setBody(RefreshRequest(current.refresh))
        }
        if (!response.status.isSuccess()) { storage.clear(); return null }
        val body = response.decodedBody<RefreshResponse>()
        val pair = TokenPair(body.accessToken, body.refreshToken)
        storage.save(pair)
        pair
    } catch (_: Exception) {
        storage.clear()
        null
    }
}
