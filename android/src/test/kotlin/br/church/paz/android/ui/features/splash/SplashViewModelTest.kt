package br.church.paz.android.ui.features.splash

import app.cash.turbine.test
import br.church.paz.android.util.MainDispatcherRule
import br.church.paz.shared.auth.TokenPair
import br.church.paz.shared.domain.repository.AuthRepository
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.Rule
import org.junit.Test
import kotlin.test.assertEquals

class SplashViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val authRepository = mockk<AuthRepository>()

    private val fakeTokens = TokenPair(access = "access", refresh = "refresh", provider = "google")

    @Test
    fun `navigates to home when stored tokens exist`() =
        runTest {
            coEvery { authRepository.storedTokens() } returns fakeTokens
            val viewModel = SplashViewModel(authRepository)

            viewModel.effect.test {
                assertEquals(SplashEffect.NavigateToHome, awaitItem())
                cancelAndIgnoreRemainingEvents()
            }
        }

    @Test
    fun `navigates to login when no tokens and no Firebase user`() =
        runTest {
            // No stored tokens — Firebase has no current user in unit test env
            coEvery { authRepository.storedTokens() } returns null
            val viewModel = SplashViewModel(authRepository)

            viewModel.effect.test {
                assertEquals(SplashEffect.NavigateToLogin, awaitItem())
                cancelAndIgnoreRemainingEvents()
            }
        }
}
