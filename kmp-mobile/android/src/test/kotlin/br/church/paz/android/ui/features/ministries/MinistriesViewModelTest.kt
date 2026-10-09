package br.church.paz.android.ui.features.ministries

import br.church.paz.android.util.MainDispatcherRule
import br.church.paz.shared.domain.model.Ministry
import br.church.paz.shared.domain.model.User
import br.church.paz.shared.domain.model.UserRole
import br.church.paz.shared.domain.repository.AuthRepository
import br.church.paz.shared.domain.repository.ChurchRepository
import br.church.paz.shared.domain.repository.CreateMinistryRequest
import br.church.paz.shared.domain.repository.FormsRepository
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class MinistriesViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val churchRepository = mockk<ChurchRepository>()
    private val authRepository = mockk<AuthRepository>()
    private val formsRepository = mockk<FormsRepository>()

    private fun TestScope.buildViewModel(currentUser: User?): MinistriesViewModel {
        coEvery { churchRepository.getAllMinistries() } returns emptyList()
        coEvery { churchRepository.getAllLifeGroups() } returns emptyList()
        coEvery { authRepository.currentUser() } returns currentUser
        val viewModel = MinistriesViewModel(churchRepository, authRepository, formsRepository)
        testScheduler.advanceUntilIdle()
        return viewModel
    }

    @Test
    fun `canManage is true for leadership roles and false for member or guest`() =
        runTest {
            val admin = buildViewModel(User(id = "1", name = "Admin", email = "a@t.com", role = UserRole.admin))
            assertTrue(admin.uiState.value.canManage)

            val pastor = buildViewModel(User(id = "2", name = "Pastor", email = "p@t.com", role = UserRole.pastor))
            assertTrue(pastor.uiState.value.canManage)

            val member = buildViewModel(User(id = "3", name = "Member", email = "m@t.com", role = UserRole.member))
            assertFalse(member.uiState.value.canManage)

            val guest = buildViewModel(User(id = "4", name = "Guest", email = "g@t.com", role = UserRole.guest))
            assertFalse(guest.uiState.value.canManage)

            val discipler = buildViewModel(User(id = "5", name = "Discipler", email = "d@t.com", role = UserRole.discipler))
            assertFalse(discipler.uiState.value.canManage)
        }

    @Test
    fun `onCreateConfirm is blocked with blank name`() =
        runTest {
            val viewModel = buildViewModel(User(id = "1", name = "Admin", email = "a@t.com", role = UserRole.admin))
            viewModel.onCreateMinistryOpen()
            viewModel.onLeaderSelected("5", "Leader")
            viewModel.onCreateNameChanged("")

            viewModel.onCreateConfirm()
            testScheduler.advanceUntilIdle()

            // Form should still be present (not submitted/cleared) because canSubmit is false.
            assertNotNull(viewModel.uiState.value.createForm)
        }

    @Test
    fun `onCreateConfirm is blocked with null leaderId`() =
        runTest {
            val viewModel = buildViewModel(User(id = "1", name = "Admin", email = "a@t.com", role = UserRole.admin))
            viewModel.onCreateMinistryOpen()
            viewModel.onCreateNameChanged("Ministério de Louvor")

            viewModel.onCreateConfirm()
            testScheduler.advanceUntilIdle()

            assertNotNull(viewModel.uiState.value.createForm)
            assertNull(
                viewModel.uiState.value.createForm
                    ?.leaderId,
            )
        }

    @Test
    fun `leader search result with non-numeric id maps leaderId to null`() =
        runTest {
            val viewModel = buildViewModel(User(id = "1", name = "Admin", email = "a@t.com", role = UserRole.admin))
            viewModel.onCreateMinistryOpen()

            viewModel.onLeaderSelected("not-a-number", "Weird Leader")
            testScheduler.advanceUntilIdle()

            assertNull(
                viewModel.uiState.value.createForm
                    ?.leaderId,
            )
            assertEquals(
                "Weird Leader",
                viewModel.uiState.value.createForm
                    ?.leaderName,
            )
        }

    @Test
    fun `selecting a leader only populates leader fields, not co-leader fields`() =
        runTest {
            val viewModel = buildViewModel(User(id = "1", name = "Admin", email = "a@t.com", role = UserRole.admin))
            viewModel.onCreateMinistryOpen()

            viewModel.onLeaderSelected("7", "Leader Name")
            testScheduler.advanceUntilIdle()

            val form = viewModel.uiState.value.createForm
            assertEquals(7, form?.leaderId)
            assertEquals("Leader Name", form?.leaderName)
            assertNull(form?.coLeaderId)
            assertEquals("", form?.coLeaderName)
        }

    @Test
    fun `selecting a co-leader only populates co-leader fields, not leader fields`() =
        runTest {
            val viewModel = buildViewModel(User(id = "1", name = "Admin", email = "a@t.com", role = UserRole.admin))
            viewModel.onCreateMinistryOpen()

            viewModel.onCoLeaderSelected("9", "Co-Leader Name")
            testScheduler.advanceUntilIdle()

            val form = viewModel.uiState.value.createForm
            assertEquals(9, form?.coLeaderId)
            assertEquals("Co-Leader Name", form?.coLeaderName)
            assertNull(form?.leaderId)
            assertEquals("", form?.leaderName)
        }

    @Test
    fun `successful onCreateConfirm reloads the ministry list and clears the form`() =
        runTest {
            val createdMinistry = Ministry(id = 42, name = "Ministério de Louvor")
            val viewModel = buildViewModel(User(id = "1", name = "Admin", email = "a@t.com", role = UserRole.admin))
            coEvery { churchRepository.createMinistry(any<CreateMinistryRequest>()) } returns createdMinistry

            viewModel.onCreateMinistryOpen()
            viewModel.onCreateNameChanged("Ministério de Louvor")
            viewModel.onLeaderSelected("5", "Leader")

            viewModel.onCreateConfirm()
            testScheduler.advanceUntilIdle()

            assertNull(viewModel.uiState.value.createForm)
        }

    @Test
    fun `failing onCreateConfirm sets an inline error and clears isSaving`() =
        runTest {
            val viewModel = buildViewModel(User(id = "1", name = "Admin", email = "a@t.com", role = UserRole.admin))
            coEvery { churchRepository.createMinistry(any<CreateMinistryRequest>()) } throws RuntimeException("boom")

            viewModel.onCreateMinistryOpen()
            viewModel.onCreateNameChanged("Ministério de Louvor")
            viewModel.onLeaderSelected("5", "Leader")

            viewModel.onCreateConfirm()
            testScheduler.advanceUntilIdle()

            val form = viewModel.uiState.value.createForm
            assertNotNull(form)
            assertEquals("boom", form?.error)
            assertFalse(form?.isSaving == true)
        }
}
