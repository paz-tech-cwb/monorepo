package br.church.paz.android.ui.features.ministries

import br.church.paz.android.util.MainDispatcherRule
import br.church.paz.shared.domain.model.LifeGroup
import br.church.paz.shared.domain.model.LifeGroupMember
import br.church.paz.shared.domain.repository.ChurchRepository
import br.church.paz.shared.domain.repository.FormsRepository
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Rule
import org.junit.Test

class LifeGroupManageViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val churchRepository = mockk<ChurchRepository>()
    private val formsRepository = mockk<FormsRepository>()

    private val memberA = LifeGroupMember(id = 1, name = "Ana", email = "ana@example.com")
    private val memberB = LifeGroupMember(id = 2, name = "Bruno", email = "bruno@example.com")

    private val group =
        LifeGroup(
            id = 10,
            name = "Grupo Teste",
            members = listOf(memberA, memberB),
        )

    private fun buildViewModel(): LifeGroupManageViewModel {
        coEvery { churchRepository.getAllLifeGroups() } returns listOf(group)
        return LifeGroupManageViewModel("10", churchRepository, formsRepository)
    }

    @Test
    fun `successful removal drops member from local state and calls repository with correct ids`() =
        runTest {
            coEvery { churchRepository.removeLifeGroupMember(10, memberA.id) } returns Unit

            val viewModel = buildViewModel()
            testScheduler.advanceUntilIdle()

            viewModel.onRemoveMember(memberA)
            testScheduler.advanceUntilIdle()

            assertEquals(listOf(memberB), viewModel.uiState.value.members)
            assertNull(viewModel.uiState.value.saveError)
            coVerify(exactly = 1) { churchRepository.removeLifeGroupMember(10, memberA.id) }
        }

    @Test
    fun `failed removal restores member list and sets saveError`() =
        runTest {
            coEvery { churchRepository.removeLifeGroupMember(10, memberA.id) } throws RuntimeException("boom")

            val viewModel = buildViewModel()
            testScheduler.advanceUntilIdle()

            viewModel.onRemoveMember(memberA)
            testScheduler.advanceUntilIdle()

            assertEquals(listOf(memberA, memberB), viewModel.uiState.value.members)
            assertEquals("Erro ao remover membro. Tente novamente.", viewModel.uiState.value.saveError)
        }
}
