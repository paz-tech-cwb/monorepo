package br.church.paz.android.ui.features.account

import br.church.paz.shared.domain.model.User

data class AccountUiState(
    val user: User? = null,
    val isLoading: Boolean = true,
    val isDarkMode: Boolean = false,
    val isGuestMode: Boolean = false,
)

sealed class AccountEffect {
    data object NavigateToEditProfile : AccountEffect()

    data object NavigateToMemberJourney : AccountEffect()

    data object NavigateToFormularios : AccountEffect()

    data object NavigateToMinistries : AccountEffect()

    data object NavigateToNotificationPrefs : AccountEffect()

    data object LoggedOut : AccountEffect()
}
