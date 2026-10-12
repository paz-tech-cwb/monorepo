package br.church.paz.android.ui.features.ministries

import br.church.paz.android.util.MainDispatcherRule
import br.church.paz.shared.domain.model.LifeGroup
import br.church.paz.shared.domain.model.LifeGroupTask
import br.church.paz.shared.domain.model.LifeGroupTaskStatus
import br.church.paz.shared.domain.model.User
import br.church.paz.shared.domain.model.UserRole
import br.church.paz.shared.domain.repository.AuthRepository
import br.church.paz.shared.domain.repository.ChurchRepository
import br.church.paz.shared.domain.repository.LifeGroupTaskRepository
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
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

    // Loads the detail screen for group 10 as `userId` with `role`, against a group led by 1 and co-led by 2.
    private fun TestScope.detailState(
        userId: String,
        role: UserRole,
    ): LifeGroupDetailUiState {
        coEvery { authRepository.currentUser() } returns User(id = userId, name = "U", role = role)
        coEvery { churchRepository.getAllLifeGroups() } returns listOf(group.copy(leaderId = 1, coLeaderId = 2))
        coEvery { taskRepository.getMyTasks() } returns emptyList()
        val viewModel = LifeGroupDetailViewModel("10", churchRepository, authRepository, taskRepository)
        testScheduler.advanceUntilIdle()
        return viewModel.uiState.value
    }

    @Test
    fun `canViewGroupReports gate matrix`() =
        runTest {
            // This group's leader and co-leader (role member) see the entries.
            assertTrue(detailState("1", UserRole.life_group_leader).canViewGroupReports)
            assertTrue(detailState("2", UserRole.member).canViewGroupReports)
            // A life_group_leader of ANOTHER group no longer sees them.
            assertFalse(detailState("9", UserRole.life_group_leader).canViewGroupReports)
            // Admin, pastor, area and sector leaders keep them on every group.
            assertTrue(detailState("9", UserRole.admin).canViewGroupReports)
            assertTrue(detailState("9", UserRole.pastor).canViewGroupReports)
            assertTrue(detailState("9", UserRole.area_leader).canViewGroupReports)
            assertTrue(detailState("9", UserRole.sector_leader).canViewGroupReports)
            // Plain members, disciplers and guests never do.
            assertFalse(detailState("9", UserRole.member).canViewGroupReports)
            assertFalse(detailState("9", UserRole.discipler).canViewGroupReports)
            assertFalse(detailState("9", UserRole.guest).canViewGroupReports)
        }

    @Test
    fun `canViewLifeGroupReports pure gate`() {
        assertTrue(canViewLifeGroupReports(UserRole.member, isGroupLeadership = true))
        assertTrue(canViewLifeGroupReports(null, isGroupLeadership = true))
        assertFalse(canViewLifeGroupReports(null, isGroupLeadership = false))
        assertFalse(canViewLifeGroupReports(UserRole.life_group_leader, isGroupLeadership = false))
    }
}
