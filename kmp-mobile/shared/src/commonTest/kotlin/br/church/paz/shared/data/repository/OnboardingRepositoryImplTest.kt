package br.church.paz.shared.data.repository

import br.church.paz.shared.auth.TokenPair
import br.church.paz.shared.domain.model.CepLookupOutcome
import br.church.paz.shared.domain.model.OnboardingStep
import br.church.paz.shared.domain.model.User
import br.church.paz.shared.domain.model.UserAddressDetails
import br.church.paz.shared.domain.model.UserRole
import br.church.paz.shared.domain.model.DeviceToken
import br.church.paz.shared.domain.model.NotificationPreferences
import br.church.paz.shared.domain.model.UpdateNotificationPrefsDto
import br.church.paz.shared.domain.model.UpdateProfileRequest
import br.church.paz.shared.domain.repository.UserRepository
import br.church.paz.shared.util.FakeTokenStorage
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.client.engine.mock.respondError
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import br.church.paz.shared.data.remote.createPazHttpClient
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import kotlin.test.assertTrue

class OnboardingRepositoryImplTest {

    private val jsonHeaders = headersOf(HttpHeaders.ContentType, "application/json")

    private fun fakeUser(
        birthDate: String?,
        phoneNumber: String?,
        hasAddress: Boolean,
    ) = User(
        id = "u1",
        name = "João Silva",
        email = "joao@paz.church",
        role = UserRole.member,
        phone = phoneNumber,
        birthDate = birthDate,
        addressDetails = if (hasAddress) UserAddressDetails(street = "Rua Um") else null,
    )

    private fun buildRepo(
        birthDate: String? = null,
        phoneNumber: String? = null,
        hasAddress: Boolean = false,
        engineHandler: MockEngine.() -> Unit = {},
        response: String = "{}",
        status: HttpStatusCode = HttpStatusCode.OK,
    ): OnboardingRepositoryImpl {
        val userRepository = FakeUserRepository(fakeUser(birthDate, phoneNumber, hasAddress))
        val tokenStorage = FakeTokenStorage()
        val engine = MockEngine { respond(response, status, jsonHeaders) }
        val client = createPazHttpClient(tokenStorage, "http://test", engine)
        return OnboardingRepositoryImpl(client, userRepository)
    }

    @Test
    fun `missingSteps returns birthday whatsapp and address when user has none of them`() = runTest {
        val repository = buildRepo(birthDate = null, phoneNumber = null, hasAddress = false)

        val result = repository.missingSteps()

        assertEquals(
            listOf(OnboardingStep.Birthday, OnboardingStep.Whatsapp, OnboardingStep.Address),
            result,
        )
    }

    @Test
    fun `missingSteps is empty when user has all fields`() = runTest {
        val repository = buildRepo(birthDate = "1990-01-01", phoneNumber = "+5511999999999", hasAddress = true)

        val result = repository.missingSteps()

        assertEquals(emptyList(), result)
    }

    @Test
    fun `lookupCep returns Found for a valid response`() = runTest {
        val tokenStorage = FakeTokenStorage()
        val engine = MockEngine {
            respond(
                """{"logradouro":"Rua Um","bairro":"Centro","localidade":"Curitiba","uf":"PR"}""",
                HttpStatusCode.OK,
                jsonHeaders,
            )
        }
        val client = createPazHttpClient(tokenStorage, "http://test", engine)
        val repository = OnboardingRepositoryImpl(client, FakeUserRepository(null))

        val result = repository.lookupCep("80000-000")

        val found = result as CepLookupOutcome.Found
        assertEquals("Rua Um", found.result.street)
        assertEquals("Centro", found.result.neighborhood)
        assertEquals("Curitiba", found.result.city)
        assertEquals("PR", found.result.state)
    }

    @Test
    fun `lookupCep returns NotFound when ViaCEP reports erro`() = runTest {
        val tokenStorage = FakeTokenStorage()
        val engine = MockEngine { respond("""{"erro":true}""", HttpStatusCode.OK, jsonHeaders) }
        val client = createPazHttpClient(tokenStorage, "http://test", engine)
        val repository = OnboardingRepositoryImpl(client, FakeUserRepository(null))

        val result = repository.lookupCep("00000-000")

        assertEquals(CepLookupOutcome.NotFound, result)
    }

    @Test
    fun `lookupCep returns Error on network failure`() = runTest {
        val tokenStorage = FakeTokenStorage()
        val engine = MockEngine { respondError(HttpStatusCode.InternalServerError) }
        val client = createPazHttpClient(tokenStorage, "http://test", engine)
        val repository = OnboardingRepositoryImpl(client, FakeUserRepository(null))

        val result = repository.lookupCep("80000-000")

        assertTrue(result is CepLookupOutcome.Error)
    }

    @Test
    fun `submitBirthday returns success on 2xx`() = runTest {
        val repository = buildRepo(response = "{}", status = HttpStatusCode.OK)

        val result = repository.submitBirthday("1990-01-01")

        assertTrue(result.isSuccess)
    }

    @Test
    fun `submitBirthday sends birth_date in the serialized request body`() = runTest {
        var capturedBody: String? = null
        val tokenStorage = FakeTokenStorage()
        val engine = MockEngine { request ->
            capturedBody = (request.body as io.ktor.http.content.TextContent).text
            respond("{}", HttpStatusCode.OK, jsonHeaders)
        }
        val client = createPazHttpClient(tokenStorage, "http://test", engine)
        val repository = OnboardingRepositoryImpl(client, FakeUserRepository(null))

        val result = repository.submitBirthday("1990-01-01")

        assertTrue(result.isSuccess)
        assertTrue(capturedBody!!.contains("\"birth_date\":\"1990-01-01\""))
    }

    @Test
    fun `submitWhatsapp sends phone in the serialized request body`() = runTest {
        var capturedBody: String? = null
        val tokenStorage = FakeTokenStorage()
        val engine = MockEngine { request ->
            capturedBody = (request.body as io.ktor.http.content.TextContent).text
            respond("{}", HttpStatusCode.OK, jsonHeaders)
        }
        val client = createPazHttpClient(tokenStorage, "http://test", engine)
        val repository = OnboardingRepositoryImpl(client, FakeUserRepository(null))

        val result = repository.submitWhatsapp("+5511999999999")

        assertTrue(result.isSuccess)
        assertTrue(capturedBody!!.contains("\"phone\":\"+5511999999999\""))
    }

    @Test
    fun `missingSteps excludes a step just submitted successfully in the same session`() = runTest {
        val repository = buildRepo(birthDate = null, phoneNumber = "+5511999999999", hasAddress = true)

        val submitResult = repository.submitBirthday("1990-01-01")
        val result = repository.missingSteps()

        assertTrue(submitResult.isSuccess)
        assertEquals(emptyList(), result)
    }

    @Test
    fun `submitAddress sends hardcoded country and digits-only zip code`() = runTest {
        var capturedBody: String? = null
        val tokenStorage = FakeTokenStorage()
        val engine = MockEngine { request ->
            capturedBody = (request.body as io.ktor.http.content.TextContent).text
            respond("{}", HttpStatusCode.OK, jsonHeaders)
        }
        val client = createPazHttpClient(tokenStorage, "http://test", engine)
        val repository = OnboardingRepositoryImpl(client, FakeUserRepository(null))

        val result = repository.submitAddress(
            street = "Rua Um",
            number = "123",
            complement = null,
            neighborhood = "Centro",
            city = "Curitiba",
            state = "PR",
            zipCode = "80000-000",
        )

        assertTrue(result.isSuccess)
        assertTrue(capturedBody!!.contains("\"country\":\"Brasil\""))
        assertTrue(capturedBody!!.contains("\"zip_code\":\"80000000\""))
    }

    @Test
    fun `submitWhatsapp returns failure on non-2xx`() = runTest {
        val repository = buildRepo(response = "{}", status = HttpStatusCode.BadRequest)

        val result = repository.submitWhatsapp("+5511999999999")

        assertTrue(result.isFailure)
    }

    @Test
    fun `missingSteps reads GET users me rather than the cached login user`() = runTest {
        var requestedPath: String? = null
        val tokenStorage = FakeTokenStorage()
        val engine = MockEngine { request ->
            requestedPath = request.url.encodedPath
            respond(
                """{"id":10,"name":"João","email":"joao@paz.church","phone":null,""" +
                    """"birth_date":null,"address_details":null,"role":"member"}""",
                HttpStatusCode.OK,
                jsonHeaders,
            )
        }
        val client = createPazHttpClient(tokenStorage, "http://test", engine)
        val repository = OnboardingRepositoryImpl(client, UserRepositoryImpl(client))

        val result = repository.missingSteps()

        assertEquals("/api/users/me", requestedPath)
        assertEquals(
            listOf(OnboardingStep.Birthday, OnboardingStep.Whatsapp, OnboardingStep.Address),
            result,
        )
    }

    @Test
    fun `missingSteps sees fields the login response never carries`() = runTest {
        // Regression guard: `/auth/social-login` only returns id/name/email/picture/role,
        // so sourcing from that cache reported every step missing forever. `/users/me`
        // carries the real profile — an already-complete member needs no onboarding.
        val tokenStorage = FakeTokenStorage()
        val engine = MockEngine {
            respond(
                """{"id":10,"name":"João","email":"joao@paz.church","phone":"+5541999999999",""" +
                    """"birth_date":"1990-01-01","address_details":{"street":"Rua Um"},"role":"member"}""",
                HttpStatusCode.OK,
                jsonHeaders,
            )
        }
        val client = createPazHttpClient(tokenStorage, "http://test", engine)
        val repository = OnboardingRepositoryImpl(client, UserRepositoryImpl(client))

        assertEquals(emptyList(), repository.missingSteps())
    }

    @Test
    fun `missingSteps propagates a profile fetch failure instead of skipping onboarding`() = runTest {
        val tokenStorage = FakeTokenStorage()
        val engine = MockEngine { respond("{}", HttpStatusCode.OK, jsonHeaders) }
        val client = createPazHttpClient(tokenStorage, "http://test", engine)
        val repository = OnboardingRepositoryImpl(client, FakeUserRepository(null))

        assertFailsWith<IllegalStateException> { repository.missingSteps() }
    }

    @Test
    fun `lookupCep does not leak the bearer token to viacep`() = runTest {
        var authHeader: String? = null
        var requestedHost: String? = null
        val tokenStorage = FakeTokenStorage()
        tokenStorage.save(TokenPair("secret-access-token", "secret-refresh-token"))
        val engine = MockEngine { request ->
            requestedHost = request.url.host
            authHeader = request.headers[HttpHeaders.Authorization]
            respond("""{"logradouro":"Rua Um"}""", HttpStatusCode.OK, jsonHeaders)
        }
        val client = createPazHttpClient(tokenStorage, "http://test", engine)
        val repository = OnboardingRepositoryImpl(client, FakeUserRepository(null))

        repository.lookupCep("80000-000")

        assertEquals("viacep.com.br", requestedHost)
        assertNull(authHeader)
    }
}

/**
 * Minimal fake mirroring [UserRepository] for onboarding tests — only [getProfile]
 * (`GET /users/me`) is exercised by [OnboardingRepositoryImpl]; every other member
 * is unused here and throws if ever called. A `null` [user] simulates a failing
 * profile fetch.
 */
private class FakeUserRepository(private val user: User?) : UserRepository {
    var getProfileCallCount = 0
        private set

    override suspend fun getProfile(): User {
        getProfileCallCount++
        return user ?: throw IllegalStateException("profile fetch failed")
    }

    override suspend fun updateProfile(request: UpdateProfileRequest): User = throw NotImplementedError()

    override suspend fun getNotificationPreferences(): NotificationPreferences = throw NotImplementedError()

    override suspend fun updateNotificationPreferences(dto: UpdateNotificationPrefsDto) =
        throw NotImplementedError()

    override suspend fun registerDeviceToken(token: DeviceToken) = throw NotImplementedError()

    override suspend fun removeDeviceToken(tokenId: String) = throw NotImplementedError()
}
