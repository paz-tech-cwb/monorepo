package br.church.paz.shared.data.repository

import br.church.paz.shared.domain.model.LifeGroupMeetingDraft
import br.church.paz.shared.domain.repository.MeetingDraftStore
import kotlinx.serialization.json.Json

/** Platform storage of unsaved meeting edits: DataStore (Android) / NSUserDefaults (iOS). */
expect fun createMeetingDraftStore(): MeetingDraftStore

/** Key layout and JSON codec shared by the platform [MeetingDraftStore] implementations. */
object MeetingDraftStorage {
    const val KEY_PREFIX = "paz_meeting_draft_"

    private val json = Json { ignoreUnknownKeys = true }

    /** One entry per (user, group, date): a different account never reads another's draft. */
    fun key(
        userId: String,
        lifeGroupId: Int,
        date: String,
    ): String = "$KEY_PREFIX${userId}_${lifeGroupId}_$date"

    fun isDraftKey(key: String): Boolean = key.startsWith(KEY_PREFIX)

    fun encode(draft: LifeGroupMeetingDraft): String = json.encodeToString(LifeGroupMeetingDraft.serializer(), draft)

    /** Null when [raw] is missing or corrupt (a bad draft is dropped, never crashes the screen). */
    fun decode(raw: String?): LifeGroupMeetingDraft? =
        raw?.let { runCatching { json.decodeFromString(LifeGroupMeetingDraft.serializer(), it) }.getOrNull() }
}
