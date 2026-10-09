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
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Rule
import org.junit.Test

class FormDetailViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val formsRepository = mockk<FormsRepository>()
    private val authRepository = mockk<AuthRepository>()

    @Test
    fun `member-only ministry member (global role member, canRead false) can submit service-reports`() =
        runTest {
            val catalog =
                listOf(
                    FormCatalogItem(
                        id = "service-reports",
                        title = "Relatório do Culto",
                        description = null,
                        canWrite = true,
                        canRead = false,
                    ),
                )
            coEvery { formsRepository.getCatalog() } returns catalog
            coEvery { authRepository.currentUser() } returns User(id = "10", name = "Maria", email = "maria@test.com")
            coEvery { formsRepository.submitServiceReport(any()) } returns Unit

            val viewModel = FormDetailViewModel("service-reports", formsRepository, authRepository)
            testScheduler.advanceUntilIdle()

            viewModel.onFieldChanged("date", "14/06/2026")
            viewModel.onFieldChanged("report_type", "culto_celebracao")
            viewModel.onFieldChanged("period", "manha")
            viewModel.onFieldChanged("atmosphere_responsible", "Maria")
            viewModel.onFieldChanged("tadel_adults", "10")
            viewModel.onFieldChanged("vehicles_cars", "2")
            viewModel.onSubmit()
            testScheduler.advanceUntilIdle()

            coVerify { formsRepository.submitServiceReport(any<ServiceReportForm>()) }
            assertNull(viewModel.uiState.value.error)
        }

    @Test
    fun `required SELECT field with empty value blocks submit`() =
        runTest {
            val catalog =
                listOf(
                    FormCatalogItem(id = "service-reports", title = "Rel. Culto", canWrite = true, canRead = false),
                )
            coEvery { formsRepository.getCatalog() } returns catalog
            coEvery { authRepository.currentUser() } returns User(id = "10", name = "Maria", email = "m@t.com")

            val viewModel = FormDetailViewModel("service-reports", formsRepository, authRepository)
            testScheduler.advanceUntilIdle()

            // Clear the auto-filled report_type to simulate empty required SELECT
            viewModel.onFieldChanged("report_type", "")
            viewModel.onSubmit()
            testScheduler.advanceUntilIdle()

            assertEquals("Tipo de relatório é obrigatório", viewModel.uiState.value.error)
        }

    @Test
    fun `isDirty is false immediately after loadForm, including seeded DATE and SELECT fields`() =
        runTest {
            val catalog = listOf(
                FormCatalogItem(id = "service-reports", title = "Rel. Culto", canWrite = true, canRead = false),
            )
            coEvery { formsRepository.getCatalog() } returns catalog
            coEvery { authRepository.currentUser() } returns User(id = "10", name = "Maria", email = "m@t.com")

            val viewModel = FormDetailViewModel("service-reports", formsRepository, authRepository)
            testScheduler.advanceUntilIdle()

            // "date" (DATE, seeded to today) and "report_type"/"period" (SELECT, seeded to
            // options[0]/optionValues[0]) are all pre-filled by loadForm — none of that seeding
            // should register as a user edit.
            assertEquals(false, viewModel.uiState.value.isDirty)
        }

    @Test
    fun `isDirty becomes true after a field edit`() =
        runTest {
            val catalog = listOf(
                FormCatalogItem(id = "service-reports", title = "Rel. Culto", canWrite = true, canRead = false),
            )
            coEvery { formsRepository.getCatalog() } returns catalog
            coEvery { authRepository.currentUser() } returns User(id = "10", name = "Maria", email = "m@t.com")

            val viewModel = FormDetailViewModel("service-reports", formsRepository, authRepository)
            testScheduler.advanceUntilIdle()

            viewModel.onFieldChanged("atmosphere_responsible", "Maria")

            assertEquals(true, viewModel.uiState.value.isDirty)
        }

    @Test
    fun `isDirty becomes true after addGuestEntry`() =
        runTest {
            val catalog = listOf(
                FormCatalogItem(id = "casa-de-paz-reports", title = "Rel. Casa de Paz", canWrite = true, canRead = false),
            )
            coEvery { formsRepository.getCatalog() } returns catalog
            coEvery { authRepository.currentUser() } returns User(id = "10", name = "Maria", email = "m@t.com")

            val viewModel = FormDetailViewModel("casa-de-paz-reports", formsRepository, authRepository)
            testScheduler.advanceUntilIdle()

            viewModel.addGuestEntry()

            assertEquals(true, viewModel.uiState.value.isDirty)
        }

    @Test
    fun `onRequestDiscard emits NavigateBack when not dirty`() =
        runTest {
            val catalog = listOf(
                FormCatalogItem(id = "service-reports", title = "Rel. Culto", canWrite = true, canRead = false),
            )
            coEvery { formsRepository.getCatalog() } returns catalog
            coEvery { authRepository.currentUser() } returns User(id = "10", name = "Maria", email = "m@t.com")

            val viewModel = FormDetailViewModel("service-reports", formsRepository, authRepository)
            testScheduler.advanceUntilIdle()

            viewModel.onRequestDiscard()
            val effect = viewModel.effect.first()

            assertEquals(FormDetailEffect.NavigateBack, effect)
        }

    @Test
    fun `onRequestDiscard emits RequestDiscardConfirmation when dirty`() =
        runTest {
            val catalog = listOf(
                FormCatalogItem(id = "service-reports", title = "Rel. Culto", canWrite = true, canRead = false),
            )
            coEvery { formsRepository.getCatalog() } returns catalog
            coEvery { authRepository.currentUser() } returns User(id = "10", name = "Maria", email = "m@t.com")

            val viewModel = FormDetailViewModel("service-reports", formsRepository, authRepository)
            testScheduler.advanceUntilIdle()

            viewModel.onFieldChanged("atmosphere_responsible", "Maria")
            viewModel.onRequestDiscard()
            val effect = viewModel.effect.first()

            assertEquals(FormDetailEffect.RequestDiscardConfirmation, effect)
        }
}
