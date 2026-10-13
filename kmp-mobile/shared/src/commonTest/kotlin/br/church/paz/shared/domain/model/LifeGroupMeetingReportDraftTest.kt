package br.church.paz.shared.domain.model

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class LifeGroupMeetingReportDraftTest {
    private val valid =
        LifeGroupMeetingReportDraft(
            kids0To11 = "3",
            guests = "2",
            mdas = "1",
            offering = "150,50",
            committedAtTadel = "4",
            committedAtCulto = "5",
            leaderAttended = "tadel, culto",
            disciplesCount = "6",
            disciplesDiscipledThisWeek = "2",
            pastoringActivityType = "visita; ligação",
            pastoringActivityOther = "  Café  ",
            trainingActivityType = "",
            trainingActivityOther = "",
        )

    @Test
    fun `an empty draft is valid and sends zeros`() {
        val input = LifeGroupMeetingReportDraft().toInput()
        assertNotNull(input)
        assertEquals(0, input.kids0To11)
        assertEquals("0.00", input.offering)
        assertEquals(emptyList(), input.leaderAttended)
        assertNull(input.pastoringActivityOther)
    }

    @Test
    fun `toInput parses counts offering and multi values`() {
        val input = valid.toInput()
        assertNotNull(input)
        assertEquals(3, input.kids0To11)
        assertEquals(2, input.guests)
        assertEquals(1, input.mdas)
        assertEquals("150.50", input.offering)
        assertEquals(4, input.committedAtTadel)
        assertEquals(5, input.committedAtCulto)
        assertEquals(listOf("tadel", "culto"), input.leaderAttended)
        assertEquals(6, input.disciplesCount)
        assertEquals(2, input.disciplesDiscipledThisWeek)
        assertEquals(listOf("visita", "ligação"), input.pastoringActivityType)
        assertEquals("Café", input.pastoringActivityOther)
        assertEquals(emptyList(), input.trainingActivityType)
        assertNull(input.trainingActivityOther)
    }

    @Test
    fun `validation reports one message per invalid field in form order`() {
        val bad =
            valid.copy(
                kids0To11 = "-1",
                offering = "abc",
                pastoringActivityType = (1..21).joinToString(","),
                trainingActivityOther = "x".repeat(181),
                leaderAttended = "y".repeat(81),
            )
        val result = bad.validate()
        assertFalse(result.isValid)
        assertNotNull(result.errorFor(LifeGroupMeetingReportField.KIDS_0_TO_11))
        assertNotNull(result.errorFor(LifeGroupMeetingReportField.OFFERING))
        assertNotNull(result.errorFor(LifeGroupMeetingReportField.PASTORING_ACTIVITY_TYPE))
        assertNotNull(result.errorFor(LifeGroupMeetingReportField.TRAINING_ACTIVITY_OTHER))
        assertNotNull(result.errorFor(LifeGroupMeetingReportField.LEADER_ATTENDED))
        assertNull(result.errorFor(LifeGroupMeetingReportField.GUESTS))
        assertEquals(result.errors[LifeGroupMeetingReportField.KIDS_0_TO_11], result.firstError)
        assertNull(bad.toInput())
    }

    @Test
    fun `counts above the backend maximum are rejected`() {
        assertFalse(valid.copy(guests = "100001").validate().isValid)
        assertTrue(valid.copy(guests = "100000").validate().isValid)
    }

    @Test
    fun `fromReport round trips through toInput`() {
        val report =
            LifeGroupWeeklyReport(
                id = "r",
                date = "2026-10-07",
                lifeGroupId = 7,
                committedMembers = 10,
                committedMembersPresent = 8,
                kids0To11 = 3,
                guests = 2,
                mdas = 1,
                offering = "150.50",
                committedAtTadel = 4,
                committedAtCulto = 5,
                leaderAttended = listOf("tadel", "culto"),
                disciplesCount = 6,
                disciplesDiscipledThisWeek = 2,
                pastoringActivityType = listOf("visita"),
                pastoringActivityOther = "Café",
                trainingActivityType = emptyList(),
                trainingActivityOther = null,
                submittedByName = "Ana",
                createdAt = null,
            )
        val input = LifeGroupMeetingReportDraft.fromReport(report).toInput()
        assertNotNull(input)
        assertEquals(3, input.kids0To11)
        assertEquals("150.50", input.offering)
        assertEquals(listOf("tadel", "culto"), input.leaderAttended)
        assertEquals("Café", input.pastoringActivityOther)
        assertNull(input.trainingActivityOther)
    }
}
