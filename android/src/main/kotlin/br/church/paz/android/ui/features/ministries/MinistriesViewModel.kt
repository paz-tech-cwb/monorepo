package br.church.paz.android.ui.features.ministries

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.repository.ChurchRepository
import kotlinx.coroutines.async
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class MinistriesViewModel(
    private val churchRepository: ChurchRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(MinistriesUiState())
    val uiState: StateFlow<MinistriesUiState> = _uiState.asStateFlow()

    private val _effect = Channel<MinistriesEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init { load() }

    private fun load() {
        viewModelScope.launch {
            val churchDeferred = async { churchRepository.getChurch() }
            val lifeGroupsDeferred = async { churchRepository.getAllLifeGroups() }

            val churchResult = churchDeferred.await()
            val lifeGroupsResult = lifeGroupsDeferred.await()

            val hasError = churchResult.isFailure && lifeGroupsResult.isFailure
            _uiState.update {
                it.copy(
                    ministries = churchResult.getOrNull()?.ministries ?: emptyList(),
                    lifeGroups = lifeGroupsResult.getOrNull() ?: emptyList(),
                    isLoading = false,
                    error = if (hasError) (churchResult.exceptionOrNull()?.message ?: "Erro ao carregar") else null,
                )
            }
        }
    }

    fun onTabSelected(tab: MinistriesTab) {
        _uiState.update { it.copy(selectedTab = tab) }
    }

    fun onMinistryTap(ministryId: String) {
        viewModelScope.launch { _effect.send(MinistriesEffect.NavigateToMinistryDetail(ministryId)) }
    }

    fun onLifeGroupTap(lifeGroupId: String) {
        viewModelScope.launch { _effect.send(MinistriesEffect.NavigateToLifeGroupDetail(lifeGroupId)) }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(MinistriesEffect.NavigateBack) }
    }

    fun onRetry() {
        _uiState.update { it.copy(isLoading = true, error = null) }
        load()
    }
}
