@file:OptIn(kotlinx.cinterop.ExperimentalForeignApi::class)

package br.church.paz.shared.auth

import kotlinx.cinterop.alloc
import kotlinx.cinterop.memScoped
import kotlinx.cinterop.ptr
import kotlinx.cinterop.value
import platform.CoreFoundation.CFDataRef
import platform.CoreFoundation.CFDictionaryRef
import platform.CoreFoundation.CFStringRef
import platform.CoreFoundation.CFStringCreateExternalRepresentation
import platform.CoreFoundation.CFStringCreateFromExternalRepresentation
import platform.CoreFoundation.CFTypeRefVar
import platform.CoreFoundation.kCFStringEncodingUTF8
import platform.Foundation.CFBridgingRelease
import platform.Foundation.NSCopyingProtocol
import platform.Foundation.NSData
import platform.Foundation.NSMutableDictionary
import platform.Foundation.NSNumber
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
        SecItemDelete(query as CFDictionaryRef)
        query.setObject(data, forKey = cfKey(kSecValueData))
        SecItemAdd(query as CFDictionaryRef, null)
    }

    private fun keychainGet(key: String): String? = memScoped {
        val query = NSMutableDictionary()
        query.setObject(kSecClassGenericPassword, forKey = cfKey(kSecClass))
        query.setObject(service, forKey = cfKey(kSecAttrService))
        query.setObject(key, forKey = cfKey(kSecAttrAccount))
        query.setObject(NSNumber(bool = true), forKey = cfKey(kSecReturnData))
        query.setObject(kSecMatchLimitOne, forKey = cfKey(kSecMatchLimit))
        val result = alloc<CFTypeRefVar>()
        val status = SecItemCopyMatching(query as CFDictionaryRef, result.ptr)
        if (status != errSecSuccess) return null
        val data = CFBridgingRelease(result.value) as? NSData ?: return null
        decodeUtf8(data)
    }

    private fun keychainDelete(key: String) {
        val query = NSMutableDictionary()
        query.setObject(kSecClassGenericPassword, forKey = cfKey(kSecClass))
        query.setObject(service, forKey = cfKey(kSecAttrService))
        query.setObject(key, forKey = cfKey(kSecAttrAccount))
        SecItemDelete(query as CFDictionaryRef)
    }

    @Suppress("UNCHECKED_CAST")
    private fun cfKey(ref: CFStringRef?): NSCopyingProtocol =
        CFBridgingRelease(ref) as NSCopyingProtocol

    @Suppress("UNCHECKED_CAST")
    private fun encodeUtf8(value: String): NSData? {
        val cfStr = value as? CFStringRef ?: return null
        val cfData = CFStringCreateExternalRepresentation(null, cfStr, kCFStringEncodingUTF8, 0u)
            ?: return null
        return CFBridgingRelease(cfData) as? NSData
    }

    @Suppress("UNCHECKED_CAST")
    private fun decodeUtf8(data: NSData): String? {
        val cfData = data as? CFDataRef ?: return null
        val cfStr = CFStringCreateFromExternalRepresentation(null, cfData, kCFStringEncodingUTF8)
            ?: return null
        return CFBridgingRelease(cfStr) as? String
    }
}
