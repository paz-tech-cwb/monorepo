package br.church.paz.android.ui.features.lifegroupattendance

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.model.LifeGroupAttendanceEntry
import br.church.paz.shared.domain.repository.LifeGroupAttendanceRepository
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class LifeGroupAttendanceHistoryViewModel(
    private val lifeGroupId: Int,
    private val repository: LifeGroupAttendanceRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(LifeGroupAttendanceHistoryUiState())
    val uiState: StateFlow<LifeGroupAttendanceHistoryUiState> = _uiState.asStateFlow()

    private val _effect = Channel<LifeGroupAttendanceHistoryEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            runCatching { repository.getHistory(lifeGroupId) }
                .onSuccess { records ->
                    _uiState.update { it.copy(isLoading = false, records = records) }
                }.onFailure { e ->
                    _uiState.update {
                        it.copy(isLoading = false, error = e.message ?: "Erro ao carregar presenças")
                    }
                }
        }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(LifeGroupAttendanceHistoryEffect.NavigateBack) }
    }

    fun onRecordTapped(date: String) {
        viewModelScope.launch { _effect.send(LifeGroupAttendanceHistoryEffect.NavigateToEditor(date)) }
    }
}

class LifeGroupAttendanceEditorViewModel(
    private val lifeGroupId: Int,
    private val meetingDate: String,
    private val repository: LifeGroupAttendanceRepository,
) : ViewModel() {
    private val _uiState =
        MutableStateFlow(LifeGroupAttendanceEditorUiState(meetingDate = meetingDate))
    val uiState: StateFlow<LifeGroupAttendanceEditorUiState> = _uiState.asStateFlow()

    private val _effect = Channel<LifeGroupAttendanceEditorEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            runCatching { repository.getByDate(lifeGroupId, meetingDate) }
                .onSuccess { attendance ->
                    _uiState.update {
                        it.copy(isLoading = false, entries = attendance.entries)
                    }
                }.onFailure { e ->
                    _uiState.update {
                        it.copy(isLoading = false, error = e.message ?: "Erro ao carregar presença")
                    }
                }
        }
    }

    fun onTogglePresent(userId: Int) {
        _uiState.update { state ->
            state.copy(
                entries =
                    state.entries.map { entry ->
                        if (entry.userId == userId) entry.copy(present = !entry.present) else entry
                    },
            )
        }
    }

    fun onSave() {
        val state = _uiState.value
        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, saveError = null) }
            runCatching {
                repository.save(lifeGroupId, meetingDate, state.entries)
            }.onSuccess {
                _uiState.update { it.copy(isSaving = false) }
                _effect.send(LifeGroupAttendanceEditorEffect.Saved)
            }.onFailure { e ->
                _uiState.update {
                    it.copy(isSaving = false, saveError = e.message ?: "Erro ao salvar presença")
                }
            }
        }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(LifeGroupAttendanceEditorEffect.NavigateBack) }
    }
}

internal fun List<LifeGroupAttendanceEntry>.presentCount() = count { it.present }
