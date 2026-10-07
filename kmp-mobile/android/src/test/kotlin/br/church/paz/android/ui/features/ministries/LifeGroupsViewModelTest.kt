package br.church.paz.android.ui.features.ministries

import br.church.paz.android.util.MainDispatcherRule
import br.church.paz.shared.domain.model.LifeGroup
import br.church.paz.shared.domain.repository.ChurchRepository
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class LifeGroupsViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val churchRepository = mockk<ChurchRepository>()

    private val myGroup = LifeGroup(id = 1, name = "Meu Grupo")
    private val allGroups = listOf(LifeGroup(id = 2, name = "Grupo A"), LifeGroup(id = 3, name = "Grupo B"))

    @Test
    fun `non-empty my groups keeps isFallbackToAll false and shows those groups`() =
        runTest {
            coEvery { churchRepository.getMyLifeGroups() } returns listOf(myGroup)

            val viewModel = LifeGroupsViewModel(churchRepository)
            testScheduler.advanceUntilIdle()

            assertEquals(listOf(myGroup), viewModel.uiState.value.lifeGroups)
            assertFalse(viewModel.uiState.value.isFallbackToAll)
            assertFalse(viewModel.uiState.value.isLoading)
            assertNull(viewModel.uiState.value.error)
        }

    @Test
    fun `empty my groups falls back to all groups with isFallbackToAll true`() =
        runTest {
            coEvery { churchRepository.getMyLifeGroups() } returns emptyList()
            coEvery { churchRepository.getAllLifeGroups() } returns allGroups

            val viewModel = LifeGroupsViewModel(churchRepository)
            testScheduler.advanceUntilIdle()

            assertEquals(allGroups, viewModel.uiState.value.lifeGroups)
            assertTrue(viewModel.uiState.value.isFallbackToAll)
            assertFalse(viewModel.uiState.value.isLoading)
            assertNull(viewModel.uiState.value.error)
        }

    @Test
    fun `getMyLifeGroups failure sets error state`() =
        runTest {
            coEvery { churchRepository.getMyLifeGroups() } throws RuntimeException("boom")

            val viewModel = LifeGroupsViewModel(churchRepository)
            testScheduler.advanceUntilIdle()

            assertNotNull(viewModel.uiState.value.error)
            assertEquals("boom", viewModel.uiState.value.error)
            assertFalse(viewModel.uiState.value.isLoading)
            assertTrue(
                viewModel.uiState.value.lifeGroups
                    .isEmpty(),
            )
        }

    @Test
    fun `refresh toggles isRefreshing without touching isLoading`() =
        runTest {
            coEvery { churchRepository.getMyLifeGroups() } returns listOf(myGroup)

            val viewModel = LifeGroupsViewModel(churchRepository)
            testScheduler.advanceUntilIdle()
            assertFalse(viewModel.uiState.value.isLoading)

            viewModel.refresh()
            assertTrue(viewModel.uiState.value.isRefreshing)
            assertFalse(viewModel.uiState.value.isLoading)

            testScheduler.advanceUntilIdle()
            assertFalse(viewModel.uiState.value.isRefreshing)
            assertFalse(viewModel.uiState.value.isLoading)
        }
}
