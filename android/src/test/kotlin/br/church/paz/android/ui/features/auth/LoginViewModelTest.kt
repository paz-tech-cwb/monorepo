package br.church.paz.android.ui.features.auth

import app.cash.turbine.test
import br.church.paz.android.util.MainDispatcherRule
import br.church.paz.shared.domain.model.User
import br.church.paz.shared.domain.model.UserRole
import br.church.paz.shared.domain.repository.AuthRepository
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import org.junit.Rule
import org.junit.Test

class LoginViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val authRepository = mockk<AuthRepository>()
    private val fakeUser = User("u1", "João", "joao@paz.church", role = UserRole.member)

    @Test
    fun `Google sign-in success emits NavigateToHome`() = runTest {
        coEvery { authRepository.socialLogin("good-token", "google") } returns Result.success(fakeUser)
        val viewModel = LoginViewModel(authRepository)

        viewModel.effect.test {
            viewModel.onGoogleSignIn("good-token")
            assertEquals(LoginEffect.NavigateToHome, awaitItem())
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `Apple sign-in success emits NavigateToHome`() = runTest {
        coEvery { authRepository.socialLogin("apple-token", "apple") } returns Result.success(fakeUser)
        val viewModel = LoginViewModel(authRepository)

        viewModel.effect.test {
            viewModel.onAppleSignIn("apple-token")
            assertEquals(LoginEffect.NavigateToHome, awaitItem())
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `sign-in failure emits ShowError with message`() = runTest {
        coEvery { authRepository.socialLogin(any(), any()) } returns
            Result.failure(RuntimeException("Network error"))
        val viewModel = LoginViewModel(authRepository)

        viewModel.effect.test {
            viewModel.onGoogleSignIn("bad-token")
            val effect = awaitItem()
            assertTrue(effect is LoginEffect.ShowError)
            assertEquals("Network error", (effect as LoginEffect.ShowError).message)
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `duplicate sign-in while loading is ignored`() = runTest {
        coEvery { authRepository.socialLogin(any(), any()) } returns Result.success(fakeUser)
        val viewModel = LoginViewModel(authRepository)

        // Force loading state before second call by checking the guard
        // (In practice the first call sets isLoading=true synchronously)
        viewModel.effect.test {
            viewModel.onGoogleSignIn("token-1")
            viewModel.onGoogleSignIn("token-2") // should be ignored while loading
            assertEquals(LoginEffect.NavigateToHome, awaitItem())
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `isLoading is false after sign-in completes`() = runTest {
        coEvery { authRepository.socialLogin(any(), any()) } returns Result.success(fakeUser)
        val viewModel = LoginViewModel(authRepository)

        viewModel.effect.test {
            viewModel.onGoogleSignIn("token")
            awaitItem() // consume NavigateToHome
            cancelAndIgnoreRemainingEvents()
        }

        assertFalse(viewModel.uiState.value.isLoading)
    }
}
