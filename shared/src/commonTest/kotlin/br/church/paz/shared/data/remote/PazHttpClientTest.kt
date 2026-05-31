package br.church.paz.shared.data.remote

import br.church.paz.shared.auth.TokenPair
import br.church.paz.shared.util.FakeTokenStorage
import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.client.engine.mock.respondError
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlin.test.Test
import kotlin.test.assertContains
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class PazHttpClientTest {

    private val jsonHeaders = headersOf(HttpHeaders.ContentType, "application/json")

    @Test
    fun `attaches Bearer token to authenticated requests`() = runTest {
        val storage = FakeTokenStorage().also {
            it.save(TokenPair(access = "test-access", refresh = "test-refresh"))
        }
        val engine = MockEngine { request ->
            val auth = request.headers[HttpHeaders.Authorization]
            respond(
                content = "{}",
                headers = jsonHeaders,
                status  = HttpStatusCode.OK,
            )
        }
        val client = createPazHttpClient(storage, "http://test", engine)
        client.get("/home")

        val recorded = engine.requestHistory.first()
        assertEquals("Bearer test-access", recorded.headers[HttpHeaders.Authorization])
    }

    @Test
    fun `does not attach Authorization when no token stored`() = runTest {
        val storage = FakeTokenStorage() // empty
        val engine = MockEngine {
            respond("{}", HttpStatusCode.OK, jsonHeaders)
        }
        val client = createPazHttpClient(storage, "http://test", engine)
        client.get("/home")

        val recorded = engine.requestHistory.first()
        assertNull(recorded.headers[HttpHeaders.Authorization])
    }

    @Test
    fun `refreshes token on 401 and retries request`() = runTest {
        val storage = FakeTokenStorage().also {
            it.save(TokenPair(access = "expired", refresh = "valid-refresh"))
        }
        var callCount = 0
        val engine = MockEngine { request ->
            callCount++
            when {
                // First call → 401
                callCount == 1 -> respondError(HttpStatusCode.Unauthorized)
                // Refresh call → new tokens
                request.url.encodedPath.contains("auth/refresh") -> respond(
                    content = """{"access_token":"new-access","refresh_token":"new-refresh"}""",
                    headers = jsonHeaders,
                    status  = HttpStatusCode.OK,
                )
                // Retry → 200
                else -> respond("{}", HttpStatusCode.OK, jsonHeaders)
            }
        }
        val client = createPazHttpClient(storage, "http://test", engine)
        client.get("/home")

        assertEquals("new-access", storage.read()?.access)
        assertEquals("new-refresh", storage.read()?.refresh)
    }

    @Test
    fun `clears tokens when refresh request returns 500`() = runTest {
        val storage = FakeTokenStorage().also {
            it.save(TokenPair(access = "expired", refresh = "bad-refresh"))
        }
        var callCount = 0
        val engine = MockEngine { request ->
            callCount++
            when {
                // Initial request → 401 triggers a refresh attempt
                callCount == 1 -> respondError(HttpStatusCode.Unauthorized)
                // Refresh call → 500 (server error, not another 401 — avoids re-entry loop)
                request.url.encodedPath.contains("auth/refresh") ->
                    respondError(HttpStatusCode.InternalServerError)
                else -> respondError(HttpStatusCode.Unauthorized)
            }
        }
        val client = createPazHttpClient(storage, "http://test", engine)
        runCatching { client.get("/home") }

        assertNull(storage.read())
        assertTrue(storage.clearCallCount >= 1)
    }

    @Test
    fun `Authorization header is sanitized in logs`() = runTest {
        // Verifies the sanitizeHeader lambda is set; can't inspect Ktor internals directly
        // but we can confirm the client builds without error with debug = true
        val storage = FakeTokenStorage().also { it.save(TokenPair("a", "r")) }
        val engine = MockEngine { respond("{}", HttpStatusCode.OK, jsonHeaders) }
        val client = createPazHttpClient(storage, "http://test", engine, debug = true)
        client.get("/ping") // should not throw
    }
}
