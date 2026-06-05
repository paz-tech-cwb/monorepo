package br.church.paz.android.ui.features.academy

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.repository.AcademyRepository
import br.church.paz.shared.domain.repository.AuthRepository
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class AcademyViewModel(
    private val academyRepository: AcademyRepository,
    private val authRepository: AuthRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(AcademyUiState())
    val uiState: StateFlow<AcademyUiState> = _uiState.asStateFlow()

    private val _effect = Channel<AcademyEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            val user = runCatching { authRepository.currentUser() }.getOrNull()
            _uiState.update { it.copy(isAuthenticated = user != null) }
            runCatching { academyRepository.getAcademyContent() }
                .onSuccess { content ->
                    _uiState.update { it.copy(isLoading = false, tracks = content.tracks) }
                }.onFailure { e ->
                    _uiState.update { it.copy(isLoading = false, error = e.message) }
                }
        }
    }

    fun refreshAuthState() {
        viewModelScope.launch {
            val user = runCatching { authRepository.currentUser() }.getOrNull()
            _uiState.update { it.copy(isAuthenticated = user != null) }
        }
    }

    fun onVideoTapped(videoId: String) {
        viewModelScope.launch { _effect.send(AcademyEffect.NavigateToPlayer(videoId)) }
    }
}
