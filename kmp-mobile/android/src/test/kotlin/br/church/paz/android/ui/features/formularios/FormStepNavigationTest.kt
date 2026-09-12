package br.church.paz.android.ui.features.formularios

import br.church.paz.android.util.MainDispatcherRule
import br.church.paz.shared.domain.model.FormCatalogItem
import br.church.paz.shared.domain.model.ServiceReportForm
import br.church.paz.shared.domain.model.User
import br.church.paz.shared.domain.repository.AuthRepository
import br.church.paz.shared.domain.repository.FormsRepository
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class FormStepNavigationTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val formsRepository = mockk<FormsRepository>()
    private val authRepository = mockk<AuthRepository>()

    private fun serviceReportCatalog() =
        listOf(
            FormCatalogItem(
                id = "service-reports",
                title = "Relatório do Culto",
                description = null,
                canWrite = true,
                canRead = false,
            ),
        )

    @Test
    fun `blank required field blocks onNextStep and sets stepError`() =
        runTest {
            coEvery { formsRepository.getCatalog() } returns serviceReportCatalog()
            coEvery { authRepository.currentUser() } returns User(id = "10", name = "Maria", email = "m@t.com")

            val viewModel = FormDetailViewModel("service-reports", formsRepository, authRepository)
            testScheduler.advanceUntilIdle()

            // Step 0 is "date" (auto-filled with today, required) — clear it to simulate blank input.
            viewModel.onFieldChanged("date", "")
            viewModel.onNextStep()

            assertEquals(0, viewModel.uiState.value.stepIndex)
            assertEquals("Data é obrigatório", viewModel.uiState.value.stepError)
        }

    @Test
    fun `blank optional field advances`() =
        runTest {
            coEvery { formsRepository.getCatalog() } returns serviceReportCatalog()
            coEvery { authRepository.currentUser() } returns User(id = "10", name = "Maria", email = "m@t.com")

            val viewModel = FormDetailViewModel("service-reports", formsRepository, authRepository)
            testScheduler.advanceUntilIdle()

            // "atmosphere_team_id" (index 3) is optional — leaving it blank should still advance.
            viewModel.onFieldChanged("date", "14/06/2026")
            viewModel.onNextStep() // date -> report_type
            viewModel.onFieldChanged("report_type", "culto_celebracao")
            viewModel.onNextStep() // report_type -> period
            viewModel.onFieldChanged("period", "manha")
            viewModel.onNextStep() // period -> atmosphere_team_id (optional)
            assertEquals(3, viewModel.uiState.value.stepIndex)

            viewModel.onNextStep() // optional atmosphere_team_id -> atmosphere_responsible
            assertEquals(4, viewModel.uiState.value.stepIndex)
            assertNull(viewModel.uiState.value.stepError)
        }

    @Test
    fun `onNextStep does not overflow past the last index`() =
        runTest {
            coEvery { formsRepository.getCatalog() } returns serviceReportCatalog()
            coEvery { authRepository.currentUser() } returns User(id = "10", name = "Maria", email = "m@t.com")

            val viewModel = FormDetailViewModel("service-reports", formsRepository, authRepository)
            testScheduler.advanceUntilIdle()

            val fieldDefs = viewModel.uiState.value.form!!.type.fieldDefs()
            val lastIndex = fieldDefs.size - 1

            // Fill every required field and advance repeatedly past the end.
            fieldDefs.forEach { def -> if (def.required) viewModel.onFieldChanged(def.key, "x") }
            repeat(fieldDefs.size + 5) { viewModel.onNextStep() }

            assertEquals(lastIndex, viewModel.uiState.value.stepIndex)
        }

    @Test
    fun `onPreviousStep floors at 0`() =
        runTest {
            coEvery { formsRepository.getCatalog() } returns serviceReportCatalog()
            coEvery { authRepository.currentUser() } returns User(id = "10", name = "Maria", email = "m@t.com")

            val viewModel = FormDetailViewModel("service-reports", formsRepository, authRepository)
            testScheduler.advanceUntilIdle()

            repeat(3) { viewModel.onPreviousStep() }

            assertEquals(0, viewModel.uiState.value.stepIndex)
        }

    @Test
    fun `onFieldChanged clears stepError`() =
        runTest {
            coEvery { formsRepository.getCatalog() } returns serviceReportCatalog()
            coEvery { authRepository.currentUser() } returns User(id = "10", name = "Maria", email = "m@t.com")

            val viewModel = FormDetailViewModel("service-reports", formsRepository, authRepository)
            testScheduler.advanceUntilIdle()

            viewModel.onFieldChanged("date", "")
            viewModel.onNextStep()
            assertTrue(viewModel.uiState.value.stepError != null)

            viewModel.onFieldChanged("date", "14/06/2026")
            assertNull(viewModel.uiState.value.stepError)
        }

    @Test
    fun `answers accumulated across steps produce the same submission payload as before`() =
        runTest {
            coEvery { formsRepository.getCatalog() } returns serviceReportCatalog()
            coEvery { authRepository.currentUser() } returns User(id = "10", name = "Maria", email = "maria@test.com")
            coEvery { formsRepository.submitServiceReport(any()) } returns Unit

            val viewModel = FormDetailViewModel("service-reports", formsRepository, authRepository)
            testScheduler.advanceUntilIdle()

            // Simulate walking through the step screen one field at a time.
            viewModel.onFieldChanged("date", "14/06/2026")
            viewModel.onNextStep()
            viewModel.onFieldChanged("report_type", "culto_celebracao")
            viewModel.onNextStep()
            viewModel.onFieldChanged("period", "manha")
            viewModel.onNextStep()
            viewModel.onNextStep() // skip optional atmosphere_team_id
            viewModel.onFieldChanged("atmosphere_responsible", "Maria")
            viewModel.onNextStep()
            viewModel.onFieldChanged("tadel_adults", "10")
            viewModel.onNextStep()
            viewModel.onNextStep() // skip optional tadel_kids
            viewModel.onFieldChanged("vehicles_cars", "2")

            viewModel.onSubmit()
            testScheduler.advanceUntilIdle()

            coVerify {
                formsRepository.submitServiceReport(
                    ServiceReportForm(
                        date = "14/06/2026",
                        reportType = "culto_celebracao",
                        period = "manha",
                        atmosphereTeamId = null,
                        atmosphereResponsible = "Maria",
                        tadelAdults = 10,
                        tadelKids = 0,
                        vehiclesCars = 2,
                        vehiclesMotos = 0,
                        vehiclesBikes = 0,
                        vehiclesOthers = "",
                        volunteersAtmosfera = 0,
                        volunteersLouvor = 0,
                        volunteersMiddia = 0,
                        volunteersDanca = 0,
                        notes = "",
                    ),
                )
            }
            assertNull(viewModel.uiState.value.error)
        }
}
