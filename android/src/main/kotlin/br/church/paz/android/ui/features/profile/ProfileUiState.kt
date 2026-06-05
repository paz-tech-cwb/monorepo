package br.church.paz.android.ui.features.profile

import br.church.paz.shared.domain.model.User

data class ProfileUiState(
    val user: User? = null,
    val isLoading: Boolean = true,
)

sealed class ProfileEffect {
    data object NavigateToEditProfile : ProfileEffect()

    data object NavigateToLogin : ProfileEffect()

    data object Logout : ProfileEffect()
}
