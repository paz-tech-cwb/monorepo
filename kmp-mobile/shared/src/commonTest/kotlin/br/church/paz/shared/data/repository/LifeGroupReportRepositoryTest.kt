package br.church.paz.shared.data.repository

import br.church.paz.shared.auth.TokenPair
import br.church.paz.shared.data.remote.createPazHttpClient
import br.church.paz.shared.data.remote.httpStatusCodeOrNull
import br.church.paz.shared.util.FakeTokenStorage
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class LifeGroupReportRepositoryTest {

    private val jsonHeaders = headersOf(HttpHeaders.ContentType, "application/json")

    private suspend fun buildRepo(engine: MockEngine): LifeGroupReportRepositoryImpl {
        val tokenStorage = FakeTokenStorage().also { it.save(TokenPair("a", "r")) }
        val client = createPazHttpClient(tokenStorage, "http://test", engine)
        return LifeGroupReportRepositoryImpl(client)
    }

    private val reportJson =
        """
        {
          "id": "r-1",
          "date": "2026-10-08",
          "area_id": 1,
          "sector_id": 2,
          "life_group_id": 7,
          "committed_members": 10,
          "committed_members_present": 8,
          "kids_0_to_11": 3,
          "guests": 2,
          "mdas": 1,
          "offering": "150.50",
          "committed_at_tadel": 4,
          "committed_at_culto": 5,
          "leader_attended": ["tadel", "culto"],
          "disciples_count": 6,
          "disciples_discipled_this_week": 2,
          "pastoring_activity_type": ["visita"],
          "pastoring_activity_other": null,
          "training_activity_type": [],
          "training_activity_other": "Curso X",
          "submitted_by": {"id": 5, "name": "Ana"},
          "created_at": "2026-10-09T10:00:00.000Z",
          "updated_at": "2026-10-09T10:00:00.000Z",
          "deleted_at": null
        }
        """.trimIndent()

    @Test
    fun `getReports sends life_group_id and maps the snake_case list`() = runTest {
        var requestedUrl = ""
        val engine = MockEngine { request ->
            requestedUrl = request.url.toString()
            respond("[$reportJson]", HttpStatusCode.OK, jsonHeaders)
        }
        val repo = buildRepo(engine)

        val result = repo.getReports(7)

        assertTrue(requestedUrl.contains("api/forms/life-group-reports"))
        assertTrue(requestedUrl.contains("life_group_id=7"))
        assertEquals(1, result.size)
        val report = result.first()
        assertEquals("r-1", report.id)
        assertEquals("2026-10-08", report.date)
        assertEquals(7, report.lifeGroupId)
        assertEquals(10, report.committedMembers)
        assertEquals(8, report.committedMembersPresent)
        assertEquals(3, report.kids0To11)
        assertEquals("150.50", report.offering)
        assertEquals(listOf("tadel", "culto"), report.leaderAttended)
        assertEquals(listOf("visita"), report.pastoringActivityType)
        assertNull(report.pastoringActivityOther)
        assertEquals(emptyList(), report.trainingActivityType)
        assertEquals("Curso X", report.trainingActivityOther)
        assertEquals("Ana", report.submittedByName)
    }

    @Test
    fun `getReports tolerates numeric offering and a string activity value`() = runTest {
        val engine = MockEngine {
            respond(
                """[{"id":"r-2","date":"2026-10-01","offering":12.5,"pastoring_activity_type":"visita","submitted_by":null}]""",
                HttpStatusCode.OK,
                jsonHeaders,
            )
        }
        val report = buildRepo(engine).getReports(1).single()

        assertEquals("12.5", report.offering)
        assertEquals(listOf("visita"), report.pastoringActivityType)
        assertNull(report.submittedByName)
        assertEquals(0, report.guests)
    }

    @Test
    fun `getReport fetches by id`() = runTest {
        var requestedUrl = ""
        val engine = MockEngine { request ->
            requestedUrl = request.url.toString()
            respond(reportJson, HttpStatusCode.OK, jsonHeaders)
        }

        val report = buildRepo(engine).getReport("r-1")

        assertTrue(requestedUrl.endsWith("api/forms/life-group-reports/r-1"))
        assertEquals("r-1", report.id)
    }

    @Test
    fun `getReports maps 403 to a client exception with status`() = runTest {
        val engine = MockEngine {
            respond("""{"message":"You do not have access to this life group."}""", HttpStatusCode.Forbidden, jsonHeaders)
        }
        val repo = buildRepo(engine)

        val error = runCatching { repo.getReports(9) }.exceptionOrNull()

        assertEquals(403, error?.httpStatusCodeOrNull())
    }

    @Test
    fun `getReport maps 404 to a client exception with status`() = runTest {
        val engine = MockEngine { respond("""{"message":"Not Found"}""", HttpStatusCode.NotFound, jsonHeaders) }

        val error = runCatching { buildRepo(engine).getReport("nope") }.exceptionOrNull()

        assertEquals(404, error?.httpStatusCodeOrNull())
    }
}
