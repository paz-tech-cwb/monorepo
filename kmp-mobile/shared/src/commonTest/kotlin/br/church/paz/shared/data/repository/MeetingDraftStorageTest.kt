package br.church.paz.shared.data.repository

import br.church.paz.shared.domain.model.LifeGroupMeetingDraft
import br.church.paz.shared.domain.model.LifeGroupMeetingDraftEntry
import br.church.paz.shared.domain.model.LifeGroupMeetingReportDraft
import br.church.paz.shared.util.FakeMeetingDraftStore
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class MeetingDraftStorageTest {
    private val draft =
        LifeGroupMeetingDraft(
            attendance = listOf(LifeGroupMeetingDraftEntry(1, true), LifeGroupMeetingDraftEntry(2, false)),
            report = LifeGroupMeetingReportDraft(guests = "3", offering = "10,5"),
            extraMeeting = true,
        )

    @Test
    fun `key is scoped by user group and date`() {
        val key = MeetingDraftStorage.key("u1", 7, "2026-10-07")
        assertEquals("paz_meeting_draft_u1_7_2026-10-07", key)
        assertTrue(MeetingDraftStorage.isDraftKey(key))
        assertFalse(MeetingDraftStorage.isDraftKey("paz_journey_snapshot_u1"))
    }

    @Test
    fun `encode decode round trips and tolerates corrupt data`() {
        assertEquals(draft, MeetingDraftStorage.decode(MeetingDraftStorage.encode(draft)))
        assertNull(MeetingDraftStorage.decode(null))
        assertNull(MeetingDraftStorage.decode("{not json"))
    }

    @Test
    fun `an empty draft encodes defaults away and decodes back`() {
        val empty = LifeGroupMeetingDraft()
        assertTrue(empty.isEmpty)
        assertEquals(empty, MeetingDraftStorage.decode(MeetingDraftStorage.encode(empty)))
    }

    @Test
    fun `store keeps drafts per user and clearAll removes them all`() =
        runTest {
            val store = FakeMeetingDraftStore()
            store.save("u1", 7, "2026-10-07", draft)
            store.save("u2", 7, "2026-10-07", LifeGroupMeetingDraft(extraMeeting = true))

            assertEquals(draft, store.read("u1", 7, "2026-10-07"))
            assertEquals(true, store.read("u2", 7, "2026-10-07")?.extraMeeting)
            assertNull(store.read("u1", 8, "2026-10-07"))

            store.clear("u1", 7, "2026-10-07")
            assertNull(store.read("u1", 7, "2026-10-07"))

            store.clearAll()
            assertNull(store.read("u2", 7, "2026-10-07"))
        }
}
