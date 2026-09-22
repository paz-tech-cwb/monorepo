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
 * Loads the unfiltered, church-wide life group list for the map screen —
 * the map route carries no navigation args, so it fetches independently
 * rather than relying on data passed from [AllLifeGroupsScreen].
 */
class LifeGroupsMapViewModel(
    private val churchRepository: ChurchRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(LifeGroupsMapUiState())
    val uiState: StateFlow<LifeGroupsMapUiState> = _uiState.asStateFlow()

    private val _effect = Channel<LifeGroupsMapEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            runCatching { churchRepository.getAllLifeGroups() }
                .onSuccess { groups ->
                    _uiState.update { it.copy(lifeGroups = groups, isLoading = false, error = null) }
                }.onFailure { e ->
                    _uiState.update { it.copy(isLoading = false, error = e.message ?: "Erro ao carregar dados") }
                }
        }
    }

    fun onRetry() {
        _uiState.update { it.copy(isLoading = true, error = null) }
        load()
    }

    fun onDirectionsTap(
        latitude: Double,
        longitude: Double,
        name: String,
    ) {
        viewModelScope.launch { _effect.send(LifeGroupsMapEffect.OpenDirections(latitude, longitude, name)) }
    }

    fun onDetailsTap(lifeGroupId: String) {
        viewModelScope.launch { _effect.send(LifeGroupsMapEffect.NavigateToLifeGroupDetail(lifeGroupId)) }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(LifeGroupsMapEffect.NavigateBack) }
    }
}
