package br.church.paz.shared.util

import br.church.paz.shared.data.repository.MeetingDraftStorage
import br.church.paz.shared.domain.model.LifeGroupMeetingDraft
import br.church.paz.shared.domain.repository.MeetingDraftStore

/** In-memory [MeetingDraftStore] that keeps the real key layout and JSON codec. */
class FakeMeetingDraftStore : MeetingDraftStore {
    val raw = mutableMapOf<String, String>()
    var clearAllCalls = 0

    override suspend fun read(
        userId: String,
        lifeGroupId: Int,
        date: String,
    ): LifeGroupMeetingDraft? = MeetingDraftStorage.decode(raw[MeetingDraftStorage.key(userId, lifeGroupId, date)])

    override suspend fun save(
        userId: String,
        lifeGroupId: Int,
        date: String,
        draft: LifeGroupMeetingDraft,
    ) {
        raw[MeetingDraftStorage.key(userId, lifeGroupId, date)] = MeetingDraftStorage.encode(draft)
    }

    override suspend fun clear(
        userId: String,
        lifeGroupId: Int,
        date: String,
    ) {
        raw.remove(MeetingDraftStorage.key(userId, lifeGroupId, date))
    }

    override suspend fun clearAll() {
        clearAllCalls++
        raw.keys.filter { MeetingDraftStorage.isDraftKey(it) }.forEach { raw.remove(it) }
    }
}
