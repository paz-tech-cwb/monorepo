package br.church.paz.android.ui.features.auth

data class LoginUiState(
    val isLoading: Boolean = false,
    // True once sign-in succeeds (or fails with BirthDateRequiredException) and the
    // member-onboarding flow (welcome video, birthday, WhatsApp, address) still has
    // steps left to collect.
    val showOnboarding: Boolean = false,
    // True when showOnboarding was triggered by a BirthDateRequiredException rather than
    // a normal successful sign-in — the onboarding flow's Birthday step must then complete
    // the pending sign-in instead of calling OnboardingRepository.submitBirthday directly.
    val onboardingStartsAtBirthday: Boolean = false,
)

sealed class LoginEffect {
    data object NavigateToHome : LoginEffect()

    data class ShowError(
        val message: String,
    ) : LoginEffect()
}
