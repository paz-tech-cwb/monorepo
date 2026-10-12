package br.church.paz.android.ui.features.lifegrouptasks

import br.church.paz.shared.domain.model.LifeGroupTask

data class LifeGroupTaskGuideUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val task: LifeGroupTask? = null,
    val error: String? = null,
    val showDeclineConfirm: Boolean = false,
    val isDeclining: Boolean = false,
    val declineError: String? = null,
    // Set once the member gave the task back; the screen then shows a confirmation instead of
    // the guide. `declineReassigned` tells whether the backend found another member.
    val declined: Boolean = false,
    val declineReassigned: Boolean = false,
)

sealed class LifeGroupTaskGuideEffect {
    data object NavigateBack : LifeGroupTaskGuideEffect()
}
