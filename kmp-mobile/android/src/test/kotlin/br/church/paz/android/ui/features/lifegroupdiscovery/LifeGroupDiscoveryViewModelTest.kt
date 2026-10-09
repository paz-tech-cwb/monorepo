package br.church.paz.android.ui.features.lifegroupdiscovery

import br.church.paz.android.util.MainDispatcherRule
import br.church.paz.shared.domain.model.LifeGroup
import br.church.paz.shared.domain.repository.ChurchRepository
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.delay
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

class LifeGroupDiscoveryViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val churchRepository = mockk<ChurchRepository>()
    private val locationProvider = mockk<LocationProvider>()

    private val groups =
        listOf(
            LifeGroup(id = 1, name = "Grupo A", kidsCount = 0),
            LifeGroup(id = 2, name = "Grupo B", kidsCount = 2),
        )

    @Test
    fun `kidsOnly filter includes only groups with kidsCount greater than zero`() =
        runTest {
            coEvery { locationProvider.getCurrentLocation() } returns null
            coEvery { churchRepository.getAllLifeGroups(any()) } returns groups

            val viewModel = LifeGroupDiscoveryViewModel(churchRepository, locationProvider)
            testScheduler.advanceUntilIdle()

            viewModel.onKidsOnlyToggled(true)

            assertEquals(listOf(groups[1]), viewModel.uiState.value.displayedGroups)
        }

    @Test
    fun `stale out-of-order search response is discarded in favor of the newer search`() =
        runTest {
            coEvery { locationProvider.getCurrentLocation() } returns null

            val staleGroups = listOf(LifeGroup(id = 10, name = "Stale"))
            val freshGroups = listOf(LifeGroup(id = 20, name = "Fresh"))

            coEvery { churchRepository.getAllLifeGroups("stale") } coAnswers {
                delay(100)
                staleGroups
            }
            coEvery { churchRepository.getAllLifeGroups("fresh") } coAnswers {
                delay(10)
                freshGroups
            }
            coEvery { churchRepository.getAllLifeGroups(null) } returns emptyList()

            val viewModel = LifeGroupDiscoveryViewModel(churchRepository, locationProvider)
            testScheduler.advanceUntilIdle()

            // Start the "stale" search first (slower to resolve), then the
            // "fresh" search shortly after (faster to resolve) — the stale
            // one's response lands LAST in real time, but must be discarded.
            viewModel.load(search = "stale")
            viewModel.load(search = "fresh")
            testScheduler.advanceUntilIdle()

            assertEquals(freshGroups, viewModel.uiState.value.lifeGroups)
        }
}
