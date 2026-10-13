package br.church.paz.shared.data.repository

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import br.church.paz.shared.domain.model.LifeGroupMeetingDraft
import br.church.paz.shared.domain.repository.MeetingDraftStore
import kotlinx.coroutines.flow.first
import org.koin.core.component.KoinComponent
import org.koin.core.component.inject

actual fun createMeetingDraftStore(): MeetingDraftStore = DataStoreMeetingDraftStore()

class DataStoreMeetingDraftStore : MeetingDraftStore, KoinComponent {
    private val dataStore: DataStore<Preferences> by inject()

    override suspend fun read(
        userId: String,
        lifeGroupId: Int,
        date: String,
    ): LifeGroupMeetingDraft? {
        val raw = dataStore.data.first()[stringPreferencesKey(MeetingDraftStorage.key(userId, lifeGroupId, date))]
        return MeetingDraftStorage.decode(raw)
    }

    override suspend fun save(
        userId: String,
        lifeGroupId: Int,
        date: String,
        draft: LifeGroupMeetingDraft,
    ) {
        dataStore.edit {
            it[stringPreferencesKey(MeetingDraftStorage.key(userId, lifeGroupId, date))] = MeetingDraftStorage.encode(draft)
        }
    }

    override suspend fun clear(
        userId: String,
        lifeGroupId: Int,
        date: String,
    ) {
        dataStore.edit { it.remove(stringPreferencesKey(MeetingDraftStorage.key(userId, lifeGroupId, date))) }
    }

    override suspend fun clearAll() {
        dataStore.edit { prefs ->
            val names = prefs.asMap().keys.map { it.name }.filter { MeetingDraftStorage.isDraftKey(it) }
            names.forEach { prefs.remove(stringPreferencesKey(it)) }
        }
    }
}
