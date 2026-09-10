package br.church.paz.shared.di

import br.church.paz.shared.auth.createTokenStorage
import br.church.paz.shared.data.remote.createPazHttpClient
import br.church.paz.shared.data.repository.AcademyRepositoryImpl
import br.church.paz.shared.data.repository.AgendaRepositoryImpl
import br.church.paz.shared.data.repository.AuthRepositoryImpl
import br.church.paz.shared.data.repository.ChurchRepositoryImpl
import br.church.paz.shared.data.repository.FormsRepositoryImpl
import br.church.paz.shared.data.repository.HomeRepositoryImpl
import br.church.paz.shared.data.repository.LifeGroupAnalyticsRepositoryImpl
import br.church.paz.shared.data.repository.LifeGroupAttendanceRepositoryImpl
import br.church.paz.shared.data.repository.LifeGroupStudyRepositoryImpl
import br.church.paz.shared.data.repository.MemberJourneyRepositoryImpl
import br.church.paz.shared.data.repository.UserRepositoryImpl
import br.church.paz.shared.data.repository.createUserStore
import br.church.paz.shared.domain.model.User
import br.church.paz.shared.domain.repository.AcademyRepository
import br.church.paz.shared.domain.repository.AgendaRepository
import br.church.paz.shared.domain.repository.AuthRepository
import br.church.paz.shared.domain.repository.BirthDateRequiredException
import br.church.paz.shared.domain.repository.ChurchRepository
import br.church.paz.shared.domain.repository.FormsRepository
import br.church.paz.shared.domain.repository.HomeRepository
import br.church.paz.shared.domain.repository.LifeGroupAnalyticsRepository
import br.church.paz.shared.domain.repository.LifeGroupAttendanceRepository
import br.church.paz.shared.domain.repository.LifeGroupStudyRepository
import br.church.paz.shared.domain.repository.MemberJourneyRepository
import br.church.paz.shared.domain.repository.UserRepository
import io.ktor.client.engine.darwin.Darwin

object IosAppContainer {

    // localhost works because iOS Simulator shares the host Mac's network stack.
    // Physical-device testing needs a LAN-reachable address instead — override
    // IosAppContainer.shared.baseUrl at launch (e.g. via a scheme env var) rather
    // than hardcoding a DHCP-assigned IP here, since it will change across networks.
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
    val agendaRepository: AgendaRepository by lazy { AgendaRepositoryImpl(httpClient) }
    val academyRepository: AcademyRepository by lazy { AcademyRepositoryImpl(httpClient) }
    val userRepository: UserRepository by lazy { UserRepositoryImpl(httpClient) }
    val churchRepository: ChurchRepository by lazy { ChurchRepositoryImpl(httpClient) }
    val memberJourneyRepository: MemberJourneyRepository by lazy { MemberJourneyRepositoryImpl(httpClient) }
    val formsRepository: FormsRepository by lazy { FormsRepositoryImpl(httpClient) }
    val lifeGroupStudyRepository: LifeGroupStudyRepository by lazy { LifeGroupStudyRepositoryImpl(httpClient) }
    val lifeGroupAttendanceRepository: LifeGroupAttendanceRepository by lazy {
        LifeGroupAttendanceRepositoryImpl(httpClient)
    }
    val lifeGroupAnalyticsRepository: LifeGroupAnalyticsRepository by lazy {
        LifeGroupAnalyticsRepositoryImpl(httpClient)
    }

    // iOS-friendly wrappers that throw on failure instead of returning Result<T>
    // BirthDateRequiredException must be listed explicitly (not just Exception::class) for
    // Kotlin/Native to export it as a distinctly-catchable Swift type — a generic @Throws(Exception::class)
    // only bridges failures as an opaque NSError that `catch let e as BirthDateRequiredException` can't match.
    @Throws(BirthDateRequiredException::class, Exception::class)
    suspend fun socialLogin(idToken: String, provider: String, birthDate: String? = null): User =
        authRepository.socialLogin(idToken, provider, birthDate).getOrThrow()

    @Throws(Exception::class)
    suspend fun logout(fcmToken: String?) {
        authRepository.logout(fcmToken).getOrThrow()
    }
}
