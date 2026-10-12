package br.church.paz.android.ui.features.ministries

import br.church.paz.android.util.MainDispatcherRule
import br.church.paz.shared.domain.model.LifeGroup
import br.church.paz.shared.domain.model.LifeGroupTask
import br.church.paz.shared.domain.model.LifeGroupTaskStatus
import br.church.paz.shared.domain.model.User
import br.church.paz.shared.domain.repository.AuthRepository
import br.church.paz.shared.domain.repository.ChurchRepository
import br.church.paz.shared.domain.repository.LifeGroupTaskRepository
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Rule
import org.junit.Test

class LifeGroupDetailViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val churchRepository = mockk<ChurchRepository>()
    private val authRepository = mockk<AuthRepository>()
    private val taskRepository = mockk<LifeGroupTaskRepository>()

    private val group = LifeGroup(id = 10, name = "Grupo Alfa")

    private fun task(
        id: String,
        lifeGroupId: Int,
        date: String,
        status: LifeGroupTaskStatus = LifeGroupTaskStatus.ASSIGNED,
    ) = LifeGroupTask(
        id = id,
        lifeGroupId = lifeGroupId,
        lifeGroupName = "Grupo $lifeGroupId",
        meetingDate = date,
        name = "Tarefa $id",
        description = "",
        guidance = "",
        status = status,
    )

    private fun buildViewModel(): LifeGroupDetailViewModel {
        coEvery { authRepository.currentUser() } returns User(id = "5", name = "Ana")
        coEvery { churchRepository.getAllLifeGroups() } returns listOf(group)
        return LifeGroupDetailViewModel("10", churchRepository, authRepository, taskRepository)
    }

    @Test
    fun `myTasks keeps only assigned tasks of this group ordered by meeting date`() =
        runTest {
            coEvery { taskRepository.getMyTasks() } returns
                listOf(
                    task("late", 10, "2026-10-27"),
                    task("other-group", 11, "2026-10-20"),
                    task("declined", 10, "2026-10-21", LifeGroupTaskStatus.DECLINED),
                    task("early", 10, "2026-10-20"),
                )

            val viewModel = buildViewModel()
            testScheduler.advanceUntilIdle()

            assertEquals(listOf("early", "late"), viewModel.uiState.value.myTasks.map { it.id })
        }

    @Test
    fun `task loading failure does not break the group detail`() =
        runTest {
            coEvery { taskRepository.getMyTasks() } throws RuntimeException("boom")

            val viewModel = buildViewModel()
            testScheduler.advanceUntilIdle()

            assertEquals(group, viewModel.uiState.value.lifeGroup)
            assertNull(viewModel.uiState.value.error)
            assertEquals(emptyList<LifeGroupTask>(), viewModel.uiState.value.myTasks)
        }
}
