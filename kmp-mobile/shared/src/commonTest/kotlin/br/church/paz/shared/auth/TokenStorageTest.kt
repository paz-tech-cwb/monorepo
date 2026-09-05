package br.church.paz.shared.auth

import br.church.paz.shared.util.FakeTokenStorage
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class TokenStorageTest {

    private val storage = FakeTokenStorage()

    @Test
    fun `save and read round-trips the token pair`() = runTest {
        storage.save(TokenPair(access = "acc-1", refresh = "ref-1"))
        val result = storage.read()
        assertEquals("acc-1", result?.access)
        assertEquals("ref-1", result?.refresh)
    }

    @Test
    fun `read returns null before any save`() = runTest {
        assertNull(storage.read())
    }

    @Test
    fun `clear removes stored tokens`() = runTest {
        storage.save(TokenPair("a", "r"))
        storage.clear()
        assertNull(storage.read())
    }

    @Test
    fun `save overwrites existing tokens`() = runTest {
        storage.save(TokenPair("old-acc", "old-ref"))
        storage.save(TokenPair("new-acc", "new-ref"))
        val result = storage.read()
        assertEquals("new-acc", result?.access)
        assertEquals("new-ref", result?.refresh)
    }

    @Test
    fun `clear increments clearCallCount`() = runTest {
        storage.clear()
        storage.clear()
        assertEquals(2, storage.clearCallCount)
    }
}
