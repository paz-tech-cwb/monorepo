@file:OptIn(kotlinx.cinterop.ExperimentalForeignApi::class, kotlinx.cinterop.BetaInteropApi::class)

package br.church.paz.shared.auth

import kotlinx.cinterop.alloc
import kotlinx.cinterop.memScoped
import kotlinx.cinterop.ptr
import kotlinx.cinterop.value
import platform.CoreFoundation.CFDictionaryRef
import platform.CoreFoundation.CFRelease
import platform.CoreFoundation.CFStringRef
import platform.CoreFoundation.CFTypeRefVar
import platform.Foundation.CFBridgingRelease
import platform.Foundation.CFBridgingRetain
import platform.Foundation.NSCopyingProtocol
import platform.Foundation.NSData
import platform.Foundation.NSMutableDictionary
import platform.Foundation.NSNumber
import platform.Foundation.NSString
import platform.Foundation.NSUTF8StringEncoding
import platform.Foundation.create
import platform.Foundation.dataUsingEncoding
import platform.Security.SecItemAdd
import platform.Security.SecItemCopyMatching
import platform.Security.SecItemDelete
import platform.Security.errSecSuccess
import platform.Security.kSecAttrAccount
import platform.Security.kSecAttrService
import platform.Security.kSecClass
import platform.Security.kSecClassGenericPassword
import platform.Security.kSecMatchLimit
import platform.Security.kSecMatchLimitOne
import platform.Security.kSecReturnData
import platform.Security.kSecValueData

actual fun createTokenStorage(): TokenStorage = KeychainTokenStorage()

class KeychainTokenStorage : TokenStorage {
    private val service = "br.church.paz.mobile"

    override suspend fun save(pair: TokenPair) {
        keychainSet("paz_tok_access", pair.access)
        keychainSet("paz_tok_refresh", pair.refresh)
        keychainSet("paz_tok_provider", pair.provider)
    }

    override suspend fun read(): TokenPair? {
        val a = keychainGet("paz_tok_access") ?: return null
        val r = keychainGet("paz_tok_refresh") ?: return null
        val p = keychainGet("paz_tok_provider") ?: ""
        return TokenPair(a, r, p)
    }

    override suspend fun clear() {
        keychainDelete("paz_tok_access")
        keychainDelete("paz_tok_refresh")
        keychainDelete("paz_tok_provider")
    }

    private fun keychainSet(key: String, value: String) {
        val data = encodeUtf8(value) ?: return
        val query = NSMutableDictionary()
        query.setObject(kSecClassGenericPassword, forKey = cfKey(kSecClass))
        query.setObject(service, forKey = cfKey(kSecAttrService))
        query.setObject(key, forKey = cfKey(kSecAttrAccount))
        withCFDictionary(query) { SecItemDelete(it) }
        query.setObject(data, forKey = cfKey(kSecValueData))
        val addStatus = withCFDictionary(query) { SecItemAdd(it, null) }
        if (addStatus != errSecSuccess) {
            println("[Keychain] SecItemAdd failed for key=$key status=$addStatus")
        }
    }

    private fun keychainGet(key: String): String? = memScoped {
        val query = NSMutableDictionary()
        query.setObject(kSecClassGenericPassword, forKey = cfKey(kSecClass))
        query.setObject(service, forKey = cfKey(kSecAttrService))
        query.setObject(key, forKey = cfKey(kSecAttrAccount))
        query.setObject(NSNumber(bool = true), forKey = cfKey(kSecReturnData))
        query.setObject(kSecMatchLimitOne, forKey = cfKey(kSecMatchLimit))
        val result = alloc<CFTypeRefVar>()
        val status = withCFDictionary(query) { SecItemCopyMatching(it, result.ptr) }
        if (status != errSecSuccess) return null
        val data = CFBridgingRelease(result.value) as? NSData ?: return null
        decodeUtf8(data)
    }

    private fun keychainDelete(key: String) {
        val query = NSMutableDictionary()
        query.setObject(kSecClassGenericPassword, forKey = cfKey(kSecClass))
        query.setObject(service, forKey = cfKey(kSecAttrService))
        query.setObject(key, forKey = cfKey(kSecAttrAccount))
        withCFDictionary(query) { SecItemDelete(it) }
    }

    /** Bridges an NSMutableDictionary to CFDictionaryRef for Keychain API calls. */
    private inline fun <T> withCFDictionary(dict: NSMutableDictionary, block: (CFDictionaryRef) -> T): T {
        @Suppress("UNCHECKED_CAST")
        val cfDict = CFBridgingRetain(dict) as CFDictionaryRef
        return try {
            block(cfDict)
        } finally {
            CFRelease(cfDict)
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun cfKey(ref: CFStringRef?): NSCopyingProtocol =
        CFBridgingRelease(ref) as NSCopyingProtocol

    private fun encodeUtf8(value: String): NSData? =
        (value as NSString).dataUsingEncoding(NSUTF8StringEncoding)

    private fun decodeUtf8(data: NSData): String? =
        NSString.create(data = data, encoding = NSUTF8StringEncoding) as? String
}
