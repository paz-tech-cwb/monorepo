package br.church.paz.android.ui.features.casadepazlessons

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.android.ui.features.lifegroupstudy.friendlyErrorMessage
import br.church.paz.shared.domain.repository.CasaDePazLessonRepository
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class CasaDePazLessonsListViewModel(
    private val repository: CasaDePazLessonRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(CasaDePazLessonsListUiState())
    val uiState: StateFlow<CasaDePazLessonsListUiState> = _uiState.asStateFlow()

    private val _effect = Channel<CasaDePazLessonsListEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            runCatching { repository.getLessons() }
                .onSuccess { lessons ->
                    _uiState.update { it.copy(isLoading = false, lessons = lessons.sortedBy { l -> l.week }) }
                }.onFailure { e ->
                    _uiState.update {
                        it.copy(isLoading = false, error = friendlyErrorMessage(e, "Não foi possível carregar o conteúdo."))
                    }
                }
        }
    }

    fun onLessonTapped(week: Int) {
        viewModelScope.launch { _effect.send(CasaDePazLessonsListEffect.NavigateToDetail(week)) }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(CasaDePazLessonsListEffect.NavigateBack) }
    }
}
