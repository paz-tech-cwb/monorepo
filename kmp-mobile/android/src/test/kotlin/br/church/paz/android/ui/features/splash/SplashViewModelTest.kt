package br.church.paz.android.ui.features.splash

import app.cash.turbine.test
import br.church.paz.android.util.MainDispatcherRule
import br.church.paz.shared.auth.TokenPair
import br.church.paz.shared.domain.model.OnboardingStep
import br.church.paz.shared.domain.repository.AuthRepository
import br.church.paz.shared.domain.repository.OnboardingRepository
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.Rule
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class SplashViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val authRepository = mockk<AuthRepository>()
    private val onboardingRepository = mockk<OnboardingRepository>()

    private val fakeTokens = TokenPair(access = "access", refresh = "refresh", provider = "google")

    @Test
    fun `navigates to home when stored tokens exist and nothing is missing`() =
        runTest {
            coEvery { authRepository.storedTokens() } returns fakeTokens
            coEvery { onboardingRepository.missingSteps() } returns emptyList()
            val viewModel = SplashViewModel(authRepository, onboardingRepository)

            viewModel.effect.test {
                assertEquals(SplashEffect.NavigateToHome, awaitItem())
                cancelAndIgnoreRemainingEvents()
            }
        }

    @Test
    fun `shows onboarding on restore when a step is still missing`() =
        runTest {
            coEvery { authRepository.storedTokens() } returns fakeTokens
            coEvery { onboardingRepository.missingSteps() } returns listOf(OnboardingStep.Whatsapp)
            val viewModel = SplashViewModel(authRepository, onboardingRepository)

            // Allow the session-restore coroutine (launched from init) to run to completion
            // before asserting state, since there is no effect emitted on this path.
            testScheduler.advanceUntilIdle()

            assertTrue(viewModel.uiState.value.showOnboarding)
        }

    @Test
    fun `navigates to home when no tokens and no Firebase user`() =
        runTest {
            // No stored tokens, no Firebase user in unit test env — always go to shell.
            // AccountScreen handles auth gating for the Account tab.
            coEvery { authRepository.storedTokens() } returns null
            val viewModel = SplashViewModel(authRepository, onboardingRepository)

            viewModel.effect.test {
                assertEquals(SplashEffect.NavigateToHome, awaitItem())
                cancelAndIgnoreRemainingEvents()
            }
        }
}
