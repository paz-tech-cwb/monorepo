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

    private val KEY_ACCESS  = stringPreferencesKey("paz_tok_access")
    private val KEY_REFRESH = stringPreferencesKey("paz_tok_refresh")

    override suspend fun save(pair: TokenPair) {
        dataStore.edit {
            it[KEY_ACCESS]  = pair.access
            it[KEY_REFRESH] = pair.refresh
        }
    }

    override suspend fun read(): TokenPair? {
        val prefs = dataStore.data.first()
        val a = prefs[KEY_ACCESS]  ?: return null
        val r = prefs[KEY_REFRESH] ?: return null
        return TokenPair(a, r)
    }

    override suspend fun clear() {
        dataStore.edit { it.clear() }
    }
}
