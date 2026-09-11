package br.church.paz.android.ui.features.lifegroupstudy

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.model.isLeader
import br.church.paz.shared.domain.repository.AuthRepository
import br.church.paz.shared.domain.repository.LifeGroupStudyRepository
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class LifeGroupStudyListViewModel(
    private val repository: LifeGroupStudyRepository,
    private val authRepository: AuthRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(LifeGroupStudyListUiState())
    val uiState: StateFlow<LifeGroupStudyListUiState> = _uiState.asStateFlow()

    private val _effect = Channel<LifeGroupStudyListEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            val user = runCatching { authRepository.currentUser() }.getOrNull()
            _uiState.update { it.copy(canPublish = user?.role?.isLeader == true) }
            runCatching { repository.getStudies(page = 1, limit = PAGE_SIZE) }
                .onSuccess { pageResult ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            studies = pageResult.items,
                            page = pageResult.page,
                            hasMore = pageResult.hasMore,
                        )
                    }
                }.onFailure { e ->
                    _uiState.update { it.copy(isLoading = false, error = friendlyErrorMessage(e, "Não foi possível carregar os estudos.")) }
                }
        }
    }

    fun loadMore() {
        val state = _uiState.value
        if (state.isLoadingMore || !state.hasMore || state.isLoading) return
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingMore = true) }
            val nextPage = state.page + 1
            runCatching { repository.getStudies(page = nextPage, limit = PAGE_SIZE) }
                .onSuccess { pageResult ->
                    _uiState.update {
                        it.copy(
                            isLoadingMore = false,
                            studies = it.studies + pageResult.items,
                            page = pageResult.page,
                            hasMore = pageResult.hasMore,
                        )
                    }
                }.onFailure {
                    _uiState.update { it.copy(isLoadingMore = false) }
                }
        }
    }

    fun onStudyTapped(studyId: String) {
        viewModelScope.launch { _effect.send(LifeGroupStudyListEffect.NavigateToDetail(studyId)) }
    }

    fun onCreateTapped() {
        viewModelScope.launch { _effect.send(LifeGroupStudyListEffect.NavigateToCreate) }
    }

    private companion object {
        const val PAGE_SIZE = 20
    }
}
