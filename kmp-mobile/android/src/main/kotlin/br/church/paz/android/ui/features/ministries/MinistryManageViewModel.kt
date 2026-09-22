package br.church.paz.android.ui.features.ministries

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.model.MinistryUser
import br.church.paz.shared.domain.repository.ChurchRepository
import br.church.paz.shared.domain.repository.FormsRepository
import br.church.paz.shared.domain.repository.UpdateMinistryRequest
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Leader/admin-only ministry management — edit name/description, add/remove
 * members. Only reachable once [MinistryDetailScreen] has already decided
 * the current user may manage this ministry; the backend's RolesGuard is the
 * actual authorization boundary. Port of iOS `MinistryManageView`.
 */
class MinistryManageViewModel(
    private val ministryId: String,
    private val churchRepository: ChurchRepository,
    private val formsRepository: FormsRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(MinistryManageUiState())
    val uiState: StateFlow<MinistryManageUiState> = _uiState.asStateFlow()

    private val _effect = Channel<MinistryManageEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        load()
    }

    private fun load() {
        viewModelScope.launch {
            runCatching { churchRepository.getAllMinistries() }
                .onSuccess { ministries ->
                    val ministry = ministries.find { it.id.toString() == ministryId }
                    if (ministry == null) {
                        _uiState.update { it.copy(isLoading = false, error = "Ministério não encontrado") }
                    } else {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                error = null,
                                name = ministry.name,
                                description = ministry.description ?: "",
                                members = ministry.members,
                            )
                        }
                    }
                }.onFailure { e ->
                    _uiState.update { it.copy(isLoading = false, error = e.message ?: "Erro ao carregar") }
                }
        }
    }

    fun onNameChanged(name: String) = _uiState.update { it.copy(name = name) }

    fun onDescriptionChanged(description: String) = _uiState.update { it.copy(description = description) }

    fun onAddMemberTap() = _uiState.update { it.copy(showAddMember = true, addMemberQuery = "", addMemberResults = emptyList()) }

    fun onAddMemberDismiss() = _uiState.update { it.copy(showAddMember = false) }

    fun onAddMemberQueryChanged(query: String) {
        _uiState.update { it.copy(addMemberQuery = query) }
        if (query.length < 2) {
            _uiState.update { it.copy(addMemberResults = emptyList(), isSearchingMembers = false) }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isSearchingMembers = true) }
            val results = runCatching { formsRepository.searchUsers(query) }.getOrDefault(emptyList())
            _uiState.update { it.copy(addMemberResults = results, isSearchingMembers = false) }
        }
    }

    fun onMemberSelected(userId: String, name: String) {
        val id = userId.toIntOrNull() ?: return
        viewModelScope.launch {
            runCatching { churchRepository.addMinistryMember(ministryId.toInt(), id) }
                .onSuccess {
                    _uiState.update {
                        it.copy(members = it.members + MinistryUser(id, name), showAddMember = false)
                    }
                }.onFailure {
                    _uiState.update { it.copy(saveError = "Erro ao adicionar membro.") }
                }
        }
    }

    fun onRemoveMember(member: MinistryUser) {
        _uiState.update { it.copy(members = it.members.filterNot { m -> m.id == member.id }) }
        viewModelScope.launch {
            runCatching { churchRepository.removeMinistryMember(ministryId.toInt(), member.id) }
        }
    }

    fun onSave() {
        val state = _uiState.value
        if (!state.canSave) return
        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, saveError = null) }
            runCatching {
                churchRepository.updateMinistry(
                    ministryId.toInt(),
                    UpdateMinistryRequest(name = state.name, description = state.description.ifBlank { null }),
                )
            }.onSuccess {
                _uiState.update { it.copy(isSaving = false) }
                _effect.send(MinistryManageEffect.Dismiss)
            }.onFailure {
                _uiState.update { it.copy(isSaving = false, saveError = "Erro ao salvar. Tente novamente.") }
            }
        }
    }

    fun onCancel() {
        viewModelScope.launch { _effect.send(MinistryManageEffect.Dismiss) }
    }
}
