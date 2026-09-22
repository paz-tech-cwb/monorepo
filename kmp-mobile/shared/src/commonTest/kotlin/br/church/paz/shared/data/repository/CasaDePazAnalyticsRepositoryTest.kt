package br.church.paz.shared.data.repository

import br.church.paz.shared.auth.TokenPair
import br.church.paz.shared.data.remote.createPazHttpClient
import br.church.paz.shared.util.FakeTokenStorage
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.client.engine.mock.respondError
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import kotlin.test.assertTrue

class CasaDePazAnalyticsRepositoryTest {

    private val jsonHeaders = headersOf(HttpHeaders.ContentType, "application/json")

    private suspend fun buildRepo(engine: MockEngine): CasaDePazAnalyticsRepositoryImpl {
        val tokenStorage = FakeTokenStorage().also { it.save(TokenPair("a", "r")) }
        val client = createPazHttpClient(tokenStorage, "http://test", engine)
        return CasaDePazAnalyticsRepositoryImpl(client)
    }

    @Test
    fun `getSummary maps a full snake_case payload into domain`() = runTest {
        val engine = MockEngine {
            respond(
                """
                {
                  "range": {"from": "2026-01-01", "to": "2026-06-30"},
                  "totals": {"houses": 10, "adults": 20, "kids": 5, "guests": 8, "lives": 33, "conversions": 3, "conversion_rate": 0.375},
                  "growth": {"houses": 0.1, "lives": 0.2, "guests": null, "conversions": 0.0},
                  "comparison": {"period": "2025-12"},
                  "series": [{"period": "2026-01", "houses": 2, "adults": 4, "kids": 1, "guests": 2, "conversions": 1}],
                  "by_sector": [{"label": "Norte", "sector_id": 1, "houses": 5, "adults": 10, "kids": 2, "guests": 4, "conversions": 2}],
                  "by_day": [{"label": "Domingo", "houses": 3, "adults": 6, "guests": 2, "conversions": 1}],
                  "by_time": [{"label": "19:00", "houses": 3, "adults": 6, "guests": 2, "conversions": 1}]
                }
                """.trimIndent(),
                HttpStatusCode.OK,
                jsonHeaders,
            )
        }
        val repo = buildRepo(engine)

        val result = repo.getSummary(from = "2026-01-01", to = "2026-06-30")

        assertEquals("2026-01-01", result.range.from)
        assertEquals(10, result.totals.houses)
        assertEquals(33, result.totals.lives)
        assertEquals(0.375, result.totals.conversionRate)
        assertEquals(0.1, result.growth.houses)
        assertNull(result.growth.guests)
        assertEquals(0.0, result.growth.conversions)
        assertEquals("2025-12", result.comparison?.period)
        assertEquals(1, result.series.size)
        assertEquals("2026-01", result.series.first().period)
        assertEquals(1, result.bySector.size)
        assertEquals("Norte", result.bySector.first().label)
        assertEquals(1, result.byDay.size)
        assertEquals("Domingo", result.byDay.first().label)
    }

    @Test
    fun `getSummary maps null growth fields and a null comparison`() = runTest {
        val engine = MockEngine {
            respond(
                """
                {
                  "range": {"from": "2026-01-01", "to": "2026-06-30"},
                  "totals": {"houses": 0, "adults": 0, "kids": 0, "guests": 0, "lives": 0, "conversions": 0, "conversion_rate": 0},
                  "growth": {"houses": null, "lives": null, "guests": null, "conversions": null},
                  "comparison": null,
                  "series": [],
                  "by_sector": [],
                  "by_day": []
                }
                """.trimIndent(),
                HttpStatusCode.OK,
                jsonHeaders,
            )
        }
        val repo = buildRepo(engine)

        val result = repo.getSummary()

        assertNull(result.growth.houses)
        assertNull(result.growth.lives)
        assertNull(result.growth.guests)
        assertNull(result.growth.conversions)
        assertNull(result.comparison)
        assertTrue(result.series.isEmpty())
        assertTrue(result.bySector.isEmpty())
        assertTrue(result.byDay.isEmpty())
    }

    @Test
    fun `getSummary omits from and to query params when null`() = runTest {
        var capturedUrl: String? = null
        val engine = MockEngine { request ->
            capturedUrl = request.url.toString()
            respond(
                """
                {
                  "range": {"from": "2026-01-01", "to": "2026-06-30"},
                  "totals": {"houses": 0, "adults": 0, "kids": 0, "guests": 0, "lives": 0, "conversions": 0, "conversion_rate": 0},
                  "growth": {"houses": null, "lives": null, "guests": null, "conversions": null},
                  "comparison": null,
                  "series": [],
                  "by_sector": [],
                  "by_day": []
                }
                """.trimIndent(),
                HttpStatusCode.OK,
                jsonHeaders,
            )
        }
        val repo = buildRepo(engine)

        repo.getSummary()

        val url = requireNotNull(capturedUrl)
        assertTrue(!url.contains("from="))
        assertTrue(!url.contains("to="))
    }

    @Test
    fun `getSummary throws when the backend returns 401 after a failed refresh`() = runTest {
        var callCount = 0
        val engine = MockEngine { request ->
            callCount++
            when {
                // Initial request -> 401 triggers a refresh attempt.
                callCount == 1 -> respondError(HttpStatusCode.Unauthorized)
                // Refresh call -> 500 (server error, not another 401, to avoid a re-entry loop).
                request.url.encodedPath.contains("auth/refresh") ->
                    respondError(HttpStatusCode.InternalServerError)
                else -> respondError(HttpStatusCode.Unauthorized)
            }
        }
        val repo = buildRepo(engine)

        assertFailsWith<Exception> { repo.getSummary() }
    }

    @Test
    fun `getSummary throws when the backend returns 500`() = runTest {
        val engine = MockEngine {
            respond("""{"message":"Internal error"}""", HttpStatusCode.InternalServerError, jsonHeaders)
        }
        val repo = buildRepo(engine)

        assertFailsWith<Exception> { repo.getSummary() }
    }
}
