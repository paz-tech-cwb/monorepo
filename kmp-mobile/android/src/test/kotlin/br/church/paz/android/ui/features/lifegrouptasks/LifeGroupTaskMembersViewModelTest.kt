package br.church.paz.android.ui.features.lifegrouptasks

import br.church.paz.android.util.MainDispatcherRule
import br.church.paz.shared.domain.model.LifeGroupTaskEligibilitySource
import br.church.paz.shared.domain.model.LifeGroupTaskMember
import br.church.paz.shared.domain.model.LifeGroupTaskMemberUpdate
import br.church.paz.shared.domain.model.LifeGroupTaskSettings
import br.church.paz.shared.domain.model.LifeGroupTaskTemplateSummary
import br.church.paz.shared.domain.repository.LifeGroupTaskRepository
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

class LifeGroupTaskMembersViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val repository = mockk<LifeGroupTaskRepository>()

    private fun member(
        userId: Int,
        name: String,
        eligible: Boolean = true,
        source: LifeGroupTaskEligibilitySource = LifeGroupTaskEligibilitySource.AUTO,
        presentCount: Int = 4,
        note: String? = null,
        excluded: List<Int> = emptyList(),
        grandfathered: Boolean = false,
    ) = LifeGroupTaskMember(
        userId = userId,
        name = name,
        isLeader = false,
        isCoLeader = false,
        eligible = eligible,
        eligibilitySource = source,
        presentCount = presentCount,
        minPresentMeetings = 3,
        grandfathered = grandfathered,
        note = note,
        excludedTemplateIds = excluded,
    )

    private val ana = member(1, "Ana")
    private val bruno =
        member(2, "Bruno", eligible = false, source = LifeGroupTaskEligibilitySource.PENDING, presentCount = 1)

    private val templates =
        listOf(
            LifeGroupTaskTemplateSummary(templateId = 7, name = "Palavra", description = "", isEnabled = true),
            LifeGroupTaskTemplateSummary(templateId = 3, name = "Oferta", description = "", isEnabled = true),
            LifeGroupTaskTemplateSummary(templateId = 9, name = "Louvor", description = "", isEnabled = false),
        )

    private fun buildViewModel(members: List<LifeGroupTaskMember> = listOf(ana, bruno)): LifeGroupTaskMembersViewModel {
        coEvery { repository.getTaskMembers(10) } returns members
        coEvery { repository.getTaskSettings(10) } returns LifeGroupTaskSettings(minPresentMeetings = 3)
        coEvery { repository.getTaskTemplates(10) } returns templates
        return LifeGroupTaskMembersViewModel(10, repository)
    }

    @Test
    fun `load maps members, enabled templates and the group setting`() =
        runTest {
            val viewModel = buildViewModel()
            testScheduler.advanceUntilIdle()

            val state = viewModel.uiState.value
            assertFalse(state.isLoading)
            assertNull(state.error)
            assertEquals(listOf(1, 2), state.drafts.map { it.member.userId })
            assertEquals(listOf(7, 3), state.templates.map { it.templateId })
            assertEquals(3, state.minPresentMeetings)
            assertFalse(state.hasChanges)
        }

    @Test
    fun `grandfathered members get a dedicated badge instead of Manual`() {
        val legacy = member(3, "Carla", source = LifeGroupTaskEligibilitySource.MANUAL, grandfathered = true)
        val manual = member(4, "Davi", source = LifeGroupTaskEligibilitySource.MANUAL)
        assertEquals("Membro antigo · participa", legacy.sourceBadgeLabel())
        assertEquals("Manual", manual.sourceBadgeLabel())
    }

    @Test
    fun `load failure surfaces an error`() =
        runTest {
            coEvery { repository.getTaskMembers(10) } throws RuntimeException("forbidden")
            coEvery { repository.getTaskSettings(10) } returns LifeGroupTaskSettings(3)
            coEvery { repository.getTaskTemplates(10) } returns templates

            val viewModel = LifeGroupTaskMembersViewModel(10, repository)
            testScheduler.advanceUntilIdle()

            assertEquals("forbidden", viewModel.uiState.value.error)
            assertTrue(viewModel.uiState.value.drafts.isEmpty())
        }

    @Test
    fun `template load failure does not block the screen`() =
        runTest {
            coEvery { repository.getTaskMembers(10) } returns listOf(ana)
            coEvery { repository.getTaskSettings(10) } returns LifeGroupTaskSettings(3)
            coEvery { repository.getTaskTemplates(10) } throws RuntimeException("boom")

            val viewModel = LifeGroupTaskMembersViewModel(10, repository)
            testScheduler.advanceUntilIdle()

            assertNull(viewModel.uiState.value.error)
            assertEquals(1, viewModel.uiState.value.drafts.size)
            assertTrue(viewModel.uiState.value.templates.isEmpty())
        }

    @Test
    fun `toggling eligibility marks the draft dirty and toggling back clears it`() =
        runTest {
            val viewModel = buildViewModel()
            testScheduler.advanceUntilIdle()

            viewModel.onEligibleChanged(1, false)
            assertTrue(viewModel.uiState.value.hasChanges)

            viewModel.onEligibleChanged(1, true)
            assertFalse(viewModel.uiState.value.hasChanges)
        }

    @Test
    fun `save sends only changed members with eligibility pinned and untouched fields omitted`() =
        runTest {
            val saved = listOf(ana.copy(eligible = false, eligibilitySource = LifeGroupTaskEligibilitySource.MANUAL), bruno)
            coEvery { repository.updateTaskMembers(10, any()) } returns saved
            val viewModel = buildViewModel()
            testScheduler.advanceUntilIdle()

            viewModel.onEligibleChanged(1, false)
            viewModel.onSave()
            testScheduler.advanceUntilIdle()

            coVerify(exactly = 1) {
                repository.updateTaskMembers(10, listOf(LifeGroupTaskMemberUpdate(userId = 1, eligible = false)))
            }
            coVerify(exactly = 0) { repository.updateTaskSettings(any(), any()) }
            val state = viewModel.uiState.value
            assertFalse(state.isSaving)
            assertFalse(state.hasChanges)
            assertEquals(LifeGroupTaskEligibilitySource.MANUAL, state.drafts.first().member.eligibilitySource)
            assertEquals("Alterações salvas", state.savedMessage)
        }

    @Test
    fun `note and exclusion edits are sent with the current eligibility`() =
        runTest {
            coEvery { repository.updateTaskMembers(10, any()) } returns listOf(ana, bruno)
            val viewModel = buildViewModel()
            testScheduler.advanceUntilIdle()

            viewModel.onNoteChanged(1, "  viaja em outubro  ")
            viewModel.onTemplateExclusionToggled(1, 7)
            viewModel.onTemplateExclusionToggled(1, 3)
            viewModel.onSave()
            testScheduler.advanceUntilIdle()

            coVerify(exactly = 1) {
                repository.updateTaskMembers(
                    10,
                    listOf(
                        LifeGroupTaskMemberUpdate(
                            userId = 1,
                            eligible = true,
                            note = "viaja em outubro",
                            excludedTemplateIds = listOf(3, 7),
                        ),
                    ),
                )
            }
        }

    @Test
    fun `clearing an existing note sends an empty note and clearing exclusions sends an empty list`() =
        runTest {
            val withDetails = member(1, "Ana", source = LifeGroupTaskEligibilitySource.MANUAL, note = "x", excluded = listOf(7))
            coEvery { repository.updateTaskMembers(10, any()) } returns listOf(withDetails)
            val viewModel = buildViewModel(listOf(withDetails))
            testScheduler.advanceUntilIdle()

            viewModel.onNoteChanged(1, "")
            viewModel.onTemplateExclusionToggled(1, 7)
            viewModel.onSave()
            testScheduler.advanceUntilIdle()

            coVerify(exactly = 1) {
                repository.updateTaskMembers(
                    10,
                    listOf(
                        LifeGroupTaskMemberUpdate(userId = 1, eligible = true, note = "", excludedTemplateIds = emptyList()),
                    ),
                )
            }
        }

    @Test
    fun `reset to automatic sends only the reset flag and can be undone or superseded`() =
        runTest {
            val manual = member(1, "Ana", source = LifeGroupTaskEligibilitySource.MANUAL)
            coEvery { repository.updateTaskMembers(10, any()) } returns listOf(ana)
            val viewModel = buildViewModel(listOf(manual))
            testScheduler.advanceUntilIdle()

            viewModel.onResetToAutomatic(1)
            assertTrue(viewModel.uiState.value.hasChanges)
            viewModel.onUndoResetToAutomatic(1)
            assertFalse(viewModel.uiState.value.hasChanges)

            viewModel.onResetToAutomatic(1)
            viewModel.onEligibleChanged(1, false)
            assertFalse(viewModel.uiState.value.drafts.first().resetToAutomatic)

            viewModel.onEligibleChanged(1, true)
            viewModel.onResetToAutomatic(1)
            viewModel.onSave()
            testScheduler.advanceUntilIdle()

            coVerify(exactly = 1) {
                repository.updateTaskMembers(10, listOf(LifeGroupTaskMemberUpdate(userId = 1, resetToAutomatic = true)))
            }
        }

    @Test
    fun `changing the minimum saves the setting first and refreshes members when nothing else changed`() =
        runTest {
            coEvery { repository.updateTaskSettings(10, 5) } returns LifeGroupTaskSettings(5)
            val viewModel = buildViewModel()
            testScheduler.advanceUntilIdle()
            val refreshed = listOf(ana, bruno.copy(eligible = true, eligibilitySource = LifeGroupTaskEligibilitySource.AUTO))
            coEvery { repository.getTaskMembers(10) } returns refreshed

            viewModel.onMinPresentMeetingsChanged(5)
            assertTrue(viewModel.uiState.value.hasChanges)
            viewModel.onSave()
            testScheduler.advanceUntilIdle()

            coVerifyOrder {
                repository.updateTaskSettings(10, 5)
                repository.getTaskMembers(10)
            }
            coVerify(exactly = 0) { repository.updateTaskMembers(any(), any()) }
            val state = viewModel.uiState.value
            assertEquals(5, state.savedMinPresentMeetings)
            assertEquals(5, state.minPresentMeetings)
            assertFalse(state.hasChanges)
            assertTrue(state.drafts.all { it.member.eligible })
        }

    @Test
    fun `minimum is clamped to the backend range`() =
        runTest {
            val viewModel = buildViewModel()
            testScheduler.advanceUntilIdle()

            viewModel.onMinPresentMeetingsChanged(-4)
            assertEquals(0, viewModel.uiState.value.minPresentMeetings)
            viewModel.onMinPresentMeetingsChanged(500)
            assertEquals(TASK_MIN_PRESENT_MEETINGS_MAX, viewModel.uiState.value.minPresentMeetings)
        }

    @Test
    fun `failed save keeps the edits and shows the error`() =
        runTest {
            coEvery { repository.updateTaskMembers(10, any()) } throws RuntimeException("sem rede")
            val viewModel = buildViewModel()
            testScheduler.advanceUntilIdle()

            viewModel.onEligibleChanged(1, false)
            viewModel.onSave()
            testScheduler.advanceUntilIdle()

            val state = viewModel.uiState.value
            assertFalse(state.isSaving)
            assertEquals("sem rede", state.saveError)
            assertTrue(state.hasChanges)
            assertNull(state.savedMessage)
            assertNotNull(state.drafts.firstOrNull { it.member.userId == 1 && !it.eligible })
        }

    @Test
    fun `note is limited to the backend maximum length`() =
        runTest {
            val viewModel = buildViewModel()
            testScheduler.advanceUntilIdle()

            viewModel.onNoteChanged(1, "a".repeat(TASK_NOTE_MAX_LENGTH + 50))

            assertEquals(TASK_NOTE_MAX_LENGTH, viewModel.uiState.value.drafts.first().note.length)
        }

    @Test
    fun `source badge labels cover manual leader automatic and pending`() {
        assertEquals("Manual", member(1, "A", source = LifeGroupTaskEligibilitySource.MANUAL).sourceBadgeLabel())
        assertEquals("Liderança", member(1, "A", source = LifeGroupTaskEligibilitySource.LEADER).sourceBadgeLabel())
        assertEquals(
            "Automático · 3 de 3 presenças",
            member(1, "A", source = LifeGroupTaskEligibilitySource.AUTO, presentCount = 3).sourceBadgeLabel(),
        )
        assertEquals(
            "Pendente · 1 de 3 presenças",
            member(1, "A", source = LifeGroupTaskEligibilitySource.PENDING, presentCount = 1).sourceBadgeLabel(),
        )
    }
}
