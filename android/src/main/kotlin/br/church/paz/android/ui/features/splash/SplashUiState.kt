package br.church.paz.android.ui.features.splash

sealed class SplashEffect {
    data object NavigateToLogin : SplashEffect()
    data object NavigateToHome  : SplashEffect()
}
