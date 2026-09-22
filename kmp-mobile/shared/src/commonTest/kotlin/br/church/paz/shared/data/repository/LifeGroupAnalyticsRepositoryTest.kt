package br.church.paz.shared.data.repository

import br.church.paz.shared.auth.TokenPair
import br.church.paz.shared.data.remote.createPazHttpClient
import br.church.paz.shared.util.FakeTokenStorage
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class LifeGroupAnalyticsRepositoryTest {

    private val jsonHeaders = headersOf(HttpHeaders.ContentType, "application/json")

    private suspend fun buildRepo(engine: MockEngine): LifeGroupAnalyticsRepositoryImpl {
        val tokenStorage = FakeTokenStorage().also { it.save(TokenPair("a", "r")) }
        val client = createPazHttpClient(tokenStorage, "http://test", engine)
        return LifeGroupAnalyticsRepositoryImpl(client)
    }

    @Test
    fun `getOverview maps the snake_case payload into domain`() = runTest {
        val engine = MockEngine {
            respond(
                """
                {
                  "total_kids": 12,
                  "avg_members_per_group": 8.5,
                  "groups_by_sector": [{"label": "Norte", "count": 3}, {"label": "Sem setor", "count": 1}],
                  "members_in_group": 40,
                  "members_total": 100
                }
                """.trimIndent(),
                HttpStatusCode.OK,
                jsonHeaders,
            )
        }
        val repo = buildRepo(engine)

        val result = repo.getOverview()

        assertEquals(12, result.totalKids)
        assertEquals(8.5, result.avgMembersPerGroup)
        assertEquals(2, result.groupsBySector.size)
        assertEquals("Norte", result.groupsBySector.first().label)
        assertEquals(40, result.membersInGroup)
        assertEquals(100, result.membersTotal)
    }

    @Test
    fun `getOverview defaults missing fields to zero and empty list`() = runTest {
        val engine = MockEngine {
            respond("""{}""", HttpStatusCode.OK, jsonHeaders)
        }
        val repo = buildRepo(engine)

        val result = repo.getOverview()

        assertEquals(0, result.totalKids)
        assertEquals(0.0, result.avgMembersPerGroup)
        assertTrue(result.groupsBySector.isEmpty())
        assertEquals(0, result.membersInGroup)
        assertEquals(0, result.membersTotal)
    }
}
