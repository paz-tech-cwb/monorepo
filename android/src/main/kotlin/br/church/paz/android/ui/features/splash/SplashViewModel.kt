package br.church.paz.android.ui.features.splash

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.repository.AuthRepository
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

class SplashViewModel(
    private val authRepository: AuthRepository,
) : ViewModel() {
    private val _effect = Channel<SplashEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        checkSession()
    }

    private fun checkSession() {
        viewModelScope.launch {
            if (authRepository.storedTokens() != null) {
                _effect.send(SplashEffect.NavigateToHome)
                return@launch
            }
            // No stored tokens — attempt silent Firebase re-auth.
            // The entire block is wrapped so Firebase initialization errors
            // in test environments also route to NavigateToLogin.
            try {
                val firebaseUser =
                    FirebaseAuth.getInstance().currentUser
                        ?: run {
                            _effect.send(SplashEffect.NavigateToLogin)
                            return@launch
                        }
                val idToken =
                    firebaseUser.getIdToken(true).await()?.token
                        ?: throw Exception("No Firebase token")
                val provider =
                    firebaseUser.providerData
                        .firstOrNull { it.providerId != "firebase" }
                        ?.providerId
                        ?.let { if (it == "google.com") "google" else "apple" }
                        ?: "google"
                authRepository.socialLogin(idToken, provider)
                _effect.send(SplashEffect.NavigateToHome)
            } catch (_: Exception) {
                _effect.send(SplashEffect.NavigateToLogin)
            }
        }
    }
}
