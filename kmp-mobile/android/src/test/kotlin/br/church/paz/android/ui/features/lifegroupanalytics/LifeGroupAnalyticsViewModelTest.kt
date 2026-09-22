package br.church.paz.android.ui.features.lifegroupanalytics

import br.church.paz.android.util.MainDispatcherRule
import br.church.paz.shared.domain.model.LifeGroup
import br.church.paz.shared.domain.model.LifeGroupAttendanceAnalytics
import br.church.paz.shared.domain.model.LifeGroupDistributionAnalytics
import br.church.paz.shared.domain.model.LifeGroupOverview
import br.church.paz.shared.domain.repository.ChurchRepository
import br.church.paz.shared.domain.repository.LifeGroupAnalyticsRepository
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Rule
import org.junit.Test

class LifeGroupAnalyticsViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val analyticsRepository = mockk<LifeGroupAnalyticsRepository>()
    private val churchRepository = mockk<ChurchRepository>()

    private val emptyAttendance = LifeGroupAttendanceAnalytics(granularity = "month", year = 2026, month = null, rows = emptyList())
    private val emptyDistribution =
        LifeGroupDistributionAnalytics(byDay = emptyList(), byHour = emptyList(), byNeighborhood = emptyList(), byCity = emptyList())
    private val overview =
        LifeGroupOverview(
            totalKids = 5,
            avgMembersPerGroup = 3.5,
            groupsBySector = emptyList(),
            membersInGroup = 10,
            membersTotal = 20,
        )

    private fun buildViewModel(): LifeGroupAnalyticsViewModel {
        coEvery { churchRepository.getAllLifeGroups() } returns emptyList<LifeGroup>()
        coEvery { analyticsRepository.getAttendance(any(), any(), any(), any()) } returns emptyAttendance
        coEvery { analyticsRepository.getDistribution(any()) } returns emptyDistribution
        coEvery { analyticsRepository.getOverview() } returns overview
        return LifeGroupAnalyticsViewModel(null, analyticsRepository, churchRepository)
    }

    @Test
    fun `overview loads successfully alongside attendance and distribution`() =
        runTest {
            val viewModel = buildViewModel()
            testScheduler.advanceUntilIdle()

            assertEquals(overview, viewModel.uiState.value.overview)
            assertNull(viewModel.uiState.value.error)
        }

    @Test
    fun `overview failure does not break the rest of the report`() =
        runTest {
            coEvery { churchRepository.getAllLifeGroups() } returns emptyList<LifeGroup>()
            coEvery { analyticsRepository.getAttendance(any(), any(), any(), any()) } returns emptyAttendance
            coEvery { analyticsRepository.getDistribution(any()) } returns emptyDistribution
            coEvery { analyticsRepository.getOverview() } throws RuntimeException("boom")

            val viewModel = LifeGroupAnalyticsViewModel(null, analyticsRepository, churchRepository)
            testScheduler.advanceUntilIdle()

            assertNull(viewModel.uiState.value.overview)
            assertNull(viewModel.uiState.value.error)
            assertNotNull(viewModel.uiState.value.attendanceRows)
        }
}
