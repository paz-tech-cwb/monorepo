package br.church.paz.shared.data.repository

import br.church.paz.shared.auth.TokenPair
import br.church.paz.shared.domain.model.User
import br.church.paz.shared.domain.model.UserRole
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

    private fun buildRepo(
        engineBlock: MockEngine.() -> Unit = {},
        response: String = successResponse(fakeUser),
        status: HttpStatusCode = HttpStatusCode.OK,
    ): Triple<AuthRepositoryImpl, FakeTokenStorage, FakeUserStore> {
        val tokenStorage = FakeTokenStorage()
        val userStore    = FakeUserStore()
        val engine = MockEngine { respond(response, status, jsonHeaders) }
        val client = createPazHttpClient(tokenStorage, "http://test", engine)
        return Triple(AuthRepositoryImpl(client, tokenStorage, userStore), tokenStorage, userStore)
    }

    @Test
    fun `socialLogin success saves tokens and user, returns user`() = runTest {
        val (repo, tokenStorage, userStore) = buildRepo()

        val result = repo.socialLogin("google-id-token", "google")

        assertTrue(result.isSuccess)
        assertEquals(fakeUser, result.getOrNull())
        assertEquals("acc", tokenStorage.read()?.access)
        assertEquals("ref", tokenStorage.read()?.refresh)
        assertEquals(fakeUser, userStore.read())
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
        val repo   = AuthRepositoryImpl(client, tokenStorage, userStore)

        val result = repo.logout()

        assertTrue(result.isSuccess)
        assertNull(tokenStorage.read())
        assertNull(userStore.read())
    }

    @Test
    fun `logout succeeds even when network call fails`() = runTest {
        val tokenStorage = FakeTokenStorage().also { it.save(TokenPair("a", "r")) }
        val userStore    = FakeUserStore().also    { it.save(fakeUser) }
        val engine = MockEngine { respondError(HttpStatusCode.InternalServerError) }
        val client = createPazHttpClient(tokenStorage, "http://test", engine)
        val repo   = AuthRepositoryImpl(client, tokenStorage, userStore)

        val result = repo.logout()

        // Logout should still clear local state even if server call fails
        assertTrue(result.isSuccess)
        assertNull(tokenStorage.read())
        assertNull(userStore.read())
    }
}
