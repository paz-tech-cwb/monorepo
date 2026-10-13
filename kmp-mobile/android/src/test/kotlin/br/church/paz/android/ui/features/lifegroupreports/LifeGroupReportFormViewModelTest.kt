package br.church.paz.android.ui.features.lifegroupreports

import br.church.paz.android.util.MainDispatcherRule
import br.church.paz.shared.auth.TokenStorage
import br.church.paz.shared.data.remote.createPazHttpClient
import br.church.paz.shared.data.remote.throwOnClientOrServerError
import br.church.paz.shared.domain.model.LifeGroup
import br.church.paz.shared.domain.model.LifeGroupReportField
import br.church.paz.shared.domain.model.LifeGroupReportForm
import br.church.paz.shared.domain.repository.ChurchRepository
import br.church.paz.shared.domain.repository.FormsRepository
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respondError
import io.ktor.client.plugins.ClientRequestException
import io.ktor.client.request.get
import io.ktor.http.HttpStatusCode
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import io.mockk.slot
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class LifeGroupReportFormViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val formsRepository = mockk<FormsRepository>()
    private val churchRepository = mockk<ChurchRepository>()

    // 2026-10-12T02:30:00Z == 2026-10-11 23:30 in America/Sao_Paulo.
    private val clock: () -> Long = { 1_791_772_200_000L }

    private fun group(
        id: Int,
        relationship: String?,
        supervised: Boolean = false,
    ) = LifeGroup(id = id, name = "Grupo $id", relationship = relationship, isSupervised = supervised)

    private fun viewModel(preselected: Int? = null) =
        LifeGroupReportFormViewModel(preselected, formsRepository, churchRepository, clock)

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

    private fun LifeGroupReportFormViewModel.fillValidForm() {
        onFieldChanged(LifeGroupReportField.COMMITTED_MEMBERS, "10")
        onFieldChanged(LifeGroupReportField.COMMITTED_MEMBERS_PRESENT, "8")
        onFieldChanged(LifeGroupReportField.OFFERING, "150,5")
        onFieldChanged(LifeGroupReportField.LEADER_ATTENDED, "Tadel, Culto")
    }

    @Test
    fun `single led group is preselected and date defaults to today in Sao Paulo`() =
        runTest {
            coEvery { churchRepository.getMyLifeGroups() } returns
                listOf(group(7, "leader"), group(8, "supervisor", supervised = true), group(9, "member"))

            val vm = viewModel()
            testScheduler.advanceUntilIdle()

            val state = vm.uiState.value
            assertFalse(state.isLoading)
            assertEquals(listOf(7), state.groups.map { it.id })
            assertFalse(state.canChooseGroup)
            assertEquals(7, state.draft.lifeGroupId)
            assertEquals("2026-10-11", state.draft.date)
            assertEquals("2026-10-11", state.today)
            assertNull(state.noGroupsMessage)
        }

    @Test
    fun `several groups require a choice unless opened from one of them`() =
        runTest {
            coEvery { churchRepository.getMyLifeGroups() } returns
                listOf(group(7, "leader"), group(8, "co_leader"), group(9, "supervisor"))

            val none = viewModel()
            testScheduler.advanceUntilIdle()
            assertTrue(none.uiState.value.canChooseGroup)
            assertNull(none.uiState.value.draft.lifeGroupId)

            val fromDetail = viewModel(preselected = 8)
            testScheduler.advanceUntilIdle()
            assertEquals(8, fromDetail.uiState.value.draft.lifeGroupId)

            // A supervised-only group id is ignored: the viewer cannot report for it.
            val notAllowed = viewModel(preselected = 9)
            testScheduler.advanceUntilIdle()
            assertNull(notAllowed.uiState.value.draft.lifeGroupId)
        }

    @Test
    fun `supervisor only sees a read-only explanation instead of the form`() =
        runTest {
            coEvery { churchRepository.getMyLifeGroups() } returns
                listOf(group(8, "supervisor", supervised = true))

            val vm = viewModel()
            testScheduler.advanceUntilIdle()

            assertTrue(vm.uiState.value.groups.isEmpty())
            assertTrue(vm.uiState.value.noGroupsMessage!!.contains("consultar"))
        }

    @Test
    fun `load failure is retryable`() =
        runTest {
            coEvery { churchRepository.getMyLifeGroups() } throws RuntimeException("offline")
            val vm = viewModel()
            testScheduler.advanceUntilIdle()
            assertEquals("offline", vm.uiState.value.loadError)

            coEvery { churchRepository.getMyLifeGroups() } returns listOf(group(7, "leader"))
            vm.load()
            testScheduler.advanceUntilIdle()
            assertNull(vm.uiState.value.loadError)
            assertEquals(7, vm.uiState.value.draft.lifeGroupId)
        }

    @Test
    fun `invalid submit shows field errors and does not call the backend`() =
        runTest {
            coEvery { churchRepository.getMyLifeGroups() } returns listOf(group(7, "leader"), group(8, "leader"))
            val vm = viewModel()
            testScheduler.advanceUntilIdle()

            vm.onFieldChanged(LifeGroupReportField.GUESTS, "-1")
            vm.onSubmit()
            testScheduler.advanceUntilIdle()

            val errors = vm.uiState.value.fieldErrors
            assertNotNull(errors[LifeGroupReportField.LIFE_GROUP])
            assertNotNull(errors[LifeGroupReportField.GUESTS])
            assertFalse(vm.uiState.value.isSubmitted)
            coVerify(exactly = 0) { formsRepository.submitLifeGroupReport(any()) }

            // Errors clear live as the user fixes the fields.
            vm.onGroupSelected(8)
            vm.onFieldChanged(LifeGroupReportField.GUESTS, "2")
            assertTrue(vm.uiState.value.fieldErrors.isEmpty())
        }

    @Test
    fun `future date is rejected`() =
        runTest {
            coEvery { churchRepository.getMyLifeGroups() } returns listOf(group(7, "leader"))
            val vm = viewModel()
            testScheduler.advanceUntilIdle()

            vm.onDateChanged("2026-10-12") // Sao Paulo today is 2026-10-11
            vm.onSubmit()

            assertEquals("A data não pode ser futura.", vm.uiState.value.fieldErrors[LifeGroupReportField.DATE])
            coVerify(exactly = 0) { formsRepository.submitLifeGroupReport(any()) }
        }

    @Test
    fun `valid submit posts the DTO payload and shows the confirmation`() =
        runTest {
            coEvery { churchRepository.getMyLifeGroups() } returns listOf(group(7, "leader"))
            val captured = slot<LifeGroupReportForm>()
            coEvery { formsRepository.submitLifeGroupReport(capture(captured)) } returns Unit
            val vm = viewModel()
            testScheduler.advanceUntilIdle()
            vm.fillValidForm()

            vm.onSubmit()
            testScheduler.advanceUntilIdle()

            val form = captured.captured
            assertEquals(7, form.lifeGroupId)
            assertEquals("2026-10-11", form.date)
            assertEquals(10, form.committedMembers)
            assertEquals(8, form.committedMembersPresent)
            assertEquals("150.50", form.offering)
            assertEquals(listOf("Tadel", "Culto"), form.leaderAttended)
            assertEquals(0, form.guests)
            assertTrue(vm.uiState.value.isSubmitted)
            assertFalse(vm.uiState.value.isSubmitting)
        }

    @Test
    fun `server errors map to friendly messages`() =
        runTest {
            coEvery { churchRepository.getMyLifeGroups() } returns listOf(group(7, "leader"))
            val expected =
                mapOf(
                    HttpStatusCode.BadRequest to "Confira",
                    HttpStatusCode.Forbidden to "permissão",
                    HttpStatusCode.Conflict to "Já existe",
                    HttpStatusCode.UnprocessableEntity to "setor",
                )
            for ((status, fragment) in expected) {
                coEvery { formsRepository.submitLifeGroupReport(any()) } throws clientException(status)
                val vm = viewModel()
                testScheduler.advanceUntilIdle()
                vm.fillValidForm()

                vm.onSubmit()
                testScheduler.advanceUntilIdle()

                val message = vm.uiState.value.submitError
                assertTrue("$status -> $message", message != null && message.contains(fragment))
                assertFalse(vm.uiState.value.isSubmitted)
                assertFalse(vm.uiState.value.isSubmitting)
            }
        }
}
