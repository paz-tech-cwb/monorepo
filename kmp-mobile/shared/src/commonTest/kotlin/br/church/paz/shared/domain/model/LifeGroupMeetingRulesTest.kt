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
        canWrite = true,
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
    fun `normalizeOffering rejects more than two decimals instead of inflating`() {
        assertNull(LifeGroupMeetingRules.normalizeOffering("0.125"))
        assertNull(LifeGroupMeetingRules.normalizeOffering("0,125"))
        assertNull(LifeGroupMeetingRules.normalizeOffering("1.2345"))
        assertEquals("0.12", LifeGroupMeetingRules.normalizeOffering("0.12"))
        assertEquals("1234.00", LifeGroupMeetingRules.normalizeOffering("1.234"))
    }

    @Test
    fun `extra flag rejection codes are recognised`() {
        assertTrue(LifeGroupMeetingErrors.isExtraFlagRejected(LifeGroupMeetingException(400, "extra_meeting_on_regular_day", null)))
        assertTrue(LifeGroupMeetingErrors.isExtraFlagRejected(LifeGroupMeetingException(400, "extra_meeting_not_applicable", null)))
        assertFalse(LifeGroupMeetingErrors.isExtraFlagRejected(LifeGroupMeetingException(400, "extra_meeting_required", null)))
        assertFalse(LifeGroupMeetingErrors.isExtraFlagRejected(RuntimeException("x")))
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
        // A bare 404 is NOT "group not found": the route may be missing on the server.
        assertEquals(LifeGroupMeetingErrors.MESSAGE_SERVER_UNAVAILABLE, msg(404))
        assertEquals(LifeGroupMeetingErrors.MESSAGE_GROUP_NOT_FOUND, msg(404, "group_not_found"))
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

    @Test
    fun `canWrite is leadership of this group or admin or pastor only`() {
        // The group's own leader/co-leader writes whatever the role (a co-leader is often `member`).
        for (role in UserRole.entries + null) assertTrue(LifeGroupMeetingRules.canWrite(role, isGroupLeadership = true))
        assertTrue(LifeGroupMeetingRules.canWrite(UserRole.admin, false))
        assertTrue(LifeGroupMeetingRules.canWrite(UserRole.pastor, false))
        // Supervisors (area/sector leaders via scope), another group's leader and everyone else: read-only.
        for (role in listOf(
            UserRole.area_leader,
            UserRole.sector_leader,
            UserRole.life_group_leader,
            UserRole.member,
            UserRole.guest,
            UserRole.discipler,
            null,
        )) {
            assertFalse(LifeGroupMeetingRules.canWrite(role, isGroupLeadership = false), "role=$role")
        }
    }

    @Test
    fun `isEditable needs both the role permission and the open edit window`() {
        val base = meeting(attendance = null)
        assertTrue(base.isEditable)
        assertFalse(base.copy(canWrite = false).isEditable)
        assertFalse(base.copy(canEdit = false).isEditable)
        assertFalse(base.copy(canWrite = false, canEdit = false).isEditable)
    }

    @Test
    fun `write forbidden copy explains who can write`() {
        assertTrue(LifeGroupMeetingRules.writeForbiddenMessage().contains("Somente leitura"))
        assertTrue(LifeGroupMeetingRules.noMeetingToViewMessage().contains("Não há reunião"))
    }

    @Test
    fun `404 is group not found only with the group_not_found code or the legacy group message`() {
        fun kind(
            status: Int,
            code: String? = null,
            server: String? = null,
        ) = LifeGroupMeetingErrors.kind(LifeGroupMeetingException(status, code, server))

        assertEquals(LifeGroupMeetingErrors.Kind.GROUP_NOT_FOUND, kind(404, "group_not_found"))
        // Older backend: no code, the Nest NotFoundException message.
        assertEquals(LifeGroupMeetingErrors.Kind.GROUP_NOT_FOUND, kind(404, null, "Life group with ID 2 not found"))
        // Route not deployed: Nest's generic 404.
        assertEquals(LifeGroupMeetingErrors.Kind.SERVER_UNAVAILABLE, kind(404, null, "Cannot GET /api/life-groups/2/meetings/2026-09-08"))
        assertEquals(LifeGroupMeetingErrors.Kind.SERVER_UNAVAILABLE, kind(404))
        // A different code on a 404 is not a group lookup failure either.
        assertEquals(LifeGroupMeetingErrors.Kind.SERVER_UNAVAILABLE, kind(404, "something_else"))
        assertEquals(LifeGroupMeetingErrors.Kind.SERVER_UNAVAILABLE, kind(503))
        assertEquals(LifeGroupMeetingErrors.Kind.NO_PERMISSION, kind(403, "meeting_write_forbidden"))
        assertEquals(LifeGroupMeetingErrors.Kind.SESSION_EXPIRED, kind(401))
        assertEquals(LifeGroupMeetingErrors.Kind.OTHER, kind(500))
        assertEquals(LifeGroupMeetingErrors.Kind.OFFLINE, LifeGroupMeetingErrors.kind(RuntimeException("timeout")))
    }

    @Test
    fun `route unavailable never says group not found and the legacy message still does`() {
        val unavailable =
            LifeGroupMeetingErrors.message(
                LifeGroupMeetingException(404, null, "Cannot GET /api/life-groups/2/meetings/2026-09-08"),
            )
        assertEquals("Recurso indisponível no servidor. Tente novamente mais tarde.", unavailable)
        assertFalse(unavailable.contains("Grupo não encontrado"))
        assertTrue(
            LifeGroupMeetingErrors
                .message(LifeGroupMeetingException(404, null, "Life group with ID 2 not found"))
                .contains("Grupo não encontrado"),
        )
        assertEquals(LifeGroupMeetingErrors.MESSAGE_OFFLINE, LifeGroupMeetingErrors.message(RuntimeException("boom")))
    }

    @Test
    fun `history errors without a body are mapped by status`() {
        assertEquals(LifeGroupMeetingErrors.MESSAGE_OFFLINE, LifeGroupMeetingErrors.messageForHttpStatus(null, null))
        assertEquals(LifeGroupMeetingErrors.MESSAGE_NO_PERMISSION, LifeGroupMeetingErrors.messageForHttpStatus(403, null))
        assertEquals(LifeGroupMeetingErrors.MESSAGE_SERVER_UNAVAILABLE, LifeGroupMeetingErrors.messageForHttpStatus(404, null))
        assertTrue(LifeGroupMeetingErrors.messageForHttpStatus(500, null).contains("servidor"))
    }

    @Test
    fun `retry is offered except for a missing group and a missing permission`() {
        assertTrue(LifeGroupMeetingErrors.isRetryable(LifeGroupMeetingException(404, null, null)))
        assertTrue(LifeGroupMeetingErrors.isRetryable(RuntimeException("offline")))
        assertFalse(LifeGroupMeetingErrors.isRetryable(LifeGroupMeetingException(404, "group_not_found", null)))
        assertFalse(LifeGroupMeetingErrors.isRetryable(LifeGroupMeetingException(403, null, null)))
    }

    @Test
    fun `hasNoRecord is true for a draft without report and false once anything is saved`() {
        assertTrue(meeting(attendance(listOf(entry(1, true)), isDraft = true)).hasNoRecord)
        assertTrue(meeting(null).hasNoRecord)
        assertFalse(meeting(attendance(listOf(entry(1, true)))).hasNoRecord)
        assertFalse(meeting(null, report()).hasNoRecord)
        assertFalse(meeting(attendance(listOf(entry(1, true)), isDraft = true), report()).hasNoRecord)
    }

    @Test
    fun `history row of a legacy report has no presence`() {
        val rows =
            LifeGroupMeetingRules.mergeHistory(
                attendance = emptyList(),
                reports = listOf(report()),
            )
        assertTrue(rows.single().isReportOnly)
        assertFalse(
            LifeGroupMeetingSummary("2026-10-07", true, true, true, 2, 3).isReportOnly,
        )
    }

    // ---- entry ----

    private fun group(
        id: Int,
        name: String,
        relationship: String?,
        supervised: Boolean = false,
    ) = LifeGroup(id = id, name = name, relationship = relationship, isSupervised = supervised)

    @Test
    fun `entry opens the only led group directly`() {
        val entry =
            LifeGroupMeetingRules.resolveEntry(
                role = UserRole.member,
                myGroups = listOf(group(2, "Centro", "leader"), group(3, "Norte", "member")),
                allGroups = emptyList(),
            )
        assertEquals(2, entry.directGroupId)
        assertEquals(listOf(2), entry.groups.map { it.group.id })
        assertTrue(entry.groups.single().canWrite)
        assertNull(entry.emptyMessage)
    }

    @Test
    fun `entry shows a picker for several led groups sorted by name`() {
        val entry =
            LifeGroupMeetingRules.resolveEntry(
                UserRole.life_group_leader,
                listOf(group(5, "Zeta", "co_leader"), group(2, "alfa", "leader"), group(9, "Beta", "supervisor", supervised = true)),
                emptyList(),
            )
        assertNull(entry.directGroupId)
        // Led groups sorted by name, then the supervised one (read-only).
        assertEquals(listOf(2, 5, 9), entry.groups.map { it.group.id })
        assertEquals(listOf(true, true, false), entry.groups.map { it.canWrite })
    }

    @Test
    fun `entry for admin and pastor is a picker over every group even when there is one`() {
        val all = listOf(group(8, "B", null), group(1, "a", null), group(8, "B", null))
        val admin = LifeGroupMeetingRules.resolveEntry(UserRole.admin, emptyList(), all)
        assertNull(admin.directGroupId)
        assertEquals(listOf(1, 8), admin.groups.map { it.group.id })
        assertTrue(admin.groups.all { it.canWrite })
        val pastor = LifeGroupMeetingRules.resolveEntry(UserRole.pastor, emptyList(), listOf(group(4, "Solo", null)))
        assertNull(pastor.directGroupId)
        assertEquals(1, pastor.groups.size)
        assertEquals("Nenhum Life Group cadastrado.", LifeGroupMeetingRules.resolveEntry(UserRole.admin, emptyList(), emptyList()).emptyMessage)
    }

    @Test
    fun `entry for a supervisor only is read only`() {
        val several =
            LifeGroupMeetingRules.resolveEntry(
                UserRole.sector_leader,
                listOf(group(2, "A", "supervisor", true), group(3, "B", "member", true), group(4, "C", "member")),
                emptyList(),
            )
        assertNull(several.directGroupId)
        assertEquals(listOf(2, 3), several.groups.map { it.group.id })
        assertTrue(several.groups.none { it.canWrite })
        val single = LifeGroupMeetingRules.resolveEntry(UserRole.sector_leader, listOf(group(2, "A", "supervisor", true)), emptyList())
        assertEquals(2, single.directGroupId)
        assertFalse(single.groups.single().canWrite)
    }

    @Test
    fun `entry for someone who leads nothing explains why`() {
        val entry = LifeGroupMeetingRules.resolveEntry(UserRole.member, listOf(group(2, "A", "member")), emptyList())
        assertNull(entry.directGroupId)
        assertTrue(entry.groups.isEmpty())
        assertNotNull(entry.emptyMessage)
    }
}

class LifeGroupAttendanceSummaryTest {
    private fun point(
        meetings: Int,
        present: Int,
        members: Int,
    ) = LifeGroupAttendancePoint("2026-10", meetings, present, members, 0.0)

    @Test
    fun `summary sums the rows and rounds the percentage`() {
        val summary = listOf(point(2, 9, 12), point(1, 5, 12), point(0, 0, 0)).summarizeAttendance()
        assertEquals(3, summary.meetingsCount)
        assertEquals(14, summary.presentCount)
        assertEquals(24, summary.membersCount)
        assertEquals(58, summary.attendancePercent)
    }

    @Test
    fun `summary without any member slot has no percentage`() {
        val summary = listOf(point(0, 0, 0)).summarizeAttendance()
        assertEquals(0, summary.meetingsCount)
        assertNull(summary.attendancePercent)
        assertNull(emptyList<LifeGroupAttendancePoint>().summarizeAttendance().attendancePercent)
    }

    @Test
    fun `summary card copy is shared and keeps singular and plural correct`() {
        val many = listOf(point(2, 9, 12), point(1, 5, 12)).summarizeAttendance()
        assertEquals("Frequência do grupo", many.cardTitle)
        assertEquals("58%", many.cardValue)
        assertEquals("3 reuniões · 14 presenças de 24", many.cardSubtitle)
        val one = listOf(point(1, 1, 10)).summarizeAttendance()
        assertEquals("1 reunião · 1 presença de 10", one.cardSubtitle)
        assertEquals("–", emptyList<LifeGroupAttendancePoint>().summarizeAttendance().cardValue)
    }

    @Test
    fun `entry lists led groups first then supervised ones read-only`() {
        fun g(id: Int, name: String, rel: String?, supervised: Boolean = false) =
            LifeGroup(id = id, name = name, relationship = rel, isSupervised = supervised)
        val entry =
            LifeGroupMeetingRules.resolveEntry(
                UserRole.member,
                listOf(g(2, "B", "supervisor", true), g(1, "A", "leader")),
                emptyList(),
            )
        assertEquals(listOf(1, 2), entry.groups.map { it.group.id })
        assertEquals(listOf(true, false), entry.groups.map { it.canWrite })
        assertNull(entry.directGroupId)
    }

    @Test
    fun `error code passes through to the history copy`() {
        assertEquals(
            LifeGroupMeetingErrors.MESSAGE_GROUP_NOT_FOUND,
            LifeGroupMeetingErrors.messageForHttpStatus(404, LifeGroupMeetingErrors.CODE_GROUP_NOT_FOUND),
        )
        assertEquals(
            LifeGroupMeetingErrors.MESSAGE_SERVER_UNAVAILABLE,
            LifeGroupMeetingErrors.messageForHttpStatus(404, null),
        )
    }
}
