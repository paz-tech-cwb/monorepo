package br.church.paz.android.ui.features.lifegroupmeeting

import app.cash.turbine.test
import br.church.paz.android.util.MainDispatcherRule
import br.church.paz.shared.domain.model.LifeGroup
import br.church.paz.shared.domain.model.User
import br.church.paz.shared.domain.model.UserRole
import br.church.paz.shared.domain.repository.AuthRepository
import br.church.paz.shared.domain.repository.ChurchRepository
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

class LifeGroupMeetingEntryViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val churchRepository = mockk<ChurchRepository>()
    private val authRepository = mockk<AuthRepository>()

    private fun group(
        id: Int,
        name: String,
        relationship: String?,
        meetingDay: String? = "Terça-feira",
    ) = LifeGroup(id = id, name = name, relationship = relationship, meetingDay = meetingDay)

    private fun viewModel(
        role: UserRole?,
        mine: List<LifeGroup> = emptyList(),
        all: List<LifeGroup> = emptyList(),
    ): LifeGroupMeetingEntryViewModel {
        coEvery { authRepository.currentUser() } returns User(id = "5", name = "Ana", role = role ?: UserRole.member)
        coEvery { churchRepository.getMyLifeGroups() } returns mine
        coEvery { churchRepository.getAllLifeGroups(any()) } returns all
        return LifeGroupMeetingEntryViewModel(churchRepository, authRepository)
    }

    @Test
    fun `the only led group opens its Reunioes directly replacing the entry`() =
        runTest {
            val vm = viewModel(UserRole.member, mine = listOf(group(2, "Centro", "leader"), group(3, "Norte", "member")))
            vm.effect.test {
                testScheduler.advanceUntilIdle()
                assertEquals(
                    LifeGroupMeetingEntryEffect.OpenMeetings(2, "Terça-feira", canWrite = true, replaceEntry = true),
                    awaitItem(),
                )
            }
        }

    @Test
    fun `several led groups show a picker and tapping one opens it keeping the picker below`() =
        runTest {
            val vm = viewModel(UserRole.life_group_leader, mine = listOf(group(2, "Centro", "leader"), group(3, "Norte", "co_leader")))
            testScheduler.advanceUntilIdle()

            val entry = vm.uiState.value.entry!!
            assertNull(entry.directGroupId)
            assertEquals(listOf(2, 3), entry.groups.map { it.group.id })
            vm.effect.test {
                vm.onGroupTapped(entry.groups[1])
                testScheduler.advanceUntilIdle()
                assertEquals(
                    LifeGroupMeetingEntryEffect.OpenMeetings(3, "Terça-feira", canWrite = true, replaceEntry = false),
                    awaitItem(),
                )
            }
        }

    @Test
    fun `admin gets every group and only then needs the all groups request`() =
        runTest {
            val vm = viewModel(UserRole.admin, all = listOf(group(8, "B", null), group(1, "A", null)))
            testScheduler.advanceUntilIdle()

            assertEquals(listOf(1, 8), vm.uiState.value.entry!!.groups.map { it.group.id })
            assertTrue(vm.uiState.value.entry!!.groups.all { it.canWrite })

            val leader = viewModel(UserRole.member, mine = listOf(group(2, "Centro", "leader")))
            testScheduler.advanceUntilIdle()
            assertNotNull(leader.uiState.value.entry)
            coVerify(exactly = 1) { churchRepository.getAllLifeGroups(any()) }
        }

    @Test
    fun `a supervisor sees the supervised groups read only`() =
        runTest {
            val vm =
                viewModel(
                    UserRole.sector_leader,
                    mine = listOf(group(2, "A", "supervisor"), group(3, "B", "supervisor")),
                )
            testScheduler.advanceUntilIdle()

            val entry = vm.uiState.value.entry!!
            assertNull(entry.directGroupId)
            assertTrue(entry.groups.none { it.canWrite })
            vm.effect.test {
                vm.onGroupTapped(entry.groups.first())
                testScheduler.advanceUntilIdle()
                assertEquals(
                    LifeGroupMeetingEntryEffect.OpenMeetings(2, "Terça-feira", canWrite = false, replaceEntry = false),
                    awaitItem(),
                )
            }
        }

    @Test
    fun `someone who leads nothing gets the explanation and a load failure is retryable`() =
        runTest {
            val vm = viewModel(UserRole.member, mine = listOf(group(2, "A", "member")))
            testScheduler.advanceUntilIdle()
            assertNotNull(vm.uiState.value.entry!!.emptyMessage)
            assertFalse(vm.uiState.value.isLoading)

            coEvery { churchRepository.getMyLifeGroups() } throws RuntimeException("offline")
            vm.load()
            testScheduler.advanceUntilIdle()
            assertEquals("offline", vm.uiState.value.error)

            coEvery { churchRepository.getMyLifeGroups() } returns listOf(group(2, "A", "leader"))
            vm.load()
            testScheduler.advanceUntilIdle()
            assertNull(vm.uiState.value.error)
        }
}
