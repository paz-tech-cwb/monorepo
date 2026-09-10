package br.church.paz.shared.data.repository

import br.church.paz.shared.auth.TokenPair
import br.church.paz.shared.data.remote.createPazHttpClient
import br.church.paz.shared.domain.model.LifeGroupAttendanceEntry
import br.church.paz.shared.util.FakeTokenStorage
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.content.TextContent
import io.ktor.http.headersOf
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class LifeGroupAttendanceRepositoryTest {

    private val jsonHeaders = headersOf(HttpHeaders.ContentType, "application/json")

    private suspend fun buildRepo(engine: MockEngine): LifeGroupAttendanceRepositoryImpl {
        val tokenStorage = FakeTokenStorage().also { it.save(TokenPair("a", "r")) }
        val client = createPazHttpClient(tokenStorage, "http://test", engine)
        return LifeGroupAttendanceRepositoryImpl(client)
    }

    @Test
    fun `getByDate returns a draft when the backend reports is_draft true`() = runTest {
        val engine = MockEngine {
            respond(
                """{"id":null,"life_group_id":7,"meeting_date":"2026-06-10","present_count":0,"members_count":2,"entries":[{"user_id":1,"name":"Alice","present":false},{"user_id":2,"name":"Bob","present":false}],"is_draft":true}""",
                HttpStatusCode.OK,
                jsonHeaders,
            )
        }
        val repo = buildRepo(engine)

        val result = repo.getByDate(7, "2026-06-10")

        assertTrue(result.isDraft)
        assertNull(result.id)
        assertEquals(2, result.entries.size)
    }

    @Test
    fun `getHistory maps the list response into domain models`() = runTest {
        val engine = MockEngine {
            respond(
                """[{"id":"att-1","life_group_id":7,"meeting_date":"2026-06-10","present_count":1,"members_count":2,"entries":[],"is_draft":false}]""",
                HttpStatusCode.OK,
                jsonHeaders,
            )
        }
        val repo = buildRepo(engine)

        val result = repo.getHistory(7)

        assertEquals(1, result.size)
        assertEquals("att-1", result.first().id)
        assertEquals(1, result.first().presentCount)
    }

    @Test
    fun `save sends entries as user_id present pairs`() = runTest {
        var capturedBody: String? = null
        val engine = MockEngine { request ->
            capturedBody = (request.body as TextContent).text
            respond(
                """{"id":"att-1","life_group_id":7,"meeting_date":"2026-06-10","present_count":1,"members_count":1,"entries":[{"user_id":1,"name":"Alice","present":true}],"is_draft":false}""",
                HttpStatusCode.OK,
                jsonHeaders,
            )
        }
        val repo = buildRepo(engine)

        val result = repo.save(
            7,
            "2026-06-10",
            listOf(LifeGroupAttendanceEntry(userId = 1, name = "Alice", present = true)),
        )

        assertEquals("att-1", result.id)
        assertTrue(capturedBody!!.contains("\"user_id\":1"))
        assertTrue(capturedBody!!.contains("\"present\":true"))
    }
}
