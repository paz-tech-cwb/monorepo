package br.church.paz.android.ui.features.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.repository.AuthRepository
import br.church.paz.shared.domain.repository.BirthDateRequiredException
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class LoginViewModel(
    private val authRepository: AuthRepository,
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

    /** Called once the user picks a birth date in response to [LoginUiState.needsBirthDate]. */
    fun onBirthDateConfirmed(birthDate: String) {
        val idToken = pendingIdToken ?: return
        val provider = pendingProvider ?: return
        _uiState.update { it.copy(needsBirthDate = false) }
        signIn(idToken, provider, birthDate)
    }

    fun dismissBirthDatePrompt() {
        pendingIdToken = null
        pendingProvider = null
        _uiState.update { it.copy(needsBirthDate = false) }
    }

    private fun signIn(
        idToken: String,
        provider: String,
        birthDate: String? = null,
    ) {
        if (_uiState.value.isLoading) return // prevent duplicate submissions
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            authRepository
                .socialLogin(idToken = idToken, provider = provider, birthDate = birthDate)
                .onSuccess {
                    pendingIdToken = null
                    pendingProvider = null
                    _effect.send(LoginEffect.NavigateToHome)
                }.onFailure { e ->
                    if (e is BirthDateRequiredException) {
                        pendingIdToken = idToken
                        pendingProvider = provider
                        _uiState.update { it.copy(needsBirthDate = true) }
                    } else {
                        _effect.send(LoginEffect.ShowError(e.message ?: "Erro ao entrar. Tente novamente."))
                    }
                }
            _uiState.update { it.copy(isLoading = false) }
        }
    }
}
