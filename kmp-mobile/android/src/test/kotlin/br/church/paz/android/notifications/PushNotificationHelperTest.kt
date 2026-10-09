package br.church.paz.android.notifications

import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class PushNotificationHelperTest {
    @Test
    fun `parses agenda deep link`() {
        assertEquals(
            "agenda_detail/evt-1",
            PushNotificationHelper.parseDeepLink("paz://agenda/evt-1"),
        )
    }

    @Test
    fun `parses form deep link`() {
        assertEquals(
            "form_detail/form-1",
            PushNotificationHelper.parseDeepLink("paz://form/form-1"),
        )
    }

    @Test
    fun `parses journey deep link`() {
        assertEquals(
            "member_journey",
            PushNotificationHelper.parseDeepLink("paz://journey"),
        )
    }

    @Test
    fun `parses presenca deep link`() {
        assertEquals(
            "life_group_attendance_editor/42/2026-10-05",
            PushNotificationHelper.parseDeepLink("paz://presenca/42/2026-10-05"),
        )
    }

    @Test
    fun `parses estudo-do-life deep link`() {
        assertEquals(
            "life_group_study_detail/study-1",
            PushNotificationHelper.parseDeepLink("paz://estudo-do-life/study-1"),
        )
    }

    @Test
    fun `parses ministry deep link`() {
        assertEquals(
            "ministry_detail/min-1",
            PushNotificationHelper.parseDeepLink("paz://ministry/min-1"),
        )
    }

    @Test
    fun `parses lifegroup deep link`() {
        assertEquals(
            "life_group_detail/lg-1",
            PushNotificationHelper.parseDeepLink("paz://lifegroup/lg-1"),
        )
    }

    @Test
    fun `parses formularios deep link`() {
        assertEquals(
            "formularios",
            PushNotificationHelper.parseDeepLink("paz://formularios"),
        )
    }

    @Test
    fun `parses account deep link`() {
        assertEquals(
            "account",
            PushNotificationHelper.parseDeepLink("paz://account"),
        )
    }

    @Test
    fun `returns null for presenca missing meeting date`() {
        assertNull(PushNotificationHelper.parseDeepLink("paz://presenca/42"))
    }

    @Test
    fun `returns null for presenca missing lifeGroupId`() {
        assertNull(PushNotificationHelper.parseDeepLink("paz://presenca//2026-10-05"))
    }

    @Test
    fun `returns null for presenca with blank meeting date`() {
        assertNull(PushNotificationHelper.parseDeepLink("paz://presenca/42/"))
    }

    @Test
    fun `returns null for unknown prefix`() {
        assertNull(PushNotificationHelper.parseDeepLink("paz://unknown/123"))
    }

    @Test
    fun `returns null for blank deep link`() {
        assertNull(PushNotificationHelper.parseDeepLink(""))
    }

    @Test
    fun `returns null for malformed scheme`() {
        assertNull(PushNotificationHelper.parseDeepLink("not-a-deep-link"))
    }
}
