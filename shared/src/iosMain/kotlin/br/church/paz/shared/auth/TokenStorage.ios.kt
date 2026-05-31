package br.church.paz.shared.auth

import platform.Foundation.NSUserDefaults

// TODO Phase 5: replace with Keychain via Security framework cinterop.
// NSUserDefaults is used as a placeholder to unblock iOS compilation.
// Keychain impl: SecItemAdd / SecItemCopyMatching / SecItemDelete.
actual fun createTokenStorage(): TokenStorage = IosTokenStorage()

class IosTokenStorage : TokenStorage {
    private val defaults = NSUserDefaults.standardUserDefaults

    override suspend fun save(pair: TokenPair) {
        defaults.setObject(pair.access,  "paz_tok_access")
        defaults.setObject(pair.refresh, "paz_tok_refresh")
    }

    override suspend fun read(): TokenPair? {
        val a = defaults.stringForKey("paz_tok_access")  ?: return null
        val r = defaults.stringForKey("paz_tok_refresh") ?: return null
        return TokenPair(a, r)
    }

    override suspend fun clear() {
        defaults.removeObjectForKey("paz_tok_access")
        defaults.removeObjectForKey("paz_tok_refresh")
    }
}
