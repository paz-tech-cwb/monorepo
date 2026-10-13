package br.church.paz.android.ui.features.formularios

import br.church.paz.android.util.MainDispatcherRule
import br.church.paz.shared.domain.model.FormCatalogItem
import br.church.paz.shared.domain.repository.FormsRepository
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

class FormulariosViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val formsRepository = mockk<FormsRepository>()

    private fun item(slug: String, canRead: Boolean) =
        FormCatalogItem(id = slug, title = slug, canWrite = true, canRead = canRead)

    private suspend fun tap(slug: String, canRead: Boolean): FormulariosEffect {
        coEvery { formsRepository.getCatalog() } returns listOf(item(slug, canRead))
        val viewModel = FormulariosViewModel(formsRepository)
        mainDispatcherRule.testDispatcher.scheduler.advanceUntilIdle()
        viewModel.onFormTap(slug)
        mainDispatcherRule.testDispatcher.scheduler.advanceUntilIdle()
        return viewModel.effect.first()
    }

    @Test
    fun `life group report goes to the submit screen even when the actor can read`() =
        runTest {
            assertEquals(
                FormulariosEffect.NavigateToLifeGroupReportSubmit,
                tap("life-group-reports", canRead = true),
            )
        }

    @Test
    fun `life group report goes to the submit screen when the actor cannot read`() =
        runTest {
            assertEquals(
                FormulariosEffect.NavigateToLifeGroupReportSubmit,
                tap("life-group-reports", canRead = false),
            )
        }

    @Test
    fun `other readable forms still open the submissions list`() =
        runTest {
            assertEquals(
                FormulariosEffect.NavigateToSubmissionsList("service-reports"),
                tap("service-reports", canRead = true),
            )
        }
}
