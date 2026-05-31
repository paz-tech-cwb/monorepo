package br.church.paz.android.di

import br.church.paz.android.ui.features.account.AccountViewModel
import br.church.paz.android.ui.features.academy.AcademyViewModel
import br.church.paz.android.ui.features.auth.LoginViewModel
import br.church.paz.android.ui.features.home.HomeViewModel
import br.church.paz.android.ui.features.profile.EditProfileViewModel
import br.church.paz.android.ui.features.profile.ProfileViewModel
import br.church.paz.android.ui.features.splash.SplashViewModel
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

val androidModule = module {
    viewModel { SplashViewModel(get()) }
    viewModel { LoginViewModel(get()) }
    viewModel { HomeViewModel(get(), get()) }
    viewModel { AcademyViewModel(get()) }
    viewModel { AccountViewModel(get()) }
    viewModel { ProfileViewModel(get()) }
    viewModel { EditProfileViewModel(get(), get()) }
}
