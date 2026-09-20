package br.church.paz.android.ui.features.auth

data class LoginUiState(
    val isLoading: Boolean = false,
    val needsBirthDate: Boolean = false,
    // True once sign-in succeeds and the member-onboarding flow (welcome video,
    // birthday, WhatsApp, address) still has steps left to collect.
    val showOnboarding: Boolean = false,
)

sealed class LoginEffect {
    data object NavigateToHome : LoginEffect()

    data class ShowError(
        val message: String,
    ) : LoginEffect()
}
