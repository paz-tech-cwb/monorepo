package br.church.paz.android.ui.features.lifegroupanalytics

import br.church.paz.android.util.MainDispatcherRule
import br.church.paz.shared.auth.TokenStorage
import br.church.paz.shared.data.remote.createPazHttpClient
import br.church.paz.shared.data.remote.throwOnClientOrServerError
import br.church.paz.shared.domain.model.LifeGroupAttendanceAnalytics
import br.church.paz.shared.domain.model.LifeGroupAttendancePoint
import br.church.paz.shared.domain.model.LifeGroupDistributionAnalytics
import br.church.paz.shared.domain.model.LifeGroupOverview
import br.church.paz.shared.domain.model.LifeGroupSummary
import br.church.paz.shared.domain.repository.LifeGroupAnalyticsRepository
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respondError
import io.ktor.client.plugins.ClientRequestException
import io.ktor.client.request.get
import io.ktor.http.HttpStatusCode
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class LifeGroupAnalyticsViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val analyticsRepository = mockk<LifeGroupAnalyticsRepository>()

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
            lifeGroups = listOf(LifeGroupSummary(id = 7, name = "Grupo Alfa")),
        )

    // Builds a REAL Ktor [ClientRequestException] for a 403 response — the exact
    // exception type [br.church.paz.shared.data.remote.httpStatusCodeOrNull] recognizes —
    // by round-tripping a request through [createPazHttpClient] against a [MockEngine] that
    // always responds 403. A generic `RuntimeException("Forbidden")` would NOT exercise the
    // 403-routing branch at all, since `httpStatusCodeOrNull()` returns null for it.
    private suspend fun forbiddenClientRequestException(): ClientRequestException {
        val engine = MockEngine { respondError(HttpStatusCode.Forbidden) }
        val client = createPazHttpClient(mockk<TokenStorage>(relaxed = true), "http://test", engine)
        val response = client.get("/forbidden")
        return try {
            response.throwOnClientOrServerError()
            error("expected a ClientRequestException")
        } catch (e: ClientRequestException) {
            e
        }
    }

    private fun buildViewModel(): LifeGroupAnalyticsViewModel {
        coEvery { analyticsRepository.getAttendance(any(), any(), any(), any()) } returns emptyAttendance
        coEvery { analyticsRepository.getDistribution(any()) } returns emptyDistribution
        coEvery { analyticsRepository.getOverview() } returns overview
        return LifeGroupAnalyticsViewModel(null, analyticsRepository)
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
            coEvery { analyticsRepository.getAttendance(any(), any(), any(), any()) } returns emptyAttendance
            coEvery { analyticsRepository.getDistribution(any()) } returns emptyDistribution
            coEvery { analyticsRepository.getOverview() } throws RuntimeException("boom")

            val viewModel = LifeGroupAnalyticsViewModel(null, analyticsRepository)
            testScheduler.advanceUntilIdle()

            assertNull(viewModel.uiState.value.overview)
            assertNull(viewModel.uiState.value.error)
            assertNotNull(viewModel.uiState.value.attendanceRows)
        }

    @Test
    fun `life groups dropdown is populated from the scoped overview field, not an unscoped endpoint`() =
        runTest {
            val viewModel = buildViewModel()
            testScheduler.advanceUntilIdle()

            assertEquals(listOf(7 to "Grupo Alfa"), viewModel.uiState.value.lifeGroups)
        }

    @Test
    fun `isLoading is true only for the first load, isRefreshing for subsequent filter changes`() =
        runTest {
            val viewModel = buildViewModel()
            testScheduler.advanceUntilIdle()

            assertFalse(viewModel.uiState.value.isLoading)
            assertFalse(viewModel.uiState.value.isRefreshing)

            // The mock must genuinely suspend so there's a real suspension point
            // for `runCurrent()` to land on mid-execution — otherwise the mocked
            // call resolves immediately and `runCurrent()` drains the entire
            // load() body in one pass, never observing the in-flight state.
            val deferredAttendance = CompletableDeferred<LifeGroupAttendanceAnalytics>()
            coEvery { analyticsRepository.getAttendance(any(), any(), any(), any()) } coAnswers { deferredAttendance.await() }

            viewModel.onYearSelected(2025)
            // Mid-flight the reload should mark isRefreshing, not isLoading,
            // so the filter row stays mounted (root cause C). `runCurrent()`
            // advances the dispatcher just enough to execute the coroutine
            // body up to its first suspension point (the repository calls),
            // WITHOUT letting them resolve — unlike `advanceUntilIdle()`,
            // which would run the load to completion and never observe the
            // in-flight `isRefreshing = true` state at all.
            testScheduler.runCurrent()
            assertFalse(viewModel.uiState.value.isLoading)
            assertTrue(viewModel.uiState.value.isRefreshing)

            deferredAttendance.complete(emptyAttendance)
            testScheduler.advanceUntilIdle()

            assertFalse(viewModel.uiState.value.isLoading)
            assertFalse(viewModel.uiState.value.isRefreshing)
        }

    @Test
    fun `an unexpected 403 on distribution surfaces inline on that chart only, not as a full-screen error`() =
        runTest {
            val forbidden = forbiddenClientRequestException()
            coEvery { analyticsRepository.getAttendance(any(), any(), any(), any()) } returns emptyAttendance
            coEvery { analyticsRepository.getDistribution(any()) } throws forbidden
            coEvery { analyticsRepository.getOverview() } returns overview

            val viewModel = LifeGroupAnalyticsViewModel(null, analyticsRepository)
            testScheduler.advanceUntilIdle()

            // Must take the inline, chart-scoped error path specifically — not
            // the full-screen error state, and not leave the unaffected
            // attendance chart's data cleared either.
            assertNotNull(viewModel.uiState.value.distributionError)
            assertNull(viewModel.uiState.value.error)
            assertNotNull(viewModel.uiState.value.attendanceRows)
            assertNull(viewModel.uiState.value.attendanceError)
        }

    @Test
    fun `opening with a life group id scopes the screen to that group`() =
        runTest {
            coEvery { analyticsRepository.getAttendance(any(), any(), any(), any()) } returns emptyAttendance
            coEvery { analyticsRepository.getDistribution(any()) } returns emptyDistribution
            coEvery { analyticsRepository.getOverview() } returns overview

            val scoped = LifeGroupAnalyticsViewModel(7, analyticsRepository)
            val general = LifeGroupAnalyticsViewModel(null, analyticsRepository)
            testScheduler.advanceUntilIdle()

            assertTrue(scoped.uiState.value.isScopedToGroup)
            assertEquals(7, scoped.uiState.value.lifeGroupId)
            assertFalse(general.uiState.value.isScopedToGroup)
        }

    @Test
    fun `a single group sends life_group_id and never asks for church wide data`() =
        runTest {
            coEvery { analyticsRepository.getAttendance(any(), any(), any(), any()) } returns emptyAttendance

            val scoped = LifeGroupAnalyticsViewModel(7, analyticsRepository)
            testScheduler.advanceUntilIdle()

            coVerify(exactly = 1) { analyticsRepository.getAttendance(any(), any(), 7, any()) }
            // The overview (groups by sector, members without group...) and the distribution of groups
            // do not belong to one group: not even requested.
            coVerify(exactly = 0) { analyticsRepository.getOverview() }
            coVerify(exactly = 0) { analyticsRepository.getDistribution(any()) }
            assertNull(scoped.uiState.value.overview)
            assertTrue(scoped.uiState.value.lifeGroups.isEmpty())
            assertNull(scoped.uiState.value.distributionError)
            assertFalse(scoped.uiState.value.isLoading)
        }

    @Test
    fun `changing the month of a single group keeps sending its id`() =
        runTest {
            coEvery { analyticsRepository.getAttendance(any(), any(), any(), any()) } returns emptyAttendance
            val scoped = LifeGroupAnalyticsViewModel(7, analyticsRepository)
            testScheduler.advanceUntilIdle()

            scoped.onMonthSelected(3)
            testScheduler.advanceUntilIdle()

            coVerify { analyticsRepository.getAttendance(any(), 3, 7, "meeting") }
        }

    @Test
    fun `the group summary adds up the loaded attendance rows`() =
        runTest {
            val rows =
                listOf(
                    LifeGroupAttendancePoint("2026-09", meetingsCount = 2, presentCount = 9, membersCount = 12, attendanceRate = 0.75),
                    LifeGroupAttendancePoint("2026-10", meetingsCount = 1, presentCount = 6, membersCount = 12, attendanceRate = 0.5),
                )
            coEvery { analyticsRepository.getAttendance(any(), any(), any(), any()) } returns
                emptyAttendance.copy(rows = rows)
            val scoped = LifeGroupAnalyticsViewModel(7, analyticsRepository)
            testScheduler.advanceUntilIdle()

            val summary = scoped.uiState.value.attendanceSummary
            assertEquals(3, summary.meetingsCount)
            assertEquals(15, summary.presentCount)
            assertEquals(63, summary.attendancePercent)
        }
}
