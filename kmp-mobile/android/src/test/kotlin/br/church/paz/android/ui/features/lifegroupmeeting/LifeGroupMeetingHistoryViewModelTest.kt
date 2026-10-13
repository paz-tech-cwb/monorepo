package br.church.paz.android.ui.features.lifegroupmeeting

import app.cash.turbine.test
import br.church.paz.android.util.MainDispatcherRule
import br.church.paz.shared.domain.model.LifeGroup
import br.church.paz.shared.domain.model.LifeGroupAttendance
import br.church.paz.shared.domain.model.LifeGroupWeeklyReport
import br.church.paz.shared.domain.repository.ChurchRepository
import br.church.paz.shared.domain.repository.LifeGroupAttendanceRepository
import br.church.paz.shared.domain.repository.LifeGroupReportRepository
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class LifeGroupMeetingHistoryViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val attendanceRepository = mockk<LifeGroupAttendanceRepository>()
    private val reportRepository = mockk<LifeGroupReportRepository>()
    private val churchRepository = mockk<ChurchRepository>()

    // 2026-10-13 is a Tuesday.
    private val today = "2026-10-13"

    private fun attendance(
        date: String,
        isDraft: Boolean = false,
    ) = LifeGroupAttendance(
        id = if (isDraft) null else "a-$date",
        lifeGroupId = 7,
        meetingDate = date,
        presentCount = 6,
        membersCount = 8,
        entries = emptyList(),
        isDraft = isDraft,
    )

    private fun report(date: String) =
        LifeGroupWeeklyReport(
            id = "r-$date",
            date = date,
            lifeGroupId = 7,
            committedMembers = 8,
            committedMembersPresent = 6,
            kids0To11 = 0,
            guests = 0,
            mdas = 0,
            offering = "0.00",
            committedAtTadel = 0,
            committedAtCulto = 0,
            leaderAttended = emptyList(),
            disciplesCount = 0,
            disciplesDiscipledThisWeek = 0,
            pastoringActivityType = emptyList(),
            pastoringActivityOther = null,
            trainingActivityType = emptyList(),
            trainingActivityOther = null,
            submittedByName = null,
            createdAt = null,
        )

    private fun group(meetingDay: String?) = LifeGroup(id = 7, name = "Grupo", meetingDay = meetingDay)

    private fun viewModel() = LifeGroupMeetingHistoryViewModel(7, attendanceRepository, reportRepository, churchRepository) { today }

    @Test
    fun `merges attendance and reports newest first with chips data`() =
        runTest {
            coEvery { attendanceRepository.getHistory(7) } returns listOf(attendance("2026-10-07"), attendance("2026-09-30"))
            coEvery { reportRepository.getReports(7) } returns listOf(report("2026-10-07"))
            coEvery { churchRepository.getAllLifeGroups(any()) } returns listOf(group("Quarta-feira"))

            val vm = viewModel()
            testScheduler.advanceUntilIdle()

            val state = vm.uiState.value
            assertFalse(state.isLoading)
            assertNull(state.error)
            assertEquals(listOf("2026-10-07", "2026-09-30"), state.meetings.map { it.date })
            assertTrue(state.meetings[0].hasReport)
            assertFalse(state.meetings[1].hasReport)
            assertTrue(state.meetings.all { it.reportStatusKnown })
            assertEquals("Quarta-feira", state.meetingDay)
        }

    @Test
    fun `a failing reports list hides the report chip instead of failing the screen`() =
        runTest {
            coEvery { attendanceRepository.getHistory(7) } returns listOf(attendance("2026-10-07"))
            coEvery { reportRepository.getReports(7) } throws RuntimeException("403")
            coEvery { churchRepository.getAllLifeGroups(any()) } throws RuntimeException("offline")

            val vm = viewModel()
            testScheduler.advanceUntilIdle()

            val state = vm.uiState.value
            assertNull(state.error)
            assertEquals(1, state.meetings.size)
            assertFalse(state.meetings.single().reportStatusKnown)
            assertNull(state.meetingDay)
        }

    @Test
    fun `attendance history failure surfaces an error and retry recovers`() =
        runTest {
            coEvery { attendanceRepository.getHistory(7) } throws RuntimeException("boom")
            coEvery { reportRepository.getReports(7) } returns emptyList()
            coEvery { churchRepository.getAllLifeGroups(any()) } returns emptyList()
            val vm = viewModel()
            testScheduler.advanceUntilIdle()
            assertEquals("boom", vm.uiState.value.error)

            coEvery { attendanceRepository.getHistory(7) } returns listOf(attendance("2026-10-07"))
            vm.load()
            testScheduler.advanceUntilIdle()

            assertNull(vm.uiState.value.error)
            assertEquals(1, vm.uiState.value.meetings.size)
        }

    @Test
    fun `new meeting defaults to the latest regular day and flags other weekdays as extra`() =
        runTest {
            coEvery { attendanceRepository.getHistory(7) } returns emptyList()
            coEvery { reportRepository.getReports(7) } returns emptyList()
            coEvery { churchRepository.getAllLifeGroups(any()) } returns listOf(group("Quarta-feira"))
            val vm = viewModel()
            testScheduler.advanceUntilIdle()

            assertEquals("2026-10-07", vm.defaultNewMeetingDate())
            assertFalse(vm.needsExtraMeeting("2026-10-07"))
            assertTrue(vm.needsExtraMeeting("2026-10-08"))
            assertEquals(today, vm.latestSelectableDate())
        }

    @Test
    fun `a group without a fixed day opens today and never needs extra`() =
        runTest {
            coEvery { attendanceRepository.getHistory(7) } returns emptyList()
            coEvery { reportRepository.getReports(7) } returns emptyList()
            coEvery { churchRepository.getAllLifeGroups(any()) } returns listOf(group("Sem dia fixo"))
            val vm = viewModel()
            testScheduler.advanceUntilIdle()

            assertEquals(today, vm.defaultNewMeetingDate())
            assertFalse(vm.needsExtraMeeting("2026-10-08"))
        }

    @Test
    fun `choosing a past date navigates and a future date is ignored`() =
        runTest {
            coEvery { attendanceRepository.getHistory(7) } returns emptyList()
            coEvery { reportRepository.getReports(7) } returns emptyList()
            coEvery { churchRepository.getAllLifeGroups(any()) } returns emptyList()
            val vm = viewModel()
            testScheduler.advanceUntilIdle()

            vm.effect.test {
                vm.onNewMeetingDateChosen("2026-10-14")
                vm.onNewMeetingDateChosen("2026-10-08")
                testScheduler.advanceUntilIdle()
                assertEquals(LifeGroupMeetingHistoryEffect.NavigateToMeeting("2026-10-08"), awaitItem())
                expectNoEvents()
            }
        }

    @Test
    fun `tapping a row navigates to that meeting`() =
        runTest {
            coEvery { attendanceRepository.getHistory(7) } returns listOf(attendance("2026-10-07"))
            coEvery { reportRepository.getReports(7) } returns emptyList()
            coEvery { churchRepository.getAllLifeGroups(any()) } returns emptyList()
            val vm = viewModel()
            testScheduler.advanceUntilIdle()

            vm.effect.test {
                vm.onMeetingTapped("2026-10-07")
                testScheduler.advanceUntilIdle()
                assertEquals(LifeGroupMeetingHistoryEffect.NavigateToMeeting("2026-10-07"), awaitItem())
            }
        }
}
