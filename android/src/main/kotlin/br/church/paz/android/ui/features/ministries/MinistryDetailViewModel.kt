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

class MinistryDetailViewModel(
    private val ministryId: String,
    private val churchRepository: ChurchRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(MinistryDetailUiState())
    val uiState: StateFlow<MinistryDetailUiState> = _uiState.asStateFlow()

    private val _effect = Channel<MinistryDetailEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        load()
    }

    private fun load() {
        viewModelScope.launch {
            runCatching { churchRepository.getChurch() }
                .onSuccess { church ->
                    val ministry = church.ministries.find { it.id == ministryId }
                    _uiState.update {
                        it.copy(
                            ministry = ministry,
                            isLoading = false,
                            error = if (ministry == null) "Ministério não encontrado" else null,
                        )
                    }
                }.onFailure { e ->
                    _uiState.update {
                        it.copy(isLoading = false, error = e.message ?: "Erro ao carregar")
                    }
                }
        }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(MinistryDetailEffect.NavigateBack) }
    }
}

class LifeGroupDetailViewModel(
    private val lifeGroupId: String,
    private val churchRepository: ChurchRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(LifeGroupDetailUiState())
    val uiState: StateFlow<LifeGroupDetailUiState> = _uiState.asStateFlow()

    private val _effect = Channel<LifeGroupDetailEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        load()
    }

    private fun load() {
        viewModelScope.launch {
            runCatching { churchRepository.getAllLifeGroups() }
                .onSuccess { lifeGroups ->
                    val group = lifeGroups.find { it.id == lifeGroupId }
                    _uiState.update {
                        it.copy(
                            lifeGroup = group,
                            isLoading = false,
                            error = if (group == null) "Grupo não encontrado" else null,
                        )
                    }
                }.onFailure { e ->
                    _uiState.update {
                        it.copy(isLoading = false, error = e.message ?: "Erro ao carregar")
                    }
                }
        }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(LifeGroupDetailEffect.NavigateBack) }
    }

    fun onMeetingReport() {
        viewModelScope.launch { _effect.send(LifeGroupDetailEffect.NavigateToMeetingReport) }
    }
}
