package br.church.paz.android.ui.features.ministries

import br.church.paz.shared.domain.model.LifeGroup
import br.church.paz.shared.domain.model.Ministry

data class MinistriesUiState(
    val ministries: List<Ministry> = emptyList(),
    val lifeGroups: List<LifeGroup> = emptyList(),
    val selectedTab: MinistriesTab = MinistriesTab.Ministries,
    val isLoading: Boolean = true,
    val error: String? = null,
)

enum class MinistriesTab { Ministries, LifeGroups }

sealed class MinistriesEffect {
    data object NavigateBack : MinistriesEffect()
    data class NavigateToMinistryDetail(val ministryId: String) : MinistriesEffect()
    data class NavigateToLifeGroupDetail(val lifeGroupId: String) : MinistriesEffect()
}
