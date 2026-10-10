package br.church.paz.android.ui.features.account

import br.church.paz.shared.domain.model.User

data class AccountUiState(
    val user: User? = null,
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val isDarkMode: Boolean = false,
    val isGuestMode: Boolean = false,
    // Display-only — name of the member's filial (church). `null` while
    // loading or if it couldn't be resolved; the screen simply omits the
    // label in that case rather than erroring out.
    val churchName: String? = null,
)

sealed class AccountEffect {
    data object NavigateToEditProfile : AccountEffect()

    data object NavigateToMemberJourney : AccountEffect()

    data object NavigateToFormularios : AccountEffect()

    data object NavigateToGuestForm : AccountEffect()

    data object NavigateToMinistries : AccountEffect()

    data object NavigateToLifeGroups : AccountEffect()

    data object NavigateToReports : AccountEffect()

    data object NavigateToNotificationPrefs : AccountEffect()

    data object LoggedOut : AccountEffect()
}
