package br.church.paz.shared.domain.model

import br.church.paz.shared.domain.repository.LifeGroupMeetingException
import kotlinx.datetime.Instant
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class LifeGroupMeetingRulesTest {
    private fun entry(
        id: Int,
        present: Boolean,
    ) = LifeGroupAttendanceEntry(userId = id, name = "M$id", present = present)

    private fun attendance(
        entries: List<LifeGroupAttendanceEntry>,
        isDraft: Boolean = false,
        isExtra: Boolean = false,
    ) = LifeGroupMeetingAttendance(
        id = if (isDraft) null else "a-1",
        meetingDate = "2026-10-07",
        presentCount = entries.count { it.present },
        membersCount = entries.size,
        entries = entries,
        isDraft = isDraft,
        isExtra = isExtra,
        defaultPresent = if (isDraft) true else null,
    )

    private fun meeting(
        attendance: LifeGroupMeetingAttendance?,
        report: LifeGroupWeeklyReport? = null,
    ) = LifeGroupMeeting(
        lifeGroupId = 7,
        meetingDate = "2026-10-07",
        attendance = attendance,
        report = report,
        committedMembers = attendance?.membersCount,
        committedMembersPresent = attendance?.presentCount,
        canEdit = true,
        editDeadline = "2026-10-21",
        reportBlockedReason = null,
    )

    private fun report() =
        LifeGroupWeeklyReport(
            id = "r-1",
            date = "2026-10-07",
            lifeGroupId = 7,
            committedMembers = 3,
            committedMembersPresent = 2,
            kids0To11 = 1,
            guests = 2,
            mdas = 0,
            offering = "150.50",
            committedAtTadel = 1,
            committedAtCulto = 2,
            leaderAttended = listOf("tadel"),
            disciplesCount = 4,
            disciplesDiscipledThisWeek = 1,
            pastoringActivityType = listOf("visita"),
            pastoringActivityOther = null,
            trainingActivityType = emptyList(),
            trainingActivityOther = "Curso",
            submittedByName = "Ana",
            createdAt = null,
        )

    // ---- dates ----

    @Test
    fun `today in Sao Paulo uses the church timezone not UTC`() {
        // 02:00 UTC on the 13th is still 23:00 on the 12th in Sao Paulo.
        val millis = Instant.parse("2026-10-13T02:00:00Z").toEpochMilliseconds()
        assertEquals("2026-10-12", LifeGroupMeetingRules.todayInSaoPaulo(millis))
    }

    @Test
    fun `displayDate formats ISO and leaves other text untouched`() {
        assertEquals("07/10/2026", LifeGroupMeetingRules.displayDate("2026-10-07"))
        assertEquals("nope", LifeGroupMeetingRules.displayDate("nope"))
    }

    @Test
    fun `isSelectableDate rejects future and invalid dates`() {
        assertTrue(LifeGroupMeetingRules.isSelectableDate("2026-10-13", "2026-10-13"))
        assertTrue(LifeGroupMeetingRules.isSelectableDate("2026-10-01", "2026-10-13"))
        assertFalse(LifeGroupMeetingRules.isSelectableDate("2026-10-14", "2026-10-13"))
        assertFalse(LifeGroupMeetingRules.isSelectableDate("13/10/2026", "2026-10-13"))
    }

    // ---- extra meeting ----

    @Test
    fun `needsExtraMeeting only for fixed day groups on another weekday`() {
        // 2026-10-07 is a Wednesday, 2026-10-08 a Thursday.
        assertFalse(LifeGroupMeetingRules.needsExtraMeeting("Quarta-feira", "2026-10-07"))
        assertTrue(LifeGroupMeetingRules.needsExtraMeeting("Quarta-feira", "2026-10-08"))
        assertFalse(LifeGroupMeetingRules.needsExtraMeeting(null, "2026-10-08"))
        assertFalse(LifeGroupMeetingRules.needsExtraMeeting("Sem dia fixo", "2026-10-08"))
        assertFalse(LifeGroupMeetingRules.needsExtraMeeting("Quarta-feira", "garbage"))
    }

    @Test
    fun `weekdayOfMeetingDay understands every backend weekday name`() {
        val names =
            listOf("Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado")
        assertEquals(7, names.mapNotNull { LifeGroupMeetingRules.weekdayOfMeetingDay(it) }.toSet().size)
        assertNull(LifeGroupMeetingRules.weekdayOfMeetingDay("Sem dia fixo"))
        assertNull(LifeGroupMeetingRules.weekdayOfMeetingDay(""))
    }

    @Test
    fun `defaultNewMeetingDate is the latest regular date on or before today`() {
        // 2026-10-13 is a Tuesday.
        assertEquals("2026-10-07", LifeGroupMeetingRules.defaultNewMeetingDate("Quarta-feira", "2026-10-13"))
        assertEquals("2026-10-13", LifeGroupMeetingRules.defaultNewMeetingDate("Terça-feira", "2026-10-13"))
        assertEquals("2026-10-11", LifeGroupMeetingRules.defaultNewMeetingDate("Domingo", "2026-10-13"))
        assertEquals("2026-10-13", LifeGroupMeetingRules.defaultNewMeetingDate(null, "2026-10-13"))
    }

    @Test
    fun `extraFlagForSave is true only when creating an extra meeting`() {
        val draft = attendance(listOf(entry(1, true)), isDraft = true)
        val saved = attendance(listOf(entry(1, true)), isDraft = false, isExtra = true)
        assertEquals(true, LifeGroupMeetingRules.extraFlagForSave(draft, extraSelected = true))
        assertNull(LifeGroupMeetingRules.extraFlagForSave(draft, extraSelected = false))
        // An existing record keeps its stored flag: never sent again.
        assertNull(LifeGroupMeetingRules.extraFlagForSave(saved, extraSelected = true))
        assertNull(LifeGroupMeetingRules.extraFlagForSave(null, extraSelected = true))
    }

    // ---- presence ----

    @Test
    fun `presence helpers toggle and bulk set`() {
        val entries = listOf(entry(1, true), entry(2, false))
        assertEquals("1 de 2 presentes", LifeGroupMeetingRules.presenceSummary(entries))
        assertFalse(LifeGroupMeetingRules.allPresent(entries))
        assertTrue(LifeGroupMeetingRules.allPresent(LifeGroupMeetingRules.setAllPresent(entries, true)))
        assertEquals(0, LifeGroupMeetingRules.presentCount(LifeGroupMeetingRules.setAllPresent(entries, false)))
        val toggled = LifeGroupMeetingRules.togglePresent(entries, 2)
        assertTrue(toggled.first { it.userId == 2 }.present)
        assertTrue(toggled.first { it.userId == 1 }.present)
        assertFalse(LifeGroupMeetingRules.allPresent(emptyList()))
        assertNotNull(LifeGroupMeetingRules.attendanceError(emptyList()))
        assertNull(LifeGroupMeetingRules.attendanceError(entries))
    }

    // ---- parsing ----

    @Test
    fun `parseCount accepts digits and blank only`() {
        assertEquals(0, LifeGroupMeetingRules.parseCount(""))
        assertEquals(12, LifeGroupMeetingRules.parseCount(" 12 "))
        assertEquals(100000, LifeGroupMeetingRules.parseCount("100000"))
        assertNull(LifeGroupMeetingRules.parseCount("100001"))
        assertNull(LifeGroupMeetingRules.parseCount("-1"))
        assertNull(LifeGroupMeetingRules.parseCount("1.5"))
        assertNull(LifeGroupMeetingRules.parseCount("abc"))
    }

    @Test
    fun `normalizeOffering handles pt-BR and plain decimals`() {
        assertEquals("150.50", LifeGroupMeetingRules.normalizeOffering("150,50"))
        assertEquals("150.50", LifeGroupMeetingRules.normalizeOffering("150.5"))
        assertEquals("1234.56", LifeGroupMeetingRules.normalizeOffering("R$ 1.234,56"))
        assertEquals("1234.00", LifeGroupMeetingRules.normalizeOffering("1.234"))
        assertEquals("150.00", LifeGroupMeetingRules.normalizeOffering("150"))
        assertEquals("0.00", LifeGroupMeetingRules.normalizeOffering(""))
        assertNull(LifeGroupMeetingRules.normalizeOffering("-5"))
        assertNull(LifeGroupMeetingRules.normalizeOffering("1,234"))
        assertNull(LifeGroupMeetingRules.normalizeOffering("123456789"))
        assertNull(LifeGroupMeetingRules.normalizeOffering("abc"))
    }

    @Test
    fun `splitValues and chip toggle`() {
        assertEquals(listOf("a", "b"), LifeGroupMeetingRules.splitValues("a, b;\n a ,"))
        assertTrue(LifeGroupMeetingRules.hasValue("Tadel, culto", "tadel"))
        assertEquals("tadel", LifeGroupMeetingRules.toggleValue("", "tadel"))
        assertEquals("tadel, culto", LifeGroupMeetingRules.toggleValue("tadel", "culto"))
        assertEquals("culto", LifeGroupMeetingRules.toggleValue("tadel, culto", "TADEL"))
    }

    // ---- local draft ----

    @Test
    fun `buildDraft is null when nothing changed`() {
        val m = meeting(attendance(listOf(entry(1, true), entry(2, false))), report())
        val draft =
            LifeGroupMeetingRules.buildDraft(
                m,
                m.attendance!!.entries,
                LifeGroupMeetingReportDraft.fromReport(m.report!!),
                extraMeeting = false,
            )
        assertNull(draft)
    }

    @Test
    fun `buildDraft keeps only the changed sections`() {
        val m = meeting(attendance(listOf(entry(1, true), entry(2, true))))
        val toggled = LifeGroupMeetingRules.togglePresent(m.attendance!!.entries, 2)
        val onlyAttendance =
            LifeGroupMeetingRules.buildDraft(m, toggled, LifeGroupMeetingReportDraft(), extraMeeting = false)
        assertNotNull(onlyAttendance)
        assertNull(onlyAttendance.report)
        assertEquals(listOf(LifeGroupMeetingDraftEntry(1, true), LifeGroupMeetingDraftEntry(2, false)), onlyAttendance.attendance)

        val onlyReport =
            LifeGroupMeetingRules.buildDraft(
                m,
                m.attendance!!.entries,
                LifeGroupMeetingReportDraft(guests = "3"),
                extraMeeting = false,
            )
        assertNotNull(onlyReport)
        assertNull(onlyReport.attendance)
        assertEquals("3", onlyReport.report?.guests)
    }

    @Test
    fun `buildDraft keeps the extra choice only while attendance is a draft`() {
        val draftMeeting = meeting(attendance(listOf(entry(1, true)), isDraft = true))
        val kept =
            LifeGroupMeetingRules.buildDraft(
                draftMeeting,
                draftMeeting.attendance!!.entries,
                LifeGroupMeetingReportDraft(),
                extraMeeting = true,
            )
        assertEquals(true, kept?.extraMeeting)

        val savedMeeting = meeting(attendance(listOf(entry(1, true)), isDraft = false, isExtra = true))
        assertNull(
            LifeGroupMeetingRules.buildDraft(
                savedMeeting,
                savedMeeting.attendance!!.entries,
                LifeGroupMeetingReportDraft(),
                extraMeeting = true,
            ),
        )
    }

    @Test
    fun `applyDraftEntries overlays known users only`() {
        val server = listOf(entry(1, true), entry(2, true))
        val applied =
            LifeGroupMeetingRules.applyDraftEntries(
                server,
                listOf(LifeGroupMeetingDraftEntry(2, false), LifeGroupMeetingDraftEntry(99, false)),
            )
        assertEquals(listOf(entry(1, true), entry(2, false)), applied)
        assertEquals(server, LifeGroupMeetingRules.applyDraftEntries(server, null))
    }

    // ---- history ----

    @Test
    fun `mergeHistory joins attendance and reports newest first`() {
        val attendance =
            listOf(
                LifeGroupAttendance("a1", 7, "2026-10-07", 6, 8, emptyList(), isDraft = false),
                LifeGroupAttendance("a2", 7, "2026-09-30", 5, 8, emptyList(), isDraft = false),
                LifeGroupAttendance(null, 7, "2026-10-14", 8, 8, emptyList(), isDraft = true),
            )
        val reports = listOf(report().copy(date = "2026-10-07"), report().copy(date = "2026-09-23"))

        val rows = LifeGroupMeetingRules.mergeHistory(attendance, reports)

        assertEquals(listOf("2026-10-07", "2026-09-30", "2026-09-23"), rows.map { it.date })
        assertTrue(rows[0].hasAttendance && rows[0].hasReport)
        assertTrue(rows[1].hasAttendance && !rows[1].hasReport)
        assertTrue(!rows[2].hasAttendance && rows[2].hasReport)
        assertEquals(6, rows[0].presentCount)
        assertNull(rows[2].presentCount)
        assertTrue(rows.all { it.reportStatusKnown })
    }

    @Test
    fun `mergeHistory marks report status unknown when reports failed to load`() {
        val rows =
            LifeGroupMeetingRules.mergeHistory(
                listOf(LifeGroupAttendance("a1", 7, "2026-10-07", 6, 8, emptyList(), isDraft = false)),
                reports = null,
            )
        assertEquals(1, rows.size)
        assertFalse(rows.single().reportStatusKnown)
        assertFalse(rows.single().hasReport)
    }

    // ---- errors ----

    @Test
    fun `error messages are keyed by code first then status`() {
        fun msg(
            status: Int,
            code: String? = null,
            server: String? = null,
        ) = LifeGroupMeetingErrors.message(LifeGroupMeetingException(status, code, server))

        assertTrue(msg(400, "extra_meeting_required").contains("Reunião extra"))
        assertTrue(msg(400, "extra_meeting_on_regular_day").contains("Desmarque"))
        assertTrue(msg(400, "extra_meeting_not_applicable").contains("não tem dia fixo"))
        assertTrue(msg(400, "extra_meeting_immutable").contains("não pode ser alterado"))
        assertTrue(msg(409, "extra_meeting_limit_reached").contains("limite"))
        assertTrue(msg(409, "attendance_required").contains("Salve a presença"))
        assertTrue(msg(403, "edit_window_closed").contains("prazo"))
        assertTrue(msg(422, "group_has_no_sector").contains("setor"))
        assertTrue(msg(422, "sector_has_no_area").contains("área"))
        assertTrue(msg(403).contains("permissão"))
        assertTrue(msg(404).contains("não encontrado"))
        assertTrue(msg(409).contains("ao mesmo tempo"))
        assertTrue(msg(500).contains("servidor"))
        assertEquals("custom", msg(400, null, "custom"))
        assertTrue(LifeGroupMeetingErrors.message(RuntimeException("boom")).contains("conexão"))
    }

    @Test
    fun `requiresExtraChoice and isEditWindowClosed read the code`() {
        assertTrue(LifeGroupMeetingErrors.requiresExtraChoice(LifeGroupMeetingException(400, "extra_meeting_required", null)))
        assertFalse(LifeGroupMeetingErrors.requiresExtraChoice(LifeGroupMeetingException(400, "other", null)))
        assertFalse(LifeGroupMeetingErrors.requiresExtraChoice(RuntimeException()))
        assertTrue(LifeGroupMeetingErrors.isEditWindowClosed(LifeGroupMeetingException(403, "edit_window_closed", null)))
    }

    @Test
    fun `read only and blocked copy mention the dates and reasons`() {
        assertTrue(LifeGroupMeetingRules.readOnlyMessage("2026-10-21").contains("21/10/2026"))
        assertTrue(LifeGroupMeetingRules.editableUntilMessage("2026-10-21").contains("21/10/2026"))
        assertTrue(LifeGroupMeetingRules.reportBlockedMessage(MeetingReportBlockedReason.GROUP_HAS_NO_SECTOR).contains("setor"))
        assertTrue(LifeGroupMeetingRules.reportBlockedMessage(MeetingReportBlockedReason.SECTOR_HAS_NO_AREA).contains("área"))
    }
}
