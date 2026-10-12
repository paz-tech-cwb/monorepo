package br.church.paz.android.ui.features.home

import android.util.Log
import app.cash.turbine.test
import br.church.paz.android.util.MainDispatcherRule
import br.church.paz.shared.domain.model.HomeContent
import br.church.paz.shared.domain.model.LifeGroupTask
import br.church.paz.shared.domain.model.LifeGroupTaskStatus
import br.church.paz.shared.domain.model.User
import br.church.paz.shared.domain.repository.AuthRepository
import br.church.paz.shared.domain.repository.ChurchRepository
import br.church.paz.shared.domain.repository.HomeRepository
import br.church.paz.shared.domain.repository.LifeGroupTaskRepository
import io.mockk.coEvery
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkStatic
import io.mockk.unmockkStatic
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Rule
import org.junit.Test

class HomeViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val homeRepository = mockk<HomeRepository>()
    private val authRepository = mockk<AuthRepository>()
    private val churchRepository = mockk<ChurchRepository>()
    private val taskRepository = mockk<LifeGroupTaskRepository>()

    @Before
    fun setUp() {
        mockkStatic(Log::class)
        every { Log.d(any(), any()) } returns 0
        every { Log.e(any(), any(), any()) } returns 0
        coEvery { homeRepository.getHomeContent() } returns HomeContent()
        coEvery { authRepository.currentUser() } returns User(id = "5", name = "Ana Paula")
        coEvery { churchRepository.getMyLifeGroups() } returns emptyList()
    }

    @After
    fun tearDown() {
        unmockkStatic(Log::class)
    }

    private fun task(
        id: String,
        date: String,
        status: LifeGroupTaskStatus = LifeGroupTaskStatus.ASSIGNED,
    ) = LifeGroupTask(
        id = id,
        lifeGroupId = 10,
        lifeGroupName = "Grupo",
        meetingDate = date,
        name = "Tarefa $id",
        description = "",
        guidance = "",
        status = status,
    )

    private fun buildViewModel() = HomeViewModel(homeRepository, authRepository, churchRepository, taskRepository) { "2026-10-12" }

    @Test
    fun `myTasks keeps upcoming assigned tasks sorted by date and capped at three`() =
        runTest {
            coEvery { taskRepository.getMyTasks() } returns
                listOf(
                    task("past", "2026-10-05"),
                    task("d", "2026-11-02"),
                    task("declined", "2026-10-13", LifeGroupTaskStatus.DECLINED),
                    task("today", "2026-10-12"),
                    task("c", "2026-10-26"),
                    task("b", "2026-10-19"),
                )

            val viewModel = buildViewModel()
            testScheduler.advanceUntilIdle()

            assertEquals(listOf("today", "b", "c"), viewModel.uiState.value.myTasks.map { it.id })
        }

    @Test
    fun `task fetch failure hides the card without breaking home`() =
        runTest {
            coEvery { taskRepository.getMyTasks() } throws RuntimeException("boom")

            val viewModel = buildViewModel()
            testScheduler.advanceUntilIdle()

            assertEquals(emptyList<LifeGroupTask>(), viewModel.uiState.value.myTasks)
            assertNull(viewModel.uiState.value.error)
            assertEquals("Ana", viewModel.uiState.value.userName)
        }

    @Test
    fun `tapping a task emits navigation to its guide`() =
        runTest {
            coEvery { taskRepository.getMyTasks() } returns emptyList()
            val viewModel = buildViewModel()
            testScheduler.advanceUntilIdle()

            viewModel.effect.test {
                viewModel.onTaskTapped("abc")
                assertEquals(HomeEffect.NavigateToTask("abc"), awaitItem())
                cancelAndIgnoreRemainingEvents()
            }
        }
}
