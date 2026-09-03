package br.church.paz.shared.util

import br.church.paz.shared.auth.TokenPair
import br.church.paz.shared.auth.TokenStorage

class FakeTokenStorage : TokenStorage {
    private var stored: TokenPair? = null
    var saveCallCount = 0
    var clearCallCount = 0

    override suspend fun save(pair: TokenPair) { stored = pair; saveCallCount++ }
    override suspend fun read(): TokenPair?    = stored
    override suspend fun clear()               { stored = null; clearCallCount++ }
}
