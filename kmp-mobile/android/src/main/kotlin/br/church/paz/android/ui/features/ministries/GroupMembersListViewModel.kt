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

/** Which parent entity [GroupMembersListScreen] is listing members for. */
enum class GroupMembersType { Ministry, LifeGroup }

data class GroupMemberItem(
    val id: Int,
    val name: String,
)

data class GroupMembersListUiState(
    val title: String = "",
    val members: List<GroupMemberItem> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null,
)

sealed class GroupMembersListEffect {
    data object NavigateBack : GroupMembersListEffect()
}

/**
 * Loads the members for a ministry or life group. No dedicated "members of
 * group X" endpoint exists yet — like [MinistryDetailViewModel] /
 * [LifeGroupDetailViewModel], this re-fetches the full list and reads the
 * `members` field already embedded on the matching [Ministry]/[LifeGroup].
 */
class GroupMembersListViewModel(
    private val groupId: String,
    private val groupType: GroupMembersType,
    private val churchRepository: ChurchRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(GroupMembersListUiState())
    val uiState: StateFlow<GroupMembersListUiState> = _uiState.asStateFlow()

    private val _effect = Channel<GroupMembersListEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        load()
    }

    private fun load() {
        viewModelScope.launch {
            when (groupType) {
                GroupMembersType.Ministry -> loadMinistryMembers()
                GroupMembersType.LifeGroup -> loadLifeGroupMembers()
            }
        }
    }

    private suspend fun loadMinistryMembers() {
        runCatching { churchRepository.getAllMinistries() }
            .onSuccess { ministries ->
                val ministry = ministries.find { it.id.toString() == groupId }
                _uiState.update {
                    it.copy(
                        title = ministry?.name ?: "Membros",
                        members = ministry?.members?.map { m -> GroupMemberItem(m.id, m.name) } ?: emptyList(),
                        isLoading = false,
                        error = if (ministry == null) "Ministério não encontrado" else null,
                    )
                }
            }.onFailure { e ->
                _uiState.update { it.copy(isLoading = false, error = e.message ?: "Erro ao carregar dados") }
            }
    }

    private suspend fun loadLifeGroupMembers() {
        runCatching { churchRepository.getAllLifeGroups() }
            .onSuccess { lifeGroups ->
                val group = lifeGroups.find { it.id.toString() == groupId }
                _uiState.update {
                    it.copy(
                        title = group?.name ?: "Membros",
                        members = group?.members?.map { m -> GroupMemberItem(m.id, m.name) } ?: emptyList(),
                        isLoading = false,
                        error = if (group == null) "Grupo não encontrado" else null,
                    )
                }
            }.onFailure { e ->
                _uiState.update { it.copy(isLoading = false, error = e.message ?: "Erro ao carregar dados") }
            }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(GroupMembersListEffect.NavigateBack) }
    }

    fun onRetry() {
        _uiState.update { it.copy(isLoading = true, error = null) }
        load()
    }
}
