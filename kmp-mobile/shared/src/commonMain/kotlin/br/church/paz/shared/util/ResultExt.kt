package br.church.paz.shared.util

import kotlinx.coroutines.CancellationException

/**
 * Like [runCatching] but re-throws [CancellationException] so structured
 * concurrency cancellation propagates correctly.
 */
inline fun <T> safeRunCatching(block: () -> T): Result<T> {
    return try {
        Result.success(block())
    } catch (e: CancellationException) {
        throw e
    } catch (e: Throwable) {
        Result.failure(e)
    }
}

/** Re-throws [CancellationException] from a failed [Result]. */
fun <T> Result<T>.rethrowCancellation(): Result<T> {
    val ex = exceptionOrNull()
    if (ex is CancellationException) throw ex
    return this
}
