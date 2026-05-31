package br.church.paz.android.di

import br.church.paz.android.ui.features.auth.LoginViewModel
import br.church.paz.android.ui.features.splash.SplashViewModel
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

val androidModule = module {
    viewModel { SplashViewModel(get()) }
    viewModel { LoginViewModel(get()) }
}
