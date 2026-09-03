package br.church.paz.android.ui.features.auth

data class LoginUiState(
    val isLoading: Boolean = false,
)

sealed class LoginEffect {
    data object NavigateToHome : LoginEffect()

    data class ShowError(
        val message: String,
    ) : LoginEffect()
}
