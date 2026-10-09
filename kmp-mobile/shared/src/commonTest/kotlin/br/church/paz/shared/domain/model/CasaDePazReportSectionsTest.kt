package br.church.paz.shared.domain.model

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class CasaDePazReportSectionsTest {

    private fun submission(
        id: String,
        date: String,
        casaDePazId: String,
    ) = CasaDePazReportSubmission(
        id = id,
        date = date,
        facilitator = "Facilitator",
        sectorId = 1,
        casaDePazId = casaDePazId,
        createdAt = "",
        updatedAt = "",
    )

    private fun cycle(
        id: String,
        month: String,
        status: String = "active",
    ) = CasaDePazCycle(id = id, name = "Cycle $id", month = month, status = status)

    // MARK: - buildCasaDePazReportSections

    @Test
    fun `groups submissions by date within the selected cycle newest date first`() {
        val submissions = listOf(
            submission("1", "2026-01-10", casaDePazId = "cycle-a"),
            submission("2", "2026-01-10", casaDePazId = "cycle-a"),
            submission("3", "2026-01-05", casaDePazId = "cycle-a"),
            submission("4", "2026-01-20", casaDePazId = "cycle-b"),
        )

        val sections = buildCasaDePazReportSections(submissions, selectedCycleId = "cycle-a")

        assertEquals(listOf("2026-01-10", "2026-01-05"), sections.map { it.date })
        assertEquals(2, sections.first { it.date == "2026-01-10" }.submissions.size)
        assertEquals(1, sections.first { it.date == "2026-01-05" }.submissions.size)
    }

    @Test
    fun `returns no sections when the cycle has no submissions`() {
        val submissions = listOf(submission("1", "2026-01-10", casaDePazId = "cycle-a"))

        val sections = buildCasaDePazReportSections(submissions, selectedCycleId = "cycle-b")

        assertEquals(emptyList(), sections)
    }

    // MARK: - defaultCasaDePazCycleSelection

    @Test
    fun `defaults to the cycle of the newest submission by date`() {
        val submissions = listOf(
            submission("1", "2026-01-05", casaDePazId = "cycle-a"),
            submission("2", "2026-01-20", casaDePazId = "cycle-b"),
        )
        val cycles = listOf(cycle("cycle-a", month = "2026-01"), cycle("cycle-b", month = "2026-01"))

        val result = defaultCasaDePazCycleSelection(submissions, cycles)

        assertEquals("cycle-b", result)
    }

    @Test
    fun `falls back to the newest cycle by month when there are no submissions`() {
        val cycles = listOf(cycle("cycle-a", month = "2025-12"), cycle("cycle-b", month = "2026-01"))

        val result = defaultCasaDePazCycleSelection(emptyList(), cycles)

        assertEquals("cycle-b", result)
    }

    @Test
    fun `falls back to the newest cycle when the newest submission references a deleted cycle`() {
        val submissions = listOf(submission("1", "2026-01-20", casaDePazId = "deleted-cycle"))
        val cycles = listOf(cycle("cycle-a", month = "2025-12"), cycle("cycle-b", month = "2026-01"))

        val result = defaultCasaDePazCycleSelection(submissions, cycles)

        assertEquals("cycle-b", result)
    }

    @Test
    fun `returns null when there are no cycles at all`() {
        assertNull(defaultCasaDePazCycleSelection(emptyList(), emptyList()))
    }
}
