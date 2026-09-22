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

class CasaDePazLessonDetailViewModel(
    private val week: Int,
    private val repository: CasaDePazLessonRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(CasaDePazLessonDetailUiState())
    val uiState: StateFlow<CasaDePazLessonDetailUiState> = _uiState.asStateFlow()

    private val _effect = Channel<CasaDePazLessonDetailEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            runCatching { repository.getLessons() }
                .onSuccess { lessons ->
                    val lesson = lessons.find { it.week == week }
                    _uiState.update { it.copy(isLoading = false, lesson = lesson) }
                }.onFailure { e ->
                    _uiState.update {
                        it.copy(isLoading = false, error = friendlyErrorMessage(e, "Não foi possível carregar esta semana."))
                    }
                }
        }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(CasaDePazLessonDetailEffect.NavigateBack) }
    }
}
