package br.church.paz.android.ui.features.ministries

import br.church.paz.shared.domain.model.LifeGroup
import br.church.paz.shared.domain.model.Ministry
import br.church.paz.shared.domain.model.User

data class MinistriesUiState(
    val ministries: List<Ministry> = emptyList(),
    val lifeGroups: List<LifeGroup> = emptyList(),
    val selectedTab: MinistriesTab = MinistriesTab.Ministries,
    val isLoading: Boolean = true,
    val error: String? = null,
    val canManage: Boolean = false,
    val createForm: MinistryCreateFormState? = null,
)

enum class MinistriesTab { Ministries, LifeGroups }

/** State for the "create ministry" bottom sheet form. */
data class MinistryCreateFormState(
    val name: String = "",
    val description: String = "",
    val leaderId: Int? = null,
    val leaderName: String = "",
    val coLeaderId: Int? = null,
    val coLeaderName: String = "",
    val membershipMode: String = "teams",
    val leaderSearchQuery: String = "",
    val leaderSearchResults: List<User> = emptyList(),
    val isSearchingLeader: Boolean = false,
    val coLeaderSearchQuery: String = "",
    val coLeaderSearchResults: List<User> = emptyList(),
    val isSearchingCoLeader: Boolean = false,
    val isSaving: Boolean = false,
    val error: String? = null,
) {
    val canSubmit: Boolean
        get() = name.isNotBlank() && leaderId != null && !isSaving
}

sealed class MinistriesEffect {
    data object NavigateBack : MinistriesEffect()

    data class NavigateToMinistryDetail(
        val ministryId: String,
    ) : MinistriesEffect()

    data class NavigateToLifeGroupDetail(
        val lifeGroupId: String,
    ) : MinistriesEffect()
}
