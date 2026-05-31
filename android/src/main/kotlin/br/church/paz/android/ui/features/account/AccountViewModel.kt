package br.church.paz.android.ui.features.account

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

class AccountViewModel(private val authRepository: AuthRepository) : ViewModel() {

    private val _uiState = MutableStateFlow(AccountUiState())
    val uiState: StateFlow<AccountUiState> = _uiState.asStateFlow()

    private val _effect = Channel<AccountEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init { loadUser() }

    private fun loadUser() {
        viewModelScope.launch {
            val user = authRepository.currentUser()
            _uiState.update { it.copy(user = user, isLoading = false) }
        }
    }

    fun onToggleDarkMode(enabled: Boolean) {
        _uiState.update { it.copy(isDarkMode = enabled) }
    }

    fun onLogout() {
        viewModelScope.launch {
            authRepository.logout()
            _effect.send(AccountEffect.LoggedOut)
        }
    }

    fun onEditProfile()       = emit(AccountEffect.NavigateToEditProfile)
    fun onMemberJourney()     = emit(AccountEffect.NavigateToMemberJourney)
    fun onMeetingReport()     = emit(AccountEffect.NavigateToMeetingReport)
    fun onFormularios()       = emit(AccountEffect.NavigateToFormularios)
    fun onMinistries()        = emit(AccountEffect.NavigateToMinistries)
    fun onNotificationPrefs() = emit(AccountEffect.NavigateToNotificationPrefs)

    private fun emit(effect: AccountEffect) {
        viewModelScope.launch { _effect.send(effect) }
    }
}
