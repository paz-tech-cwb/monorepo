package br.church.paz.shared.data.repository

import br.church.paz.shared.auth.TokenPair
import br.church.paz.shared.data.remote.createPazHttpClient
import br.church.paz.shared.domain.model.LifeGroupTaskEligibilitySource
import br.church.paz.shared.domain.model.LifeGroupTaskMemberUpdate
import br.church.paz.shared.domain.model.LifeGroupTaskStatus
import br.church.paz.shared.util.FakeTokenStorage
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import io.ktor.http.content.TextContent
import io.ktor.http.headersOf
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class LifeGroupTaskRepositoryTest {

    private val jsonHeaders = headersOf(HttpHeaders.ContentType, "application/json")

    private suspend fun buildRepo(engine: MockEngine): LifeGroupTaskRepositoryImpl {
        val tokenStorage = FakeTokenStorage().also { it.save(TokenPair("a", "r")) }
        val client = createPazHttpClient(tokenStorage, "http://test", engine)
        return LifeGroupTaskRepositoryImpl(client)
    }

    private val taskJson =
        """{"id":"11111111-1111-1111-1111-111111111111","life_group_id":7,"life_group_name":"Casa Centro","meeting_date":"2026-10-20","task_name":"Louvor","task_description":"Lead worship","task_guidance":"# Steps\n- sing","status":"assigned"}"""

    @Test
    fun `getMyTasks maps the member list and calls me endpoint`() = runTest {
        var path: String? = null
        val engine = MockEngine { request ->
            path = request.url.encodedPath
            respond("[$taskJson]", HttpStatusCode.OK, jsonHeaders)
        }
        val repo = buildRepo(engine)

        val result = repo.getMyTasks()

        assertEquals("/api/me/life-group-tasks", path)
        assertEquals(1, result.size)
        val task = result.first()
        assertEquals("Louvor", task.name)
        assertEquals("Casa Centro", task.lifeGroupName)
        assertEquals("# Steps\n- sing", task.guidance)
        assertEquals(LifeGroupTaskStatus.ASSIGNED, task.status)
    }

    @Test
    fun `getMyTask maps unknown status to UNKNOWN`() = runTest {
        val engine = MockEngine {
            respond(taskJson.replace("assigned", "weird"), HttpStatusCode.OK, jsonHeaders)
        }
        val repo = buildRepo(engine)

        val result = repo.getMyTask("11111111-1111-1111-1111-111111111111")

        assertEquals(LifeGroupTaskStatus.UNKNOWN, result.status)
    }

    @Test
    fun `declineTask posts to decline and maps reassigned`() = runTest {
        var method: HttpMethod? = null
        var path: String? = null
        val engine = MockEngine { request ->
            method = request.method
            path = request.url.encodedPath
            respond(
                """{"id":"abc","status":"declined","reassigned":true}""",
                HttpStatusCode.OK,
                jsonHeaders,
            )
        }
        val repo = buildRepo(engine)

        val result = repo.declineTask("abc")

        assertEquals(HttpMethod.Post, method)
        assertEquals("/api/me/life-group-tasks/abc/decline", path)
        assertEquals(LifeGroupTaskStatus.DECLINED, result.status)
        assertTrue(result.reassigned)
    }

    @Test
    fun `declineTask surfaces a conflict as an exception`() = runTest {
        val engine = MockEngine {
            respond(
                """{"message":"This task can no longer be declined."}""",
                HttpStatusCode.Conflict,
                jsonHeaders,
            )
        }
        val repo = buildRepo(engine)

        val failure = runCatching { repo.declineTask("abc") }.exceptionOrNull()

        assertTrue(failure != null)
    }

    @Test
    fun `getTaskMembers maps eligibility fields and renames reason to note`() = runTest {
        val engine = MockEngine {
            respond(
                """[{"user_id":1,"name":"Alice","is_leader":true,"is_co_leader":false,"eligible":true,"eligibility_source":"leader","present_count":4,"min_present_meetings":3,"reason":"on sabbatical","excluded_template_ids":[2,5]},{"user_id":2,"name":"Bob","is_leader":false,"is_co_leader":false,"eligible":false,"eligibility_source":"pending","present_count":1,"min_present_meetings":3,"reason":null,"excluded_template_ids":[]}]""",
                HttpStatusCode.OK,
                jsonHeaders,
            )
        }
        val repo = buildRepo(engine)

        val result = repo.getTaskMembers(7)

        assertEquals(2, result.size)
        assertEquals(LifeGroupTaskEligibilitySource.LEADER, result[0].eligibilitySource)
        assertEquals("on sabbatical", result[0].note)
        assertEquals(listOf(2, 5), result[0].excludedTemplateIds)
        assertTrue(result[0].isLeader)
        assertFalse(result[1].eligible)
        assertEquals(LifeGroupTaskEligibilitySource.PENDING, result[1].eligibilitySource)
        assertNull(result[1].note)
    }

    @Test
    fun `updateTaskMembers omits unchanged fields and sends explicit clears`() = runTest {
        var capturedBody: String? = null
        var method: HttpMethod? = null
        val engine = MockEngine { request ->
            method = request.method
            capturedBody = (request.body as TextContent).text
            respond("[]", HttpStatusCode.OK, jsonHeaders)
        }
        val repo = buildRepo(engine)

        repo.updateTaskMembers(
            7,
            listOf(
                LifeGroupTaskMemberUpdate(userId = 1, eligible = false, note = "away"),
                LifeGroupTaskMemberUpdate(userId = 2, resetToAutomatic = true),
                LifeGroupTaskMemberUpdate(userId = 3, eligible = true, note = "", excludedTemplateIds = emptyList()),
            ),
        )

        assertEquals(HttpMethod.Put, method)
        val members = Json.parseToJsonElement(capturedBody!!).jsonObject["members"]!!.jsonArray
        val first = members[0].jsonObject
        assertEquals("false", first["eligible"]!!.jsonPrimitive.content)
        assertEquals("away", first["reason"]!!.jsonPrimitive.content)
        assertFalse(first.containsKey("excluded_template_ids"))
        assertFalse(first.containsKey("reset_to_automatic"))
        val second = members[1].jsonObject
        assertEquals("true", second["reset_to_automatic"]!!.jsonPrimitive.content)
        assertFalse(second.containsKey("eligible"))
        assertFalse(second.containsKey("reason"))
        val third = members[2].jsonObject
        assertEquals("", third["reason"]!!.jsonPrimitive.content)
        assertEquals(JsonArray(emptyList()), third["excluded_template_ids"])
    }

    @Test
    fun `settings round trip uses min_present_meetings`() = runTest {
        var capturedBody: String? = null
        val engine = MockEngine { request ->
            if (request.method == HttpMethod.Put) capturedBody = (request.body as TextContent).text
            respond("""{"min_present_meetings":5}""", HttpStatusCode.OK, jsonHeaders)
        }
        val repo = buildRepo(engine)

        assertEquals(5, repo.getTaskSettings(7).minPresentMeetings)
        assertEquals(5, repo.updateTaskSettings(7, 5).minPresentMeetings)
        assertTrue(capturedBody!!.contains("\"min_present_meetings\":5"))
    }

    @Test
    fun `getTaskTemplates derives summaries from task-overrides`() = runTest {
        var path: String? = null
        val engine = MockEngine { request ->
            path = request.url.encodedPath
            respond(
                """[{"template_id":2,"name":"Louvor","description":"d","template_guidance":"g","is_enabled":true,"guidance_override":null},{"template_id":3,"name":"Oracao","description":"","template_guidance":"","is_enabled":false,"guidance_override":"x"}]""",
                HttpStatusCode.OK,
                jsonHeaders,
            )
        }
        val repo = buildRepo(engine)

        val result = repo.getTaskTemplates(7)

        assertEquals("/api/life-groups/7/task-overrides", path)
        assertEquals(listOf(2, 3), result.map { it.templateId })
        assertEquals("Louvor", result[0].name)
        assertFalse(result[1].isEnabled)
    }
}
