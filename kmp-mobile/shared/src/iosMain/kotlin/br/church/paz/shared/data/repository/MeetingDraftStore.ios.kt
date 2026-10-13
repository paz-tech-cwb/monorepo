package br.church.paz.shared.data.repository

import br.church.paz.shared.domain.model.LifeGroupMeetingDraft
import br.church.paz.shared.domain.repository.MeetingDraftStore
import platform.Foundation.NSUserDefaults

actual fun createMeetingDraftStore(): MeetingDraftStore = IosMeetingDraftStore()

class IosMeetingDraftStore : MeetingDraftStore {
    private val defaults = NSUserDefaults.standardUserDefaults

    override suspend fun read(
        userId: String,
        lifeGroupId: Int,
        date: String,
    ): LifeGroupMeetingDraft? = MeetingDraftStorage.decode(defaults.stringForKey(MeetingDraftStorage.key(userId, lifeGroupId, date)))

    override suspend fun save(
        userId: String,
        lifeGroupId: Int,
        date: String,
        draft: LifeGroupMeetingDraft,
    ) {
        defaults.setObject(MeetingDraftStorage.encode(draft), MeetingDraftStorage.key(userId, lifeGroupId, date))
    }

    override suspend fun clear(
        userId: String,
        lifeGroupId: Int,
        date: String,
    ) {
        defaults.removeObjectForKey(MeetingDraftStorage.key(userId, lifeGroupId, date))
    }

    override suspend fun clearAll() {
        defaults.dictionaryRepresentation().keys
            .mapNotNull { it as? String }
            .filter { MeetingDraftStorage.isDraftKey(it) }
            .forEach { defaults.removeObjectForKey(it) }
    }
}
