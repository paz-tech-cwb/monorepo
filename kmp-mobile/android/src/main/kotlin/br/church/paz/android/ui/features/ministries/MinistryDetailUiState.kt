package br.church.paz.android.ui.features.ministries

import br.church.paz.shared.domain.model.Ministry

data class MinistryDetailUiState(
    val ministry: Ministry? = null,
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val error: String? = null,
    // Any leadership role (role.isLeader) — matches iOS `MinistryDetailView.canManage`
    // and the backend's actual RolesGuard authorization on the manage endpoints.
    val canManage: Boolean = false,
)

data class LifeGroupDetailUiState(
    val lifeGroup: br.church.paz.shared.domain.model.LifeGroup? = null,
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val error: String? = null,
    // Only the group's leader or co-leader may record attendance — this has
    // no dedicated role slug, so it's resolved by comparing the current
    // user's id against the group's leader_id/co_leader_id directly.
    val canManageAttendance: Boolean = false,
    // Any leadership role (role.isLeader) can view analytics/reports — a
    // broader gate than canManageAttendance, which is scoped to just this
    // group's own leader/co-leader.
    val canManage: Boolean = false,
    // The signed-in member's upcoming assigned tasks in this group ("Minhas tarefas").
    val myTasks: List<br.church.paz.shared.domain.model.LifeGroupTask> = emptyList(),
)

sealed class MinistryDetailEffect {
    data object NavigateBack : MinistryDetailEffect()

    data class NavigateToManage(
        val ministryId: String,
    ) : MinistryDetailEffect()
}

sealed class LifeGroupDetailEffect {
    data object NavigateBack : LifeGroupDetailEffect()

    data class NavigateToTask(
        val assignmentId: String,
    ) : LifeGroupDetailEffect()

    data class NavigateToTaskMembers(
        val lifeGroupId: String,
    ) : LifeGroupDetailEffect()

    data class NavigateToManage(
        val lifeGroupId: String,
    ) : LifeGroupDetailEffect()
}
