package br.church.paz.android.ui.features.home

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.model.LifeGroup
import br.church.paz.shared.domain.model.LifeGroupTask
import br.church.paz.shared.domain.model.buildHomeLifeGroupCards
import br.church.paz.shared.domain.model.isLeader
import br.church.paz.shared.domain.model.selectUpcomingLifeGroupTasks
import br.church.paz.shared.domain.repository.AuthRepository
import br.church.paz.shared.domain.repository.ChurchRepository
import br.church.paz.shared.domain.repository.HomeRepository
import br.church.paz.shared.domain.repository.LifeGroupTaskRepository
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate

class HomeViewModel(
    private val homeRepository: HomeRepository,
    private val authRepository: AuthRepository,
    private val churchRepository: ChurchRepository,
    private val taskRepository: LifeGroupTaskRepository,
    private val today: () -> String = { LocalDate.now().toString() },
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

            // Groups and tasks are independent best-effort fetches (a failure in one never blocks or
            // hides the other, and neither ever surfaces as a home error). A failed groups fetch must
            // never be read as "no group": the discovery CTA is shown only when it SUCCEEDED and came
            // back empty, otherwise an existing member would be nudged to "discover" a group.
            val groups = loadMyGroups()
            val tasks = loadMyTasks()
            val now = today()
            val built =
                groups?.let {
                    buildHomeLifeGroupCards(
                        currentUserId = user?.id?.toIntOrNull(),
                        groups = it,
                        tasks = tasks.orEmpty(),
                        today = now,
                        maxCards = MAX_HOME_LIFE_GROUP_CARDS,
                        maxTasks = MAX_HOME_TASKS,
                    )
                }
            _uiState.update {
                it.copy(
                    showLifeGroupDiscoveryCTA = groups != null && groups.isEmpty(),
                    lifeGroupCards = built?.cards.orEmpty(),
                    hiddenLifeGroupsCount = built?.hiddenCount ?: 0,
                    legacyTasks =
                        if (groups == null && tasks != null) {
                            selectUpcomingLifeGroupTasks(tasks, now, MAX_HOME_TASKS)
                        } else {
                            emptyList()
                        },
                )
            }
        }
    }

    /** The viewer's groups, or null when the fetch failed (cancellation is rethrown). */
    private suspend fun loadMyGroups(): List<LifeGroup>? =
        try {
            churchRepository.getMyLifeGroups()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            null
        }

    /** The viewer's tasks, or null when the fetch failed (cancellation is rethrown). */
    private suspend fun loadMyTasks(): List<LifeGroupTask>? =
        try {
            taskRepository.getMyTasks()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            null
        }

    fun onLifeGroupTapped(lifeGroupId: Int) {
        viewModelScope.launch { _effect.send(HomeEffect.NavigateToLifeGroup(lifeGroupId)) }
    }

    fun onSeeAllLifeGroupsTapped() {
        viewModelScope.launch { _effect.send(HomeEffect.NavigateToAllLifeGroups) }
    }

    fun onTaskTapped(assignmentId: String) {
        viewModelScope.launch { _effect.send(HomeEffect.NavigateToTask(assignmentId)) }
    }

    fun onBannerTapped(url: String?) {
        if (!url.isNullOrBlank()) viewModelScope.launch { _effect.send(HomeEffect.OpenUrl(url)) }
    }

    fun onEventTapped(eventId: String) {
        viewModelScope.launch { _effect.send(HomeEffect.NavigateToAgenda(eventId)) }
    }
}

private const val MAX_HOME_TASKS = 3
private const val MAX_HOME_LIFE_GROUP_CARDS = 3
