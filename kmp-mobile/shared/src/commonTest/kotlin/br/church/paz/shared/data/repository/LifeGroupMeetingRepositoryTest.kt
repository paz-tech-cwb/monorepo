package br.church.paz.shared.data.repository

import br.church.paz.shared.auth.TokenPair
import br.church.paz.shared.data.remote.createPazHttpClient
import br.church.paz.shared.domain.model.LifeGroupAttendanceEntry
import br.church.paz.shared.domain.model.LifeGroupMeetingErrors
import br.church.paz.shared.domain.model.LifeGroupMeetingReportDraft
import br.church.paz.shared.domain.model.MeetingReportBlockedReason
import br.church.paz.shared.domain.repository.LifeGroupMeetingException
import br.church.paz.shared.util.FakeTokenStorage
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import io.ktor.http.content.TextContent
import io.ktor.http.headersOf
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class LifeGroupMeetingRepositoryTest {
    private val jsonHeaders = headersOf(HttpHeaders.ContentType, "application/json")

    private suspend fun buildRepo(engine: MockEngine): LifeGroupMeetingRepositoryImpl {
        val tokenStorage = FakeTokenStorage().also { it.save(TokenPair("a", "r")) }
        val client = createPazHttpClient(tokenStorage, "http://test", engine)
        return LifeGroupMeetingRepositoryImpl(client)
    }

    private val reportJson =
        """
        {
          "id": "r-1", "date": "2026-10-07", "area_id": 1, "sector_id": 2, "life_group_id": 7,
          "committed_members": 3, "committed_members_present": 2,
          "kids_0_to_11": 3, "guests": 2, "mdas": 1, "offering": "150.50",
          "committed_at_tadel": 4, "committed_at_culto": 5, "leader_attended": ["tadel"],
          "disciples_count": 6, "disciples_discipled_this_week": 2,
          "pastoring_activity_type": ["visita"], "pastoring_activity_other": null,
          "training_activity_type": [], "training_activity_other": "Curso X",
          "submitted_by": {"id": 5, "name": "Ana"},
          "created_at": "2026-10-09T10:00:00.000Z", "updated_at": "2026-10-09T10:00:00.000Z", "deleted_at": null
        }
        """.trimIndent()

    private fun meetingJson(
        attendance: String =
            """{"id":null,"life_group_id":7,"meeting_date":"2026-10-07","present_count":2,"members_count":2,
               "recorded_by":null,"entries":[{"user_id":1,"name":"Ana","present":true},{"user_id":2,"name":"Bia","present":true}],
               "created_at":null,"updated_at":null,"is_draft":true,"is_extra":false,"default_present":true}""",
        report: String = "null",
        canEdit: Boolean = true,
        blocked: String = "null",
    ) = """
        {"life_group_id":7,"meeting_date":"2026-10-07","attendance":$attendance,"report":$report,
         "derived":{"committed_members":2,"committed_members_present":2},
         "can_edit":$canEdit,"edit_deadline":"2026-10-21","report_blocked_reason":$blocked}
    """.trimIndent()

    @Test
    fun `getMeeting maps a draft meeting and sends no extra flag by default`() =
        runTest {
            var url = ""
            val repo =
                buildRepo(
                    MockEngine { request ->
                        url = request.url.toString()
                        respond(meetingJson(), HttpStatusCode.OK, jsonHeaders)
                    },
                )

            val meeting = repo.getMeeting(7, "2026-10-07", extraMeeting = null)

            assertTrue(url.endsWith("api/life-groups/7/meetings/2026-10-07"), url)
            assertFalse(url.contains("extra_meeting"))
            assertEquals(7, meeting.lifeGroupId)
            val attendance = assertNotNull(meeting.attendance)
            assertTrue(attendance.isDraft)
            assertEquals(true, attendance.defaultPresent)
            assertFalse(attendance.isExtra)
            assertEquals(listOf("Ana", "Bia"), attendance.entries.map { it.name })
            assertEquals(2, meeting.committedMembers)
            assertEquals(2, meeting.committedMembersPresent)
            assertTrue(meeting.canEdit)
            assertEquals("2026-10-21", meeting.editDeadline)
            assertNull(meeting.report)
            assertNull(meeting.reportBlockedReason)
            assertFalse(meeting.isAttendanceSaved)
        }

    @Test
    fun `getMeeting sends extra_meeting only when true`() =
        runTest {
            val urls = mutableListOf<String>()
            val repo =
                buildRepo(
                    MockEngine { request ->
                        urls += request.url.toString()
                        respond(meetingJson(), HttpStatusCode.OK, jsonHeaders)
                    },
                )

            repo.getMeeting(7, "2026-10-08", extraMeeting = true)
            repo.getMeeting(7, "2026-10-08", extraMeeting = false)

            assertTrue(urls[0].contains("extra_meeting=true"), urls[0])
            assertFalse(urls[1].contains("extra_meeting"), urls[1])
        }

    @Test
    fun `getMeeting maps saved attendance report and blocked reason`() =
        runTest {
            val saved =
                """{"id":"a-1","life_group_id":7,"meeting_date":"2026-10-07","present_count":1,"members_count":2,
                   "entries":[{"user_id":1,"name":"Ana","present":true},{"user_id":2,"name":"Bia","present":false}],
                   "is_draft":false,"is_extra":true,"default_present":null}"""
            val repo =
                buildRepo(
                    MockEngine {
                        respond(
                            meetingJson(attendance = saved, report = reportJson, canEdit = false, blocked = "\"sector_has_no_area\""),
                            HttpStatusCode.OK,
                            jsonHeaders,
                        )
                    },
                )

            val meeting = repo.getMeeting(7, "2026-10-07", extraMeeting = null)

            assertTrue(meeting.isAttendanceSaved)
            assertTrue(meeting.isReportSaved)
            assertEquals(true, meeting.attendance?.isExtra)
            assertNull(meeting.attendance?.defaultPresent)
            assertFalse(meeting.canEdit)
            assertEquals(MeetingReportBlockedReason.SECTOR_HAS_NO_AREA, meeting.reportBlockedReason)
            assertEquals("150.50", meeting.report?.offering)
            assertEquals(listOf("tadel"), meeting.report?.leaderAttended)
            assertEquals("Curso X", meeting.report?.trainingActivityOther)
        }

    @Test
    fun `an unknown blocked reason and a missing can_edit fail safe`() =
        runTest {
            val repo =
                buildRepo(
                    MockEngine {
                        respond(
                            """{"life_group_id":7,"meeting_date":"2026-10-07","attendance":null,"report":null,
                                "derived":{"committed_members":null,"committed_members_present":null},
                                "report_blocked_reason":"new_reason"}""",
                            HttpStatusCode.OK,
                            jsonHeaders,
                        )
                    },
                )

            val meeting = repo.getMeeting(7, "2026-10-07", extraMeeting = null)

            assertFalse(meeting.canEdit)
            assertEquals(MeetingReportBlockedReason.UNKNOWN, meeting.reportBlockedReason)
            assertNull(meeting.attendance)
            assertNull(meeting.committedMembers)
        }

    @Test
    fun `saveAttendance PUTs entries and the extra flag only when given`() =
        runTest {
            val bodies = mutableListOf<JsonObject>()
            var method: HttpMethod? = null
            var url = ""
            val repo =
                buildRepo(
                    MockEngine { request ->
                        method = request.method
                        url = request.url.toString()
                        bodies += Json.parseToJsonElement((request.body as TextContent).text).jsonObject
                        respond(meetingJson(), HttpStatusCode.OK, jsonHeaders)
                    },
                )
            val entries =
                listOf(
                    LifeGroupAttendanceEntry(1, "Ana", true),
                    LifeGroupAttendanceEntry(2, "Bia", false),
                )

            repo.saveAttendance(7, "2026-10-08", entries, extraMeeting = true)
            repo.saveAttendance(7, "2026-10-08", entries, extraMeeting = null)

            assertEquals(HttpMethod.Put, method)
            assertTrue(url.endsWith("api/life-groups/7/meetings/2026-10-08"))
            val first = bodies[0]
            assertEquals(true, first["extra_meeting"]?.jsonPrimitive?.boolean)
            assertFalse(first.containsKey("report"))
            val sent = first["attendance"]!!.jsonObject["entries"]!!.jsonArray
            assertEquals(2, sent.size)
            assertEquals(1, sent[0].jsonObject["user_id"]!!.jsonPrimitive.int)
            assertEquals(true, sent[0].jsonObject["present"]!!.jsonPrimitive.boolean)
            assertEquals(false, sent[1].jsonObject["present"]!!.jsonPrimitive.boolean)
            // The roster name is never sent.
            assertFalse(sent[0].jsonObject.containsKey("name"))
            assertFalse(bodies[1].containsKey("extra_meeting"))
        }

    @Test
    fun `saveReport sends the exact snake_case report fields and no attendance`() =
        runTest {
            var body: JsonObject? = null
            val repo =
                buildRepo(
                    MockEngine { request ->
                        body = Json.parseToJsonElement((request.body as TextContent).text).jsonObject
                        respond(meetingJson(report = reportJson), HttpStatusCode.OK, jsonHeaders)
                    },
                )
            val input =
                LifeGroupMeetingReportDraft(
                    kids0To11 = "3",
                    guests = "2",
                    offering = "150,5",
                    leaderAttended = "tadel",
                    pastoringActivityOther = "Café",
                ).toInput()!!

            val meeting = repo.saveReport(7, "2026-10-07", input)

            val sent = body!!
            assertFalse(sent.containsKey("attendance"))
            assertFalse(sent.containsKey("extra_meeting"))
            val report = sent["report"]!!.jsonObject
            assertEquals(3, report["kids_0_to_11"]!!.jsonPrimitive.int)
            assertEquals(2, report["guests"]!!.jsonPrimitive.int)
            assertEquals(0, report["mdas"]!!.jsonPrimitive.int)
            assertEquals("150.50", report["offering"]!!.jsonPrimitive.content)
            assertEquals(0, report["committed_at_tadel"]!!.jsonPrimitive.int)
            assertEquals(0, report["committed_at_culto"]!!.jsonPrimitive.int)
            assertEquals(JsonArray(listOf(JsonPrimitive("tadel"))), report["leader_attended"])
            assertEquals(0, report["disciples_count"]!!.jsonPrimitive.int)
            assertEquals(0, report["disciples_discipled_this_week"]!!.jsonPrimitive.int)
            assertEquals(JsonArray(emptyList()), report["pastoring_activity_type"])
            assertEquals("Café", report["pastoring_activity_other"]!!.jsonPrimitive.content)
            assertEquals(JsonArray(emptyList()), report["training_activity_type"])
            // committed_* and ids are derived server side: never sent.
            assertFalse(report.containsKey("committed_members"))
            assertFalse(report.containsKey("committed_members_present"))
            assertFalse(report.containsKey("life_group_id"))
            assertFalse(report.containsKey("date"))
            assertTrue(meeting.isReportSaved)
        }

    private suspend fun failure(
        status: HttpStatusCode,
        body: String,
    ): LifeGroupMeetingException {
        val repo = buildRepo(MockEngine { respond(body, status, jsonHeaders) })
        return assertFailsWith<LifeGroupMeetingException> { repo.getMeeting(7, "2026-10-08", extraMeeting = null) }
    }

    @Test
    fun `errors keep status and code for extra_meeting_required`() =
        runTest {
            val e =
                failure(
                    HttpStatusCode.BadRequest,
                    """{"statusCode":400,"error":"Bad Request","code":"extra_meeting_required","message":"2026-10-08 is not a Quarta-feira"}""",
                )
            assertEquals(400, e.statusCode)
            assertEquals("extra_meeting_required", e.code)
            assertTrue(LifeGroupMeetingErrors.requiresExtraChoice(e))
        }

    @Test
    fun `errors map 403 edit window 404 409 and 422 codes`() =
        runTest {
            val closed = failure(HttpStatusCode.Forbidden, """{"statusCode":403,"code":"edit_window_closed","message":"closed"}""")
            assertEquals(403, closed.statusCode)
            assertTrue(LifeGroupMeetingErrors.isEditWindowClosed(closed))

            assertEquals(404, failure(HttpStatusCode.NotFound, """{"statusCode":404,"message":"Life group with ID 7 not found"}""").statusCode)

            val attendanceRequired = failure(HttpStatusCode.Conflict, """{"statusCode":409,"code":"attendance_required","message":"x"}""")
            assertEquals("attendance_required", attendanceRequired.code)

            val limit = failure(HttpStatusCode.Conflict, """{"statusCode":409,"code":"extra_meeting_limit_reached","message":"x"}""")
            assertEquals("extra_meeting_limit_reached", limit.code)

            val noSector = failure(HttpStatusCode.UnprocessableEntity, """{"statusCode":422,"code":"group_has_no_sector","message":"x"}""")
            assertEquals(422, noSector.statusCode)
            assertEquals("group_has_no_sector", noSector.code)
        }

    @Test
    fun `validation array messages are joined and a non json body still throws`() =
        runTest {
            val validation =
                failure(
                    HttpStatusCode.BadRequest,
                    """{"statusCode":400,"error":"Bad Request","message":["report.guests must not be less than 0","report.mdas must be an integer"]}""",
                )
            assertNull(validation.code)
            assertEquals("report.guests must not be less than 0; report.mdas must be an integer", validation.serverMessage)

            val html = failure(HttpStatusCode.BadGateway, "<html>bad gateway</html>")
            assertEquals(502, html.statusCode)
            assertNull(html.code)
            assertNull(html.serverMessage)
        }
}
