package br.church.paz.android.ui.features.onboarding

import br.church.paz.android.util.MainDispatcherRule
import br.church.paz.shared.domain.model.CepLookupOutcome
import br.church.paz.shared.domain.model.OnboardingStep
import br.church.paz.shared.domain.repository.OnboardingRepository
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Rule
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

private class FakeOnboardingRepository(
    private val missing: List<OnboardingStep>,
) : OnboardingRepository {
    var lastLookupCep: String? = null
    var cepOutcome: CepLookupOutcome = CepLookupOutcome.NotFound
    var submitResult: Result<Unit> = Result.success(Unit)

    override suspend fun missingSteps(): List<OnboardingStep> = missing

    override suspend fun lookupCep(cep: String): CepLookupOutcome {
        lastLookupCep = cep
        return cepOutcome
    }

    override suspend fun submitBirthday(birthDate: String): Result<Unit> = submitResult

    override suspend fun submitWhatsapp(phone: String): Result<Unit> = submitResult

    override suspend fun submitAddress(
        street: String,
        number: String,
        complement: String?,
        neighborhood: String,
        city: String,
        state: String,
        zipCode: String,
    ): Result<Unit> = submitResult
}

class OnboardingViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `starts on video then advances to first missing step`() =
        runTest {
            val repository =
                FakeOnboardingRepository(
                    missing = listOf(OnboardingStep.Whatsapp, OnboardingStep.Address),
                )
            val viewModel = OnboardingViewModel(repository)
            advanceUntilIdle()

            assertEquals(OnboardingStep.Video, viewModel.uiState.value.currentStep)

            viewModel.onVideoFinished()

            assertEquals(OnboardingStep.Whatsapp, viewModel.uiState.value.currentStep)
        }

    @Test
    fun `skipping a step advances to the next one`() =
        runTest {
            val repository =
                FakeOnboardingRepository(
                    missing = listOf(OnboardingStep.Whatsapp, OnboardingStep.Address),
                )
            val viewModel = OnboardingViewModel(repository)
            advanceUntilIdle()
            viewModel.onVideoFinished()

            viewModel.onSkipCurrentStep()

            assertEquals(OnboardingStep.Address, viewModel.uiState.value.currentStep)
        }

    @Test
    fun `finishing the last step marks onboarding finished`() =
        runTest {
            val repository = FakeOnboardingRepository(missing = listOf(OnboardingStep.Whatsapp))
            val viewModel = OnboardingViewModel(repository)
            advanceUntilIdle()
            viewModel.onVideoFinished()

            viewModel.onSkipCurrentStep()
            advanceUntilIdle()

            assertTrue(viewModel.uiState.value.isFinished)
        }

    @Test
    fun `submit failure surfaces an error and does not advance`() =
        runTest {
            val repository = FakeOnboardingRepository(missing = listOf(OnboardingStep.Whatsapp))
            repository.submitResult = Result.failure(RuntimeException("boom"))
            val viewModel = OnboardingViewModel(repository)
            advanceUntilIdle()
            viewModel.onVideoFinished()

            viewModel.onWhatsappSubmitted("11999999999")
            advanceUntilIdle()

            assertEquals("boom", viewModel.uiState.value.errorMessage)
            assertEquals(OnboardingStep.Whatsapp, viewModel.uiState.value.currentStep)
            assertFalse(viewModel.uiState.value.isFinished)
        }

    @Test
    fun `cep lookup stores the outcome`() =
        runTest {
            val repository = FakeOnboardingRepository(missing = listOf(OnboardingStep.Address))
            repository.cepOutcome = CepLookupOutcome.NotFound
            val viewModel = OnboardingViewModel(repository)
            advanceUntilIdle()
            viewModel.onVideoFinished()

            viewModel.onLookupCep("00000000")
            advanceUntilIdle()

            assertEquals("00000000", repository.lastLookupCep)
            assertEquals(CepLookupOutcome.NotFound, viewModel.uiState.value.cepResult)
        }
}
