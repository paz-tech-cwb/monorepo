package br.church.paz.android.ui.features.splash

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.repository.AuthRepository
import br.church.paz.shared.domain.repository.OnboardingRepository
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

data class SplashUiState(
    val showOnboarding: Boolean = false,
)

class SplashViewModel(
    private val authRepository: AuthRepository,
    private val onboardingRepository: OnboardingRepository,
) : ViewModel() {
    private val _effect = Channel<SplashEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    private val _uiState = MutableStateFlow(SplashUiState())
    val uiState: StateFlow<SplashUiState> = _uiState.asStateFlow()

    init {
        checkSession()
    }

    /** Called once the member-onboarding flow finishes (completed or skipped through). */
    fun onOnboardingFinished() {
        _uiState.update { it.copy(showOnboarding = false) }
        viewModelScope.launch { _effect.send(SplashEffect.NavigateToHome) }
    }

    private fun checkSession() {
        viewModelScope.launch {
            if (authRepository.storedTokens() != null) {
                resumeAuthenticatedSession()
                return@launch
            }
            // No stored tokens — attempt silent Firebase re-auth before opening the shell.
            // Always navigate to Home regardless of outcome; AccountScreen handles auth gating.
            var reAuthenticated = false
            try {
                val firebaseUser = FirebaseAuth.getInstance().currentUser
                if (firebaseUser != null) {
                    val idToken =
                        firebaseUser.getIdToken(true).await()?.token
                            ?: throw Exception("No Firebase token")
                    val provider =
                        firebaseUser.providerData
                            .firstOrNull { it.providerId != "firebase" }
                            ?.providerId
                            ?.let { if (it == "google.com") "google" else "apple" }
                            ?: "google"
                    reAuthenticated = authRepository.socialLogin(idToken, provider).isSuccess
                }
            } catch (_: Exception) {
                // Silent re-auth failed — proceed unauthenticated
            }
            if (reAuthenticated) {
                resumeAuthenticatedSession()
            } else {
                _effect.send(SplashEffect.NavigateToHome)
            }
        }
    }

    /**
     * Onboarding must resume on relaunch, not only on an explicit sign-in: a member who
     * skipped a step and then force-quit the app would otherwise never be asked again.
     *
     * A failed `missingSteps()` fetch here falls through to Home rather than blocking app
     * launch behind a retry screen — the next sign-in or relaunch re-checks, and an
     * offline cold start must still open the app.
     */
    private suspend fun resumeAuthenticatedSession() {
        val missingSteps = runCatching { onboardingRepository.missingSteps() }.getOrNull()
        if (!missingSteps.isNullOrEmpty()) {
            _uiState.update { it.copy(showOnboarding = true) }
        } else {
            _effect.send(SplashEffect.NavigateToHome)
        }
    }
}
