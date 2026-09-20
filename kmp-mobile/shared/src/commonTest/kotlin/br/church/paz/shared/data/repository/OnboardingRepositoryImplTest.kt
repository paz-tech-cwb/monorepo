package br.church.paz.shared.data.repository

import br.church.paz.shared.auth.TokenPair
import br.church.paz.shared.domain.model.CepLookupOutcome
import br.church.paz.shared.domain.model.OnboardingStep
import br.church.paz.shared.domain.model.User
import br.church.paz.shared.domain.model.UserAddressDetails
import br.church.paz.shared.domain.model.UserRole
import br.church.paz.shared.domain.repository.AuthRepository
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
        val authRepository = FakeAuthRepository(fakeUser(birthDate, phoneNumber, hasAddress))
        val tokenStorage = FakeTokenStorage()
        val engine = MockEngine { respond(response, status, jsonHeaders) }
        val client = createPazHttpClient(tokenStorage, "http://test", engine)
        return OnboardingRepositoryImpl(client, authRepository)
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
        val repository = OnboardingRepositoryImpl(client, FakeAuthRepository(null))

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
        val repository = OnboardingRepositoryImpl(client, FakeAuthRepository(null))

        val result = repository.lookupCep("00000-000")

        assertEquals(CepLookupOutcome.NotFound, result)
    }

    @Test
    fun `lookupCep returns Error on network failure`() = runTest {
        val tokenStorage = FakeTokenStorage()
        val engine = MockEngine { respondError(HttpStatusCode.InternalServerError) }
        val client = createPazHttpClient(tokenStorage, "http://test", engine)
        val repository = OnboardingRepositoryImpl(client, FakeAuthRepository(null))

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
        val repository = OnboardingRepositoryImpl(client, FakeAuthRepository(null))

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
        val repository = OnboardingRepositoryImpl(client, FakeAuthRepository(null))

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
        val repository = OnboardingRepositoryImpl(client, FakeAuthRepository(null))

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
}

/**
 * Minimal fake mirroring [AuthRepository] for onboarding tests — only
 * [currentUser] is exercised by [OnboardingRepositoryImpl]; every other
 * member is unused here and throws if ever called.
 */
private class FakeAuthRepository(private val user: User?) : AuthRepository {
    override suspend fun socialLogin(idToken: String, provider: String, birthDate: String?): Result<User> =
        throw NotImplementedError()

    override suspend fun logout(fcmToken: String?): Result<Unit> = throw NotImplementedError()

    override suspend fun currentUser(): User? = user

    override suspend fun storedTokens(): TokenPair? = throw NotImplementedError()
}
