package br.church.paz.shared.data.repository

import br.church.paz.shared.auth.TokenPair
import br.church.paz.shared.domain.model.User
import br.church.paz.shared.domain.model.UserRole
import br.church.paz.shared.domain.repository.FormsRepository
import br.church.paz.shared.util.FakeTokenStorage
import br.church.paz.shared.util.FakeUserStore
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.client.engine.mock.respondError
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import br.church.paz.shared.data.remote.createPazHttpClient
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class AuthRepositoryTest {

    private val jsonHeaders = headersOf(HttpHeaders.ContentType, "application/json")
    private val fakeUser    = User(
        id      = "u1",
        name    = "João Silva",
        email   = "joao@paz.church",
        role    = UserRole.life_group_leader,
    )

    private fun successResponse(user: User, access: String = "acc", refresh: String = "ref") =
        """{"access_token":"$access","refresh_token":"$refresh","user":${Json.encodeToString(user)}}"""

    private fun wrappedSuccessResponse(user: User, access: String = "acc", refresh: String = "ref") =
        """{"data":${successResponse(user, access, refresh)}}"""

    private fun buildRepo(
        engineBlock: MockEngine.() -> Unit = {},
        response: String = successResponse(fakeUser),
        status: HttpStatusCode = HttpStatusCode.OK,
        formsRepository: FakeFormsRepository = FakeFormsRepository(),
    ): RepoFixture {
        val tokenStorage = FakeTokenStorage()
        val userStore    = FakeUserStore()
        val engine = MockEngine { respond(response, status, jsonHeaders) }
        val client = createPazHttpClient(tokenStorage, "http://test", engine)
        return RepoFixture(
            AuthRepositoryImpl(client, tokenStorage, userStore, formsRepository),
            tokenStorage,
            userStore,
            formsRepository,
        )
    }

    private data class RepoFixture(
        val repo: AuthRepositoryImpl,
        val tokenStorage: FakeTokenStorage,
        val userStore: FakeUserStore,
        val formsRepository: FakeFormsRepository,
    )

    @Test
    fun `socialLogin success saves tokens and user then returns user`() = runTest {
        val (repo, tokenStorage, userStore, formsRepository) = buildRepo()

        val result = repo.socialLogin("google-id-token", "google")

        assertTrue(result.isSuccess)
        assertEquals(fakeUser, result.getOrNull())
        assertEquals("acc", tokenStorage.read()?.access)
        assertEquals("ref", tokenStorage.read()?.refresh)
        assertEquals(fakeUser, userStore.read())
        // A new session must never inherit a forms/sectors cache from a previous one.
        assertTrue(formsRepository.clearCacheCalled)
    }

    @Test
    fun `socialLogin success accepts wrapped response payload`() = runTest {
        val (repo, tokenStorage, userStore) = buildRepo(response = wrappedSuccessResponse(fakeUser))

        val result = repo.socialLogin("google-id-token", "google")

        assertTrue(result.isSuccess)
        assertEquals(fakeUser, result.getOrNull())
        assertEquals("acc", tokenStorage.read()?.access)
        assertEquals("ref", tokenStorage.read()?.refresh)
        assertEquals(fakeUser, userStore.read())
    }

    @Test
    fun `socialLogin failure surfaces backend message instead of response shape error`() = runTest {
        val (repo, tokenStorage, _) = buildRepo(
            response = """{"statusCode":401,"message":"Invalid Firebase ID token"}""",
            status   = HttpStatusCode.Unauthorized,
        )

        val result = repo.socialLogin("bad-token", "google")

        assertTrue(result.isFailure)
        assertEquals("Invalid Firebase ID token", result.exceptionOrNull()?.message)
        assertNull(tokenStorage.read())
    }

    @Test
    fun `socialLogin failure returns failure result`() = runTest {
        val (repo, tokenStorage, _) = buildRepo(
            response = "Server Error",
            status   = HttpStatusCode.InternalServerError,
        )

        val result = repo.socialLogin("bad-token", "google")

        assertTrue(result.isFailure)
        assertNull(tokenStorage.read())
    }

    @Test
    fun `currentUser returns null when not logged in`() = runTest {
        val (repo, _, _) = buildRepo()
        assertNull(repo.currentUser())
    }

    @Test
    fun `currentUser returns user after successful login`() = runTest {
        val (repo, _, _) = buildRepo()
        repo.socialLogin("token", "google")
        assertEquals(fakeUser, repo.currentUser())
    }

    @Test
    fun `logout clears tokens and user store`() = runTest {
        val tokenStorage = FakeTokenStorage().also { it.save(TokenPair("a", "r")) }
        val userStore    = FakeUserStore().also    { it.save(fakeUser) }
        val engine = MockEngine { respond("{}", HttpStatusCode.OK, jsonHeaders) }
        val client = createPazHttpClient(tokenStorage, "http://test", engine)
        val formsRepository = FakeFormsRepository()
        val repo   = AuthRepositoryImpl(client, tokenStorage, userStore, formsRepository)

        val result = repo.logout()

        assertTrue(result.isSuccess)
        assertNull(tokenStorage.read())
        assertNull(userStore.read())
        assertTrue(formsRepository.clearCacheCalled)
    }

    @Test
    fun `logout succeeds even when network call fails`() = runTest {
        val tokenStorage = FakeTokenStorage().also { it.save(TokenPair("a", "r")) }
        val userStore    = FakeUserStore().also    { it.save(fakeUser) }
        val engine = MockEngine { respondError(HttpStatusCode.InternalServerError) }
        val client = createPazHttpClient(tokenStorage, "http://test", engine)
        val formsRepository = FakeFormsRepository()
        val repo   = AuthRepositoryImpl(client, tokenStorage, userStore, formsRepository)

        val result = repo.logout()

        // Logout should still clear local state even if server call fails
        assertTrue(result.isSuccess)
        assertNull(tokenStorage.read())
        assertNull(userStore.read())
        assertTrue(formsRepository.clearCacheCalled)
    }

    @Test
    fun `socialLogin request body includes client=mobile`() = runTest {
        var capturedBody: String? = null
        val tokenStorage = FakeTokenStorage()
        val userStore    = FakeUserStore()
        val engine = MockEngine { request ->
            capturedBody = (request.body as io.ktor.http.content.TextContent).text
            respond(successResponse(fakeUser), HttpStatusCode.OK, jsonHeaders)
        }
        val client = createPazHttpClient(tokenStorage, "http://test", engine)
        val repo   = AuthRepositoryImpl(client, tokenStorage, userStore, FakeFormsRepository())

        repo.socialLogin("google-id-token", "google")

        assertNotNull(capturedBody)
        assertTrue(
            capturedBody!!.contains("\"client\":\"mobile\""),
            "expected request body to include client=mobile, was: $capturedBody",
        )
    }
}

private class FakeFormsRepository : FormsRepository {
    override suspend fun getCatalog() = emptyList<br.church.paz.shared.domain.model.FormCatalogItem>()
    override suspend fun refreshCatalog() = emptyList<br.church.paz.shared.domain.model.FormCatalogItem>()
    override suspend fun searchUsers(query: String) = emptyList<User>()
    override suspend fun searchLifeGroups(query: String) = emptyList<br.church.paz.shared.domain.model.LifeGroupSummary>()
    override suspend fun searchSectors(query: String) = emptyList<br.church.paz.shared.domain.model.SectorSummary>()
    override suspend fun submitMemberRegistration(form: br.church.paz.shared.domain.model.MemberRegistrationForm) {}
    override suspend fun submitConversion(form: br.church.paz.shared.domain.model.ConversionForm) {}
    override suspend fun submitGuest(form: br.church.paz.shared.domain.model.GuestForm) {}
    override suspend fun submitMultiplication(form: br.church.paz.shared.domain.model.MultiplicationForm) {}
    override suspend fun submitServiceReport(form: br.church.paz.shared.domain.model.ServiceReportForm) {}
    override suspend fun submitCourse(form: br.church.paz.shared.domain.model.CourseForm) {}
    override suspend fun submitLifeGroupReport(form: br.church.paz.shared.domain.model.LifeGroupReportForm) {}
    override suspend fun submitSectorReport(form: br.church.paz.shared.domain.model.SectorSupervisorReportForm) {}
    override suspend fun submitAreaReport(form: br.church.paz.shared.domain.model.AreaSupervisorReportForm) {}
    override suspend fun getServiceReportSubmissions() = emptyList<br.church.paz.shared.domain.model.ServiceReportSubmission>()
    override suspend fun submitCasaDePazReport(form: br.church.paz.shared.domain.model.CasaDePazReportForm) {}
    override suspend fun getCasaDePazReportSubmissions() = emptyList<br.church.paz.shared.domain.model.CasaDePazReportSubmission>()
    override suspend fun updateCasaDePazReport(id: String, form: br.church.paz.shared.domain.model.CasaDePazReportForm) {}
    override suspend fun deleteCasaDePazReport(id: String) {}
    override suspend fun getCasaDePazCycles() = emptyList<br.church.paz.shared.domain.model.CasaDePazCycle>()

    var clearCacheCalled = false
    override fun clearCache() {
        clearCacheCalled = true
    }
}
