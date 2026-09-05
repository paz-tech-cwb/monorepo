package br.church.paz.shared.data.repository

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import br.church.paz.shared.domain.model.User
import kotlinx.coroutines.flow.first
import kotlinx.serialization.json.Json
import org.koin.core.component.KoinComponent
import org.koin.core.component.inject

actual fun createUserStore(): UserStore = DataStoreUserStore()

class DataStoreUserStore : UserStore, KoinComponent {
    private val dataStore: DataStore<Preferences> by inject()
    private val KEY = stringPreferencesKey("paz_user_json")

    override suspend fun save(user: User) {
        dataStore.edit { it[KEY] = Json.encodeToString(User.serializer(), user) }
    }

    override suspend fun read(): User? {
        val json = dataStore.data.first()[KEY] ?: return null
        return runCatching { Json.decodeFromString(User.serializer(), json) }.getOrNull()
    }

    override suspend fun clear() {
        dataStore.edit { it.remove(KEY) }
    }
}
