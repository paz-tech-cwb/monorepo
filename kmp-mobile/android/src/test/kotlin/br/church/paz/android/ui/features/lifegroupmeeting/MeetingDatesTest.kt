package br.church.paz.android.ui.features.lifegroupmeeting

import br.church.paz.android.navigation.Screen
import br.church.paz.android.notifications.PushNotificationHelper
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class MeetingDatesTest {
    @Test
    fun `iso and picker millis round trip in UTC`() {
        val millis = isoToUtcMillis("2026-10-07")
        assertEquals(1_791_331_200_000L, millis)
        assertEquals("2026-10-07", utcMillisToIso(millis!!))
        assertNull(isoToUtcMillis("07/10/2026"))
    }

    @Test
    fun `route arguments must be a numeric group and a real ISO date`() {
        assertTrue(isValidMeetingArguments("42", "2026-10-05"))
        assertFalse(isValidMeetingArguments("abc", "2026-10-05"))
        assertFalse(isValidMeetingArguments("42", "2026-13-45"))
        assertFalse(isValidMeetingArguments("42", "05/10/2026"))
        assertFalse(isValidMeetingArguments("42", ""))
    }

    @Test
    fun `meeting routes carry the group id and date`() {
        assertEquals("life_group_meeting/42/2026-10-05", Screen.LifeGroupMeeting.createRoute("42", "2026-10-05"))
        assertEquals("life_group_meetings/42", Screen.LifeGroupMeetings.createRoute("42"))
        assertEquals("life_group_meeting/{lifeGroupId}/{date}", Screen.LifeGroupMeeting.route)
    }

    @Test
    fun `the presenca push route still resolves to a registered alias with the same arguments`() {
        // The push helper keeps emitting the legacy route name; the nav graph registers it next to the new
        // one, both with {lifeGroupId}/{date} and both opening the combined meeting screen.
        val pushRoute = PushNotificationHelper.parseDeepLink("paz://presenca/42/2026-10-05")
        assertEquals(Screen.LifeGroupAttendanceEditor.createRoute("42", "2026-10-05"), pushRoute)
        assertEquals(
            Screen.LifeGroupMeeting.route.substringAfter('/'),
            Screen.LifeGroupAttendanceEditor.route.substringAfter('/'),
        )
    }
}
