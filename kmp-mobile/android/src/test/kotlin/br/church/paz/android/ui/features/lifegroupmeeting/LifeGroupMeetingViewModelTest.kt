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
import kotlinx.coroutines.CompletableDeferred
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
        canWrite: Boolean = true,
    ) = LifeGroupMeeting(
        lifeGroupId = 7,
        meetingDate = date,
        attendance = attendance,
        report = report,
        committedMembers = attendance?.membersCount,
        committedMembersPresent = attendance?.presentCount,
        canWrite = canWrite,
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

    private fun viewModel(viewerCanWrite: Boolean? = null): LifeGroupMeetingViewModel {
        coEvery { authRepository.currentUser() } returns User(id = "5", name = "Ana")
        return LifeGroupMeetingViewModel(7, date, repository, authRepository, draftStore, viewerCanWrite)
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

    @Test
    fun `an untouched report form cannot be saved as an all zero report`() =
        runTest {
            coEvery { repository.getMeeting(7, date, null) } returns savedMeeting()
            coEvery { repository.saveReport(7, date, any()) } returns savedMeeting(report = report())
            val vm = viewModel()
            settle()

            assertTrue(vm.uiState.value.canEditReport)
            assertFalse(vm.uiState.value.canSaveReport)
            vm.onSaveReport()
            settle()
            coVerify(exactly = 0) { repository.saveReport(any(), any(), any()) }

            vm.onReportChanged(LifeGroupMeetingReportDraft(guests = "0"))
            assertTrue(vm.uiState.value.canSaveReport)
            vm.onSaveReport()
            settle()
            coVerify(exactly = 1) { repository.saveReport(7, date, any()) }
        }

    @Test
    fun `presence and report edits are ignored while a save is in flight`() =
        runTest {
            val gate = CompletableDeferred<LifeGroupMeeting>()
            coEvery { repository.getMeeting(7, date, null) } returns draftMeeting()
            coEvery { repository.saveAttendance(7, date, any(), null) } coAnswers { gate.await() }
            val vm = viewModel()
            settle()

            vm.onSaveAttendance()
            testScheduler.runCurrent()
            assertTrue(vm.uiState.value.isSavingAttendance)

            vm.onTogglePresent(1)
            vm.onAllPresentChanged(false)
            vm.onReportChanged(LifeGroupMeetingReportDraft(guests = "3"))
            assertTrue(vm.uiState.value.entries.all { it.present })
            assertEquals("", vm.uiState.value.reportDraft.guests)

            gate.complete(savedMeeting())
            settle()
            assertFalse(vm.uiState.value.isSavingAttendance)
            vm.onTogglePresent(1)
            assertFalse(vm.uiState.value.entries.first { it.userId == 1 }.present)
        }

    @Test
    fun `a stored extra draft the server now rejects is dropped and refetched without the flag`() =
        runTest {
            draftStore.drafts[draftKey] =
                LifeGroupMeetingDraft(
                    attendance = listOf(LifeGroupMeetingDraftEntry(1, false)),
                    report = null,
                    extraMeeting = true,
                )
            coEvery { repository.getMeeting(7, date, true) } throws
                LifeGroupMeetingException(400, "extra_meeting_on_regular_day", null)
            coEvery { repository.getMeeting(7, date, null) } returns draftMeeting()

            val vm = viewModel()
            settle()

            val state = vm.uiState.value
            assertNull(state.loadError)
            assertNotNull(state.meeting)
            assertFalse(state.isExtra)
            coVerify(exactly = 1) { repository.getMeeting(7, date, true) }
            assertTrue(draftStore.drafts[draftKey]?.extraMeeting != true)
        }

    @Test
    fun `a legacy report without attendance says so instead of asking to save the presence`() =
        runTest {
            coEvery { repository.getMeeting(7, date, null) } returns meeting(attendance = null, report = report())
            val vm = viewModel()
            settle()

            assertFalse(vm.uiState.value.canEditReport)
            assertEquals(
                br.church.paz.shared.domain.model.LifeGroupMeetingRules.legacyReportMessage(),
                vm.uiState.value.reportLockedMessage,
            )
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

    // ---- supervisors (read-only) ----

    private fun supervisorMeeting() = meeting(attendance(entries(true, false), isDraft = false), report(), canWrite = false, canEdit = false)

    @Test
    fun `a supervisor (can_write false) sees the meeting read only with no actions`() =
        runTest {
            coEvery { repository.getMeeting(7, date, null) } returns supervisorMeeting()
            draftStore.drafts[draftKey] = LifeGroupMeetingDraft(attendance = listOf(LifeGroupMeetingDraftEntry(1, false)))
            val vm = viewModel()
            settle()

            vm.onTogglePresent(1)
            vm.onAllPresentChanged(false)
            vm.onExtraMeetingChanged(true)
            vm.onReportChanged(LifeGroupMeetingReportDraft(guests = "99"))
            vm.onSaveAttendance()
            vm.onSaveReport()
            settle()

            val state = vm.uiState.value
            assertTrue(state.isWriteForbidden)
            assertTrue(state.isReadOnly)
            assertFalse(state.showExtraToggle)
            assertFalse(state.canSaveAttendance)
            assertFalse(state.canSaveReport)
            assertFalse(state.draftRestored)
            assertEquals(listOf(true, false), state.entries.map { it.present })
            assertEquals("2", state.reportDraft.guests)
            coVerify(exactly = 0) { repository.saveAttendance(any(), any(), any(), any()) }
            coVerify(exactly = 0) { repository.saveReport(any(), any(), any()) }
        }

    @Test
    fun `the role hint forces read only even when the server flag is permissive`() =
        runTest {
            coEvery { repository.getMeeting(7, date, null) } returns savedMeeting()
            val vm = viewModel(viewerCanWrite = false)
            settle()

            vm.onTogglePresent(1)
            vm.onSaveAttendance()
            settle()

            assertTrue(vm.uiState.value.isWriteForbidden)
            assertTrue(vm.uiState.value.isReadOnly)
            assertFalse(vm.uiState.value.canSaveAttendance)
            coVerify(exactly = 0) { repository.saveAttendance(any(), any(), any(), any()) }
        }

    @Test
    fun `a leader (hint true and can_write true) keeps full edit rights`() =
        runTest {
            coEvery { repository.getMeeting(7, date, null) } returns savedMeeting()
            val vm = viewModel(viewerCanWrite = true)
            settle()

            vm.onTogglePresent(1)

            assertFalse(vm.uiState.value.isWriteForbidden)
            assertFalse(vm.uiState.value.isReadOnly)
            assertTrue(vm.uiState.value.canSaveAttendance)
        }

    @Test
    fun `a supervisor on a date without a record gets no extra meeting switch`() =
        runTest {
            coEvery { repository.getMeeting(7, date, null) } throws
                LifeGroupMeetingException(400, "extra_meeting_required", "not a Quarta-feira")
            val vm = viewModel(viewerCanWrite = false)
            settle()

            assertTrue(vm.uiState.value.needsExtraChoice)
            assertTrue(vm.uiState.value.isWriteForbidden)
            assertFalse(vm.uiState.value.showExtraToggle)
            vm.onExtraMeetingChanged(true)
            settle()
            coVerify(exactly = 0) { repository.getMeeting(7, date, true) }
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

    // ---- errors and past dates without a record ----

    @Test
    fun `a missing route is unavailable and retryable never group not found`() =
        runTest {
            coEvery { repository.getMeeting(7, date, null) } throws
                LifeGroupMeetingException(404, null, "Cannot GET /api/life-groups/7/meetings/$date")
            val vm = viewModel()
            settle()

            val state = vm.uiState.value
            assertEquals("Recurso indisponível no servidor. Tente novamente mais tarde.", state.loadError)
            assertFalse(state.loadError!!.contains("Grupo não encontrado"))
            assertTrue(state.loadErrorRetryable)

            // The server comes back: retry opens the screen normally.
            coEvery { repository.getMeeting(7, date, null) } returns draftMeeting()
            vm.load()
            settle()
            assertNull(vm.uiState.value.loadError)
            assertNotNull(vm.uiState.value.meeting)
        }

    @Test
    fun `group_not_found says so and is not retryable`() =
        runTest {
            coEvery { repository.getMeeting(7, date, null) } throws LifeGroupMeetingException(404, "group_not_found", "x")
            val vm = viewModel()
            settle()

            assertTrue(vm.uiState.value.loadError!!.contains("Grupo não encontrado"))
            assertFalse(vm.uiState.value.loadErrorRetryable)
        }

    @Test
    fun `no permission is not retryable and a network failure is offline and retryable`() =
        runTest {
            coEvery { repository.getMeeting(7, date, null) } throws LifeGroupMeetingException(403, "meeting_access_forbidden", null)
            val denied = viewModel()
            settle()
            assertTrue(denied.uiState.value.loadError!!.contains("permissão"))
            assertFalse(denied.uiState.value.loadErrorRetryable)

            coEvery { repository.getMeeting(7, date, null) } throws java.io.IOException("timeout")
            val offline = viewModel()
            settle()
            assertTrue(offline.uiState.value.loadError!!.contains("conexão"))
            assertTrue(offline.uiState.value.loadErrorRetryable)
        }

    @Test
    fun `a past date with no record outside the edit window opens as a read only empty state not an error`() =
        runTest {
            // Server answer for 2026-09-08 without any record: 200, a draft roster, can_edit=false.
            coEvery { repository.getMeeting(7, date, null) } returns
                meeting(attendance(entries(true, true), isDraft = true), canEdit = false)
            val vm = viewModel()
            settle()

            val state = vm.uiState.value
            assertNull(state.loadError)
            assertTrue(state.isReadOnly)
            assertTrue(state.isEmptyReadOnly)
            // Never a roster pre-filled with "everybody present" for a record that does not exist.
            assertFalse(state.showAttendanceRoster)
            assertFalse(state.canSaveAttendance)
        }

    @Test
    fun `a supervisor on a date with no record gets the empty state`() =
        runTest {
            coEvery { repository.getMeeting(7, date, null) } returns
                meeting(attendance(entries(true, true), isDraft = true), canWrite = false, canEdit = false)
            val vm = viewModel()
            settle()

            assertTrue(vm.uiState.value.isEmptyReadOnly)
            assertFalse(vm.uiState.value.showAttendanceRoster)
        }

    @Test
    fun `an editable new meeting is not the empty state and lists the draft roster`() =
        runTest {
            coEvery { repository.getMeeting(7, date, null) } returns draftMeeting()
            val vm = viewModel()
            settle()

            assertFalse(vm.uiState.value.isEmptyReadOnly)
            assertTrue(vm.uiState.value.showAttendanceRoster)
        }

    @Test
    fun `a read only meeting with a saved presence still lists who was present`() =
        runTest {
            coEvery { repository.getMeeting(7, date, null) } returns savedMeeting(true, false, canEdit = false)
            val vm = viewModel()
            settle()

            assertFalse(vm.uiState.value.isEmptyReadOnly)
            assertTrue(vm.uiState.value.showAttendanceRoster)
        }

    @Test
    fun `a legacy report without presence is read only with the report and no roster`() =
        runTest {
            coEvery { repository.getMeeting(7, date, null) } returns meeting(null, report = report(), canEdit = false)
            val vm = viewModel()
            settle()

            val state = vm.uiState.value
            assertFalse(state.isEmptyReadOnly)
            assertTrue(state.isReportSaved)
            assertFalse(state.showAttendanceRoster)
            assertFalse(state.canEditReport)
        }
}
