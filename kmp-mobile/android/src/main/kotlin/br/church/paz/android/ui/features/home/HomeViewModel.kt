package br.church.paz.android.ui.features.home

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.model.isLeader
import br.church.paz.shared.domain.repository.AgendaRepository
import br.church.paz.shared.domain.repository.AuthRepository
import br.church.paz.shared.domain.repository.ChurchRepository
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
    private val agendaRepository: AgendaRepository,
    private val churchRepository: ChurchRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    private val _effect = Channel<HomeEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        load()
    }

    fun load() = fetch(showSkeleton = true)

    /** Pull-to-refresh entry point — re-invokes the same load path without the full-screen skeleton. */
    fun refresh() = fetch(showSkeleton = false)

    private fun fetch(showSkeleton: Boolean) {
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = showSkeleton,
                    isRefreshing = !showSkeleton,
                    error = null,
                )
            }

            val user = runCatching { authRepository.currentUser() }.getOrNull()
            val firstName =
                user
                    ?.name
                    ?.trim()
                    ?.split(Regex("\\s+"))
                    ?.firstOrNull() ?: ""

            runCatching { homeRepository.getHomeContent() }
                .onSuccess { content ->
                    Log.d(
                        "HomeVM",
                        "banners=${content.banners.size} agenda=${content.agenda.size} bank=${content.contribution?.bank?.name}",
                    )
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isRefreshing = false,
                            banners = content.banners,
                            agendaEvents = content.agenda,
                            bank = content.contribution?.bank,
                            sectionOrder = content.sectionOrder,
                            userName = firstName,
                            canManage = user?.role?.isLeader == true,
                        )
                    }
                }.onFailure { e ->
                    Log.e("HomeVM", "load failed", e)
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isRefreshing = false,
                            error = e.message ?: e::class.simpleName ?: "Erro desconhecido",
                        )
                    }
                }

            // Shown only when getMyLifeGroups() succeeded AND came back empty — an
            // error fetching the viewer's groups must never be read as "no group",
            // since that would wrongly nudge an existing member to "discover" a
            // group they already belong to.
            runCatching { churchRepository.getMyLifeGroups() }
                .onSuccess { myGroups -> _uiState.update { it.copy(showLifeGroupDiscoveryCTA = myGroups.isEmpty()) } }
                .onFailure { _uiState.update { it.copy(showLifeGroupDiscoveryCTA = false) } }
        }
    }

    fun onBannerTapped(url: String?) {
        if (!url.isNullOrBlank()) viewModelScope.launch { _effect.send(HomeEffect.OpenUrl(url)) }
    }

    fun onEventTapped(eventId: String) {
        viewModelScope.launch { _effect.send(HomeEffect.NavigateToAgenda(eventId)) }
    }
}
