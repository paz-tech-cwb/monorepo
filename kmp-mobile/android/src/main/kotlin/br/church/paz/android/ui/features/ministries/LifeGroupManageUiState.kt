package br.church.paz.android.ui.features.ministries

import br.church.paz.shared.domain.model.LifeGroupMember
import br.church.paz.shared.domain.model.User

val LifeGroupMeetingDays =
    listOf("Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo", "Sem dia fixo")

data class LifeGroupManageUiState(
    val isLoading: Boolean = true,
    val error: String? = null,
    val name: String = "",
    val location: String = "",
    val meetingDay: String = "",
    val meetingTime: String = "",
    val kidsCount: String = "",
    val members: List<LifeGroupMember> = emptyList(),
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

sealed class LifeGroupManageEffect {
    data object Dismiss : LifeGroupManageEffect()
}
