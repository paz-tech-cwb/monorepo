package br.church.paz.android.ui.features.home

import android.util.Log
import app.cash.turbine.test
import br.church.paz.android.util.MainDispatcherRule
import br.church.paz.shared.domain.model.HomeContent
import br.church.paz.shared.domain.model.LifeGroup
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
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
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
        lifeGroupId: Int = 10,
    ) = LifeGroupTask(
        id = id,
        lifeGroupId = lifeGroupId,
        lifeGroupName = "Grupo",
        meetingDate = date,
        name = "Tarefa $id",
        description = "",
        guidance = "",
        status = status,
    )

    private fun buildViewModel() = HomeViewModel(homeRepository, authRepository, churchRepository, taskRepository) { "2026-10-12" }

    private val group = LifeGroup(id = 10, name = "Grupo Alfa", leader = "Maria", meetingDay = "Quinta-feira", meetingTime = "20:00")

    @Test
    fun `group card folds only its own upcoming tasks sorted by date and capped at three`() =
        runTest {
            coEvery { churchRepository.getMyLifeGroups() } returns listOf(group)
            coEvery { taskRepository.getMyTasks() } returns
                listOf(
                    task("past", "2026-10-05"),
                    task("d", "2026-11-02"),
                    task("declined", "2026-10-13", LifeGroupTaskStatus.DECLINED),
                    task("today", "2026-10-12"),
                    task("c", "2026-10-26"),
                    task("b", "2026-10-19"),
                    task("other-group", "2026-10-13", lifeGroupId = 99),
                )

            val viewModel = buildViewModel()
            testScheduler.advanceUntilIdle()

            val state = viewModel.uiState.value
            assertEquals(1, state.lifeGroupCards.size)
            assertEquals(listOf("today", "b", "c"), state.lifeGroupCards.single().tasks.map { it.id })
            assertEquals(0, state.hiddenLifeGroupsCount)
            assertTrue(state.legacyTasks.isEmpty())
            assertFalse(state.showLifeGroupDiscoveryCTA)
        }

    @Test
    fun `no groups shows the discovery CTA and no cards`() =
        runTest {
            coEvery { churchRepository.getMyLifeGroups() } returns emptyList()
            coEvery { taskRepository.getMyTasks() } returns listOf(task("a", "2026-10-13"))

            val viewModel = buildViewModel()
            testScheduler.advanceUntilIdle()

            val state = viewModel.uiState.value
            assertTrue(state.showLifeGroupDiscoveryCTA)
            assertTrue(state.lifeGroupCards.isEmpty())
            assertTrue(state.legacyTasks.isEmpty())
        }

    @Test
    fun `more than three groups caps the cards and counts the hidden ones`() =
        runTest {
            coEvery { churchRepository.getMyLifeGroups() } returns (1..5).map { LifeGroup(id = it, name = "G$it") }
            coEvery { taskRepository.getMyTasks() } returns emptyList()

            val viewModel = buildViewModel()
            testScheduler.advanceUntilIdle()

            assertEquals(3, viewModel.uiState.value.lifeGroupCards.size)
            assertEquals(2, viewModel.uiState.value.hiddenLifeGroupsCount)
        }

    @Test
    fun `groups failure with tasks ok falls back to the legacy tasks card without an error`() =
        runTest {
            coEvery { churchRepository.getMyLifeGroups() } throws RuntimeException("boom")
            coEvery { taskRepository.getMyTasks() } returns listOf(task("a", "2026-10-13"), task("past", "2026-10-01"))

            val viewModel = buildViewModel()
            testScheduler.advanceUntilIdle()

            val state = viewModel.uiState.value
            assertTrue(state.lifeGroupCards.isEmpty())
            assertEquals(listOf("a"), state.legacyTasks.map { it.id })
            // A failed groups fetch is never read as "no group".
            assertFalse(state.showLifeGroupDiscoveryCTA)
            assertNull(state.error)
        }

    @Test
    fun `task fetch failure renders the group cards without tasks and without breaking home`() =
        runTest {
            coEvery { churchRepository.getMyLifeGroups() } returns listOf(group)
            coEvery { taskRepository.getMyTasks() } throws RuntimeException("boom")

            val viewModel = buildViewModel()
            testScheduler.advanceUntilIdle()

            val state = viewModel.uiState.value
            assertEquals(1, state.lifeGroupCards.size)
            assertTrue(state.lifeGroupCards.single().tasks.isEmpty())
            assertTrue(state.legacyTasks.isEmpty())
            assertNull(state.error)
            assertEquals("Ana", state.userName)
        }

    @Test
    fun `both fetches failing is quiet`() =
        runTest {
            coEvery { churchRepository.getMyLifeGroups() } throws RuntimeException("boom")
            coEvery { taskRepository.getMyTasks() } throws RuntimeException("boom")

            val viewModel = buildViewModel()
            testScheduler.advanceUntilIdle()

            val state = viewModel.uiState.value
            assertTrue(state.lifeGroupCards.isEmpty())
            assertTrue(state.legacyTasks.isEmpty())
            assertFalse(state.showLifeGroupDiscoveryCTA)
            assertNull(state.error)
        }

    @Test
    fun `groups led by the viewer come first`() =
        runTest {
            coEvery { churchRepository.getMyLifeGroups() } returns
                listOf(LifeGroup(id = 1, name = "Alfa"), LifeGroup(id = 2, name = "Zeta", coLeaderId = 5))
            coEvery { taskRepository.getMyTasks() } returns emptyList()

            val viewModel = buildViewModel()
            testScheduler.advanceUntilIdle()

            assertEquals(listOf(2, 1), viewModel.uiState.value.lifeGroupCards.map { it.group.id })
        }

    @Test
    fun `tapping a group card and see all emit navigation`() =
        runTest {
            coEvery { churchRepository.getMyLifeGroups() } returns emptyList()
            coEvery { taskRepository.getMyTasks() } returns emptyList()
            val viewModel = buildViewModel()
            testScheduler.advanceUntilIdle()

            viewModel.effect.test {
                viewModel.onLifeGroupTapped(10)
                assertEquals(HomeEffect.NavigateToLifeGroup(10), awaitItem())
                viewModel.onSeeAllLifeGroupsTapped()
                assertEquals(HomeEffect.NavigateToAllLifeGroups, awaitItem())
                cancelAndIgnoreRemainingEvents()
            }
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
