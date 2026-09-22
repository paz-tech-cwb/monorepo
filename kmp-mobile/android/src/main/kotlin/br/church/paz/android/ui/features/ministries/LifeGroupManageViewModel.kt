package br.church.paz.android.ui.features.ministries

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.model.LifeGroupMember
import br.church.paz.shared.domain.repository.ChurchRepository
import br.church.paz.shared.domain.repository.FormsRepository
import br.church.paz.shared.domain.repository.UpdateLifeGroupRequest
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Leader/admin-only life group management — edit group info, add/remove
 * members. Only reachable once [LifeGroupDetailScreen] has already decided
 * the current user may manage this group; the backend's RolesGuard is the
 * actual authorization boundary. Port of iOS `LifeGroupManageView`.
 */
class LifeGroupManageViewModel(
    private val lifeGroupId: String,
    private val churchRepository: ChurchRepository,
    private val formsRepository: FormsRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(LifeGroupManageUiState())
    val uiState: StateFlow<LifeGroupManageUiState> = _uiState.asStateFlow()

    private val _effect = Channel<LifeGroupManageEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        load()
    }

    private fun load() {
        viewModelScope.launch {
            runCatching { churchRepository.getAllLifeGroups() }
                .onSuccess { groups ->
                    val group = groups.find { it.id.toString() == lifeGroupId }
                    if (group == null) {
                        _uiState.update { it.copy(isLoading = false, error = "Grupo não encontrado") }
                    } else {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                error = null,
                                name = group.name,
                                location = group.location ?: "",
                                meetingDay = group.meetingDay ?: "",
                                meetingTime = group.meetingTime ?: "",
                                kidsCount = group.kidsCount.toString(),
                                members = group.members ?: emptyList(),
                            )
                        }
                    }
                }.onFailure { e ->
                    _uiState.update { it.copy(isLoading = false, error = e.message ?: "Erro ao carregar") }
                }
        }
    }

    fun onNameChanged(name: String) = _uiState.update { it.copy(name = name) }

    fun onLocationChanged(location: String) = _uiState.update { it.copy(location = location) }

    fun onMeetingDayChanged(day: String) = _uiState.update { it.copy(meetingDay = day) }

    fun onMeetingTimeChanged(time: String) = _uiState.update { it.copy(meetingTime = time) }

    fun onKidsCountChanged(count: String) = _uiState.update { it.copy(kidsCount = count.filter(Char::isDigit)) }

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

    fun onMemberSelected(userId: String, name: String, email: String) {
        val id = userId.toIntOrNull() ?: return
        viewModelScope.launch {
            runCatching { churchRepository.addLifeGroupMember(lifeGroupId.toInt(), id) }
                .onSuccess {
                    _uiState.update {
                        it.copy(members = it.members + LifeGroupMember(id, name, email), showAddMember = false)
                    }
                }.onFailure {
                    _uiState.update { it.copy(saveError = "Erro ao adicionar membro.") }
                }
        }
    }

    fun onRemoveMember(member: LifeGroupMember) {
        _uiState.update { it.copy(members = it.members.filterNot { m -> m.id == member.id }) }
        viewModelScope.launch {
            runCatching { churchRepository.removeLifeGroupMember(lifeGroupId.toInt(), member.id) }
        }
    }

    fun onSave() {
        val state = _uiState.value
        if (!state.canSave) return
        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, saveError = null) }
            runCatching {
                churchRepository.updateLifeGroup(
                    lifeGroupId.toInt(),
                    UpdateLifeGroupRequest(
                        name = state.name,
                        location = state.location.ifBlank { null },
                        meetingDay = state.meetingDay.ifBlank { null },
                        meetingTime = state.meetingTime.ifBlank { null },
                        kidsCount = state.kidsCount.toIntOrNull(),
                    ),
                )
            }.onSuccess {
                _uiState.update { it.copy(isSaving = false) }
                _effect.send(LifeGroupManageEffect.Dismiss)
            }.onFailure {
                _uiState.update { it.copy(isSaving = false, saveError = "Erro ao salvar. Tente novamente.") }
            }
        }
    }

    fun onCancel() {
        viewModelScope.launch { _effect.send(LifeGroupManageEffect.Dismiss) }
    }
}
