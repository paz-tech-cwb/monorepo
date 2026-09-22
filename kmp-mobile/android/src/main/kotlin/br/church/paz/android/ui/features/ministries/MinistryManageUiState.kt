package br.church.paz.android.ui.features.ministries

import br.church.paz.shared.domain.model.MinistryUser
import br.church.paz.shared.domain.model.User

data class MinistryManageUiState(
    val isLoading: Boolean = true,
    val error: String? = null,
    val name: String = "",
    val description: String = "",
    val members: List<MinistryUser> = emptyList(),
    val isSaving: Boolean = false,
    val saveError: String? = null,
    val showAddMember: Boolean = false,
    val addMemberQuery: String = "",
    val addMemberResults: List<User> = emptyList(),
    val isSearchingMembers: Boolean = false,
) {
    val canSave: Boolean
        get() = !isSaving && name.isNotBlank()
}

sealed class MinistryManageEffect {
    data object Dismiss : MinistryManageEffect()
}
