package br.church.paz.android.ui.features.lifegrouptasks

import app.cash.turbine.test
import br.church.paz.android.util.MainDispatcherRule
import br.church.paz.shared.domain.model.LifeGroupTask
import br.church.paz.shared.domain.model.LifeGroupTaskDeclineResult
import br.church.paz.shared.domain.model.LifeGroupTaskStatus
import br.church.paz.shared.domain.repository.LifeGroupTaskRepository
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class LifeGroupTaskGuideViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val repository = mockk<LifeGroupTaskRepository>()

    private val task =
        LifeGroupTask(
            id = "a-1",
            lifeGroupId = 10,
            lifeGroupName = "Grupo Alfa",
            meetingDate = "2026-10-20",
            name = "Palavra",
            description = "Trazer uma palavra curta",
            guidance = "## Passos\n- Ore\n- Leia",
            status = LifeGroupTaskStatus.ASSIGNED,
        )

    private fun buildViewModel(): LifeGroupTaskGuideViewModel = LifeGroupTaskGuideViewModel("a-1", repository)

    @Test
    fun `loads the task on init`() =
        runTest {
            coEvery { repository.getMyTask("a-1") } returns task

            val viewModel = buildViewModel()
            assertTrue(viewModel.uiState.value.isLoading)
            testScheduler.advanceUntilIdle()

            val state = viewModel.uiState.value
            assertFalse(state.isLoading)
            assertEquals(task, state.task)
            assertNull(state.error)
            assertFalse(state.declined)
        }

    @Test
    fun `load failure surfaces an error and retry recovers`() =
        runTest {
            coEvery { repository.getMyTask("a-1") } throws RuntimeException("boom")

            val viewModel = buildViewModel()
            testScheduler.advanceUntilIdle()
            assertEquals("boom", viewModel.uiState.value.error)
            assertNull(viewModel.uiState.value.task)

            coEvery { repository.getMyTask("a-1") } returns task
            viewModel.load()
            testScheduler.advanceUntilIdle()

            assertNull(viewModel.uiState.value.error)
            assertEquals(task, viewModel.uiState.value.task)
        }

    @Test
    fun `an already declined task opens in the declined state`() =
        runTest {
            coEvery { repository.getMyTask("a-1") } returns task.copy(status = LifeGroupTaskStatus.DECLINED)

            val viewModel = buildViewModel()
            testScheduler.advanceUntilIdle()

            assertTrue(viewModel.uiState.value.declined)
        }

    @Test
    fun `decline asks for confirmation first and can be dismissed without calling the repository`() =
        runTest {
            coEvery { repository.getMyTask("a-1") } returns task
            val viewModel = buildViewModel()
            testScheduler.advanceUntilIdle()

            viewModel.onDeclineClicked()
            assertTrue(viewModel.uiState.value.showDeclineConfirm)

            viewModel.onDeclineDismissed()
            assertFalse(viewModel.uiState.value.showDeclineConfirm)
            coVerify(exactly = 0) { repository.declineTask(any()) }
        }

    @Test
    fun `confirmed decline calls the repository and records the reassignment`() =
        runTest {
            coEvery { repository.getMyTask("a-1") } returns task
            coEvery { repository.declineTask("a-1") } returns
                LifeGroupTaskDeclineResult(id = "a-1", status = LifeGroupTaskStatus.DECLINED, reassigned = true)
            val viewModel = buildViewModel()
            testScheduler.advanceUntilIdle()

            viewModel.onDeclineClicked()
            viewModel.onDeclineConfirmed()
            testScheduler.advanceUntilIdle()

            val state = viewModel.uiState.value
            assertTrue(state.declined)
            assertTrue(state.declineReassigned)
            assertFalse(state.isDeclining)
            assertFalse(state.showDeclineConfirm)
            assertNull(state.declineError)
            coVerify(exactly = 1) { repository.declineTask("a-1") }
        }

    @Test
    fun `failed decline keeps the guide and shows an error`() =
        runTest {
            coEvery { repository.getMyTask("a-1") } returns task
            coEvery { repository.declineTask("a-1") } throws RuntimeException("sem rede")
            val viewModel = buildViewModel()
            testScheduler.advanceUntilIdle()

            viewModel.onDeclineClicked()
            viewModel.onDeclineConfirmed()
            testScheduler.advanceUntilIdle()

            val state = viewModel.uiState.value
            assertFalse(state.declined)
            assertFalse(state.isDeclining)
            assertEquals("sem rede", state.declineError)
            assertNotNull(state.task)
        }

    @Test
    fun `onBack emits NavigateBack`() =
        runTest {
            coEvery { repository.getMyTask("a-1") } returns task
            val viewModel = buildViewModel()
            testScheduler.advanceUntilIdle()

            viewModel.effect.test {
                viewModel.onBack()
                assertEquals(LifeGroupTaskGuideEffect.NavigateBack, awaitItem())
                cancelAndIgnoreRemainingEvents()
            }
        }
}
