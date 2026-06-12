package br.church.paz.android.di

import br.church.paz.android.ui.features.academy.AcademyViewModel
import br.church.paz.android.ui.features.academy.VideoPlayerViewModel
import br.church.paz.android.ui.features.account.AccountViewModel
import br.church.paz.android.ui.features.agenda.AgendaDetailViewModel
import br.church.paz.android.ui.features.agenda.AgendaListViewModel
import br.church.paz.android.ui.features.auth.LoginViewModel
import br.church.paz.android.ui.features.formularios.FormDetailViewModel
import br.church.paz.android.ui.features.formularios.FormulariosViewModel
import br.church.paz.android.ui.features.home.HomeViewModel
import br.church.paz.android.ui.features.memberjourney.MemberJourneyViewModel
import br.church.paz.android.ui.features.ministries.LifeGroupDetailViewModel
import br.church.paz.android.ui.features.ministries.MinistriesViewModel
import br.church.paz.android.ui.features.ministries.MinistryDetailViewModel
import br.church.paz.android.ui.features.notifications.NotificationPrefsViewModel
import br.church.paz.android.ui.features.profile.EditProfileViewModel
import br.church.paz.android.ui.features.profile.ProfileViewModel
import br.church.paz.android.ui.features.search.SearchViewModel
import br.church.paz.android.ui.features.splash.SplashViewModel
import br.church.paz.android.ui.theme.AppThemeManager
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

val androidModule =
    module {
        single { AppThemeManager() }
        viewModel { SplashViewModel(get()) }
        viewModel { LoginViewModel(get()) }
        viewModel { HomeViewModel(get(), get()) }
        viewModel { AcademyViewModel(get(), get()) }
        viewModel { (videoId: String) -> VideoPlayerViewModel(videoId) }
        viewModel { AccountViewModel(get(), get()) }
        viewModel { ProfileViewModel(get()) }
        viewModel { EditProfileViewModel(get(), get()) }
        viewModel { (eventId: String) -> AgendaDetailViewModel(get(), eventId) }
        viewModel { AgendaListViewModel(get()) } // get() resolves AgendaRepository
        viewModel { FormulariosViewModel(get()) }
        viewModel { (formId: String) -> FormDetailViewModel(formId, get(), get()) }
        viewModel { MemberJourneyViewModel(get()) }
        viewModel { NotificationPrefsViewModel(get()) }
        viewModel { SearchViewModel(get(), get(), get(), get()) }
        viewModel { MinistriesViewModel(get()) }
        viewModel { (ministryId: String) -> MinistryDetailViewModel(ministryId, get()) }
        viewModel { (lifeGroupId: String) -> LifeGroupDetailViewModel(lifeGroupId, get()) }
    }
