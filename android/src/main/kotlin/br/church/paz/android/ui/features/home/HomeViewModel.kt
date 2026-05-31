package br.church.paz.android.ui.features.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.repository.AuthRepository
import br.church.paz.shared.domain.repository.HomeRepository
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class HomeViewModel(
    private val homeRepository: HomeRepository,
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    private val _effect = Channel<HomeEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val user = authRepository.currentUser()
            val firstName = user?.name?.trim()?.split(Regex("\\s+"))?.firstOrNull() ?: ""

            homeRepository.getHomeContent()
                .onSuccess { content ->
                    _uiState.update {
                        it.copy(
                            isLoading    = false,
                            banners      = content.banners,
                            agendaEvents = content.agenda,
                            bank         = content.contribution?.bank,
                            userName     = firstName,
                        )
                    }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(isLoading = false, error = e.message) }
                }
        }
    }

    fun onBannerTapped(url: String?) {
        if (!url.isNullOrBlank()) viewModelScope.launch { _effect.send(HomeEffect.OpenUrl(url)) }
    }

    fun onEventTapped(eventId: String) {
        viewModelScope.launch { _effect.send(HomeEffect.NavigateToAgenda(eventId)) }
    }
}
