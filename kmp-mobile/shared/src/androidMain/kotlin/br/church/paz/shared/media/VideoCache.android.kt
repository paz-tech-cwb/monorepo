package br.church.paz.shared.media

import android.content.Context
import java.io.File
import org.koin.core.component.KoinComponent
import org.koin.core.component.inject

private object AndroidCacheDirProvider : KoinComponent {
    val context: Context by inject()
}

actual fun cacheFilePath(fileName: String): String =
    File(AndroidCacheDirProvider.context.cacheDir, fileName).absolutePath

actual fun cacheFileExists(fileName: String): Boolean {
    val file = File(cacheFilePath(fileName))
    return file.exists() && file.length() > 0
}

actual fun writeCacheFile(fileName: String, bytes: ByteArray) {
    // Write to a temp file first and rename atomically so a concurrent reader (e.g. VideoCache's
    // own cacheFileExists check on the next app launch) never observes a partially-written file.
    val target = File(cacheFilePath(fileName))
    val tempFile = File(cacheFilePath("$fileName.tmp"))
    tempFile.writeBytes(bytes)
    tempFile.renameTo(target)
}
