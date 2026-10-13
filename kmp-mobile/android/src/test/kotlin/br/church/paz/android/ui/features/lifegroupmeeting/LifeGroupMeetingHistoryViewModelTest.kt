package br.church.paz.android.ui.features.lifegroupmeeting

import app.cash.turbine.test
import br.church.paz.android.util.MainDispatcherRule
import br.church.paz.shared.domain.model.LifeGroupAttendance
import br.church.paz.shared.domain.model.LifeGroupMeetingErrors
import br.church.paz.shared.domain.model.LifeGroupWeeklyReport
import br.church.paz.shared.domain.repository.LifeGroupAttendanceRepository
import br.church.paz.shared.domain.repository.LifeGroupReportRepository
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.CompletableDeferred
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

    private fun viewModel(
        meetingDay: String? = null,
        canWrite: Boolean = true,
    ) = LifeGroupMeetingHistoryViewModel(7, attendanceRepository, reportRepository, meetingDay, canWrite) { today }

    @Test
    fun `merges attendance and reports newest first with chips data`() =
        runTest {
            coEvery { attendanceRepository.getHistory(7) } returns listOf(attendance("2026-10-07"), attendance("2026-09-30"))
            coEvery { reportRepository.getReports(7) } returns listOf(report("2026-10-07"))

            val vm = viewModel("Quarta-feira")
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

            val vm = viewModel()
            testScheduler.advanceUntilIdle()

            val state = vm.uiState.value
            assertNull(state.error)
            assertEquals(1, state.meetings.size)
            assertFalse(state.meetings.single().reportStatusKnown)
            assertNull(state.meetingDay)
        }

    @Test
    fun `init plus the on resume refresh never flashes the empty state nor loads twice`() =
        runTest {
            val gate = CompletableDeferred<Unit>()
            coEvery { attendanceRepository.getHistory(7) } coAnswers
                {
                    gate.await()
                    listOf(attendance("2026-10-07"))
                }
            coEvery { reportRepository.getReports(7) } returns emptyList()

            val vm = viewModel()
            testScheduler.runCurrent()
            // The screen's lifecycle observer fires ON_RESUME right after init, while the first load is in flight.
            vm.refresh()
            testScheduler.runCurrent()
            val inFlight = vm.uiState.value
            assertTrue(inFlight.isLoading)
            assertFalse(inFlight.isRefreshing)
            assertTrue(inFlight.meetings.isEmpty())

            gate.complete(Unit)
            testScheduler.advanceUntilIdle()
            assertFalse(vm.uiState.value.isLoading)
            assertEquals(1, vm.uiState.value.meetings.size)
            coVerify(exactly = 1) { attendanceRepository.getHistory(7) }
        }

    @Test
    fun `refresh after the first load keeps the list and reloads without the skeleton`() =
        runTest {
            coEvery { attendanceRepository.getHistory(7) } returns listOf(attendance("2026-10-07"))
            coEvery { reportRepository.getReports(7) } returns emptyList()
            val vm = viewModel()
            testScheduler.advanceUntilIdle()

            val gate = CompletableDeferred<Unit>()
            coEvery { attendanceRepository.getHistory(7) } coAnswers
                {
                    gate.await()
                    listOf(attendance("2026-10-07"))
                }
            vm.refresh()
            testScheduler.runCurrent()
            assertFalse(vm.uiState.value.isLoading)
            assertTrue(vm.uiState.value.isRefreshing)
            assertEquals(1, vm.uiState.value.meetings.size)

            gate.complete(Unit)
            testScheduler.advanceUntilIdle()
            assertFalse(vm.uiState.value.isRefreshing)
            coVerify(exactly = 2) { attendanceRepository.getHistory(7) }
        }

    @Test
    fun `the group day comes from the argument and blank means unknown`() =
        runTest {
            coEvery { attendanceRepository.getHistory(7) } returns emptyList()
            coEvery { reportRepository.getReports(7) } returns emptyList()
            assertNull(viewModel("  ").uiState.value.meetingDay)
            assertEquals("Quarta-feira", viewModel("Quarta-feira").uiState.value.meetingDay)
        }

    @Test
    fun `attendance history failure surfaces an error and retry recovers`() =
        runTest {
            coEvery { attendanceRepository.getHistory(7) } throws RuntimeException("boom")
            coEvery { reportRepository.getReports(7) } returns emptyList()
            val vm = viewModel()
            testScheduler.advanceUntilIdle()
            // No HTTP answer: the offline copy, not the raw exception text.
            assertEquals(LifeGroupMeetingErrors.MESSAGE_OFFLINE, vm.uiState.value.error)

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
            val vm = viewModel("Quarta-feira")
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
            val vm = viewModel("Sem dia fixo")
            testScheduler.advanceUntilIdle()

            assertEquals(today, vm.defaultNewMeetingDate())
            assertFalse(vm.needsExtraMeeting("2026-10-08"))
        }

    @Test
    fun `choosing a past date navigates and a future date is ignored`() =
        runTest {
            coEvery { attendanceRepository.getHistory(7) } returns emptyList()
            coEvery { reportRepository.getReports(7) } returns emptyList()
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
            val vm = viewModel()
            testScheduler.advanceUntilIdle()

            vm.effect.test {
                vm.onMeetingTapped("2026-10-07")
                testScheduler.advanceUntilIdle()
                assertEquals(LifeGroupMeetingHistoryEffect.NavigateToMeeting("2026-10-07"), awaitItem())
            }
        }

    @Test
    fun `a supervisor sees the history but cannot start a new meeting`() =
        runTest {
            coEvery { attendanceRepository.getHistory(7) } returns listOf(attendance("2026-10-07"))
            coEvery { reportRepository.getReports(7) } returns emptyList()
            val vm = viewModel(canWrite = false)
            testScheduler.advanceUntilIdle()

            assertFalse(vm.uiState.value.canWrite)
            assertEquals(1, vm.uiState.value.meetings.size)
            vm.effect.test {
                vm.onNewMeetingDateChosen("2026-10-08")
                vm.onMeetingTapped("2026-10-07")
                testScheduler.advanceUntilIdle()
                assertEquals(LifeGroupMeetingHistoryEffect.NavigateToMeeting("2026-10-07"), awaitItem())
                expectNoEvents()
            }
        }

    @Test
    fun `the group leader can start a new meeting`() =
        runTest {
            coEvery { attendanceRepository.getHistory(7) } returns emptyList()
            coEvery { reportRepository.getReports(7) } returns emptyList()
            val vm = viewModel(canWrite = true)
            testScheduler.advanceUntilIdle()

            assertTrue(vm.uiState.value.canWrite)
        }

    @Test
    fun `a legacy report without presence is a report only row`() =
        runTest {
            coEvery { attendanceRepository.getHistory(7) } returns listOf(attendance("2026-10-07"))
            coEvery { reportRepository.getReports(7) } returns listOf(report("2026-09-08"))
            val vm = viewModel()
            testScheduler.advanceUntilIdle()

            val rows = vm.uiState.value.meetings
            assertEquals(listOf("2026-10-07", "2026-09-08"), rows.map { it.date })
            assertFalse(rows[0].isReportOnly)
            assertTrue(rows[1].isReportOnly)
            // Tapping the legacy row opens the same meeting screen.
            vm.effect.test {
                vm.onMeetingTapped("2026-09-08")
                testScheduler.advanceUntilIdle()
                assertEquals(LifeGroupMeetingHistoryEffect.NavigateToMeeting("2026-09-08"), awaitItem())
            }
        }

    @Test
    fun `the screen starts on the meetings tab and switches to the group stats`() =
        runTest {
            coEvery { attendanceRepository.getHistory(7) } returns emptyList()
            coEvery { reportRepository.getReports(7) } returns emptyList()
            val vm = viewModel()
            testScheduler.advanceUntilIdle()

            assertEquals(LifeGroupMeetingsTab.MEETINGS, vm.uiState.value.selectedTab)
            vm.onTabSelected(LifeGroupMeetingsTab.REPORTS)
            assertEquals(LifeGroupMeetingsTab.REPORTS, vm.uiState.value.selectedTab)
            vm.onTabSelected(LifeGroupMeetingsTab.MEETINGS)
            assertEquals(LifeGroupMeetingsTab.MEETINGS, vm.uiState.value.selectedTab)
        }
}
