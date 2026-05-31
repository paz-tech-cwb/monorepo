package br.church.paz.shared.auth

interface TokenStorage {
    suspend fun save(pair: TokenPair)
    suspend fun read(): TokenPair?
    suspend fun clear()
}

expect fun createTokenStorage(): TokenStorage
