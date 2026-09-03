package br.church.paz.shared.forms

import br.church.paz.shared.domain.model.AreaSupervisorReportForm
import br.church.paz.shared.domain.model.ConversionForm
import br.church.paz.shared.domain.model.GuestForm
import br.church.paz.shared.domain.model.MemberRegistrationForm
import br.church.paz.shared.domain.model.MultiplicationForm
import br.church.paz.shared.domain.model.SectorSupervisorReportForm
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlin.test.Test
import kotlin.test.assertTrue

class FormPayloadTest {
    private val json = Json { encodeDefaults = false }

    @Test
    fun `GuestForm serializes email and date`() {
        val form = GuestForm(
            fullName = "João", email = "j@ex.com", phone = "41999999999",
            invitedBy = null, viaCasaDePaz = false, date = "2026-06-18"
        )
        val encoded = json.encodeToString(form)
        assertTrue(encoded.contains("\"full_name\""))
        assertTrue(encoded.contains("\"email\""))
        assertTrue(encoded.contains("\"date\""))
    }

    @Test
    fun `MemberRegistrationForm serializes all required fields`() {
        val form = MemberRegistrationForm(
            fullName = "Maria", birthDate = "1990-01-01", phone = "41999999999",
            gender = "f", civilState = "solteiro", sectorId = 1
        )
        val encoded = json.encodeToString(form)
        assertTrue(encoded.contains("\"full_name\""))
        assertTrue(encoded.contains("\"birth_date\""))
        assertTrue(encoded.contains("\"sector_id\""))
    }

    @Test
    fun `ConversionForm serializes decision_type`() {
        val form = ConversionForm(
            fullName = "Pedro", email = "p@ex.com", phone = "41999999999",
            decisionType = "first_time", howMetChurch = "amigo", gender = "m",
            birthDate = "2000-05-10", civilState = "solteiro",
            address = "Rua X", attendanceCount = "1", lifeGroupStatus = "sim"
        )
        val encoded = json.encodeToString(form)
        assertTrue(encoded.contains("\"decision_type\""))
        assertTrue(encoded.contains("\"how_met_church\""))
    }

    @Test
    fun `MultiplicationForm serializes id arrays`() {
        val form = MultiplicationForm(
            date = "2026-06-01", sourceLifeGroupId = 5,
            newLifeGroupName = "GL Norte", newLeaderId = 10, hostId = 11,
            leaderPhone = "41999999999", meetingDayTime = "Sexta 19h", address = "Rua Y",
            membersToMove = listOf(1, 2), newMembers = listOf(3),
            completedLeadershipTrack = true, faithfulTither = true,
            evangelizingAndConsolidating = true, goodTestimony = true
        )
        val encoded = json.encodeToString(form)
        assertTrue(encoded.contains("\"source_life_group_id\""))
        assertTrue(encoded.contains("\"members_to_move\""))
    }

    @Test
    fun `SectorSupervisorReportForm serializes correctly`() {
        val form = SectorSupervisorReportForm(
            date = "2026-06-01", sectorId = 3,
            lifeGroupsCount = 5, lifeGroupsSupervised = 4
        )
        val encoded = json.encodeToString(form)
        assertTrue(encoded.contains("\"sector_id\""))
        assertTrue(encoded.contains("\"life_groups_count\""))
    }

    @Test
    fun `AreaSupervisorReportForm serializes correctly`() {
        val form = AreaSupervisorReportForm(
            date = "2026-06-01", areaId = 2,
            lifeGroupsCount = 10, lifeGroupsSupervised = 8
        )
        val encoded = json.encodeToString(form)
        assertTrue(encoded.contains("\"area_id\""))
    }
}
