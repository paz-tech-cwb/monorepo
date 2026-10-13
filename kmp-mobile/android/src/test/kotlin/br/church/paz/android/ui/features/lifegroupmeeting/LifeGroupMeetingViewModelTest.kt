package br.church.paz.android.ui.features.lifegroupmeeting

import br.church.paz.android.util.FakeMeetingDraftStore
import br.church.paz.android.util.MainDispatcherRule
import br.church.paz.shared.domain.model.LifeGroupAttendanceEntry
import br.church.paz.shared.domain.model.LifeGroupMeeting
import br.church.paz.shared.domain.model.LifeGroupMeetingAttendance
import br.church.paz.shared.domain.model.LifeGroupMeetingDraft
import br.church.paz.shared.domain.model.LifeGroupMeetingDraftEntry
import br.church.paz.shared.domain.model.LifeGroupMeetingReportDraft
import br.church.paz.shared.domain.model.LifeGroupWeeklyReport
import br.church.paz.shared.domain.model.MeetingReportBlockedReason
import br.church.paz.shared.domain.model.User
import br.church.paz.shared.domain.repository.AuthRepository
import br.church.paz.shared.domain.repository.LifeGroupMeetingException
import br.church.paz.shared.domain.repository.LifeGroupMeetingRepository
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.coVerifyOrder
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class LifeGroupMeetingViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val repository = mockk<LifeGroupMeetingRepository>()
    private val authRepository = mockk<AuthRepository>()
    private val draftStore = FakeMeetingDraftStore()

    private val date = "2026-10-07"
    private val draftKey = Triple("5", 7, date)

    private fun entries(vararg present: Boolean) =
        present.mapIndexed { index, value -> LifeGroupAttendanceEntry(index + 1, "Membro ${index + 1}", value) }

    private fun attendance(
        entries: List<LifeGroupAttendanceEntry>,
        isDraft: Boolean,
        isExtra: Boolean = false,
    ) = LifeGroupMeetingAttendance(
        id = if (isDraft) null else "a-1",
        meetingDate = date,
        presentCount = entries.count { it.present },
        membersCount = entries.size,
        entries = entries,
        isDraft = isDraft,
        isExtra = isExtra,
        defaultPresent = if (isDraft) true else null,
    )

    private fun report(guests: Int = 2) =
        LifeGroupWeeklyReport(
            id = "r-1",
            date = date,
            lifeGroupId = 7,
            committedMembers = 2,
            committedMembersPresent = 2,
            kids0To11 = 1,
            guests = guests,
            mdas = 0,
            offering = "150.50",
            committedAtTadel = 0,
            committedAtCulto = 0,
            leaderAttended = listOf("tadel"),
            disciplesCount = 0,
            disciplesDiscipledThisWeek = 0,
            pastoringActivityType = emptyList(),
            pastoringActivityOther = null,
            trainingActivityType = emptyList(),
            trainingActivityOther = null,
            submittedByName = "Ana",
            createdAt = null,
        )

    private fun meeting(
        attendance: LifeGroupMeetingAttendance?,
        report: LifeGroupWeeklyReport? = null,
        canEdit: Boolean = true,
        blocked: MeetingReportBlockedReason? = null,
    ) = LifeGroupMeeting(
        lifeGroupId = 7,
        meetingDate = date,
        attendance = attendance,
        report = report,
        committedMembers = attendance?.membersCount,
        committedMembersPresent = attendance?.presentCount,
        canEdit = canEdit,
        editDeadline = "2026-10-21",
        reportBlockedReason = blocked,
    )

    // No arguments means two members, both present.
    private fun presentOrDefault(present: BooleanArray) = if (present.isEmpty()) booleanArrayOf(true, true) else present

    private fun draftMeeting(vararg present: Boolean) = meeting(attendance(entries(*presentOrDefault(present)), isDraft = true))

    private fun savedMeeting(
        vararg present: Boolean,
        report: LifeGroupWeeklyReport? = null,
        canEdit: Boolean = true,
        blocked: MeetingReportBlockedReason? = null,
    ) = meeting(attendance(entries(*presentOrDefault(present)), isDraft = false), report, canEdit, blocked)

    private fun viewModel(): LifeGroupMeetingViewModel {
        coEvery { authRepository.currentUser() } returns User(id = "5", name = "Ana")
        return LifeGroupMeetingViewModel(7, date, repository, authRepository, draftStore)
    }

    private fun kotlinx.coroutines.test.TestScope.settle() = testScheduler.advanceUntilIdle()

    // ---- load ----

    @Test
    fun `loads a draft meeting with everyone present and nothing saved`() =
        runTest {
            coEvery { repository.getMeeting(7, date, null) } returns draftMeeting()

            val vm = viewModel()
            settle()

            val state = vm.uiState.value
            assertFalse(state.isLoading)
            assertNull(state.loadError)
            assertEquals(2, state.entries.size)
            assertTrue(state.entries.all { it.present })
            assertFalse(state.isAttendanceSaved)
            assertFalse(state.draftRestored)
            assertTrue(state.canSaveAttendance)
            // The report cannot be filed before the presence is saved.
            assertFalse(state.canEditReport)
            assertFalse(state.canSaveReport)
            assertNotNull(state.reportLockedMessage)
        }

    @Test
    fun `load failure shows the mapped message and retry reloads`() =
        runTest {
            coEvery { repository.getMeeting(7, date, null) } throws LifeGroupMeetingException(403, null, null)
            val vm = viewModel()
            settle()
            assertTrue(vm.uiState.value.loadError!!.contains("permissão"))

            coEvery { repository.getMeeting(7, date, null) } returns draftMeeting()
            vm.load()
            settle()

            assertNull(vm.uiState.value.loadError)
            assertNotNull(vm.uiState.value.meeting)
        }

    // ---- extra meeting ----

    @Test
    fun `a non regular date asks for the extra meeting choice then loads the extra draft`() =
        runTest {
            coEvery { repository.getMeeting(7, date, null) } throws
                LifeGroupMeetingException(400, "extra_meeting_required", "not a Quarta-feira")
            val extraDraft = meeting(attendance(entries(true, true), isDraft = true, isExtra = true))
            coEvery { repository.getMeeting(7, date, true) } returns extraDraft

            val vm = viewModel()
            settle()

            assertTrue(vm.uiState.value.needsExtraChoice)
            assertNull(vm.uiState.value.meeting)
            assertFalse(vm.uiState.value.isLoading)
            assertTrue(vm.uiState.value.showExtraToggle)

            vm.onExtraMeetingChanged(true)
            settle()

            val state = vm.uiState.value
            assertFalse(state.needsExtraChoice)
            assertTrue(state.isExtra)
            assertNotNull(state.meeting)
            assertTrue(state.showExtraToggle)
            assertFalse(state.isExtraLocked)
        }

    @Test
    fun `saving a new extra meeting sends extra_meeting true and a saved one never resends it`() =
        runTest {
            coEvery { repository.getMeeting(7, date, null) } throws LifeGroupMeetingException(400, "extra_meeting_required", null)
            coEvery { repository.getMeeting(7, date, true) } returns meeting(attendance(entries(true, true), isDraft = true, isExtra = true))
            val saved = meeting(attendance(entries(true, false), isDraft = false, isExtra = true))
            coEvery { repository.saveAttendance(7, date, any(), true) } returns saved
            coEvery { repository.saveAttendance(7, date, any(), null) } returns saved

            val vm = viewModel()
            settle()
            vm.onExtraMeetingChanged(true)
            settle()
            vm.onTogglePresent(2)
            vm.onSaveAttendance()
            settle()

            coVerify(exactly = 1) { repository.saveAttendance(7, date, any(), true) }
            assertTrue(vm.uiState.value.isAttendanceSaved)
            assertTrue(vm.uiState.value.isExtraLocked)
            assertTrue(vm.uiState.value.isExtra)

            // Editing the saved extra meeting again must not send the flag (it is immutable server side).
            vm.onTogglePresent(2)
            vm.onSaveAttendance()
            settle()
            coVerify(exactly = 1) { repository.saveAttendance(7, date, any(), null) }
        }

    @Test
    fun `an unrelated load error is not treated as the extra choice`() =
        runTest {
            coEvery { repository.getMeeting(7, date, null) } throws LifeGroupMeetingException(404, null, null)
            val vm = viewModel()
            settle()
            assertFalse(vm.uiState.value.needsExtraChoice)
            assertNotNull(vm.uiState.value.loadError)
        }

    // ---- presence ----

    @Test
    fun `todos presentes toggles every entry and individual toggles flip one`() =
        runTest {
            coEvery { repository.getMeeting(7, date, null) } returns draftMeeting(true, true, true)
            val vm = viewModel()
            settle()

            vm.onAllPresentChanged(false)
            assertEquals(0, vm.uiState.value.committedMembersPresent)
            assertEquals(3, vm.uiState.value.committedMembers)

            vm.onTogglePresent(2)
            assertEquals(listOf(false, true, false), vm.uiState.value.entries.map { it.present })

            vm.onAllPresentChanged(true)
            assertTrue(vm.uiState.value.entries.all { it.present })
        }

    @Test
    fun `save attendance sends the toggles and unlocks the report`() =
        runTest {
            coEvery { repository.getMeeting(7, date, null) } returns draftMeeting()
            coEvery { repository.saveAttendance(7, date, any(), null) } returns savedMeeting(true, false)
            val vm = viewModel()
            settle()

            vm.onTogglePresent(2)
            vm.onSaveAttendance()
            settle()

            coVerify {
                repository.saveAttendance(
                    7,
                    date,
                    match { sent -> sent.map { it.userId to it.present } == listOf(1 to true, 2 to false) },
                    null,
                )
            }
            val state = vm.uiState.value
            assertFalse(state.isSavingAttendance)
            assertTrue(state.isAttendanceSaved)
            assertEquals("Presença salva.", state.attendanceNotice)
            assertTrue(state.canEditReport)
            assertNull(state.reportLockedMessage)
            // Nothing left to save: the button is disabled until the next change.
            assertFalse(state.canSaveAttendance)
        }

    @Test
    fun `attendance failure keeps the edits and shows the mapped error`() =
        runTest {
            coEvery { repository.getMeeting(7, date, null) } returns draftMeeting()
            coEvery { repository.saveAttendance(7, date, any(), null) } throws
                LifeGroupMeetingException(409, "extra_meeting_limit_reached", null)
            val vm = viewModel()
            settle()
            vm.onTogglePresent(1)

            vm.onSaveAttendance()
            settle()

            val state = vm.uiState.value
            assertFalse(state.isSavingAttendance)
            assertTrue(state.attendanceError!!.contains("limite"))
            assertFalse(state.entries.first { it.userId == 1 }.present)
            assertTrue(state.canSaveAttendance)
        }

    @Test
    fun `editing a saved attendance locks the report until it is saved again`() =
        runTest {
            coEvery { repository.getMeeting(7, date, null) } returns savedMeeting()
            val vm = viewModel()
            settle()
            assertTrue(vm.uiState.value.canEditReport)

            vm.onTogglePresent(1)

            assertTrue(vm.uiState.value.attendanceDirty)
            assertFalse(vm.uiState.value.canEditReport)
            assertTrue(vm.uiState.value.reportLockedMessage!!.contains("Salve as alterações da presença"))
        }

    // ---- report ----

    @Test
    fun `save order is attendance first then report`() =
        runTest {
            coEvery { repository.getMeeting(7, date, null) } returns draftMeeting()
            coEvery { repository.saveAttendance(7, date, any(), null) } returns savedMeeting()
            coEvery { repository.saveReport(7, date, any()) } returns savedMeeting(report = report())
            val vm = viewModel()
            settle()

            vm.onSaveAttendance()
            settle()
            vm.onReportChanged(LifeGroupMeetingReportDraft(guests = "2", offering = "150,50"))
            vm.onSaveReport()
            settle()

            coVerifyOrder {
                repository.saveAttendance(7, date, any(), null)
                repository.saveReport(7, date, any())
            }
            val state = vm.uiState.value
            assertTrue(state.isReportSaved)
            assertEquals("Relatório salvo.", state.reportNotice)
            assertEquals("150.50", state.reportDraft.offering)
            assertFalse(state.reportDirty)
        }

    @Test
    fun `the report cannot be saved before the attendance is saved`() =
        runTest {
            coEvery { repository.getMeeting(7, date, null) } returns draftMeeting()
            val vm = viewModel()
            settle()

            vm.onReportChanged(LifeGroupMeetingReportDraft(guests = "2"))
            vm.onSaveReport()
            settle()

            coVerify(exactly = 0) { repository.saveReport(any(), any(), any()) }
            assertEquals("", vm.uiState.value.reportDraft.guests)
        }

    @Test
    fun `an invalid report shows field errors and does not call the server`() =
        runTest {
            coEvery { repository.getMeeting(7, date, null) } returns savedMeeting()
            val vm = viewModel()
            settle()

            vm.onReportChanged(LifeGroupMeetingReportDraft(guests = "abc", offering = "-5"))
            vm.onSaveReport()
            settle()

            coVerify(exactly = 0) { repository.saveReport(any(), any(), any()) }
            val state = vm.uiState.value
            assertTrue(state.reportErrors.isNotEmpty())
            assertNotNull(state.reportError)
            assertFalse(state.isSavingReport)
        }

    @Test
    fun `report conflict maps attendance_required and keeps the typed values`() =
        runTest {
            coEvery { repository.getMeeting(7, date, null) } returns savedMeeting()
            coEvery { repository.saveReport(7, date, any()) } throws LifeGroupMeetingException(409, "attendance_required", null)
            val vm = viewModel()
            settle()

            vm.onReportChanged(LifeGroupMeetingReportDraft(guests = "4"))
            vm.onSaveReport()
            settle()

            val state = vm.uiState.value
            assertEquals("Salve a presença antes de enviar o relatório.", state.reportError)
            assertEquals("4", state.reportDraft.guests)
            assertTrue(state.canSaveReport)
        }

    @Test
    fun `a group without sector blocks the report with the server reason`() =
        runTest {
            coEvery { repository.getMeeting(7, date, null) } returns
                savedMeeting(blocked = MeetingReportBlockedReason.GROUP_HAS_NO_SECTOR)
            val vm = viewModel()
            settle()

            val state = vm.uiState.value
            assertFalse(state.canEditReport)
            assertFalse(state.canSaveReport)
            assertTrue(state.reportLockedMessage!!.contains("setor"))
            // Presence is independent of the report blocker.
            assertFalse(state.isReadOnly)
        }

    @Test
    fun `a saved report is prefilled from the server`() =
        runTest {
            coEvery { repository.getMeeting(7, date, null) } returns savedMeeting(report = report(guests = 9))
            val vm = viewModel()
            settle()

            assertEquals("9", vm.uiState.value.reportDraft.guests)
            assertEquals("150.50", vm.uiState.value.reportDraft.offering)
            assertFalse(vm.uiState.value.reportDirty)
            assertFalse(vm.uiState.value.canSaveReport)
        }

    // ---- read only ----

    @Test
    fun `after the edit window the screen is read only and ignores edits`() =
        runTest {
            coEvery { repository.getMeeting(7, date, null) } returns savedMeeting(report = report(), canEdit = false)
            draftStore.drafts[draftKey] = LifeGroupMeetingDraft(attendance = listOf(LifeGroupMeetingDraftEntry(1, false)))
            val vm = viewModel()
            settle()

            vm.onTogglePresent(1)
            vm.onAllPresentChanged(false)
            vm.onReportChanged(LifeGroupMeetingReportDraft(guests = "99"))
            vm.onSaveAttendance()
            vm.onSaveReport()
            settle()

            val state = vm.uiState.value
            assertTrue(state.isReadOnly)
            assertTrue(state.entries.all { it.present })
            assertEquals("2", state.reportDraft.guests)
            assertFalse(state.canSaveAttendance)
            assertFalse(state.canSaveReport)
            // A stale draft is not restored into a read-only meeting.
            assertFalse(state.draftRestored)
            coVerify(exactly = 0) { repository.saveAttendance(any(), any(), any(), any()) }
            coVerify(exactly = 0) { repository.saveReport(any(), any(), any()) }
        }

    @Test
    fun `an edit window that closes while saving reloads into the read only state`() =
        runTest {
            coEvery { repository.getMeeting(7, date, null) } returnsMany
                listOf(savedMeeting(), savedMeeting(canEdit = false))
            coEvery { repository.saveAttendance(7, date, any(), null) } throws
                LifeGroupMeetingException(403, "edit_window_closed", null)
            val vm = viewModel()
            settle()
            vm.onTogglePresent(1)

            vm.onSaveAttendance()
            settle()

            assertTrue(vm.uiState.value.isReadOnly)
            coVerify(exactly = 2) { repository.getMeeting(7, date, null) }
        }

    // ---- local drafts ----

    @Test
    fun `unsaved edits are mirrored to the local draft keyed by user group and date`() =
        runTest {
            coEvery { repository.getMeeting(7, date, null) } returns savedMeeting()
            val vm = viewModel()
            settle()

            vm.onTogglePresent(2)
            settle()
            val stored = draftStore.drafts[draftKey]
            assertNotNull(stored)
            assertEquals(listOf(LifeGroupMeetingDraftEntry(1, true), LifeGroupMeetingDraftEntry(2, false)), stored!!.attendance)
            assertNull(stored.report)

            // Toggling back to the server state leaves nothing unsaved: the draft is removed.
            vm.onTogglePresent(2)
            settle()
            assertNull(draftStore.drafts[draftKey])
        }

    @Test
    fun `a saved section is removed from the draft and the other one is kept`() =
        runTest {
            coEvery { repository.getMeeting(7, date, null) } returns savedMeeting()
            coEvery { repository.saveAttendance(7, date, any(), null) } returns savedMeeting(true, false)
            val vm = viewModel()
            settle()
            vm.onReportChanged(LifeGroupMeetingReportDraft(guests = "3"))
            vm.onTogglePresent(2)
            settle()
            assertNotNull(draftStore.drafts[draftKey]?.attendance)
            assertNotNull(draftStore.drafts[draftKey]?.report)

            // The report is locked while presence is dirty, but the typed value is kept; presence saves first.
            vm.onSaveAttendance()
            settle()

            val stored = draftStore.drafts[draftKey]
            assertNotNull(stored)
            assertNull(stored!!.attendance)
            assertEquals("3", stored.report?.guests)
        }

    @Test
    fun `a stored draft is restored over the server data with the banner`() =
        runTest {
            coEvery { repository.getMeeting(7, date, null) } returns savedMeeting()
            draftStore.drafts[draftKey] =
                LifeGroupMeetingDraft(
                    attendance = listOf(LifeGroupMeetingDraftEntry(2, false), LifeGroupMeetingDraftEntry(99, false)),
                    report = LifeGroupMeetingReportDraft(guests = "7"),
                )

            val vm = viewModel()
            settle()

            val state = vm.uiState.value
            assertTrue(state.draftRestored)
            assertEquals(listOf(true, false), state.entries.map { it.present })
            assertEquals("7", state.reportDraft.guests)
            assertTrue(state.attendanceDirty)

            vm.onDismissDraftBanner()
            assertFalse(vm.uiState.value.draftRestored)
        }

    @Test
    fun `another user never sees the draft`() =
        runTest {
            coEvery { repository.getMeeting(7, date, null) } returns savedMeeting()
            draftStore.drafts[Triple("someone-else", 7, date)] =
                LifeGroupMeetingDraft(report = LifeGroupMeetingReportDraft(guests = "7"))

            val vm = viewModel()
            settle()

            assertFalse(vm.uiState.value.draftRestored)
            assertEquals("", vm.uiState.value.reportDraft.guests)
        }

    @Test
    fun `a restored extra choice reloads the extra draft directly`() =
        runTest {
            draftStore.drafts[draftKey] = LifeGroupMeetingDraft(extraMeeting = true)
            coEvery { repository.getMeeting(7, date, true) } returns
                meeting(attendance(entries(true, true), isDraft = true, isExtra = true))

            val vm = viewModel()
            settle()

            assertTrue(vm.uiState.value.isExtra)
            assertNotNull(vm.uiState.value.meeting)
            coVerify(exactly = 0) { repository.getMeeting(7, date, null) }
        }
}
