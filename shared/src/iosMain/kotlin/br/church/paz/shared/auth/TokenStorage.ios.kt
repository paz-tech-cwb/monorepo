package br.church.paz.shared.auth

/**
 * Platform Keychain operations implemented in Swift and injected at app startup.
 *
 * Kotlin/Native's CoreFoundation bridging for `SecItemCopyMatching` proved
 * unreliable (errSecParam / -50 on reads), so Keychain access is delegated to a
 * Swift implementation via this interface. Set [IosKeychainProvider.keychain]
 * from the iOS app before any repository is used.
 */
interface PlatformKeychain {
    fun set(key: String, value: String)
    fun get(key: String): String?
    fun remove(key: String)
}

object IosKeychainProvider {
    lateinit var keychain: PlatformKeychain
}

actual fun createTokenStorage(): TokenStorage =
    KeychainTokenStorage(IosKeychainProvider.keychain)

class KeychainTokenStorage(private val keychain: PlatformKeychain) : TokenStorage {

    override suspend fun save(pair: TokenPair) {
        keychain.set(KEY_ACCESS, pair.access)
        keychain.set(KEY_REFRESH, pair.refresh)
        keychain.set(KEY_PROVIDER, pair.provider)
    }

    override suspend fun read(): TokenPair? {
        val access = keychain.get(KEY_ACCESS) ?: return null
        val refresh = keychain.get(KEY_REFRESH) ?: return null
        val provider = keychain.get(KEY_PROVIDER) ?: ""
        return TokenPair(access, refresh, provider)
    }

    override suspend fun clear() {
        keychain.remove(KEY_ACCESS)
        keychain.remove(KEY_REFRESH)
        keychain.remove(KEY_PROVIDER)
    }

    private companion object {
        const val KEY_ACCESS = "paz_tok_access"
        const val KEY_REFRESH = "paz_tok_refresh"
        const val KEY_PROVIDER = "paz_tok_provider"
    }
}
