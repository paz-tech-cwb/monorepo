package br.church.paz.shared.media

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.request.get
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** Absolute path a cache file for [fileName] would live at, whether or not it exists yet. */
expect fun cacheFilePath(fileName: String): String

/** True only when a non-empty file already exists at [cacheFilePath] for [fileName]. */
expect fun cacheFileExists(fileName: String): Boolean

/** Writes [bytes] to the cache file for [fileName], replacing any existing content. */
expect fun writeCacheFile(fileName: String, bytes: ByteArray)

/**
 * Downloads and locally caches a small remote asset (e.g. the onboarding welcome video) so it's
 * ready to play instantly once the user reaches the step that needs it, instead of streaming it
 * live and stalling on a slow connection.
 *
 * A plain, unauthenticated [HttpClient] is used deliberately rather than the shared
 * [br.church.paz.shared.data.remote.PazHttpClient] — this downloads a public static asset (not a
 * backend API call), so pulling in [br.church.paz.shared.auth.TokenStorage] would be unnecessary
 * coupling.
 */
object VideoCache {
    private val client by lazy {
        HttpClient {
            install(HttpTimeout) {
                requestTimeoutMillis = 30_000
                connectTimeoutMillis = 10_000
            }
        }
    }

    /** The local cached path for [url] if it has already been prefetched, else `null`. */
    fun cachedFilePath(url: String): String? {
        val fileName = fileNameFor(url)
        return cacheFilePath(fileName).takeIf { cacheFileExists(fileName) }
    }

    /**
     * Downloads [url] into the local cache if not already present. Best-effort: any failure
     * (offline, timeout, server error) is swallowed — callers fall back to streaming the remote
     * URL directly, so a failed prefetch is never user-visible on its own.
     */
    suspend fun prefetch(url: String) {
        val fileName = fileNameFor(url)
        if (cacheFileExists(fileName)) return
        withContext(Dispatchers.Default) {
            runCatching {
                val bytes: ByteArray = client.get(url).body()
                writeCacheFile(fileName, bytes)
            }
        }
    }

    /**
     * Derives a filesystem-safe cache filename from [url]. Strips any query/fragment, then keeps
     * only alphanumerics/`.`/`-`/`_` and drops leading dots — defense in depth against a
     * mangled or malicious URL producing something like `..` or `../../etc/passwd` as the
     * "filename", which would otherwise resolve outside the cache directory when joined with it.
     */
    private fun fileNameFor(url: String): String {
        val rawName = url.substringAfterLast('/').substringBefore('?').substringBefore('#')
        val safeChars = rawName.filter { it.isLetterOrDigit() || it == '.' || it == '-' || it == '_' }
        return safeChars.trimStart('.').ifBlank { "prefetched-video" }
    }
}
