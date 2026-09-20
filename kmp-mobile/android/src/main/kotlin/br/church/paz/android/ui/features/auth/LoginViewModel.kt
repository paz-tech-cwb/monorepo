package br.church.paz.android.ui.features.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.repository.AuthRepository
import br.church.paz.shared.domain.repository.BirthDateRequiredException
import br.church.paz.shared.domain.repository.OnboardingRepository
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class LoginViewModel(
    private val authRepository: AuthRepository,
    private val onboardingRepository: OnboardingRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    private val _effect = Channel<LoginEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    // Held only long enough to retry with a birth date once the user confirms one;
    // never persisted, and cleared as soon as the retry attempt is made.
    private var pendingIdToken: String? = null
    private var pendingProvider: String? = null

    fun onGoogleSignIn(idToken: String) = signIn(idToken, provider = "google")

    fun onAppleSignIn(idToken: String) = signIn(idToken, provider = "apple")

    /**
     * Called by the onboarding flow's Birthday step when onboarding was launched to satisfy a
     * [BirthDateRequiredException] (see [LoginUiState.onboardingStartsAtBirthday]). Retries the
     * pending sign-in with the confirmed birth date; on success the caller (OnboardingViewModel)
     * re-fetches the real remaining onboarding steps and continues the flow.
     */
    suspend fun completeLoginWithBirthDate(birthDate: String): Result<Unit> {
        val idToken = pendingIdToken ?: return Result.failure(IllegalStateException("No pending sign-in."))
        val provider = pendingProvider ?: return Result.failure(IllegalStateException("No pending sign-in."))
        return authRepository
            .socialLogin(idToken = idToken, provider = provider, birthDate = birthDate)
            .onSuccess {
                pendingIdToken = null
                pendingProvider = null
                _uiState.update { it.copy(onboardingStartsAtBirthday = false) }
            }.map { }
    }

    /** Called once the member-onboarding flow finishes (completed or skipped through). */
    fun onOnboardingFinished() {
        _uiState.update { it.copy(showOnboarding = false) }
        viewModelScope.launch { _effect.send(LoginEffect.NavigateToHome) }
    }

    private fun signIn(
        idToken: String,
        provider: String,
    ) {
        if (_uiState.value.isLoading) return // prevent duplicate submissions
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            authRepository
                .socialLogin(idToken = idToken, provider = provider, birthDate = null)
                .onSuccess {
                    pendingIdToken = null
                    pendingProvider = null
                    val missingSteps = onboardingRepository.missingSteps()
                    if (missingSteps.isNotEmpty()) {
                        _uiState.update { it.copy(showOnboarding = true) }
                    } else {
                        _effect.send(LoginEffect.NavigateToHome)
                    }
                }.onFailure { e ->
                    if (e is BirthDateRequiredException) {
                        pendingIdToken = idToken
                        pendingProvider = provider
                        _uiState.update { it.copy(showOnboarding = true, onboardingStartsAtBirthday = true) }
                    } else {
                        _effect.send(LoginEffect.ShowError(e.message ?: "Erro ao entrar. Tente novamente."))
                    }
                }
            _uiState.update { it.copy(isLoading = false) }
        }
    }
}
