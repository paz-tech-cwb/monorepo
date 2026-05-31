package br.church.paz.android.ui.features.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.model.UpdateProfileRequest
import br.church.paz.shared.domain.repository.AuthRepository
import br.church.paz.shared.domain.repository.UserRepository
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class EditProfileViewModel(
    private val userRepository: UserRepository,
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(EditProfileUiState())
    val uiState: StateFlow<EditProfileUiState> = _uiState.asStateFlow()

    private val _effect = Channel<EditProfileEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init { loadProfile() }

    private fun loadProfile() {
        viewModelScope.launch {
            val user = authRepository.currentUser()
            _uiState.update { it.copy(name = user?.name ?: "", isLoading = false) }
        }
    }

    fun onNameChanged(newName: String) {
        _uiState.update { it.copy(name = newName, error = null) }
    }

    fun onSave() {
        val name = _uiState.value.name.trim()
        if (name.isEmpty()) {
            _uiState.update { it.copy(error = "Nome não pode ser vazio") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, error = null) }
            userRepository.updateProfile(UpdateProfileRequest(name = name))
                .onSuccess {
                    _uiState.update { it.copy(isSaving = false, saveSuccess = true) }
                    _effect.send(EditProfileEffect.SaveSuccess)
                }
                .onFailure { e ->
                    _uiState.update {
                        it.copy(isSaving = false, error = e.message ?: "Erro ao salvar perfil")
                    }
                }
        }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(EditProfileEffect.NavigateBack) }
    }
}
