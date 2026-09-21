@file:OptIn(ExperimentalForeignApi::class, BetaInteropApi::class)

package br.church.paz.shared.media

import kotlinx.cinterop.BetaInteropApi
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.addressOf
import kotlinx.cinterop.usePinned
import platform.Foundation.NSCachesDirectory
import platform.Foundation.NSData
import platform.Foundation.NSFileManager
import platform.Foundation.NSNumber
import platform.Foundation.NSSearchPathForDirectoriesInDomains
import platform.Foundation.NSTemporaryDirectory
import platform.Foundation.NSUserDomainMask
import platform.Foundation.create
import platform.Foundation.writeToFile

private fun cachesDirectory(): String =
    (NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, true).firstOrNull() as? String)
        ?: NSTemporaryDirectory()

actual fun cacheFilePath(fileName: String): String = "${cachesDirectory()}/$fileName"

actual fun cacheFileExists(fileName: String): Boolean {
    val path = cacheFilePath(fileName)
    if (!NSFileManager.defaultManager.fileExistsAtPath(path)) return false
    val attributes = NSFileManager.defaultManager.attributesOfItemAtPath(path, error = null)
    val size = (attributes?.get("NSFileSize") as? NSNumber)?.longLongValue ?: 0L
    return size > 0
}

actual fun writeCacheFile(fileName: String, bytes: ByteArray) {
    val path = cacheFilePath(fileName)
    val data =
        bytes.usePinned {
            NSData.create(bytes = it.addressOf(0), length = bytes.size.toULong())
        }
    data.writeToFile(path, atomically = true)
}
