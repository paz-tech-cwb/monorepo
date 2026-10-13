package br.church.paz.android.ui.features.ministries

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.model.LifeGroupMeetingRules
import br.church.paz.shared.domain.model.LifeGroupTask
import br.church.paz.shared.domain.model.LifeGroupTaskStatus
import br.church.paz.shared.domain.model.UserRole
import br.church.paz.shared.domain.model.isLeader
import br.church.paz.shared.domain.repository.AuthRepository
import br.church.paz.shared.domain.repository.ChurchRepository
import br.church.paz.shared.domain.repository.LifeGroupTaskRepository
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class MinistryDetailViewModel(
    private val ministryId: String,
    private val churchRepository: ChurchRepository,
    private val authRepository: AuthRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(MinistryDetailUiState())
    val uiState: StateFlow<MinistryDetailUiState> = _uiState.asStateFlow()

    private val _effect = Channel<MinistryDetailEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        load()
    }

    /** Pull-to-refresh entry point — re-invokes the same load path without the full-screen skeleton. */
    fun refresh() = load(showSkeleton = false)

    private fun load(showSkeleton: Boolean = true) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = showSkeleton, isRefreshing = !showSkeleton) }
            val currentUser = runCatching { authRepository.currentUser() }.getOrNull()
            runCatching { churchRepository.getAllMinistries() }
                .onSuccess { ministries ->
                    val ministry = ministries.find { it.id.toString() == ministryId }
                    _uiState.update {
                        it.copy(
                            ministry = ministry,
                            isLoading = false,
                            isRefreshing = false,
                            error = if (ministry == null) "Ministério não encontrado" else null,
                            canManage = currentUser?.role?.isLeader == true,
                        )
                    }
                }.onFailure { e ->
                    _uiState.update {
                        it.copy(isLoading = false, isRefreshing = false, error = e.message ?: "Erro ao carregar")
                    }
                }
        }
    }

    fun onManageTap() {
        viewModelScope.launch { _effect.send(MinistryDetailEffect.NavigateToManage(ministryId)) }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(MinistryDetailEffect.NavigateBack) }
    }
}

class LifeGroupDetailViewModel(
    private val lifeGroupId: String,
    private val churchRepository: ChurchRepository,
    private val authRepository: AuthRepository,
    private val taskRepository: LifeGroupTaskRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(LifeGroupDetailUiState())
    val uiState: StateFlow<LifeGroupDetailUiState> = _uiState.asStateFlow()

    private val _effect = Channel<LifeGroupDetailEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        load()
    }

    /** Pull-to-refresh entry point — re-invokes the same load path without the full-screen skeleton. */
    fun refresh() = load(showSkeleton = false)

    private fun load(showSkeleton: Boolean = true) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = showSkeleton, isRefreshing = !showSkeleton) }
            val currentUser = runCatching { authRepository.currentUser() }.getOrNull()
            val currentUserId = currentUser?.id?.toIntOrNull()
            // Best-effort: "Minhas tarefas" is additive, so a failure must not break the screen.
            val myTasks = loadMyTasksForThisGroup()
            runCatching { churchRepository.getAllLifeGroups() }
                .onSuccess { lifeGroups ->
                    val group = lifeGroups.find { it.id.toString() == lifeGroupId }
                    val canManageAttendance =
                        currentUserId != null &&
                            group != null &&
                            (group.leaderId == currentUserId || group.coLeaderId == currentUserId)
                    _uiState.update {
                        it.copy(
                            lifeGroup = group,
                            isLoading = false,
                            isRefreshing = false,
                            error = if (group == null) "Grupo não encontrado" else null,
                            canManageAttendance = canManageAttendance,
                            canManage = currentUser?.role?.isLeader == true,
                            canViewGroupReports = canViewLifeGroupReports(currentUser?.role, canManageAttendance),
                            canWriteMeetings = LifeGroupMeetingRules.canWrite(currentUser?.role, canManageAttendance),
                            myTasks = myTasks,
                        )
                    }
                }.onFailure { e ->
                    _uiState.update {
                        it.copy(isLoading = false, isRefreshing = false, error = e.message ?: "Erro ao carregar")
                    }
                }
        }
    }

    // The member's upcoming assigned tasks (backend returns today onward), scoped to this group
    // and ordered by meeting date.
    private suspend fun loadMyTasksForThisGroup(): List<LifeGroupTask> =
        try {
            taskRepository
                .getMyTasks()
                .filter { it.lifeGroupId.toString() == lifeGroupId && it.status == LifeGroupTaskStatus.ASSIGNED }
                .sortedBy { it.meetingDate }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            emptyList()
        }

    fun onReportsTap() {
        viewModelScope.launch { _effect.send(LifeGroupDetailEffect.NavigateToReports(lifeGroupId)) }
    }

    fun onManageTap() {
        viewModelScope.launch { _effect.send(LifeGroupDetailEffect.NavigateToManage(lifeGroupId)) }
    }

    fun onTaskTap(assignmentId: String) {
        viewModelScope.launch { _effect.send(LifeGroupDetailEffect.NavigateToTask(assignmentId)) }
    }

    fun onTaskMembersTap() {
        viewModelScope.launch { _effect.send(LifeGroupDetailEffect.NavigateToTaskMembers(lifeGroupId)) }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(LifeGroupDetailEffect.NavigateBack) }
    }
}

/**
 * Who sees the per-group "Relatórios" / "Relatórios semanais" entries: this group's own
 * leader/co-leader ([isGroupLeadership], by id — works for a co-leader whose role is `member`),
 * or admin/pastor/area leader/sector leader (the client cannot know their scope; the backend
 * answers 403/404 for out-of-scope groups). A `life_group_leader` of ANOTHER group, plain
 * members, disciplers and guests never see them. The backend stays the source of truth.
 */
internal fun canViewLifeGroupReports(
    role: UserRole?,
    isGroupLeadership: Boolean,
): Boolean =
    isGroupLeadership ||
        role == UserRole.admin ||
        role == UserRole.pastor ||
        role == UserRole.area_leader ||
        role == UserRole.sector_leader
