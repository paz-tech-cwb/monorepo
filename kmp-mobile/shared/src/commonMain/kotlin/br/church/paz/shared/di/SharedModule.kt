package br.church.paz.shared.di

import br.church.paz.shared.auth.TokenStorage
import br.church.paz.shared.auth.createTokenStorage
import br.church.paz.shared.data.remote.createPazHttpClient
import br.church.paz.shared.data.repository.AcademyRepositoryImpl
import br.church.paz.shared.data.repository.AgendaRepositoryImpl
import br.church.paz.shared.data.repository.AuthRepositoryImpl
import br.church.paz.shared.data.repository.ChurchRepositoryImpl
import br.church.paz.shared.data.repository.FormsRepositoryImpl
import br.church.paz.shared.data.repository.HomeRepositoryImpl
import br.church.paz.shared.data.repository.MemberJourneyRepositoryImpl
import br.church.paz.shared.data.repository.UserRepositoryImpl
import br.church.paz.shared.data.repository.UserStore
import br.church.paz.shared.data.repository.createUserStore
import br.church.paz.shared.domain.repository.AcademyRepository
import br.church.paz.shared.domain.repository.AgendaRepository
import br.church.paz.shared.domain.repository.AuthRepository
import br.church.paz.shared.domain.repository.ChurchRepository
import br.church.paz.shared.domain.repository.FormsRepository
import br.church.paz.shared.domain.repository.HomeRepository
import br.church.paz.shared.domain.repository.MemberJourneyRepository
import br.church.paz.shared.domain.repository.UserRepository
import io.ktor.client.engine.HttpClientEngineFactory
import org.koin.dsl.module

val sharedAuthModule = module {
    single<TokenStorage> { createTokenStorage() }
    single<UserStore>    { createUserStore() }
}

val sharedNetworkModule = module {
    single {
        createPazHttpClient(
            tokenStorage = get(),
            baseUrl      = getProperty("BASE_URL", "http://10.0.2.2:3001"),
            engine       = get<HttpClientEngineFactory<*>>().create(),
            debug        = getProperty("DEBUG", "false") == "true",
        )
    }
}

val sharedRepositoryModule = module {
    single<AuthRepository>          { AuthRepositoryImpl(get(), get(), get()) }
    single<HomeRepository>          { HomeRepositoryImpl(get()) }
    single<AgendaRepository>        { AgendaRepositoryImpl(get()) }
    single<AcademyRepository>       { AcademyRepositoryImpl(get()) }
    single<UserRepository>          { UserRepositoryImpl(get()) }
    single<ChurchRepository>        { ChurchRepositoryImpl(get()) }
    single<MemberJourneyRepository> { MemberJourneyRepositoryImpl(get()) }
    single<FormsRepository>         { FormsRepositoryImpl(get()) }
}

val sharedModules = listOf(sharedAuthModule, sharedNetworkModule, sharedRepositoryModule)
