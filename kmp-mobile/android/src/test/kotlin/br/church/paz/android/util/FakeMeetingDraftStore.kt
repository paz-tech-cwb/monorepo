package br.church.paz.android.util

import br.church.paz.shared.domain.model.LifeGroupMeetingDraft
import br.church.paz.shared.domain.repository.MeetingDraftStore

/** In-memory [MeetingDraftStore] keyed like the real one: (user, group, date). */
class FakeMeetingDraftStore : MeetingDraftStore {
    val drafts = mutableMapOf<Triple<String, Int, String>, LifeGroupMeetingDraft>()

    override suspend fun read(
        userId: String,
        lifeGroupId: Int,
        date: String,
    ): LifeGroupMeetingDraft? = drafts[Triple(userId, lifeGroupId, date)]

    override suspend fun save(
        userId: String,
        lifeGroupId: Int,
        date: String,
        draft: LifeGroupMeetingDraft,
    ) {
        drafts[Triple(userId, lifeGroupId, date)] = draft
    }

    override suspend fun clear(
        userId: String,
        lifeGroupId: Int,
        date: String,
    ) {
        drafts.remove(Triple(userId, lifeGroupId, date))
    }

    override suspend fun clearAll() {
        drafts.clear()
    }
}
