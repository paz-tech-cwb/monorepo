package br.church.paz.android.ui.features.ministries

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.repository.ChurchRepository
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Defaults to the viewer's own life group(s) — mirrors iOS `LifeGroupsViewModel`.
 * If the viewer has none, falls back to the unfiltered church-wide list so the
 * screen never renders an empty "you have no groups" dead end.
 */
class LifeGroupsViewModel(
    private val churchRepository: ChurchRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(LifeGroupsUiState())
    val uiState: StateFlow<LifeGroupsUiState> = _uiState.asStateFlow()

    private val _effect = Channel<LifeGroupsEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        load()
    }

    fun load() = fetch(showSkeleton = true)

    /** Pull-to-refresh entry point — re-invokes the same load path without the full-screen skeleton. */
    fun refresh() = fetch(showSkeleton = false)

    private fun fetch(showSkeleton: Boolean) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = showSkeleton, isRefreshing = !showSkeleton, error = null) }
            runCatching { churchRepository.getMyLifeGroups() }
                .onSuccess { myGroups ->
                    if (myGroups.isNotEmpty()) {
                        _uiState.update {
                            it.copy(
                                lifeGroups = myGroups,
                                isFallbackToAll = false,
                                isLoading = false,
                                isRefreshing = false,
                                error = null,
                            )
                        }
                    } else {
                        loadAllAsFallback()
                    }
                }.onFailure { e ->
                    _uiState.update {
                        it.copy(isLoading = false, isRefreshing = false, error = e.message ?: "Erro ao carregar dados")
                    }
                }
        }
    }

    private suspend fun loadAllAsFallback() {
        runCatching { churchRepository.getAllLifeGroups() }
            .onSuccess { allGroups ->
                _uiState.update {
                    it.copy(
                        lifeGroups = allGroups,
                        isFallbackToAll = true,
                        isLoading = false,
                        isRefreshing = false,
                        error = null,
                    )
                }
            }.onFailure { e ->
                _uiState.update {
                    it.copy(isLoading = false, isRefreshing = false, error = e.message ?: "Erro ao carregar dados")
                }
            }
    }

    fun onLifeGroupTap(lifeGroupId: String) {
        viewModelScope.launch { _effect.send(LifeGroupsEffect.NavigateToLifeGroupDetail(lifeGroupId)) }
    }

    fun onSeeAllTap() {
        viewModelScope.launch { _effect.send(LifeGroupsEffect.NavigateToAllLifeGroups) }
    }

    fun onMapToggle() {
        viewModelScope.launch { _effect.send(LifeGroupsEffect.NavigateToMap) }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(LifeGroupsEffect.NavigateBack) }
    }

    fun onRetry() {
        _uiState.update { it.copy(isLoading = true, error = null) }
        load()
    }
}

/** Unfiltered, church-wide list — either the fallback or reached via "Ver mais life groups". */
class AllLifeGroupsViewModel(
    private val churchRepository: ChurchRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(AllLifeGroupsUiState())
    val uiState: StateFlow<AllLifeGroupsUiState> = _uiState.asStateFlow()

    private val _effect = Channel<AllLifeGroupsEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        load()
    }

    fun load() = fetch(showSkeleton = true)

    /** Pull-to-refresh entry point — re-invokes the same load path without the full-screen skeleton. */
    fun refresh() = fetch(showSkeleton = false)

    private fun fetch(showSkeleton: Boolean) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = showSkeleton, isRefreshing = !showSkeleton, error = null) }
            runCatching { churchRepository.getAllLifeGroups() }
                .onSuccess { groups ->
                    _uiState.update {
                        it.copy(lifeGroups = groups, isLoading = false, isRefreshing = false, error = null)
                    }
                }.onFailure { e ->
                    _uiState.update {
                        it.copy(isLoading = false, isRefreshing = false, error = e.message ?: "Erro ao carregar dados")
                    }
                }
        }
    }

    fun onLifeGroupTap(lifeGroupId: String) {
        viewModelScope.launch { _effect.send(AllLifeGroupsEffect.NavigateToLifeGroupDetail(lifeGroupId)) }
    }

    fun onMapToggle() {
        viewModelScope.launch { _effect.send(AllLifeGroupsEffect.NavigateToMap) }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(AllLifeGroupsEffect.NavigateBack) }
    }

    fun onRetry() {
        _uiState.update { it.copy(isLoading = true, error = null) }
        load()
    }
}
