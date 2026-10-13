package br.church.paz.android.ui.features.lifegroupmeeting

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.model.LifeGroupMeetingEntry
import br.church.paz.shared.domain.model.LifeGroupMeetingEntryGroup
import br.church.paz.shared.domain.model.LifeGroupMeetingRules
import br.church.paz.shared.domain.model.UserRole
import br.church.paz.shared.domain.repository.AuthRepository
import br.church.paz.shared.domain.repository.ChurchRepository
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Entry of the Reunião flow from outside a group (Formulários list entry and the
 * `paz://form/life-group-reports` deep link). All rules live in `LifeGroupMeetingRules.resolveEntry`:
 * one led group opens its Reuniões directly, several (or admin/pastor/supervisor) show a picker.
 */
class LifeGroupMeetingEntryViewModel(
    private val churchRepository: ChurchRepository,
    private val authRepository: AuthRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(LifeGroupMeetingEntryUiState())
    val uiState: StateFlow<LifeGroupMeetingEntryUiState> = _uiState.asStateFlow()

    private val _effect = Channel<LifeGroupMeetingEntryEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val role: UserRole? = authRepository.currentUser()?.role
                val mine = churchRepository.getMyLifeGroups()
                val all = if (role == UserRole.admin || role == UserRole.pastor) churchRepository.getAllLifeGroups() else emptyList()
                val entry = LifeGroupMeetingRules.resolveEntry(role, mine, all)
                _uiState.update { it.copy(isLoading = false, entry = entry) }
                entry.directGroupId?.let { id -> entry.group(id)?.let { open(it, replaceEntry = true) } }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message ?: "Erro ao carregar seus grupos") }
            }
        }
    }

    fun onGroupTapped(group: LifeGroupMeetingEntryGroup) = open(group, replaceEntry = false)

    private fun open(
        group: LifeGroupMeetingEntryGroup,
        replaceEntry: Boolean,
    ) {
        viewModelScope.launch {
            _effect.send(
                LifeGroupMeetingEntryEffect.OpenMeetings(
                    lifeGroupId = group.group.id,
                    meetingDay = group.group.meetingDay,
                    canWrite = group.canWrite,
                    replaceEntry = replaceEntry,
                ),
            )
        }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(LifeGroupMeetingEntryEffect.NavigateBack) }
    }
}

data class LifeGroupMeetingEntryUiState(
    val isLoading: Boolean = true,
    val error: String? = null,
    val entry: LifeGroupMeetingEntry? = null,
)

sealed class LifeGroupMeetingEntryEffect {
    data object NavigateBack : LifeGroupMeetingEntryEffect()

    /** [replaceEntry]: a single group is opened in place of the (invisible) entry screen. */
    data class OpenMeetings(
        val lifeGroupId: Int,
        val meetingDay: String?,
        val canWrite: Boolean,
        val replaceEntry: Boolean,
    ) : LifeGroupMeetingEntryEffect()
}
