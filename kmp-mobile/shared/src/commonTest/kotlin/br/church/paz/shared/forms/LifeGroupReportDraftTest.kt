package br.church.paz.shared.forms

import br.church.paz.shared.domain.model.LifeGroup
import br.church.paz.shared.domain.model.LifeGroupReportDraft
import br.church.paz.shared.domain.model.LifeGroupReportField
import br.church.paz.shared.domain.model.LifeGroupReportRules
import br.church.paz.shared.domain.model.UserRole
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class LifeGroupReportDraftTest {
    private val today = "2026-10-12"

    private fun validDraft() =
        LifeGroupReportDraft(
            date = "2026-10-11",
            lifeGroupId = 7,
            committedMembers = "10",
            committedMembersPresent = "8",
            kids0To11 = "3",
            guests = "2",
            mdas = "1",
            offering = "150,50",
            committedAtTadel = "4",
            committedAtCulto = "5",
            leaderAttended = "Tadel, Culto",
            disciplesCount = "6",
            disciplesDiscipledThisWeek = "2",
            pastoringActivityType = "Visita",
            trainingActivityType = "",
        )

    // region today in Sao Paulo

    @Test
    fun `today uses the Sao Paulo calendar day and not UTC`() {
        // 2026-10-12T02:30:00Z is still 2026-10-11 23:30 in Sao Paulo (UTC-3).
        val lateEveningSp = 1_791_772_200_000L
        assertEquals("2026-10-11", LifeGroupReportRules.todayInSaoPaulo(lateEveningSp))
        // 2026-10-12T03:00:00Z is 2026-10-12 00:00 in Sao Paulo.
        assertEquals("2026-10-12", LifeGroupReportRules.todayInSaoPaulo(lateEveningSp + 30 * 60 * 1000L))
    }

    // endregion

    // region dates

    @Test
    fun `date accepts today and past and rejects future and blank and malformed`() {
        assertNull(LifeGroupReportRules.dateError("2026-10-12", today))
        assertNull(LifeGroupReportRules.dateError("2026-01-01", today))
        assertEquals("A data não pode ser futura.", LifeGroupReportRules.dateError("2026-10-13", today))
        assertNotNull(LifeGroupReportRules.dateError("", today))
        assertNotNull(LifeGroupReportRules.dateError("12/10/2026", today))
        assertNotNull(LifeGroupReportRules.dateError("2026-02-30", today))
    }

    @Test
    fun `displayDate formats ISO as dd MM yyyy`() {
        assertEquals("05/10/2026", LifeGroupReportRules.displayDate("2026-10-05"))
        assertEquals("x", LifeGroupReportRules.displayDate("x"))
    }

    // endregion

    // region counts

    @Test
    fun `counts are non-negative integers up to 100000 and blank is zero`() {
        assertEquals(0, LifeGroupReportRules.parseCount(""))
        assertEquals(0, LifeGroupReportRules.parseCount("  "))
        assertEquals(12, LifeGroupReportRules.parseCount(" 12 "))
        assertEquals(100000, LifeGroupReportRules.parseCount("100000"))
        assertNull(LifeGroupReportRules.parseCount("100001"))
        assertNull(LifeGroupReportRules.parseCount("-1"))
        assertNull(LifeGroupReportRules.parseCount("1.5"))
        assertNull(LifeGroupReportRules.parseCount("1e3"))
        assertNull(LifeGroupReportRules.parseCount("abc"))
        assertNull(LifeGroupReportRules.parseCount("99999999999"))
    }

    // endregion

    // region offering

    @Test
    fun `offering accepts comma or dot decimals and normalises to two decimals`() {
        assertEquals("150.50", LifeGroupReportRules.normalizeOffering("150,50"))
        assertEquals("150.50", LifeGroupReportRules.normalizeOffering("150.5"))
        assertEquals("150.50", LifeGroupReportRules.normalizeOffering("150.50"))
        assertEquals("150.00", LifeGroupReportRules.normalizeOffering("150"))
        assertEquals("0.50", LifeGroupReportRules.normalizeOffering("0,5"))
        assertEquals("1234.56", LifeGroupReportRules.normalizeOffering("1.234,56"))
        assertEquals("1234.56", LifeGroupReportRules.normalizeOffering("R$ 1.234,56"))
        assertEquals("1234.00", LifeGroupReportRules.normalizeOffering("1.234"))
        assertEquals("1234567.00", LifeGroupReportRules.normalizeOffering("1.234.567"))
        assertEquals("0.00", LifeGroupReportRules.normalizeOffering(""))
        assertEquals("7.00", LifeGroupReportRules.normalizeOffering("007"))
    }

    @Test
    fun `offering rejects invalid amounts`() {
        assertNull(LifeGroupReportRules.normalizeOffering("-5"))
        assertNull(LifeGroupReportRules.normalizeOffering("abc"))
        assertNull(LifeGroupReportRules.normalizeOffering("1,2,3"))
        assertNull(LifeGroupReportRules.normalizeOffering("10,555"))
        assertNull(LifeGroupReportRules.normalizeOffering("123456789"))
        assertNull(LifeGroupReportRules.normalizeOffering(",50"))
    }

    // endregion

    // region multi values

    @Test
    fun `splitValues trims and drops blanks and duplicates`() {
        assertEquals(listOf("a", "b", "c"), LifeGroupReportRules.splitValues(" a, b ;c\n, ,a"))
        assertEquals(emptyList(), LifeGroupReportRules.splitValues("  "))
    }

    @Test
    fun `values over 20 items or 80 chars are invalid`() {
        val tooMany = (1..21).joinToString(",") { "i$it" }
        val tooLong = "x".repeat(81)
        assertNotNull(validDraft().copy(leaderAttended = tooMany).validate(today).errorFor(LifeGroupReportField.LEADER_ATTENDED))
        assertNotNull(
            validDraft().copy(pastoringActivityType = tooLong).validate(today)
                .errorFor(LifeGroupReportField.PASTORING_ACTIVITY_TYPE),
        )
        assertTrue(validDraft().copy(trainingActivityType = (1..20).joinToString(",") { "i$it" }).validate(today).isValid)
        assertTrue(validDraft().copy(trainingActivityType = "y".repeat(80)).validate(today).isValid)
    }

    @Test
    fun `other fields are capped at 180 chars`() {
        val ok = validDraft().copy(pastoringActivityOther = "o".repeat(180), trainingActivityOther = "o".repeat(180))
        assertTrue(ok.validate(today).isValid)
        val bad = validDraft().copy(pastoringActivityOther = "o".repeat(181), trainingActivityOther = "o".repeat(181))
        val v = bad.validate(today)
        assertNotNull(v.errorFor(LifeGroupReportField.PASTORING_ACTIVITY_OTHER))
        assertNotNull(v.errorFor(LifeGroupReportField.TRAINING_ACTIVITY_OTHER))
    }

    // endregion

    // region validate / toForm

    @Test
    fun `valid draft builds the exact payload`() {
        val form = assertNotNull(validDraft().toForm(today))
        assertEquals("2026-10-11", form.date)
        assertEquals(7, form.lifeGroupId)
        assertEquals(10, form.committedMembers)
        assertEquals(8, form.committedMembersPresent)
        assertEquals(3, form.kids0To11)
        assertEquals(2, form.guests)
        assertEquals(1, form.mdas)
        assertEquals("150.50", form.offering)
        assertEquals(4, form.committedAtTadel)
        assertEquals(5, form.committedAtCulto)
        assertEquals(listOf("Tadel", "Culto"), form.leaderAttended)
        assertEquals(6, form.disciplesCount)
        assertEquals(2, form.disciplesDiscipledThisWeek)
        assertEquals(listOf("Visita"), form.pastoringActivityType)
        assertNull(form.pastoringActivityOther)
        assertEquals(emptyList(), form.trainingActivityType)
        assertNull(form.trainingActivityOther)
    }

    @Test
    fun `blank counts submit as zero and other text is trimmed`() {
        val form =
            assertNotNull(
                LifeGroupReportDraft(
                    date = "2026-10-12",
                    lifeGroupId = 1,
                    pastoringActivityOther = "  Oração  ",
                ).toForm(today),
            )
        assertEquals(0, form.committedMembers)
        assertEquals("0.00", form.offering)
        assertEquals("Oração", form.pastoringActivityOther)
    }

    @Test
    fun `invalid draft reports one message per field and builds nothing`() {
        val draft =
            validDraft().copy(
                lifeGroupId = null,
                date = "2026-10-13",
                committedMembers = "-1",
                guests = "x",
                offering = "abc",
            )
        val v = draft.validate(today)
        assertFalse(v.isValid)
        assertNotNull(v.errorFor(LifeGroupReportField.LIFE_GROUP))
        assertNotNull(v.errorFor(LifeGroupReportField.DATE))
        assertNotNull(v.errorFor(LifeGroupReportField.COMMITTED_MEMBERS))
        assertNotNull(v.errorFor(LifeGroupReportField.GUESTS))
        assertNotNull(v.errorFor(LifeGroupReportField.OFFERING))
        assertNull(v.errorFor(LifeGroupReportField.MDAS))
        assertNotNull(v.firstError)
        assertNull(draft.toForm(today))
    }

    // endregion

    // region groups

    private fun group(
        id: Int,
        relationship: String?,
        supervised: Boolean = false,
    ) = LifeGroup(id = id, name = "G$id", relationship = relationship, isSupervised = supervised)

    @Test
    fun `only led or co-led groups are reportable`() {
        val groups =
            listOf(
                group(1, "leader"),
                group(2, "co_leader"),
                group(3, "supervisor", supervised = true),
                group(4, "member"),
                group(5, null),
                group(6, "leader", supervised = true),
            )
        assertEquals(listOf(1, 2, 6), LifeGroupReportRules.reportableGroups(groups).map { it.id })
    }

    @Test
    fun `supervisor-only and no-group messages differ`() {
        val supervisorOnly = listOf(group(3, "supervisor", supervised = true), group(4, "member"))
        assertTrue(LifeGroupReportRules.isSupervisorOnly(supervisorOnly))
        assertTrue(LifeGroupReportRules.noReportableGroupsMessage(supervisorOnly).contains("consultar"))
        val none = listOf(group(4, "member"))
        assertFalse(LifeGroupReportRules.isSupervisorOnly(none))
        assertTrue(LifeGroupReportRules.noReportableGroupsMessage(none).contains("líder ou co-líder"))
        assertFalse(LifeGroupReportRules.isSupervisorOnly(listOf(group(1, "leader"), group(3, "supervisor"))))
    }

    @Test
    fun `initial group is the preselected one and the only one and or none`() {
        val one = listOf(group(1, "leader"))
        val two = listOf(group(1, "leader"), group(2, "co_leader"))
        assertEquals(1, LifeGroupReportRules.initialGroupId(one, null))
        assertEquals(2, LifeGroupReportRules.initialGroupId(two, 2))
        assertNull(LifeGroupReportRules.initialGroupId(two, null))
        // preselected id the viewer may not report for is ignored
        assertNull(LifeGroupReportRules.initialGroupId(two, 99))
        assertEquals(1, LifeGroupReportRules.initialGroupId(one, 99))
        assertNull(LifeGroupReportRules.initialGroupId(emptyList(), 1))
    }

    @Test
    fun `admin and pastor see all groups with nothing preselected unless opened from one`() {
        val mine = listOf(group(1, "leader"))
        val all = listOf(group(3, null), group(1, "leader"), group(2, null), group(2, null))
        for (role in listOf(UserRole.admin, UserRole.pastor)) {
            assertTrue(LifeGroupReportRules.seesAllGroups(role))
            val none = LifeGroupReportRules.resolveGroups(role, mine, all, null)
            assertEquals(listOf(1, 2, 3), none.groups.map { it.id })
            assertNull(none.initialGroupId)
            assertNull(none.emptyMessage)
            assertEquals(3, LifeGroupReportRules.resolveGroups(role, mine, all, 3).initialGroupId)
            assertNull(LifeGroupReportRules.resolveGroups(role, mine, all, 99).initialGroupId)
        }
        // A single existing group is still not auto-selected for admin.
        assertNull(LifeGroupReportRules.resolveGroups(UserRole.admin, emptyList(), listOf(group(5, null)), null).initialGroupId)
        assertEquals(
            "Nenhum Life Group cadastrado.",
            LifeGroupReportRules.resolveGroups(UserRole.admin, emptyList(), emptyList(), null).emptyMessage,
        )
    }

    @Test
    fun `other roles keep the leader or co-leader rule and ignore the full list`() {
        val mine = listOf(group(1, "leader"), group(2, "supervisor", supervised = true))
        val all = listOf(group(1, "leader"), group(2, null), group(3, null))
        for (role in listOf(UserRole.life_group_leader, UserRole.area_leader, UserRole.sector_leader, UserRole.member, null)) {
            assertFalse(LifeGroupReportRules.seesAllGroups(role))
            val resolved = LifeGroupReportRules.resolveGroups(role, mine, all, null)
            assertEquals(listOf(1), resolved.groups.map { it.id })
            assertEquals(1, resolved.initialGroupId)
        }
        val supervisorOnly =
            LifeGroupReportRules.resolveGroups(UserRole.area_leader, listOf(group(2, "supervisor")), all, null)
        assertTrue(supervisorOnly.groups.isEmpty())
        assertTrue(supervisorOnly.emptyMessage!!.contains("consultar"))
    }

    // endregion

    // region errors

    @Test
    fun `server statuses map to friendly pt-BR messages`() {
        assertTrue(LifeGroupReportRules.submitErrorMessage(400, "x").contains("Confira"))
        assertTrue(LifeGroupReportRules.submitErrorMessage(403, null).contains("permissão"))
        assertTrue(LifeGroupReportRules.submitErrorMessage(404, null).contains("Grupo não encontrado"))
        assertTrue(LifeGroupReportRules.submitErrorMessage(409, null).contains("Já existe"))
        assertTrue(LifeGroupReportRules.submitErrorMessage(422, null).contains("setor"))
        assertEquals("Muitas", LifeGroupReportRules.submitErrorMessage(429, "Muitas").take(6))
        assertTrue(LifeGroupReportRules.submitErrorMessage(500, null).contains("servidor"))
        assertTrue(LifeGroupReportRules.submitErrorMessage(null, "boom").contains("conexão"))
    }

    // endregion
}
