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
            if (authRepository.currentUser() != null) {
                _effect.send(SplashEffect.NavigateToHome)
                return@launch
            }
            val firebaseUser = FirebaseAuth.getInstance().currentUser
            if (firebaseUser == null) {
                _effect.send(SplashEffect.NavigateToLogin)
                return@launch
            }
            try {
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
