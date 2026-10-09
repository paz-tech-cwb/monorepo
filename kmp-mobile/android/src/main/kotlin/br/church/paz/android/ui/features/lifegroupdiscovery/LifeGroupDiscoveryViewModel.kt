package br.church.paz.android.ui.features.lifegroupdiscovery

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.repository.ChurchRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Loads the unfiltered, church-wide life group list for the Discovery screen
 * (map + list), with debounced server-side search, client-side kids-count
 * filtering and name/distance sort. Mirrors iOS `AllLifeGroupsViewModel`.
 */
class LifeGroupDiscoveryViewModel(
    private val churchRepository: ChurchRepository,
    private val locationProvider: LocationProvider,
) : ViewModel() {
    private val _uiState = MutableStateFlow(LifeGroupDiscoveryUiState())
    val uiState: StateFlow<LifeGroupDiscoveryUiState> = _uiState.asStateFlow()

    private val _effect = Channel<LifeGroupDiscoveryEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    /** Remembers the last search term so [onRetry] retries WITH the current search. */
    private var lastSearch: String? = null

    /**
     * Incremented on every load — lets [load] detect and discard a stale
     * response if a newer search started meanwhile, since job cancellation
     * alone can't abort an in-flight network call.
     */
    private var searchGeneration = 0
    private var searchDebounceJob: Job? = null

    init {
        load()
        requestLocation()
    }

    fun load(search: String? = null) {
        val isInitialLoad = !_uiState.value.hasLoadedOnce
        _uiState.update { it.copy(error = null, isLoading = isInitialLoad, isSearching = !isInitialLoad) }
        searchGeneration += 1
        val generation = searchGeneration
        viewModelScope.launch {
            runCatching { churchRepository.getAllLifeGroups(search) }
                .onSuccess { groups ->
                    if (generation != searchGeneration) return@onSuccess
                    lastSearch = search
                    _uiState.update {
                        it.copy(
                            lifeGroups = groups,
                            error = null,
                            isLoading = false,
                            isSearching = false,
                            hasLoadedOnce = true,
                        )
                    }
                }.onFailure { e ->
                    if (generation != searchGeneration) return@onFailure
                    lastSearch = search
                    _uiState.update {
                        it.copy(
                            error = e.message ?: "Erro ao carregar dados",
                            isLoading = false,
                            isSearching = false,
                        )
                    }
                }
        }
    }

    fun onRetry() = load(search = lastSearch)

    /** Debounces keystrokes (~400ms) before forwarding `search` to the backend. */
    fun onSearchTextChanged(value: String) {
        _uiState.update { it.copy(searchText = value) }
        searchDebounceJob?.cancel()
        searchDebounceJob =
            viewModelScope.launch {
                delay(400)
                load(search = value)
            }
    }

    fun onSearchCleared() {
        searchDebounceJob?.cancel()
        _uiState.update { it.copy(searchText = "") }
        load(search = "")
    }

    fun onKidsOnlyToggled(enabled: Boolean) {
        _uiState.update { it.copy(kidsOnly = enabled) }
    }

    fun onSortOptionSelected(option: LifeGroupSortOption) {
        _uiState.update { it.copy(sortOption = option) }
    }

    fun onMapToggle() {
        _uiState.update { it.copy(showMap = !it.showMap) }
    }

    fun onLocationPermissionResult(granted: Boolean) {
        if (granted) {
            requestLocation()
        } else {
            _uiState.update {
                it.copy(locationPermissionDenied = true, userLocation = null, sortOption = LifeGroupSortOption.NAME)
            }
        }
    }

    private fun requestLocation() {
        viewModelScope.launch {
            val coordinate = locationProvider.getCurrentLocation()
            _uiState.update {
                val fellBackToName = coordinate == null && it.sortOption == LifeGroupSortOption.DISTANCE
                it.copy(
                    userLocation = coordinate,
                    sortOption = if (fellBackToName) LifeGroupSortOption.NAME else it.sortOption,
                )
            }
        }
    }

    fun onLifeGroupTap(lifeGroupId: String) {
        viewModelScope.launch { _effect.send(LifeGroupDiscoveryEffect.NavigateToLifeGroupDetail(lifeGroupId)) }
    }

    fun onDirectionsTap(
        latitude: Double,
        longitude: Double,
        name: String,
    ) {
        viewModelScope.launch { _effect.send(LifeGroupDiscoveryEffect.OpenDirections(latitude, longitude, name)) }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(LifeGroupDiscoveryEffect.NavigateBack) }
    }
}
