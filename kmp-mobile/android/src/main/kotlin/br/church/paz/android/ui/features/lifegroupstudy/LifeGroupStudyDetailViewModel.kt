package br.church.paz.android.ui.features.lifegroupstudy

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.data.remote.httpStatusCodeOrNull
import br.church.paz.shared.domain.model.UserRole
import br.church.paz.shared.domain.repository.AuthRepository
import br.church.paz.shared.domain.repository.LifeGroupStudyRepository
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class LifeGroupStudyDetailViewModel(
    private val studyId: String,
    private val repository: LifeGroupStudyRepository,
    private val authRepository: AuthRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(LifeGroupStudyDetailUiState())
    val uiState: StateFlow<LifeGroupStudyDetailUiState> = _uiState.asStateFlow()

    private val _effect = Channel<LifeGroupStudyDetailEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            val user = runCatching { authRepository.currentUser() }.getOrNull()
            runCatching { repository.getStudy(studyId) }
                .onSuccess { study ->
                    val canEdit = user != null && (user.id == study.publishedById || user.role == UserRole.admin)
                    _uiState.update { it.copy(isLoading = false, study = study, canEdit = canEdit) }
                }.onFailure { e ->
                    _uiState.update { it.copy(isLoading = false, error = friendlyErrorMessage(e, "Não foi possível carregar o estudo.")) }
                }
        }
    }

    fun onEditTapped() {
        viewModelScope.launch { _effect.send(LifeGroupStudyDetailEffect.NavigateToEdit(studyId)) }
    }

    fun onDelete() {
        viewModelScope.launch {
            _uiState.update { it.copy(isDeleting = true) }
            runCatching { repository.deleteStudy(studyId) }
                .onSuccess { _effect.send(LifeGroupStudyDetailEffect.NavigateBack) }
                .onFailure { e ->
                    val message =
                        if (e.httpStatusCodeOrNull() == 403) {
                            "Você não tem permissão para excluir este estudo."
                        } else {
                            friendlyErrorMessage(e, "Não foi possível excluir o estudo.")
                        }
                    _uiState.update { it.copy(isDeleting = false, error = message) }
                }
        }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(LifeGroupStudyDetailEffect.NavigateBack) }
    }
}
