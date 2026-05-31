package br.church.paz.android.ui.features.profile

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

class ProfileViewModel(private val authRepository: AuthRepository) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    private val _effect = Channel<ProfileEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init { loadProfile() }

    private fun loadProfile() {
        viewModelScope.launch {
            val user = authRepository.currentUser()
            _uiState.update {
                it.copy(user = user, isLoading = false)
            }
            if (user == null) {
                _effect.send(ProfileEffect.NavigateToLogin)
            }
        }
    }

    fun onEditProfile() = emit(ProfileEffect.NavigateToEditProfile)
    fun onLogout()       = emit(ProfileEffect.Logout)

    private fun emit(effect: ProfileEffect) {
        viewModelScope.launch { _effect.send(effect) }
    }
}
