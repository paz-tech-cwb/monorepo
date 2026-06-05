package br.church.paz.android.ui.features.splash

import app.cash.turbine.test
import br.church.paz.android.util.MainDispatcherRule
import br.church.paz.shared.domain.model.User
import br.church.paz.shared.domain.model.UserRole
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

    private val fakeUser =
        User(
            id = "u1",
            name = "João",
            email = "joao@paz.church",
            role = UserRole.member,
        )

    @Test
    fun `navigates to home when user is already logged in`() =
        runTest {
            coEvery { authRepository.currentUser() } returns fakeUser
            val viewModel = SplashViewModel(authRepository)

            viewModel.effect.test {
                assertEquals(SplashEffect.NavigateToHome, awaitItem())
                cancelAndIgnoreRemainingEvents()
            }
        }

    @Test
    fun `navigates to login when no user session`() =
        runTest {
            coEvery { authRepository.currentUser() } returns null
            val viewModel = SplashViewModel(authRepository)

            viewModel.effect.test {
                assertEquals(SplashEffect.NavigateToLogin, awaitItem())
                cancelAndIgnoreRemainingEvents()
            }
        }
}
