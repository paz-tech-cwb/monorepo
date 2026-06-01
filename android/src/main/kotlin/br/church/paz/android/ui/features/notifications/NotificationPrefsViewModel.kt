package br.church.paz.android.ui.features.notifications

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.model.NotificationPreferences
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

    init { loadPreferences() }

    private fun loadPreferences() {
        viewModelScope.launch {
            userRepository.getNotificationPreferences()
                .onSuccess { prefs ->
                    _uiState.update {
                        it.copy(
                            eventsNotifications       = prefs.events,
                            announcementsNotifications = prefs.announcements,
                            lifeGroupNotifications    = prefs.lifeGroup,
                        )
                    }
                }
            // On failure: keep defaults — non-critical
        }
    }

    fun toggleEvents()        { _uiState.update { it.copy(eventsNotifications       = !it.eventsNotifications) } }
    fun toggleAnnouncements() { _uiState.update { it.copy(announcementsNotifications = !it.announcementsNotifications) } }
    fun toggleLifeGroup()     { _uiState.update { it.copy(lifeGroupNotifications    = !it.lifeGroupNotifications) } }

    fun onSave() {
        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, error = null) }
            val state = _uiState.value
            userRepository.updateNotificationPreferences(
                NotificationPreferences(
                    events        = state.eventsNotifications,
                    announcements = state.announcementsNotifications,
                    lifeGroup     = state.lifeGroupNotifications,
                )
            )
                .onSuccess {
                    _uiState.update { it.copy(isSaving = false, saveSuccess = true) }
                    _effect.send(NotificationPrefsEffect.SaveSuccess)
                }
                .onFailure { e ->
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
