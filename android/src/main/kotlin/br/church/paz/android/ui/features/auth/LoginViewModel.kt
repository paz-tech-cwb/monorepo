package br.church.paz.android.ui.features.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.repository.AuthRepository
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

    fun onGoogleSignIn(idToken: String) = signIn(idToken, provider = "google")

    fun onAppleSignIn(idToken: String) = signIn(idToken, provider = "apple")

    private fun signIn(
        idToken: String,
        provider: String,
    ) {
        if (_uiState.value.isLoading) return // prevent duplicate submissions
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            authRepository
                .socialLogin(idToken = idToken, provider = provider)
                .onSuccess { _effect.send(LoginEffect.NavigateToHome) }
                .onFailure { e ->
                    _effect.send(LoginEffect.ShowError(e.message ?: "Erro ao entrar. Tente novamente."))
                }
            _uiState.update { it.copy(isLoading = false) }
        }
    }
}
