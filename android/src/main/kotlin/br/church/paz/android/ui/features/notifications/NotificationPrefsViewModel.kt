package br.church.paz.android.ui.features.notifications

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.model.UpdateNotificationPrefsDto
import br.church.paz.shared.domain.repository.UserRepository
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class NotificationPrefsViewModel(
    private val userRepository: UserRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(NotificationPrefsUiState())
    val uiState: StateFlow<NotificationPrefsUiState> = _uiState.asStateFlow()

    private val _effect = Channel<NotificationPrefsEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        loadPreferences()
    }

    private fun loadPreferences() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            runCatching { userRepository.getNotificationPreferences() }
                .onSuccess { prefs ->
                    _uiState.update {
                        it.copy(
                            eventsNotifications = prefs.eventsEnabled,
                            announcementsNotifications = prefs.announcementsEnabled,
                            lifeGroupNotifications = prefs.lifeGroupEnabled,
                            academyNotifications = prefs.academyEnabled,
                            memberJourneyNotifications = prefs.memberJourneyEnabled,
                            contributionsNotifications = prefs.contributionsEnabled,
                        )
                    }
                }
            _uiState.update { it.copy(isLoading = false) }
        }
    }

    fun toggleEvents() {
        _uiState.update { it.copy(eventsNotifications = !it.eventsNotifications) }
    }

    fun toggleAnnouncements() {
        _uiState.update { it.copy(announcementsNotifications = !it.announcementsNotifications) }
    }

    fun toggleLifeGroup() {
        _uiState.update { it.copy(lifeGroupNotifications = !it.lifeGroupNotifications) }
    }

    fun toggleAcademy() {
        _uiState.update { it.copy(academyNotifications = !it.academyNotifications) }
    }

    fun toggleMemberJourney() {
        _uiState.update { it.copy(memberJourneyNotifications = !it.memberJourneyNotifications) }
    }

    fun toggleContributions() {
        _uiState.update { it.copy(contributionsNotifications = !it.contributionsNotifications) }
    }

    fun onSave() {
        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, error = null) }
            val state = _uiState.value
            runCatching {
                userRepository.updateNotificationPreferences(
                    UpdateNotificationPrefsDto(
                        eventsEnabled = state.eventsNotifications,
                        announcementsEnabled = state.announcementsNotifications,
                        lifeGroupEnabled = state.lifeGroupNotifications,
                        academyEnabled = state.academyNotifications,
                        memberJourneyEnabled = state.memberJourneyNotifications,
                        contributionsEnabled = state.contributionsNotifications,
                        osPermissionStatus = null,
                    ),
                )
            }.onSuccess {
                _uiState.update { it.copy(isSaving = false, saveSuccess = true) }
                _effect.send(NotificationPrefsEffect.SaveSuccess)
            }.onFailure { e ->
                _uiState.update {
                    it.copy(isSaving = false, error = e.message ?: "Erro ao salvar preferências")
                }
            }
        }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(NotificationPrefsEffect.NavigateBack) }
    }
}
