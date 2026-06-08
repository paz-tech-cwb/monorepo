package br.church.paz.shared.auth

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.flow.first
import org.koin.core.component.KoinComponent
import org.koin.core.component.inject

actual fun createTokenStorage(): TokenStorage = DataStoreTokenStorage()

class DataStoreTokenStorage : TokenStorage, KoinComponent {
    private val dataStore: DataStore<Preferences> by inject()

    private val KEY_ACCESS   = stringPreferencesKey("paz_tok_access")
    private val KEY_REFRESH  = stringPreferencesKey("paz_tok_refresh")
    private val KEY_PROVIDER = stringPreferencesKey("paz_tok_provider")

    override suspend fun save(pair: TokenPair) {
        dataStore.edit {
            it[KEY_ACCESS]   = pair.access
            it[KEY_REFRESH]  = pair.refresh
            it[KEY_PROVIDER] = pair.provider
        }
    }

    override suspend fun read(): TokenPair? {
        val prefs = dataStore.data.first()
        val a = prefs[KEY_ACCESS]  ?: return null
        val r = prefs[KEY_REFRESH] ?: return null
        val p = prefs[KEY_PROVIDER] ?: ""
        return TokenPair(a, r, p)
    }

    override suspend fun clear() {
        dataStore.edit { it.clear() }
    }
}
