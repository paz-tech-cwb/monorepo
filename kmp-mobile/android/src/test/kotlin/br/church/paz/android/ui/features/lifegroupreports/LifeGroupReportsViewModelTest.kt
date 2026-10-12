package br.church.paz.android.ui.features.lifegroupreports

import app.cash.turbine.test
import br.church.paz.android.util.MainDispatcherRule
import br.church.paz.shared.auth.TokenStorage
import br.church.paz.shared.data.remote.createPazHttpClient
import br.church.paz.shared.data.remote.throwOnClientOrServerError
import br.church.paz.shared.domain.model.LifeGroupWeeklyReport
import br.church.paz.shared.domain.repository.LifeGroupReportRepository
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respondError
import io.ktor.client.plugins.ClientRequestException
import io.ktor.client.request.get
import io.ktor.http.HttpStatusCode
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

class LifeGroupReportsViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val repository = mockk<LifeGroupReportRepository>()

    private fun report(
        id: String,
        date: String,
    ) = LifeGroupWeeklyReport(
        id = id,
        date = date,
        lifeGroupId = 7,
        committedMembers = 10,
        committedMembersPresent = 8,
        kids0To11 = 2,
        guests = 1,
        mdas = 0,
        offering = "150.50",
        committedAtTadel = 3,
        committedAtCulto = 4,
        leaderAttended = listOf("tadel"),
        disciplesCount = 5,
        disciplesDiscipledThisWeek = 2,
        pastoringActivityType = listOf("visita"),
        pastoringActivityOther = null,
        trainingActivityType = emptyList(),
        trainingActivityOther = "Curso",
        submittedByName = "Ana",
        createdAt = null,
    )

    // A REAL Ktor ClientRequestException so `httpStatusCodeOrNull()` recognizes the status.
    private suspend fun clientException(status: HttpStatusCode): ClientRequestException {
        val engine = MockEngine { respondError(status) }
        val client = createPazHttpClient(mockk<TokenStorage>(relaxed = true), "http://test", engine)
        val response = client.get("/x")
        return try {
            response.throwOnClientOrServerError()
            error("expected a ClientRequestException")
        } catch (e: ClientRequestException) {
            e
        }
    }

    @Test
    fun `loads reports newest first`() =
        runTest {
            coEvery { repository.getReports(7) } returns
                listOf(report("a", "2026-09-24"), report("c", "2026-10-08"), report("b", "2026-10-01"))

            val viewModel = LifeGroupReportsViewModel(7, repository)
            testScheduler.advanceUntilIdle()

            val state = viewModel.uiState.value
            assertFalse(state.isLoading)
            assertEquals(listOf("c", "b", "a"), state.reports.map { it.id })
            assertNull(state.error)
            assertFalse(state.noAccess)
        }

    @Test
    fun `empty list is not an error`() =
        runTest {
            coEvery { repository.getReports(7) } returns emptyList()

            val viewModel = LifeGroupReportsViewModel(7, repository)
            testScheduler.advanceUntilIdle()

            assertTrue(viewModel.uiState.value.reports.isEmpty())
            assertNull(viewModel.uiState.value.error)
            assertFalse(viewModel.uiState.value.isLoading)
        }

    @Test
    fun `403 maps to no access without an error message`() =
        runTest {
            coEvery { repository.getReports(7) } throws clientException(HttpStatusCode.Forbidden)

            val viewModel = LifeGroupReportsViewModel(7, repository)
            testScheduler.advanceUntilIdle()

            assertTrue(viewModel.uiState.value.noAccess)
            assertNull(viewModel.uiState.value.error)
            assertFalse(viewModel.uiState.value.isLoading)
        }

    @Test
    fun `other failures surface an error`() =
        runTest {
            coEvery { repository.getReports(7) } throws RuntimeException("boom")

            val viewModel = LifeGroupReportsViewModel(7, repository)
            testScheduler.advanceUntilIdle()

            assertEquals("boom", viewModel.uiState.value.error)
            assertFalse(viewModel.uiState.value.noAccess)
        }

    @Test
    fun `refresh keeps content and clears a previous error`() =
        runTest {
            coEvery { repository.getReports(7) } throws RuntimeException("boom")
            val viewModel = LifeGroupReportsViewModel(7, repository)
            testScheduler.advanceUntilIdle()
            assertNotNull(viewModel.uiState.value.error)

            coEvery { repository.getReports(7) } returns listOf(report("a", "2026-10-08"))
            viewModel.refresh()
            testScheduler.advanceUntilIdle()

            assertNull(viewModel.uiState.value.error)
            assertFalse(viewModel.uiState.value.isRefreshing)
            assertEquals(listOf("a"), viewModel.uiState.value.reports.map { it.id })
        }

    @Test
    fun `failed refresh keeps the loaded list and emits a transient error`() =
        runTest {
            coEvery { repository.getReports(7) } returns listOf(report("a", "2026-10-08"))
            val viewModel = LifeGroupReportsViewModel(7, repository)
            testScheduler.advanceUntilIdle()

            coEvery { repository.getReports(7) } throws RuntimeException("boom")
            viewModel.effect.test {
                viewModel.refresh()
                testScheduler.advanceUntilIdle()

                assertEquals(LifeGroupReportsEffect.ShowError("boom"), awaitItem())
                cancelAndIgnoreRemainingEvents()
            }
            assertNull(viewModel.uiState.value.error)
            assertFalse(viewModel.uiState.value.isRefreshing)
            assertEquals(listOf("a"), viewModel.uiState.value.reports.map { it.id })
        }

    @Test
    fun `tapping a report emits navigation to its detail`() =
        runTest {
            coEvery { repository.getReports(7) } returns listOf(report("a", "2026-10-08"))
            val viewModel = LifeGroupReportsViewModel(7, repository)
            testScheduler.advanceUntilIdle()

            viewModel.effect.test {
                viewModel.onReportTapped("a")
                assertEquals(LifeGroupReportsEffect.NavigateToDetail("a"), awaitItem())
                cancelAndIgnoreRemainingEvents()
            }
        }

    @Test
    fun `detail loads the report`() =
        runTest {
            coEvery { repository.getReport("a") } returns report("a", "2026-10-08")

            val viewModel = LifeGroupReportDetailViewModel("a", repository)
            testScheduler.advanceUntilIdle()

            assertEquals("a", viewModel.uiState.value.report?.id)
            assertFalse(viewModel.uiState.value.isLoading)
        }

    @Test
    fun `detail maps 404 and 403 to no access`() =
        runTest {
            coEvery { repository.getReport("gone") } throws clientException(HttpStatusCode.NotFound)
            coEvery { repository.getReport("denied") } throws clientException(HttpStatusCode.Forbidden)

            val notFound = LifeGroupReportDetailViewModel("gone", repository)
            val denied = LifeGroupReportDetailViewModel("denied", repository)
            testScheduler.advanceUntilIdle()

            assertTrue(notFound.uiState.value.noAccess)
            assertTrue(denied.uiState.value.noAccess)
            assertNull(notFound.uiState.value.error)
        }

    @Test
    fun `detail surfaces other failures as an error`() =
        runTest {
            coEvery { repository.getReport("a") } throws RuntimeException("boom")

            val viewModel = LifeGroupReportDetailViewModel("a", repository)
            testScheduler.advanceUntilIdle()

            assertEquals("boom", viewModel.uiState.value.error)
            assertFalse(viewModel.uiState.value.noAccess)
        }

    @Test
    fun `formatters render offering and activities`() {
        assertEquals("R$ 150,50", formatOffering("150.50"))
        assertEquals("—", activitySummary(emptyList(), null))
        assertEquals("visita, Outra", activitySummary(listOf("visita"), "Outra"))
        assertEquals("Outra", activitySummary(emptyList(), "Outra"))
    }
}
