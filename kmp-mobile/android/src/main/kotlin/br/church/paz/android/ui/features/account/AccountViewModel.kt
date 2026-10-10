package br.church.paz.android.ui.features.account

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.android.ui.theme.AppThemeManager
import br.church.paz.shared.domain.repository.AuthRepository
import br.church.paz.shared.domain.repository.ChurchRepository
import br.church.paz.shared.push.getFcmToken
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class AccountViewModel(
    private val authRepository: AuthRepository,
    private val themeManager: AppThemeManager,
    private val churchRepository: ChurchRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(AccountUiState())
    val uiState: StateFlow<AccountUiState> = _uiState.asStateFlow()

    private val _effect = Channel<AccountEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        loadUser()
    }

    fun loadUser() {
        viewModelScope.launch {
            val user = authRepository.currentUser()
            _uiState.update { it.copy(user = user, isLoading = false, isGuestMode = false) }
            loadChurchName()
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isRefreshing = true) }
            val user = authRepository.currentUser()
            _uiState.update { it.copy(user = user, isRefreshing = false, isGuestMode = false) }
            loadChurchName()
        }
    }

    // Display-only: resolves to the member's primary filial via the backend
    // JWT — no client-side church id plumbing needed. Best-effort; a
    // failure here shouldn't block the rest of the Account screen.
    private fun loadChurchName() {
        viewModelScope.launch {
            val churchName = runCatching { churchRepository.getChurch().name }.getOrNull()
            _uiState.update { it.copy(churchName = churchName) }
        }
    }

    fun onExploreAsGuest() {
        _uiState.update { it.copy(isGuestMode = true) }
    }

    fun onShowLogin() {
        _uiState.update { it.copy(isGuestMode = false) }
    }

    fun onToggleDarkMode(enabled: Boolean) {
        themeManager.set(enabled)
        _uiState.update { it.copy(isDarkMode = enabled) }
    }

    fun onLogout() {
        viewModelScope.launch {
            val fcmToken = getFcmToken()
            authRepository.logout(fcmToken = fcmToken)
            _uiState.update { it.copy(user = null, isGuestMode = false) }
            _effect.send(AccountEffect.LoggedOut)
        }
    }

    fun onEditProfile() = emit(AccountEffect.NavigateToEditProfile)

    fun onMemberJourney() = emit(AccountEffect.NavigateToMemberJourney)

    fun onFormularios() = emit(AccountEffect.NavigateToFormularios)

    fun onGuestForm() = emit(AccountEffect.NavigateToGuestForm)

    fun onMinistries() = emit(AccountEffect.NavigateToMinistries)

    fun onLifeGroups() = emit(AccountEffect.NavigateToLifeGroups)

    fun onReports() = emit(AccountEffect.NavigateToReports)

    fun onNotificationPrefs() = emit(AccountEffect.NavigateToNotificationPrefs)

    private fun emit(effect: AccountEffect) {
        viewModelScope.launch { _effect.send(effect) }
    }
}
