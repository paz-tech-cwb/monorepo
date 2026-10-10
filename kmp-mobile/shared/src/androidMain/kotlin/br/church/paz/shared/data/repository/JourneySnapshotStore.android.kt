package br.church.paz.shared.data.repository

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.flow.first
import kotlinx.serialization.json.Json
import org.koin.core.component.KoinComponent
import org.koin.core.component.inject

actual fun createJourneySnapshotStore(): JourneySnapshotStore = DataStoreJourneySnapshotStore()

class DataStoreJourneySnapshotStore : JourneySnapshotStore, KoinComponent {
    private val dataStore: DataStore<Preferences> by inject()

    private fun keyFor(userId: String) = stringPreferencesKey("paz_journey_snapshot_$userId")

    override suspend fun read(userId: String): JourneyProgressSnapshot? {
        val json = dataStore.data.first()[keyFor(userId)] ?: return null
        return runCatching { Json.decodeFromString(JourneyProgressSnapshot.serializer(), json) }.getOrNull()
    }

    override suspend fun save(
        userId: String,
        snapshot: JourneyProgressSnapshot,
    ) {
        dataStore.edit { it[keyFor(userId)] = Json.encodeToString(JourneyProgressSnapshot.serializer(), snapshot) }
    }
}
