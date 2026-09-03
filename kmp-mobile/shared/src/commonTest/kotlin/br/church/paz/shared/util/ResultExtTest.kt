package br.church.paz.shared.util

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class ResultExtTest {

    @Test
    fun `safeRunCatching returns success for normal result`() = runTest {
        val result = safeRunCatching { 42 }
        assertTrue(result.isSuccess)
        assertEquals(42, result.getOrNull())
    }

    @Test
    fun `safeRunCatching wraps non-cancellation exceptions`() = runTest {
        val result = safeRunCatching { throw IllegalStateException("boom") }
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is IllegalStateException)
    }

    @Test
    fun `safeRunCatching rethrows CancellationException`() = runTest {
        assertFailsWith<CancellationException> {
            safeRunCatching { throw CancellationException("cancelled") }
        }
    }
}
