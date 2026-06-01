package br.church.paz.shared.di

import br.church.paz.shared.auth.createTokenStorage
import br.church.paz.shared.data.remote.createPazHttpClient
import br.church.paz.shared.data.repository.AcademyRepositoryImpl
import br.church.paz.shared.data.repository.AuthRepositoryImpl
import br.church.paz.shared.data.repository.ChurchRepositoryImpl
import br.church.paz.shared.data.repository.FormsRepositoryImpl
import br.church.paz.shared.data.repository.HomeRepositoryImpl
import br.church.paz.shared.data.repository.MemberJourneyRepositoryImpl
import br.church.paz.shared.data.repository.UserRepositoryImpl
import br.church.paz.shared.data.repository.createUserStore
import br.church.paz.shared.domain.model.User
import br.church.paz.shared.domain.repository.AcademyRepository
import br.church.paz.shared.domain.repository.AuthRepository
import br.church.paz.shared.domain.repository.ChurchRepository
import br.church.paz.shared.domain.repository.FormsRepository
import br.church.paz.shared.domain.repository.HomeRepository
import br.church.paz.shared.domain.repository.MemberJourneyRepository
import br.church.paz.shared.domain.repository.UserRepository
import io.ktor.client.engine.darwin.Darwin

object IosAppContainer {

    var baseUrl: String = "http://localhost:3001/api"

    private val tokenStorage by lazy { createTokenStorage() }
    private val userStore by lazy { createUserStore() }

    private val httpClient by lazy {
        createPazHttpClient(
            tokenStorage = tokenStorage,
            baseUrl = baseUrl,
            engine = Darwin.create(),
            debug = false,
        )
    }

    val authRepository: AuthRepository by lazy {
        AuthRepositoryImpl(httpClient, tokenStorage, userStore)
    }

    val homeRepository: HomeRepository by lazy { HomeRepositoryImpl(httpClient) }
    val academyRepository: AcademyRepository by lazy { AcademyRepositoryImpl(httpClient) }
    val userRepository: UserRepository by lazy { UserRepositoryImpl(httpClient) }
    val churchRepository: ChurchRepository by lazy { ChurchRepositoryImpl(httpClient) }
    val memberJourneyRepository: MemberJourneyRepository by lazy { MemberJourneyRepositoryImpl(httpClient) }
    val formsRepository: FormsRepository by lazy { FormsRepositoryImpl(httpClient) }

    // iOS-friendly wrappers that throw on failure instead of returning Result<T>
    @Throws(Exception::class)
    suspend fun socialLogin(idToken: String, provider: String): User =
        authRepository.socialLogin(idToken, provider).getOrThrow()

    @Throws(Exception::class)
    suspend fun logout() {
        authRepository.logout().getOrThrow()
    }
}
