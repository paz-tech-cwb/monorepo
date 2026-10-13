package br.church.paz.shared.data.repository

import br.church.paz.shared.auth.TokenPair
import br.church.paz.shared.data.remote.createPazHttpClient
import br.church.paz.shared.data.remote.httpStatusCodeOrNull
import br.church.paz.shared.domain.model.LifeGroupReportDraft
import br.church.paz.shared.util.FakeTokenStorage
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.client.engine.mock.toByteArray
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class FormsRepositoryLifeGroupReportTest {
    private val jsonHeaders = headersOf(HttpHeaders.ContentType, "application/json")

    private suspend fun buildRepo(engine: MockEngine): FormsRepositoryImpl {
        val tokenStorage = FakeTokenStorage().also { it.save(TokenPair("a", "r")) }
        return FormsRepositoryImpl(createPazHttpClient(tokenStorage, "http://test", engine))
    }

    private val draft =
        LifeGroupReportDraft(
            date = "2026-10-11",
            lifeGroupId = 7,
            committedMembers = "10",
            committedMembersPresent = "8",
            kids0To11 = "3",
            guests = "2",
            mdas = "1",
            offering = "150,5",
            committedAtTadel = "4",
            committedAtCulto = "5",
            leaderAttended = "Tadel, Culto",
            disciplesCount = "6",
            disciplesDiscipledThisWeek = "2",
            pastoringActivityType = "Visita",
            pastoringActivityOther = "Hospital",
            trainingActivityType = "",
        )

    private val expectedKeys =
        setOf(
            "date", "life_group_id", "committed_members", "committed_members_present", "kids_0_to_11",
            "guests", "mdas", "offering", "committed_at_tadel", "committed_at_culto", "leader_attended",
            "disciples_count", "disciples_discipled_this_week", "pastoring_activity_type",
            "pastoring_activity_other", "training_activity_type",
        )

    @Test
    fun `submit posts the exact DTO payload without area_id or sector_id`() =
        runTest {
            var method: HttpMethod? = null
            var url = ""
            var body = ""
            val engine =
                MockEngine { request ->
                    method = request.method
                    url = request.url.toString()
                    body = request.body.toByteArray().decodeToString()
                    respond("{}", HttpStatusCode.Created, jsonHeaders)
                }
            val repo = buildRepo(engine)

            repo.submitLifeGroupReport(assertNotNull(draft.toForm("2026-10-12")))

            assertEquals(HttpMethod.Post, method)
            assertTrue(url.endsWith("api/forms/life-group-reports"), url)
            val json: JsonObject = Json.parseToJsonElement(body).jsonObject
            // training_activity_other is null -> omitted; everything else present with exact names.
            assertEquals(expectedKeys, json.keys)
            assertFalse("area_id" in json || "sector_id" in json)
            assertEquals("2026-10-11", json.getValue("date").jsonPrimitive.content)
            assertEquals(7, json.getValue("life_group_id").jsonPrimitive.int)
            assertEquals(3, json.getValue("kids_0_to_11").jsonPrimitive.int)
            // offering is a decimal STRING, not a number.
            val offering = json.getValue("offering").jsonPrimitive
            assertTrue(offering.isString)
            assertEquals("150.50", offering.content)
            // arrays are arrays of strings.
            val leader: JsonArray = json.getValue("leader_attended").jsonArray
            assertEquals(listOf("Tadel", "Culto"), leader.map { (it as JsonPrimitive).content })
            assertEquals(JsonArray(emptyList()), json.getValue("training_activity_type"))
            assertEquals("Hospital", json.getValue("pastoring_activity_other").jsonPrimitive.content)
            // none of the legacy wrong keys
            listOf("attendees", "visitors", "offerings", "observations").forEach { assertFalse(it in json, it) }
            assertFalse(json.getValue("committed_members").jsonPrimitive.isString)
        }

    @Test
    fun `server errors surface their status code`() =
        runTest {
            for (status in listOf(400, 403, 404, 409, 422)) {
                val engine =
                    MockEngine {
                        respond(
                            """{"statusCode":$status,"message":"x"}""",
                            HttpStatusCode.fromValue(status),
                            jsonHeaders,
                        )
                    }
                val repo = buildRepo(engine)
                val error =
                    runCatching { repo.submitLifeGroupReport(assertNotNull(draft.toForm("2026-10-12"))) }
                        .exceptionOrNull()
                assertEquals(status, error?.httpStatusCodeOrNull(), "status $status")
            }
        }
}
